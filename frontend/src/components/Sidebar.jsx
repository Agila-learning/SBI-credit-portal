import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  PhoneCall, 
  Trophy, 
  LogOut, 
  UserCircle,
  MessageSquare,
  ChevronRight,
  ListTodo,
  Megaphone,
  Coins,
  Settings,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const isTeamLeader = user?.role === 'team_leader';

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Sales Leads', path: '/leads', icon: PhoneCall },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Task Center', path: '/tasks', icon: ListTodo },
    { name: 'Announcements', path: '/announcements', icon: Megaphone },
    { name: 'Messaging', path: '/chat', icon: MessageSquare },
    { name: 'My Profile', path: '/profile', icon: UserCircle },
  ];

  if (isAdmin) {
    navItems.splice(3, 0, { name: 'Team Matrix', path: '/employees', icon: Users });
    navItems.push({ name: 'Incentive Config', path: '/incentive-config', icon: Settings });
    navItems.push({ name: 'Team Report', path: '/team-report', icon: FileSpreadsheet });
  } else if (isTeamLeader) {
    navItems.push({ name: 'My Incentives', path: '/incentives', icon: Coins });
    navItems.push({ name: 'Team Report', path: '/team-report', icon: FileSpreadsheet });
  } else {
    navItems.push({ name: 'My Incentives', path: '/incentives', icon: Coins });
  }

  return (
    <aside className="w-64 bg-white flex flex-col h-screen fixed left-0 top-0 z-50 border-r border-gray-100 shadow-sm">
      {/* Brand */}
      <div className="px-6 py-8 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-lg italic">SBI</span>
          </div>
          <div>
            <h1 className="text-base font-black text-[#1E3A8A] tracking-tight leading-none">Sales Portal</h1>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">v2.0 Audit Mode</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-6 overflow-y-auto space-y-7">
        {[
          {
            title: 'Overview',
            items: navItems.filter(i => ['Dashboard', 'Sales Leads', 'Leaderboard', 'Team Matrix'].includes(i.name))
          },
          {
            title: 'Workspace',
            items: navItems.filter(i => ['Task Center', 'Announcements', 'Messaging', 'My Profile'].includes(i.name))
          },
          {
            title: 'Performance',
            items: navItems.filter(i => ['My Incentives', 'Incentive Config'].includes(i.name))
          },
          (isAdmin || isTeamLeader) && {
            title: 'Reports',
            items: navItems.filter(i => ['Team Report'].includes(i.name))
          }
        ].filter(s => s && s.items.length > 0).map((section, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-4 text-[10px] font-black text-[#1E3A8A] opacity-40 uppercase tracking-[0.2em] mb-3">
              {section.title}
            </p>
            {section.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150 group relative
                    ${isActive 
                      ? 'bg-[#DBEAFE] text-[#1E3A8A] font-black border-l-4 border-l-[#2563EB] pl-3' 
                      : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50 font-bold border-l-4 border-l-transparent pl-3'
                    }`}
                >
                  <item.icon 
                    size={18} 
                    className={`shrink-0 transition-transform duration-150 ${isActive ? 'text-[#2563EB] scale-110' : 'group-hover:scale-105'}`} 
                  />
                  <span className={`text-[13px] tracking-tight ${isActive ? 'font-black text-[#1E3A8A]' : ''}`}>
                    {item.name}
                  </span>
                  {isActive && (
                    <ChevronRight size={14} className="ml-auto text-[#2563EB] opacity-60" />
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Card */}
      <div className="px-4 pb-6 border-t border-gray-100 pt-4">
        <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] flex items-center justify-center overflow-hidden border border-blue-100">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <span className="text-[#2563EB] font-black text-base">
                    {user?.name?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white ring-1 ring-green-200" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black text-gray-900 truncate leading-tight">{user?.name}</p>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all duration-150 active:scale-95 shadow-sm"
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
