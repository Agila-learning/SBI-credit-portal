import React from 'react';

const KPICard = ({ title, value, icon: Icon, color = 'blue', subtitle }) => {
  const config = {
    blue: {
      border: 'border-t-[var(--stage-called)]',
      icon: 'bg-blue-50 text-[var(--stage-called)]',
      value: 'text-blue-700',
      label: 'text-blue-400',
      glow: 'shadow-blue-100',
    },
    green: {
      border: 'border-t-[var(--stage-selected)]',
      icon: 'bg-green-50 text-[var(--stage-selected)]',
      value: 'text-green-700',
      label: 'text-green-400',
      glow: 'shadow-green-100',
    },
    red: {
      border: 'border-t-[var(--stage-rejected)]',
      icon: 'bg-red-50 text-[var(--stage-rejected)]',
      value: 'text-red-700',
      label: 'text-red-400',
      glow: 'shadow-red-100',
    },
    orange: {
      border: 'border-t-[var(--stage-dispatched)]',
      icon: 'bg-orange-50 text-[var(--stage-dispatched)]',
      value: 'text-orange-700',
      label: 'text-orange-400',
      glow: 'shadow-orange-100',
    },
    gold: {
      border: 'border-t-amber-500',
      icon: 'bg-amber-50 text-amber-600',
      value: 'text-amber-700',
      label: 'text-amber-400',
      glow: 'shadow-amber-100',
    },
  };

  const c = config[color] || config.blue;

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 border-t-4 ${c.border} p-6 shadow-md ${c.glow} hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-default group`}
    >
      <div className="flex items-start justify-between mb-5">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.icon} shadow-sm`}>
          <Icon size={22} />
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className={`text-4xl font-black ${c.value} leading-none tracking-tight`}>{value}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-2 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
};

export default KPICard;
