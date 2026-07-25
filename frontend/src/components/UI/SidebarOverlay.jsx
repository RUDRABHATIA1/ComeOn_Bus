import React from 'react';

export function SidebarOverlay({ isSidebarOpen, setIsSidebarOpen }) {
  if (!isSidebarOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[990] sm:hidden backdrop-blur-sm transition-opacity duration-300"
      onClick={() => setIsSidebarOpen(false)}
    />
  );
}
