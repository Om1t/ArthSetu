import streamlit as st
import pandas as pd
import joblib
import os
import re
import ollama
import shap
from datetime import datetime

# --- 1. CONFIG & DATA ---
st.set_page_config(page_title="ArthSetu OS", page_icon="🏦", layout="wide")
AUDIT_LOG_FILE = 'audit_log.csv'

COUNTRY_ID_MAP = {
    "India": ["Aadhar Card", "PAN Card", "Voter ID", "Passport"],
    "USA": ["SSN", "Driver's License", "Green Card"],
    "UK": ["National Insurance Number", "UK Passport", "BRP"],
    "UAE": ["Emirates ID", "Passport"]
}

# --- 2. ADVANCED CSS (REACT-STYLE) ---
st.markdown("""
    <style>
    .stApp { background-color: #0f172a; color: white; }
    
    /* Input Labels */
    label { 
        color: #94a3b8 !important; 
        font-weight: 700 !important; 
        font-size: 14px !important; 
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    /* Input Boxes */
    .stTextInput>div>div>input, .stNumberInput>div>div>input, .stSelectbox>div>div>div {
        background-color: #1e293b !important;
        color: white !important;
        border: 1px solid #334155 !important;
        border-radius: 12px !important;
    }

    /* Primary Button */
    div.stButton > button:first-child {
        background: linear-gradient(90deg, #2563eb, #0ea5e9);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 12px;
        font-weight: 800;
        width: 100%;
        margin-top: 20px;
        box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4);
    }

    /* Success/Warning Boxes */
    .stAlert { background-color: #1e293b !important; color: white !important; border: 1px solid #334155 !important; }
    </style>
    """, unsafe_allow_html=True)

# --- 3. LOAD ASSETS ---
# @st.cache_resource
def load_assets():
    base_path = os.path.dirname(os.path.abspath(__file__))
    model = joblib.load(os.path.join(base_path, 'arthsetu_xgb.pkl'))
    features = joblib.load(os.path.join(base_path, 'arthsetu_features.pkl'))
    return model, features

try:
    model, model_columns = load_assets()
except Exception as e:
    st.error(f"Engine Load Error: {e}")
    st.stop()

# --- 4. NAVIGATION ---
st.sidebar.title("💎 ArthSetu OS")
page = st.sidebar.radio("Navigation", ["Risk Engine", "Audit History", "AI Assistant"])

