import pandas as pd
import numpy as np
from xgboost import XGBClassifier
import joblib

print("🔄 Syncing Model with new UI parameters...")

# 1. Generate Synthetic Data matching your NEW UI fields
np.random.seed(42)
n = 1000
df = pd.DataFrame({
    'Age': np.random.randint(18, 75, n),
    'Income': np.random.normal(500000, 100000, n),
    'Savings': np.random.normal(50000, 20000, n),
    'Late_Bills': np.random.randint(0, 5, n),
    'Age_Penalty_Flag': np.random.choice([0, 1], n),
    'Country_Region': np.random.choice(['North', 'South', 'East', 'West'], n),
    'Occupation': np.random.choice(['Salaried', 'Self-Employed', 'Gig-Worker'], n),
    'Area': np.random.choice(['Urban', 'Semi-Urban', 'Rural'], n),
    'Default': np.random.choice([0, 1], n, p=[0.8, 0.2])
})

# 2. Preprocess (One-Hot Encoding)
X = pd.get_dummies(df.drop('Default', axis=1), drop_first=True)
y = df['Default']
feature_names = X.columns.tolist()

# 3. Train the new XGBoost Model
# We use scale_pos_weight for that High-Recall your mentors want!
model = XGBClassifier(scale_pos_weight=4, eval_metric='logloss')
model.fit(X, y)

# 4. Save everything with the names app.py is looking for
joblib.dump(model, 'arthsetu_xgb.pkl')
joblib.dump(feature_names, 'arthsetu_features.pkl')

print("✅ SUCCESS! Model and Features are now perfectly synced.")
print(f"📦 New Model expects: {feature_names}")