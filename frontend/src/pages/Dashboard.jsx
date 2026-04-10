import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  PhoneCall, CheckCircle, Truck, BarChart3, Trophy, Users, AlertCircle, 
  Loader2, Star, Target, Zap, Award, Activity, IndianRupee, Plus, 
  Download, RefreshCw, Layers, CheckCircle2, Clock, Ban, ChevronRight, FileText, Calendar, Megaphone
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie
} from 'recharts';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import KPICard from '../components/KPICard';
import IncentiveSlabManager from '../components/IncentiveSlabManager';

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xl px-5 py-3">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">{payload[0].name}</p>
        <p className="text-2xl font-black" style={{ color: payload[0].payload.color }}>{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const MedalBadge = ({ rank }) => {
  if (rank === 0) return (
    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-200">
      <Trophy size={18} className="text-white" fill="white" />
    </div>
  );
  if (rank === 1) return (
    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-300 to-slate-400 flex items-center justify-center shadow-md">
      <Award size={18} className="text-white" fill="white" />
    </div>
  );
  if (rank === 2) return (
    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-700 flex items-center justify-center shadow-md shadow-orange-200">
      <Star size={18} className="text-white" fill="white" />
    </div>
  );
  return (
    <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 font-black text-sm">
      {rank + 1}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [incentives, setIncentives] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, incentives
  const [incSubTab, setIncSubTab] = useState('payouts'); // payouts, slabs
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [month, setMonth] = useState(format(new Date(), 'MM-yyyy'));
  const [calculatedIncentive, setCalculatedIncentive] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [adjustment, setAdjustment] = useState({ amount: 0, remarks: '' });
  const [tasks, setTasks] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, lbRes, incRes, taskRes] = await Promise.all([
        api.get('/api/stats/dashboard'),
        api.get('/api/stats/leaderboard?period=daily'),
        api.get('/api/incentives'),
        api.get('/api/tasks')
      ]);
      setStats(statsRes.data);
      setLeaderboard(lbRes.data);
      setIncentives(incRes.data);
      setTasks(taskRes.data);
    } catch (error) {
      console.error("Dashboard error", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleAutoCalculate = async (empId) => {
    if (!empId) return;
    setIsCalculating(true);
    try {
      const res = await api.post('/api/incentives/calculate', { 
        employeeId: empId, 
        month 
      });
      setCalculatedIncentive(res.data);
      setAdjustment({ amount: res.data.adjustments?.amount || 0, remarks: res.data.adjustments?.remarks || '' });
    } catch (e) {
      console.error(e);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleFinalizePayout = async (statusOverride = null) => {
    try {
      await api.put(`/api/incentives/${calculatedIncentive._id}`, {
        status: statusOverride || 'Approved',
        adjustments: adjustment,
        incentiveAmount: calculatedIncentive.incentiveAmount + Number(adjustment.amount)
      });
      fetchDashboardData();
      setCalculatedIncentive(null);
      setSelectedEmpId('');
    } catch (e) { console.error(e); }
  };

  const handleBulkGenerate = async () => {
    if (!window.confirm(`Generate incentives for all employees for ${month}?`)) return;
    try {
      await api.post('/api/incentives/bulk', { month });
      alert('Bulk generation initiated!');
      fetchDashboardData();
    } catch (e) { console.error(e); }
  };

  const downloadReport = async () => {
    try {
      const response = await api.get(`/api/incentives/export?month=${month}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Incentives_${month}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("Download failed", e);
      alert("Failed to download report. Ensure you are logged in as admin.");
    }
  };

  const numDisplay = (val, type = 'num') => {
    if (val === undefined || val === null || isNaN(val)) {
       return type === 'curr' ? '₹0' : type === 'perc' ? '0%' : '0';
    }
    if (type === 'curr') return `₹${Number(val).toLocaleString()}`;
    if (type === 'perc') return `${val}%`;
    return val;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  const todayTotal = (stats?.today?.called || 0);
  const convRate = numDisplay(stats?.today?.conversionRate, 'perc');
  const dispRate = numDisplay(stats?.today?.dispatchRate, 'perc');

  const pieData = [
    { name: 'Selected', value: stats?.today?.selected || 0, color: '#10B981' },
    { name: 'Rejected', value: stats?.today?.rejected || 0, color: '#EF4444' },
    { name: 'Dispatched', value: stats?.today?.dispatched || 0, color: '#F97316' },
  ].filter(d => d.value > 0);
  
  // If no activity, show a placeholder
  if (pieData.length === 0) {
    pieData.push({ name: 'No Activity', value: 1, color: '#F1F5F9' });
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16 min-h-screen" style={{ background: '#F8FAFC' }}>
      
      {/* ── TOP NAV ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-[2rem] border border-gray-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activeTab === 'overview' ? 'sbi-gradient text-white shadow-lg' : 'text-gray-400 hover:text-[#1E3A8A]'}`}
          >
            Performance Overview
          </button>
          <button 
            onClick={() => setActiveTab('incentives')}
            className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activeTab === 'incentives' ? 'sbi-gradient text-white shadow-lg' : 'text-gray-400 hover:text-[#1E3A8A]'}`}
          >
            {user?.role === 'admin' ? 'Incentive Command Center' : 'My Incentives & Payouts'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
              Last Sync<br/>
              <span className="text-gray-900">{format(new Date(), 'hh:mm a')}</span>
            </p>
          </div>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* ── DAILY OPERATIONS SUMMARY ── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-32 h-32 bg-blue-50/30 rounded-full -translate-x-10 -translate-y-10 border border-blue-50" />
               <div className="shrink-0 text-center md:text-left relative z-10">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Operations Pulse</p>
                 <h2 className="text-3xl font-black text-[#1E3A8A] tracking-tighter">Daily Summary</h2>
                 <p className="text-xs font-bold text-gray-400 mt-1 italic">Stats updated in real-time</p>
               </div>
               <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10 w-full">
                  <div className="text-center md:text-left">
                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-tight">Total Production</p>
                    <p className="text-2xl font-black text-[#1E3A8A]">₹{((stats?.today?.dispatched || 0) * 150).toLocaleString()}</p>
                    <span className="text-[7px] font-black text-gray-300 uppercase">Est. Value</span>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-[8px] font-black text-green-400 uppercase tracking-widest leading-tight">High Performers</p>
                    <p className="text-2xl font-black text-green-600">{leaderboard.filter(l => l.totalDispatched > 0).length}</p>
                    <span className="text-[7px] font-black text-gray-300 uppercase">Active Dispatchers</span>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest leading-tight">Pending Dispatch</p>
                    <p className="text-2xl font-black text-orange-600">{(stats?.today?.selected || 0) - (stats?.today?.dispatched || 0)}</p>
                    <span className="text-[7px] font-black text-gray-300 uppercase">In Pipeline</span>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-[8px] font-black text-red-400 uppercase tracking-widest leading-tight">Drop-off Rate</p>
                    <p className="text-2xl font-black text-red-600">{todayTotal > 0 ? Math.round((stats?.today?.rejected / todayTotal) * 100) : 0}%</p>
                    <span className="text-[7px] font-black text-gray-300 uppercase">Avg. Rejection</span>
                  </div>
               </div>
            </div>
            <div className="bg-[#1E3A8A] rounded-[3rem] p-10 text-white shadow-xl relative overflow-hidden flex flex-col justify-center items-center text-center">
               <Trophy size={80} className="absolute opacity-10 -right-2 -bottom-2" />
               <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-2">Today's Dispatch Star</p>
               <h4 className="text-xl font-black truncate w-full">{leaderboard[0]?.employeeName || 'Scanning...'}</h4>
               <p className="text-[9px] font-bold text-blue-200 uppercase mt-1 tracking-widest">
                 {leaderboard[0] ? `RANK 1 · ${leaderboard[0].totalDispatched} CARDS` : 'Awaiting Data'}
               </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard title="Total Calls Today" value={numDisplay(stats?.today?.called)} icon={PhoneCall} color="blue" subtitle="Volume" />
            <KPICard title="Total Selected Today" value={stats?.today?.selected || 0} icon={CheckCircle} color="green" subtitle="Success" />
            <KPICard title="Total Rejected Today" value={stats?.today?.rejected || 0} icon={Ban} color="red" subtitle="Closed" />
            <KPICard title="Total Dispatched Today" value={stats?.today?.dispatched || 0} icon={Truck} color="orange" subtitle="Delivery" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Conversion Rate</p>
                <p className="text-2xl font-black text-blue-600">{convRate}</p>
                <div className="w-full h-1 bg-gray-100 mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: convRate }} />
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dispatch Rate</p>
                <p className="text-2xl font-black text-orange-600">{dispRate}</p>
                <div className="w-full h-1 bg-gray-100 mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: dispRate }} />
                </div>
            </div>
            {user?.role === 'employee' && (
              <div className="bg-[#1E3A8A] p-6 rounded-2xl text-white shadow-lg lg:col-span-1 flex items-center justify-between overflow-hidden relative">
                  <Award size={60} className="absolute -right-5 -bottom-5 opacity-10" />
                  <div>
                    <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">My Cumulative Monthly Payout</p>
                    <p className="text-3xl font-black">{numDisplay(stats?.incentives?.monthlyTotal, 'curr')}</p>
                  </div>
              </div>
            )}
            <div className={`bg-[#1E3A8A] p-6 rounded-2xl text-white shadow-lg ${user?.role === 'employee' ? 'lg:col-span-1' : 'lg:col-span-2'} flex items-center justify-between overflow-hidden relative`}>
                <Zap size={60} className="absolute -right-5 -bottom-5 opacity-10" />
                <div>
                   <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">{user?.role === 'admin' ? 'Estimated Today Payout' : 'My Today Estimate'}</p>
                   <p className="text-3xl font-black">{numDisplay(stats?.incentives?.todayEstimate, 'curr')}</p>
                </div>
                <button onClick={() => setIncSubTab('payouts')} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  View Full
                </button>
            </div>
          </div>

          {/* ── QUICK ACTIONS & PENDING CENTRE ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                <h3 className="text-lg font-black text-[#1E3A8A] mb-6 flex items-center gap-3">
                  <Zap size={20} className="text-amber-500" /> Admin Command Panel
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <button onClick={() => window.location.hash = '#/tasks'} className="flex flex-col items-center justify-center p-6 bg-blue-50/50 hover:bg-blue-600 hover:text-white rounded-3xl group transition-all duration-300">
                      <Target size={24} className="text-blue-600 group-hover:text-white mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Assign Task</span>
                   </button>
                   <button onClick={() => window.location.hash = '#/announcements'} className="flex flex-col items-center justify-center p-6 bg-purple-50/50 hover:bg-purple-600 hover:text-white rounded-3xl group transition-all duration-300">
                      <Megaphone size={24} className="text-purple-600 group-hover:text-white mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Broadcast</span>
                   </button>
                   <button onClick={() => setIncSubTab('payouts')} className="flex flex-col items-center justify-center p-6 bg-emerald-50/50 hover:bg-emerald-600 hover:text-white rounded-3xl group transition-all duration-300">
                      <IndianRupee size={24} className="text-emerald-600 group-hover:text-white mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Generate Pay</span>
                   </button>
                   <button onClick={() => setActiveTab('incentives')} className="flex flex-col items-center justify-center p-6 bg-amber-50/50 hover:bg-amber-600 hover:text-white rounded-3xl group transition-all duration-300">
                      <Activity size={24} className="text-amber-600 group-hover:text-white mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Analytics</span>
                   </button>
                </div>
             </div>

             <div className="lg:col-span-2 bg-[#F8FAFC] rounded-[2.5rem] border border-dashed border-gray-200 p-8">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-lg font-black text-[#1E3A8A] flex items-center gap-3">
                     <Clock size={20} className="text-orange-500" /> Operational Action Items
                   </h3>
                   <span className="text-[10px] font-bold text-gray-400 uppercase italic">Priority View</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Selected Leads</p>
                        <h4 className="text-2xl font-black text-gray-900">{numDisplay(stats?.pending?.dispatches)}</h4>
                        <p className="text-[9px] font-bold text-gray-400 uppercase italic mt-1">Awaiting Dispatch</p>
                      </div>
                      <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                         <Truck size={24} />
                      </div>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Follow-ups</p>
                        <h4 className="text-2xl font-black text-gray-900">{numDisplay(stats?.pending?.followups)}</h4>
                        <p className="text-[9px] font-bold text-gray-400 uppercase italic mt-1">Pending Interaction</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                         <PhoneCall size={24} />
                      </div>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Tasks Due Today</p>
                        <h4 className="text-2xl font-black text-amber-600">{numDisplay(stats?.pending?.tasksDueToday)}</h4>
                        <p className="text-[9px] font-bold text-gray-400 uppercase italic mt-1">Immediate Deadlines</p>
                      </div>
                      <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                         <Calendar size={24} />
                      </div>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Overdue Missions</p>
                        <h4 className="text-2xl font-black text-red-600">{numDisplay(stats?.pending?.tasksOverdue)}</h4>
                        <p className="text-[9px] font-bold text-gray-400 uppercase italic mt-1">Requires Attention</p>
                      </div>
                      <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                         <AlertCircle size={24} />
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-black text-[#1E3A8A] flex items-center gap-3">
                  <Activity size={24} className="text-blue-600" /> Operational Trend (7 Days)
                </h3>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-[#3B82F6]">● Calls</span>
                  <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-[#10B981]">● Selected</span>
                  <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-[#F97316]">● Dispatched</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={stats?.trend || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }} />
                  <Tooltip 
                    cursor={{ fill: '#F8FAFC' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{label}</p>
                            {payload.map((p, i) => (
                              <div key={i} className="flex items-center justify-between gap-8 mb-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">{p.name}</span>
                                <span className="text-sm font-black" style={{ color: p.color }}>{p.value}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="calls" name="Calls" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="selected" name="Selected" fill="#10B981" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="dispatched" name="Dispatched" fill="#F97316" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm">
              <h3 className="text-xl font-black text-[#1E3A8A] flex items-center gap-3 mb-10">
                <Trophy size={24} className="text-amber-500" /> Daily Top 3
              </h3>
              <div className="space-y-5">
                {leaderboard.slice(0, 3).map((item, index) => (
                  <div key={item._id} className="flex items-center gap-5 p-5 rounded-[2rem] bg-gray-50/50 border border-gray-100 group">
                    <MedalBadge rank={index} />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[#1E3A8A] text-sm truncate">{item.employeeName}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.employeeId}</p>
                    </div>
                    <div className="flex gap-2">
                       <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm text-center">
                          <p className="text-[9px] font-black text-green-600 leading-none">{item.totalShortlisted}</p>
                          <p className="text-[6px] font-black text-gray-300 uppercase mt-1">Sel</p>
                       </div>
                       <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm text-center">
                          <p className="text-[9px] font-black text-orange-600 leading-none">{item.totalDispatched}</p>
                          <p className="text-[6px] font-black text-gray-300 uppercase mt-1">Disp</p>
                       </div>
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && (
                  <p className="text-center text-gray-400 font-bold uppercase tracking-widest text-[10px] py-10 italic">No activity recorded yet today</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm">
              <h3 className="text-xl font-black text-[#1E3A8A] flex items-center gap-3 mb-10">
                <Trophy size={24} className="text-emerald-500" /> High Earners (Incentives)
              </h3>
              <div className="space-y-5">
                {incentives.sort((a,b) => b.incentiveAmount - a.incentiveAmount).slice(0, 5).map((inc, index) => (
                  <div key={inc._id} className="flex items-center gap-5 p-5 rounded-[2rem] bg-gray-50/50 border border-gray-100 group">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-xs">{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[#1E3A8A] text-sm truncate">{inc.employee?.name}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{inc.month}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-600">₹{inc.incentiveAmount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm">
              <h3 className="text-xl font-black text-[#1E3A8A] flex items-center gap-3 mb-10">
                <Truck size={24} className="text-blue-600" /> Top Dispatches
              </h3>
              <div className="space-y-5">
                {leaderboard.sort((a,b) => b.totalDispatched - a.totalDispatched).slice(0, 5).map((item, index) => (
                  <div key={item._id} className="flex items-center gap-5 p-5 rounded-[2rem] bg-gray-50/50 border border-gray-100 group">
                    <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] flex items-center justify-center text-white font-black text-xs text-[10px]">{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[#1E3A8A] text-sm truncate">{item.employeeName}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.employeeId}</p>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-blue-600 leading-none">{item.totalDispatched}</p>
                      <p className="text-[7px] font-black text-gray-400 uppercase mt-1">Cards</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── TASK PROGRESS WIDGET [NEW] ── */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm relative overflow-hidden group">
             <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-50/20 rounded-full blur-3xl group-hover:bg-blue-100/30 transition-all duration-700" />
             <div className="flex flex-col md:flex-row items-center justify-between gap-8">
               <div className="flex items-center gap-6">
                 <div className="w-16 h-16 rounded-[1.8rem] bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                    <Target size={32} />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-[#1E3A8A] tracking-tight">Mission Control: Tasks</h3>
                   <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                     <Clock size={12} /> Execution in progress
                   </p>
                 </div>
               </div>

               <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-4xl">
                 <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 text-center">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Active</p>
                    <p className="text-2xl font-black text-blue-600">{tasks.filter(t => t.status !== 'Completed').length}</p>
                 </div>
                 <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 text-center">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Completed</p>
                    <p className="text-2xl font-black text-green-600">{tasks.filter(t => t.status === 'Completed').length}</p>
                 </div>
                 <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 text-center">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Completion</p>
                    <p className="text-2xl font-black text-amber-600">
                      {tasks.length > 0 ? Math.round(tasks.reduce((acc, t) => acc + (t.completionPercentage || 0), 0) / tasks.length) : 0}%
                    </p>
                 </div>
                 <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 flex items-center justify-center">
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-blue-600 transition-all duration-1000" 
                         style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100 : 0}%` }}
                       />
                    </div>
                 </div>
               </div>

               <button 
                 onClick={() => window.location.hash = '#/tasks'}
                 className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
               >
                 <ChevronRight size={20} />
               </button>
             </div>
          </div>
        </>
      ) : (
        /* ── INCENTIVE COMMAND CENTER ── */
        <div className="space-y-8 animate-slide-up">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {(user?.role === 'admin' ? [
              { id: 'payouts', label: 'Payout Engine', icon: Zap },
              { id: 'slabs', label: 'Slab Configuration', icon: Layers },
              { id: 'history', label: 'Incentive History', icon: FileText }
            ] : [
              { id: 'payouts', label: 'My Earnings', icon: Zap },
              { id: 'slabs', label: 'Slab Benchmarks', icon: Layers }
            ]).map(t => (
              <button 
                key={t.id} 
                onClick={() => setIncSubTab(t.id)}
                className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${incSubTab === t.id ? 'bg-[#1E3A8A] text-white shadow-xl shadow-blue-100' : 'bg-white text-gray-400 border border-gray-100 hover:border-blue-200'}`}
              >
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>

          {incSubTab === 'payouts' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 space-y-8">
                <div className="bg-white rounded-[3rem] p-12 border border-blue-50 relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 p-10 opacity-5"><IndianRupee size={160} /></div>
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
                    <div>
                      <h3 className="text-3xl font-black text-[#1E3A8A] mb-2">Automated Payout Engine</h3>
                      <p className="text-gray-400 font-medium italic">Calculate and approve performance payouts in real-time.</p>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={handleBulkGenerate} className="p-4 bg-gray-50 text-gray-600 rounded-2xl hover:bg-[#1E3A8A] hover:text-white transition-all shadow-sm"><RefreshCw size={20} /></button>
                      <button onClick={downloadReport} className="p-4 bg-gray-50 text-gray-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Download size={20} /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 relative z-10">
                    {user?.role === 'admin' ? (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-3">Select Employee</label>
                        <select 
                          className="w-full px-8 py-5 bg-gray-50 border border-transparent rounded-[2rem] font-black text-[#1E3A8A] focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all appearance-none"
                          onChange={(e) => { setSelectedEmpId(e.target.value); handleAutoCalculate(e.target.value); }}
                          value={selectedEmpId}
                        >
                          <option value="">Search employee...</option>
                          {stats?.teamStats?.map(emp => (
                            <option key={emp._id} value={emp._id}>{emp.name.toUpperCase()} ({emp.employeeId})</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-3">My Performance Identity</label>
                        <div className="w-full px-8 py-5 bg-blue-50/30 border border-blue-100 text-[#1E3A8A] rounded-[2rem] font-black flex items-center gap-3">
                          <Users size={18} /> {user?.name.toUpperCase()} ({user?.employeeId})
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-3">Payroll Cycle</label>
                      <div className="w-full px-8 py-5 bg-blue-50/50 border border-blue-100 text-[#1E3A8A] rounded-[2rem] font-black flex items-center gap-3">
                        <Calendar size={18} /> {format(new Date(), 'MMMM yyyy')}
                      </div>
                    </div>
                  </div>

                  {isCalculating && <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40} /></div>}

                  {calculatedIncentive && (
                    <div className="animate-fade-in space-y-10 relative z-10">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 text-center group hover:bg-white hover:shadow-xl transition-all">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Slab Match</p>
                          <p className="text-xl font-black text-[#1E3A8A]">{calculatedIncentive.slabUsed?.name || 'No Slab'}</p>
                          <p className="text-xs font-bold text-gray-300 mt-1">{calculatedIncentive.dispatchedCards} Dispatches</p>
                        </div>
                        <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 text-center group hover:bg-white hover:shadow-xl transition-all">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Base Rate</p>
                          <p className="text-xl font-black text-blue-600">₹{calculatedIncentive.rateApplied} / Card</p>
                          <p className="text-xs font-bold text-gray-300 mt-1">₹{calculatedIncentive.bonusApplied} Bonus</p>
                        </div>
                        <div className="bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] p-8 rounded-[2.5rem] text-center text-white shadow-xl shadow-blue-100">
                          <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-2">Computed Total</p>
                          <p className="text-3xl font-black">₹{(calculatedIncentive.incentiveAmount + Number(adjustment.amount)).toLocaleString()}</p>
                        </div>
                      </div>

                      {user?.role === 'admin' && (
                        <div className="bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100 space-y-8">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Manual Adjustments</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-gray-400 uppercase px-1">Extra Bonus/Penalty</label>
                              <input 
                                type="number" 
                                className="w-full px-6 py-3 bg-white border border-gray-200 rounded-2xl font-black text-[#1E3A8A]"
                                value={adjustment.amount}
                                onChange={(e) => setAdjustment({...adjustment, amount: e.target.value})}
                                placeholder="+/- Amount"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                              <label className="text-[9px] font-black text-gray-400 uppercase px-1">Adjustment Reason</label>
                              <input 
                                type="text" 
                                className="w-full px-6 py-3 bg-white border border-gray-200 rounded-2xl font-medium"
                                value={adjustment.remarks}
                                onChange={(e) => setAdjustment({...adjustment, remarks: e.target.value})}
                                placeholder="e.g. Special milestone bonus..."
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {user?.role === 'admin' && (
                        <div className="flex gap-4">
                          <button onClick={() => handleFinalizePayout('Approved')} className="flex-1 py-5 sbi-gradient text-white rounded-[2rem] font-black shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest">
                            Approve Performance Payout
                          </button>
                          <button onClick={() => setCalculatedIncentive(null)} className="px-10 py-5 bg-white border border-gray-200 text-gray-400 rounded-[2rem] font-black hover:text-red-500 transition-all text-xs uppercase tracking-widest">
                            Reset
                          </button>
                        </div>
                      )}
                      
                      {user?.role === 'employee' && (
                        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 flex items-center gap-6">
                           <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white">
                             <CheckCircle size={24} />
                           </div>
                           <div>
                             <p className="text-sm font-black text-[#1E3A8A]">Payout Status: {calculatedIncentive.status || 'Pending'}</p>
                             <p className="text-xs font-bold text-gray-500 mt-1">This estimate is updated in real-time as you complete dispatches.</p>
                           </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-black text-[#1E3A8A] flex items-center gap-3 mb-8">
                    <CheckCircle2 size={24} className="text-green-500" /> Recent Approvals
                  </h3>
                  <div className="space-y-4">
                    {incentives.slice(0, 4).map(inc => (
                      <div key={inc._id} className="flex items-center justify-between p-5 rounded-[2rem] bg-gray-50 border border-gray-100 group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-gray-200 text-[#1E3A8A] shadow-sm">
                            <IndianRupee size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-[#1E3A8A]">{inc.employee?.name}</p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{inc.month}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${inc.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {inc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-[3rem] p-10 text-white shadow-xl relative overflow-hidden">
                  <Activity size={180} className="absolute -right-10 -bottom-10 opacity-10" />
                  <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-6">Incentive Insights</p>
                  <div className="space-y-6 relative z-10">
                    <div>
                      <p className="text-[8px] font-black text-blue-200 uppercase tracking-widest mb-1">Total Payout Calculated</p>
                      <p className="text-4xl font-black">₹{incentives.reduce((acc, c) => acc + c.incentiveAmount, 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-blue-200 uppercase tracking-widest mb-1">Cycle Completion</p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-2 bg-white/20 rounded-full"><div className="h-full bg-green-400 rounded-full" style={{ width: '74%' }} /></div>
                        <span className="text-xs font-black">74%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {incSubTab === 'slabs' && <IncentiveSlabManager />}

          {incSubTab === 'history' && (
            <div className="bg-white rounded-[3rem] p-12 border border-blue-50 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-3xl font-black text-[#1E3A8A]">Incentive History</h3>
                <div className="flex gap-4">
                  <div className="px-6 py-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                    <Calendar size={18} className="text-blue-600" />
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{month}</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                      <th className="px-8 py-5 rounded-l-3xl">Employee</th>
                      <th className="px-8 py-5">Slab Used</th>
                      <th className="px-8 py-5 text-center">Dispatch</th>
                      <th className="px-8 py-5 text-center">Amount</th>
                      <th className="px-8 py-5 text-center">Status</th>
                      <th className="px-8 py-5 text-right rounded-r-3xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {incentives.map(inc => (
                      <tr key={inc._id} className="group hover:bg-blue-50/50 transition-all border-b border-gray-50/50">
                        <td className="px-8 py-6">
                          <p className="text-sm font-black text-[#1E3A8A]">{inc.employee?.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{inc.employee?.employeeId}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-[10px] font-black text-gray-600">{inc.slabUsed?.name || 'Manual'}</span>
                        </td>
                        <td className="px-8 py-6 text-center font-black text-blue-600">{inc.dispatchedCards}</td>
                        <td className="px-8 py-6 text-center font-black text-green-600">₹{inc.incentiveAmount.toLocaleString()}</td>
                        <td className="px-8 py-6 text-center">
                          <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-2 ${inc.status === 'Paid' ? 'bg-green-100 text-green-700' : inc.status === 'Approved' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {inc.status === 'Paid' ? <CheckCircle2 size={10} /> : inc.status === 'Approved' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                            {inc.status}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => { setCalculatedIncentive(inc); setSelectedEmpId(inc.employee._id); setIncSubTab('payouts'); }}
                            className="p-3 bg-white border border-gray-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          ><ChevronRight size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