# ==========================================
# PAGE: RISK ENGINE
# ==========================================
if page == "Risk Engine":
    st.title("Trust Index Assessment TEST!!!")
    st.markdown("##### Bank-grade 256-bit encrypted risk analysis.")

    # Using a container instead of a form so the dropdowns react instantly
    with st.container():
        st.subheader("1. Identity Verification")
        c1, c2, c3 = st.columns(3, gap="medium")
        
        with c1:
            name = st.text_input("Full Name", placeholder="Enter applicant name")
        with c2:
            country = st.selectbox("Country of Residence", ["Select Country"] + list(COUNTRY_ID_MAP.keys()))
        with c3:
            # This logic now fires immediately!
            if country != "Select Country":
                id_type = st.selectbox("ID Type", COUNTRY_ID_MAP[country])
                gov_id = st.text_input(f"Enter {id_type} Number")
            else:
                st.info("Select country to unlock ID field.")
                gov_id = None

        st.divider()

        st.subheader("2. Financial Performance")
        f1, f2, f3 = st.columns(3, gap="medium")
        
        # Added min_value and max_value to lock down crazy inputs
        with f1:
            income = st.number_input("Annual Income (INR)", min_value=0, max_value=100000000, value=500000, step=50000)
            age = st.number_input("Age", min_value=18, max_value=100, value=30)
        with f2:
            savings = st.number_input("Total Savings (INR)", min_value=0, max_value=100000000, value=50000, step=10000)
            area = st.selectbox("Residential Area", ["Urban", "Semi-Urban", "Rural"])
        with f3:
            late_bills = st.number_input("Late Bills (Last 12m)", min_value=0, max_value=60, value=0)
            occ = st.selectbox("Occupation", ["Salaried", "Self-Employed", "Gig-Worker"])

        # Because we removed the form, the button changes slightly
        submit = st.button("GENERATE TRUST SCORE", type="primary", use_container_width=True)

    if submit:
        # 1. THE VALIDATION GUARDRAIL
        if not name or not re.match(r"^[A-Za-z\s]+$", name):
            st.error("❌ Validation Error: Name must contain only letters and spaces.")
        elif not gov_id or country == "Select Country":
            st.error("❌ Identity verification incomplete.")
        else:
            # --- ML PROCESSING ---
            penalty = 1 if (age < 25 or age >= 65) else 0
            
            input_df = pd.DataFrame(0, index=[0], columns=model_columns)
            input_df['Age'] = age
            input_df['Income'] = income
            input_df['Savings'] = savings
            input_df['Late_Bills'] = late_bills
            input_df['Age_Penalty_Flag'] = penalty
            
            if f'Country_Region_{country}' in input_df.columns: input_df[f'Country_Region_{country}'] = 1
            if f'Occupation_{occ}' in input_df.columns: input_df[f'Occupation_{occ}'] = 1
            if f'Area_{area}' in input_df.columns: input_df[f'Area_{area}'] = 1

            prob = float(model.predict_proba(input_df)[0][1])
            
            # 2. THE CIBIL MATH UPGRADE
            score = int(300 + (600 * (1 - prob)))
            
            # Dynamic colors based on standard banking tiers
            if score >= 750:
                color, status = "#10b981", "Excellent ✅"  # Green
            elif score >= 600:
                color, status = "#f59e0b", "Moderate Risk ⚠️" # Yellow
            else:
                color, status = "#f43f5e", "High Risk 🛑"    # Red

            # --- DISPLAY CORE RESULTS ---
            res1, res2 = st.columns([1, 2])
            with res1:
                st.markdown(f"""
                    <div style="text-align:center; padding:30px; border-radius:24px; background:#1e293b; border:2px solid {color};">
                        <h1 style="color:{color}; margin:0; font-size:48px;">{score}</h1>
                        <p style="color:#94a3b8; font-weight:800; margin:0;">TRUST INDEX</p>
                    </div>
                """, unsafe_allow_html=True)
            with res2:
                st.subheader(f"Status: {status}")
                st.progress(prob)
                st.write(f"**AI Confidence:** Probability of default is {(prob*100):.2f}%")
                if penalty: st.warning("Note: Age penalty applied based on demographic risk.")

            # --- 3. THE AI EXPLAINABILITY ENGINE (SHAP) ---
            st.divider()
            st.markdown("### 🧠 AI Decision Logic (Explainability)")
            st.caption("This shows exactly which factors influenced the AI's Trust Index calculation.")
            
            try:
                # Calculate the invisible weights the AI used for this specific person
                explainer = shap.TreeExplainer(model)
                shap_values = explainer.shap_values(input_df)[0]
                
                # Sort features by how much impact they had
                feature_impacts = list(zip(input_df.columns, shap_values))
                feature_impacts.sort(key=lambda x: abs(x[1]), reverse=True)

                html_bars = ""
                for feature, impact in feature_impacts[:4]: # Show Top 4 reasons
                    if impact == 0: continue
                    
                    clean_name = feature.replace('_', ' ').title()
                    # Grab the actual number the user typed in!
                    actual_value = input_df[feature].iloc[0]
                    
                    # 🧠 EXACT MATCH LOGIC FOR CLEARER EXPLANATIONS
                    if impact > 0:
                        bar_color = "#f43f5e" # Red
                        msg = "Increased Risk"
                        
                        if feature == "Late_Bills": reason = f"Having {actual_value} late bill(s) hurt your Trust Index."
                        elif feature == "Savings": reason = f"Your savings balance of ₹{actual_value} was too low to offset risk."
                        
                        # --- SMART AGE LOGIC (HIGH RISK) ---
                        elif feature == "Age": 
                            if actual_value >= 65:
                                reason = f"Nearing retirement age ({actual_value}) statistically reduces future earning potential."
                            else:
                                reason = f"Your age ({actual_value}) placed you in a statistically higher-risk bracket."
                        # ----------------------------------------
                        
                        elif feature == "Age_Penalty_Flag": reason = "Falling outside the prime borrowing age (25-64) triggered an automatic risk penalty." if actual_value == 1 else "Internal age demographics slightly increased risk."
                        elif feature == "Income": reason = f"Your annual income of ₹{actual_value} limited your repayment capacity."
                        elif "Area" in feature: reason = f"Residing in this location ({clean_name.replace('Area ', '')}) slightly increased your risk profile."
                        elif "Occupation" in feature: reason = f"Your employment status ({clean_name.replace('Occupation ', '')}) carried a higher historical risk."
                        else: reason = f"Your {clean_name} negatively impacted your score."
                        
                    else:
                        bar_color = "#10b981" # Green
                        msg = "Lowered Risk"
                        
                        if feature == "Late_Bills": reason = f"Having only {actual_value} late bills showed strong financial responsibility."
                        elif feature == "Savings": reason = f"Your savings balance of ₹{actual_value} provided a strong safety net."
                        
                        # --- SMART AGE LOGIC (LOW RISK) ---
                        elif feature == "Age": 
                            if actual_value >= 55:
                                reason = f"Your mature credit history associated with your age ({actual_value}) stabilized your score."
                            else:
                                reason = f"Your age ({actual_value}) placed you in a highly reliable demographic."
                        # ----------------------------------------
                        
                        elif feature == "Age_Penalty_Flag": reason = "Being in the prime borrowing age (25-64) stabilized your score."
                        elif feature == "Income": reason = f"Your income of ₹{actual_value} demonstrated strong financial stability."
                        elif "Area" in feature: reason = f"Residing in this location ({clean_name.replace('Area ', '')}) improved your risk profile."
                        elif "Occupation" in feature: reason = f"Your employment status ({clean_name.replace('Occupation ', '')}) is historically highly reliable."
                        else: reason = f"Your {clean_name} positively improved your score."
                        
                    width = min(abs(impact) * 25, 100) 
                    
                    # HTML strings are purposely NOT indented to prevent Markdown code block rendering
                    html_bars += f"""<div style="margin-bottom: 16px;">
<div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; color: #cbd5e1;">
<strong style="text-transform: uppercase; letter-spacing: 0.05em;">{clean_name}</strong>
<span style="color: {bar_color}; font-weight: bold;">{msg}</span>
</div>
<div style="width: 100%; background-color: #0f172a; border-radius: 8px; height: 12px; border: 1px solid #334155;">
<div style="width: {width}%; background-color: {bar_color}; height: 10px; border-radius: 8px;"></div>
</div>
<div style="font-size: 13px; color: #94a3b8; margin-top: 6px;">↳ <i>{reason}</i></div>
</div>"""

                final_html = f"""<div style="background-color: #1e293b; padding: 25px; border-radius: 16px; border: 1px solid #334155; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">{html_bars}</div>"""
                
                st.markdown(final_html, unsafe_allow_html=True)

            except Exception as e:
                st.error(f"⚠️ Explainability Engine Offline: Ensure 'shap' is installed (`pip install shap`). Error: {e}")

            # --- LOGGING ---
            new_entry = pd.DataFrame([{
                'Timestamp': datetime.now().strftime("%Y-%m-%d %H:%M"),
                'App_ID': f"AS-{str(hash(gov_id))[-4:]}",
                'Name': name, 'ID': gov_id, 'Score': score, 'Status': status
            }])
            new_entry.to_csv(AUDIT_LOG_FILE, mode='a', header=not os.path.exists(AUDIT_LOG_FILE), index=False)

# ==========================================
# PAGE: AUDIT HISTORY
# ==========================================
elif page == "Audit History":
    st.title("📂 System Audit Log")
    if os.path.exists(AUDIT_LOG_FILE):
        df = pd.read_csv(AUDIT_LOG_FILE)
        st.dataframe(df.sort_values(by="Timestamp", ascending=False), use_container_width=True)
    else:
        st.info("No applications processed yet.")

# ==========================================
# PAGE: AI ASSISTANT
# ==========================================
elif page == "AI Assistant":
    st.title("🤖 AI Risk Analyst")
    prompt = st.chat_input("Ask about an application (e.g., 'Summary for AS-1234')")
    if prompt:
        with st.chat_message("user"): st.write(prompt)
        # Add your Ollama logic here if you have it installed!
        with st.chat_message("assistant"): st.write("Analysing logs... (Connect Ollama to see live summaries)")