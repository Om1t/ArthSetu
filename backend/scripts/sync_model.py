import pandas as pd
import numpy as np
from xgboost import XGBClassifier
import joblib

print("🧠 Generating Smart Banking Data...")
np.random.seed(42)
n = 5000  # Train on 5,000 synthetic applicants

# 1. Generate Realistic Base Features
age = np.random.randint(18, 75, n)
income = np.random.normal(600000, 200000, n).clip(100000, 5000000)
# Savings are realistically a fraction of income
savings = income * np.random.uniform(0.01, 0.6, n) 
# Late bills are heavily skewed toward 0, but some have 1-5
late_bills = np.random.choice([0, 0, 0, 0, 1, 2, 3, 4, 5], n) 

# 2. Build the DataFrame EXACTLY as your app.py expects it
X = pd.DataFrame({
    'Age': age,
    'Income': income,
    'Savings': savings,
    'Late_Bills': late_bills,
    'Age_Penalty_Flag': np.where((age < 25) | (age >= 65), 1, 0),
    'Country_Region_North': np.random.choice([0, 1], n),
    'Country_Region_South': np.random.choice([0, 1], n),
    'Country_Region_West': np.random.choice([0, 1], n),
    'Occupation_Salaried': np.random.choice([0, 1], n, p=[0.4, 0.6]),
    'Occupation_Self-Employed': np.random.choice([0, 1], n),
    'Area_Semi-Urban': np.random.choice([0, 1], n),
    'Area_Urban': np.random.choice([0, 1], n)
})

# 3. 🧬 INJECT REAL BUSINESS LOGIC (This is what fixes the SHAP explanations!)
# Start everyone at a 5% baseline risk
prob = np.full(n, 0.05)

# Penalties (Increase Risk)
prob += (X['Late_Bills'] * 0.20)  # +20% risk per late bill (Huge penalty!)
prob += (X['Age_Penalty_Flag'] * 0.15) # +15% risk if age < 25 or >= 65

# Bonuses (Decrease Risk)
savings_ratio = X['Savings'] / X['Income']
prob -= (savings_ratio * 0.15) # High savings lowers risk
prob -= (X['Occupation_Salaried'] * 0.05) # Salaried workers are slightly safer

# Keep probabilities bounded between 1% and 99%
prob = np.clip(prob, 0.01, 0.99)

# 4. Generate the final "Default" column based on our smart probabilities
y = np.random.binomial(1, prob)

print("🤖 Training the XGBoost Model...")
# Train the model (max_depth=4 keeps the logic clean and explainable)
model = XGBClassifier(eval_metric='logloss', max_depth=4, learning_rate=0.1)
model.fit(X, y)

# 5. Save the updated brain
joblib.dump(model, 'arthsetu_xgb.pkl')
joblib.dump(X.columns.tolist(), 'arthsetu_features.pkl')

print("✅ SUCCESS! The AI is now financially literate.")