import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  Edit3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    profilePicture: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:5052/api/users/profile');
        setFormData({
          name: res.data.name || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          bio: res.data.bio || '',
          profilePicture: res.data.profilePicture || ''
        });
      } catch (error) {
        console.error("Error fetching profile", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('file', file);

    setUploading(true);
    try {
      const res = await api.post('/api/upload', data);
      setFormData({ ...formData, profilePicture: res.data.fileUrl });
      setMessage({ type: 'success', text: 'Photo uploaded! Don\'t forget to save changes.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

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
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Profile Header Card */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden">
        <div className="h-40 sbi-gradient relative">
           <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:20px_20px]"></div>
        </div>
        <div className="px-10 pb-10 relative">
          <div className="flex flex-col md:flex-row items-end gap-6 -mt-20 relative z-10">
            <div className="relative group">
              <div className="w-40 h-40 rounded-[2.5rem] bg-white p-2 shadow-2xl">
                {formData.profilePicture ? (
                  <img 
                    src={formData.profilePicture} 
                    alt="Profile" 
                    className="w-full h-full rounded-[2rem] object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-[2rem] bg-gray-100 flex items-center justify-center text-gray-300">
                    <UserIcon size={60} />
                  </div>
                )}
              </div>
              <label className="absolute bottom-2 right-2 p-3 bg-sbi-blue text-white rounded-2xl shadow-xl cursor-pointer hover:scale-110 active:scale-95 transition-all">
                <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
              </label>
            </div>
            
            <div className="flex-1 mb-4">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">{formData.name}</h1>
              <p className="text-sbi-blue font-black uppercase tracking-[0.2em] text-xs flex items-center gap-2 mt-1">
                <Briefcase size={14} />
                {user?.role}
              </p>
            </div>

            <div className="mb-4">
               <button 
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-8 py-4 text-white sbi-gradient rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                Save Changes
              </button>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              {message && (
                <div className={`p-6 rounded-2xl border-l-4 flex items-center gap-4 animate-slide-up ${
                  message.type === 'success' ? 'bg-green-50 border-l-green-500 text-green-700' : 'bg-red-50 border-l-red-500 text-red-700'
                }`}>
                  {message.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                  <p className="font-bold">{message.text}</p>
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Personal Bio (Instagram Style)</label>
                  <textarea 
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-3xl focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all font-medium text-gray-700 h-32 resize-none"
                    placeholder="Write a short summary about yourself..."
                    value={formData.bio}
                    maxLength={150}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  />
                  <p className="text-[10px] text-right text-gray-400 font-bold tracking-widest uppercase">
                    {formData.bio.length} / 150
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      <input 
                        type="email"
                        className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-sm"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      <input 
                        type="tel"
                        className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-sm"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
               <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Info</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-sbi-blue shadow-sm border border-gray-100">
                      <Hash size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Employee ID</p>
                      <p className="text-sm font-black text-gray-900">{user?.employeeId || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-sbi-blue shadow-sm border border-gray-100">
                      <Activity size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Status</p>
                      <span className="inline-flex items-center gap-1.5 text-green-500 text-[10px] font-black uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center space-y-4 bg-white hover:bg-gray-50/50 transition-colors cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-sbi-blue group-hover:scale-110 transition-transform">
                    <Edit3 size={24} />
                  </div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Customize your public presence on the sales team portal</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
