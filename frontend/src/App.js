import React, { useState } from 'react';
import CreditForm from './components/CreditForm';

function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [chatMessages, setChatMessages] = useState([{ sender: 'ai', text: 'ArthSetu AI online. How can I help?' }]);
  const [chatInput, setChatInput] = useState('');

  const handleAdminAuth = () => {
    const pin = window.prompt("Enter Admin PIN:");
    if (pin === "2026") {
      setIsAdminOpen(true);
      fetch("http://127.0.0.1:8000/api/v1/audit")
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
          return res.json();
        })
        .then(data => setAuditLogs(data))
        .catch((err) => {
          console.error("Full Audit Fetch Error:", err);
          alert(`Failed to load log. Check browser console. Error: ${err.message}`);
        });
    } else if (pin !== null) {
      alert("Unauthorized.");
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
    } catch {
      setChatMessages(prev => [...prev, { sender: 'ai', text: "Connection error." }]);
    }
  };

  return (
    <div style={{ position: 'relative', overflowX: 'hidden' }}>
      
      {/* MAIN CONTENT */}
      <div style={{ transition: 'margin-left 0.3s', marginLeft: isAdminOpen ? '300px' : '0' }}>
        <CreditForm />
      </div>

      {/* HIDDEN ADMIN BUTTON (Bottom Left) */}
      <div 
        onClick={handleAdminAuth} 
        style={{ position: 'fixed', bottom: '10px', left: '10px', width: '20px', height: '20px', cursor: 'pointer', opacity: 0.1 }}
        title="Admin Login"
      >🔒</div>

      {/* ADMIN SIDEBAR */}
      <div style={{ position: 'fixed', top: 0, left: isAdminOpen ? 0 : '-300px', width: '300px', height: '100vh', background: '#0f172a', color: 'white', transition: 'left 0.3s', zIndex: 1000, padding: '20px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2>Audit Log</h2>
          <button onClick={() => setIsAdminOpen(false)} style={{ background: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>X</button>
        </div>
        {auditLogs.length === 0 ? (
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>No logs found. Evaluate a profile first.</div>
        ) : (
          auditLogs.map((log, i) => (
            <div key={i} style={{ background: '#1e293b', padding: '10px', marginBottom: '10px', borderRadius: '8px', fontSize: '12px' }}>
              <strong>ID:</strong> {log.App_ID} <br/>
              <strong>Score:</strong> {log.Score} - {log.Status} <br/>
              <strong>Time:</strong> {log.Timestamp}
            </div>
          ))
        )}
      </div>

      {/* FLOATING CHATBOT (Bottom Right) */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 999 }}>
        {!isChatOpen && (
          <button onClick={() => setIsChatOpen(true)} style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#2563eb', color: 'white', border: 'none', fontSize: '24px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>💬</button>
        )}
        {isChatOpen && (
          <div style={{ width: '300px', height: '400px', background: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0' }}>
            <div style={{ background: '#2563eb', color: 'white', padding: '10px', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', display: 'flex', justifyContent: 'space-between' }}>
              <strong>AI Analyst</strong>
              <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✖</button>
            </div>
            <div style={{ flex: 1, padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', background: m.sender === 'user' ? '#2563eb' : '#f1f5f9', color: m.sender === 'user' ? 'white' : 'black', padding: '8px 12px', borderRadius: '8px', maxWidth: '80%', fontSize: '14px', wordBreak: 'break-word' }}>
                  {m.text}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', padding: '10px', borderTop: '1px solid #e2e8f0' }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendChatMessage()} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', outline: 'none' }} placeholder="Ask about an ID..." />
              <button onClick={sendChatMessage} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '0 12px', marginLeft: '8px', borderRadius: '4px', cursor: 'pointer' }}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;