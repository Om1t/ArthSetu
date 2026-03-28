import shap
import pandas as pd

def generate_shap_explanations(model, input_df: pd.DataFrame):
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(input_df)
    
    if isinstance(shap_values, list):
        applicant_shap = shap_values[1][0] 
    else:
        applicant_shap = shap_values[0]

    feature_names = input_df.columns.tolist()
    
    positive_factors = []
    negative_factors = []
    
    for i, feature in enumerate(feature_names):
        raw_impact = float(applicant_shap[i])
        absolute_impact = abs(raw_impact)
        
        # 1. Kill the noise: Ignore features with effectively zero impact
        if round(absolute_impact, 4) == 0:
            continue
            
        # 2. Generate a UI-safe relative magnitude message instead of fake percentages
        if absolute_impact > 1.0:
            magnitude = "Critical impact"
        elif absolute_impact > 0.4:
            magnitude = "Significant impact"
        else:
            magnitude = "Minor impact"
            
        factor = {
            "feature": feature,
            "impact": round(absolute_impact, 4), 
            "message": f"{magnitude} from {feature.replace('_', ' ')}"
        }
        
        # Positive SHAP (log-odds > 0) means higher risk of default
        if raw_impact > 0:
            negative_factors.append(factor)
        else:
            positive_factors.append(factor)
            
    # 3. Sort by magnitude descending so the UI shows the most important drivers first
    positive_factors = sorted(positive_factors, key=lambda x: x["impact"], reverse=True)
    negative_factors = sorted(negative_factors, key=lambda x: x["impact"], reverse=True)
            
    return {
        "positive_factors": positive_factors,
        "negative_factors": negative_factors
    }