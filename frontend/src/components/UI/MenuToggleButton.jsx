import React from 'react';

export function MenuToggleButton({ isSidebarOpen, setIsSidebarOpen }) {
  if (isSidebarOpen) return null;

  return (
    <button 
      onClick={() => setIsSidebarOpen(true)}
      className="absolute top-4 left-4 z-[900] bg-slate-900/90 text-white p-3 rounded-xl shadow-lg border border-slate-700 backdrop-blur-md hover:bg-slate-800 transition-colors"
      title="Open Sidebar"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    </button>
  );
}
