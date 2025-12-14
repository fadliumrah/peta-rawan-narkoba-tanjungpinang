import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getUserInfo } from '../../utils/auth';
import { 
  LogOut, 
  Image as ImageIcon, 
  MapPin, 
  Newspaper,
  Menu,
  X,
  Users,
  AlertTriangle
} from 'lucide-react';

// Import tab components
import BannerManager from './components/BannerManager';
import LogoManager from './components/LogoManager';
import LocationManager from './components/LocationManager';
import NewsManager from './components/NewsManager';
import AdminManager from './components/AdminManager';
import AdminSidebar from './components/AdminSidebar';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const user = getUserInfo();
  const [activeTab, setActiveTab] = useState('banner');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  const [footerHeight, setFooterHeight] = useState(0);

  useEffect(() => {
    function setHeights() {
      const h = headerRef.current?.offsetHeight || 64;
      const f = footerRef.current?.offsetHeight || 0;
      setHeaderHeight(h);
      setFooterHeight(f);
      document.documentElement.style.setProperty('--admin-header-height', `${h}px`);
      document.documentElement.style.setProperty('--admin-footer-height', `${f}px`);
    }

    setHeights();
    const ro = new ResizeObserver(setHeights);
    if (headerRef.current) ro.observe(headerRef.current);
    if (footerRef.current) ro.observe(footerRef.current);
    window.addEventListener('resize', setHeights);
    return () => {
      if (ro) {
        if (headerRef.current) ro.unobserve(headerRef.current);
        if (footerRef.current) ro.unobserve(footerRef.current);
        ro.disconnect();
      }
      window.removeEventListener('resize', setHeights);
    };
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const tabs = [
    { id: 'banner', label: 'Banner', icon: ImageIcon, component: BannerManager },
    { id: 'logo', label: 'Logo BNN', icon: ImageIcon, component: LogoManager },
    { id: 'locations', label: 'Titik Lokasi', icon: MapPin, component: LocationManager },
    { id: 'news', label: 'Kelola Berita', icon: Newspaper, component: NewsManager },
    { id: 'admins', label: 'Kelola Admin', icon: Users, component: AdminManager },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col">
      {/* Header */}
      <header ref={headerRef} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-expanded={sidebarOpen}
                aria-controls="admin-sidebar"
                className="lg:hidden btn btn-ghost btn-xs hover:bg-white/20"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-xs opacity-90 font-medium">Peta Rawan Narkoba Kota Tanjungpinang</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-2 bg-white/15 px-3 py-2 rounded-lg backdrop-blur-md border border-white/20 shadow-lg">
                <div className="flex flex-col items-center justify-center w-9 h-9 bg-white/20 rounded-lg">
                  <Users size={16} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white leading-tight">{user?.nama || user?.username}</p>
                  <p className="text-[10px] text-blue-100 font-mono tracking-wide">{user?.nomorKtp || '-'}</p>
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-blue-500/30 text-[9px] text-white font-semibold uppercase tracking-widest rounded">
                    {user?.role}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-ghost btn-xs hover:bg-white/20 gap-1.5 text-white"
              >
                <LogOut size={16} />
                <span className="hidden md:inline text-sm font-semibold">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar (moved to component) */}
        <AdminSidebar
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          headerHeight={headerHeight}
        />

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto lg:ml-64 admin-main">
          <div className="max-w-7xl mx-auto">
            {ActiveComponent && <ActiveComponent />}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer ref={footerRef} className="bg-gradient-to-r from-slate-800 to-slate-900 text-white mt-auto border-t border-slate-700 z-50">
        <div className="px-4 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
              <div>
                <p className="text-sm text-gray-300 font-medium">
                  © {new Date().getFullYear()} BNN Kota Tanjungpinang
                </p>
                <p className="text-xs text-gray-400">Sistem Informasi Pemetaan Rawan Narkoba</p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Custom Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4 rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertTriangle size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Konfirmasi Logout</h3>
                  <p className="text-sm opacity-90">Pastikan data sudah tersimpan</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <p className="text-gray-700 text-base leading-relaxed mb-2">
                Apakah Anda yakin ingin keluar dari dashboard?
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mt-4">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ Pastikan semua perubahan sudah disimpan
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Data yang belum disimpan akan hilang
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 pb-6 flex space-x-3">
              <button
                onClick={cancelLogout}
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <LogOut size={18} />
                <span>Ya, Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
