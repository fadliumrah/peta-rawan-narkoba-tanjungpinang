import { useState, useEffect, useRef } from 'react';
import { getActiveBanner, updateBanner, updateBannerCaption } from '../../../services/api';
import { Upload, Save, Image as ImageIcon, X, Move } from 'lucide-react';
import Toast from '../../../components/Toast';
import { useToast } from '../../../hooks/useToast';

const BannerManager = () => {
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [formData, setFormData] = useState({
    caption: '',
    location: 'Kota Tanjungpinang',
    image: null,
    imageFit: 'cover'
  });
  const { toasts, removeToast, success, error } = useToast();
  const fileInputRef = useRef(null);
  const previewRef = useRef(null);

  useEffect(() => {
    fetchBanner();
  }, []);

  const fetchBanner = async () => {
    try {
      const response = await getActiveBanner();
      if (response.data.success && response.data.data) {
        const bannerData = response.data.data;
        setBanner(bannerData);
        setFormData({
          caption: bannerData.caption,
          location: bannerData.location,
          image: null,
          imageFit: bannerData.imageFit || 'cover'
        });
      }
    } catch (error) {
      console.error('Error fetching banner:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validasi ukuran file (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        error('Ukuran file terlalu besar! Maksimal 5MB');
        e.target.value = '';
        return;
      }
      
      // Validasi tipe file
      if (!file.type.startsWith('image/')) {
        error('File harus berupa gambar!');
        e.target.value = '';
        return;
      }
      
      setFormData({ ...formData, image: file });
      setPreviewImage(URL.createObjectURL(file));
      setImagePosition({ x: 50, y: 50 }); // Reset position
    }
  };

  // Drag handlers: start handled on container, mousemove/mouseup attached in effect

  const handleClearImage = () => {
    setFormData({ ...formData, image: null });
    setPreviewImage(null);
    setImagePosition({ x: 50, y: 50 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMouseDown = (e) => {
    if (previewImage || banner?.image) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - (imagePosition.x * e.currentTarget.offsetWidth / 100),
        y: e.clientY - (imagePosition.y * e.currentTarget.offsetHeight / 100)
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      const x = ((e.clientX - dragStart.x) / rect.width) * 100;
      const y = ((e.clientY - dragStart.y) / rect.height) * 100;
      setImagePosition({
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const data = new FormData();
      data.append('caption', formData.caption);
      data.append('location', formData.location);
      data.append('imageFit', formData.imageFit);
      // append image position so backend can persist it
      data.append('imagePosition', JSON.stringify(imagePosition));
      
      if (formData.image) {
        data.append('image', formData.image);
        await updateBanner(data);
        success('Banner berhasil diupdate!');
        handleClearImage();
        fetchBanner();
      } else if (banner) {
        // Update caption and settings only
        await updateBannerCaption(banner._id, {
          caption: formData.caption,
          location: formData.location,
          imageFit: formData.imageFit,
          imagePosition: imagePosition
        });
        success('Pengaturan banner berhasil diupdate!');
        fetchBanner();
      } else {
        error('Silakan pilih gambar banner');
      }
    } catch (err) {
      console.error('Error updating banner:', err);
      error('Gagal update banner: ' + (err.response?.data?.message || err.message));
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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">📸 Kelola Banner</h2>
        <p className="text-blue-50">Preview banner sesuai tampilan di halaman user</p>
      </div>

      {/* Preview Banner - Ukuran Sama dengan Halaman User */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
          <ImageIcon size={20} className="text-blue-600" />
          Preview Banner Desktop
        </h3>
        
        {(banner && banner.image) || previewImage ? (
          <div>
            {/* Preview Banner - Rasio sama dengan halaman user (Desktop) */}
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                <span className="text-xs text-gray-500 bg-blue-50 px-3 py-1 rounded-full">Rasio sama dengan halaman user</span>
              </p>
            </div>

            {/* Preview dengan container dan rasio 100% sama dengan halaman user */}
            <div className="bg-gray-100 rounded-lg p-4">
              {/* Container sama dengan HomePage: container mx-auto px-4 */}
              <div className="container mx-auto px-4">
                <div
                  className="relative w-full rounded-lg overflow-hidden shadow-xl h-[175px] group select-none"
                  ref={previewRef}
                  style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                  onMouseDown={e => {
                    // start dragging to change objectPosition
                    setIsDragging(true);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDragStart({
                      x: e.clientX - (imagePosition.x * rect.width / 100),
                      y: e.clientY - (imagePosition.y * rect.height / 100)
                    });
                  }}
                >
                  <img
                    src={previewImage || banner.image}
                    alt="Banner Preview"
                    className="w-full h-full"
                    style={{ 
                      objectFit: formData.imageFit || 'cover',
                      objectPosition: `${imagePosition.x}% ${imagePosition.y}%`
                    }}
                    draggable={false}
                  />
                  <div className="absolute left-2 top-2 bg-white/80 rounded px-2 py-1 text-xs text-gray-700 shadow">
                    Posisi: X {Math.round(imagePosition.x)}% | Y {Math.round(imagePosition.y)}%
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                    <h2 className="text-white text-xl font-bold mb-1 drop-shadow-lg">
                      {formData.caption || 'NARKOBA ADALAH MUSUH BERSAMA'}
                    </h2>
                    <p className="text-white/90 text-sm drop-shadow">
                      {formData.location || 'Kota Tanjungpinang'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3 italic text-center">
              ✓ Preview dengan container yang sama (container mx-auto px-4) - rasio tinggi-lebar identik dengan halaman user
            </p>
            <p className="text-sm text-gray-600 mt-2 text-center">
              Tip: <span className="font-semibold">Klik dan geser gambar pada preview</span> untuk menyesuaikan posisi fokus (drag). Setelah selesai, klik "Simpan Pengaturan" atau upload untuk menyimpan posisi.
            </p>
          </div>
        ) : (
          <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
              <p className="font-semibold">Belum ada banner</p>
              <p className="text-sm">Upload gambar untuk melihat preview</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Form */}

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
            <Upload size={20} className="text-blue-600" />
            Update Banner
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Pilih Gambar Banner</span>
              </label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file-input file-input-bordered w-full"
                />
                {formData.image && (
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="btn btn-ghost btn-square"
                    title="Hapus gambar"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
              <label className="label">
                <span className="label-text-alt">
                  Max 5MB • Rekomendasi: 1200x400px • Format: JPG, PNG, WebP
                  {formData.image && (
                    <span className="text-success ml-2">✓ Gambar siap diupload</span>
                  )}
                </span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Caption</span>
              </label>
              <input
                type="text"
                value={formData.caption}
                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                className="input input-bordered w-full"
                placeholder="Informasi Area Rawan Narkoba"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Lokasi</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="input input-bordered w-full"
                placeholder="Kota Tanjungpinang"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Tampilan Gambar</span>
              </label>
              <select
                value={formData.imageFit}
                onChange={(e) => setFormData({ ...formData, imageFit: e.target.value })}
                className="select select-bordered w-full"
              >
                <option value="cover">Cover - Isi penuh (potong jika perlu)</option>
                <option value="contain">Contain - Tampilkan semua (ada ruang kosong)</option>
                <option value="fill">Fill - Regangkan gambar</option>
                <option value="scale-down">Scale Down - Kecilkan jika terlalu besar</option>
              </select>
              <label className="label">
                <span className="label-text-alt text-gray-500">
                  {formData.imageFit === 'cover' && '📸 Gambar akan memenuhi area tanpa distorsi (recommended)'}
                  {formData.imageFit === 'contain' && '🖼️ Gambar ditampilkan utuh dengan latar belakang'}
                  {formData.imageFit === 'fill' && '↔️ Gambar diregangkan memenuhi area'}
                  {formData.imageFit === 'scale-down' && '🔽 Gambar diperkecil jika terlalu besar'}
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 w-full shadow-md hover:shadow-lg transition-all"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Uploading...
                </>
              ) : (
                <>
                  {formData.image ? <Upload size={20} /> : <Save size={20} />}
                  {formData.image ? '📤 Update Caption' : '💾 Simpan Pengaturan'}
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

export default BannerManager;
