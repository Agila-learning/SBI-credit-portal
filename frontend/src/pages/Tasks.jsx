import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Search, 
  Target, 
  Users, 
  Calendar,
  Filter,
  BadgeAlert,
  Loader2,
  ChevronRight,
  MoreVertical,
  Flag,
  ListTodo,
  TrendingUp,
  X,
  UserPlus,
  Zap,
  CheckSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const Tasks = () => {
  const { user } = useAuth();
  const isAdminOrTL = user?.role === 'admin' || user?.role === 'team_leader';
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Task Creation State
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    type: 'Calls Target',
    targetCount: 0,
    priority: 'Medium',
    assignedTo: [],
    dueDate: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchData = async () => {
    if (!user) return; // Wait for auth
    try {
      setLoading(true);
      const [taskRes, empRes] = await Promise.all([
        api.get('/api/tasks'),
        user.role === 'admin' ? api.get('/api/employees') : Promise.resolve({ data: [] })
      ]);
      setTasks(taskRes.data);
      if (user.role === 'admin') setEmployees(empRes.data);
    } catch (error) {
      console.error("Error fetching tasks", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/api/tasks', newTask);
      setShowModal(false);
      setNewTask({
        title: '',
        description: '',
        type: 'Calls Target',
        targetCount: 0,
        priority: 'Medium',
        assignedTo: [],
        dueDate: format(new Date(), 'yyyy-MM-dd')
      });
      fetchData();
    } catch (error) {
      alert("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProgress = async (taskId, currentAchieved) => {
    const newVal = prompt("Enter achieved count:", currentAchieved);
    if (newVal === null) return;
    
    try {
      await api.put(`/api/tasks/${taskId}`, { 
        achievedCount: parseInt(newVal) || 0 
      });
      fetchData();
    } catch (error) {
      alert("Failed to update task");
    }
  };

  const toggleStatus = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'Completed' ? 'In Progress' : 'Completed';
    try {
      await api.put(`/api/tasks/${taskId}`, { status: nextStatus });
      fetchData();
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const getPriorityColor = (p) => {
    switch (p) {
      case 'High': return 'text-red-600 bg-red-50';
      case 'Medium': return 'text-amber-600 bg-amber-50';
      case 'Low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
             <ListTodo className="text-[#1E3A8A]" size={32} />
             Task Management
          </h1>
          <p className="text-gray-500 font-medium italic">
            {isAdmin ? 'Assign performance targets and monitor team execution' : 'Track your active assignments and performance targets'}
          </p>
        </div>
        {isAdminOrTL && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-3 px-8 py-4 text-white sbi-gradient rounded-[1.8rem] font-black uppercase tracking-widest text-xs hover:opacity-90 shadow-2xl shadow-blue-200 transition-all active:scale-95"
          >
            <UserPlus size={18} />
            Assign New Task
          </button>
        )}
      </div>

      {/* Analytics Row (Admin/TL Only) */}
      {isAdminOrTL && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Assigned</p>
            <div className="flex items-end justify-between">
              <h3 className="text-4xl font-black text-[#1E3A8A]">{tasks.length}</h3>
              <Target size={24} className="text-blue-100" />
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Execution Rate</p>
            <div className="flex items-end justify-between">
              <h3 className="text-4xl font-black text-green-600">
                {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100) : 0}%
              </h3>
              <TrendingUp size={24} className="text-green-100" />
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Critical Tasks</p>
            <div className="flex items-end justify-between">
              <h3 className="text-4xl font-black text-red-600">{tasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length}</h3>
              <AlertCircle size={24} className="text-red-100" />
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Overdue</p>
            <div className="flex items-end justify-between">
              <h3 className="text-4xl font-black text-amber-600">{tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'Completed').length}</h3>
              <Clock size={24} className="text-amber-100" />
            </div>
          </div>
        </div>
      )}

      {/* Task List Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {loading ? (
          <div className="col-span-full py-32 text-center">
            <Loader2 className="animate-spin text-sbi-blue mx-auto mb-4" size={48} />
            <p className="text-gray-400 font-black tracking-[0.2em] uppercase text-xs font-inter">Syncing Task Board...</p>
          </div>
        ) : tasks.length > 0 ? tasks.map((task) => (
          <div key={task._id} className={`bg-white rounded-[3rem] border-2 border-gray-50 p-10 shadow-sm hover:shadow-xl transition-all duration-300 relative group overflow-hidden ${task.status === 'Completed' ? 'bg-gray-50/50 grayscale-[0.5]' : ''}`}>
            
            {/* Completion Ribbon */}
            {task.status === 'Completed' && (
              <div className="absolute top-0 right-0">
                <div className="bg-green-500 text-white text-[8px] font-black px-10 py-1 rotate-45 translate-x-10 translate-y-4 uppercase tracking-widest shadow-lg">
                  Archive
                </div>
              </div>
            )}

            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${getPriorityColor(task.priority)}`}>
                      {task.priority} Priority
                    </span>
                    <span className="px-3 py-1 bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 rounded-lg">
                      {task.type}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight group-hover:text-[#1E3A8A] transition-colors">{task.title}</h3>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Deadline</p>
                   <div className={`px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-2 ${new Date(task.dueDate) < new Date() && task.status !== 'Completed' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-700'}`}>
                     <Calendar size={14} />
                     {format(new Date(task.dueDate), 'MMM dd')}
                   </div>
                </div>
              </div>

              <p className="text-gray-500 font-medium text-sm mb-10 leading-relaxed italic">
                {task.description || "No additional parameters provided for this task assignment."}
              </p>

              {/* Progress Bar (Only for target-based tasks) */}
              {task.targetCount > 0 && (
                <div className="mb-10 p-8 rounded-[2.5rem] bg-[#F8FAFC] border border-gray-100 shadow-inner relative overflow-hidden">
                  <Zap size={100} className="absolute -right-5 -bottom-5 opacity-5 text-blue-100" />
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Target Achievement</p>
                      <h4 className="text-3xl font-black text-[#1E3A8A]">{task.achievedCount} <span className="text-xs text-gray-300 font-medium uppercase italic">of {task.targetCount}</span></h4>
                    </div>
                    <div className="text-right">
                       <p className="text-4xl font-black text-blue-600">{task.completionPercentage}%</p>
                    </div>
                  </div>
                  <div className="w-full h-4 bg-white rounded-full p-1 border border-gray-100 relative z-10">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000 shadow-md shadow-blue-100"
                      style={{ width: `${task.completionPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-auto pt-8 border-t border-gray-50 flex items-center justify-between">
                <div className="flex -space-x-3 overflow-hidden">
                  {task.assignedTo?.map((emp, i) => (
                    <div key={i} title={emp.name} className="w-10 h-10 rounded-xl bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-sbi-blue uppercase ring-2 ring-transparent group-hover:ring-blue-50 transition-all">
                      {emp.name?.[0]}
                    </div>
                  ))}
                  {task.assignedTo?.length > 4 && (
                    <div className="w-10 h-10 rounded-xl bg-gray-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-gray-400 uppercase">
                      +{task.assignedTo.length - 4}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {!isAdminOrTL && task.status !== 'Completed' && task.targetCount > 0 && (
                    <button 
                      onClick={() => handleUpdateProgress(task._id, task.achievedCount)}
                      className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-[#1E3A8A] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 shadow-sm transition-all active:scale-95"
                    >
                      Update Stats
                    </button>
                  )}
                  <button 
                    onClick={() => toggleStatus(task._id, task.status)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all active:scale-95 ${task.status === 'Completed' ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'}`}
                  >
                    {task.status === 'Completed' ? <CheckSquare size={16} /> : <Clock size={16} />}
                    {task.status}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
             <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} className="text-gray-200" />
             </div>
             <p className="text-gray-400 font-black tracking-[0.2em] uppercase text-xs">No active assignments on the board</p>
          </div>
        )}
      </div>

      {/* Task Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-2xl relative overflow-hidden animate-slide-up flex flex-col max-h-[95vh]">
             <div className="sbi-gradient px-12 py-10 text-white shrink-0">
               <div className="flex items-center justify-between">
                 <div>
                   <h2 className="text-3xl font-black uppercase tracking-tighter">Strategic Assignment</h2>
                   <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80 mt-1">Deploy New Task Objectives</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors">
                   <X size={32} />
                 </button>
               </div>
             </div>

             <form onSubmit={handleCreateTask} className="p-12 space-y-10 overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Mission Title</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-8 py-5 bg-gray-50 border border-transparent rounded-[2rem] font-black text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300"
                    placeholder="e.g. Dispatched Excellence Drive - North Cell"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Task Protocol</label>
                    <select 
                      className="w-full px-8 py-5 bg-gray-50 border border-transparent rounded-[2rem] font-black text-gray-700 outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none cursor-pointer"
                      value={newTask.type}
                      onChange={(e) => setNewTask({...newTask, type: e.target.value})}
                    >
                      <option value="Calls Target">Calls Target</option>
                      <option value="Selected Target">Selected Target</option>
                      <option value="Dispatched Target">Dispatched Target</option>
                      <option value="Follow-up Target">Follow-up Target</option>
                      <option value="General Admin">General Admin Task</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Target Quantity <span className="font-medium italic">(0 = N/A)</span></label>
                    <input 
                      type="number" 
                      className="w-full px-8 py-5 bg-gray-50 border border-transparent rounded-[2rem] font-black text-blue-600 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                      value={newTask.targetCount}
                      onChange={(e) => setNewTask({...newTask, targetCount: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Severity Level</label>
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-[2rem]">
                       {['Low', 'Medium', 'High'].map(p => (
                         <button 
                           key={p}
                           type="button"
                           onClick={() => setNewTask({...newTask, priority: p})}
                           className={`flex-1 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all ${newTask.priority === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                         >
                           {p}
                         </button>
                       ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Timeline Cutoff</label>
                    <input 
                      required 
                      type="date" 
                      className="w-full px-8 py-5 bg-gray-50 border border-transparent rounded-[2rem] font-black text-gray-700 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Deployment Squad (Members)</label>
                  <div className="grid grid-cols-2 max-h-48 overflow-y-auto gap-4 p-8 bg-gray-50 rounded-[2.5rem] border border-transparent focus-within:border-blue-100 transition-all custom-scrollbar">
                    {employees.length > 0 ? employees.map(emp => (
                      <label key={emp._id} className="flex items-center gap-4 cursor-pointer group">
                        <div className={`relative w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${newTask.assignedTo.includes(emp._id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}>
                          <input 
                            type="checkbox" 
                            className="absolute opacity-0 w-full h-full cursor-pointer"
                            checked={newTask.assignedTo.includes(emp._id)}
                            onChange={(e) => {
                              const list = e.target.checked 
                                ? [...newTask.assignedTo, emp._id]
                                : newTask.assignedTo.filter(id => id !== emp._id);
                              setNewTask({...newTask, assignedTo: list});
                            }}
                          />
                          {newTask.assignedTo.includes(emp._id) && <CheckSquare size={14} className="text-white" />}
                        </div>
                        <span className={`text-xs font-black uppercase tracking-widest ${newTask.assignedTo.includes(emp._id) ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'}`}>
                          {emp.name.split(' ')[0]}
                        </span>
                      </label>
                    )) : (
                      <p className="col-span-2 text-center text-gray-400 font-bold uppercase tracking-widest text-[8px] py-4">No active employees found to assign</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pb-8">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Operations Context (Description)</label>
                   <textarea 
                    className="w-full px-8 py-6 bg-gray-50 border border-transparent rounded-[2.5rem] font-medium text-sm text-gray-600 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all min-h-[120px]"
                    placeholder="Provide specific objectives or instructions for the team..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                   />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting || newTask.assignedTo.length === 0}
                  className="w-full py-6 px-10 text-white sbi-gradient rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-blue-400/20 hover:scale-[1.01] transition-all disabled:opacity-30 flex items-center justify-center gap-4"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : (
                    <>
                      <Zap size={20} className="fill-white" />
                      Commit Assignment
                    </>
                  )}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Global Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </div>
  );
};

export default Tasks;
