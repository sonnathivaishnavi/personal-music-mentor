import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Music, Send, Loader2, Sparkles, Guitar, Piano, Mic2, Menu, Music2, Home, Clock, Trash2, MessageSquare, X } from 'lucide-react';

type Message = {
  role: 'user' | 'mentor';
  text: string;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};

const SUGGESTIONS = [
  { icon: Guitar, text: "Suggest guitar keys for a complete beginner" },
  { icon: Piano, text: "Best chords for sad piano music?" },
  { icon: Music2, text: "How to read sheet music basics?" },
  { icon: Mic2, text: "Daily vocal warm-up routine for 15 mins" },
];

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('melody_mentor_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : false);
  
  const currentSessionIdRef = useRef<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const setSessionId = (id: string | null) => {
    currentSessionIdRef.current = id;
    setCurrentSessionId(id);
  };

  const updateCurrentSession = (newMessages: Message[]) => {
    let sessionId = currentSessionIdRef.current;
    
    if (!sessionId) {
      sessionId = Date.now().toString();
      setSessionId(sessionId);
      const userMsg = newMessages.find(m => m.role === 'user');
      const title = userMsg ? (userMsg.text.slice(0, 30) + (userMsg.text.length > 30 ? '...' : '')) : 'New Chat';
      
      const newSession: ChatSession = {
        id: sessionId,
        title,
        messages: newMessages,
        updatedAt: Date.now()
      };
      const updatedSessions = [newSession, ...sessions];
      setSessions(updatedSessions);
      localStorage.setItem('melody_mentor_sessions', JSON.stringify(updatedSessions));
    } else {
      setSessions(prev => {
        const updatedSessions = prev.map(s => {
          if (s.id === sessionId) {
            return { ...s, messages: newMessages, updatedAt: Date.now() };
          }
          return s;
        }).sort((a, b) => b.updatedAt - a.updatedAt);
        localStorage.setItem('melody_mentor_sessions', JSON.stringify(updatedSessions));
        return updatedSessions;
      });
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setIsSidebarOpen(false);
  };

  const loadSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setMessages(session.messages);
      setSessionId(session.id);
      setIsSidebarOpen(false);
    }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all chat history?')) {
      setSessions([]);
      localStorage.removeItem('melody_mentor_sessions');
      startNewChat();
    }
  };

  const handleSubmit = async (e?: React.FormEvent, submittedText?: string) => {
    e?.preventDefault();
    const textToSend = submittedText || input;
    if (!textToSend.trim() || loading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', text: textToSend } as Message];
    setMessages(newMessages);
    updateCurrentSession(newMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/mentor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();
      
      if (response.ok) {
        const finalMessages = [...newMessages, { role: 'mentor', text: data.text } as Message];
        setMessages(finalMessages);
        updateCurrentSession(finalMessages);
      } else {
        const finalMessages = [...newMessages, { role: 'mentor', text: `**Error:** ${data.error || 'Failed to fetch'}` } as Message];
        setMessages(finalMessages);
        updateCurrentSession(finalMessages);
      }
    } catch (error) {
      const finalMessages = [...newMessages, { role: 'mentor', text: '**Error:** Something went wrong communicating with the mentor.' } as Message];
      setMessages(finalMessages);
      updateCurrentSession(finalMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 bottom-0 bg-white border-r border-slate-200 z-30 transition-all duration-300 ease-in-out flex flex-col md:static md:h-screen md:shrink-0 ${
          isSidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full md:w-0 md:translate-x-0 md:border-r-0 overflow-hidden'
        }`}
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Recent Chats</h2>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-500 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center mt-4">No recent history</p>
          ) : (
            sessions.map(session => (
              <button
                key={session.id}
                onClick={() => loadSession(session.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors md:hover:bg-slate-100 ${
                  currentSessionId === session.id 
                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                    : 'text-slate-700'
                }`}
              >
                <MessageSquare className={`w-4 h-4 shrink-0 ${currentSessionId === session.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="truncate flex-1">{session.title}</span>
              </button>
            ))
          )}
        </div>

        {sessions.length > 0 && (
          <div className="p-4 border-t border-slate-200">
            <button
              onClick={clearHistory}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </button>
          </div>
        )}
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-slate-200 shrink-0 shadow-sm z-10 w-full relative">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-inner hidden sm:flex shrink-0">
              <Music className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight leading-tight">Melody Mentor</h1>
              <p className="text-xs text-slate-500 font-medium">Your AI Music Teacher</p>
            </div>
          </div>
          <button
            onClick={startNewChat}
            disabled={messages.length === 0}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors shrink-0 ${
              messages.length === 0 
                ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                : 'text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900'
            }`}
            title="Start a new topic"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">New Topic</span>
          </button>
        </header>

        {/* Chat Messages */}
        <main className="flex-1 overflow-y-auto w-full p-4 md:p-6 pb-28 md:pb-32">
          <div className="max-w-4xl mx-auto h-full">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4 mt-6 md:mt-0">
                  <Sparkles className="w-10 h-10 text-indigo-600" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-800">
                    What would you like to learn today?
                  </h2>
                  <p className="text-slate-600 md:text-lg">
                    Ask about any instrument, music theory, daily practice routines, or specific techniques.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-8">
                  {SUGGESTIONS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSubmit(undefined, suggestion.text)}
                      className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group"
                    >
                      <div className="bg-indigo-50 p-2 rounded-lg group-hover:bg-indigo-100 transition-colors shrink-0">
                        <suggestion.icon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{suggestion.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-4 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'mentor' && (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-1 hidden sm:flex">
                        <Music className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`px-4 md:px-5 py-3 md:py-4 rounded-2xl max-w-[90%] md:max-w-[85%] ${
                        message.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-sm shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm prose prose-indigo prose-sm md:prose-base'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.text}</p>
                      ) : (
                        <div className="markdown-body overflow-hidden">
                          <ReactMarkdown>{message.text}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-1 hidden sm:flex">
                      <Music className="w-4 h-4 text-white" />
                    </div>
                    <div className="px-5 py-4 rounded-2xl rounded-tl-sm bg-white border border-slate-200 shadow-sm flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                      <span className="text-slate-500 font-medium text-sm">Harmonizing a response...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* Input Area */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-6 border-t md:border-none border-slate-200 z-10 pointer-events-none">
          <div className="max-w-4xl mx-auto p-4 md:px-6 md:pb-6 pointer-events-auto">
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 bg-white border border-slate-300 rounded-full p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-shadow"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about guitar, piano, music theory..."
                className="flex-1 bg-transparent border-none focus:outline-none px-4 py-2 text-slate-700 placeholder:text-slate-400 font-medium md:text-base text-sm"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 flex items-center justify-center transition-colors shrink-0"
              >
                <Send className="w-4 h-4 text-white ml-0.5" />
              </button>
            </form>
            <div className="text-center mt-2 hidden md:block">
               <p className="text-[11px] text-slate-400 font-medium">Melody Mentor can make mistakes. Consider verifying important musical concepts.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
