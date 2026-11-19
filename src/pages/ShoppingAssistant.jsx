import React, { useState, useEffect, useRef } from 'react';
import { askQuestion, addToCart } from '../services/api';

export default function ShoppingAssistant({ initialQuery, onAddToCartSuccess, onLocateProduct }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: 'Hello! I am your AI Shopping Assistant on the Smart Trolley. How may I assist you today? You can ask me where products are located, compare prices, look for senior-friendly foods, or find recipes!',
      sources: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState(initialQuery || '');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [activeSpeakingId, setActiveSpeakingId] = useState(null);
  const [actionNotice, setActionNotice] = useState('');
  const [healthProfile, setHealthProfile] = useState('general');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = 'en-IN'; // Indian English / Tamil friendly

      recog.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputQuery(transcript);
        setIsListening(false);
        handleSend(transcript);
      };

      recog.onerror = () => setIsListening(false);
      recog.onend = () => setIsListening(false);
      recognitionRef.current = recog;
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleListen = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert('Speech Recognition is not supported on this browser. Please type your question.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const speakText = async (text, messageId) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    // Toggle off if same message is tapped again
    if (activeSpeakingId === messageId) {
      setActiveSpeakingId(null);
      return;
    }

    // Clean markdown symbols for natural speech
    const cleanText = text
      .replace(/[*#_`~>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    // Detect Tamil script (Unicode block U+0B80–U+0BFF)
    const isTamil = /[\u0B80-\u0BFF]/.test(cleanText);
    const lang = isTamil ? 'ta' : 'en';

    setActiveSpeakingId(messageId);

    try {
      // Use backend gTTS — produces clear native Tamil + senior-paced English
      const url = `/api/voice/speak?text=${encodeURIComponent(cleanText)}&lang=${lang}`;
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setActiveSpeakingId(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        // Fallback to Web Speech API if backend fails
        audioRef.current = null;
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.rate = 0.88;
          utterance.lang = isTamil ? 'ta-IN' : 'en-IN';
          utterance.onend = () => setActiveSpeakingId(null);
          utterance.onerror = () => setActiveSpeakingId(null);
          window.speechSynthesis.speak(utterance);
        } else {
          setActiveSpeakingId(null);
        }
      };

      await audio.play();
    } catch (err) {
      console.error('gTTS playback error:', err);
      setActiveSpeakingId(null);
    }
  };

  const handleSend = async (queryText = inputQuery) => {
    const rawQuery = (queryText || '').trim();
    if (!rawQuery || loading) return;

    // Enhance query with active senior health profile if selected
    let effectiveQuery = rawQuery;
    if (healthProfile !== 'general' && !rawQuery.toLowerCase().includes(healthProfile)) {
      effectiveQuery = `[Health Profile: ${healthProfile.toUpperCase()}] ${rawQuery}`;
    }

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: rawQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const data = await askQuestion(effectiveQuery);

      const assistantMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: data.answer,
        sources: data.grounded_sources || [],
        mode: data.mode,
        model: data.model,
        intent: data.intent,
        is_relevant: data.is_relevant,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakText(data.answer, assistantMsg.id);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: `I encountered an issue retrieving that product: ${err.message}. Please ask our staff at Customer Service.`,
          sources: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDirect = async (productId, productName) => {
    try {
      await addToCart(productId, 1);
      setActionNotice(`✅ Added "${productName}" to your Smart Trolley!`);
      if (onAddToCartSuccess) onAddToCartSuccess();
      setTimeout(() => setActionNotice(''), 3500);
    } catch (err) {
      alert(`Could not add to trolley: ${err.message}`);
    }
  };

  const quickQuestions = [
    'Where can I find rice?',
    'Which rice is cheaper?',
    'What is the price of sugar?',
    'What offers are available today?',
    'What ingredients do I need for Vegetable Biryani?',
    'Healthy high-fibre biscuits for seniors',
    'அரிசி எங்கே உள்ளது?'
  ];

  return (
    <div style={{ padding: '24px 0', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Title */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--dark)' }}>
          AI Voice & RAG Shopping Assistant
        </h2>
        <p style={{ fontSize: '1rem', color: '#64748b' }}>
          Ask in English or Tamil using your voice or keyboard. Every answer is grounded directly in our live supermarket inventory.
        </p>
      </div>

      {/* Action Notice Banner */}
      {actionNotice && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            padding: '10px 16px',
            borderRadius: '10px',
            fontWeight: 700,
            marginBottom: '16px'
          }}
        >
          {actionNotice}
        </div>
      )}

      {/* Senior Health Profile Selector */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '16px', background: '#f8fbff', border: '1px solid #bfdbfe' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <strong style={{ fontSize: '0.9rem', color: '#1e3a8a', display: 'block' }}>
              🩺 Senior Health & Dietary Profile:
            </strong>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              AI tailors product retrieval to your medical constraints.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'general', label: 'General Shopper', icon: '🛒' },
              { id: 'diabetic', label: 'Diabetic Friendly', icon: '🩸' },
              { id: 'heart', label: 'Heart & BP Care', icon: '🫀' },
              { id: 'lactose', label: 'Lactose Free', icon: '🥛' }
            ].map((p) => {
              const active = healthProfile === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setHealthProfile(p.id)}
                  className={active ? 'btn-primary' : 'btn-outline'}
                  style={{
                    fontSize: '0.8rem',
                    padding: '5px 12px',
                    borderRadius: '16px'
                  }}
                >
                  {p.icon} {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Suggestion Chips */}
      <div style={{ marginBottom: '16px' }}>

        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
          RECOMMENDED QUESTIONS FOR SENIOR CITIZENS & REVIEW:
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="btn-outline"
              style={{
                fontSize: '0.85rem',
                padding: '6px 12px',
                borderRadius: '20px',
                borderColor: '#cbd5e1',
                background: '#ffffff'
              }}
            >
              💬 {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Window */}
      <div
        className="card"
        style={{
          minHeight: '480px',
          maxHeight: '620px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '24px',
          background: '#f8fafc',
          border: '2px solid var(--border)',
          marginBottom: '20px'
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            {/* Message Bubble */}
            <div
              style={{
                maxWidth: '85%',
                padding: '16px 20px',
                borderRadius: '16px',
                background: m.sender === 'user' ? '#2563eb' : '#ffffff',
                color: m.sender === 'user' ? '#ffffff' : '#0f172a',
                boxShadow: 'var(--shadow-sm)',
                border: m.sender === 'user' ? 'none' : '1px solid var(--border)',
                borderBottomRightRadius: m.sender === 'user' ? '4px' : '16px',
                borderBottomLeftRadius: m.sender === 'user' ? '16px' : '4px'
              }}
            >
              {/* Header inside bubble */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  gap: '12px',
                  fontSize: '0.8rem',
                  opacity: 0.8
                }}
              >
                <strong>{m.sender === 'user' ? 'Senior Shopper' : '🛒 Trolley AI Assistant'}</strong>
                <span>{m.timestamp}</span>
              </div>

              {/* Message Content */}
              <div
                style={{
                  fontSize: '1.05rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {m.text}
              </div>

              {/* Grounded Retrieval Evidence Cards (with direct Cart & Map Actions!) */}
              {m.sender === 'assistant' && m.sources && m.sources.length > 0 && (
                <div
                  style={{
                    marginTop: '14px',
                    paddingTop: '12px',
                    borderTop: '1px solid #e2e8f0',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: '8px' }}>
                    📚 Verified Database Evidence ({m.sources.length} matching products cited):
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                    {m.sources.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#f1f5f9',
                          padding: '12px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                            {s.product_name}
                          </strong>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {s.brand} &bull; {s.quantity}
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e3a8a', margin: '4px 0' }}>
                            Rs. {Number(s.price).toFixed(2)}
                            {s.discount_offer && s.discount_offer !== 'No Offer' && (
                              <span style={{ fontSize: '0.75rem', color: '#dc2626', marginLeft: '6px' }}>
                                ({s.discount_offer})
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '8px' }}>
                            📍 <strong>{s.aisle_number}</strong> &bull; {s.shelf_location}
                          </div>
                        </div>

                        {/* Direct One-Click Actions */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleAddDirect(s.product_id, s.product_name)}
                            className="btn-primary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem', flex: 1 }}
                          >
                            🛒 Add to Trolley
                          </button>
                          {onLocateProduct && (
                            <button
                              type="button"
                              onClick={() => onLocateProduct(s.product_id)}
                              className="btn-outline"
                              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            >
                              🗺️ Map
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Text-to-Speech Playback Button */}
              {m.sender === 'assistant' && (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => speakText(m.text, m.id)}
                    style={{
                      background: activeSpeakingId === m.id ? '#fee2e2' : '#f1f5f9',
                      color: activeSpeakingId === m.id ? '#dc2626' : '#2563eb',
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      borderRadius: '8px'
                    }}
                  >
                    {activeSpeakingId === m.id ? '⏹️ Stop Speaking' : '🔊 Read Aloud (Voice)'}
                  </button>
                  {m.mode && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Mode: {m.mode === 'nexus_llm' ? 'Nexus API' : 'Grounded Fallback Engine'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', fontStyle: 'italic' }}>
            <span className="pulse-active">⚡</span>
            <span>Searching FAISS vector database & generating grounded answer...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{ display: 'flex', gap: '12px' }}
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask anything... e.g. 'Where can I find rice?' or 'Which rice is cheaper?'"
          disabled={loading}
          style={{
            flex: 1,
            padding: '16px 20px',
            borderRadius: '14px',
            border: '2px solid var(--border)',
            fontSize: '1.05rem',
            outline: 'none',
            background: 'white'
          }}
        />

        {/* Microphone Button */}
        <button
          type="button"
          onClick={toggleListen}
          className={isListening ? 'btn-danger' : 'btn-outline'}
          style={{
            padding: '16px 20px',
            borderRadius: '14px',
            fontSize: '1rem',
            backgroundColor: isListening ? '#dc2626' : '#ffffff'
          }}
          title={isListening ? 'Listening... Click to stop' : 'Click to speak via Microphone'}
        >
          {isListening ? '🔴 Listening...' : '🎤 Speak'}
        </button>

        {/* Send Button */}
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !inputQuery.trim()}
          style={{
            padding: '16px 28px',
            borderRadius: '14px',
            fontSize: '1.05rem',
            opacity: loading || !inputQuery.trim() ? 0.6 : 1
          }}
        >
          Send ➔
        </button>
      </form>
    </div>
  );
}
