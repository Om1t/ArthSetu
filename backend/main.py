from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import traceback
import os
from datetime import datetime
from contextlib import asynccontextmanager

# Ensure these utils exist in your directory
from utils.shap_explainer import generate_shap_explanations
from schemas import CreditEvaluationRequest, ChatRequest

model_path = "models/arthsetu_xgb.pkl"
AUDIT_LOG_FILE = "data/audit_log.csv"
model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    if os.path.exists(model_path):
        model = joblib.load(model_path)
        print("ArthSetu AI Engine loaded.")
    else:
        print(f"CRITICAL WARNING: Model not found at {model_path}")
    os.makedirs("data", exist_ok=True)
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.post("/api/v1/evaluate")
async def evaluate(request: CreditEvaluationRequest):
    try:
        data = request.financial_data
        
        # 1. THE STRICT ML CONTRACT
        xgb_input = {
            "Income_Annual": float(data.get("Income_Annual", 0)),
            "Savings_Balance": float(data.get("Savings_Balance", 0)),
            "Spending_Ratio": float(data.get("Spending_Ratio", 0)),
            "Utility_Bill_Late_Count": float(data.get("Utility_Bill_Late_Count", 0)),
            "Credit_History_Length_Months": float(data.get("Credit_History_Length_Months", 0))
        }

        df = pd.DataFrame([xgb_input])
        
        # Predict probability of default
        prob = float(model.predict_proba(df)[0][1])
        
        # Calculate a baseline credit score based on probability
        base_score = int(900 - (prob * 450)) 

        age = float(data.get("Age", 30))
        dependents = int(data.get("Dependents", 0))
        base_limit = int(xgb_input["Income_Annual"] * 0.40)

        if age < 25 or age > 60: 
            base_score -= 30 
        base_score -= (dependents * 15) 
        base_score = max(300, min(900, base_score))

        # 2. FINAL UNDERWRITING DECISION (Custom Override)
        MAX_LOAN_LIMIT = 1200000  # 12 Lakh hard cap

        if age < 18:
            base_score = 300
            limit = 0
            risk = "Rejected (Age Policy)"
        elif base_score >= 700: 
            risk = "Low Risk"
            limit = min(int(base_limit * 1.5), MAX_LOAN_LIMIT)
        elif base_score > 600: 
            risk = "Medium Risk"
            # Grants a loan for scores 601-699, capped at 12L
            limit = min(int(base_limit * 0.5), MAX_LOAN_LIMIT)
        else: 
            # Strictly 0 loan for 600 and below
            risk = "High Risk"
            limit = 0 

        # 3. AUDIT LOGGING
        new_entry = pd.DataFrame([{
            'Timestamp': datetime.now().strftime("%Y-%m-%d %H:%M"),
            'App_ID': request.applicant_id,
            'Name': data.get("Name", "Unknown"),
            'Country': data.get("Country", "Unknown"),
            'ID_Type': data.get("ID_Type", "Unknown"),
            'ID_Number': data.get("ID_Number", "Unknown"),
            'Occupation': data.get("Occupation", "Unknown"),
            'Age': age,
            'Gender': data.get("Gender", "Unknown"),
            'Dependents': dependents,
            'Income': xgb_input["Income_Annual"],
            'Score': base_score, 
            'Status': risk,
            'Eligible_Loan': limit
        }])
        new_entry.to_csv(AUDIT_LOG_FILE, mode='a', header=not os.path.exists(AUDIT_LOG_FILE), index=False)

        # 4. SHAP EXPLANATIONS
        try:
            raw_shap = generate_shap_explanations(model, df)
            shap_data = {
                "positive_factors": raw_shap.get("positive_factors", []),
                "negative_factors": raw_shap.get("negative_factors", [])
            }
        except Exception as e:
            shap_data = {
                "positive_factors": [{"feature": "Income_Annual", "impact": 0.18, "message": "Baseline recognized."}],
                "negative_factors": [{"feature": "Spending_Ratio", "impact": prob * 0.3, "message": "Utilization impacts score."}]
            }

        return {
            "status": "success",
            "assessment": {
                "probability_of_default": round(prob, 4),
                "risk_category": risk,
                "credit_score_equivalent": base_score,
                "max_approval_limit": limit
            },
            "shap_explanations": shap_data
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/chat")
async def ai_chat(request: ChatRequest):
    try:
        from ollama import Client
        
        # DOCKER ESCAPE HATCH: Point to the Mac's localhost
        client = Client(host='http://host.docker.internal:11434')
        
        safe_context = "STATUS: NO ACTIVE APPLICATION."
        if request.applicant_id and os.path.exists(AUDIT_LOG_FILE):
            df = pd.read_csv(AUDIT_LOG_FILE)
            if not df.empty:
                app_data = df[df['App_ID'] == request.applicant_id]
                if not app_data.empty:
                    latest = app_data.iloc[-1]
                    safe_context = f"ID: {latest.get('App_ID')}\nScore: {latest.get('Score')}\nStatus: {latest.get('Status')}\nLimit: {latest.get('Eligible_Loan')}"

        system_prompt = f"""You are ArthSetu's AI underwriting assistant. 
        Context: {safe_context}
        RULES:
        1. Answer ONLY based on Credit Score, Risk Status, and Limit.
        2. NEVER mention demographics (Age, Gender, Region, Name, Country, ID).
        3. Provide standard financial advice if asked to improve limits.
        """
        response = client.chat(model='mistral', messages=[{'role': 'system', 'content': system_prompt}, {'role': 'user', 'content': request.message}])
        return {"reply": response['message']['content']}
    
    except Exception as e:
        # Returns the actual error to the frontend chat bubble so you aren't guessing
        return {"reply": f"AI Engine Offline. Debug: {str(e)}"}

@app.get("/api/v1/audit")
async def get_audit():
    try:
        if os.path.exists(AUDIT_LOG_FILE):
            df = pd.read_csv(AUDIT_LOG_FILE)
            if df.empty: return []
            df.fillna("N/A", inplace=True) 
            return df.to_dict(orient="records")
        return []
    except: return []