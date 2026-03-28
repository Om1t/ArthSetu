import pandas as pd
import joblib
import matplotlib.pyplot as plt
from sklearn.metrics import accuracy_score, roc_auc_score, roc_curve

print("--- ArthSetu Evaluation Pipeline ---")

# 1. Load the pre-trained brain
print("Loading model (arthsetu_xgb.pkl)...")
model = joblib.load('arthsetu_xgb.pkl')

# 2. Load the exam paper
print("Loading test data (clean_features.csv)...")
try:
    df = pd.read_csv('clean_features.csv') 
except FileNotFoundError:
    print("❌ ERROR: clean_features.csv not found! Make sure you dragged it from Downloads into this exact folder.")
    exit()

# Safely split the data (Target vs Features)
try:
    X_test = df.drop('Default', axis=1)
    y_test = df['Default']
except KeyError:
    # If your teammate named the target column something other than 'Default'
    target_col = df.columns[-1] 
    print(f"⚠️ 'Default' column not found. Using the last column '{target_col}' as the target.")
    X_test = df.drop(target_col, axis=1)
    y_test = df[target_col]

# 3. Let the model take the exam
print("Generating predictions...")
y_pred = model.predict(X_test)
y_pred_proba = model.predict_proba(X_test)[:, 1]

# 4. Grade the exam
accuracy = accuracy_score(y_test, y_pred)
roc_auc = roc_auc_score(y_test, y_pred_proba)

print("\n" + "="*40)
print("       UNDERWRITING PERFORMANCE REPORT")
print("="*40)
print(f"✅ Accuracy: {accuracy * 100:.2f}%")
print(f"✅ AUC-ROC:  {roc_auc:.4f}")
print("="*40 + "\n")

# 5. Draw the Graph
print("Drawing ROC-AUC Graph...")
fpr, tpr, _ = roc_curve(y_test, y_pred_proba)
plt.figure(figsize=(8, 6))
plt.plot(fpr, tpr, color='#2563eb', linewidth=2, label=f'ArthSetu XGBoost (AUC = {roc_auc:.4f})')
plt.plot([0, 1], [0, 1], color='#ef4444', linestyle='--', label='Random Guessing (AUC = 0.50)')
plt.title('ArthSetu: ROC Curve', fontweight='bold', fontsize=14)
plt.xlabel('False Positive Rate', fontsize=12)
plt.ylabel('True Positive Rate', fontsize=12)
plt.legend(loc='lower right', fontsize=12)
plt.grid(alpha=0.3)

# Save the image
plt.savefig('auc_graph.png', dpi=300, bbox_inches='tight')
print("✅ SUCCESS: Graph saved as 'auc_graph.png' in this folder!")