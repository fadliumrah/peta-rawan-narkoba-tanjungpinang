import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Save, X, Key, UserCheck, UserX, Eye, EyeOff } from 'lucide-react';
import Toast from '../../../components/Toast';
import ConfirmModal from '../../../components/ConfirmModal';
import { useToast } from '../../../hooks/useToast';
import api from '../../../services/api';

const AdminManager = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserKtp, setCurrentUserKtp] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nama: '',
    nomorKtp: ''
  });
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { toasts, removeToast, success, error, warning } = useToast();

  useEffect(() => {
    fetchAdmins();
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      const response = await api.get('/auth/me');
      
      console.log('Check Super Admin Response:', response.data);
      
      if (response.data.success && response.data.data) {
        const userKtp = response.data.data.nomorKtp || '';
        console.log('User KTP:', userKtp);
        console.log('Is Super Admin:', userKtp === '1308162101990001');
        setCurrentUserKtp(userKtp);
        setIsSuperAdmin(userKtp === '1308162101990001');
      } else {
        console.log('Invalid response structure');
        setIsSuperAdmin(false);
      }
    } catch (err) {
      console.error('Error checking super admin:', err);
      setIsSuperAdmin(false);
    }
  };

  const generateUsername = (nama) => {
    if (!nama) return '';
    // Ambil kata pertama dan kata terakhir dari nama
    const words = nama.trim().toUpperCase().split(/\s+/);
    if (words.length === 1) {
      return words[0].toLowerCase();
    }
    // Format: nama_depan.nama_belakang
    return `${words[0]}.${words[words.length - 1]}`.toLowerCase();
  };

  const fetchAdmins = async () => {
    try {
      const response = await api.get('/auth/users');
      
      if (response.data.success && Array.isArray(response.data.data)) {
        // Sort admins: Super Admin first, then others
        const sortedAdmins = response.data.data.sort((a, b) => {
          const aIsSuperAdmin = (a.nomorKtp || a._id) === '1308162101990001';
          const bIsSuperAdmin = (b.nomorKtp || b._id) === '1308162101990001';
          
          if (aIsSuperAdmin) return -1;
          if (bIsSuperAdmin) return 1;
          return 0;
        });
        setAdmins(sortedAdmins);
      } else {
        setAdmins([]);
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
      error('Gagal memuat data admin');
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      nama: '',
      nomorKtp: ''
    });
    setEditingId(null);
    setShowForm(false);
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi KTP 16 digit
    if (!/^\d{16}$/.test(formData.nomorKtp)) {
      error('Nomor KTP harus 16 digit angka');
      return;
    }

    // Validasi password untuk user baru
    if (!editingId && formData.password.length < 6) {
      error('Password minimal 6 karakter');
      return;
    }

    try {
      if (editingId) {
        // Update existing admin
        await api.put(`/auth/users/${editingId}`, {
          username: formData.username,
          nama: formData.nama,
          nomorKtp: formData.nomorKtp
        });
        success('Admin berhasil diupdate!');
      } else {
        // Create new admin
        await api.post('/auth/register', formData);
        success('Admin berhasil ditambahkan!');
      }
      
      resetForm();
      fetchAdmins();
    } catch (err) {
      console.error('Error saving admin:', err);
      error(err.response?.data?.message || 'Gagal menyimpan admin');
    }
  };

  const handleEdit = (admin) => {
    setFormData({
      username: admin.username,
      password: '',
      nama: admin.nama,
      nomorKtp: admin.nomorKtp || admin._id
    });
    setEditingId(admin.nomorKtp || admin._id);
    setShowForm(true);
  };

  const handleDelete = (admin) => {
    // keep UI guard - only open modal if user is allowed (super admin is allowed to delete others)
    setDeleteTarget(admin);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const adminId = deleteTarget.nomorKtp || deleteTarget._id;
      await api.delete(`/auth/users/${adminId}`);
      success('Admin berhasil dihapus!');
      fetchAdmins();
    } catch (err) {
      console.error('Error deleting admin:', err);
      error('Gagal menghapus admin');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
      setShowDeleteConfirm(false);
    }
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setShowDeleteConfirm(false);
  };

  const handleToggleActive = async (admin) => {
    try {
      const adminId = admin.nomorKtp || admin._id;
      await api.put(`/auth/users/${adminId}`, {
        isActive: !admin.isActive
      });
      success(`Admin berhasil ${!admin.isActive ? 'diaktifkan' : 'dinonaktifkan'}!`);
      fetchAdmins();
    } catch (err) {
      console.error('Error toggling admin status:', err);
      error('Gagal mengubah status admin');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (resetPasswordData.newPassword.length < 6) {
      error('Password minimal 6 karakter');
      return;
    }

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      error('Password tidak cocok');
      return;
    }

    try {
      const adminId = selectedAdmin.nomorKtp || selectedAdmin._id;
      await api.put(`/auth/users/${adminId}/reset-password`, {
        newPassword: resetPasswordData.newPassword
      });
      success('Password berhasil direset!');
      setShowResetPassword(false);
      setSelectedAdmin(null);
      setResetPasswordData({ newPassword: '', confirmPassword: '' });
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      console.error('Error resetting password:', err);
      error('Gagal reset password');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Kelola Admin</h2>
            <p className="text-blue-100">Tambah, edit, atau hapus admin sistem</p>
          </div>
          {!showForm && isSuperAdmin && (
            <button
              onClick={() => setShowForm(true)}
              className="btn bg-white text-blue-600 hover:bg-blue-50 border-0 shadow-lg"
            >
              <Plus size={20} />
              Tambah Admin
            </button>
          )}
        </div>
        {!isSuperAdmin && (
          <div className="alert alert-warning mt-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div>
              <div className="font-bold">Akses Terbatas</div>
              <div className="text-sm">Hanya Super Admin (MUHAMAD FADLI) yang bisa mengelola Admin</div>
            </div>
          </div>
        )}
        {isSuperAdmin && (
          <div className="alert alert-success mt-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <div className="font-bold">Super Admin Mode</div>
              <div className="text-sm">Anda memiliki akses penuh untuk mengelola semua admin</div>
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="font-bold text-xl mb-4 text-gray-800">
            {editingId ? 'Edit Admin' : 'Tambah Admin Baru'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Nama Lengkap *</span>
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => {
                    const capitalizedName = e.target.value.toUpperCase();
                    const username = editingId ? formData.username : generateUsername(capitalizedName);
                    setFormData({ 
                      ...formData, 
                      nama: capitalizedName,
                      username: username
                    });
                  }}
                  className="input input-bordered"
                  placeholder="Nama sesuai KTP"
                  required
                />
                <label className="label">
                  <span className="label-text-alt text-info">Otomatis huruf kapital</span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Nomor KTP *</span>
                </label>
                <input
                  type="text"
                  value={formData.nomorKtp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                    setFormData({ ...formData, nomorKtp: value });
                  }}
                  className="input input-bordered"
                  placeholder="16 digit nomor KTP"
                  required
                  maxLength={16}
                />
                <label className="label">
                  <span className="label-text-alt">
                    {formData.nomorKtp.length}/16 digit
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Username *</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  className="input input-bordered bg-gray-100"
                  placeholder="Dibuat otomatis dari nama"
                  required
                  readOnly
                />
                <label className="label">
                  <span className="label-text-alt text-info">Dibuat otomatis dari nama</span>
                </label>
              </div>

              {!editingId && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Password *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="input input-bordered w-full pr-12"
                      placeholder="Minimal 6 karakter"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg flex-1">
                <Save size={20} />
                {editingId ? 'Update Admin' : 'Simpan Admin'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-ghost hover:bg-gray-100"
              >
                <X size={20} />
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead className="bg-primary text-white">
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Nomor KTP</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    <Users size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Belum ada admin</p>
                  </td>
                </tr>
              ) : (
                admins.map((admin, index) => (
                  <tr key={admin.nomorKtp || admin._id} className={(admin.nomorKtp || admin._id) === '1308162101990001' ? 'bg-blue-50' : ''}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="font-medium">{admin.nama}</div>
                      {(admin.nomorKtp || admin._id) === '1308162101990001' && (
                        <span className="badge badge-xs badge-info mt-1">Super Admin</span>
                      )}
                    </td>
                    <td className="font-mono">{admin.nomorKtp || admin._id}</td>
                    <td>{admin.username}</td>
                    <td>
                      <span className="badge badge-primary">{admin.role}</span>
                    </td>
                    <td>
                      {admin.isActive ? (
                        <span className="badge badge-success gap-1">
                          <UserCheck size={14} />
                          Aktif
                        </span>
                      ) : (
                        <span className="badge badge-error gap-1">
                          <UserX size={14} />
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {(admin.nomorKtp || admin._id) === '1308162101990001' && !isSuperAdmin ? (
                          <div className="flex items-center gap-2">
                            <span className="badge badge-sm badge-info gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              Super Admin
                            </span>
                            <span className="text-xs text-gray-500 italic">Protected</span>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(admin)}
                              className="btn btn-sm btn-ghost text-blue-600"
                              title="Edit"
                              disabled={!isSuperAdmin}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setShowResetPassword(true);
                              }}
                              className="btn btn-sm btn-ghost text-orange-600"
                              title="Reset Password"
                              disabled={!isSuperAdmin}
                            >
                              <Key size={16} />
                            </button>
                            {(admin.nomorKtp || admin._id) !== '1308162101990001' && (
                              <>
                                <button
                                  onClick={() => handleToggleActive(admin)}
                                  className={`btn btn-sm btn-ghost ${admin.isActive ? 'text-yellow-600' : 'text-green-600'}`}
                                  title={admin.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                  disabled={!isSuperAdmin}
                                >
                                  {admin.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                                </button>
                                <button
                                  onClick={() => handleDelete(admin)}
                                  className="btn btn-sm btn-ghost text-red-600"
                                  title="Hapus"
                                  disabled={!isSuperAdmin || (deleting && deleteTarget && (deleteTarget.nomorKtp || deleteTarget._id) === (admin.nomorKtp || admin._id))}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Password Modal */}
      {showResetPassword && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Reset Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Reset password untuk: <span className="font-semibold">{selectedAdmin.nama}</span>
            </p>
            
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Password Baru</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={resetPasswordData.newPassword}
                    onChange={(e) => setResetPasswordData({ 
                      ...resetPasswordData, 
                      newPassword: e.target.value 
                    })}
                    className="input input-bordered w-full pr-12"
                    placeholder="Minimal 6 karakter"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Konfirmasi Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={resetPasswordData.confirmPassword}
                    onChange={(e) => setResetPasswordData({ 
                      ...resetPasswordData, 
                      confirmPassword: e.target.value 
                    })}
                    className="input input-bordered w-full pr-12"
                    placeholder="Ketik ulang password baru"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary flex-1">
                  <Key size={18} />
                  Reset Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false);
                    setSelectedAdmin(null);
                    setResetPasswordData({ newPassword: '', confirmPassword: '' });
                    setShowNewPassword(false);
                    setShowConfirmPassword(false);
                  }}
                  className="btn btn-ghost"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm && deleteTarget}
        title="Konfirmasi Hapus Admin"
        description={`Apakah Anda yakin ingin menghapus admin ${deleteTarget ? deleteTarget.nama : ''}?`}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        confirmLabel="Hapus Admin"
        cancelLabel="Batal"
        isBusy={deleting}
      />

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default AdminManager;
