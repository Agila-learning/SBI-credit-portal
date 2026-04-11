import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Plus, 
  UserPlus, 
  Search, 
  Mail, 
  Phone, 
  BadgeCheck, 
  UserX, 
  MoreVertical,
  Loader2,
  X,
  Shield,
  Briefcase,
  ExternalLink,
  Edit2,
  Trash2,
  MapPin,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const Employees = () => {
  const { user: currentUser } = useAuth();
  const isAdminOrTL = currentUser?.role === 'admin' || currentUser?.role === 'team_leader';
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [joiningMonthFilter, setJoiningMonthFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    employeeId: '',
    phone: '',
    location: '',
    status: 'active'
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/employees');
      setEmployees(res.data);
    } catch (error) {
      console.error("Error fetching employees", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      employeeId: '',
      phone: '',
      location: '',
      status: 'active'
    });
    setErrors({});
    setSelectedEmployee(null);
  };

  const handleAddClick = () => {
    setModalMode('add');
    resetForm();
    setShowModal(true);
  };

  const handleEditClick = (emp) => {
    setModalMode('edit');
    setSelectedEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      password: '', // Leave empty unless changing
      role: emp.role || 'employee',
      employeeId: emp.employeeId,
      phone: emp.phone || '',
      location: emp.location || '',
      status: emp.status || 'active'
    });
    setShowModal(true);
  };

  const handleDeleteClick = (emp) => {
    setSelectedEmployee(emp);
    setShowDeleteConfirm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      if (modalMode === 'add') {
        await api.post('/api/auth/register', formData);
      } else {
        await api.put(`/api/employees/${selectedEmployee._id}`, formData);
      }
      setShowModal(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      setErrors({ server: error.response?.data?.message || 'Action failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setIsSubmitting(true);
      await api.delete(`/api/employees/${selectedEmployee._id}`);
      setShowDeleteConfirm(false);
      fetchEmployees();
    } catch (error) {
      alert("Failed to delete member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const searchLow = searchTerm.toLowerCase();
    const matchesSearch = (emp.name?.toLowerCase() || '').includes(searchLow) ||
                         (emp.employeeId?.toLowerCase() || '').includes(searchLow) ||
                         (emp.email?.toLowerCase() || '').includes(searchLow);
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
    
    const matchesMonth = joiningMonthFilter === 'all' || (
      new Date(emp.createdAt).getMonth() === parseInt(joiningMonthFilter)
    );

    return matchesSearch && matchesStatus && matchesRole && matchesMonth;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Team Matrix</h1>
          <p className="text-gray-500 font-medium">Manage organization structure and individual controls</p>
        </div>
        {isAdminOrTL && (
          <button 
            onClick={handleAddClick}
            className="flex items-center gap-2 px-8 py-4 text-white sbi-gradient rounded-[1.8rem] font-black uppercase tracking-widest text-xs hover:opacity-90 shadow-xl shadow-blue-100 transition-all active:scale-95"
          >
            <UserPlus size={18} />
            Onboard New Member
          </button>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-6">
        <div className="flex-1 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name, emp id, or corporate email..." 
            className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 bg-gray-50 px-6 py-2 rounded-2xl border border-gray-100">
            <Filter size={14} className="text-gray-400" />
            <select 
              className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none text-gray-600 cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 px-6 py-2 rounded-2xl border border-gray-100">
            <Briefcase size={14} className="text-gray-400" />
            <select 
              className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none text-gray-600 cursor-pointer"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="employee">Sales Professional</option>
              <option value="team_leader">Team Leader</option>
              <option value="admin">Platform Administrator</option>
            </select>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 px-6 py-2 rounded-2xl border border-gray-100">
            <Calendar size={14} className="text-gray-400" />
            <select 
              className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none text-gray-600 cursor-pointer"
              value={joiningMonthFilter}
              onChange={(e) => setJoiningMonthFilter(e.target.value)}
            >
              <option value="all">Joining Month</option>
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-32 text-center">
            <Loader2 className="animate-spin text-sbi-blue mx-auto mb-4" size={48} />
            <p className="text-gray-400 font-black tracking-[0.2em] uppercase text-xs">Accessing Team Vault...</p>
          </div>
        ) : filteredEmployees.length > 0 ? filteredEmployees.map((emp) => (
          <div key={emp._id} className="bg-white rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            {/* Action Overlay */}
            <div className="absolute top-6 right-6 flex gap-2">
              <button 
                onClick={() => handleEditClick(emp)}
                className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-md border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => handleDeleteClick(emp)}
                className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-md border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="p-10">
              <div className="flex items-center gap-5 mb-8">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center font-black text-3xl shadow-inner uppercase ${emp.status === 'active' ? 'bg-blue-50 text-sbi-blue border border-blue-100' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                  {emp.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-gray-900 text-xl leading-none">{emp.name}</h3>
                    {emp.status === 'active' ? (
                      <CheckCircle2 size={16} className="text-green-500" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-500" />
                    )}
                  </div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                    <Shield size={10} />
                    {emp.role === 'admin' ? 'Administrator' : 'Sales Professional'}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-10">
                 <div className="flex items-center gap-4 group/item">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover/item:bg-blue-50 group-hover/item:text-sbi-blue transition-colors">
                    <Briefcase size={16} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] leading-tight">Employee ID</p>
                    <p className="text-sm font-black text-gray-700">{emp.employeeId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 group/item">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover/item:bg-blue-50 group-hover/item:text-sbi-blue transition-colors">
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] leading-tight">Corporate Email</p>
                    <p className="text-sm font-black text-gray-700 truncate">{emp.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 group/item">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover/item:bg-blue-50 group-hover/item:text-sbi-blue transition-colors">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] leading-tight">Primary Location</p>
                    <p className="text-sm font-black text-gray-700">{emp.location || 'Remote Selection'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-50 flex items-center justify-between">
                <div>
                   <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-tight">Contract Started</p>
                   <p className="text-xs font-black text-gray-900">{format(new Date(emp.createdAt), 'MMM dd, yyyy')}</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${emp.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                  {emp.status}
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
             <UserX size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No personnel matched your filter criteria.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-2xl relative overflow-hidden animate-slide-up max-h-[95vh] flex flex-col">
            <div className="sbi-gradient px-12 py-10 text-white shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[1.8rem] bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                    {modalMode === 'add' ? <UserPlus size={32} /> : <Edit2 size={32} />}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase">{modalMode === 'add' ? 'Onboard Member' : 'Update Dossier'}</h2>
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-[0.2em] opacity-80 mt-1">{modalMode === 'add' ? 'Sales Unit Acquisition' : `Revising ID: ${selectedEmployee?.employeeId}`}</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors">
                  <X size={32} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-12 space-y-8 overflow-y-auto">
              {errors.server && (
                <div className="p-6 bg-red-50 border-l-4 border-l-red-500 text-red-700 text-sm rounded-2xl flex items-center gap-4 animate-shake">
                  <AlertTriangle size={20} className="shrink-0" />
                  <span className="font-black uppercase tracking-widest text-xs">{errors.server}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Full Legal Name</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all font-black"
                    placeholder="e.g. Vikram Malhotra"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Internal UID</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all font-black text-sbi-blue"
                    placeholder="SBI-XXXX"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Corporate Email</label>
                  <input 
                    required 
                    type="email" 
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all font-bold"
                    placeholder="name@sbicard.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Contact Link</label>
                  <input 
                    type="tel" 
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all font-bold"
                    placeholder="+91 XXXXX XXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Organizational Role</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all font-black text-xs uppercase tracking-widest"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="employee">Sales Professional</option>
                    <option value="team_leader">Team Leader</option>
                    <option value="admin">Platform Administrator</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Assigned Territory</label>
                  <input 
                    type="text" 
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all font-bold"
                    placeholder="City / Region"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Account Access Status</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all font-black text-xs uppercase tracking-widest"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="active">Active Entry</option>
                    <option value="inactive">Suspended / Deactive</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">{modalMode === 'add' ? 'Access Key' : 'Reset Access Key (Optional)'}</label>
                  <input 
                    required={modalMode === 'add'} 
                    type="password" 
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all font-black"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-6 py-5 px-8 text-white sbi-gradient rounded-3xl font-black text-sm uppercase tracking-[0.3em] hover:opacity-90 shadow-2xl shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-4"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : (
                  <>
                    <Shield size={20} className="opacity-50" />
                    {modalMode === 'add' ? 'INITIALIZE MEMBER' : 'AUTHORIZE UPDATES'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[3rem] p-12 max-w-lg w-full shadow-2xl text-center animate-slide-up">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Trash2 size={48} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter uppercase">Decommission Member?</h2>
            <p className="text-gray-500 font-medium mb-10 leading-relaxed italic">
              Removing <span className="text-red-600 font-black">"{selectedEmployee?.name}"</span> will suspend their access immediately. All historical performance data will be preserved for audit purposes.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-5 rounded-[1.8rem] bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="flex-1 py-5 rounded-[1.8rem] bg-red-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
