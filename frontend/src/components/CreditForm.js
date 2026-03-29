import React, { useState } from "react";

function CreditForm({ onNewApplication }) {
  const [activeTab, setActiveTab] = useState("Main");
  const [currentAppId, setCurrentAppId] = useState("");

  const [formData, setFormData] = useState({
    Name: "", Age: "", Gender: "Prefer not to say", Country: "India",
    ID_Type: "Aadhar Card", ID_Number: "", Region: "Urban", Occupation: "Salaried", Dependents: "",
    Income_Annual: "", Savings_Balance: "", Expenses_Annual: "", Utility_Bill_Late_Count: "", Credit_History_Length_Months: ""
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const handleCountryChange = (e) => {
    const country = e.target.value;
    let newIdType = "Aadhar Card";
    if (country === "USA") newIdType = "SSN";
    if (country === "UK") newIdType = "National Insurance";
    if (country === "UAE") newIdType = "Emirates ID";
    setFormData(prev => ({ ...prev, Country: country, ID_Type: newIdType, ID_Number: "" }));
  };

  const validateInput = (name, value, currentData, type) => {
    if (type !== "number") return "";
    const valNum = Number(value);
    if (valNum < 0) return "Cannot be negative.";
    if (name === "Credit_History_Length_Months" && valNum > 1000) return "Invalid timeframe.";
    if (name === "Utility_Bill_Late_Count" && valNum > 50) return "Unrealistic late count.";
    if (name === "Income_Annual" && valNum > 1000000000) return "Unrealistic income.";
    if ((name === "Utility_Bill_Late_Count" || name === "Credit_History_Length_Months" || name === "Dependents" || name === "Age") && value !== "" && !Number.isInteger(valNum)) return "Must be a whole number.";
    const inc = name === "Income_Annual" ? valNum : Number(currentData.Income_Annual);
    const sav = name === "Savings_Balance" ? valNum : Number(currentData.Savings_Balance);
    const exp = name === "Expenses_Annual" ? valNum : Number(currentData.Expenses_Annual);
    if (inc > 0 && sav >= 0 && exp > (inc + sav)) {
      if (name === "Expenses_Annual") return "Expenses exceed Income + Savings.";
    }
    return "";
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === "number" && value.includes('-')) return;
    const errorMsg = validateInput(name, value, formData, type);
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: errorMsg }));
    if (name === "Income_Annual" || name === "Savings_Balance") {
      const expError = validateInput("Expenses_Annual", formData.Expenses_Annual, { ...formData, [name]: value }, "number");
      setErrors(prev => ({ ...prev, Expenses_Annual: expError }));
    }
  };

  const liveIncome = Number(formData.Income_Annual);
  const liveExpenses = Number(formData.Expenses_Annual);
  const liveSavings = Number(formData.Savings_Balance);
  const liveRatio = liveIncome > 0 ? (liveExpenses / liveIncome).toFixed(3) : "0.000";

  const requiredKeys = ["Name", "Age", "Dependents", "ID_Number", "Income_Annual", "Savings_Balance", "Expenses_Annual", "Utility_Bill_Late_Count", "Credit_History_Length_Months"];
  const hasErrors = Object.values(errors).some(err => err !== "");
  const isEmpty = requiredKeys.some(key => formData[key] === "");
  const isFormDisabled = hasErrors || isEmpty;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFormDisabled) return;
    setLoading(true); setResult(null);
    
    const newAppId = "AS-" + Math.floor(10000 + Math.random() * 90000);
    setCurrentAppId(newAppId);

    const requestData = {
      ...formData, Age: Number(formData.Age), Dependents: Number(formData.Dependents),
      Income_Annual: liveIncome, Savings_Balance: liveSavings, Spending_Ratio: Number(liveRatio),
      Utility_Bill_Late_Count: Number(formData.Utility_Bill_Late_Count), Credit_History_Length_Months: Number(formData.Credit_History_Length_Months),
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/evaluate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicant_id: newAppId, financial_data: requestData })
      });
      const data = await response.json();
      if (!response.ok) throw new Error("Backend failed");
      setTimeout(() => { setResult(data); setLoading(false); }, 900);
      if(onNewApplication) onNewApplication(newAppId);
    } catch (error) {
      alert("Backend connection failed."); setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
        const response = await fetch("http://127.0.0.1:8000/api/v1/audit");
        const data = await response.json();
        setAuditLogs(data.reverse()); 
    } catch(e) { console.error(e); }
    setAuditLoading(false);
  };

  const handleLogin = () => {
    if (passwordInput === "admin123") {
        setIsAuthenticated(true); setAuthError(false); fetchAuditLogs();
    } else { setAuthError(true); }
  };

  const downloadCSV = () => {
    if (auditLogs.length === 0) return;
    const headers = Object.keys(auditLogs[0]).join(",");
    const rows = auditLogs.map(log => Object.values(log).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ArthSetu_Audit_Log.csv'; a.click();
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);

  const assessment = result?.assessment;
  const rawShapExplanations = result?.shap_explanations || { positive_factors: [], negative_factors: [] };
  const rawCombinedShap = [
    ...(rawShapExplanations.positive_factors || []).map(f => ({ ...f, direction: 'positive' })),
    ...(rawShapExplanations.negative_factors || []).map(f => ({ ...f, direction: 'negative' }))
  ];

  const allowedFeatures = ["Income_Annual", "Savings_Balance", "Spending_Ratio", "Utility_Bill_Late_Count", "Credit_History_Length_Months"];
  const combinedShap = rawCombinedShap.filter(item => allowedFeatures.includes(item.feature)).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  const totalShapImpact = combinedShap.reduce((sum, item) => sum + Math.abs(item.impact), 0) || 1;

  let displayLoanLimit = 0; let scoreValue = 0;
  if (assessment) { scoreValue = assessment.credit_score_equivalent || 400; displayLoanLimit = assessment.max_approval_limit || 0; }

  const getScoreColorInfo = (score) => {
    if (score >= 650) return { main: "#10b981", ring: "conic-gradient(from 0deg, #10b981, #34d399, #10b981)" };
    if (score >= 500) return { main: "#3b82f6", ring: "conic-gradient(from 0deg, #3b82f6, #60a5fa, #3b82f6)" };
    if (score >= 400) return { main: "#f59e0b", ring: "conic-gradient(from 0deg, #f59e0b, #fbbf24, #f59e0b)" };
    return { main: "#ef4444", ring: "conic-gradient(from 0deg, #ef4444, #f87171, #ef4444)" };
  };
  const scoreColors = assessment ? getScoreColorInfo(scoreValue) : { main: "#0f172a", ring: "conic-gradient(from 0deg, #e2e8f0, #cbd5e1, #e2e8f0)" };
  
  const getDynamicAdvice = (feature) => {
    const historyYears = (formData.Credit_History_Length_Months / 12).toFixed(1);
    switch(feature) {
      case "Income_Annual": return `Your reported income sets your baseline capacity.`;
      case "Savings_Balance": return `Aim to keep 3-6 months of expenses in liquid reserves.`;
      case "Spending_Ratio": return `Lowering your spending ratio below 50% is critical for approval.`;
      case "Utility_Bill_Late_Count": return `Model detected late payments. Enable Auto-Pay immediately.`;
      case "Credit_History_Length_Months": return historyYears < 4 ? `Your footprint is new (${historyYears} yrs). Maintain active accounts.` : `Protect your mature ${historyYears} yr footprint.`;
      default: return "Continue optimizing this financial metric.";
    }
  };

  const featureColors = { "Income_Annual": "#3b82f6", "Savings_Balance": "#10b981", "Spending_Ratio": "#f59e0b", "Utility_Bill_Late_Count": "#ef4444", "Credit_History_Length_Months": "#8b5cf6" };

  let currentDeg = 0;
  const pieSlices = combinedShap.map((item) => {
    const percent = totalShapImpact > 0 ? (Math.abs(item.impact) / totalShapImpact) * 100 : 0;
    const deg = (percent / 100) * 360;
    const start = currentDeg; const end = currentDeg + deg; currentDeg += deg;
    return `${featureColors[item.feature] || '#94a3b8'} ${start}deg ${end}deg`;
  });
  const pieBackground = pieSlices.length > 0 ? `conic-gradient(${pieSlices.join(', ')})` : "#e2e8f0";
  const monthlyExpenses = liveExpenses / 12;
  const monthsOfSavings = monthlyExpenses > 0 ? (liveSavings / monthlyExpenses).toFixed(1) : "0.0";

  return (
    <div style={{width: "100%", padding: "28px", maxWidth: "1400px", margin: "0 auto", boxSizing: "border-box"}}>
      
      {/* TOP NAVIGATION HEADER */}
      <div style={styles.topRow}>
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}><div style={styles.logoIconInner}></div></div>
          <div style={styles.logoTextWrapper}>
            <span style={styles.logoTextMain}>Arth</span><span style={styles.logoTextSub}>Setu</span>
          </div>
        </div>

        {/* --- THE TAB TOGGLE --- */}
        <div style={styles.tabContainer}>
          <button 
            onClick={() => setActiveTab("Main")} 
            style={activeTab === "Main" ? styles.tabActive : styles.tabInactive}>
            DATA INPUT
          </button>
          <button 
            onClick={() => setActiveTab("Audit")} 
            style={activeTab === "Audit" ? styles.tabActive : styles.tabInactive}>
            AUDIT HISTORY
          </button>
        </div>

        <div style={styles.badge}>Production Core</div>
      </div>

      {/* VIEW 1: MAIN DASHBOARD */}
      {activeTab === "Main" && (
        <div style={styles.wrapper}>
          {/* LEFT COLUMN: FORM */}
          <div style={styles.left}>
            <div style={styles.heroText}>
              <h1 style={styles.title}>Applicant Profiling</h1>
            </div>

            <div style={styles.card}>
              <form onSubmit={handleSubmit} style={styles.form}>
                <h2 style={styles.sectionTitle}>1. Core Demographics</h2>
                
                <div style={styles.inputGrid}>
                  <div style={styles.inputGroup}>
                    <div style={styles.labelRow}><label style={styles.label}>Name</label></div>
                    <input type="text" name="Name" placeholder="Full Name" value={formData.Name} onChange={handleChange} required style={styles.input} />
                  </div>
                  <div style={styles.inputGroup}>
                    <div style={styles.labelRow}><label style={styles.label}>Application ID</label></div>
                    <input value={currentAppId ? `ID: ${currentAppId}` : "ID: (Generated on Submit)"} disabled style={styles.inputDisabled} />
                  </div>
                </div>

                <div style={styles.inputGrid}>
                  <div style={styles.inputGroup}>
                    <div style={styles.labelRow}><label style={styles.label}>Age</label></div>
                    <input type="number" name="Age" placeholder="Age" value={formData.Age} onChange={handleChange} required style={errors.Age ? styles.inputError : styles.input} />
                    {errors.Age && <div style={styles.errorText}>{errors.Age}</div>}
                  </div>
                  <div style={styles.inputGroup}>
                    <div style={styles.labelRow}>
                      <label style={styles.label}>Gender</label>
                      <div className="custom-tooltip-wrapper"><span style={styles.infoIconSmall}>?</span><div className="custom-tooltip-text">Isolated from ML to prevent redlining.</div></div>
                    </div>
                    <select name="Gender" value={formData.Gender} onChange={handleChange} style={styles.input}>
                      <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div style={styles.inputGrid}>
                  <div style={styles.inputGroup}>
                    <div style={styles.labelRow}><label style={styles.label}>Country of Residence</label></div>
                    <select name="Country" value={formData.Country} onChange={handleCountryChange} style={styles.input}>
                      <option value="India">India</option><option value="USA">USA</option><option value="UK">UK</option><option value="UAE">UAE</option>
                    </select>
                  </div>
                  <div style={styles.inputGroup}>
                    <div style={styles.labelRow}><label style={styles.label}>ID Type</label></div>
                    <div style={{...styles.inputDisabled, background: '#f8fafc', color: '#64748b', textAlign: 'left', fontWeight: '600'}}>{formData.ID_Type}</div>
                  </div>
                </div>

                <div style={styles.inputGrid}>
                  <div style={styles.inputGroup}>
                    <div style={styles.labelRow}><label style={styles.label}>Enter {formData.ID_Type}</label></div>
                    <input type="text" name="ID_Number" placeholder={`Enter ${formData.ID_Type}`} value={formData.ID_Number} onChange={handleChange} required style={styles.input} />
                  </div>
                  <div style={styles.inputGroup}>
                    <div style={styles.labelRow}><label style={styles.label}>Occupation</label></div>
                    <select name="Occupation" value={formData.Occupation} onChange={handleChange} style={styles.input}>
                      <option>Salaried</option><option>Self-Employed</option><option>Unemployed</option>
                    </select>
                  </div>
                </div>

                <div style={styles.inputGrid}>
                  <div style={styles.inputGroup}>
                    <div style={styles.labelRow}><label style={styles.label}>Region</label></div>
                    <select name="Region" value={formData.Region} onChange={handleChange} style={styles.input}>
                      <option>Urban</option><option>Semi-Urban</option><option>Rural</option>
                    </select>
                  </div>
                  <div style={styles.inputGroup}>
                    <div style={styles.labelRow}><label style={styles.label}>Dependents</label></div>
                    <input type="number" name="Dependents" placeholder="Dependents" value={formData.Dependents} onChange={handleChange} required style={errors.Dependents ? styles.inputError : styles.input} />
                    {errors.Dependents && <div style={styles.errorText}>{errors.Dependents}</div>}
                  </div>
                </div>

                <h2 style={{...styles.sectionTitle, marginTop: '20px'}}>2. Financial Health</h2>
                <div style={styles.inputGroup}>
                  <div style={styles.labelRow}><label style={styles.label}>Annual Income (INR)</label></div>
                  <input type="number" name="Income_Annual" value={formData.Income_Annual} onChange={handleChange} required style={errors.Income_Annual ? styles.inputError : styles.input} />
                  {errors.Income_Annual && <div style={styles.errorText}>{errors.Income_Annual}</div>}
                </div>

                <div style={styles.inputGroup}>
                  <div style={styles.labelRow}><label style={styles.label}>Savings Balance (INR)</label></div>
                  <input type="number" name="Savings_Balance" value={formData.Savings_Balance} onChange={handleChange} required style={errors.Savings_Balance ? styles.inputError : styles.input} />
                  {errors.Savings_Balance && <div style={styles.errorText}>{errors.Savings_Balance}</div>}
                </div>

                <div style={styles.inputGroup}>
                  <div style={styles.labelRow}><label style={styles.label}>Annual Expenses (INR)</label></div>
                  <input type="number" name="Expenses_Annual" value={formData.Expenses_Annual} onChange={handleChange} required style={errors.Expenses_Annual ? styles.inputError : styles.input} />
                  {formData.Income_Annual && formData.Expenses_Annual && !errors.Expenses_Annual && (
                    <div style={styles.liveCalcText}>↳ Calculated Spending Ratio: <span style={{fontWeight: 'bold', color: '#0ea5e9'}}>{liveRatio}</span></div>
                  )}
                  {errors.Expenses_Annual && <div style={styles.errorText}>{errors.Expenses_Annual}</div>}
                </div>

                <div style={styles.inputGrid}>
                    <div style={styles.inputGroup}>
                      <div style={styles.labelRow}>
                        <label style={styles.label}>Late Utility Bills</label>
                        <div className="custom-tooltip-wrapper"><span style={styles.infoIconSmall}>?</span><div className="custom-tooltip-text">Missed payments in the last 12 months.</div></div>
                      </div>
                      <input type="number" name="Utility_Bill_Late_Count" value={formData.Utility_Bill_Late_Count} onChange={handleChange} required style={errors.Utility_Bill_Late_Count ? styles.inputError : styles.input} />
                      {errors.Utility_Bill_Late_Count && <div style={styles.errorText}>{errors.Utility_Bill_Late_Count}</div>}
                    </div>
                    <div style={styles.inputGroup}>
                      <div style={styles.labelRow}>
                        <label style={styles.label}>Credit Hist (Mo)</label>
                        <div className="custom-tooltip-wrapper"><span style={styles.infoIconSmall}>?</span><div className="custom-tooltip-text">Months since your first financial account was opened.</div></div>
                      </div>
                      <input type="number" name="Credit_History_Length_Months" value={formData.Credit_History_Length_Months} onChange={handleChange} required style={errors.Credit_History_Length_Months ? styles.inputError : styles.input} />
                      {errors.Credit_History_Length_Months && <div style={styles.errorText}>{errors.Credit_History_Length_Months}</div>}
                    </div>
                </div>

                <button type="submit" style={isFormDisabled ? styles.buttonDisabled : styles.button} disabled={loading || isFormDisabled}>
                  {loading ? "Processing Risk Analysis..." : "Evaluate Profile"}
                </button>
              </form>
            </div>
            <div style={styles.footerText}>Bank-grade 256-bit encryption active.</div>
          </div>

          {/* RIGHT COLUMN: DASHBOARD */}
          <div style={styles.right}>
            <div style={styles.resultCard}>
              <div style={styles.headerRow}>
                <h2 style={{...styles.sectionTitle, fontSize: "20px", color: "#0f172a", margin: 0}}>INTELLIGENCE DASHBOARD</h2>
              </div>

              {loading && (
                <div style={styles.loading}>
                  <div style={styles.spinner}></div>
                  <p style={styles.loadingTitle}>ArthSetu AI is analyzing profile...</p>
                </div>
              )}

              {!assessment && !loading && (
                <div style={styles.emptyState}>
                  <p style={styles.emptyTitle}>Dashboard Locked</p>
                  <p style={{color: "#64748b", fontSize: "14px", maxWidth: "300px", margin: "0 auto"}}>Input variables on the left and evaluate to generate predictive metrics.</p>
                </div>
              )}

              {assessment && !loading && (
                <div style={styles.resultsWrap}>
                  <div style={styles.topResultGrid}>
                    
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
                      <p style={styles.probSubtext}>AI calculated probability of default.</p>
                    </div>

                    <div style={styles.loanCard}>
                      <div style={styles.loanLabel}>Live Pre-Approval</div>
                      <div style={styles.loanAmount}>
                        {displayLoanLimit > 0 ? formatCurrency(displayLoanLimit) : "0"}
                      </div>
                      <p style={styles.loanSubtext}>
                        {displayLoanLimit > 0 ? "Eligible based on risk profile." : "Increase score to unlock."}
                      </p>
                    </div>
                  </div>

                  <div style={styles.factsCard}>
                    <h3 style={styles.insightsTitle}>Financial Health Indicators</h3>
                    <div style={styles.factGrid}>
                      <div style={styles.factBox}>
                        <div style={styles.factBoxHeader}>
                          <strong>Net Savings</strong>
                          <div className="custom-tooltip-wrapper"><span style={styles.infoIconSmall}>?</span><div className="custom-tooltip-text">Annual remainder after expenses.</div></div>
                        </div>
                        <div style={{fontSize: "15px", fontWeight: "700"}}>{formatCurrency(liveIncome - liveExpenses)} / year</div>
                      </div>
                      <div style={styles.factBox}>
                        <div style={styles.factBoxHeader}>
                          <strong>Emergency Fund</strong>
                          <div className="custom-tooltip-wrapper"><span style={styles.infoIconSmall}>?</span><div className="custom-tooltip-text">Months sustained by liquid savings.</div></div>
                        </div>
                        <div style={{fontSize: "15px", fontWeight: "700"}}>{monthsOfSavings} months covered</div>
                      </div>
                      <div style={styles.factBox}>
                        <div style={styles.factBoxHeader}>
                          <strong>Credit History</strong>
                          <div className="custom-tooltip-wrapper"><span style={styles.infoIconSmall}>?</span><div className="custom-tooltip-text">Total track record length.</div></div>
                        </div>
                        <div style={{fontSize: "15px", fontWeight: "700"}}>{(formData.Credit_History_Length_Months / 12).toFixed(1)} years</div>
                      </div>
                    </div>
                  </div>

                  <div style={styles.chartContainer}>
                    <h3 style={styles.insightsTitle}>Key Predictive Factors</h3>
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
                                  <span style={{fontWeight: '700', color: '#1e293b', fontSize: '13px'}}>{item.feature.replace(/_/g, " ")}</span>
                                  <span style={{color: isPos ? '#059669' : '#dc2626', fontSize: '12px', fontWeight: '800'}}>{item.message}</span>
                                </div>
                                <div style={styles.bar3dTrack}>
                                  <div style={{ ...styles.bar3dFill, width: `${Math.max(percent, 5)}%`, background: isPos ? 'linear-gradient(90deg, #34d399, #059669)' : 'linear-gradient(90deg, #f87171, #dc2626)'}}></div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={styles.actionCard}>
                    <h3 style={styles.actionTitle}>Strategic Action Plan</h3>
                    <ul style={styles.actionList}>
                      {combinedShap
                        .filter(item => item.direction === 'negative' && item.impact !== 0)
                        .slice(0, 3)
                        .map((item, idx) => (
                          <li key={idx} style={styles.actionListItem}>
                            <strong>Optimize {item.feature.replace(/_/g, " ")}:</strong> {getDynamicAdvice(item.feature)}
                          </li>
                      ))}
                      {combinedShap.filter(item => item.direction === 'negative' && item.impact !== 0).length === 0 && (
                        <li style={styles.actionListItem}>Profile optimized. Maintain current trajectory.</li>
                      )}
                    </ul>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SECURE AUDIT HISTORY */}
      {activeTab === "Audit" && (
        <div style={styles.auditWrapper}>
          <div style={styles.cardFull}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
                <h2 style={{...styles.sectionTitle, fontSize: "24px", color: "#0f172a", margin: 0}}>System Audit Log</h2>
                {isAuthenticated && (
                    <div style={{display: 'flex', gap: '10px'}}>
                        <button onClick={downloadCSV} style={styles.actionBtn}>📥 Export CSV</button>
                        <button onClick={fetchAuditLogs} style={{...styles.actionBtn, background: '#334155'}}>🔄 Refresh Data</button>
                    </div>
                )}
            </div>
            
            {!isAuthenticated ? (
                <div style={styles.authBox}>
                    <p style={{marginBottom: '15px', color: '#64748b'}}>Secure area. Enter admin credentials.</p>
                    <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="PIN (admin123)" style={{...styles.input, textAlign: 'center', marginBottom: '15px'}} />
                    <button onClick={handleLogin} style={styles.button}>Unlock Logs</button>
                    {authError && <p style={{color: '#dc2626', fontWeight: 'bold', marginTop: '10px'}}>Invalid credentials.</p>}
                </div>
            ) : (
                <div>
                    {auditLoading ? (
                        <div style={{display: 'flex', justifyContent: 'center', padding: '40px'}}>
                            <div style={styles.spinner}></div>
                        </div>
                    ) : (
                        <div style={{overflowX: 'auto', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: "0 4px 15px rgba(0,0,0,0.02)"}}>
                            <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#ffffff'}}>
                                <thead>
                                    <tr>
                                        {['Timestamp', 'App ID', 'Age', 'Gender', 'Score', 'Status', 'Income', 'Loan Limit'].map(h => (
                                          <th key={h} style={{padding: '16px 14px', background: '#f8fafc', color: '#475569', fontWeight: '800', fontSize: '12px', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0'}}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.length === 0 ? (
                                        <tr><td colSpan="8" style={{padding: '30px', textAlign: 'center', color: '#64748b'}}>No applications processed yet.</td></tr>
                                    ) : (
                                        auditLogs.map((log, i) => (
                                            <tr key={i} style={{borderBottom: '1px solid #f1f5f9'}}>
                                                <td style={{padding: '16px 14px', color: '#475569', fontSize: '13px'}}>{log.Timestamp}</td>
                                                <td style={{padding: '16px 14px', color: '#2563eb', fontSize: '13px', fontWeight: '800'}}>{log.App_ID}</td>
                                                <td style={{padding: '16px 14px', color: '#1e293b', fontSize: '13px'}}>{log.Age || 'N/A'}</td>
                                                <td style={{padding: '16px 14px', color: '#1e293b', fontSize: '13px'}}>{log.Gender || 'N/A'}</td>
                                                <td style={{padding: '16px 14px', color: '#0f172a', fontSize: '14px', fontWeight: '800'}}>{log.Score}</td>
                                                <td style={{padding: '16px 14px'}}>
                                                    <span style={{
                                                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '800',
                                                        background: log.Status === 'Low Risk' ? '#dcfce7' : log.Status === 'Medium Risk' ? '#fef9c3' : '#fee2e2',
                                                        color: log.Status === 'Low Risk' ? '#166534' : log.Status === 'Medium Risk' ? '#854d0e' : '#991b1b'
                                                    }}>
                                                        {log.Status}
                                                    </span>
                                                </td>
                                                <td style={{padding: '16px 14px', color: '#1e293b', fontSize: '13px'}}>₹{log.Income}</td>
                                                <td style={{padding: '16px 14px', color: '#15803d', fontSize: '14px', fontWeight: '800'}}>
                                                    {log.Eligible_Loan ? `₹${log.Eligible_Loan}` : 'N/A'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// PREMIUM STYLES MERGED
const styles = {
  wrapper: { width: "100%", display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "28px", alignItems: "stretch", marginTop: "20px" },
  auditWrapper: { width: "100%", marginTop: "20px" },
  left: { display: "flex", flexDirection: "column", gap: "20px" },
  right: { display: "flex", width: "100%" },
  
  // HEADER & TABS
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  logoContainer: { display: "flex", alignItems: "center", gap: "10px", padding: "8px 16px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.2)", backdropFilter: "blur(12px)", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" },
  logoIcon: { width: "22px", height: "22px", background: "linear-gradient(135deg, #38bdf8, #2563eb)", borderRadius: "6px", position: "relative", overflow: "hidden" },
  logoIconInner: { width: "14px", height: "14px", background: "rgba(255,255,255,0.2)", borderRadius: "50%", position: "absolute", right: "-4px", bottom: "-4px", backdropFilter: "blur(4px)" },
  logoTextWrapper: { display: "flex", alignItems: "center" },
  logoTextMain: { color: "#ffffff", fontSize: "18px", fontWeight: "800", letterSpacing: "-0.02em" },
  logoTextSub: { color: "#bae6fd", fontSize: "18px", fontWeight: "400", letterSpacing: "-0.02em" },
  badge: { background: "rgba(255, 255, 255, 0.9)", color: "#075985", padding: "8px 14px", borderRadius: "999px", fontWeight: "800", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" },
  
  tabContainer: { display: "flex", background: "rgba(15,23,42,0.5)", padding: "6px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" },
  tabActive: { background: "linear-gradient(90deg, #2563eb, #0ea5e9)", color: "white", border: "none", padding: "10px 24px", borderRadius: "999px", fontWeight: "800", fontSize: "13px", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 15px rgba(37,99,235,0.4)" },
  tabInactive: { background: "transparent", color: "#cbd5e1", border: "none", padding: "10px 24px", borderRadius: "999px", fontWeight: "700", fontSize: "13px", cursor: "pointer", transition: "all 0.2s" },

  heroText: { display: "flex", flexDirection: "column", gap: "6px" },
  title: { color: "#ffffff", fontSize: "32px", fontWeight: "800", lineHeight: "1.05", margin: "0 0 10px 0", textShadow: "0 2px 10px rgba(0,0,0,0.2)" },
  card: { background: "rgba(255,255,255,0.98)", padding: "30px", borderRadius: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.22)" },
  cardFull: { background: "rgba(255,255,255,0.98)", padding: "40px", borderRadius: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.22)", minHeight: "500px" },
  resultCard: { background: "rgba(255,255,255,0.98)", padding: "30px", borderRadius: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.22)", width: "100%", transition: "all 0.3s ease", display: "flex", flexDirection: "column" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  sectionTitle: { margin: "0 0 10px 0", color: "#0f172a", fontSize: "16px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px" },
  
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  inputGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  labelRow: { display: "flex", alignItems: "center", gap: "8px" },
  label: { fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" },
  infoIconSmall: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "14px", height: "14px", borderRadius: "50%", background: "#e2e8f0", color: "#64748b", fontSize: "9px", fontWeight: "800", cursor: "help" },
  input: { padding: "14px 16px", borderRadius: "12px", border: "1px solid #dbe3ef", fontSize: "14px", background: "#f8fafc", color: "#0f172a", outline: "none", fontWeight: "600", transition: "border 0.2s ease", width: "100%", boxSizing: "border-box" },
  inputDisabled: { padding: "14px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "14px", background: "#f1f5f9", color: "#2563eb", fontWeight: "800", width: "100%", boxSizing: "border-box", textAlign: "center" },
  inputError: { padding: "14px 16px", borderRadius: "12px", border: "2px solid #ef4444", fontSize: "14px", background: "#fef2f2", color: "#991b1b", outline: "none", fontWeight: "600", width: "100%", boxSizing: "border-box" },
  errorText: { color: "#dc2626", fontSize: "12px", fontWeight: "700", paddingLeft: "4px" },
  liveCalcText: { color: "#475569", fontSize: "12px", fontWeight: "600", paddingLeft: "4px", marginTop: "2px" },
  button: { marginTop: "12px", padding: "16px", background: "linear-gradient(90deg, #2563eb, #0ea5e9)", color: "#ffffff", border: "none", borderRadius: "14px", fontWeight: "800", fontSize: "16px", cursor: "pointer", boxShadow: "0 10px 25px rgba(37,99,235,0.3)", transition: "transform 0.1s ease" },
  buttonDisabled: { marginTop: "12px", padding: "16px", background: "#94a3b8", color: "#f1f5f9", border: "none", borderRadius: "14px", fontWeight: "800", fontSize: "16px", cursor: "not-allowed", opacity: 0.7 },
  footerText: { color: "rgba(255,255,255,0.5)", fontSize: "12px", paddingLeft: "4px", marginTop: "10px" },

  loading: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "400px" },
  spinner: { width: "48px", height: "48px", border: "4px solid #bfdbfe", borderTop: "4px solid #2563eb", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "18px" },
  loadingTitle: { fontSize: "18px", fontWeight: "800", color: "#0f172a" },
  emptyState: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", minHeight: "400px" },
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
  factBoxHeader: { display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" },

  chartContainer: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px" },
  insightsTitle: { margin: "0 0 4px 0", color: "#0f172a", fontSize: "16px", fontWeight: "800" },
  aiExplainerGrid: { display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "24px", alignItems: "center", marginTop: "16px" },
  pieCol: { display: "flex", flexDirection: "column", alignItems: "center" },
  pieChartContainer: { perspective: "800px", margin: "10px 0", height: "120px" },
  pieChart3D: { width: "130px", height: "130px", borderRadius: "50%", transform: "rotateX(55deg)", boxShadow: "0px 10px 0px #cbd5e1, 0px 15px 20px rgba(0,0,0,0.2)", border: "1px solid #f1f5f9" },
  barCol: { display: "flex", flexDirection: "column", justifyContent: "center" },
  barChartWrapper: { display: "flex", flexDirection: "column", gap: "12px" },
  bar3dRow: { display: "flex", flexDirection: "column", gap: "4px" },
  barLabel: { display: "flex", justifyContent: "space-between" },
  bar3dTrack: { width: "100%", height: "14px", background: "#f1f5f9", borderRadius: "8px", overflow: "hidden" },
  bar3dFill: { height: "100%", borderRadius: "8px", transition: "width 0.5s ease" },

  actionCard: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },
  actionTitle: { margin: "0 0 12px 0", color: "#b45309", fontSize: "16px", fontWeight: "800" },
  actionList: { margin: 0, paddingLeft: "20px", color: "#92400e", fontSize: "14px", lineHeight: "1.6" },
  actionListItem: { marginBottom: "8px", fontWeight: "500" },

  authBox: { maxWidth: "350px", margin: "60px auto", textAlign: "center" },
  actionBtn: { padding: "10px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", transition: "transform 0.1s" }
};

// TOOLTIP CSS INJECTION
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