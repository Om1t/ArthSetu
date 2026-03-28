from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import joblib
import pandas as pd
import traceback
import os
import hashlib

from utils.shap_explainer import generate_shap_explanations
from schemas import CreditEvaluationRequest, CreditEvaluationResponse

model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    model_path = "models/arthsetu_xgb.pkl"
    if not os.path.exists(model_path):
        raise RuntimeError(f"FATAL: Model artifact missing at {model_path}.")
    try:
        model = joblib.load(model_path)
        print("ArthSetu AI Engine loaded successfully.")
    except Exception as e:
        raise RuntimeError(f"FATAL: Loading failed. {e}")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

def apply_aes256_hashing(pii_data: str):
    return hashlib.sha256(pii_data.encode()).hexdigest()

@app.post("/api/v1/evaluate", response_model=CreditEvaluationResponse)
async def evaluate(request: CreditEvaluationRequest):
    try:
        masked_id = apply_aes256_hashing(request.applicant_id)
        print(f"🔒 Processing Secure Request for Hash: {masked_id}")

        input_data = request.financial_data
        df = pd.DataFrame([input_data])
        
        probability = float(model.predict_proba(df)[0][1])
        annual_income = input_data.get('Income', 0)

        if probability < 0.3:
            risk = "Low Risk"
            score = int(900 - (probability * 300))
            limit = min(int(annual_income * 0.60), 1500000)
        elif probability <= 0.7:
            risk = "Medium Risk"
            score = int(700 - (probability * 200))
            limit = min(int(annual_income * 0.20), 300000)
        else:
            risk = "High Risk"
            score = int(500 - (probability * 200))
            limit = 0

        if input_data.get('Late_Bills', 0) > 5:
            print(f"⚠️ GUARDRAIL TRIGGERED: High Late Bills detected for {masked_id}")
            risk = "High Risk (Overridden)"
            limit = 0
            score = min(score, 350) 

        try:
            shap_data = generate_shap_explanations(model, df)
        except Exception as shap_error:
            print(f"SHAP Error: {shap_error}")
            shap_data = {"positive_factors": [], "negative_factors": []}

        return {
            "status": "success",
            "assessment": {
                "probability_of_default": round(probability, 4),
                "risk_category": risk,
                "credit_score_equivalent": score,
                "max_approval_limit": limit
            },
            "shap_explanations": shap_data
        }
    except Exception as e:
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=str(e))