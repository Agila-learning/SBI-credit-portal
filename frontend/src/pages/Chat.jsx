import React, { useState, useEffect, useRef, useCallback } from 'react';
import api, { API_URL } from '../utils/api';
import { io } from 'socket.io-client';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import {
  Send, Paperclip, Mic, MoreVertical, Search, Circle,
  Loader2, Play, Square, Download, Phone, X, Megaphone,
  Clock, CheckCheck, Check, RefreshCw, LinkIcon,
  PhoneCall, CheckCircle, Truck, Bell, Tag, UserCircle,
  Wifi, WifiOff, ChevronDown, Smile, AlertTriangle, Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── helpers ─────────────────────────────────────────────────────────────────
const dateLabel = (date) => {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd MMM yyyy');
};

const msgTimeLabel = (date) => format(new Date(date), 'HH:mm');

const lastMsgPreview = (lastMessage) => {
  if (!lastMessage) return 'No messages yet';
  const p = (lastMessage.content || '').slice(0, 36);
  if (lastMessage.messageType === 'announcement') return '📢 ' + p;
  if (lastMessage.messageType === 'reminder') return '⏰ ' + p;
  if (lastMessage.messageType === 'lead-ref') return '📋 Lead: ' + (lastMessage.leadRef?.customerName || p);
  if (lastMessage.messageType === 'voice') return '🎤 Voice message';
  if (lastMessage.messageType === 'image') return '📷 Image';
  if (lastMessage.messageType === 'file') return '📎 File';
  return p || '—';
};

const msgTypeBadge = (type) => {
  switch (type) {
    case 'announcement': return { label: 'Broadcast', cls: 'bg-purple-100 text-purple-700 border-purple-200' };
    case 'reminder': return { label: 'Reminder', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'lead-ref': return { label: 'Lead Ref', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
    default: return null;
  }
};

// ─── sub-components ──────────────────────────────────────────────────────────

const StatusDot = ({ isOnline }) => (
  <span className={`w-3 h-3 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5 shadow-sm ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
);

const Avatar = ({ user, size = 10, showStatus, isOnline }) => (
  <div className={`relative shrink-0 w-${size} h-${size}`}>
    <div className={`w-full h-full rounded-2xl overflow-hidden bg-blue-100 flex items-center justify-center font-black text-blue-700 text-sm`}>
      {user?.profilePicture
        ? <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
        : <span>{user?.name?.[0]?.toUpperCase() || '?'}</span>}
    </div>
    {showStatus && <StatusDot isOnline={isOnline} />}
  </div>
);

const QUICK_MESSAGES = [
  { label: 'Update Calls', content: '⏰ Please update your call count for today.', type: 'reminder' },
  { label: 'Submit Report', content: '⏰ Kindly submit your end-of-day report before 7 PM.', type: 'reminder' },
  { label: 'Good Job!', content: '🎉 Outstanding performance today! Keep it up.', type: 'text' },
  { label: 'Team Meeting', content: '📢 Team meeting at 4 PM today. Please be available.', type: 'announcement' },
];

// ─── main component ──────────────────────────────────────────────────────────
const Chat = () => {
  const { user } = useAuth();
  const isAdminOrTL = user?.role === 'admin' || user?.role === 'team_leader';
  const isAdmin = user?.role === 'admin';

  const [contacts, setContacts]         = useState([]);
  const [selected, setSelected]         = useState(null);
  const [messages, setMessages]         = useState([]);
  const [newMsg, setNewMsg]             = useState('');
  const [contactsLoading, setContactsLoading] = useState(true);
  const [msgsLoading, setMsgsLoading]   = useState(false);
  const [sending, setSending]           = useState(false);
  const [onlineUsers, setOnlineUsers]   = useState(new Set());
  const [typingFrom, setTypingFrom]     = useState(null);
  const [searchQ, setSearchQ]           = useState('');
  const [msgType, setMsgType]           = useState('text');
  const [isRecording, setIsRecording]   = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastType, setBroadcastType] = useState('announcement');
  const [showQuick, setShowQuick]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);

  const socketRef    = useRef(null);
  const scrollRef    = useRef(null);
  const typingTimer  = useRef(null);
  const mediaRecRef  = useRef(null);
  const audioBlobRef = useRef(null);
  const inputRef     = useRef(null);

  // ── socket setup ──
  useEffect(() => {
    if (!user?._id) return;
    const s = io(API_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = s;
    s.emit('join', user._id);

    s.on('userStatus', ({ userId, status }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        status === 'online' ? next.add(userId) : next.delete(userId);
        return next;
      });
      setContacts(prev => prev.map(c => c._id === userId ? { ...c, _online: status === 'online' } : c));
    });

    s.on('receiveMessage', (msg) => {
      // Prevent duplicate messages if added by doSend locally
      setMessages(m => {
        if (m.some(existing => existing._id === msg._id)) return m;
        return [...m, msg];
      });

      setContacts(prev => prev.map(c => {
        if (c._id === (msg.sender?._id || msg.sender)) {
          return { ...c, lastMessage: msg, unreadCount: (c.unreadCount || 0) + 1 };
        }
        return c;
      }));

      setSelected(prev => {
        if (prev && (prev._id === (msg.sender?._id || msg.sender) || prev._id === (msg.recipient?._id || msg.recipient))) {
          // messages update is handled above
        }
        return prev;
      });
    });

    s.on('typing', ({ senderName }) => {
      setTypingFrom(senderName);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingFrom(null), 2500);
    });

    s.on('stopTyping', () => setTypingFrom(null));

    s.on('messageRead', () => {
      setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
    });

    s.on('messageDeleted', ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m));
    });

    return () => {
      s.off('userStatus');
      s.off('receiveMessage');
      s.off('typing');
      s.off('stopTyping');
      s.off('messageRead');
      s.disconnect();
      clearTimeout(typingTimer.current);
    };
  }, [user?._id]);

  // ── fetch contacts ──
  const loadContacts = useCallback(async () => {
    try {
      setContactsLoading(true);
      const res = await api.get('/api/chat/contacts');
      setContacts(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // ── select contact → load messages ──
  useEffect(() => {
    if (!selected) return;
    const load = async () => {
      setMsgsLoading(true);
      try {
        const res = await api.get(`/api/chat/${selected._id}`);
        setMessages(res.data);
        // Mark as read
        await api.put(`/api/chat/read/${selected._id}`);
        socketRef.current?.emit('messageRead', { senderId: selected._id, conversationUserId: user._id });
        // Reset unread in contacts
        setContacts(prev => prev.map(c => c._id === selected._id ? { ...c, unreadCount: 0 } : c));
      } catch (e) {
        console.error(e);
      } finally {
        setMsgsLoading(false);
      }
    };
    load();
  }, [selected?._id]);

  // ── auto-scroll ──
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingFrom]);

  // ── typing emit ──
  const handleInputChange = (e) => {
    setNewMsg(e.target.value);
    if (!selected) return;
    socketRef.current?.emit('typing', { recipientId: selected._id, senderName: user.name });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('stopTyping', { recipientId: selected._id });
    }, 1500);
  };

  // ── send message ──
  const doSend = async (content = newMsg, type = msgType, fileUrl = null, leadRef = null) => {
    if (!content.trim() && !fileUrl) return;
    if (!selected && type !== 'announcement') return;

    setSending(true);
    try {
      const payload = {
        recipient: selected?._id,
        content: content.trim(),
        messageType: type,
        fileUrl,
        leadRef,
      };
      const res = await api.post('/api/chat', payload);
      const saved = res.data;

      setMessages(prev => {
        if (prev.some(m => m._id === saved._id)) return prev;
        return [...prev, saved];
      });
      setNewMsg('');
      setMsgType('text');

      // relay via socket
      socketRef.current?.emit('sendMessage', {
        ...saved,
        recipientId: selected._id,
      });

      // Update contact last message
      setContacts(prev => prev.map(c => c._id === selected._id ? { ...c, lastMessage: saved } : c));
      socketRef.current?.emit('stopTyping', { recipientId: selected._id });
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.delete(`/api/chat/${msgId}`);
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m));
      // relay via socket
      socketRef.current?.emit('deleteMessage', { messageId: msgId, recipientId: selected._id });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    doSend();
  };

  // ── broadcast ──
  const handleBroadcast = async () => {
    if (!broadcastText.trim()) return;
    setSending(true);
    try {
      await api.post('/api/chat', {
        content: broadcastText.trim(),
        messageType: broadcastType,
        isBroadcast: true,
      });
      socketRef.current?.emit('broadcastMessage', {
        content: broadcastText.trim(),
        messageType: broadcastType,
        senderId: user._id,
        sender: { name: user.name, role: user.role },
        createdAt: new Date(),
        isBroadcast: true,
      });
      setBroadcastText('');
      setShowBroadcast(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  // ── file upload ──
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setUploadProgress(true);
    try {
      const res = await api.post('/api/upload', fd);
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      await doSend(file.name, type, res.data.fileUrl);
    } catch (e) { console.error(e); }
    finally { setUploadProgress(false); }
  };

  // ── voice recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('file', new File([blob], `voice-${Date.now()}.webm`));
        const res = await api.post('/api/upload', fd);
        await doSend('Voice message', 'voice', res.data.fileUrl);
      };
      mr.start();
      mediaRecRef.current = mr;
      setIsRecording(true);
    } catch (e) { console.error('Mic permission denied', e); }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    setIsRecording(false);
  };

  // ── message grouping by date ──
  const groupedMessages = messages.reduce((groups, msg) => {
    const label = dateLabel(msg.createdAt);
    (groups[label] = groups[label] || []).push(msg);
    return groups;
  }, {});

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    (c.employeeId || '').toLowerCase().includes(searchQ.toLowerCase())
  );

  const totalUnread = contacts.reduce((n, c) => n + (c.unreadCount || 0), 0);

  return (
    <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] rounded-3xl shadow-2xl border border-gray-100 overflow-hidden bg-white mx-auto max-w-[1600px]" style={{ minHeight: 450 }}>

      {/* ═══════════════════ LEFT — CONTACTS ═══════════════════ */}
      <aside className="w-80 flex flex-col border-r border-gray-100 bg-[#F8FAFC] shrink-0">
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-gray-900 leading-none">Messages</h2>
              {totalUnread > 0 && (
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{totalUnread} unread</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadContacts} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Refresh">
                <RefreshCw size={15} />
              </button>
              {isAdminOrTL && (
                <button
                  onClick={() => setShowBroadcast(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                >
                  <Megaphone size={13} />
                  Broadcast
                </button>
              )}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              placeholder="Search employees..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-blue-200 transition-all"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {contactsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-400" size={28} /></div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-12 text-center text-gray-300 text-xs font-bold uppercase tracking-widest">No contacts found</div>
          ) : filteredContacts.map(contact => {
            const isSelected = selected?._id === contact._id;
            const isOnline = onlineUsers.has(contact._id) || contact._online;
            return (
              <button
                key={contact._id}
                onClick={() => setSelected(contact)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all text-left group ${
                  isSelected
                    ? 'bg-white shadow-md border border-blue-100'
                    : 'hover:bg-white hover:shadow-sm'
                }`}
              >
                <Avatar user={contact} size={11} showStatus isOnline={isOnline} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className={`text-sm truncate ${isSelected ? 'font-black text-[#1E3A8A]' : 'font-bold text-gray-800'}`}>
                      {contact.name}
                    </span>
                    {contact.lastMessage && (
                      <span className="text-[9px] text-gray-400 font-bold shrink-0">
                        {msgTimeLabel(contact.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[11px] text-gray-400 truncate font-medium max-w-[140px]">
                      {lastMsgPreview(contact.lastMessage)}
                    </p>
                    {contact.unreadCount > 0 && (
                      <span className="ml-1 shrink-0 min-w-[18px] h-[18px] bg-blue-600 text-white rounded-full text-[9px] font-black flex items-center justify-center px-1">
                        {contact.unreadCount > 9 ? '9+' : contact.unreadCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${isOnline ? 'text-green-500' : 'text-gray-300'}`}>
                    {isOnline ? '● Online' : '○ Away'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ═══════════════════ MIDDLE — CHAT WINDOW ═══════════════════ */}
      <main className="flex-1 flex flex-col bg-white min-w-0">
        {selected ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shadow-sm z-10">
              <div className="flex items-center gap-4">
                <Avatar user={selected} size={11} showStatus isOnline={onlineUsers.has(selected._id)} />
                <div>
                  <h3 className="font-black text-gray-900 leading-none text-base">{selected.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {onlineUsers.has(selected._id) ? (
                      <span className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
                        <Wifi size={10} /> Active Now
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                        <WifiOff size={10} />
                        {selected.lastSeen ? `Last seen ${formatDistanceToNow(new Date(selected.lastSeen), { addSuffix: true })}` : 'Offline'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdminOrTL && (
                  <button
                    onClick={() => { setBroadcastText(''); setShowBroadcast(true); }}
                    className="flex items-center gap-1 px-3 py-2 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 transition-all"
                  >
                    <Megaphone size={13} />
                    Broadcast
                  </button>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowQuick(!showQuick)}
                    className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="Quick messages"
                  >
                    <Zap size={17} />
                  </button>
                  {showQuick && (
                    <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 w-64 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quick Messages</p>
                      </div>
                      {QUICK_MESSAGES.map((qm, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setNewMsg(qm.content);
                            setMsgType(qm.type);
                            setShowQuick(false);
                            inputRef.current?.focus();
                          }}
                          className="w-full px-4 py-3 text-left text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2 border-b border-gray-50 last:border-0"
                        >
                          <Bell size={12} className="shrink-0 text-blue-400" />
                          {qm.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F8FAFC]" style={{ backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)', backgroundSize: '24px 24px', backgroundRepeat: 'repeat' }}>
              {msgsLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-400" size={36} /></div>
              ) : (
                Object.entries(groupedMessages).map(([label, msgs]) => (
                  <div key={label}>
                    {/* Date separator */}
                    <div className="flex items-center gap-3 my-6">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">{label}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {msgs.map((msg, i) => {
                      const isMine = (msg.sender?._id || msg.sender) === user._id;
                      const badge = msgTypeBadge(msg.messageType);
                      return (
                        <div key={msg._id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3 group`}>
                          {!isMine && (
                            <div className="mr-2 mt-auto">
                              <Avatar user={msg.sender || selected} size={8} />
                            </div>
                          )}
                          <div className={`max-w-[68%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                            {/* Message type badge */}
                            {badge && (
                              <span className={`text-[9px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-full mb-1 ${badge.cls}`}>
                                {badge.label}
                              </span>
                            )}

                            <div className={`relative px-4 py-3 rounded-2xl shadow-sm text-sm font-medium ${
                              msg.isBroadcast
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-tl-none'
                                : isMine
                                  ? 'bg-[#1E3A8A] text-white rounded-br-none'
                                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                            }`}>

                              {/* Lead Ref card */}
                              {msg.messageType === 'lead-ref' && msg.leadRef && (
                                <div className="mb-2 p-3 bg-white/20 rounded-xl border border-white/30 backdrop-blur-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <LinkIcon size={12} />
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Lead Reference</span>
                                  </div>
                                  <p className="text-xs font-black">{msg.leadRef.customerName}</p>
                                  {msg.leadRef.mobileNumber && <p className="text-[10px] opacity-70">{msg.leadRef.mobileNumber} · {msg.leadRef.status}</p>}
                                </div>
                              )}

                              {/* Content */}
                              {(msg.messageType === 'text' || msg.messageType === 'announcement' || msg.messageType === 'reminder' || msg.messageType === 'lead-ref') && (
                                <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                              )}

                              {/* Image */}
                              {msg.messageType === 'image' && (
                                <img src={msg.fileUrl} className="max-w-full rounded-xl shadow-md" alt="attachment" />
                              )}

                              {/* Voice */}
                              {msg.messageType === 'voice' && (
                                <div className="flex items-center gap-3 min-w-[140px]">
                                  <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all">
                                    <Play size={16} fill="currentColor" />
                                  </a>
                                  <div className="flex-1 h-1.5 bg-white/30 rounded-full">
                                    <div className="h-full w-1/3 bg-white/70 rounded-full" />
                                  </div>
                                  <span className="text-[10px] font-black opacity-70">VOICE</span>
                                </div>
                              )}

                              {/* File */}
                              {msg.messageType === 'file' && (
                                <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 bg-white/10 rounded-xl border border-white/20 hover:bg-white/20 transition-all">
                                  <Download size={16} />
                                  <span className="text-xs font-black truncate max-w-[150px]">{msg.content || 'Download File'}</span>
                                </a>
                              )}
                            </div>

                            {/* Timestamp + read receipt + delete */}
                            <div className={`flex items-center gap-1.5 mt-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                              <span className="text-[9px] text-gray-400 font-bold">{msgTimeLabel(msg.createdAt)}</span>
                              {isMine && (
                                msg.isRead
                                  ? <CheckCheck size={12} className="text-blue-500" />
                                  : <Check size={12} className="text-gray-400" />
                              )}
                              {isMine && !msg.isDeleted && (
                                <button 
                                  onClick={() => handleDeleteMessage(msg._id)}
                                  className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}

              {/* Typing indicator */}
              {typingFrom && (
                <div className="flex items-center gap-2 ml-10">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold italic">{typingFrom} is typing...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Message type selector */}
            {isAdminOrTL && (
              <div className="px-6 pt-3 bg-white flex items-center gap-2">
                {[
                  { value: 'text', label: 'Message', icon: '💬' },
                  { value: 'reminder', label: 'Reminder', icon: '⏰' },
                  { value: 'announcement', label: 'Alert', icon: '📢' },
                ].map(t => (
                  <button
                    key={t.value}
                    onClick={() => setMsgType(t.value)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      msgType === t.value ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    <span>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="px-6 pb-6 pt-3 bg-white border-t border-gray-100">
              <form onSubmit={handleSend} className="flex items-end gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl cursor-pointer transition-all" title="Attach file">
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                    {uploadProgress ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
                  </label>
                  <button
                    type="button"
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`p-3 rounded-xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                    title="Hold to record voice"
                  >
                    {isRecording ? <Square size={20} /> : <Mic size={20} />}
                  </button>
                </div>

                <div className={`flex-1 flex items-end bg-gray-50 border rounded-2xl transition-all focus-within:bg-white focus-within:border-blue-200 focus-within:ring-4 focus-within:ring-blue-50 ${
                  msgType === 'reminder' ? 'border-amber-200 bg-amber-50 focus-within:bg-amber-50' :
                  msgType === 'announcement' ? 'border-purple-200 bg-purple-50 focus-within:bg-purple-50' :
                  'border-gray-200'
                }`}>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    placeholder={
                      isRecording ? 'Recording… release to send' :
                      msgType === 'reminder' ? '⏰ Type a reminder...' :
                      msgType === 'announcement' ? '📢 Type announcement...' :
                      `Message ${selected.name}…`
                    }
                    className="flex-1 bg-transparent border-none outline-none py-3.5 px-4 text-sm font-medium text-gray-700 placeholder:text-gray-400 resize-none max-h-32 overflow-y-auto"
                    value={newMsg}
                    onChange={handleInputChange}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
                    }}
                    disabled={isRecording}
                    style={{ lineHeight: '1.5' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={(!newMsg.trim()) || sending}
                  className="p-4 bg-[#1E3A8A] text-white rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                >
                  {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                </button>
              </form>
              <p className="text-[9px] text-gray-300 mt-2 font-bold uppercase tracking-widest text-center">Enter to send · Shift+Enter for new line · Hold mic for voice</p>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-16 bg-[#F8FAFC]">
            <div className="w-24 h-24 rounded-[2rem] bg-blue-50 flex items-center justify-center text-blue-200 mb-6 shadow-inner">
              <MessageSquareIcon size={48} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-3">CRM Messaging Center</h3>
            <p className="text-gray-400 font-medium max-w-xs mx-auto leading-relaxed mb-2">
              Select a team member to start a conversation.
            </p>
            <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">
              All chats are securely logged for audit purposes
            </p>
            <div className="grid grid-cols-3 gap-3 mt-10">
              {[
                { icon: '💬', label: 'Real-time Chat' },
                { icon: '🎤', label: 'Voice Messages' },
                { icon: '📋', label: 'Lead References' },
                { icon: '📢', label: 'Broadcast' },
                { icon: '⏰', label: 'Reminders' },
                { icon: '🔒', label: 'Audit Logged' },
              ].map((f, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all text-center">
                  <span className="text-2xl">{f.icon}</span>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{f.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ═══════════════════ RIGHT — EMPLOYEE INFO ═══════════════════ */}
      {selected && (
        <aside className="w-72 border-l border-gray-100 flex flex-col bg-[#F8FAFC] shrink-0 overflow-y-auto">
          {/* Profile */}
          <div className="p-6 bg-white border-b border-gray-100 text-center">
            <div className="relative inline-block mb-3">
              <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden bg-blue-100 flex items-center justify-center font-black text-2xl text-blue-700 mx-auto shadow-lg">
                {selected.profilePicture
                  ? <img src={selected.profilePicture} className="w-full h-full object-cover" alt="" />
                  : selected.name?.[0]?.toUpperCase()}
              </div>
              <StatusDot isOnline={onlineUsers.has(selected._id)} />
            </div>
            <h4 className="font-black text-gray-900 text-base">{selected.name}</h4>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-0.5">{selected.employeeId || selected.role}</p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              {onlineUsers.has(selected._id) ? (
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
                  <Circle size={7} fill="currentColor" /> Online
                </span>
              ) : (
                <span className="text-[10px] font-bold text-gray-400">
                  {selected.lastSeen ? `Away · ${formatDistanceToNow(new Date(selected.lastSeen), { addSuffix: true })}` : 'Offline'}
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {isAdminOrTL && (
            <div className="p-4 border-b border-gray-100 bg-white">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
              <div className="space-y-2">
                {QUICK_MESSAGES.map((qm, i) => (
                  <button
                    key={i}
                    onClick={() => { setNewMsg(qm.content); setMsgType(qm.type); inputRef.current?.focus(); }}
                    className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-100 hover:border-blue-200 rounded-xl text-xs font-bold text-gray-600 transition-all flex items-center gap-2"
                  >
                    <Bell size={12} className="shrink-0 text-blue-400" />
                    {qm.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat metadata */}
          <div className="p-4 flex-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Conversation Info</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-xs text-gray-500 font-bold">Total Messages</span>
                <span className="text-sm font-black text-gray-900">{messages.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-xs text-gray-500 font-bold">Role</span>
                <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-widest ${selected.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {selected.role}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-gray-500 font-bold">Status</span>
                <span className={`text-[10px] font-black ${selected.status === 'active' ? 'text-green-600' : 'text-gray-400'} uppercase`}>
                  {selected.status || 'Active'}
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                  All messages in this portal are audit-logged and stored securely for compliance purposes.
                </p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ═══════════════════ BROADCAST MODAL ═══════════════════ */}
      {showBroadcast && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-white font-black text-lg flex items-center gap-2">
                  <Megaphone size={20} /> Broadcast Message
                </h3>
                <p className="text-purple-200 text-xs mt-1 font-bold">Sends to all employees instantly</p>
              </div>
              <button onClick={() => setShowBroadcast(false)} className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Message Type</label>
                <div className="flex gap-2">
                  {[
                    { value: 'announcement', label: '📢 Announcement' },
                    { value: 'reminder', label: '⏰ Reminder' },
                    { value: 'text', label: '💬 General' },
                  ].map(t => (
                    <button
                      key={t.value}
                      onClick={() => setBroadcastType(t.value)}
                      className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black border transition-all ${
                        broadcastType === t.value ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Message</label>
                <textarea
                  rows={4}
                  placeholder="Type your broadcast message..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 outline-none transition-all resize-none"
                  value={broadcastText}
                  onChange={e => setBroadcastText(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowBroadcast(false)} className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleBroadcast}
                  disabled={!broadcastText.trim() || sending}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-200 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Megaphone size={18} />}
                  Send to All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Inline icon for empty state (avoids import conflict)
const MessageSquareIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

// Missing import alias
const Zap = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export default Chat;
