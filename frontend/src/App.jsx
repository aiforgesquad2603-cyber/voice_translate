import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Plus, 
  Users, 
  Settings, 
  BarChart3, 
  Mic, 
  MicOff, 
  LogOut, 
  Globe, 
  ChevronDown, 
  Video, 
  MoreVertical,
  Volume2,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioProcessor } from './AudioProcessor';

const BACKEND_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5001' 
  : 'https://voice-translate-ldun.onrender.com';

const socket = io(BACKEND_URL);

function App() {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [language, setLanguage] = useState('ta');
  const [isJoined, setIsJoined] = useState(false);
  const [users, setUsers] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState([]);
  const [socketStatus, setSocketStatus] = useState('Disconnected');
  
  const audioProcessorRef = useRef(null);

  useEffect(() => {
    socket.on('connect', () => setSocketStatus('Active'));
    socket.on('disconnect', () => setSocketStatus('Disconnected'));

    socket.on('room_update', (roomUsers) => {
      setUsers(roomUsers);
    });

    socket.on('joined', (data) => {
      setIsJoined(true);
    });

    socket.on('receive_audio', (data) => {
      if (data.audio) {
        const blob = new Blob([data.audio], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      }
      setLogs(prev => [{
        id: Date.now(),
        from: data.from,
        text: data.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }, ...prev]);
    });

    return () => {
      socket.off('room_update');
      socket.off('joined');
      socket.off('receive_audio');
    };
  }, []);

  const generateRoomId = () => {
    const id = Math.floor(100 + Math.random() * 899) + '-' + 
               Math.floor(100 + Math.random() * 899) + '-' + 
               Math.floor(1000 + Math.random() * 8999);
    return id;
  };

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    if (userName) {
      socket.emit('join_room', { room_id: newRoomId, user_name: userName, language });
    } else {
      alert("Please enter your name first.");
    }
  };

  const handleJoin = () => {
    const cleanId = roomId.trim();
    if (cleanId && userName) {
      socket.emit('join_room', { room_id: cleanId, user_name: userName, language });
    } else {
      alert("Please enter the room code and your name.");
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      audioProcessorRef.current.stop();
      setIsRecording(false);
    } else {
      if (!audioProcessorRef.current) {
        audioProcessorRef.current = new AudioProcessor(async (blob) => {
          const formData = new FormData();
          formData.append('file', blob, 'audio.wav');
          formData.append('room_id', roomId);
          formData.append('language', language);
          formData.append('sid', socket.id);

          try {
            await fetch(`${BACKEND_URL}/process-audio`, {
              method: 'POST',
              body: formData
            });
          } catch (err) {
            console.error("Error sending audio:", err);
          }
        });
      }
      await audioProcessorRef.current.start();
      setIsRecording(true);
    }
  };

  const languages = [
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  ];

  const handleLeave = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-blue-600 tracking-tight">LinguistFlow</h1>
          <nav className="hidden md:flex items-center gap-6">
            <span className="nav-link font-semibold text-blue-600">Rooms</span>
            <span className="nav-link">Translate</span>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-tighter">
              Socket Status: {socketStatus}
            </span>
          </div>
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
            <Settings size={20} />
          </button>
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
            <BarChart3 size={20} />
          </button>
          <button className="btn-primary py-2 px-6 h-10">Connect</button>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-6 lg:p-10 flex flex-col lg:flex-row gap-8 overflow-hidden">
        {/* Left Sidebar */}
        <div className={`w-full lg:w-80 space-y-6 ${isJoined ? 'hidden lg:block' : ''}`}>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6"
          >
            <h2 className="text-2xl font-bold mb-2">Start a Conversation.</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Real-time encryption enabled for all voice streams via MediaRecorder API.
            </p>
            
            <div className="space-y-4">
              {!isJoined && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter your name"
                    className="input-field mb-4"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
              )}

              <button 
                onClick={handleCreateRoom}
                className="btn-primary w-full py-4 text-base"
              >
                <Plus size={20} /> Create Room
              </button>

              <div className="relative mt-6">
                <input 
                  type="text" 
                  placeholder="Enter 10-digit code"
                  className="input-field pr-16"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                />
                <button 
                  onClick={handleJoin}
                  className="absolute right-2 top-2 bottom-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          </motion.div>

          {isJoined && (
            <div className="text-center p-4">
              <span className="text-slate-400 text-xs">LinguistFlow Editorial</span>
              <div className="flex justify-center gap-4 mt-2">
                <span className="text-slate-400 text-[10px] hover:text-blue-600 cursor-pointer">Privacy Policy</span>
                <span className="text-slate-400 text-[10px] hover:text-blue-600 cursor-pointer">Terms of Service</span>
              </div>
              <p className="text-slate-400 text-[10px] mt-4">© 2026 LinguistFlow. Real-time encryption active.</p>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {isJoined ? (
            <>
              {/* Session Header */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 py-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Current Session</span>
                    <h2 className="text-3xl font-bold tracking-tight">#{roomId}</h2>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs font-semibold text-slate-500">Connected</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Users size={14} />
                        <span className="text-xs font-semibold">{Object.keys(users).length} Participants</span>
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-blue-50 text-blue-600 font-bold text-xs rounded-full flex items-center gap-2 border border-blue-100 self-start">
                    <Globe size={14} /> JOINED ROOM
                  </button>
                </div>

                {/* Speaker Card */}
                <div className="mt-8 p-6 bg-slate-50/50 rounded-3xl border border-slate-100 relative group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                        <Users size={20} />
                      </div>
                      <div>
                        <span className="text-sm font-bold block">You are speaking...</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{languages.find(l => l.code === language)?.name} (Input)</span>
                      </div>
                    </div>
                    <div className="flex items-end h-6 pb-1">
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div 
                          key={i} 
                          className="visualizer-bar" 
                          style={{ animationPlayState: isRecording ? 'running' : 'paused', opacity: isRecording ? 1 : 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 min-h-[80px] border border-slate-100 shadow-sm transition-all duration-300">
                    <p className="text-slate-400 italic text-sm">
                      {isRecording ? "Listening for audio input..." : "Tap the record button to start speaking..."}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Translation Logs Area */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-24">
                <AnimatePresence>
                  {logs.map((log) => (
                    <motion.div 
                      key={log.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card p-6 relative overflow-hidden group"
                    >
                      <div className="flex items-center justify-between mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Speaker: {log.from}</span>
                        <span>{log.time}</span>
                      </div>
                      <div className="space-y-4">
                        <p className="text-xl font-semibold leading-relaxed">வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?</p>
                        <hr className="border-slate-100" />
                        <p className="text-blue-600 font-bold text-lg leading-relaxed">{log.text}</p>
                      </div>
                      <div className="absolute right-6 top-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Just now • YOU ({language.toUpperCase()})</span>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isRecording && (
                     <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-blue-600/5 border border-blue-200 rounded-[24px] p-6 flex items-center justify-between gap-4"
                    >
                      <p className="text-blue-600 font-bold text-sm">Processing your request...</p>
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {logs.length === 0 && !isRecording && (
                   <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                        <Volume2 size={32} />
                      </div>
                      <h3 className="font-bold text-slate-500">No translations yet</h3>
                      <p className="text-sm text-slate-400 max-w-[200px]">Start speaking to see real-time translations appear here.</p>
                   </div>
                )}
              </div>

              {/* Centered Floating Controls */}
              <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
                 <div className="glass-card p-3 flex gap-2 items-center">
                    <button className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-colors">
                      <Video size={20} />
                    </button>
                    <button 
                      onClick={toggleRecording}
                      className={`px-8 py-3 rounded-2xl flex items-center gap-3 font-bold text-sm transition-all shadow-lg ${
                        isRecording 
                        ? 'bg-red-500 text-white pulse-recording' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                      {isRecording ? "Recording..." : "Start Recording"}
                    </button>
                    <button className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-colors border-l border-slate-100 pl-4 ml-1">
                      <MoreVertical size={20} />
                    </button>
                 </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
               <div className="text-center max-w-sm">
                  <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Globe size={40} />
                  </div>
                  <h2 className="text-3xl font-bold mb-3">Welcome to LinguistFlow</h2>
                  <p className="text-slate-500 leading-relaxed mb-8 text-sm">
                    Select your language and join a room to start your real-time translation session.
                  </p>
               </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Call Settings */}
        <div className={`w-full lg:w-72 space-y-6 ${!isJoined ? 'hidden lg:block lg:opacity-30 pointer-events-none' : ''}`}>
          <div className="glass-card p-6">
            <h3 className="font-bold text-lg mb-6">Call Settings</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Translation Language</label>
                <div className="relative group">
                  <select 
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl appearance-none font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} ({lang.native})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={handleLeave}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg active:scale-95"
                >
                  <LogOut size={18} /> Leave Room
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                 <div className="flex items-center gap-2">
                    <Mic size={16} className="text-blue-600" />
                    <span className="text-xs font-bold text-slate-600">Auto-Record</span>
                 </div>
                 <div className="w-10 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                 </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 bg-slate-900 text-white border-none shadow-blue-900/10">
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} className="text-blue-400" />
              <h4 className="font-bold text-sm">Quick Tip</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Hold the spacebar to manually trigger recording if auto-detect is off.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
