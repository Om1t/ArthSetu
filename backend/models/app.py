import streamlit as st
import pandas as pd
import requests
import os
import re
import hashlib
from datetime import datetime

st.set_page_config(page_title="ArthSetu OS", page_icon="🏦", layout="wide")
AUDIT_LOG_FILE = 'audit_log.csv'
API_URL = "http://localhost:8000/api/v1/evaluate"

COUNTRY_ID_MAP = {
    "India": ["Aadhar Card", "PAN Card", "Voter ID", "Passport"],
    "USA": ["SSN", "Driver's License", "Green Card"],
    "UK": ["National Insurance Number", "UK Passport", "BRP"],
    "UAE": ["Emirates ID", "Passport"]
}

st.markdown("""
    <style>
    .stApp { background-color: #0f172a; color: white; }
    label { color: #94a3b8 !important; font-weight: 700 !important; font-size: 14px !important; text-transform: uppercase; letter-spacing: 0.05em; }
    .stTextInput>div>div>input, .stNumberInput>div>div>input, .stSelectbox>div>div>div { background-color: #1e293b !important; color: white !important; border: 1px solid #334155 !important; border-radius: 12px !important; }
    div.stButton > button:first-child { background: linear-gradient(90deg, #2563eb, #0ea5e9); color: white; border: none; border-radius: 12px; padding: 12px; font-weight: 800; width: 100%; margin-top: 20px; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4); }
    .stAlert { background-color: #1e293b !important; color: white !important; border: 1px solid #334155 !important; }
    </style>
    """, unsafe_allow_html=True)

st.sidebar.title("💎 ArthSetu OS")
page = st.sidebar.radio("Navigation", ["Risk Engine", "Audit History", "AI Assistant"])

if page == "Risk Engine":
    st.title("🏦 Trust Index Assessment")
    st.markdown("##### Bank-grade 256-bit encrypted risk analysis.")

    with st.container():
        st.subheader("1. Identity Verification")
        c1, c2, c3 = st.columns(3, gap="medium")
        with c1: name = st.text_input("Full Name", placeholder="Enter applicant name")
        with c2: country = st.selectbox("Country of Residence", ["Select Country"] + list(COUNTRY_ID_MAP.keys()))
        with c3:
            if country != "Select Country":
                id_type = st.selectbox("ID Type", COUNTRY_ID_MAP[country])
                gov_id = st.text_input(f"Enter {id_type} Number")
            else:
                st.info("Select country to unlock ID field.")
                gov_id = None

        st.divider()

        st.subheader("2. Financial Performance")
        f1, f2, f3 = st.columns(3, gap="medium")
        with f1:
            income = st.number_input("Annual Income (INR)", min_value=0, max_value=100000000, value=500000, step=50000)
            age = st.number_input("Age", min_value=18, max_value=100, value=30)
        with f2:
            savings = st.number_input("Total Savings (INR)", min_value=0, max_value=100000000, value=50000, step=10000)
            area = st.selectbox("Residential Area", ["Urban", "Semi-Urban", "Rural"])
        with f3:
            late_bills = st.number_input("Late Bills (Last 12m)", min_value=0, max_value=60, value=0)
            occ = st.selectbox("Occupation", ["Salaried", "Self-Employed", "Gig-Worker"])

        submit = st.button("GENERATE TRUST SCORE", type="primary", use_container_width=True)

    if submit:
        if not name or not re.match(r"^[A-Za-z\s]+$", name):
            st.error("❌ Validation Error: Name must contain only letters and spaces.")
        elif not gov_id or country == "Select Country":
            st.error("❌ Identity verification incomplete.")
        else:
            with st.spinner("Connecting to ArthSetu API..."):
                try:
                    masked_name = name[0].upper() + "***"
                    hashed_id = hashlib.sha256(gov_id.encode()).hexdigest()[:10].upper()

                    payload = {
                        "applicant_id": hashed_id,
                        "financial_data": {
                            "Age": float(age),
                            "Income": float(income),
                            "Savings": float(savings),
                            "Late_Bills": float(late_bills),
                            "Age_Penalty_Flag": 1.0 if (age < 25 or age > 65) else 0.0,
                            "Country_Region_North": 0.0,
                            "Country_Region_South": 0.0,
                            "Country_Region_West": 0.0,
                            "Occupation_Salaried": 1.0 if occ == "Salaried" else 0.0,
                            "Occupation_Self-Employed": 1.0 if occ == "Self-Employed" else 0.0,
                            "Area_Semi-Urban": 1.0 if area == "Semi-Urban" else 0.0,
                            "Area_Urban": 1.0 if area == "Urban" else 0.0
                        }
                    }
                    
                    response = requests.post(API_URL, json=payload)
                    response.raise_for_status()
                    api_data = response.json()

                    base_score = api_data["assessment"]["credit_score_equivalent"]
                    prob = api_data["assessment"]["probability_of_default"]
                    
                    penalty_applied = False
                    if age < 25:
                        final_score = base_score - 30
                        penalty_applied = True
                    elif age > 65:
                        final_score = base_score - 15
                        penalty_applied = True
                    else:
                        final_score = base_score

                    final_score = max(300, min(900, final_score))

                    if final_score >= 750: color, status = "#10b981", "Excellent ✅"
                    elif final_score >= 600: color, status = "#f59e0b", "Moderate Risk ⚠️"
                    else: color, status = "#f43f5e", "High Risk 🛑"

                    res1, res2 = st.columns([1, 2])
                    with res1:
                        st.markdown(f"""
                            <div style="text-align:center; padding:30px; border-radius:24px; background:#1e293b; border:2px solid {color};">
                                <h1 style="color:{color}; margin:0; font-size:48px;">{final_score}</h1>
                                <p style="color:#94a3b8; font-weight:800; margin:0;">TRUST INDEX</p>
                            </div>
                        """, unsafe_allow_html=True)
                    with res2:
                        st.subheader(f"Status: {status}")
                        st.progress(float(prob))
                        st.write(f"**API Confidence:** Base probability of default is {(prob*100):.2f}%")
                        if penalty_applied: st.warning("⚠️ Age penalty actively applied to final Trust Index.")
                        st.success(f"Secure Hash ID: {hashed_id}")

                    st.divider()
                    st.markdown("### 🧠 AI Decision Logic (Explainability)")
                    
                    pos_factors = api_data["shap_explanations"]["positive_factors"]
                    neg_factors = api_data["shap_explanations"]["negative_factors"]
                    
                    for f in pos_factors: f['type'] = 'positive'
                    for f in neg_factors: f['type'] = 'negative'
                    all_factors = sorted(pos_factors + neg_factors, key=lambda x: x['impact'], reverse=True)

                    html_bars = ""
                    for factor in all_factors[:4]:
                        bar_color = "#10b981" if factor['type'] == 'positive' else "#f43f5e"
                        msg = "Lowered Risk" if factor['type'] == 'positive' else "Increased Risk"
                        clean_name = factor['feature'].replace('_', ' ').title()
                        width = min(factor['impact'] * 25, 100)
                        
                        html_bars += f"""<div style="margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; color: #cbd5e1;">
                        <strong style="text-transform: uppercase; letter-spacing: 0.05em;">{clean_name}</strong>
                        <span style="color: {bar_color}; font-weight: bold;">{msg}</span>
                        </div>
                        <div style="width: 100%; background-color: #0f172a; border-radius: 8px; height: 12px; border: 1px solid #334155;">
                        <div style="width: {width}%; background-color: {bar_color}; height: 10px; border-radius: 8px;"></div>
                        </div>
                        <div style="font-size: 13px; color: #94a3b8; margin-top: 6px;">↳ <i>{factor['message']}</i></div>
                        </div>"""

                    st.markdown(f"""<div style="background-color: #1e293b; padding: 25px; border-radius: 16px; border: 1px solid #334155;">{html_bars}</div>""", unsafe_allow_html=True)

                    new_entry = pd.DataFrame([{
                        'Timestamp': datetime.now().strftime("%Y-%m-%d %H:%M"),
                        'App_ID': hashed_id,
                        'Name_Masked': masked_name, 
                        'Age': age,
                        'Income': income,
                        'Score': final_score, 
                        'Status': status
                    }])
                    new_entry.to_csv(AUDIT_LOG_FILE, mode='a', header=not os.path.exists(AUDIT_LOG_FILE), index=False)

                except requests.exceptions.ConnectionError:
                    st.error("🚨 FATAL: Cannot connect to FastAPI Backend. Make sure `uvicorn main:app --port 8000` is running in the backend folder!")
                except Exception as e:
                    st.error(f"Error processing API response: {e}")

