import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ChatPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function ChatPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState('initial');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [matches, setMatches] = useState([]);
  const [customAnswer, setCustomAnswer] = useState('');
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  const questions = [
    {
      id: 'experience',
      text: 'Will this be your first cat, or are you already an experienced cat owner?',
      options: [
        { value: 'first_time', label: 'First time, a bit nervous' },
        { value: 'experienced', label: 'Experienced owner' },
        { value: 'returning', label: 'Had cats before, returning to it' },
      ],
    },
    {
      id: 'household',
      text: 'Who else will live with the fluffy friend? Do you have small children or other pets (especially dogs)?',
      options: [
        { value: 'alone', label: 'I live alone' },
        { value: 'kids', label: 'I have small children' },
        { value: 'pets', label: 'I have other pets' },
        { value: 'kids_pets', label: 'I have both children and pets' },
      ],
    },
    {
      id: 'space',
      text: "Do you live in a spacious house where there's room to play, or in a cozy small apartment?",
      options: [
        { value: 'apartment_small', label: 'Small apartment' },
        { value: 'apartment_large', label: 'Spacious apartment' },
        { value: 'house', label: 'House with yard' },
      ],
    },
    {
      id: 'preference',
      text: 'Who are you looking for: a playful kitten that will turn the house upside down, or an adult and calm cat that you can just watch movies with?',
      options: [
        { value: 'kitten_playful', label: 'Playful kitten' },
        { value: 'kitten_calm', label: 'Calm kitten' },
        { value: 'adult_playful', label: 'Playful adult cat' },
        { value: 'adult_calm', label: 'Calm adult cat' },
      ],
    },
    {
      id: 'special_needs',
      text: 'Sometimes shelters have cats that need a little more care - for example, special food or regular vet visits. Are you considering such tail-friends?',
      options: [
        { value: 'yes', label: "Yes, I'm ready to help" },
        { value: 'no', label: 'No, looking for no special needs' },
        { value: 'maybe', label: 'Maybe, depends on the situation' },
      ],
    },
  ];

  const quickReplies = [
    'Kitten nutrition',
    'Cat communication',
    'Playtime ideas 🧶',
    'Cat comfort zones 🛏️',
    'Feline behavior 😻',
    'Cat health secrets 🌟',
  ];

  const handleAnswer = (option) => {
    const newAnswers = { ...answers, [questions[currentQuestion].id]: option.value };
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setShowResults(true);
      findMatches(newAnswers);
    }
  };

  const handleCustomAnswer = () => {
    if (!customAnswer.trim()) return;
    const newAnswers = { ...answers, [questions[currentQuestion].id]: customAnswer };
    setAnswers(newAnswers);
    setCustomAnswer('');

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setShowResults(true);
      findMatches(newAnswers);
    }
  };

  const findMatches = async (userAnswers) => {
    setMatchingLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: userAnswers }),
      });
      const data = await response.json();
      setMatches(data.recommendations || []);
    } catch (error) {
      console.error('Error finding matches:', error);
      setMatches([]);
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleInitialChoice = (choice) => {
    if (choice === 'matching') {
      setMode('matching');
      setMessages([
        {
          role: 'ai',
          text: "Great! Let me help you find your perfect cat companion. I'll ask you a few questions to understand your preferences and lifestyle.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } else if (choice === 'care') {
      setMode('chat');
      setMessages([
        {
          role: 'ai',
          text: " Oh hello there, fellow cat lover! I'm Musya, your purr-fect AI cat companion!  I absolutely adore everything about our feline friends - from their tiny toe beans to their majestic whiskers!",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          role: 'ai',
          text: " Whether you need kitten care wisdom, cat behavior insights, or just want to talk about how amazing cats are, I'm here for you! What's on your mind today?",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const formatMessage = (text) => {
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  };

  const sendMessage = async () => {
    if (!input.trim() || chatLoading) return;

    const userMsg = input;
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [...prev, { role: 'user', text: userMsg, time: currentTime }]);
    setInput('');
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.reply || 'Failed to get AI reply');
      }
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: data.reply,
          time: currentTime,
          formatted: formatMessage(data.reply),
        },
      ]);
    } catch {
      const fallback = "⚠️ Sorry, I'm having trouble responding. Please try again! 🐱";
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: fallback,
          time: currentTime,
          formatted: formatMessage(fallback),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleQuickReply = (reply) => {
    setInput(reply);
  };

  return (
    <div className="musya-wrapper">
      <header className="musya-header">
        <div className="musya-header-left">
          <button className="musya-back-btn" onClick={() => navigate('/dashboard')}>
            ←
          </button>
          <div className="musya-header-avatar">🤖</div>
          <div className="musya-header-text">
            <h1 className="musya-header-title">
              {mode === 'initial'
                ? 'Talk to Musya (AI Expert)'
                : mode === 'matching'
                  ? 'Find Your Perfect Cat Match'
                  : 'Talk to Musya (AI Expert)'}
            </h1>
            <div className="musya-header-status">
              <span className="musya-status-dot">●</span>
              {mode === 'initial'
                ? 'Online'
                : mode === 'matching'
                  ? `Question ${currentQuestion + 1} of ${questions.length}`
                  : 'Online'}
            </div>
          </div>
        </div>
        <button className="musya-header-star">✨</button>
      </header>

      {mode === 'initial' && (
        <main className="initial-choice-area">
          <div className="choice-card">
            <div className="choice-avatar">🐱</div>
            <h2 className="choice-title">Welcome to MusyaMatch!</h2>
            <p className="choice-description">How can I help you today?</p>

            <div className="choice-buttons">
              <button className="choice-btn primary" onClick={() => handleInitialChoice('matching')}>
                <div className="choice-icon">🔍</div>
                <div className="choice-text">
                  <h3>Find a Cat</h3>
                  <p>Get matched with your perfect feline companion</p>
                </div>
              </button>

              <button className="choice-btn secondary" onClick={() => handleInitialChoice('care')}>
                <div className="choice-icon">💡</div>
                <div className="choice-text">
                  <h3>Care Advice</h3>
                  <p>Get tips and help with cat care</p>
                </div>
              </button>
            </div>
          </div>
        </main>
      )}

      {mode === 'matching' && !showResults && (
        <>
          <div className="question-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <main className="questionnaire-area">
            <div className="question-card">
              <div className="question-avatar">🐱</div>
              <div className="question-content">
                <h2 className="question-text">{questions[currentQuestion].text}</h2>

                <div className="answer-options">
                  {questions[currentQuestion].options.map((option) => (
                    <button
                      key={option.value}
                      className="answer-btn"
                      onClick={() => handleAnswer(option)}
                    >
                      {option.label}
                    </button>
                  ))}

                  <div className="custom-answer-section">
                    <input
                      type="text"
                      value={customAnswer}
                      onChange={(e) => setCustomAnswer(e.target.value)}
                      placeholder="Type your own answer..."
                      className="custom-answer-input"
                    />
                    <button
                      className="custom-answer-btn"
                      onClick={handleCustomAnswer}
                      disabled={!customAnswer.trim()}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </>
      )}

      {mode === 'chat' && (
        <>
          <main className="musya-chat-area">
            {messages.map((m, i) => (
              <div key={i} className={`musya-msg-row ${m.role}`}>
                <div className="musya-msg-avatar">🐱</div>
                <div className="musya-msg-content">
                  <div
                    className="musya-bubble"
                    dangerouslySetInnerHTML={{ __html: m.formatted || m.text }}
                  />
                  <span className="musya-time">{m.time}</span>
                </div>
              </div>
            ))}
          </main>

          <section className="musya-chips-wrapper">
            <div className="musya-chips-scroll">
              {quickReplies.map((reply, index) => (
                <button key={index} className="musya-chip" onClick={() => handleQuickReply(reply)}>
                  {reply}
                </button>
              ))}
            </div>
            <div className="musya-chips-line" />
          </section>

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
        </>
      )}

      {mode === 'matching' && showResults && (
        <main className="results-area">
          <div className="results-header">
            <h2>🎉 Your Perfect Cats!</h2>
            <p>Based on your answers, we found the best companions for you</p>
          </div>

          <div className="matches-grid">
            {matches.length > 0 ? (
              matches.map((match, index) => (
                <div key={index} className="cat-match-card">
                  <div className="match-header">
                    <div className="cat-avatar">🐱</div>
                    <div className="match-info">
                      <h3>{match.cat_name}</h3>
                      <div className="compatibility-score">
                        <span className="score-value">{match.compatibility_score}%</span>
                        <span className="score-label">Compatibility</span>
                      </div>
                    </div>
                  </div>
                  <div className="match-reason">
                    <p>{match.reason}</p>
                  </div>
                  <button className="view-cat-btn" onClick={() => setSelectedMatch(match)}>
                    View Profile
                  </button>
                </div>
              ))
            ) : (
              <div className="no-matches">
                <div className="no-matches-icon">🔍</div>
                <h3>{matchingLoading ? 'Finding perfect cats...' : 'No matches found yet'}</h3>
                <p>
                  {matchingLoading
                    ? 'Analyzing your answers and database'
                    : 'Try restarting the quiz or adding more available cats'}
                </p>
              </div>
            )}
          </div>
        </main>
      )}

      {selectedMatch?.cat && (
        <div className="cat-modal-backdrop" onClick={() => setSelectedMatch(null)}>
          <article className="cat-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="cat-modal-close"
              onClick={() => setSelectedMatch(null)}
              aria-label="Close details"
            >
              x
            </button>
            {selectedMatch.cat.imageUrl ? (
              <img className="cat-modal-image" src={selectedMatch.cat.imageUrl} alt={selectedMatch.cat.name} />
            ) : null}
            <div className="cat-modal-content">
              <h3>{selectedMatch.cat.name}</h3>
              <p className="cat-modal-meta">
                {selectedMatch.cat.breed || 'Unknown breed'}
                {Number.isFinite(selectedMatch.cat.age) ? ` • ${selectedMatch.cat.age} years` : ''}
              </p>
              <p className="cat-modal-description">
                {selectedMatch.cat.description || 'No description available.'}
              </p>
              <div className="cat-modal-chips">
                {selectedMatch.cat.gender && <span className="cat-chip">Gender: {selectedMatch.cat.gender}</span>}
                {selectedMatch.cat.energyLevel && (
                  <span className="cat-chip">Energy: {selectedMatch.cat.energyLevel}</span>
                )}
                {selectedMatch.cat.experienceLevel && (
                  <span className="cat-chip">Experience level: {selectedMatch.cat.experienceLevel}</span>
                )}
                <span className="cat-chip">
                  Good with kids: {selectedMatch.cat.goodWithKids ? 'Yes' : 'No'}
                </span>
                <span className="cat-chip">
                  Good with pets: {selectedMatch.cat.goodWithPets ? 'Yes' : 'No'}
                </span>
                <span className="cat-chip">
                  Special needs: {selectedMatch.cat.specialNeeds ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
