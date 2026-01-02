// ZayaChatbot.tsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './ZayaChatbot.module.css';

const ZayaChatbot: React.FC = () => {
  type Message = {
    role: 'user' | 'bot' | 'system';
    text: string;
    options?: string[];
  };

  const [userId, setUserId] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([{
    role: 'system',
    text: 'Hi! I\'m Zaya, what best describes your role?',
    options: ['🎬 Creator', '👩‍💻 Developer'],
  }]);
  const [intent, setIntent] = useState('');
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const defaultX = window.innerWidth - 370;
    const defaultY = window.innerHeight - 200;
    setPosition({ x: defaultX, y: defaultY });
    let id = localStorage.getItem('zaya-user-id');
    if (!id) {
      id = Math.random().toString(36).substring(2);
      localStorage.setItem('zaya-user-id', id);
    }
    setUserId(id || '');
  }, []);

  const handleOptionClick = (selected: string) => {
    const rawIntent = selected.toLowerCase().includes('creator') ? 'creator' : 'developer';
    setIntent(rawIntent);

    const newMessages: Message[] = [
      {
        role: 'bot',
        text:
          rawIntent === 'creator'
            ? 'Awesome! You can try StormEye for AI video generation or Thunderr for growing your content. What would you like help with?'
            : 'We love builders. What do you need help with?'
      }
    ];

    setChatHistory(prev => [...prev, ...newMessages]);
  };

const handleSubmit = async () => {
  if (!message.trim()) return;

  const userMsg: Message = { role: 'user', text: message };
  const chatSoFar = [...chatHistory, userMsg];
  setChatHistory(chatSoFar);
  setMessage('');

  setIsTyping(true);

  try {
    // Step 1: Get Zaya's AI response from backend
    const aiRes = await fetch('http://localhost:8000/api/zaya-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        userIntent: intent,
        userMessage: message,
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href,
        fullConversation: JSON.stringify(
          chatSoFar
            .filter(m => m.role === 'user' || m.role === 'bot')
            .map(m => ({
              role: m.role === 'bot' ? 'zaya' : m.role,
              message: m.text
            }))
        )
      })
    });

    const data = await aiRes.json();
    const aiReply = data.ai_response || 'Sorry, something went wrong!';
    const zayaMsg: Message = { role: 'bot', text: aiReply };

    const fullChat = [...chatSoFar, zayaMsg];
    setChatHistory(fullChat);
    setIsTyping(false);

    // Step 2: Log full conversation including Zaya’s latest message
    await fetch('http://localhost:8000/api/zaya-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        userIntent: intent,
        userMessage: message,
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href,
        fullConversation: JSON.stringify(
          fullChat
            .filter(m => m.role === 'user' || m.role === 'bot')
            .map(m => ({
              role: m.role === 'bot' ? 'zaya' : m.role,
              message: m.text
            }))
        )
      })
    });

  } catch (err) {
    console.error("Failed to send:", err);
    alert("Backend error — is it running?");
  }
};


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newX = e.clientX - offset.current.x;
      const newY = e.clientY - offset.current.y;
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    const rect = dragRef.current?.getBoundingClientRect();
    offset.current = {
      x: e.clientX - (rect?.left || 0),
      y: e.clientY - (rect?.top || 0)
    };
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed', bottom: 20, right: 20, borderRadius: '50%',
            width: 56, height: 56, fontSize: 24, backgroundColor: '#007bff', color: 'white',
            border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', cursor: 'pointer'
          }}
        >💬</button>
      )}

      {isOpen && (
        <div
          ref={dragRef}
          className={styles.chatWrapper}
          style={{ left: position.x, top: position.y }}
        >
          <div className={styles.chatHeader} onMouseDown={handleMouseDown}>
            <img src="/zaya.png" alt="Zaya" />
            Zaya
            <button onClick={() => setIsOpen(false)}>✖</button>
          </div>

          <div className={styles.chatBody}>
            {chatHistory.map((msg, idx) => (
              <div key={idx}>
                {msg.role === 'user' && (
                  <div className={`${styles.messageRow} ${styles.userRow}`}>
                    <div className={styles.userBubble}>{msg.text}</div>
                  </div>
                )}
                {msg.role === 'bot' && (
                  <div className={`${styles.messageRow} ${styles.botRow}`}>
                    <img src="/zaya.png" alt="Zaya" className={styles.avatar} />
                    <div className={styles.botBubble}>{msg.text}</div>
                  </div>
                )}
                {msg.role === 'system' && (
                  <>
                    <div className={`${styles.messageRow} ${styles.botRow}`}>
                      <img src="/zaya.png" alt="Zaya" className={styles.avatar} />
                      <div className={styles.botBubble}>{msg.text}</div>
                    </div>
                    <div className={styles.options}>
                      {msg.options?.map((opt, i) => {
                        const rawIntent = opt.toLowerCase().includes('creator') ? 'creator' : 'developer';
                        const isSelected = rawIntent === intent;
                        return (
                          <button
                            key={i}
                            onClick={() => handleOptionClick(opt)}
                            className={isSelected ? styles.selectedOption : styles.optionButton}
                          >{opt}</button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ))}
            {isTyping && (
              <div className={`${styles.messageRow} ${styles.botRow}`}>
                <img src="/zaya.png" alt="Zaya" className={styles.avatar} />
                <div className={styles.botBubble}>
                  <span className={styles.typingDots}>
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {intent && (
            <div className={styles.inputArea}>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
              />
              <div className={styles.buttons}>
                <button className={styles.resetButton} onClick={() => {
                  setIntent('');
                  setMessage('');
                  setChatHistory([
                    {
                      role: 'system',
                      text: 'Hi! What best describes your role?',
                      options: ['🎬 Creator', '👩‍💻 Developer']
                    }
                  ]);
                }}>Change Role</button>
                <button
                  className={styles.resetButton}
                  onClick={() => {
                    localStorage.removeItem('zaya-user-id'); // optional — regenerate ID
                    const newId = Math.random().toString(36).substring(2);
                    localStorage.setItem('zaya-user-id', newId);
                    setUserId(newId);
                    setIntent('');
                    setMessage('');
                    setChatHistory([
                      {
                        role: 'system',
                        text: 'Hi! I\'m Zaya, what best describes your role?',
                        options: ['🎬 Creator', '👩‍💻 Developer']
                      }
                    ]);
                  }}
                >
                  Reset Conversation
                </button>
                <a
                  href="https://m3d60c6dc7z.sg.larksuite.com/share/base/form/shrlgnEpjeZoICQfZfFZgPJuCqc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.reportButton}
                >Submit Bug Report</a>
                <button className={styles.sendButton} onClick={handleSubmit}>Send</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ZayaChatbot;