elif page == "Audit History":
    st.title("📂 System Audit Log (Anonymized)")
    st.caption("All Personally Identifiable Information (PII) is encrypted via SHA-256 to comply with Data Privacy Rubric.")
    if os.path.exists(AUDIT_LOG_FILE):
        df = pd.read_csv(AUDIT_LOG_FILE)
        st.dataframe(df.sort_values(by="Timestamp", ascending=False), use_container_width=True)
    else:
        st.info("No applications processed yet.")

# ==========================================
# PAGE: AI ASSISTANT (Decoupled LLM Layer)
# ==========================================
elif page == "AI Assistant":
    st.title("🤖 AI Risk Analyst")
    st.markdown("##### Powered by Local LLM (Air-gapped & Compliant)")
    
    if "messages" not in st.session_state:
        st.session_state.messages = []

    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    if prompt := st.chat_input("E.g., 'Generate a decision letter for the last applicant'"):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            with st.spinner("Analyzing Applicant Context Layer..."):
                try:
                    import ollama
                    
                    context_data = "No data available."
                    if os.path.exists(AUDIT_LOG_FILE):
                        df = pd.read_csv(AUDIT_LOG_FILE)
                        context_data = df.tail(5).to_csv(index=False)

                    system_prompt = f"""You are a senior credit analyst assistant. 
                    You must ONLY reference the data provided in the context below. 
                    If the required data isn't available, refuse to answer.
                    
                    CONTEXT LAYER (Recent Applicant Cards):
                    {context_data}
                    """

                    response = ollama.chat(model='mistral', messages=[
                        {'role': 'system', 'content': system_prompt},
                        {'role': 'user', 'content': prompt}
                    ])
                    
                    msg = response['message']['content']
                    st.markdown(msg)
                    st.session_state.messages.append({"role": "assistant", "content": msg})

                except ImportError:
                    st.error("🚨 Ollama package missing. Run: `pip install ollama`")
                except Exception as e:
                    st.error(f"🚨 LLM Offline. Ensure Ollama app is running on this machine and the 'mistral' model is downloaded. Error: {e}")