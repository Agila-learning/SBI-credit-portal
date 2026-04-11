import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Coins, 
  TrendingUp, 
  Target, 
  CreditCard, 
  Clock, 
  Info,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { format, startOfMonth, lastDayOfMonth } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const Incentives = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slabs, setSlabs] = useState([]);
  const [month, setMonth] = useState(format(new Date(), 'MM-yyyy'));

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incentiveRes, slabRes] = await Promise.all([
        api.get(`/api/incentives?month=${month}`),
        api.get('/api/slabs')
      ]);
      
      // Since it returns an array, find the one for the current month or use latest
      const myIncentive = incentiveRes.data.find(i => i.month === month) || null;
      setData(myIncentive);
      setSlabs(slabRes.data);
    } catch (error) {
      console.error("Error fetching incentive data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month]);

  const currentMonthLabel = format(new Date(), 'MMMM yyyy');

  return (
    <div className="space-y-8 animate-fade-in pb-20 max-w-7xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
             <Coins className="text-amber-500" size={32} />
             Incentive Dashboard
          </h1>
          <p className="text-gray-500 font-medium italic">Track your earnings and performance benchmarks for {currentMonthLabel}</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
           <Calendar size={18} className="text-gray-400 ml-2" />
           <select 
             className="bg-transparent border-none outline-none font-black text-xs uppercase tracking-widest text-[#1E3A8A] cursor-pointer pr-4"
             value={month}
             onChange={(e) => setMonth(e.target.value)}
           >
             <option value={format(new Date(), 'MM-yyyy')}>Current Month</option>
             <option value={format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MM-yyyy')}>Previous Month</option>
           </select>
        </div>
      </div>

      {loading ? (
        <div className="py-32 text-center">
          <Loader2 className="animate-spin text-sbi-blue mx-auto mb-4" size={48} />
          <p className="text-gray-400 font-black tracking-[0.2em] uppercase text-xs">Syncing Rewards Ledger...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Stats Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Earnings Card */}
            <div className="sbi-gradient p-10 rounded-[3rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
               <Coins size={200} className="absolute -right-20 -bottom-20 opacity-10 rotate-12" />
               <div className="relative z-10">
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Estimated Monthly Payout</p>
                 <h2 className="text-6xl font-black tracking-tighter mb-8">
                   ₹{data?.incentiveAmount?.toLocaleString() || '0.00'}
                 </h2>
                 
                 <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/20">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Status</p>
                      <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                        {data?.status || 'Calculating'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Dispatched</p>
                      <p className="text-xl font-black">{data?.dispatchedCards || 0}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Current Rate</p>
                      <p className="text-xl font-black">₹{data?.rateApplied || 0}/Card</p>
                    </div>
                 </div>
               </div>
            </div>

            {/* Performance Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <CreditCard size={24} />
                    </div>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Workflow</span>
                  </div>
                  <h4 className="text-3xl font-black text-gray-900 mb-1">{data?.dispatchedCards || 0}</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Dispatched</p>
               </div>
               
               <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                      <Target size={24} />
                    </div>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Pipeline</span>
                  </div>
                  <h4 className="text-3xl font-black text-gray-900 mb-1">{data?.selectedApps || 0}</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selections Achieved</p>
               </div>
            </div>

            {/* Calculations Transparency */}
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-[#1E3A8A] flex items-center gap-2">
                    <FileText size={20} />
                    Payout Calculation
                  </h3>
                  <Info size={16} className="text-gray-300" />
               </div>
               
               <div className="space-y-6">
                  <div className="flex items-center justify-between py-4 border-b border-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 text-sm font-black italic">B</div>
                      <div>
                        <p className="text-sm font-black text-gray-900">Base Earnings</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{data?.dispatchedCards || 0} Cards × ₹{data?.rateApplied || 0}</p>
                      </div>
                    </div>
                    <p className="font-black text-gray-900 leading-none">₹{( (data?.dispatchedCards || 0) * (data?.rateApplied || 0) ).toLocaleString()}</p>
                  </div>

                  <div className="flex items-center justify-between py-4 border-b border-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 text-sm font-black italic">S</div>
                      <div>
                        <p className="text-sm font-black text-gray-900">Slab Bonus</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{data?.slabUsed?.name || 'No Bonus'}</p>
                      </div>
                    </div>
                    <p className="font-black text-green-600 leading-none">+ ₹{data?.bonusApplied?.toLocaleString() || '0'}</p>
                  </div>

                  {data?.adjustments?.amount !== 0 && (
                    <div className="flex items-center justify-between py-4 border-b border-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 text-sm font-black italic">A</div>
                        <div>
                          <p className="text-sm font-black text-gray-900">Manual Adjustments</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{data?.adjustments?.remarks || 'Adjustment'}</p>
                        </div>
                      </div>
                      <p className={`font-black leading-none ${data?.adjustments?.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {data?.adjustments?.amount > 0 ? '+' : ''} ₹{data?.adjustments?.amount?.toLocaleString()}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-6">
                    <p className="text-lg font-black text-[#1E3A8A] uppercase tracking-tighter">Total Payable</p>
                    <p className="text-3xl font-black text-[#1E3A8A]">₹{data?.incentiveAmount?.toLocaleString() || '0.00'}</p>
                  </div>
               </div>
            </div>
          </div>

          {/* Right Slabs Column */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden">
               <TrendingUp size={80} className="absolute -right-4 top-10 text-gray-50 opacity-10" />
               <div className="relative z-10 mb-8">
                 <h3 className="text-lg font-black text-gray-900 leading-tight">Reward Benchmarks</h3>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Unlock higher rates based on your monthly output</p>
               </div>

               <div className="space-y-4">
                  {slabs.map((slab) => {
                    const isActive = data?.slabUsed?._id === slab._id;
                    const nextSlab = !data?.slabUsed && slab.minCards > (data?.dispatchedCards || 0);
                    
                    return (
                      <div key={slab._id} className={`p-6 rounded-[2.5rem] border transition-all ${
                        isActive ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 
                        'bg-gray-50 border-gray-100 text-gray-500 grayscale-[0.3]'
                      }`}>
                         <div className="flex items-center justify-between mb-3">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                              {slab.name}
                            </p>
                            {isActive && <div className="p-1 px-2 rounded-full bg-white/20 text-[8px] font-black uppercase tracking-widest">Current</div>}
                         </div>
                         <div className="flex items-end justify-between">
                            <div>
                               <h4 className={`text-2xl font-black leading-none ${isActive ? 'text-white' : 'text-gray-800'}`}>₹{slab.ratePerCard}</h4>
                               <p className="text-[9px] font-bold opacity-60 uppercase mt-1">Per Card Rate</p>
                            </div>
                            <div className="text-right">
                               <p className={`text-xs font-black italic ${isActive ? 'text-white' : 'text-[#1E3A8A]'}`}>{slab.minCards} - {slab.maxCards} Cards</p>
                            </div>
                         </div>
                         {slab.bonusAmount > 0 && (
                            <div className={`mt-4 pt-4 border-t ${isActive ? 'border-white/20' : 'border-gray-200'} flex items-center justify-between`}>
                               <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Success Bonus</span>
                               <span className="text-xs font-black">+₹{slab.bonusAmount.toLocaleString()}</span>
                            </div>
                         )}
                      </div>
                    );
                  })}
               </div>

               <div className="mt-8 p-6 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-600 shrink-0" />
                  <p className="text-[10px] text-amber-700 font-bold leading-relaxed tracking-tight">
                    Incentives are calculated based on verified "Dispatched" cards only. Projections may vary until the cycle end-audit.
                  </p>
               </div>
            </div>

            {/* Support/Faq links */}
            <div className="bg-[#1E3A8A] p-8 rounded-[3rem] text-white flex items-center justify-between group cursor-pointer hover:bg-blue-700 transition-all">
               <div>
                 <p className="text-[9px] font-black uppercase tracking-widest text-blue-300">Issue with payout?</p>
                 <h4 className="text-lg font-black leading-tight">Contact Audit Cell</h4>
               </div>
               <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                  <ChevronRight size={18} />
               </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Incentives;
