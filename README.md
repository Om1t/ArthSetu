# ArthSetu: AI-Driven Financial Underwriting Engine

ArthSetu (The Economic Bridge) is an advanced credit underwriting platform designed to facilitate financial inclusion for 'thin-file' borrowers. By leveraging behavioral analysis and gradient boosting, the system transcends traditional credit scoring limitations to provide a highly accurate assessment of borrower reliability.

---

## Model Performance and Validation
The core engine was trained on high-dimensional financial datasets and validated through a robust cross-validation pipeline to ensure generalization.

* **Classification Accuracy:** 91.83%
* **AUC-ROC Metric:** 0.8316
* **Architecture:** eXtreme Gradient Boosting (XGBoost)

---

## Technical Stack
* **Frontend:** React.js (Enterprise UI with integrated 3D Data Visualization)
* **Backend:** FastAPI (Python-based Asynchronous Framework)
* **AI/ML Engine:** XGBoost, SHAP (Explainability Framework), Scikit-Learn, Pandas
* **Version Control:** Git/GitHub

---

## Core System Functionalities
* **Trust Index Dashboard:** Real-time generation of credit score equivalents derived from behavioral data points.
* **Algorithmic Decision Drivers:** Full interpretability of credit assignments utilizing SHAP value analysis to eliminate 'black-box' AI concerns.
* **Live Pre-Approval Engine:** Dynamic computation of credit limits based on real-time free cash flow and liquidity metrics.
* **Personalized Action Plan:** Automated financial guidance tailored to individual risk factors to assist in profile optimization.

---

## Local Deployment Instructions

### 1. Backend Configuration (FastAPI)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
