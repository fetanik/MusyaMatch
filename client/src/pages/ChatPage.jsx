import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ChatPage.css';
import { resolveUploadedImageUrl } from '../utils/mediaUrl';
import { apiUrl } from '../utils/apiUrl';
import { useI18n } from '../i18n/I18nContext';

export default function ChatPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

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

  const questions = useMemo(
    () => [
      {
        id: 'experience',
        text: t('chat.q1'),
        options: [
          { value: 'first_time', label: t('chat.q1o1') },
          { value: 'experienced', label: t('chat.q1o2') },
          { value: 'returning', label: t('chat.q1o3') },
        ],
      },
      {
        id: 'household',
        text: t('chat.q2'),
        options: [
          { value: 'alone', label: t('chat.q2o1') },
          { value: 'kids', label: t('chat.q2o2') },
          { value: 'pets', label: t('chat.q2o3') },
          { value: 'kids_pets', label: t('chat.q2o4') },
        ],
      },
      {
        id: 'space',
        text: t('chat.q3'),
        options: [
          { value: 'apartment_small', label: t('chat.q3o1') },
          { value: 'apartment_large', label: t('chat.q3o2') },
          { value: 'house', label: t('chat.q3o3') },
        ],
      },
      {
        id: 'preference',
        text: t('chat.q4'),
        options: [
          { value: 'kitten_playful', label: t('chat.q4o1') },
          { value: 'kitten_calm', label: t('chat.q4o2') },
          { value: 'adult_playful', label: t('chat.q4o3') },
          { value: 'adult_calm', label: t('chat.q4o4') },
        ],
      },
      {
        id: 'special_needs',
        text: t('chat.q5'),
        options: [
          { value: 'yes', label: t('chat.q5o1') },
          { value: 'no', label: t('chat.q5o2') },
          { value: 'maybe', label: t('chat.q5o3') },
        ],
      },
    ],
    [t],
  );

  const quickReplies = useMemo(
    () => [
      t('chat.quick1'),
      t('chat.quick2'),
      t('chat.quick3'),
      t('chat.quick4'),
      t('chat.quick5'),
      t('chat.quick6'),
    ],
    [t],
  );

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
      const response = await fetch(apiUrl('/api/match'), {
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
          text: t('chat.matchIntro'),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } else if (choice === 'care') {
      setMode('chat');
      setMessages([
        {
          role: 'ai',
          text: t('chat.careIntro1'),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          role: 'ai',
          text: t('chat.careIntro2'),
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
      const res = await fetch(apiUrl('/api/chat'), {
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
    } catch (err) {
      const fallback =
        err?.message && err.message !== 'Failed to get AI reply'
          ? err.message
          : t('chat.fallbackReply');
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

  const headerTitle =
    mode === 'matching' ? t('chat.titleMatch') : t('chat.titleExpert');
  const headerStatus =
    mode === 'matching'
      ? t('chat.questionProgress', { n: currentQuestion + 1, total: questions.length })
      : t('chat.online');

  return (
    <div className="musya-wrapper">
      <header className="musya-header">
        <div className="musya-header-left">
          <button className="musya-back-btn" onClick={() => navigate('/dashboard')}>
            ←
          </button>
          <div className="musya-header-avatar">🤖</div>
          <div className="musya-header-text">
            <h1 className="musya-header-title">{headerTitle}</h1>
            <div className="musya-header-status">
              <span className="musya-status-dot">●</span>
              {headerStatus}
            </div>
          </div>
        </div>
        <button className="musya-header-star">✨</button>
      </header>

      {mode === 'initial' && (
        <main className="initial-choice-area">
          <div className="choice-card">
            <div className="choice-avatar">🐱</div>
            <h2 className="choice-title">{t('chat.welcomeTitle')}</h2>
            <p className="choice-description">{t('chat.welcomeSub')}</p>

            <div className="choice-buttons">
              <button className="choice-btn primary" onClick={() => handleInitialChoice('matching')}>
                <div className="choice-icon">🔍</div>
                <div className="choice-text">
                  <h3>{t('chat.findCatTitle')}</h3>
                  <p>{t('chat.findCatDesc')}</p>
                </div>
              </button>

              <button className="choice-btn secondary" onClick={() => handleInitialChoice('care')}>
                <div className="choice-icon">💡</div>
                <div className="choice-text">
                  <h3>{t('chat.careTitle')}</h3>
                  <p>{t('chat.careDesc')}</p>
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
                      placeholder={t('chat.phCustom')}
                      className="custom-answer-input"
                    />
                    <button
                      className="custom-answer-btn"
                      onClick={handleCustomAnswer}
                      disabled={!customAnswer.trim()}
                    >
                      {t('chat.send')}
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
                placeholder={t('chat.phInput')}
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
            <h2>{t('chat.resultsTitle')}</h2>
            <p>{t('chat.resultsSub')}</p>
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
                        <span className="score-label">{t('chat.compatibility')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="match-reason">
                    <p>{match.reason}</p>
                  </div>
                  <button className="view-cat-btn" onClick={() => setSelectedMatch(match)}>
                    {t('chat.viewProfile')}
                  </button>
                </div>
              ))
            ) : (
              <div className="no-matches">
                <div className="no-matches-icon">🔍</div>
                <h3>{matchingLoading ? t('chat.finding') : t('chat.noMatches')}</h3>
                <p>{matchingLoading ? t('chat.findingSub') : t('chat.noMatchesSub')}</p>
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
              aria-label={t('chat.closeDetails')}
            >
              x
            </button>
            {selectedMatch.cat.imageUrl ? (
              <img
                className="cat-modal-image"
                src={resolveUploadedImageUrl(selectedMatch.cat.imageUrl || selectedMatch.cat.image_url)}
                alt={selectedMatch.cat.name}
              />
            ) : null}
            <div className="cat-modal-content">
              <h3>{selectedMatch.cat.name}</h3>
              <p className="cat-modal-meta">
                {selectedMatch.cat.breed || t('chat.unknownBreed')}
                {Number.isFinite(selectedMatch.cat.age)
                  ? ` • ${t('chat.years', { n: selectedMatch.cat.age })}`
                  : ''}
              </p>
              <p className="cat-modal-description">
                {selectedMatch.cat.description || t('chat.noDescription')}
              </p>
              <div className="cat-modal-chips">
                {selectedMatch.cat.gender && (
                  <span className="cat-chip">
                    {t('chat.gender')}: {selectedMatch.cat.gender}
                  </span>
                )}
                {selectedMatch.cat.energyLevel && (
                  <span className="cat-chip">
                    {t('chat.energy')}: {selectedMatch.cat.energyLevel}
                  </span>
                )}
                {selectedMatch.cat.experienceLevel && (
                  <span className="cat-chip">
                    {t('chat.experienceLevel')}: {selectedMatch.cat.experienceLevel}
                  </span>
                )}
                <span className="cat-chip">
                  {t('chat.goodKids')}:{' '}
                  {selectedMatch.cat.goodWithKids ? t('common.yes') : t('common.no')}
                </span>
                <span className="cat-chip">
                  {t('chat.goodPets')}:{' '}
                  {selectedMatch.cat.goodWithPets ? t('common.yes') : t('common.no')}
                </span>
                <span className="cat-chip">
                  {t('chat.specialNeeds')}:{' '}
                  {selectedMatch.cat.specialNeeds ? t('common.yes') : t('common.no')}
                </span>
              </div>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
