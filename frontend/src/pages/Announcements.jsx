import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Megaphone, 
  Search, 
  Trash2, 
  Plus, 
  X, 
  Loader2, 
  Clock, 
  User, 
  ShieldAlert,
  Bell,
  Send,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const Announcements = () => {
  const { user } = useAuth();
  const isAdminOrTL = user?.role === 'admin' || user?.role === 'team_leader';
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'Medium',
    expiresAt: ''
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/announcements');
      setAnnouncements(res.data);
    } catch (error) {
      console.error("Error fetching announcements", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data } = await api.post('/api/announcements', newAnnouncement);
      if (data) {
        setShowModal(false);
        setNewAnnouncement({ title: '', content: '', priority: 'Medium', expiresAt: '' });
        fetchAnnouncements();
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || "Internal server error. Please try again.";
      alert(`Broadcast Failed: ${errMsg}`);
      console.error("Post update error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await api.delete(`/api/announcements/${id}`);
      fetchAnnouncements();
    } catch (error) {
      alert("Failed to delete");
    }
  };

  const getPriorityStyle = (p) => {
    switch (p) {
      case 'High': return 'bg-red-500 text-white shadow-red-100';
      case 'Medium': return 'bg-blue-600 text-white shadow-blue-100';
      default: return 'bg-gray-100 text-gray-500 shadow-none';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 rounded-[1.8rem] bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
             <Bell size={32} />
           </div>
           <div>
             <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Board Broadcasts</h1>
             <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1 italic">Real-time organizational updates</p>
           </div>
        </div>
        {isAdminOrTL && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-3 px-8 py-4 text-white sbi-gradient rounded-[1.8rem] font-black uppercase tracking-widest text-xs hover:opacity-90 shadow-2xl shadow-blue-200 transition-all active:scale-95"
          >
            <Megaphone size={18} />
            Post Update
          </button>
        )}
      </div>

      {/* Feed */}
      <div className="space-y-8">
        {loading ? (
          <div className="py-32 text-center">
            <Loader2 className="animate-spin text-sbi-blue mx-auto mb-4" size={48} />
            <p className="text-gray-400 font-black tracking-[0.2em] uppercase text-xs">Syncing Broadcast Feed...</p>
          </div>
        ) : announcements.length > 0 ? announcements.map((ann) => (
          <div key={ann._id} className="bg-white rounded-[3rem] p-12 border border-blue-50 relative group overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
             {/* Priority Badge */}
             <div className="absolute top-0 right-12">
                <div className={`px-6 py-2 rounded-b-2xl text-[9px] font-black uppercase tracking-widest shadow-lg ${getPriorityStyle(ann.priority)}`}>
                  {ann.priority} Alert
                </div>
             </div>

             <div className="flex flex-col h-full">
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 overflow-hidden">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 leading-none">{ann.author?.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Platform Admin</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2 text-[10px] font-black text-gray-300 uppercase italic">
                    <Clock size={12} />
                    {format(new Date(ann.createdAt), 'MMM dd, hh:mm a')}
                  </div>
               </div>

               <h2 className="text-2xl font-black text-[#1E3A8A] mb-4 tracking-tight">{ann.title}</h2>
               <p className="text-gray-600 font-medium leading-relaxed whitespace-pre-wrap mb-10">
                 {ann.content}
               </p>

               <div className="flex items-center justify-between pt-8 border-t border-gray-50">
                  <div className="flex items-center gap-6">
                    {ann.expiresAt && (
                      <div className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                        <Calendar size={12} />
                        Active Until: {format(new Date(ann.expiresAt), 'MMM dd')}
                      </div>
                    )}
                  </div>
                  {isAdminOrTL && (
                    <button 
                      onClick={() => handleDelete(ann._id)}
                      className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
               </div>
             </div>
          </div>
        )) : (
          <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-gray-100">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Bell size={32} className="text-gray-200" />
              </div>
              <p className="text-gray-400 font-black tracking-[0.2em] uppercase text-xs">The broadcast board is currently clear</p>
          </div>
        )}
      </div>

      {/* Post Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[4rem] w-full max-w-xl shadow-2xl relative overflow-hidden animate-slide-up">
            <div className="sbi-gradient px-12 py-10 text-white shrink-0">
               <div className="flex items-center justify-between">
                 <div>
                   <h2 className="text-3xl font-black uppercase tracking-tighter">Draft Update</h2>
                   <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80 mt-1">Emergency & General Broadcast</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors">
                   <X size={32} />
                 </button>
               </div>
            </div>

            <form onSubmit={handleCreate} className="p-12 space-y-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Update Headline</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-8 py-5 bg-gray-50 border border-transparent rounded-[2rem] font-black text-gray-800 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-gray-300"
                    placeholder="e.g. Critical: System Maintenance at 9PM"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                  />
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Alert Level</label>
                    <select 
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.8rem] font-black text-xs uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none cursor-pointer"
                      value={newAnnouncement.priority}
                      onChange={(e) => setNewAnnouncement({...newAnnouncement, priority: e.target.value})}
                    >
                      <option value="Low">Low (Internal)</option>
                      <option value="Medium">Medium (General)</option>
                      <option value="High">High (Urgent)</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Expiry Date <span className="text-[8px] italic">(Optional)</span></label>
                    <input 
                      type="date" 
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.8rem] font-black text-xs outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                      value={newAnnouncement.expiresAt}
                      onChange={(e) => setNewAnnouncement({...newAnnouncement, expiresAt: e.target.value})}
                    />
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Message Body</label>
                  <textarea 
                    required 
                    className="w-full px-8 py-6 bg-gray-50 border border-transparent rounded-[2.5rem] font-medium text-sm text-gray-600 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all min-h-[160px]"
                    placeholder="Describe the update in detail clearly..."
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                  />
               </div>

               <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-6 px-10 text-white sbi-gradient rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-blue-400/20 hover:scale-[1.01] transition-all disabled:opacity-30 flex items-center justify-center gap-4"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : (
                    <>
                      <Send size={18} className="fill-white" />
                      DEPLOY ANNOUNCEMENT
                    </>
                  )}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
