import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit3, CheckCircle2, XCircle, IndianRupee, Layers, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const IncentiveSlabManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [slabs, setSlabs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSlab, setEditingSlab] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    minCards: 0,
    maxCards: 10,
    ratePerCard: 100,
    bonusAmount: 0,
    isActive: true,
    remarks: ''
  });

  useEffect(() => {
    fetchSlabs();
  }, []);

  const fetchSlabs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/slabs');
      setSlabs(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSlab) {
        await api.put(`/api/slabs/${editingSlab._id}`, formData);
      } else {
        await api.post('/api/slabs', formData);
      }
      setShowModal(false);
      setEditingSlab(null);
      setFormData({ name: '', minCards: 0, maxCards: 10, ratePerCard: 100, bonusAmount: 0, isActive: true, remarks: '' });
      fetchSlabs();
    } catch (e) { console.error(e); }
  };

  const deleteSlab = async (id) => {
    if (!window.confirm('Remove this slab?')) return;
    try {
      await axios.delete(`http://localhost:5052/api/slabs/${id}`);
      fetchSlabs();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#1E3A8A] flex items-center gap-3">
            <Layers className="text-blue-600" /> Incentive Slab Master
          </h2>
          <p className="text-gray-400 text-sm font-medium italic">Configure tiered reward structures for dispatched cards.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 sbi-gradient text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition-all outline-none text-xs uppercase tracking-widest"
          >
            <Plus size={18} /> New Slab Rule
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slabs.map((slab) => (
          <div key={slab._id} className={`bg-white rounded-[2rem] border-2 ${slab.isActive ? 'border-blue-50' : 'border-gray-100'} p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden`}>
            {slab.isActive && <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-2xl text-[8px] font-black uppercase tracking-widest">Active</div>}
            
            <div className="mb-6">
              <h3 className="text-lg font-black text-[#1E3A8A] mb-1">{slab.name}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{slab.minCards} - {slab.maxCards} Cards Range</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Rate / Card</p>
                <p className="text-xl font-black text-blue-600">₹{slab.ratePerCard}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Fixed Bonus</p>
                <p className="text-xl font-black text-emerald-600">₹{slab.bonusAmount}</p>
              </div>
            </div>

            <div className={`flex items-center ${isAdmin ? 'justify-between' : 'justify-end'} pt-6 border-t border-gray-50`}>
              {isAdmin && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingSlab(slab); setFormData(slab); setShowModal(true); }}
                    className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => deleteSlab(slab._id)}
                    className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              <span className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest ${slab.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {slab.isActive ? 'Active Status' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-12 relative shadow-2xl animate-scale-in">
            <button 
              onClick={() => { setShowModal(false); setEditingSlab(null); }}
              className="absolute top-8 right-8 p-3 bg-gray-50 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all"
            >
              <X size={20} />
            </button>

            <h3 className="text-3xl font-black text-[#1E3A8A] mb-2">{editingSlab ? 'Edit Slab Rule' : 'New Slab Rule'}</h3>
            <p className="text-gray-400 font-medium italic mb-10">Define your incentive parameters below.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Slab Name</label>
                <input 
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-3xl font-black text-[#1E3A8A]"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Bronze Tier, Top Achiever..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Min Cards</label>
                  <input 
                    type="number"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-3xl font-black text-[#1E3A8A]"
                    value={formData.minCards}
                    onChange={(e) => setFormData({...formData, minCards: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Max Cards</label>
                  <input 
                    type="number"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-3xl font-black text-[#1E3A8A]"
                    value={formData.maxCards}
                    onChange={(e) => setFormData({...formData, maxCards: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Rate per Card (₹)</label>
                  <input 
                    type="number"
                    className="w-full px-6 py-4 bg-blue-50 border border-blue-100 rounded-3xl font-black text-blue-600"
                    value={formData.ratePerCard}
                    onChange={(e) => setFormData({...formData, ratePerCard: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Fixed Bonus (₹)</label>
                  <input 
                    type="number"
                    className="w-full px-6 py-4 bg-emerald-50 border border-emerald-100 rounded-3xl font-black text-emerald-600"
                    value={formData.bonusAmount}
                    onChange={(e) => setFormData({...formData, bonusAmount: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-6">
                <button 
                  type="submit"
                  className="flex-1 py-5 sbi-gradient text-white rounded-[2rem] font-black shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.2em]"
                >
                  <Save size={18} className="inline mr-2" /> {editingSlab ? 'Update Rule' : 'Save Slab Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncentiveSlabManager;
