import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Camera, 
  Save, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Hash,
  Briefcase,
  Activity,
  Edit3,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/api/users/profile');
        setFormData({
          name: res.data.name || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          bio: res.data.bio || ''
        });
      } catch (error) {
        console.error("Error fetching profile", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await api.put('/api/users/profile', formData);
      // Update local storage/context if needed
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-sbi-blue" size={40} />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Premium Profile Header */}
      <div className="relative bg-white rounded-[3.5rem] border border-gray-100 shadow-2xl overflow-hidden p-10 md:p-16">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-12">
          <div className="flex-1 space-y-8 w-full">
            <div className="text-center md:text-left">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-[#1E3A8A] rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                <Briefcase size={12} /> {user?.role || 'Professional'} Account
              </span>
              <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-tight">{formData.name}</h1>
              <p className="text-gray-400 font-medium text-lg mt-2 italic">“Making digital finance accessible for everyone”</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Professional Bio</label>
                  <textarea 
                    className="w-full px-8 py-6 bg-gray-50 border border-gray-100 rounded-[2rem] focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all font-medium text-gray-700 h-40 resize-none shadow-inner"
                    placeholder="Tell your team about yourself..."
                    value={formData.bio}
                    maxLength={150}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Communication</label>
                  <div className="space-y-4">
                    <div className="relative group">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                      <input 
                        type="email"
                        className="w-full pl-16 pr-8 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-sm"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="relative group">
                      <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                      <input 
                        type="tel"
                        className="w-full pl-16 pr-8 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-sm"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-8 bg-[#1E3A8A] rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
                  <Activity size={100} className="absolute -right-5 -bottom-5 opacity-10 group-hover:scale-110 transition-transform" />
                  <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">Emplyee Identity</p>
                  <h4 className="text-2xl font-black">{user?.employeeId || 'N/A'}</h4>
                  <p className="text-[10px] font-bold text-blue-300 uppercase mt-4 tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    Verified Member · {user?.role}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <UserIcon size={24} />
                </div>
                <div>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Account Status</p>
                   <p className="text-sm font-black text-gray-900">Premium Professional</p>
                </div>
              </div>
              <button 
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-3 px-12 py-5 text-white sbi-gradient rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:opacity-95 shadow-2xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                Update Profile
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {message && (
        <div className={`p-8 rounded-[2.5rem] border-l-8 flex items-center justify-between gap-6 animate-slide-up bg-white shadow-xl ${
          message.type === 'success' ? 'border-l-green-500 text-green-700' : 'border-l-red-500 text-red-700'
        }`}>
          <div className="flex items-center gap-4">
            {message.type === 'success' ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">System Notification</p>
              <p className="text-lg font-black">{message.text}</p>
            </div>
          </div>
          <button onClick={() => setMessage(null)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
             <X size={20} className="text-gray-400" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
