import pandas as pd
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    confusion_matrix, classification_report, roc_curve, 
    auc, accuracy_score, precision_score, recall_score, f1_score
)

# ==========================================
# 1. LOAD YOUR MODEL AND DATA
# ==========================================
# REPLACE THESE WITH YOUR ACTUAL FILENAMES
MODEL_PATH = 'arthsetu_xgb.pkl'  # e.g., 'final_model.joblib' or 'model.pkl'
DATA_PATH = '/Users/garvitgothwal/Arthsetu-1/data/processed/clean_features.csv'
TARGET_COL = 'Default'          # the name of the column you are trying to predict

print("Loading model and data...")
model = joblib.load(MODEL_PATH)
df = pd.read_csv(DATA_PATH)

# Separate features (X) and actual answers (y)
X_test = df.drop(TARGET_COL, axis=1)
y_test = df[TARGET_COL]

# ==========================================
# 2. GENERATE PREDICTIONS
# ==========================================
print("Generating predictions...")
# --- STEP: ALIGN FEATURES (Add this before predictions) ---

# 1. Rename the columns you have to match the model
mapping = {
    'Income_Annual': 'Income',
    'Savings_Balance': 'Savings',
    'Utility_Bill_Late_Count': 'Late_Bills'
}
X_test = X_test.rename(columns=mapping)

# 2. Add the missing columns (Fill them with 0 or a reasonable default for now)
# Note: In a real scenario, you'd use your actual preprocessing script
expected_features = [
    'Age', 'Income', 'Savings', 'Late_Bills', 'Age_Penalty_Flag', 
    'Country_Region_North', 'Country_Region_South', 'Country_Region_West', 
    'Occupation_Salaried', 'Occupation_Self-Employed', 'Area_Semi-Urban', 'Area_Urban'
]

for col in expected_features:
    if col not in X_test.columns:
        X_test[col] = 0  # Adding missing columns as 0

# 3. Drop columns the model doesn't recognize
X_test = X_test[expected_features] 

# Now the prediction line will work:
y_pred = model.predict(X_test)         # For Accuracy/Confusion Matrix (0 or 1)
y_probs = model.predict_proba(X_test)[:, 1]  # For ROC Curve (probabilities)

# ==========================================
# 3. CALCULATE METRICS
# ==========================================
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

print("-" * 30)
print(f"Accuracy:  {accuracy:.2f}")
print(f"Precision: {precision:.2f}")
print(f"Recall:    {recall:.2f}")
print(f"F1 Score:  {f1:.2f}")
print("-" * 30)

# ==========================================
# 4. GRAPHS FOR PPT
# ==========================================

# --- Confusion Matrix ---
plt.figure(figsize=(8, 6))
cm = confusion_matrix(y_test, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
plt.title('Confusion Matrix')
plt.ylabel('Actual Label')
plt.xlabel('Predicted Label')
plt.savefig('confusion_matrix.png')
print("Saved: confusion_matrix.png")
plt.show()

# --- ROC Curve ---
fpr, tpr, thresholds = roc_curve(y_test, y_probs)
roc_auc = auc(fpr, tpr)

plt.figure(figsize=(8, 6))
plt.plot(fpr, tpr, color='darkorange', label=f'ROC curve (area = {roc_auc:.2f})')
plt.plot([0, 1], [0, 1], color='navy', linestyle='--')
plt.xlabel('False Positive Rate')
plt.ylabel('True Positive Rate')
plt.title('Receiver Operating Characteristic (ROC)')
plt.legend(loc="lower right")
plt.savefig('roc_curve.png')
print("Saved: roc_curve.png")
plt.show()