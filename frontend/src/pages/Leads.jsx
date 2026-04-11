import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  X,
  AlertCircle,
  Clock,
  Minus,
  Phone,
  PhoneCall,
  MapPin,
  Tag,
  CheckCircle,
  ArrowRight,
  Info,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';

const Leads = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1); // 1: Counts, 2: Lead Details
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Batch Entry State
  const [batchCounts, setBatchCounts] = useState({
    callsDone: 0,
    selected: 0,
    rejected: 0,
    dispatched: 0
  });

  const [batchLeads, setBatchLeads] = useState([]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/leads?status=${statusFilter}`);
      setLeads(res.data);
    } catch (error) {
      console.error("Error fetching leads", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const initBatchLeads = () => {
    const count = parseInt(batchCounts.callsDone);
    if (isNaN(count) || count <= 0) {
      setErrors({ counts: 'Please enter a valid call count' });
      return;
    }

    const totalStages = parseInt(batchCounts.selected) + parseInt(batchCounts.rejected) + parseInt(batchCounts.dispatched);
    if (totalStages > count) {
      setErrors({ counts: 'Total of Selected + Rejected + Dispatched cannot exceed total calls' });
      return;
    }

    // Initialize the leads array based on counts
    const newLeads = [];
    // We'll distribute the stages initially to help the employee
    let s = parseInt(batchCounts.selected);
    let r = parseInt(batchCounts.rejected);
    let d = parseInt(batchCounts.dispatched);

    for (let i = 0; i < count; i++) {
      let initialStage = 'Called';
      if (s > 0) { initialStage = 'Selected'; s--; }
      else if (r > 0) { initialStage = 'Rejected'; r--; }
      else if (d > 0) { initialStage = 'Dispatched'; d--; }

      newLeads.push({
        customerName: '',
        mobileNumber: '',
        location: '',
        stage: initialStage,
        callType: 'First Time Call',
        remarks: '',
        isExisting: false,
        isLoading: false
      });
    }
    setBatchLeads(newLeads);
    setModalStep(2);
    setErrors({});
  };

  const handleLeadChange = (index, field, value) => {
    // Add Real-time validation for Name/Location
    if (field === 'customerName' || field === 'location') {
      const regex = /^[a-zA-Z\s.,-]*$/;
      if (!regex.test(value)) {
        return; // Block invalid characters immediately
      }
    }

    const updated = [...batchLeads];
    updated[index][field] = value;
    setBatchLeads(updated);

    // If mobile number completed (10 digits), trigger lookup
    if (field === 'mobileNumber' && value.length === 10) {
      lookupLead(index, value);
    }
  };

  const lookupLead = async (index, mobile) => {
    const updated = [...batchLeads];
    updated[index].isLoading = true;
    setBatchLeads(updated);

    try {
      const res = await api.get(`/api/leads/mobile/${mobile}`);
      const leadData = res.data;
      
      const nextLeads = [...batchLeads];
      nextLeads[index] = {
        ...nextLeads[index],
        customerName: leadData.customerName,
        location: leadData.location,
        isExisting: true,
        callType: 'Follow-Up Call', // Default for existing
        isLoading: false
      };
      setBatchLeads(nextLeads);
    } catch (error) {
      // Not found is fine, reset loading
      const nextLeads = [...batchLeads];
      nextLeads[index].isLoading = false;
      nextLeads[index].isExisting = false;
      setBatchLeads(nextLeads);
    }
  };

  const handleSubmitBatch = async (e) => {
    e.preventDefault();
    
    // Validate all leads have required fields and proper data quality
    const nameRegex = /^[a-zA-Z\s.,-]+$/;
    let qualityError = null;

    for (const l of batchLeads) {
      if (!l.customerName || l.customerName.length < 3 || !nameRegex.test(l.customerName)) {
        qualityError = `Invalid Name: "${l.customerName || 'Emply'}". Names must be at least 3 letters and contain no numbers/symbols.`;
        break;
      }
      if (!l.location || l.location.length < 3 || !nameRegex.test(l.location)) {
        qualityError = `Invalid Location: "${l.location || 'Empty'}". Locations must be at least 3 letters.`;
        break;
      }
      if (!l.mobileNumber || l.mobileNumber.length !== 10) {
        qualityError = "Mobile number must be exactly 10 digits.";
        break;
      }
      if (!l.remarks || l.remarks.length < 2) {
        qualityError = "Please provide brief remarks for all interactions.";
        break;
      }
    }

    if (qualityError) {
      setErrors({ batch: qualityError });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/leads/batch', {
        date: new Date(),
        counts: batchCounts,
        leads: batchLeads
      });
      setShowModal(false);
      setModalStep(1);
      setBatchCounts({ callsDone: 0, selected: 0, rejected: 0, dispatched: 0 });
      setBatchLeads([]);
      fetchLeads();
    } catch (error) {
      setErrors({ batch: error.response?.data?.message || 'Failed to submit batch' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Map data to lead schema
        const mappedLeads = data.map(item => ({
          customerName: item['Customer Name'] || item['Name'] || item['customerName'],
          mobileNumber: String(item['Mobile'] || item['Phone'] || item['mobileNumber'] || '').replace(/\D/g, ''),
          location: item['Location'] || item['Address'] || item['location'],
          status: item['Status'] || item['status'] || 'Called'
        }));

        const validLeads = mappedLeads.filter(l => l.customerName && l.mobileNumber.length === 10 && l.location);

        if (validLeads.length === 0) {
          alert('No valid leads found in file. Ensure columns: Customer Name, Mobile Number, Location');
          setIsUploading(false);
          return;
        }

        await api.post('/api/leads/bulk', { leads: validLeads });
        alert(`Successfully processed ${validLeads.length} leads!`);
        fetchLeads();
      } catch (error) {
        console.error('Bulk upload failed', error);
        alert('Bulk upload failed. Please check file format.');
      } finally {
        setIsUploading(false);
        e.target.value = ''; // Reset input
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    const dataToExport = leads.map(lead => ({
      'Customer Name': lead.customerName,
      'Mobile Number': lead.mobileNumber,
      'Location': lead.location,
      'Current Status': lead.status,
      'Interaction History': (lead.history || []).length,
      'Last Modified': format(new Date(lead.updatedAt), 'yyyy-MM-dd HH:mm'),
      'Employee': lead.employee?.name || 'Unknown'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales_Master");
    XLSX.writeFile(wb, `Sales_Audit_Detail_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const filteredLeads = leads.filter(lead => {
    const searchLow = searchTerm.toLowerCase();
    return (lead.customerName?.toLowerCase() || '').includes(searchLow) ||
           (lead.mobileNumber || '').includes(searchTerm) ||
           (lead.location?.toLowerCase() || '').includes(searchLow);
  });

  const statusColors = {
    'Called': 'bg-blue-50 text-[var(--stage-called)] border-blue-100',
    'Selected': 'bg-green-50 text-[var(--stage-selected)] border-green-100',
    'Rejected': 'bg-red-50 text-[var(--stage-rejected)] border-red-100',
    'Dispatched': 'bg-orange-50 text-[var(--stage-dispatched)] border-orange-100',
    'Pending': 'bg-gray-50 text-gray-500 border-gray-100',
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Lead Master List</h1>
          <p className="text-gray-500 font-medium italic">
            {user?.role === 'admin' 
              ? 'Read-only view — Admins can audit all employee submissions' 
              : 'Add and track your daily customer interactions'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-6 py-3 text-emerald-600 border-2 border-emerald-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all active:scale-95 cursor-pointer">
            <FileSpreadsheet size={18} />
            {isUploading ? 'Uploading...' : 'Bulk Upload'}
            <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleBulkUpload} disabled={isUploading} />
          </label>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 text-blue-600 border-2 border-blue-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95"
          >
            <Download size={18} />
            Export Report
          </button>
          {/* Only employees can add leads */}
          {user?.role !== 'admin' && (
            <button 
              onClick={() => {
                setModalStep(1);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              <Plus size={18} />
              Quick Entry
            </button>
          )}
          {user?.role === 'admin' && (
            <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl text-xs font-black uppercase tracking-widest">
              <AlertCircle size={16} />
              Admin View Only
            </div>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search leads by name, mobile, or address..." 
            className="w-full pl-12 pr-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-sbi-blue outline-none transition-all placeholder:text-gray-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 tracking-widest">
            <Filter size={14} className="text-sbi-blue" />
            Filter Status
          </div>
          <select 
            className="bg-gray-50 border border-gray-100 rounded-2xl px-6 py-3 text-xs font-bold uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-50 text-gray-700"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Leads</option>
            <option value="Called">Called</option>
            <option value="Selected">Selected</option>
            <option value="Rejected">Rejected</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden border-b-4 border-b-sbi-blue">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Customer / Location</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contact Detail</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Latest Stage</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">History</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Last Update</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-24 text-center">
                    <Loader2 className="animate-spin text-sbi-blue mx-auto mb-4" size={40} />
                    <p className="text-gray-400 font-bold italic tracking-wider">Syncing lead master data...</p>
                  </td>
                </tr>
              ) : filteredLeads.length > 0 ? filteredLeads.map((lead) => (
                <tr key={lead._id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="font-black text-gray-900 group-hover:text-sbi-blue transition-colors mb-1">{lead.customerName}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase font-black tracking-tighter">
                      <MapPin size={10} className="text-orange-400" />
                      {lead.location}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg text-xs font-black text-sbi-blue mb-1">
                      <Phone size={12} />
                      {lead.mobileNumber}
                    </div>
                    {user?.role === 'admin' && (
                      <p className="text-[10px] text-gray-400 font-black uppercase">Owner: {lead.employee?.name}</p>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border border-white ${statusColors[lead.status]}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500">
                        {(lead.history || []).length}
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logs</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                      <Clock size={14} className="text-gray-300" />
                      {format(new Date(lead.updatedAt), 'MMM dd, HH:mm')}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setSelectedLead(lead);
                          setShowDetailsModal(true);
                        }}
                        className="p-2.5 text-gray-400 hover:text-white hover:bg-sbi-blue rounded-xl transition-all shadow-sm"
                        title="View Lead History"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="py-24 text-center">
                    <div className="bg-gray-50 inline-flex p-4 rounded-full mb-4">
                      <Search size={32} className="text-gray-300" />
                    </div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No matching lead records found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Details Modal */}
      {showDetailsModal && selectedLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl relative overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
            <div className="bg-[#1E3A8A] px-10 py-8 text-white flex justify-between items-center shrink-0">
               <div>
                 <h2 className="text-2xl font-black uppercase tracking-tighter">Lead Intelligence</h2>
                 <p className="text-blue-200 text-xs font-bold uppercase tracking-widest opacity-80 mt-1">Audit History · {selectedLead.customerName}</p>
               </div>
               <button onClick={() => { setShowDetailsModal(false); setSelectedLead(null); }} className="p-3 hover:bg-white/20 rounded-full transition-colors">
                  <X size={28} />
               </button>
            </div>

            <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-10">
               <div className="grid grid-cols-2 gap-8">
                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mobile Access</p>
                    <p className="text-xl font-black text-sbi-blue">{selectedLead.mobileNumber}</p>
                  </div>
                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Region / Hub</p>
                    <p className="text-xl font-black text-gray-700">{selectedLead.location}</p>
                  </div>
               </div>

               <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Timeline of Interactions</h3>
                  <div className="space-y-4">
                    {selectedLead.history && selectedLead.history.length > 0 ? (
                      selectedLead.history.map((log, idx) => (
                        <div key={idx} className="relative pl-8 pb-8 border-l-2 border-dashed border-gray-100 last:pb-0">
                           <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-sbi-blue"></div>
                           <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                              <div className="flex justify-between items-center mb-2">
                                 <span className="text-[10px] font-black text-sbi-blue uppercase tracking-widest">{log.callType || 'General Interaction'}</span>
                                 <span className="text-[9px] font-black text-gray-400">{format(new Date(log.date || log.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                              </div>
                              <p className="text-xs font-black text-gray-900 mb-1">{log.stage}</p>
                              <p className="text-xs text-gray-500 font-medium italic">"{log.remarks || 'No remarks provided'}"</p>
                           </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-xs italic">Initial master entry — no status logs yet</p>
                    )}
                  </div>
               </div>
            </div>
            
            <div className="p-8 bg-gray-50 flex justify-end shrink-0">
               <button 
                  onClick={() => { setShowDetailsModal(false); setSelectedLead(null); }}
                  className="px-10 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
               >
                 Close Detail
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Multi-Step Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-fade-in">
          <div className={`bg-white rounded-[3rem] w-full ${modalStep === 1 ? 'max-w-xl' : 'max-w-4xl'} shadow-2xl relative overflow-hidden animate-slide-up max-h-[90vh] flex flex-col`}>
            {/* Modal Header */}
            <div className="sbi-gradient px-10 py-8 text-white shrink-0 relative overflow-hidden">
               <div className="absolute right-0 top-0 opacity-10 -translate-y-1/2 translate-x-1/2">
                <CheckCircle size={200} />
              </div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Daily Sales Audit</h2>
                  <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">
                    Step {modalStep}: {modalStep === 1 ? 'Target Counts' : 'Interaction Details'}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white/20 rounded-full transition-colors">
                  <X size={28} />
                </button>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-8 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-500 ease-out" 
                  style={{ width: modalStep === 1 ? '50%' : '100%' }}
                ></div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-10 overflow-y-auto custom-scrollbar">
              {errors.batch && (
                <div className="mb-8 p-6 bg-red-50 border-l-4 border-l-red-500 text-red-700 text-sm rounded-2xl flex items-center gap-4 animate-shake">
                  <AlertCircle size={24} className="shrink-0" />
                  <p className="font-bold">{errors.batch}</p>
                </div>
              )}

              {modalStep === 1 ? (
                <div className="space-y-8">
                  <div className="bg-blue-50 p-6 rounded-2xl flex gap-4 items-start border border-blue-100">
                    <Info className="text-sbi-blue shrink-0" size={20} />
                    <p className="text-xs text-blue-800 font-bold leading-relaxed">
                      Enter the total counts for today. The system will then require you to provide specific customer details for each call recorded.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Total Calls Done</label>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setBatchCounts(p => ({...p, callsDone: Math.max(0, p.callsDone - 1)}))} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white transition-all shrink-0">
                          <Minus size={16} />
                        </button>
                        <input 
                          type="number" 
                          min="0"
                          className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all font-black text-xl text-sbi-blue text-center"
                          value={batchCounts.callsDone}
                          onChange={(e) => setBatchCounts({...batchCounts, callsDone: parseInt(e.target.value) || 0})}
                        />
                        <button onClick={() => setBatchCounts(p => ({...p, callsDone: p.callsDone + 1}))} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white transition-all shrink-0">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 text-green-500">Selected / Shortlisted</label>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setBatchCounts(p => ({...p, selected: Math.max(0, p.selected - 1)}))} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-green-600 hover:text-white transition-all shrink-0">
                          <Minus size={16} />
                        </button>
                        <input 
                          type="number" 
                          min="0"
                          className="w-full px-6 py-4 bg-green-50/50 border border-green-100 rounded-2xl focus:ring-4 focus:ring-green-50 focus:bg-white outline-none transition-all font-black text-xl text-green-600 text-center"
                          value={batchCounts.selected}
                          onChange={(e) => setBatchCounts({...batchCounts, selected: parseInt(e.target.value) || 0})}
                        />
                        <button onClick={() => setBatchCounts(p => ({...p, selected: p.selected + 1}))} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-green-600 hover:text-white transition-all shrink-0">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 text-red-500">Rejected Count</label>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setBatchCounts(p => ({...p, rejected: Math.max(0, p.rejected - 1)}))} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-all shrink-0">
                          <Minus size={16} />
                        </button>
                        <input 
                          type="number" 
                          min="0"
                          className="w-full px-6 py-4 bg-red-50/50 border border-red-100 rounded-2xl focus:ring-4 focus:ring-red-50 focus:bg-white outline-none transition-all font-black text-xl text-red-600 text-center"
                          value={batchCounts.rejected}
                          onChange={(e) => setBatchCounts({...batchCounts, rejected: parseInt(e.target.value) || 0})}
                        />
                        <button onClick={() => setBatchCounts(p => ({...p, rejected: p.rejected + 1}))} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-all shrink-0">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 text-orange-500">Dispatched Count</label>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setBatchCounts(p => ({...p, dispatched: Math.max(0, p.dispatched - 1)}))} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-orange-500 hover:text-white transition-all shrink-0">
                          <Minus size={16} />
                        </button>
                        <input 
                          type="number" 
                          min="0"
                          className="w-full px-6 py-4 bg-orange-50/50 border border-orange-100 rounded-2xl focus:ring-4 focus:ring-orange-50 focus:bg-white outline-none transition-all font-black text-xl text-orange-600 text-center"
                          value={batchCounts.dispatched}
                          onChange={(e) => setBatchCounts({...batchCounts, dispatched: parseInt(e.target.value) || 0})}
                        />
                        <button onClick={() => setBatchCounts(p => ({...p, dispatched: p.dispatched + 1}))} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-orange-500 hover:text-white transition-all shrink-0">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {errors.counts && (
                    <p className="text-red-500 text-xs font-bold text-center italic">{errors.counts}</p>
                  )}

                  <button 
                    onClick={initBatchLeads}
                    className="w-full py-5 text-white sbi-gradient rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs hover:opacity-90 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    Generate Entry Forms
                    <ArrowRight size={18} />
                  </button>
                </div>
              ) : (
                <div className="space-y-10 pb-32">
                  <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="px-4 py-1.5 bg-sbi-blue text-white rounded-lg text-xs font-black">
                        {batchLeads.length} CARDS
                      </span>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Provide Details for Each Call</p>
                    </div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                      Progress: {batchLeads.filter(l => l.remarks && l.customerName).length} / {batchLeads.length}
                    </div>
                  </div>

                  <div className="space-y-8">
                    {batchLeads.map((lead, index) => (
                      <div key={index} className={`relative p-8 rounded-[2.5rem] border-2 transition-all ${lead.customerName && lead.remarks ? 'border-green-100 bg-green-50/20' : 'border-gray-50 bg-white shadow-sm'}`}>
                        <div className="absolute -left-4 -top-4 w-10 h-10 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-center text-xs font-black text-gray-400 shadow-sm">
                          {index + 1}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {/* Mobile Section */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                              Mobile Number
                              {lead.isLoading && <Loader2 size={12} className="animate-spin text-sbi-blue" />}
                              {lead.isExisting && <span className="text-green-500 text-[8px] font-black">EXISTING LEAD</span>}
                            </label>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                              <input 
                                required 
                                type="tel" 
                                pattern="[0-9]{10}"
                                className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-sm"
                                placeholder="10-digit number"
                                value={lead.mobileNumber}
                                maxLength={10}
                                onChange={(e) => handleLeadChange(index, 'mobileNumber', e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Name Section */}
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Customer Name</label>
                              <input 
                               required 
                               type="text" 
                               className="w-full px-5 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-sm"
                               placeholder="Letters only"
                               value={lead.customerName}
                               onChange={(e) => handleLeadChange(index, 'customerName', e.target.value)}
                               disabled={lead.isExisting}
                             />
                           </div>

                          {/* Location Section */}
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Location</label>
                              <input 
                               required 
                               type="text" 
                               className="w-full px-5 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-sm"
                               placeholder="Letters only"
                               value={lead.location}
                               onChange={(e) => handleLeadChange(index, 'location', e.target.value)}
                               disabled={lead.isExisting}
                             />
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
                          {/* Call Type */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Interaction Type</label>
                            <select 
                              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-xs text-sbi-blue"
                              value={lead.callType}
                              onChange={(e) => handleLeadChange(index, 'callType', e.target.value)}
                            >
                              <option value="First Time Call">First Time Call</option>
                              <option value="Follow-Up Call">Follow-Up Call</option>
                              <option value="Selected Notified Call">Selected Notified</option>
                              <option value="Rejected Notified Call">Rejected Notified</option>
                              <option value="Dispatch Follow-Up">Dispatch Follow-Up</option>
                              <option value="Pending Follow-Up">Pending Follow-Up</option>
                            </select>
                          </div>

                          {/* Stage */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Final Stage</label>
                            <select 
                              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-xs"
                              value={lead.stage}
                              onChange={(e) => handleLeadChange(index, 'stage', e.target.value)}
                            >
                              <option value="Called">Called</option>
                              <option value="Selected">Selected</option>
                              <option value="Rejected">Rejected</option>
                              <option value="Dispatched">Dispatched</option>
                              <option value="Pending">Pending</option>
                            </select>
                          </div>

                          {/* Remarks */}
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Short Remarks (Mandatory)</label>
                             <input 
                              required 
                              type="text" 
                              className="w-full px-5 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium text-xs italic"
                              placeholder="e.g., Interested, follow up tomorrow"
                              value={lead.remarks}
                              onChange={(e) => handleLeadChange(index, 'remarks', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white pt-10 sticky bottom-0 left-0 right-0 py-6 flex gap-4 shrink-0 shadow-[0_-20px_50px_rgba(255,255,255,0.9)]">
                    <button 
                      type="button"
                      onClick={() => setModalStep(1)}
                      className="flex-1 px-8 py-5 bg-white border-2 border-gray-100 text-gray-400 font-black rounded-3xl hover:bg-gray-50 transition-all uppercase tracking-[0.2em] text-[10px] shadow-xl"
                    >
                      Back to Counts
                    </button>
                    <button 
                      onClick={handleSubmitBatch}
                      disabled={isSubmitting}
                      className="flex-[2] flex justify-center items-center py-5 px-8 text-white sbi-gradient rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] hover:opacity-90 shadow-2xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : 'Finalize & Submit Daily Batch'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for scrollbar */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}} />
    </div>
  );
};

export default Leads;
