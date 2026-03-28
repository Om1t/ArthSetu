import joblib

# These are the exact columns your XGBoost model is expecting
# (Based on our Age Penalty and high-recall logic)
feature_columns = [
    'Age', 'Income', 'Savings', 'Late_Bills', 'Age_Penalty_Flag',
    'Country_Region_South', 'Country_Region_East', 'Country_Region_West',
    'Occupation_Self-Employed', 'Occupation_Gig-Worker',
    'Area_Semi-Urban', 'Area_Rural'
]

# Save it directly into the models folder
joblib.dump(feature_columns, 'arthsetu_features.pkl')

print("✅ 'arthsetu_features.pkl' has been successfully created in the models folder!")