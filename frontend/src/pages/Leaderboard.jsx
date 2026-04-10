import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Star,
  Search,
  CheckCircle,
  Truck,
  TrendingUp,
  Loader2,
  Calendar,
  PhoneCall,
  Quote
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`http://localhost:5052/api/stats/leaderboard?period=${period}`);
        setLeaderboard(res.data);
      } catch (error) {
        console.error("Error fetching leaderboard", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [period]);

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const formatPeriod = (p) => {
    return p.charAt(0).toUpperCase() + p.slice(1);
  };

  const getDailyMotivation = () => {
    const quotes = [
      "Every 'no' is one step closer to a 'yes'. Keep pushing!",
      "Success is the sum of small efforts, repeated day in and day out.",
      "The only way to do great work is to love what you do.",
      "Your hard work today is the foundation for your success tomorrow.",
      "Don't stop when you're tired. Stop when you're done.",
      "The difference between a successful person and others is not a lack of strength, but a lack of will.",
      "Champions keep playing until they get it right."
    ];
    const today = new Date().getUTCDate();
    return quotes[today % quotes.length];
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Motivational Card */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <Quote size={120} />
        </div>
        <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left gap-4">
          <div className="bg-white/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/30 backdrop-blur-sm">
            Daily Motivation
          </div>
          <p className="text-xl md:text-2xl font-black italic leading-tight max-w-2xl">
            "{getDailyMotivation()}"
          </p>
          <div className="flex items-center gap-2 text-blue-100/70">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Sales Spirit · {format(new Date(), 'EEEE, do MMM')}</span>
          </div>
        </div>
      </div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Trophy className="text-amber-500" size={32} />
            Performance Leaderboard
          </h1>
          <p className="text-gray-500">Celebrating our top sales achievers across the team</p>
        </div>
        
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
          {['daily', 'yesterday', 'weekly', 'monthly', 'overall'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                period === p 
                  ? 'sbi-gradient text-white shadow-md' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p === 'daily' ? 'Today' : p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="animate-spin text-sbi-blue mx-auto mb-4" size={40} />
          <p className="text-gray-400 font-medium italic">Calculating team scores...</p>
        </div>
      ) : leaderboard.length > 0 ? (
        <>
          {/* Top 3 Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pb-8">
            {/* 2nd Place */}
            {topThree[1] && (
              <div className="order-2 md:order-1 flex flex-col items-center">
                <div className="relative mb-4 group">
                  <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center border-4 border-slate-200 shadow-xl group-hover:scale-110 transition-transform duration-300">
                    <span className="text-slate-500 text-3xl font-black uppercase text-center w-full">
                      {topThree[1].employeeName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-slate-400 rounded-full border-4 border-white flex items-center justify-center text-white shadow-lg">
                    <Medal size={20} />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-lg w-full text-center">
                  <div className="text-slate-500 font-black text-xs uppercase tracking-widest mb-1">Rank 2</div>
                  <h3 className="font-extrabold text-gray-900 truncate">{topThree[1].employeeName}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="bg-green-50 rounded-xl p-2">
                      <p className="text-[10px] text-green-600 font-black uppercase">Shortlisted</p>
                      <p className="font-bold text-green-700">{topThree[1].totalShortlisted}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-2">
                      <p className="text-[10px] text-blue-600 font-black uppercase">Dispatched</p>
                      <p className="font-bold text-blue-700">{topThree[1].totalDispatched}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div className="order-1 md:order-2 flex flex-col items-center z-10 scale-110 md:mb-8">
                <div className="relative mb-4 group">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-amber-500 animate-bounce">
                    <Crown size={40} />
                  </div>
                  <div className="w-32 h-32 rounded-[2.5rem] sbi-gradient flex items-center justify-center border-4 border-white shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-4xl font-black uppercase text-center w-full">
                      {topThree[0].employeeName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-12 h-12 bg-amber-500 rounded-full border-4 border-white flex items-center justify-center text-white shadow-xl">
                    <Star size={24} fill="white" />
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-amber-100 shadow-2xl w-full text-center ring-4 ring-amber-50">
                  <div className="text-amber-500 font-black text-sm uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                    <Trophy size={14} /> Leader
                  </div>
                  <h3 className="font-extrabold text-xl text-gray-900 truncate">{topThree[0].employeeName}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="bg-green-100 rounded-2xl p-3">
                      <p className="text-[10px] text-green-600 font-black uppercase">Shortlisted</p>
                      <p className="font-black text-xl text-green-700">{topThree[0].totalShortlisted}</p>
                    </div>
                    <div className="bg-blue-100 rounded-2xl p-3">
                      <p className="text-[10px] text-blue-600 font-black uppercase">Dispatched</p>
                      <p className="font-black text-xl text-blue-700">{topThree[0].totalDispatched}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div className="order-3 md:order-3 flex flex-col items-center">
                <div className="relative mb-4 group">
                  <div className="w-24 h-24 rounded-3xl bg-orange-50 flex items-center justify-center border-4 border-orange-100 shadow-xl group-hover:scale-110 transition-transform duration-300">
                    <span className="text-orange-600 text-3xl font-black uppercase text-center w-full">
                      {topThree[2].employeeName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-orange-400 rounded-full border-4 border-white flex items-center justify-center text-white shadow-lg">
                    <Medal size={20} />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-lg w-full text-center">
                  <div className="text-orange-500 font-black text-xs uppercase tracking-widest mb-1">Rank 3</div>
                  <h3 className="font-extrabold text-gray-900 truncate">{topThree[2].employeeName}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="bg-green-50 rounded-xl p-2">
                      <p className="text-[10px] text-green-600 font-black uppercase">Shortlisted</p>
                      <p className="font-bold text-green-700">{topThree[2].totalShortlisted}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-2">
                      <p className="text-[10px] text-blue-600 font-black uppercase">Dispatched</p>
                      <p className="font-bold text-blue-700">{topThree[2].totalDispatched}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* List for rest of rankings */}
          {rest.length > 0 && (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden mt-12 mb-20 animate-slide-up">
              <div className="px-8 py-6 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                <h4 className="font-black text-gray-500 uppercase tracking-[0.2em] text-xs">Complete Standings</h4>
                <TrendingUp size={16} className="text-gray-400" />
              </div>
              <div className="divide-y divide-gray-50">
                {rest.map((item, index) => (
                  <div key={item._id} className="px-10 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                    <div className="flex items-center gap-8">
                      <span className="w-10 text-xl font-black text-gray-300 group-hover:text-gray-900 transition-colors">
                        {(index + 4).toString().padStart(2, '0')}
                      </span>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center font-black group-hover:bg-sbi-blue group-hover:text-white transition-all transform group-hover:rotate-6">
                          {item.employeeName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{item.employeeName}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.employeeId}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-12 text-right">
                      <div>
                        <div className="flex items-center justify-end gap-1.5 text-green-600 font-black">
                          <CheckCircle size={14} />
                          {item.totalShortlisted}
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Shortlisted</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-end gap-1.5 text-blue-600 font-black">
                          <Truck size={14} />
                          {item.totalDispatched}
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Dispatched</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-[3rem] border-4 border-dashed border-gray-100 py-32 text-center">
          <Calendar className="mx-auto text-gray-200 mb-6" size={80} />
          <h3 className="text-2xl font-black text-gray-300 uppercase tracking-widest">No Standings Yet</h3>
          <p className="text-gray-400 font-medium mt-2 italic">Be the first to score for {period} period!</p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
