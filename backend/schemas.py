from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# 1. INPUT SCHEMAS
class CreditEvaluationRequest(BaseModel):
    applicant_id: str = Field(..., description="Unique identifier")
    financial_data: Dict[str, Any]

class ChatRequest(BaseModel):
    message: str
    # NEW: These allow the frontend to pass context to the AI
    applicant_id: Optional[str] = None
    shap_context: Optional[str] = None

# 2. OUTPUT SCHEMAS
class ShapFactor(BaseModel):
    feature: str
    impact: float
    message: str

class ShapExplanations(BaseModel):
    positive_factors: List[ShapFactor]
    negative_factors: List[ShapFactor]

class CreditAssessment(BaseModel):
    probability_of_default: float
    risk_category: str
    credit_score_equivalent: int
    max_approval_limit: int

class CreditEvaluationResponse(BaseModel):
    status: str = Field(default="success")
    assessment: CreditAssessment
    shap_explanations: ShapExplanations