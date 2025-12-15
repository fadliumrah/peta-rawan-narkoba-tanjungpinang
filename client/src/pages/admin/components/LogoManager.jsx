import { useState, useEffect } from 'react';
import { getActiveLogo, updateLogo } from '../../../services/api';
import { Upload, Save, Image as ImageIcon } from 'lucide-react';
import Toast from '../../../components/Toast';
import { useToast } from '../../../hooks/useToast';

const LogoManager = () => {
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [formData, setFormData] = useState({
    title: 'BADAN NARKOTIKA NASIONAL',
    subtitle: 'KOTA TANJUNGPINANG',
    image: null
  });
  const { toasts, removeToast, success, error } = useToast();

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    try {
      const response = await getActiveLogo();
      if (response.data.success && response.data.data) {
        const logoData = response.data.data;
        setLogo(logoData);
        setFormData({
          title: logoData.title,
          subtitle: logoData.subtitle,
          image: null
        });
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.image) {
      error('Silakan pilih gambar logo');
      return;
    }

    setUploading(true);

    try {
      const data = new FormData();
      data.append('image', formData.image);
      data.append('title', formData.title);
      data.append('subtitle', formData.subtitle);

      await updateLogo(data);
      success('Logo BNN berhasil diupdate!');
      setPreviewImage(null);
      fetchLogo();
    } catch (err) {
      console.error('Error updating logo:', err);
      error('Gagal update logo: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
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
            <h2 className="text-2xl font-bold mb-1 flex items-center gap-3">
              <ImageIcon size={22} className="text-white" />
              Kelola Logo
            </h2>
            <p className="text-sm opacity-90">Preview logo sesuai tampilan header website</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="font-bold text-xl mb-4 text-gray-800">Preview Logo</h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <div className="flex items-center space-x-4">
              {(previewImage || logo?.image) ? (
                <img
                  src={previewImage || logo.image}
                  alt="Logo BNN"
                  className="h-20 w-20 object-contain"
                />
              ) : (
                <div className="h-20 w-20 bg-gray-200 rounded-lg flex items-center justify-center">
                  <ImageIcon size={32} className="text-gray-400" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold">{formData.title}</h3>
                <p className="text-sm text-gray-600">{formData.subtitle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="font-bold text-xl mb-4 text-gray-800">Update Logo</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Pilih Logo BNN</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input file-input-bordered w-full"
                required
              />
              <label className="label">
                <span className="label-text-alt">Max 2MB (JPG, PNG, SVG recommended)</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Title</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input input-bordered w-full"
                placeholder="BADAN NARKOTIKA NASIONAL"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Subtitle</span>
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="input input-bordered w-full"
                placeholder="KOTA TANJUNGPINANG"
                required
              />
            </div>

            <button
              type="submit"
              className="btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 w-full shadow-lg"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Upload Logo Baru
                </>
              )}
            </button>
          </form>
        </div>
      </div>

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

export default LogoManager;
