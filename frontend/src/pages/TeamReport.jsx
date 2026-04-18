import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  Phone,
  CheckCircle,
  XCircle,
  Truck,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  AlertCircle,
  Loader2,
  BarChart3,
  User,
} from 'lucide-react';
import api, { API_URL } from '../utils/api';

const StatPill = ({ label, value, color }) => (
  <div className={`flex flex-col items-center px-4 py-2 rounded-xl ${color}`}>
    <span className="text-xl font-black leading-none">{value}</span>
    <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-70">{label}</span>
  </div>
);

const MemberCard = ({ member }) => {
  const [expanded, setExpanded] = useState(false);

  const convRate = parseFloat(member.summary.conversionRate);
  const dispRate = parseFloat(member.summary.dispatchRate);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] flex items-center justify-center shadow-lg shrink-0">
            <span className="text-white font-black text-lg">{member.name?.[0]?.toUpperCase()}</span>
          </div>
          <div>
            <p className="text-base font-black text-gray-900">{member.name}</p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {member.employeeId}
              </span>
              <span className="text-[10px] font-bold text-gray-400">{member.role?.replace('_', ' ')}</span>
              {member.location && member.location !== 'N/A' && (
                <span className="text-[10px] font-bold text-gray-400">📍 {member.location}</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatPill label="Calls" value={member.summary.totalCalls} color="bg-blue-50 text-blue-700" />
          <StatPill label="Selected" value={member.summary.totalSelected} color="bg-emerald-50 text-emerald-700" />
          <StatPill label="Dispatched" value={member.summary.totalDispatched} color="bg-violet-50 text-violet-700" />
          <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-amber-50 text-amber-700">
            <span className="text-xl font-black leading-none">{member.summary.conversionRate}%</span>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-70">Conv.</span>
          </div>
        </div>

        {/* Expand Button */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold transition-all"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Hide' : 'Daily'}
        </button>
      </div>

      {/* Progress Bars */}
      <div className="px-6 pb-4 grid grid-cols-2 gap-3">
        <div>
          <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
            <span>Conversion Rate</span>
            <span>{convRate}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(convRate, 100)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
            <span>Dispatch Rate</span>
            <span>{dispRate}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-400 to-violet-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(dispRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Daily Breakdown */}
      {expanded && (
        <div className="border-t border-gray-100 px-6 pb-6 pt-4">
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Daily Breakdown</p>
          {member.dailyBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No daily reports in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="text-left pb-2 pr-4">Date</th>
                    <th className="text-center pb-2 pr-4">Calls</th>
                    <th className="text-center pb-2 pr-4">Selected</th>
                    <th className="text-center pb-2 pr-4">Rejected</th>
                    <th className="text-center pb-2">Dispatched</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {member.dailyBreakdown.map((day, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2 pr-4 font-bold text-gray-700">{day.date}</td>
                      <td className="py-2 pr-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">{day.calls}</span>
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs">{day.selected}</span>
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-red-50 text-red-600 font-bold text-xs">{day.rejected}</span>
                      </td>
                      <td className="py-2 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-violet-50 text-violet-700 font-bold text-xs">{day.dispatched}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TeamReport = () => {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const fmt = (d) => d.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(fmt(firstOfMonth));
  const [endDate, setEndDate] = useState(fmt(today));
  const [search, setSearch] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const { data: reportData } = await api.get(`/api/stats/team-report?${params}`);
      setData(reportData);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load team report.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const storedUser = localStorage.getItem('fic_sbi_user');
      const { token } = JSON.parse(storedUser);
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`${API_URL}/api/stats/team-report/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = response.headers.get('content-disposition');
      const fname = cd ? cd.split('filename="')[1].replace('"', '') : `Team_Report.xlsx`;
      a.download = fname;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const filtered = data.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.employeeId || '').toLowerCase().includes(search.toLowerCase())
  );

  // Totals
  const totals = filtered.reduce((acc, m) => ({
    calls: acc.calls + m.summary.totalCalls,
    selected: acc.selected + m.summary.totalSelected,
    rejected: acc.rejected + m.summary.totalRejected,
    dispatched: acc.dispatched + m.summary.totalDispatched,
  }), { calls: 0, selected: 0, rejected: 0, dispatched: 0 });

  const teamConvRate = totals.calls > 0 ? ((totals.selected / totals.calls) * 100).toFixed(1) : '0.0';
  const teamDispRate = totals.selected > 0 ? ((totals.dispatched / totals.selected) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <FileSpreadsheet size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Team Report</h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Performance Overview</p>
            </div>
          </div>
        </div>

        <button
          id="export-team-report-btn"
          onClick={handleExport}
          disabled={exporting || loading || data.length === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white font-black text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        >
          {exporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {exporting ? 'Exporting…' : 'Export Excel'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">From Date</label>
          <input
            type="date"
            id="report-start-date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
          />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">To Date</label>
          <input
            type="date"
            id="report-end-date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
          />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Search Member</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              id="report-search"
              placeholder="Name or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            />
          </div>
        </div>
        <button
          id="report-refresh-btn"
          onClick={fetchReport}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-700 font-black text-sm transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary KPI Cards */}
      {!loading && !error && data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Phone, label: 'Total Calls', value: totals.calls, from: 'from-blue-500', to: 'to-blue-600', light: 'bg-blue-50 text-blue-700' },
            { icon: CheckCircle, label: 'Total Selected', value: totals.selected, from: 'from-emerald-500', to: 'to-emerald-600', light: 'bg-emerald-50 text-emerald-700' },
            { icon: Truck, label: 'Total Dispatched', value: totals.dispatched, from: 'from-violet-500', to: 'to-violet-600', light: 'bg-violet-50 text-violet-700' },
            { icon: TrendingUp, label: 'Team Conv. Rate', value: `${teamConvRate}%`, from: 'from-amber-500', to: 'to-orange-500', light: 'bg-amber-50 text-amber-700' },
          ].map(({ icon: Icon, label, value, from, to, light }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${from} ${to} flex items-center justify-center shadow-md shrink-0`}>
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Member Count Badge */}
      {!loading && !error && (
        <div className="flex items-center gap-2">
          <Users size={14} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-500">
            Showing <span className="text-[#1E3A8A] font-black">{filtered.length}</span> team member{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* States */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Loader2 size={28} className="text-[#2563EB] animate-spin" />
          </div>
          <p className="text-sm font-bold text-gray-400">Loading team report…</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <p className="text-sm font-bold text-red-500">{error}</p>
          <button onClick={fetchReport} className="px-5 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-black hover:bg-red-100 transition-all">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <BarChart3 size={28} className="text-gray-400" />
          </div>
          <p className="text-sm font-bold text-gray-400">No report data found for this period.</p>
        </div>
      )}

      {/* Member Cards */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map(member => (
            <MemberCard key={member._id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamReport;
