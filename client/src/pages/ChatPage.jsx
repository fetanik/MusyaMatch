import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Імпортуємо хук для навігації
import '../styles/ChatPage.css';

export default function ChatPage() {
  const navigate = useNavigate(); // 2. Ініціалізуємо навігацію всередині компонента
  
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: "Hi there! I'm Musya, your AI cat expert! 🐱 I'm here to help you find the purrfect feline companion.",
      time: "1:39 PM"
    },
    {
      role: 'ai',
      text: "I can help you with cat care tips, breed information, or find the perfect match for your lifestyle. What would you like to know?",
      time: "1:39 PM"
    }
  ]);

  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [...prev, { role: 'user', text: userMsg, time: currentTime }]);
    setInput('');

    try {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply, time: currentTime }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: "⚠️ Помилка сервера", time: currentTime }]);
    }
  };

  return (
    <div className="musya-wrapper">
      {/* HEADER */}
      <header className="musya-header">
        <div className="musya-header-left">
          {/* 3. Додаємо onClick до кнопки. '/' — це шлях до головної сторінки */}
          <button className="musya-back-btn" onClick={() => navigate('/')}>
            ←
          </button>
          <div className="musya-header-avatar">🤖</div>
          <div className="musya-header-text">
            <h1 className="musya-header-title">Talk to Musya (AI Expert)</h1>
            <div className="musya-header-status">
              <span className="musya-status-dot">●</span> Online
            </div>
          </div>
        </div>
        <button className="musya-header-star">✨</button>
      </header>

      {/* MESSAGES AREA */}
      <main className="musya-chat-area">
        {messages.map((m, i) => (
          <div key={i} className={`musya-msg-row ${m.role}`}>
            <div className="musya-msg-avatar">🐱</div>
            <div className="musya-msg-content">
              <div className="musya-bubble">{m.text}</div>
              <span className="musya-time">{m.time}</span>
            </div>
          </div>
        ))}
      </main>

      {/* QUICK ACTIONS (CHIPS) */}
      <section className="musya-chips-wrapper">
        <div className="musya-chips-scroll">
          <button className="musya-chip" onClick={() => setInput("I want a kitten 🐱")}>
            I want a kitten 🐱
          </button>
          <button className="musya-chip" onClick={() => setInput("Tell me about seniors 👵")}>
            Tell me about seniors 👵
          </button>
          <button className="musya-chip" onClick={() => setInput("Budget for a cat 💰")}>
            Budget for a cat 💰
          </button>
          <button className="musya-chip" onClick={() => setInput("Low maintenance cats 😌")}>
            Low maintenance cats 😌
          </button>
          <button className="musya-chip" onClick={() => setInput("Playful & energetic ⚡")}>
            Playful & energetic ⚡
          </button>
          <button className="musya-chip" onClick={() => setInput("Good for apartments 🏠")}>
            Good for apartments 🏠
          </button>
        </div>
        <div className="musya-chips-line"></div>
      </section>

      {/* INPUT BAR */}
      <footer className="musya-input-wrapper">
        <div className="musya-input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
            placeholder="Ask Musya anything..."
            className="musya-input"
          />
          <button onClick={sendMessage} className="musya-send-btn">
            <span className="musya-send-icon">➤</span>
          </button>
        </div>
      </footer>
    </div>
  );
}