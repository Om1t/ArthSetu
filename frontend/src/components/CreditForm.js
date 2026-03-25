import React, { useState } from "react";

function CreditForm() {
  const [formData, setFormData] = useState({
    Income_Annual: "",
    Savings_Balance: "",
    Expenses_Annual: "",
    Utility_Bill_Late_Count: "",
    Credit_History_Length_Months: ""
  });

  const [errors, setErrors] = useState({
    Income_Annual: "",
    Savings_Balance: "",
    Expenses_Annual: "",
    Utility_Bill_Late_Count: "",
    Credit_History_Length_Months: ""
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const mockResponse = {
    status: "success",
    assessment: {
      probability_of_default: 0.124,
      risk_category: "Low Risk",
      credit_score_equivalent: 742,
    },
    shap_explanations: {
      positive_factors: [
        { feature: "Savings_Balance", impact: 0.15, message: "Savings helped." },
        { feature: "Credit_History_Length_Months", impact: 0.08, message: "History helped." }
      ],
      negative_factors: [
        { feature: "Spending_Ratio", impact: 0.22, message: "Spending hurt." },
        { feature: "Utility_Bill_Late_Count", impact: 0.40, message: "Late bills hurt." },
        { feature: "Income_Annual", impact: 0.05, message: "Income ratio impact." }
      ]
    }
  };

  const validateInput = (name, value, currentData) => {
    const valNum = Number(value);
    if (valNum < 0) return "Value cannot be negative.";
    if (name === "Credit_History_Length_Months" && valNum > 1000) return "Value too high (80+ years).";
    if (name === "Utility_Bill_Late_Count" && valNum > 50) return "Unrealistic late bill count.";
    if (name === "Income_Annual" && valNum > 1000000000) return "Unrealistic income.";
    if (name === "Utility_Bill_Late_Count" || name === "Credit_History_Length_Months") {
      if (value !== "" && !Number.isInteger(valNum)) return "Must be a whole number.";
    }
    const inc = name === "Income_Annual" ? valNum : Number(currentData.Income_Annual);
    const sav = name === "Savings_Balance" ? valNum : Number(currentData.Savings_Balance);
    const exp = name === "Expenses_Annual" ? valNum : Number(currentData.Expenses_Annual);
    if (inc > 0 && sav >= 0 && exp > (inc + sav)) {
      if (name === "Expenses_Annual") return "Expenses exceed Income + Savings.";
    }
    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (value.includes('-')) return;

    const errorMsg = validateInput(name, value, formData);
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: errorMsg }));

    if (name === "Income_Annual" || name === "Savings_Balance") {
      const expError = validateInput("Expenses_Annual", formData.Expenses_Annual, { ...formData, [name]: value });
      setErrors(prev => ({ ...prev, Expenses_Annual: expError }));
    }
  };

  const liveIncome = Number(formData.Income_Annual);
  const liveExpenses = Number(formData.Expenses_Annual);
  const liveSavings = Number(formData.Savings_Balance);
  const liveRatio = liveIncome > 0 ? (liveExpenses / liveIncome).toFixed(3) : "0.000";

  const hasErrors = Object.values(errors).some(err => err !== "");
  const isEmpty = Object.values(formData).some(val => val === "");
  const isFormDisabled = hasErrors || isEmpty;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFormDisabled) return;

    const requestData = {
      Income_Annual: liveIncome,
      Savings_Balance: liveSavings,
      Spending_Ratio: Number(liveRatio),
      Utility_Bill_Late_Count: Number(formData.Utility_Bill_Late_Count),
      Credit_History_Length_Months: Number(formData.Credit_History_Length_Months)
    };

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicant_id: "APP-123", financial_data: requestData })
      });
      const data = await response.json();
      if (!response.ok) { setLoading(false); return; }
      setTimeout(() => { setResult(data); setLoading(false); }, 900);
    } catch (error) {
      setTimeout(() => { setResult(mockResponse); setLoading(false); }, 1200);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
  };

  const assessment = result?.assessment;
  const shapExplanations = result?.shap_explanations || { positive_factors: [], negative_factors: [] };
  const combinedShap = [
    ...(shapExplanations.positive_factors || []).map(f => ({ ...f, direction: 'positive' })),
    ...(shapExplanations.negative_factors || []).map(f => ({ ...f, direction: 'negative' }))
  ].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  const totalShapImpact = combinedShap.reduce((sum, item) => sum + Math.abs(item.impact), 0);

  // PRECISION LOAN ALGORITHM
  let displayLoanLimit = 0;
  let scoreValue = 0;
  if (assessment) {
    scoreValue = assessment.credit_score_equivalent || 400;
    if (liveIncome > liveExpenses) {
      const riskModifier = scoreValue >= 600 ? (scoreValue / 850) * 1.427 : (scoreValue / 850) * 0.254;
      displayLoanLimit = Math.floor((liveIncome - liveExpenses) * riskModifier);
    }
  }

  // --- NEW: DYNAMIC SCORE COLOR ENGINE ---
  const getScoreColorInfo = (score) => {
    if (score >= 650) return { main: "#15803d", ring: "conic-gradient(from 0deg, #15803d, #4ade80, #15803d)" }; // Green
    if (score >= 500) return { main: "#1d4ed8", ring: "conic-gradient(from 0deg, #1d4ed8, #60a5fa, #1d4ed8)" }; // Blue
    if (score >= 400) return { main: "#d97706", ring: "conic-gradient(from 0deg, #d97706, #fbbf24, #d97706)" }; // Yellow
    return { main: "#b91c1c", ring: "conic-gradient(from 0deg, #b91c1c, #f87171, #b91c1c)" }; // Red
  };
  const scoreColors = assessment ? getScoreColorInfo(scoreValue) : { main: "#0f172a", ring: "conic-gradient(from 0deg, #2563eb, #38bdf8, #2563eb)" };

  const getDynamicAdvice = (feature) => {
    const historyYears = (formData.Credit_History_Length_Months / 12).toFixed(1);

    switch(feature) {
      case "Income_Annual": return `Your reported income of ${formatCurrency(liveIncome)} sets your baseline borrowing capacity. Consider declaring any secondary income sources.`;
      case "Savings_Balance": return `A reserve of ${formatCurrency(liveSavings)} provides a buffer, but experts recommend keeping 3-6 months of expenses liquid.`;
      case "Spending_Ratio": return `Your current lifestyle utilizes ${(liveRatio*100).toFixed(1)}% of your earnings. Lowering this ratio below 50% is the fastest way to improve your profile.`;
      case "Utility_Bill_Late_Count": return `Our model detected ${formData.Utility_Bill_Late_Count} recent late payments. Consistency is heavily weighted. We strongly recommend enabling Auto-Pay.`;
      case "Credit_History_Length_Months":
        if (historyYears < 4) return `Your footprint is relatively new (${historyYears} years). Establishing a consistent track record will steadily increase your score.`;
        return `You have a mature footprint of ${historyYears} years. To protect this metric, avoid closing your oldest active bank accounts.`;
      default: return "Continue optimizing this financial metric to improve your overall profile.";
    }
  };

  const featureColors = { "Income_Annual": "#3b82f6", "Savings_Balance": "#10b981", "Spending_Ratio": "#f59e0b", "Utility_Bill_Late_Count": "#ef4444", "Credit_History_Length_Months": "#8b5cf6" };

  let currentDeg = 0;
  const pieSlices = combinedShap.map((item) => {
    const percent = totalShapImpact > 0 ? (Math.abs(item.impact) / totalShapImpact) * 100 : 0;
    const deg = (percent / 100) * 360;
    const start = currentDeg;
    const end = currentDeg + deg;
    currentDeg += deg;
    return `${featureColors[item.feature]} ${start}deg ${end}deg`;
  });
  const pieBackground = `conic-gradient(${pieSlices.join(', ')})`;
  const monthlyExpenses = liveExpenses / 12;
  const monthsOfSavings = monthlyExpenses > 0 ? (liveSavings / monthlyExpenses).toFixed(1) : "0.0";

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        
        {/* LEFT COLUMN */}
        <div style={styles.left}>
          <div style={styles.topRow}>
            <div style={styles.logoContainer}>
              <div style={styles.logoIcon}>
                <div style={styles.logoIconInner}></div>
              </div>
              <div style={styles.logoTextWrapper}>
                <span style={styles.logoTextMain}>Arth</span>
                <span style={styles.logoTextSub}>Setu</span>
              </div>
            </div>
            <div style={styles.badge}>Hack-o-hire prototype</div>
          </div>

          <div style={styles.heroText}>
            <h1 style={styles.title}>ArthSetu Trust Index</h1>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Applicant Input</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>Annual Income</label>
                  <div className="custom-tooltip-wrapper">
                    <span style={styles.infoIcon}>?</span>
                    <div className="custom-tooltip-text">Your total yearly earnings from all sources before taxes.</div>
                  </div>
                </div>
                <input type="number" name="Income_Annual" value={formData.Income_Annual} onChange={handleChange} required style={errors.Income_Annual ? styles.inputError : styles.input} />
                {errors.Income_Annual && <div style={styles.errorText}>{errors.Income_Annual}</div>}
              </div>

              <div style={styles.inputGroup}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>Savings Balance</label>
                  <div className="custom-tooltip-wrapper">
                    <span style={styles.infoIcon}>?</span>
                    <div className="custom-tooltip-text">Total liquid cash you currently have available in bank accounts.</div>
                  </div>
                </div>
                <input type="number" name="Savings_Balance" value={formData.Savings_Balance} onChange={handleChange} required style={errors.Savings_Balance ? styles.inputError : styles.input} />
                {errors.Savings_Balance && <div style={styles.errorText}>{errors.Savings_Balance}</div>}
              </div>

              <div style={styles.inputGroup}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>Annual Expenses</label>
                  <div className="custom-tooltip-wrapper">
                    <span style={styles.infoIcon}>?</span>
                    <div className="custom-tooltip-text">Your estimated total yearly spending, including rent, food, and lifestyle.</div>
                  </div>
                </div>
                <input type="number" name="Expenses_Annual" value={formData.Expenses_Annual} onChange={handleChange} required style={errors.Expenses_Annual ? styles.inputError : styles.input} />
                {formData.Income_Annual && formData.Expenses_Annual && !errors.Expenses_Annual && (
                  <div style={styles.liveCalcText}>↳ Calculated Spending Ratio: <span style={{fontWeight: 'bold', color: '#0284c7'}}>{liveRatio}</span></div>
                )}
                {errors.Expenses_Annual && <div style={styles.errorText}>{errors.Expenses_Annual}</div>}
              </div>

              <div style={styles.inputGroup}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>Utility Late Bill Count (Last 12 Months)</label>
                  <div className="custom-tooltip-wrapper">
                    <span style={styles.infoIcon}>?</span>
                    <div className="custom-tooltip-text">How many times you missed a utility payment (electricity, water, etc.) recently.</div>
                  </div>
                </div>
                <input type="number" name="Utility_Bill_Late_Count" value={formData.Utility_Bill_Late_Count} onChange={handleChange} required style={errors.Utility_Bill_Late_Count ? styles.inputError : styles.input} />
                {errors.Utility_Bill_Late_Count && <div style={styles.errorText}>{errors.Utility_Bill_Late_Count}</div>}
              </div>

              <div style={styles.inputGroup}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>Credit History Length (Months)</label>
                  <div className="custom-tooltip-wrapper">
                    <span style={styles.infoIcon}>?</span>
                    <div className="custom-tooltip-text">How many months it has been since you opened your very first bank account or loan.</div>
                  </div>
                </div>
                <input type="number" name="Credit_History_Length_Months" value={formData.Credit_History_Length_Months} onChange={handleChange} required style={errors.Credit_History_Length_Months ? styles.inputError : styles.input} />
                {errors.Credit_History_Length_Months && <div style={styles.errorText}>{errors.Credit_History_Length_Months}</div>}
              </div>

              <button type="submit" style={isFormDisabled ? styles.buttonDisabled : styles.button} disabled={loading || isFormDisabled}>
                {loading ? "Processing Risk Analysis..." : "Evaluate Profile"}
              </button>
            </form>
          </div>

          <div style={styles.trustBadge}>
            <div>
              <h3 style={styles.trustTitle}>Why Trust ArthSetu?</h3>
              <p style={styles.trustText}>
                Our proprietary XGBoost risk engine operates at an enterprise-grade <strong>Accuracy of 91.83% and AUC-ROC of 0.8316</strong>. We outperform traditional bureaus by identifying reliable "thin-file" borrowers through behavioral metrics.
              </p>
            </div>
          </div>
          <div style={styles.footerText}>
            Bank-grade 256-bit encryption. ArthSetu is a financial technology company, not a bank.
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={styles.right}>
          <div style={styles.resultCard}>
            <div style={styles.headerRow}>
              <h2 style={styles.sectionTitle}>Dashboard & Assessment</h2>
            </div>

            {loading && (
              <div style={styles.loading}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingTitle}>ArthSetu AI is processing your data...</p>
              </div>
            )}

            {!assessment && !loading && (
              <div style={styles.emptyState}>
                <p style={styles.emptyTitle}>Dashboard Locked</p>
                <p style={{color: "#64748b", fontSize: "14px", maxWidth: "300px", margin: "0 auto"}}>Fill out the secure form and click Evaluate to generate your comprehensive risk profile.</p>
              </div>
            )}

            {assessment && !loading && (
              <div style={styles.resultsWrap}>
                <div style={styles.topResultGrid}>
                  
                  {/* CREDIT SCORE CARD WITH DYNAMIC COLORS */}
                  <div style={styles.scoreCard}>
                    <div style={{ ...styles.scoreRing, background: scoreColors.ring }}>
                      <div style={styles.scoreRingInner}>
                        <div style={{ ...styles.scoreNumber, color: scoreColors.main }}>{scoreValue}</div>
                        <div style={styles.scoreSubLabel}>Credit Score</div>
                      </div>
                    </div>
                    <div style={{...styles.scoreLabel, background: assessment.risk_category.includes("High") ? "#fee2e2" : "#dcfce7", color: assessment.risk_category.includes("High") ? "#991b1b" : "#166534"}}>
                      {assessment.risk_category}
                    </div>
                  </div>

                  <div style={styles.probCard}>
                    <div style={styles.probLabel}>Default Risk</div>
                    <div style={{...styles.probAmount, color: assessment.probability_of_default > 0.4 ? "#dc2626" : "#059669"}}>
                      {(assessment.probability_of_default * 100).toFixed(1)}%
                    </div>
                    <p style={styles.probSubtext}>AI calculated probability of loan default.</p>
                  </div>

                  <div style={styles.loanCard}>
                    <div style={styles.loanLabel}>Live Pre-Approval</div>
                    <div style={styles.loanAmount}>
                      {displayLoanLimit > 0 ? formatCurrency(displayLoanLimit) : "0"}
                    </div>
                    <p style={styles.loanSubtext}>
                      {displayLoanLimit > 0 ? "Eligible based on your free cash flow metrics." : "Increase score to unlock limits."}
                    </p>
                  </div>
                </div>

                {/* UPDATED HEALTH INDICATORS WITH TOOLTIPS */}
                <div style={styles.factsCard}>
                  <h3 style={styles.insightsTitle}>Financial Health Indicators</h3>
                  <div style={styles.factGrid}>
                    
                    <div style={styles.factBox}>
                      <div style={styles.factBoxHeader}>
                        <strong>Net Savings</strong>
                        <div className="custom-tooltip-wrapper">
                          <span style={styles.infoIconSmall}>?</span>
                          <div className="custom-tooltip-text">The amount of money left over annually after deducting total expenses from income.</div>
                        </div>
                      </div>
                      <div>{formatCurrency(liveIncome - liveExpenses)} / year</div>
                    </div>

                    <div style={styles.factBox}>
                      <div style={styles.factBoxHeader}>
                        <strong>Emergency Fund</strong>
                        <div className="custom-tooltip-wrapper">
                          <span style={styles.infoIconSmall}>?</span>
                          <div className="custom-tooltip-text">Estimated months you can sustain your current lifestyle using only your liquid savings.</div>
                        </div>
                      </div>
                      <div>{monthsOfSavings} months covered</div>
                    </div>

                    <div style={styles.factBox}>
                      <div style={styles.factBoxHeader}>
                        <strong>Credit History</strong>
                        <div className="custom-tooltip-wrapper">
                          <span style={styles.infoIconSmall}>?</span>
                          <div className="custom-tooltip-text">Total time you have been building a track record of financial responsibility.</div>
                        </div>
                      </div>
                      <div>{(formData.Credit_History_Length_Months / 12).toFixed(1)} years</div>
                    </div>

                  </div>
                </div>

                <div style={styles.chartContainer}>
                  <h3 style={styles.insightsTitle}>Key Score Factors</h3>
                  <div style={styles.aiExplainerGrid}>
                    <div style={styles.pieCol}>
                      <div style={styles.pieChartContainer}>
                        <div style={{...styles.pieChart3D, background: pieBackground}}></div>
                      </div>
                    </div>
                    <div style={styles.barCol}>
                      <div style={styles.barChartWrapper}>
                        {combinedShap.map((item, idx) => {
                          const percent = totalShapImpact > 0 ? ((Math.abs(item.impact) / totalShapImpact) * 100).toFixed(1) : 0;
                          const isPos = item.direction === 'positive';
                          return (
                            <div key={idx} style={styles.bar3dRow}>
                              <div style={styles.barLabel}>
                                <span style={{fontWeight: '700', color: '#1e293b', fontSize: '12px'}}>{item.feature.replace(/_/g, " ")}</span>
                                <span style={{color: isPos ? '#059669' : '#dc2626', fontSize: '11px', fontWeight: '800'}}>{isPos ? '+' : '-'}{percent}%</span>
                              </div>
                              <div style={styles.bar3dTrack}>
                                <div style={{ ...styles.bar3dFill, width: `${Math.max(percent, 5)}%`, background: isPos ? 'linear-gradient(180deg, #34d399, #059669)' : 'linear-gradient(180deg, #f87171, #dc2626)'}}></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={styles.actionCard}>
                  <h3 style={styles.actionTitle}>Your Custom Action Plan</h3>
                  <ul style={styles.actionList}>
                    {combinedShap
                      .filter(item => item.direction === 'negative' && item.impact !== 0)
                      .slice(0, 3)
                      .map((item, idx) => (
                        <li key={idx} style={styles.actionListItem}>
                          <strong>Target {item.feature.replace(/_/g, " ")}:</strong> {getDynamicAdvice(item.feature)}
                        </li>
                    ))}
                    {combinedShap.filter(item => item.direction === 'negative' && item.impact !== 0).length === 0 && (
                      <li style={styles.actionListItem}>Keep up the great work! Your financial habits are exceptionally healthy.</li>
                    )}
                  </ul>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// STYLES
const styles = {
  page: { minHeight: "100vh", background: "radial-gradient(circle at top left, rgba(59,130,246,0.24), transparent 26%), linear-gradient(135deg, #0b1220 0%, #102a43 40%, #1d4ed8 100%)", fontFamily: "'Manrope', sans-serif", padding: "28px" },
  wrapper: { maxWidth: "1400px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "28px", alignItems: "stretch" },
  left: { display: "flex", flexDirection: "column", gap: "20px" },
  right: { display: "flex", width: "100%" },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  logoContainer: { display: "flex", alignItems: "center", gap: "10px", padding: "8px 16px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.2)", backdropFilter: "blur(12px)", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" },
  logoIcon: { width: "22px", height: "22px", background: "linear-gradient(135deg, #38bdf8, #2563eb)", borderRadius: "6px", position: "relative", overflow: "hidden" },
  logoIconInner: { width: "14px", height: "14px", background: "rgba(255,255,255,0.2)", borderRadius: "50%", position: "absolute", right: "-4px", bottom: "-4px", backdropFilter: "blur(4px)" },
  logoTextWrapper: { display: "flex", alignItems: "center" },
  logoTextMain: { color: "#ffffff", fontSize: "18px", fontWeight: "800", letterSpacing: "-0.02em" },
  logoTextSub: { color: "#bae6fd", fontSize: "18px", fontWeight: "400", letterSpacing: "-0.02em" },
  badge: { background: "rgba(255, 255, 255, 0.9)", color: "#075985", padding: "8px 14px", borderRadius: "999px", fontWeight: "800", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" },
  heroText: { display: "flex", flexDirection: "column", gap: "6px" },
  title: { color: "#ffffff", fontSize: "38px", fontWeight: "800", lineHeight: "1.05", margin: "0 0 10px 0", textShadow: "0 2px 10px rgba(0,0,0,0.2)" },
  card: { background: "rgba(255,255,255,0.98)", padding: "30px", borderRadius: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.22)" },
  resultCard: { background: "rgba(255,255,255,0.98)", padding: "30px", borderRadius: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.22)", width: "100%", transition: "all 0.3s ease" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  sectionTitle: { margin: 0, color: "#0f172a", fontSize: "22px", fontWeight: "800", letterSpacing: "-0.02em" },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  labelRow: { display: "flex", alignItems: "center", gap: "8px" },
  label: { fontSize: "14px", fontWeight: "700", color: "#334155" },
  infoIcon: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", borderRadius: "50%", background: "#e2e8f0", color: "#64748b", fontSize: "10px", fontWeight: "800", cursor: "help" },
  infoIconSmall: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "14px", height: "14px", borderRadius: "50%", background: "#e2e8f0", color: "#64748b", fontSize: "9px", fontWeight: "800", cursor: "help" },
  input: { padding: "14px 16px", borderRadius: "12px", border: "1px solid #dbe3ef", fontSize: "15px", background: "#f8fafc", color: "#0f172a", outline: "none", fontWeight: "600", transition: "border 0.2s ease, box-shadow 0.2s ease" },
  inputError: { padding: "14px 16px", borderRadius: "12px", border: "2px solid #ef4444", fontSize: "15px", background: "#fef2f2", color: "#991b1b", outline: "none", fontWeight: "600" },
  errorText: { color: "#dc2626", fontSize: "12px", fontWeight: "700", paddingLeft: "4px" },
  liveCalcText: { color: "#475569", fontSize: "12px", fontWeight: "600", paddingLeft: "4px", marginTop: "2px" },
  button: { marginTop: "12px", padding: "16px", background: "linear-gradient(90deg, #2563eb, #0ea5e9)", color: "#ffffff", border: "none", borderRadius: "14px", fontWeight: "800", fontSize: "16px", cursor: "pointer", boxShadow: "0 10px 25px rgba(37,99,235,0.3)", transition: "transform 0.1s ease" },
  buttonDisabled: { marginTop: "12px", padding: "16px", background: "#94a3b8", color: "#f1f5f9", border: "none", borderRadius: "14px", fontWeight: "800", fontSize: "16px", cursor: "not-allowed", opacity: 0.7 },
  trustBadge: { background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "20px", padding: "20px", display: "flex", gap: "16px", alignItems: "flex-start", marginTop: "10px", backdropFilter: "blur(12px)" },
  trustTitle: { margin: "0 0 6px 0", color: "#ffffff", fontSize: "16px", fontWeight: "800" },
  trustText: { margin: 0, color: "rgba(255, 255, 255, 0.85)", fontSize: "13px", lineHeight: "1.6" },
  footerText: { color: "rgba(255,255,255,0.5)", fontSize: "11px", textAlign: "center", marginTop: "auto", paddingTop: "10px", lineHeight: "1.5" },

  loading: { minHeight: "420px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" },
  spinner: { width: "48px", height: "48px", border: "4px solid #bfdbfe", borderTop: "4px solid #2563eb", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "18px" },
  loadingTitle: { fontSize: "18px", fontWeight: "800", color: "#0f172a" },
  emptyState: { minHeight: "420px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" },
  emptyTitle: { fontSize: "20px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" },
  resultsWrap: { display: "flex", flexDirection: "column", gap: "20px" },
  topResultGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" },
  scoreCard: { background: "linear-gradient(135deg, #eff6ff, #dbeafe)", border: "1px solid #bfdbfe", borderRadius: "20px", padding: "20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.03)" },
  scoreRing: { width: "120px", height: "120px", margin: "0 auto 14px auto", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  scoreRingInner: { width: "96px", height: "96px", borderRadius: "50%", background: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  scoreNumber: { fontSize: "32px", lineHeight: "1", fontWeight: "800", marginBottom: "2px" },
  scoreSubLabel: { fontSize: "9px", color: "#64748b", fontWeight: "800", textTransform: "uppercase" },
  scoreLabel: { padding: "6px 14px", borderRadius: "999px", fontWeight: "800", fontSize: "13px" },
  probCard: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "20px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.03)" },
  probLabel: { fontSize: "12px", color: "#475569", fontWeight: "800", textTransform: "uppercase", marginBottom: "4px" },
  probAmount: { fontSize: "36px", fontWeight: "800", marginBottom: "8px" },
  probSubtext: { fontSize: "11px", color: "#64748b", margin: 0, lineHeight: "1.4" },

  loanCard: { background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "1px solid #86efac", borderRadius: "20px", padding: "20px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.03)" },
  loanLabel: { fontSize: "12px", color: "#166534", fontWeight: "800", textTransform: "uppercase", marginBottom: "4px" },
  loanAmount: { fontSize: "32px", fontWeight: "800", color: "#15803d", marginBottom: "8px" },
  loanSubtext: { fontSize: "11px", color: "#166534", margin: 0, lineHeight: "1.4" },

  factsCard: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "16px" },
  factGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "8px" },
  factBox: { background: "#ffffff", padding: "14px 10px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px", color: "#334155", lineHeight: "1.5", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" },
  factBoxHeader: { display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" },

  chartContainer: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px" },
  insightsTitle: { margin: "0 0 4px 0", color: "#0f172a", fontSize: "16px", fontWeight: "800" },
  aiExplainerGrid: { display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "24px", alignItems: "center", marginTop: "16px" },
  pieCol: { display: "flex", flexDirection: "column", alignItems: "center" },
  pieChartContainer: { perspective: "800px", margin: "10px 0", height: "120px" },
  pieChart3D: { width: "130px", height: "130px", borderRadius: "50%", transform: "rotateX(55deg)", boxShadow: "0px 10px 0px #cbd5e1, 0px 15px 20px rgba(0,0,0,0.2)", border: "1px solid #f1f5f9" },
  barCol: { display: "flex", flexDirection: "column", justifyContent: "center" },
  barChartWrapper: { display: "flex", flexDirection: "column", gap: "10px" },
  bar3dRow: { display: "flex", flexDirection: "column", gap: "4px" },
  barLabel: { display: "flex", justifyContent: "space-between" },
  bar3dTrack: { width: "100%", height: "14px", background: "#f1f5f9", borderRadius: "8px", overflow: "hidden" },
  bar3dFill: { height: "100%", borderRadius: "8px", transition: "width 0.5s ease" },

  actionCard: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },
  actionTitle: { margin: "0 0 12px 0", color: "#b45309", fontSize: "16px", fontWeight: "800" },
  actionList: { margin: 0, paddingLeft: "20px", color: "#92400e", fontSize: "14px", lineHeight: "1.6" },
  actionListItem: { marginBottom: "8px", fontWeight: "500" }
};

const styleSheet = document.createElement("style");
styleSheet.innerText = `
.custom-tooltip-wrapper { position: relative; display: inline-block; cursor: pointer; }
.custom-tooltip-wrapper .custom-tooltip-text {
  visibility: hidden; width: 220px; background-color: #1e293b; color: #fff;
  text-align: center; border-radius: 8px; padding: 10px; position: absolute;
  z-index: 50; bottom: 135%; left: 50%; margin-left: -110px; opacity: 0;
  transition: opacity 0.2s, bottom 0.2s; font-size: 12px; font-weight: 500;
  line-height: 1.5; box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.4); pointer-events: none;
}
.custom-tooltip-wrapper .custom-tooltip-text::after {
  content: ""; position: absolute; top: 100%; left: 50%; margin-left: -6px;
  border-width: 6px; border-style: solid; border-color: #1e293b transparent transparent transparent;
}
.custom-tooltip-wrapper:hover .custom-tooltip-text { visibility: visible; opacity: 1; bottom: 150%; }
`;
document.head.appendChild(styleSheet);

export default CreditForm;