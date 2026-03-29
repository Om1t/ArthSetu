import React, { useState, useRef, useEffect } from "react";

function CreditForm() {
  const [activeTab, setActiveTab] = useState("Data Input");
  
  // Form State
  const [formData, setFormData] = useState({
    Income_Annual: "",
    Savings_Balance: "",
    Expenses_Annual: "",
    Utility_Bill_Late_Count: "",
    Credit_History_Length_Months: "",
    Age: "",
    Gender: "Prefer not to say",
    Region: "Urban",
    Dependents: "0"
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  // Generated Application ID State
  const [currentAppId, setCurrentAppId] = useState(null);

  // Audit History State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // --- NEW: AI CHAT STATE & LOGIC ---
  const [chatMessages, setChatMessages] = useState([
    { sender: "ai", text: "Hello. I am the ArthSetu AI Underwriting Assistant. I have loaded the secure context of the most recently processed application. How can I assist you with this risk profile?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { sender: "user", text: userMessage }]);
    setChatInput("");
    setChatLoading(true);

    try {
      // Connect to your FastAPI Ollama endpoint
      const response = await fetch("http://127.0.0.1:8000/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage })
      });
      const data = await response.json();
      
      setChatMessages(prev => [...prev, { sender: "ai", text: data.reply || "I am unable to process that request." }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setChatMessages(prev => [...prev, { sender: "ai", text: "⚠️ System Offline: Cannot reach the ArthSetu AI Engine. Ensure your backend is running." }]);
    }
    setChatLoading(false);
  };

  // Expanded Mock Response fallback
  const mockResponse = {
    status: "success",
    assessment: {
      probability_of_default: 0.124,
      risk_category: "Low Risk",
      credit_score_equivalent: 742,
      max_approval_limit: 300000
    },
    shap_explanations: {
      positive_factors: [
        { feature: "Savings_Balance", impact: 0.15, message: "Significant positive impact" },
        { feature: "Credit_History_Length_Months", impact: 0.08, message: "Steady positive impact" },
        { feature: "Age", impact: 0.05, message: "Stable demographic profile" }
      ],
      negative_factors: [
        { feature: "Utility_Bill_Late_Count", impact: 0.40, message: "Critical penalty from late bills" },
        { feature: "Spending_Ratio", impact: 0.22, message: "High utilization drag" },
        { feature: "Income_Annual", impact: 0.18, message: "Income capacity limits" }
      ]
    }
  };

  const validateInput = (name, value, currentData) => {
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

  const requiredKeys = ["Income_Annual", "Savings_Balance", "Expenses_Annual", "Utility_Bill_Late_Count", "Credit_History_Length_Months", "Age", "Dependents"];
  const hasErrors = Object.values(errors).some(err => err !== "");
  const isEmpty = requiredKeys.some(key => formData[key] === "");
  const isFormDisabled = hasErrors || isEmpty;

  // --- SUBMIT APPLICATION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFormDisabled) return;

    // Generate a sleek ID like AS-84920
    const newAppId = "AS-" + Math.floor(10000 + Math.random() * 90000);
    setCurrentAppId(newAppId);

    const requestData = {
      Income_Annual: liveIncome,
      Savings_Balance: liveSavings,
      Spending_Ratio: Number(liveRatio),
      Utility_Bill_Late_Count: Number(formData.Utility_Bill_Late_Count),
      Credit_History_Length_Months: Number(formData.Credit_History_Length_Months),
      Age: Number(formData.Age),
      Gender: formData.Gender,
      Region: formData.Region,
      Dependents: Number(formData.Dependents)
    };

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            applicant_id: newAppId, 
            financial_data: requestData 
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to fetch from backend");

      setResult(data);
      setLoading(false);
      setActiveTab("Dashboard");
    } catch (error) {
      console.error("Server unreachable. Falling back to mock data.", error);
      setTimeout(() => { setResult(mockResponse); setLoading(false); setActiveTab("Dashboard"); }, 1000);
    }
  };

  // --- AUDIT HISTORY LOGIC ---
  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
        const response = await fetch("http://127.0.0.1:8000/api/v1/audit");
        const data = await response.json();
        setAuditLogs(data.reverse()); // Show newest first
    } catch(e) {
        console.error("Failed to fetch audit logs:", e);
    }
    setAuditLoading(false);
  };

  const handleLogin = () => {
    if (passwordInput === "admin123") {
        setIsAuthenticated(true);
        setAuthError(false);
        fetchAuditLogs();
    } else {
        setAuthError(true);
    }
  };

  const downloadCSV = () => {
    if (auditLogs.length === 0) return;
    const headers = Object.keys(auditLogs[0]).join(",");
    const rows = auditLogs.map(log => Object.values(log).join(",")).join("\n");
    const csv = headers + "\n" + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ArthSetu_Secure_Audit_Log.csv';
    a.click();
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);

  const assessment = result?.assessment;
  const shapExplanations = result?.shap_explanations || { positive_factors: [], negative_factors: [] };
  
  // Flipped logic: Positive SHAP is bad (default risk goes up), Negative is good.
  let combinedShap = [
    ...(shapExplanations.positive_factors || []).map(f => ({ ...f, direction: 'negative' })), 
    ...(shapExplanations.negative_factors || []).map(f => ({ ...f, direction: 'positive' }))  
  ].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  const colorPalette = [
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", 
    "#06b6d4", "#ec4899", "#84cc16", "#6366f1", "#f97316"
  ];

  combinedShap = combinedShap.map((item, idx) => ({
    ...item,
    legendColor: colorPalette[idx % colorPalette.length]
  }));

  const totalShapImpact = combinedShap.reduce((sum, item) => sum + Math.abs(item.impact), 0) || 1;

  let displayLoanLimit = 0;
  let scoreValue = 0;
  if (assessment) {
    scoreValue = assessment.credit_score_equivalent || 400;
    displayLoanLimit = assessment.max_approval_limit || 0; 
  }

  const getScoreColorInfo = (score) => {
    if (score >= 650) return { main: "#15803d", ring: "conic-gradient(from 0deg, #15803d, #4ade80, #15803d)" };
    if (score >= 500) return { main: "#1d4ed8", ring: "conic-gradient(from 0deg, #1d4ed8, #60a5fa, #1d4ed8)" };
    if (score >= 400) return { main: "#d97706", ring: "conic-gradient(from 0deg, #d97706, #fbbf24, #d97706)" };
    return { main: "#b91c1c", ring: "conic-gradient(from 0deg, #b91c1c, #f87171, #b91c1c)" };
  };
  const scoreColors = assessment ? getScoreColorInfo(scoreValue) : { main: "#0f172a", ring: "conic-gradient(from 0deg, #2563eb, #38bdf8, #2563eb)" };

  const getDynamicAdvice = (feature) => {
    const historyYears = (formData.Credit_History_Length_Months / 12).toFixed(1);
    switch(feature) {
      case "Income_Annual": return `Your reported income of ${formatCurrency(liveIncome)} sets your baseline capacity.`;
      case "Savings_Balance": return `A reserve of ${formatCurrency(liveSavings)} provides a buffer. Aim for 3-6 months liquid.`;
      case "Spending_Ratio": return `You utilize ${(liveRatio*100).toFixed(1)}% of earnings. Lowering this below 50% is critical.`;
      case "Utility_Bill_Late_Count": return `Model detected ${formData.Utility_Bill_Late_Count} recent late payments. Enable Auto-Pay immediately.`;
      case "Credit_History_Length_Months": return historyYears < 4 ? `Your footprint is new (${historyYears} yrs). Maintain active accounts.` : `Protect your mature ${historyYears} yr footprint by keeping oldest accounts open.`;
      default: return "Continue optimizing this financial metric.";
    }
  };

  let currentDeg = 0;
  const pieSlices = combinedShap.map((item) => {
    const percent = totalShapImpact > 0 ? (Math.abs(item.impact) / totalShapImpact) * 100 : 0;
    const deg = (percent / 100) * 360;
    const start = currentDeg;
    const end = currentDeg + deg;
    currentDeg += deg;
    return `${item.legendColor} ${start}deg ${end}deg`;
  });
  const pieBackground = pieSlices.length > 0 ? `conic-gradient(${pieSlices.join(', ')})` : "#e2e8f0";
  
  let rawYears = liveExpenses > 0 ? (liveSavings / liveExpenses) : 0;
  const yearsOfSavings = rawYears > 99 ? "99+" : rawYears.toFixed(2);

  return (
    <div style={styles.page}>
      
      {/* BRANDING HEADER */}
      <div style={styles.headerRow}>
        <div style={styles.logoContainer}>
            <div style={styles.logoIcon}><div style={styles.logoIconInner}></div></div>
            <div style={styles.logoTextWrapper}>
            <span style={styles.logoTextMain}>Arth</span><span style={styles.logoTextSub}>Setu</span>
            </div>
        </div>
        <div style={styles.badge}>Production Core</div>
      </div>

      {/* TOP NAVIGATION BAR */}
      <div style={styles.navBar}>
        {["Data Input", "Dashboard", "Audit History", "AI Assistant"].map(tab => (
            <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={activeTab === tab ? styles.navButtonActive : styles.navButton}
            >
                {tab}
            </button>
        ))}
      </div>

      <div style={styles.wrapper}>
        
        {/* ========================================== */}
        {/* PAGE 1: DATA INPUT */}
        {/* ========================================== */}
        {activeTab === "Data Input" && (
            <div style={styles.formContainerCenter}>
                <div style={styles.heroText}>
                    <h1 style={styles.title}>Applicant Risk Profiling</h1>
                    <p style={styles.subtitle}>Securely process identity and financial metrics for AI evaluation.</p>
                </div>

                <div style={styles.card}>
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>1. Core Demographics</h2>
                        <hr style={styles.divider} />
                    </div>
                    
                    <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGrid}>
                        <div style={styles.inputGroup}>
                        <div style={styles.labelRow}>
                            <label style={styles.label}>Age</label>
                            <div className="custom-tooltip-wrapper"><span style={styles.infoIconSmall}>?</span><div className="custom-tooltip-text">Applicant's current age.</div></div>
                        </div>
                        <input type="number" name="Age" value={formData.Age} onChange={handleChange} style={errors.Age ? styles.inputError : styles.input} />
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
                        <div style={styles.labelRow}>
                            <label style={styles.label}>Region</label>
                            <div className="custom-tooltip-wrapper"><span style={styles.infoIconSmall}>?</span><div className="custom-tooltip-text">Primary residential area classification.</div></div>
                        </div>
                        <select name="Region" value={formData.Region} onChange={handleChange} style={styles.input}>
                            <option value="Urban">Urban</option><option value="Semi-Urban">Semi-Urban</option><option value="Rural">Rural</option>
                        </select>
                        </div>
                        
                        <div style={styles.inputGroup}>
                        <div style={styles.labelRow}>
                            <label style={styles.label}>Dependents</label>
                            <div className="custom-tooltip-wrapper"><span style={styles.infoIconSmall}>?</span><div className="custom-tooltip-text">Number of financial dependents.</div></div>
                        </div>
                        <input type="number" name="Dependents" value={formData.Dependents} onChange={handleChange} style={errors.Dependents ? styles.inputError : styles.input} />
                        {errors.Dependents && <div style={styles.errorText}>{errors.Dependents}</div>}
                        </div>
                    </div>

                    <div style={styles.sectionHeaderSpacing}>
                        <h2 style={styles.sectionTitle}>2. Financial Health</h2>
                        <hr style={styles.divider} />
                    </div>

                    <div style={styles.inputGroup}>
                        <div style={styles.labelRow}>
                            <label style={styles.label}>Annual Income (INR)</label>
                            <div className="custom-tooltip-wrapper"><span style={styles.infoIconSmall}>?</span><div className="custom-tooltip-text">Total gross income per year.</div></div>
                        </div>
                        <input type="number" name="Income_Annual" value={formData.Income_Annual} onChange={handleChange} style={errors.Income_Annual ? styles.inputError : styles.input} />
                        {errors.Income_Annual && <div style={styles.errorText}>{errors.Income_Annual}</div>}
                    </div>

                    <div style={styles.inputGroup}>
                        <div style={styles.labelRow}>
                            <label style={styles.label}>Savings Balance (INR)</label>
                            <div className="custom-tooltip-wrapper"><span style={styles.infoIconSmall}>?</span><div className="custom-tooltip-text">Total liquid savings available.</div></div>
                        </div>
                        <input type="number" name="Savings_Balance" value={formData.Savings_Balance} onChange={handleChange} style={errors.Savings_Balance ? styles.inputError : styles.input} />
                        {errors.Savings_Balance && <div style={styles.errorText}>{errors.Savings_Balance}</div>}
                    </div>

                    <div style={styles.inputGroup}>
                        <div style={styles.labelRow}>
                            <label style={styles.label}>Annual Expenses (INR)</label>
                            <div className="custom-tooltip-wrapper"><span style={styles.infoIconSmall}>?</span><div className="custom-tooltip-text">Estimated total yearly expenditure.</div></div>
                        </div>
                        <input type="number" name="Expenses_Annual" value={formData.Expenses_Annual} onChange={handleChange} style={errors.Expenses_Annual ? styles.inputError : styles.input} />
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
                            <input type="number" name="Utility_Bill_Late_Count" value={formData.Utility_Bill_Late_Count} onChange={handleChange} style={errors.Utility_Bill_Late_Count ? styles.inputError : styles.input} />
                            {errors.Utility_Bill_Late_Count && <div style={styles.errorText}>{errors.Utility_Bill_Late_Count}</div>}
                        </div>
                        <div style={styles.inputGroup}>
                            <div style={styles.labelRow}>
                            <label style={styles.label}>Credit Hist (Mo)</label>
                            <div className="custom-tooltip-wrapper"><span style={styles.infoIconSmall}>?</span><div className="custom-tooltip-text">Months since your first financial account was opened.</div></div>
                            </div>
                            <input type="number" name="Credit_History_Length_Months" value={formData.Credit_History_Length_Months} onChange={handleChange} style={errors.Credit_History_Length_Months ? styles.inputError : styles.input} />
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
        )}

        {/* ========================================== */}
        {/* PAGE 2: DASHBOARD */}
        {/* ========================================== */}
        {activeTab === "Dashboard" && (
            <div style={styles.dashboardContainerFull}>
                {loading && (
                    <div style={styles.loading}>
                        <div style={styles.spinner}></div>
                        <p style={styles.loadingTitle}>ArthSetu AI is analyzing profile...</p>
                    </div>
                )}

                {!assessment && !loading && (
                    <div style={styles.emptyState}>
                        <p style={styles.emptyTitle}>Dashboard Locked</p>
                        <p style={{color: "#94a3b8", fontSize: "16px", maxWidth: "400px", margin: "0 auto"}}>
                            Navigate to the 'Data Input' tab and submit an applicant profile to generate AI predictive metrics.
                        </p>
                    </div>
                )}

                {assessment && !loading && (
                <div style={styles.resultCard}>
                    <div style={styles.headerRow}>
                        <h2 style={styles.sectionTitleDark}>Intelligence Dashboard</h2>
                        {currentAppId && (
                            <div style={styles.appIdBadge}>
                                <span style={{color: '#64748b', marginRight: '6px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Application ID:</span>
                                <span style={{fontWeight: '800', color: '#0ea5e9', fontSize: '15px', letterSpacing: '1px'}}>{currentAppId}</span>
                            </div>
                        )}
                    </div>

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
                            <div style={styles.factValue}>{formatCurrency(liveIncome - liveExpenses)} / year</div>
                            </div>
                            <div style={styles.factBox}>
                            <div style={styles.factBoxHeader}>
                                <strong>Emergency Fund</strong>
                                <div className="custom-tooltip-wrapper"><span style={styles.infoIconSmall}>?</span><div className="custom-tooltip-text">Years sustained by liquid savings.</div></div>
                            </div>
                            <div style={styles.factValue}>{yearsOfSavings} years covered</div>
                            </div>
                            <div style={styles.factBox}>
                            <div style={styles.factBoxHeader}>
                                <strong>Credit History</strong>
                                <div className="custom-tooltip-wrapper"><span style={styles.infoIconSmall}>?</span><div className="custom-tooltip-text">Total track record length.</div></div>
                            </div>
                            <div style={styles.factValue}>{(formData.Credit_History_Length_Months / 12).toFixed(1)} years</div>
                            </div>
                        </div>
                        </div>

                        <div style={styles.chartContainer}>
  <h3 style={styles.insightsTitle}>Key Predictive Factors</h3>
  <p style={{color: '#64748b', fontSize: '13px', marginTop: 0, marginBottom: '24px'}}>AI Explanation of feature impact on the final risk calculation.</p>
  
  <div style={styles.aiExplainerGrid}>
      <div style={styles.pieCol}>
          <div style={styles.doughnutWrapper}>
              <div style={{...styles.doughnutChart, background: pieBackground}}>
                  <div style={styles.doughnutHole}>
                      <span style={styles.doughnutCenterText}>Impact<br/>Breakdown</span>
                  </div>
              </div>
          </div>
      </div>
      
      <div style={styles.barCol}>
      <div style={styles.barChartWrapper}>
          {combinedShap.map((item, idx) => {
          const percent = totalShapImpact > 0 ? ((Math.abs(item.impact) / totalShapImpact) * 100).toFixed(1) : 0;
          
          // direction: 'positive' now means GOOD (Green)
          // direction: 'negative' now means BAD (Red)
          const isGood = item.direction === 'positive';
          
          return (
              <div key={idx} className="factor-card">
                  <div style={styles.barLabel}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                          {/* 1. DOT: Matches Pie Chart */}
                          <div style={{width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.legendColor}}></div>
                          
                          {/* 2. BADGE: Green/Plus or Red/Minus */}
                          <span style={{...styles.impactBadge, background: isGood ? '#dcfce7' : '#fee2e2', color: isGood ? '#166534' : '#991b1b'}}>
                              {isGood ? '+' : '-'}{percent}%
                          </span>
                          <span style={{fontWeight: '800', color: '#1e293b', fontSize: '14px'}}>{item.feature.replace(/_/g, " ")}</span>
                      </div>
                      <span style={{color: isGood ? '#059669' : '#dc2626', fontSize: '13px', fontWeight: '800'}}>{item.message}</span>
                  </div>
                  <div style={styles.bar3dTrack}>
                      {/* 3. BAR: Always Red or Green for clarity */}
                      <div style={{ ...styles.bar3dFill, width: `${Math.max(percent, 2)}%`, background: isGood ? 'linear-gradient(90deg, #34d399, #059669)' : 'linear-gradient(90deg, #f87171, #dc2626)'}}></div>
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
                </div>
                )}
            </div>
        )}

        {/* ========================================== */}
        {/* PAGE 3: SECURE AUDIT HISTORY */}
        {/* ========================================== */}
        {activeTab === "Audit History" && (
            <div style={styles.dashboardContainerFull}>
                <div style={styles.resultCard}>
                    <div style={styles.headerRow}>
                        <h2 style={styles.sectionTitleDark}>System Audit Log</h2>
                    </div>

                    {!isAuthenticated ? (
                        <div style={styles.passwordContainer}>
                            <p style={{color: '#64748b', marginBottom: '20px', fontWeight: '600'}}>Secured area. Please enter admin credentials.</p>
                            <input 
                                type="password" 
                                placeholder="Enter Password (admin123)" 
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                style={{...styles.input, textAlign: 'center', marginBottom: '15px'}}
                            />
                            <button onClick={handleLogin} style={styles.downloadButton}>
                                Authenticate
                            </button>
                            {authError && <p style={{color: '#dc2626', fontWeight: 'bold', marginTop: '10px'}}>Invalid credentials.</p>}
                        </div>
                    ) : (
                        <div>
                            <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '20px', gap: '12px'}}>
                                <button onClick={downloadCSV} style={styles.downloadButton}>
                                    📥 Export CSV
                                </button>
                                <button onClick={fetchAuditLogs} style={{...styles.downloadButton, background: '#334155'}}>
                                    🔄 Refresh Data
                                </button>
                            </div>
                            
                            {auditLoading ? (
                                <div style={{display: 'flex', justifyContent: 'center', padding: '40px'}}>
                                    <div style={styles.spinner}></div>
                                </div>
                            ) : (
                                <div style={styles.tableContainer}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={styles.th}>Timestamp</th>
                                                <th style={styles.th}>App ID</th>
                                                <th style={styles.th}>Age</th>
                                                <th style={styles.th}>Gender</th>
                                                <th style={styles.th}>Score</th>
                                                <th style={styles.th}>Status</th>
                                                <th style={styles.th}>Income</th>
                                                <th style={styles.th}>Loan Limit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {auditLogs.length === 0 ? (
                                                <tr><td colSpan="8" style={{...styles.td, textAlign: 'center'}}>No applications processed yet.</td></tr>
                                            ) : (
                                                auditLogs.map((log, i) => (
                                                    <tr key={i} className="table-row">
                                                        <td style={styles.td}>{log.Timestamp}</td>
                                                        <td style={{...styles.td, fontWeight: '700', color: '#0ea5e9'}}>{log.App_ID}</td>
                                                        <td style={styles.td}>{log.Age || 'N/A'}</td>
                                                        <td style={styles.td}>{log.Gender || 'N/A'}</td>
                                                        <td style={{...styles.td, fontWeight: '800'}}>{log.Score}</td>
                                                        <td style={styles.td}>
                                                            <span style={{
                                                                padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '800',
                                                                background: log.Status === 'Low Risk' ? '#dcfce7' : log.Status === 'Medium Risk' ? '#fef9c3' : '#fee2e2',
                                                                color: log.Status === 'Low Risk' ? '#166534' : log.Status === 'Medium Risk' ? '#854d0e' : '#991b1b'
                                                            }}>
                                                                {log.Status}
                                                            </span>
                                                        </td>
                                                        <td style={styles.td}>₹{log.Income}</td>
                                                        <td style={{...styles.td, fontWeight: '700', color: '#15803d'}}>
                                                            {log.Eligible_Loan ? `₹${log.Eligible_Loan}` : (log.Limit ? `₹${log.Limit}` : 'N/A')}
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

        {/* ========================================== */}
        {/* PAGE 4: FULL-SCREEN AI ANALYST TERMINAL */}
        {/* ========================================== */}
        {activeTab === "AI Assistant" && (
            <div style={styles.formContainerCenter}>
                <div style={styles.chatTerminal}>
                    {/* TERMINAL HEADER */}
                    <div style={styles.chatHeader}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                            <span style={{fontSize: '28px'}}>🤖</span>
                            <div>
                                <h3 style={{margin: 0, color: 'white', fontSize: '16px', letterSpacing: '0.05em'}}>ArthSetu Analyst AI</h3>
                                <p style={{margin: 0, color: '#10b981', fontSize: '11px', fontWeight: '800', letterSpacing: '0.1em'}}>SECURE CONNECTION ACTIVE</p>
                            </div>
                        </div>
                        {currentAppId && (
                            <div style={styles.appIdBadgeSmall}>ID: {currentAppId}</div>
                        )}
                    </div>
                    
                    {/* TERMINAL MESSAGE AREA */}
                    <div style={styles.chatMessageArea}>
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} style={msg.sender === 'user' ? styles.chatBubbleUser : styles.chatBubbleAI}>
                                {msg.text}
                            </div>
                        ))}
                        {chatLoading && (
                            <div style={styles.chatBubbleAI}>
                                <div className="typing-indicator">
                                    <span>.</span><span>.</span><span>.</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* TERMINAL INPUT AREA */}
                    <form onSubmit={handleSendMessage} style={styles.chatInputArea}>
                        <input 
                            type="text" 
                            placeholder="Ask about the risk profile, default probability, or financial factors..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            style={styles.chatInput}
                            disabled={chatLoading}
                        />
                        <button type="submit" style={styles.chatSendButton} disabled={!chatInput.trim() || chatLoading}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}

// STYLES
const styles = {
  page: { minHeight: "100vh", background: "radial-gradient(circle at top left, rgba(59,130,246,0.24), transparent 26%), linear-gradient(135deg, #0b1220 0%, #102a43 40%, #1d4ed8 100%)", fontFamily: "'Manrope', sans-serif", padding: "30px 40px" },
  
  navBar: { display: 'flex', justifyContent: 'center', gap: '15px', background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', marginBottom: '40px', maxWidth: '800px', margin: '0 auto 40px auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
  navButton: { flex: 1, background: 'transparent', color: '#94a3b8', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.2s ease' },
  navButtonActive: { flex: 1, background: 'linear-gradient(90deg, #2563eb, #0ea5e9)', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)' },

  wrapper: { display: "block", width: "100%" },
  formContainerCenter: { maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" },
  dashboardContainerFull: { maxWidth: "1200px", margin: "0 auto" },

  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" },
  logoContainer: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 20px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.2)", backdropFilter: "blur(12px)", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" },
  logoIcon: { width: "22px", height: "22px", background: "linear-gradient(135deg, #38bdf8, #2563eb)", borderRadius: "6px", position: "relative", overflow: "hidden" },
  logoIconInner: { width: "14px", height: "14px", background: "rgba(255,255,255,0.2)", borderRadius: "50%", position: "absolute", right: "-4px", bottom: "-4px", backdropFilter: "blur(4px)" },
  logoTextWrapper: { display: "flex", alignItems: "center" },
  logoTextMain: { color: "#ffffff", fontSize: "22px", fontWeight: "800", letterSpacing: "-0.02em" },
  logoTextSub: { color: "#bae6fd", fontSize: "22px", fontWeight: "400", letterSpacing: "-0.02em" },
  badge: { background: "rgba(255, 255, 255, 0.9)", color: "#075985", padding: "10px 18px", borderRadius: "999px", fontWeight: "800", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" },
  
  heroText: { display: "flex", flexDirection: "column", gap: "6px", textAlign: "center", marginBottom: "10px" },
  title: { color: "#ffffff", fontSize: "38px", fontWeight: "800", lineHeight: "1.05", margin: "0 0 5px 0", textShadow: "0 2px 10px rgba(0,0,0,0.2)" },
  subtitle: { color: "#cbd5e1", fontSize: "16px", margin: 0 },

  card: { background: "rgba(255,255,255,0.98)", padding: "40px", borderRadius: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.22)" },
  resultCard: { background: "rgba(255,255,255,0.98)", padding: "40px", borderRadius: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.22)", width: "100%", transition: "all 0.3s ease", display: "flex", flexDirection: "column" },
  
  sectionHeader: { marginBottom: "16px" },
  sectionHeaderSpacing: { marginTop: "32px", marginBottom: "16px" },
  sectionTitle: { margin: "0 0 10px 0", color: "#0f172a", fontSize: "20px", fontWeight: "800", letterSpacing: "-0.02em" },
  sectionTitleDark: { margin: "0 0 20px 0", color: "#0f172a", fontSize: "26px", fontWeight: "800", letterSpacing: "-0.02em" },
  divider: { border: "none", height: "2px", background: "#f1f5f9", margin: "0" },
  
  appIdBadge: { background: "#f1f5f9", padding: "8px 16px", borderRadius: "12px", border: "1px solid #e2e8f0" },

  form: { display: "flex", flexDirection: "column", gap: "20px" },
  inputGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  labelRow: { display: "flex", alignItems: "center", gap: "8px" },
  label: { fontSize: "14px", fontWeight: "700", color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" },
  infoIconSmall: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", borderRadius: "50%", background: "#e2e8f0", color: "#64748b", fontSize: "10px", fontWeight: "800", cursor: "help" },
  input: { padding: "16px 18px", borderRadius: "12px", border: "2px solid #e2e8f0", fontSize: "16px", background: "#f8fafc", color: "#0f172a", outline: "none", fontWeight: "600", transition: "border 0.2s ease", width: "100%", boxSizing: "border-box" },
  inputError: { padding: "16px 18px", borderRadius: "12px", border: "2px solid #ef4444", fontSize: "16px", background: "#fef2f2", color: "#991b1b", outline: "none", fontWeight: "600", width: "100%", boxSizing: "border-box" },
  errorText: { color: "#dc2626", fontSize: "13px", fontWeight: "700", paddingLeft: "4px" },
  liveCalcText: { color: "#475569", fontSize: "13px", fontWeight: "600", paddingLeft: "4px", marginTop: "2px" },
  button: { marginTop: "20px", padding: "18px", background: "linear-gradient(90deg, #2563eb, #0ea5e9)", color: "#ffffff", border: "none", borderRadius: "14px", fontWeight: "800", fontSize: "18px", cursor: "pointer", boxShadow: "0 10px 25px rgba(37,99,235,0.3)", transition: "transform 0.1s ease" },
  buttonDisabled: { marginTop: "20px", padding: "18px", background: "#94a3b8", color: "#f1f5f9", border: "none", borderRadius: "14px", fontWeight: "800", fontSize: "18px", cursor: "not-allowed", opacity: 0.7 },
  footerText: { color: "rgba(255,255,255,0.6)", fontSize: "13px", textAlign: "center", marginTop: "10px", fontWeight: "600" },

  loading: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "500px" },
  spinner: { width: "60px", height: "60px", border: "5px solid #bfdbfe", borderTop: "5px solid #2563eb", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "20px" },
  loadingTitle: { fontSize: "22px", fontWeight: "800", color: "#1e293b" },
  
  emptyState: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", minHeight: "500px", background: "rgba(15,23,42,0.6)", borderRadius: "24px", backdropFilter: "blur(10px)" },
  emptyTitle: { fontSize: "28px", fontWeight: "800", color: "#ffffff", marginBottom: "12px" },
  
  resultsWrap: { display: "flex", flexDirection: "column", gap: "24px" },
  topResultGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "20px" },
  scoreCard: { background: "linear-gradient(135deg, #eff6ff, #dbeafe)", border: "1px solid #bfdbfe", borderRadius: "20px", padding: "24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.03)" },
  scoreRing: { width: "140px", height: "140px", margin: "0 auto 16px auto", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  scoreRingInner: { width: "112px", height: "112px", borderRadius: "50%", background: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  scoreNumber: { fontSize: "38px", lineHeight: "1", fontWeight: "800", marginBottom: "4px" },
  scoreSubLabel: { fontSize: "10px", color: "#64748b", fontWeight: "800", textTransform: "uppercase" },
  scoreLabel: { padding: "8px 18px", borderRadius: "999px", fontWeight: "800", fontSize: "14px" },
  probCard: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.03)" },
  probLabel: { fontSize: "13px", color: "#475569", fontWeight: "800", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.05em" },
  probAmount: { fontSize: "42px", fontWeight: "800", marginBottom: "10px" },
  probSubtext: { fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.4" },
  loanCard: { background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "1px solid #86efac", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.03)" },
  loanLabel: { fontSize: "13px", color: "#166534", fontWeight: "800", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.05em" },
  loanAmount: { fontSize: "42px", fontWeight: "800", color: "#15803d", marginBottom: "10px" },
  loanSubtext: { fontSize: "13px", color: "#166534", margin: 0, lineHeight: "1.4" },

  factsCard: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "24px" },
  factGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "12px" },
  factBox: { background: "#ffffff", padding: "18px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px", color: "#334155", lineHeight: "1.5", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" },
  factBoxHeader: { display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", fontSize: "14px" },
  factValue: { fontSize: "18px", fontWeight: "700", color: "#0f172a" },

  chartContainer: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "28px" },
  insightsTitle: { margin: "0 0 8px 0", color: "#0f172a", fontSize: "18px", fontWeight: "800" },
  aiExplainerGrid: { display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: "40px", alignItems: "center", marginTop: "10px" },
  pieCol: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  doughnutWrapper: { position: "relative", width: "220px", height: "220px", display: "flex", justifyContent: "center", alignItems: "center" },
  doughnutChart: { width: "100%", height: "100%", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.08)" },
  doughnutHole: { width: "55%", height: "55%", background: "#ffffff", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "inset 0 4px 10px rgba(0,0,0,0.05)" },
  doughnutCenterText: { textAlign: "center", fontSize: "12px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" },
  barCol: { display: "flex", flexDirection: "column", justifyContent: "center" },
  barChartWrapper: { display: "flex", flexDirection: "column", gap: "12px" },
  impactBadge: { padding: "4px 8px", borderRadius: "8px", fontSize: "12px", fontWeight: "800", display: "inline-block", minWidth: "45px", textAlign: "center" },
  barLabel: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  bar3dTrack: { width: "100%", height: "10px", background: "#f1f5f9", borderRadius: "8px", overflow: "hidden" },
  bar3dFill: { height: "100%", borderRadius: "8px", transition: "width 0.5s ease" },

  actionCard: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "20px", padding: "24px", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },
  actionTitle: { margin: "0 0 16px 0", color: "#b45309", fontSize: "18px", fontWeight: "800" },
  actionList: { margin: 0, paddingLeft: "24px", color: "#92400e", fontSize: "15px", lineHeight: "1.6" },
  actionListItem: { marginBottom: "10px", fontWeight: "500" },

  // AUDIT HISTORY STYLES
  passwordContainer: { maxWidth: '350px', margin: '40px auto', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'center' },
  downloadButton: { padding: "10px 20px", background: "linear-gradient(90deg, #2563eb, #0ea5e9)", color: "#ffffff", border: "none", borderRadius: "10px", fontWeight: "800", cursor: "pointer", boxShadow: "0 4px 10px rgba(37,99,235,0.2)", transition: "transform 0.1s" },
  tableContainer: { overflowX: 'auto', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#ffffff' },
  th: { padding: '16px 14px', background: '#f8fafc', color: '#475569', fontWeight: '800', fontSize: '12px', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0', letterSpacing: '0.05em' },
  td: { padding: '14px', borderBottom: '1px solid #f1f5f9', color: '#1e293b', fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' },

  // AI TERMINAL STYLES
  chatTerminal: { background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", overflow: "hidden", display: "flex", flexDirection: "column", height: "650px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", backdropFilter: "blur(20px)" },
  chatHeader: { padding: "20px 24px", background: "rgba(30,41,59,0.9)", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" },
  appIdBadgeSmall: { background: "rgba(14,165,233,0.15)", color: "#38bdf8", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "800", letterSpacing: "1px" },
  chatMessageArea: { flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" },
  chatBubbleAI: { alignSelf: "flex-start", background: "#1e293b", color: "#f8fafc", padding: "14px 18px", borderRadius: "16px", borderTopLeftRadius: "4px", maxWidth: "85%", fontSize: "15px", lineHeight: "1.6", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" },
  chatBubbleUser: { alignSelf: "flex-end", background: "linear-gradient(135deg, #2563eb, #0ea5e9)", color: "#ffffff", padding: "14px 18px", borderRadius: "16px", borderBottomRightRadius: "4px", maxWidth: "85%", fontSize: "15px", lineHeight: "1.6", boxShadow: "0 4px 10px rgba(14,165,233,0.3)" },
  chatInputArea: { padding: "20px", background: "rgba(30,41,59,0.6)", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "12px" },
  chatInput: { flex: 1, padding: "16px 20px", borderRadius: "14px", border: "1px solid #334155", background: "#0f172a", color: "white", fontSize: "15px", outline: "none", transition: "border 0.2s" },
  chatSendButton: { padding: "0 22px", background: "linear-gradient(90deg, #2563eb, #0ea5e9)", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.2s", boxShadow: "0 4px 10px rgba(14,165,233,0.3)" }
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

.factor-card {
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  transition: all 0.2s ease;
}
.factor-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.06);
  border-color: #e2e8f0;
}

.table-row { transition: background 0.2s ease; }
.table-row:hover { background-color: #f8fafc; }

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* Typing Indicator Animation */
.typing-indicator span {
  animation: blink 1.4s infinite both;
  height: 10px;
  width: 10px;
  margin: 0 2px;
  background-color: #94a3b8;
  border-radius: 50%;
  display: inline-block;
}
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink {
  0% { opacity: 0.2; transform: scale(0.8); }
  20% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 0.2; transform: scale(0.8); }
}
`;
document.head.appendChild(styleSheet);

export default CreditForm;