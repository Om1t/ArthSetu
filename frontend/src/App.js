import React, { useState, useRef, useEffect } from 'react';
import CreditForm from './components/CreditForm';

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeAppId, setActiveAppId] = useState("");
  const [chatMessages, setChatMessages] = useState([{ sender: 'ai', text: 'ArthSetu Secure AI online. Awaiting ID context.' }]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatMessages(p => [...p, { sender: 'user', text: msg }]);
    setChatInput('');
    setIsTyping(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, applicant_id: activeAppId })
      });
      const data = await res.json();
      setChatMessages(p => [...p, { sender: 'ai', text: data.reply }]);
    } catch { 
      setChatMessages(p => [...p, { sender: 'ai', text: "Connection to secure server lost." }]); 
    }
    setIsTyping(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b1220', fontFamily: "'Manrope', sans-serif" }}>
      
      {/* MAIN APPLICATION (Handles its own Tabs) */}
      <CreditForm onNewApplication={(id) => setActiveAppId(id)} />

      {/* FLOATING AI ANALYST (Premium Blue Styling) */}
      <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 999 }}>
        {!isChatOpen && (
          <button 
            onClick={() => setIsChatOpen(true)} 
            style={{ width: '65px', height: '65px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(30, 64, 175, 0.4)', transition: 'transform 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {/* Clean SVG Chat Icon instead of Robot Emoji */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        )}
        {isChatOpen && (
          <div style={{ width: '350px', height: '500px', background: 'white', borderRadius: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(90deg, #1e3a8a, #1e40af)', color: 'white', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{fontSize: '16px', display: 'block'}}>ArthSetu AI</strong>
                {activeAppId ? <span style={{fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px'}}>Context: {activeAppId}</span> : <span style={{fontSize: '11px', opacity: 0.8}}>No Active ID</span>}
              </div>
              <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✖</button>
            </div>
            
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc' }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', background: m.sender === 'user' ? '#1e40af' : '#ffffff', color: m.sender === 'user' ? 'white' : '#1e293b', padding: '12px 16px', borderRadius: '14px', fontSize: '14px', maxWidth: '85%', border: m.sender === 'user' ? 'none' : '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                  {m.text}
                </div>
              ))}
              {isTyping && <div style={{ alignSelf: 'flex-start', background: '#ffffff', padding: '12px 16px', borderRadius: '14px', fontSize: '12px', color: '#94a3b8', border: '1px solid #e2e8f0' }}>Analyzing securely...</div>}
              <div ref={chatEndRef} />
            </div>
            
            <div style={{ display: 'flex', padding: '15px', background: 'white', borderTop: '1px solid #f1f5f9' }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} style={{ flex: 1, padding: '12px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} placeholder="Ask about the risk profile..." />
              <button onClick={sendChat} style={{ background: '#1e40af', color: 'white', border: 'none', borderRadius: '10px', padding: '0 18px', marginLeft: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Send</button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default App;