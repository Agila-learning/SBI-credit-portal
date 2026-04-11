import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Loader2, 
  RefreshCw, 
  MoreVertical,
  ShieldCheck,
  AlertTriangle,
  Zap,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

const IncentiveConfig = () => {
  const [slabs, setSlabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSlab, setEditingSlab] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    minCards: 0,
    maxCards: 9999,
    ratePerCard: 0,
    bonusAmount: 0,
    isActive: true,
    remarks: ''
  });

  const fetchSlabs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/slabs');
      setSlabs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlabs();
  }, []);

  const handleRecalculate = async () => {
    if (!window.confirm("Trigger bulk recalculation for all active employees for current month? This will update all 'Pending' records.")) return;
    try {
      setIsRefreshing(true);
      const month = format(new Date(), 'MM-yyyy');
      await api.post('/api/incentives/bulk', { month });
      alert("Bulk recalculation sequence initiated successfully.");
    } catch (e) {
      alert("Recalculation failed.");
    } finally {
      setIsRefreshing(false);
    }
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
      setFormData({ name: '', minCards: 0, maxCards: 9999, ratePerCard: 0, bonusAmount: 0, isActive: true, remarks: '' });
      fetchSlabs();
    } catch (e) {
      alert("Failed to save slab");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this incentive slab? This might affect future calculations.")) return;
    try {
      await api.delete(`/api/slabs/${id}`);
      fetchSlabs();
    } catch (e) {
      alert("Failed to delete slab");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 relative overflow-hidden">
        <Zap size={120} className="absolute -right-10 -bottom-5 text-gray-50 opacity-10" />
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 rounded-[1.8rem] bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
             <Settings size={32} />
           </div>
           <div>
             <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Reward Policy Config</h1>
             <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1 italic">Define incentive slabs and payout rules</p>
           </div>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <button 
            onClick={handleRecalculate}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-6 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            {isRefreshing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Bulk Recalculate
          </button>
          
          <button 
            onClick={() => { setEditingSlab(null); setShowModal(true); }}
            className="flex items-center gap-3 px-8 py-4 text-white sbi-gradient rounded-[1.8rem] font-black uppercase tracking-widest text-xs hover:opacity-90 shadow-2xl shadow-blue-200 transition-all active:scale-95"
          >
            <Plus size={18} />
            Create Slab
          </button>
        </div>
      </div>

      {/* Warning Area */}
      <div className="bg-amber-50 border-2 border-dashed border-amber-200 p-8 rounded-[2.5rem] flex items-start gap-4">
         <AlertTriangle size={24} className="text-amber-600 shrink-0" />
         <div>
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-1">Audit Control Warning</h4>
            <p className="text-xs text-amber-700 font-medium leading-relaxed max-w-3xl">
              Modifying slabs will not automatically retroactively update "Paid" or "Approved" incentives. It only affects "Pending" calculations and future snapshots. Ensure overlapping card ranges are avoided to prevent logical collisions.
            </p>
         </div>
      </div>

      {/* Slabs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-32 text-center">
            <Loader2 className="animate-spin text-indigo-400 mx-auto mb-4" size={48} />
            <p className="text-gray-400 font-black tracking-[0.2em] uppercase text-xs">Syncing Policy Data...</p>
          </div>
        ) : slabs.length > 0 ? slabs.map((slab) => (
          <div key={slab._id} className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm relative group hover:shadow-xl transition-all duration-300">
             <div className="flex items-center justify-between mb-8">
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${slab.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                   {slab.isActive ? 'Active Slot' : 'Disabled'}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={() => { setEditingSlab(slab); setFormData(slab); setShowModal(true); }}
                    className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                   >
                     <Edit3 size={16} />
                   </button>
                   <button 
                    onClick={() => handleDelete(slab._id)}
                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
             </div>

             <div className="mb-8">
                <h3 className="text-2xl font-black text-[#1E3A8A] tracking-tight">{slab.name}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Slab Protocol ID: {slab._id.slice(-6).toUpperCase()}</p>
             </div>

             <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-gray-50 rounded-2xl">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Card Range</p>
                   <p className="text-sm font-black text-gray-900">{slab.minCards} - {slab.maxCards}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Rate / Card</p>
                   <p className="text-sm font-black text-indigo-600">₹{slab.ratePerCard}</p>
                </div>
             </div>

             <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Success Bonus</p>
                  <p className="text-lg font-black text-green-600 tracking-tight">₹{slab.bonusAmount.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                   <ShieldCheck size={20} />
                </div>
             </div>
          </div>
        )) : (
          <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
             <DollarSign size={48} className="text-gray-200 mx-auto mb-4" />
             <p className="text-gray-400 font-black tracking-[0.2em] uppercase text-xs">No reward slabs configured yet</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[4rem] w-full max-w-xl shadow-2xl relative animate-slide-up flex flex-col max-h-[90vh] overflow-hidden">
             <div className="sbi-gradient px-12 py-10 text-white shrink-0">
               <div className="flex items-center justify-between">
                 <div>
                   <h2 className="text-3xl font-black uppercase tracking-tighter">{editingSlab ? 'Edit Protocol' : 'New Slab Protocol'}</h2>
                   <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80 mt-1">Configure Reward Multipliers</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors">
                   <X size={32} />
                 </button>
               </div>
             </div>

             <form onSubmit={handleSubmit} className="p-12 space-y-8 overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Slab Designation Name</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-8 py-5 bg-gray-50 border border-transparent rounded-[2rem] font-black text-gray-800 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-gray-300"
                    placeholder="e.g. Gold Tier Efficiency"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Min Dispatched Cards</label>
                    <input 
                      required 
                      type="number" 
                      className="w-full px-8 py-5 bg-gray-50 border border-transparent rounded-[1.5rem] font-black text-gray-800 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                      value={formData.minCards}
                      onChange={(e) => setFormData({...formData, minCards: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Max Dispatched Cards</label>
                    <input 
                      required 
                      type="number" 
                      className="w-full px-8 py-5 bg-gray-50 border border-transparent rounded-[1.5rem] font-black text-gray-800 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                      value={formData.maxCards}
                      onChange={(e) => setFormData({...formData, maxCards: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Rate Per Card (₹)</label>
                    <input 
                      required 
                      type="number" 
                      className="w-full px-8 py-5 bg-gray-50 border border-transparent rounded-[1.5rem] font-black text-[#1E3A8A] outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                      value={formData.ratePerCard}
                      onChange={(e) => setFormData({...formData, ratePerCard: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">One-time Bonus (₹)</label>
                    <input 
                      required 
                      type="number" 
                      className="w-full px-8 py-5 bg-gray-50 border border-transparent rounded-[1.5rem] font-black text-green-600 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                      value={formData.bonusAmount}
                      onChange={(e) => setFormData({...formData, bonusAmount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-[2rem]">
                   <div>
                     <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Active Status</p>
                     <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Toggle live deployment of this slab</p>
                   </div>
                   <button 
                     type="button"
                     onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                     className={`w-14 h-8 rounded-full transition-all relative ${formData.isActive ? 'bg-green-500 shadow-inner' : 'bg-gray-200'}`}
                   >
                     <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all ${formData.isActive ? 'left-7' : 'left-1'}`} />
                   </button>
                </div>

                <button 
                  type="submit"
                  className="w-full py-6 text-white sbi-gradient rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-blue-400/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-4"
                >
                   <ShieldCheck size={20} />
                   {editingSlab ? 'Update Slab Protocol' : 'Authorize New Slab'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncentiveConfig;
