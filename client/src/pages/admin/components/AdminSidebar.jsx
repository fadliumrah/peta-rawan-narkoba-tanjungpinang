import React from 'react';
import { Bell } from 'lucide-react';
// no direct icon imports here; icons are provided by the tabs

const AdminSidebar = ({ tabs, activeTab, setActiveTab, sidebarOpen, setSidebarOpen, headerHeight }) => {
  // Inline style using CSS vars for top/bottom to avoid header/footer overlaps
  const inlineStyle = {
    // Respect header height, but allow sidebar to go to the full bottom of the viewport
    top: `var(--admin-header-height, ${headerHeight || 64}px)`,
    bottom: `0px`,
    height: `calc(100vh - var(--admin-header-height, ${headerHeight || 64}px))`
  };

  return (
    <aside
      id="admin-sidebar"
      className={`
        fixed lg:fixed inset-y-0 left-0 z-40 w-64 bg-white backdrop-blur-md
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        border-r border-gray-200 shadow-xl
      `}
      style={inlineStyle}
      >
      {/* user info removed per request */}
        {/* mobile user info removed per request */}

      <nav role="navigation" aria-label="Admin menu" className="p-4 space-y-2 overflow-y-auto h-full">
        {tabs.map((tab) => {
          // Use Bell icon for notifications tab for consistent UX
          const Icon = tab.id === 'notifications' ? Bell : tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSidebarOpen(false);
              }}
              className={`
                w-full flex items-center space-x-3 px-4 py-3 rounded-xl
                transition-all duration-200 font-medium
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'hover:bg-blue-50 text-gray-700 hover:text-blue-700'
                }
              `}
            >
              <Icon size={20} className={`${activeTab === tab.id ? 'text-white' : 'text-gray-600'}`} />
              <span className="font-medium">{tab.label}</span>
              {tab.unreadCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-600 text-white">
                  {tab.unreadCount > 99 ? '99+' : tab.unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};


export default AdminSidebar;
