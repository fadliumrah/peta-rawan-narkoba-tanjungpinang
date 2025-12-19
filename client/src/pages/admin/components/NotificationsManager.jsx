import { useEffect, useState } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../../services/api';
import Toast from '../../../components/Toast';
import { useToast } from '../../../hooks/useToast';
import { Check, X, AlertTriangle } from 'lucide-react';

const NotificationsManager = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const { info, success, error } = useToast();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await getNotifications();
      if (res.data.success) setNotifications(res.data.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      error('Gagal memuat notifikasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleCheck = async (id) => {
    try {
      await markNotificationRead(id);
      success('Ditandai sudah dibaca');
      await fetchNotifications();
      // notify other components (badge, bell, sidebar) to refresh
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error('Failed to mark read', err);
      error('Gagal menandai notifikasi');
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      success('Semua notifikasi ditandai sudah dibaca');
      await fetchNotifications();
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error('Failed to mark all', err);
      error('Gagal menandai semua');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Notifikasi</h3>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowConfirm(true)} className="btn btn-sm btn-error text-white flex items-center gap-2" title="Tandai semua notifikasi sebagai dibaca untuk akun Anda">
                <AlertTriangle size={14} />
                <span className="hidden sm:inline">Semua</span>
                <span className="sm:hidden">Tandai semua</span>
              </button>
              <button onClick={fetchNotifications} className="btn btn-sm btn-outline">Refresh</button>
            </div>
            <p className="text-xs text-gray-500 mt-1 sm:mt-0">Akan menandai semua notifikasi sebagai dibaca untuk akun Anda.</p>
          </div>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in duration-200">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4 rounded-t-2xl">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Konfirmasi: Tandai Semua Dibaca</h3>
                    <p className="text-sm opacity-90">Aksi ini akan menandai semua notifikasi sebagai sudah dibaca untuk akun Anda.</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6">
                <p className="text-sm text-gray-700">Lanjutkan menandai semua notifikasi sebagai dibaca?</p>
              </div>

              <div className="px-6 pb-6 flex space-x-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  onClick={async () => { await handleMarkAll(); setShowConfirm(false); }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  <span>Ya, Tandai Semua</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-4 text-center">Memuat...</div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-600">Tidak ada notifikasi</div>
        ) : (
          <div className="divide-y">
            {notifications.map((n) => (
              <div key={n._id} className={`p-4 ${n.isRead ? '' : 'bg-blue-50'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{n.message}</div>
                    <div className="text-xs text-gray-600 mt-1">{n.createdByName ? `Oleh ${n.createdByName}` : ''}{n.createdAt && ` • ${new Date(n.createdAt).toLocaleString()}`}</div>

                    {n.payload && (n.payload.locations || n.payload.locationId || n.payload.newsId) && (
                      <ul className="mt-2 list-disc list-inside text-sm text-gray-700">
                        {Array.isArray(n.payload.locations) && n.payload.locations.length > 0 ? (
                          n.payload.locations.map((item, idx) => (
                            <li key={idx}>{item.kelurahan ? `${item.kelurahan} — ` : ''}{item.latitude && item.longitude ? `${Number(item.latitude).toFixed(6)}, ${Number(item.longitude).toFixed(6)}` : JSON.stringify(item)}</li>
                          ))
                        ) : n.payload.locationId ? (
                          <li>{n.payload.kelurahan ? `${n.payload.kelurahan} — ` : ''}{n.payload.latitude && n.payload.longitude ? `${Number(n.payload.latitude).toFixed(6)}, ${Number(n.payload.longitude).toFixed(6)}` : `ID: ${n.payload.locationId}`}</li>
                        ) : n.payload.newsId ? (
                          <li>{n.payload.title ? n.payload.title : `ID: ${n.payload.newsId}`}</li>
                        ) : (
                          <li>{JSON.stringify(n.payload)}</li>
                        )}
                      </ul>
                    )}

                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={async () => {
                        await handleCheck(n._id);
                      }}
                      className={`btn btn-sm ${n.isRead ? 'btn-outline' : 'btn-primary text-white'}`}
                      aria-pressed={!!n.isRead}
                      aria-label={n.isRead ? 'Tandai Sudah Dibaca' : 'Tandai sudah dibaca'}
                    >
                      <Check size={14} />
                      <span className="ml-2 text-xs">{n.isRead ? 'Dibaca' : 'Tandai Sudah dibaca'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toasts handled globally - nothing extra here */}
    </div>
  );
};

export default NotificationsManager;
