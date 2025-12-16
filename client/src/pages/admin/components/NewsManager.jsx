import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { 
  getAllNews, 
  createNews, 
  updateNews, 
  deleteNews 
} from '../../../services/api';
import { formatDateTime } from '../../../utils/dateFormatter';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Eye,
  Image as ImageIcon
} from 'lucide-react';
import Toast from '../../../components/Toast';
import ConfirmModal from '../../../components/ConfirmModal';
import { useToast } from '../../../hooks/useToast';

const NewsManager = () => {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    image: null,
    content: '',
    isPublished: true
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [publishTarget, setPublishTarget] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [showFormDraftConfirm, setShowFormDraftConfirm] = useState(false);
  const [showFormPublishConfirm, setShowFormPublishConfirm] = useState(false);
  const [formPublishTarget, setFormPublishTarget] = useState(null);
  const [formPublishing, setFormPublishing] = useState(false);
  const { toasts, removeToast, success, error } = useToast();

  // Quill modules configuration
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ]
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet',
    'indent',
    'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ];

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      // Admin dapat melihat semua berita termasuk draft
      const response = await getAllNews(1, 100, true);
      if (response.data.success) {
        setNewsList(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Fungsi untuk auto-uppercase - SEMUA HURUF JADI KAPITAL
  const capitalizeText = (text) => {
    if (!text) return '';
    // Ubah semua huruf jadi KAPITAL/UPPERCASE
    return text.toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('content', formData.content);
      data.append('isPublished', formData.isPublished);
      
      if (formData.image) {
        data.append('image', formData.image);
      }

      if (editingId) {
        await updateNews(editingId, data);
        setFormData({ ...formData, isPublished: formPublishTarget });
        success('Berita berhasil diupdate!');
      } else {
        if (!formData.image) {
          error('Gambar berita wajib diisi!');
          setSubmitting(false);
          return;
        }
        await createNews(data);
        success('Berita berhasil ditambahkan!');
      }
      
      resetForm();
      fetchNews();
    } catch (err) {
      console.error('Error saving news:', err);
      error('Gagal menyimpan berita: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormTogglePublish = (checked) => {
    // Show confirmation when user toggles publish state (either direction).
    if (checked === formData.isPublished) return;
    setFormPublishTarget(checked);
    setShowFormPublishConfirm(true);
  };

  const confirmFormPublish = async () => {
    setShowFormDraftConfirm(false);
    setShowFormPublishConfirm(false);
    // If editing an existing news, persist change immediately
    if (editingId) {
      const prevPublished = formData.isPublished;
      // Optimistically update UI
      setFormData({ ...formData, isPublished: formPublishTarget });
      setFormPublishing(true);
      try {
        const data = new FormData();
        data.append('title', formData.title);
        data.append('content', formData.content);
        data.append('isPublished', formPublishTarget);
        if (formData.image) data.append('image', formData.image);
        await updateNews(editingId, data);
        success(`Berita berhasil ${formPublishTarget ? 'dipublikasikan' : 'dijadikan draft'}!`);
        fetchNews();
      } catch (err) {
        // Revert optimistic update on failure
        setFormData({ ...formData, isPublished: prevPublished });
        console.error('Error updating publish status for form:', err);
        error('Gagal mengubah status publikasi');
      } finally {
        setFormPublishing(false);
      }
    } else {
      setFormData({ ...formData, isPublished: formPublishTarget });
      success(`Berita berhasil ${formPublishTarget ? 'dipublikasikan' : 'dijadikan draft'}!`);
    }
    setFormPublishTarget(null);
  };

  const cancelFormPublish = () => {
    setShowFormDraftConfirm(false);
    setShowFormPublishConfirm(false);
    setFormPublishTarget(null);
  };

  const handleEdit = (news) => {
    setFormData({
      title: news.title,
      image: null,
      content: news.content,
      isPublished: news.isPublished
    });
    setImagePreview(news.image);
    setEditingId(news._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const doTogglePublish = async (news, newPublishState) => {
    try {
      const data = new FormData();
      data.append('title', news.title);
      data.append('content', news.content);
      data.append('isPublished', newPublishState);
      
      await updateNews(news._id, data);
      success(`Berita berhasil ${newPublishState ? 'dipublikasikan' : 'dijadikan draft'}!`);
      fetchNews();
    } catch (err) {
      console.error('Error toggling publish status:', err);
      error('Gagal mengubah status publikasi');
    }
  };

  const handleTogglePublish = (news) => {
    const newState = !news.isPublished;
    setPublishTarget({ news, newState });
    setShowPublishConfirm(true);
  };

  const handleDelete = (newsItem) => {
    setDeleteTarget(newsItem);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteNews(deleteTarget._id);
      success('Berita berhasil dihapus!');
      fetchNews();
    } catch (err) {
      console.error('Error deleting news:', err);
      error('Gagal menghapus berita');
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

  

  const confirmPublish = async () => {
    if (!publishTarget) return;
    setPublishing(true);
    try {
      await doTogglePublish(publishTarget.news, publishTarget.newState);
    } catch (err) {
      // doTogglePublish handles errors
    } finally {
      setPublishing(false);
      setPublishTarget(null);
      setShowPublishConfirm(false);
    }
  };

  const cancelPublish = () => {
    setPublishing(false);
    setPublishTarget(null);
    setShowPublishConfirm(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      image: null,
      content: '',
      isPublished: true
    });
    setImagePreview(null);
    setEditingId(null);
    setShowForm(false);
  };

  const stripHtml = (html) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  const publishedCount = newsList.filter(n => n.isPublished).length;
  const draftCount = newsList.filter(n => !n.isPublished).length;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-4 md:p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Kelola Berita</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <p className="text-blue-100">📊 Total: {newsList.length} berita</p>
              <p className="text-green-200">✓ Published: {publishedCount}</p>
              <p className="text-yellow-200">📝 Draft: {draftCount}</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn bg-white text-blue-600 hover:bg-blue-50 border-0 shadow-lg mt-2 md:mt-0"
          >
            {showForm ? <X size={20} /> : <Plus size={20} />}
            <span className="ml-2 hidden sm:inline">{showForm ? 'Tutup Form' : 'Tambah Berita'}</span>
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="font-bold text-xl mb-4 text-gray-800">
            {editingId ? 'Edit Berita' : 'Tambah Berita Baru'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Preview */}
            {imagePreview && (
              <div className="mb-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-w-md h-48 object-cover rounded-lg"
                />
              </div>
            )}

            <div className="form-control">
              <label className="label" htmlFor="news-image">
                <span className="label-text font-semibold">
                  Gambar Berita {!editingId && <span className="text-error"></span>}
                </span>
              </label>
              <input
                id="news-image"
                name="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input file-input-bordered w-full"
                required={!editingId}
              />
              <p className="label-text-alt">Max 5MB (JPG, PNG, WebP)</p>
            </div>

            <div className="form-control">
              <label className="label" htmlFor="news-title">
                <span className="label-text font-semibold">Judul Berita</span>
              </label>
              <input
                id="news-title"
                name="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: capitalizeText(e.target.value) })}
                className="input input-bordered w-full"
                placeholder="Masukkan judul berita"
                required
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor="news-content">
                <span className="label-text font-semibold">Isi Berita</span>
              </label>
              <div className="border rounded-lg">
                <ReactQuill
                  id="news-content"
                  theme="snow"
                  value={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                  modules={modules}
                  formats={formats}
                  placeholder="Tulis isi berita di sini..."
                  style={{ minHeight: '300px' }}
                />
              </div>
            </div>

            <div className="form-control bg-blue-50 p-4 rounded-lg border border-blue-200">
              <label className="label cursor-pointer justify-start space-x-3">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => handleFormTogglePublish(e.target.checked)}
                  className="checkbox checkbox-primary"
                />
                <div>
                  <span className="label-text font-semibold text-base">Publikasikan Berita</span>
                  <p className="text-xs text-gray-600 mt-1">
                    {formData.isPublished 
                      ? '✓ Berita akan langsung tampil di halaman user' 
                      : '⚠ Berita disimpan sebagai draft (tidak tampil di halaman user)'}
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-2">
              <button 
                type="submit" 
                className="btn btn-primary flex-1"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    {editingId ? 'Update Berita' : 'Simpan Berita'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-ghost"
              >
                <X size={20} />
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* News List */}
      <div className="grid grid-cols-1 gap-4">
        {newsList.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow-md text-center">
            <p className="text-gray-500">Belum ada berita</p>
          </div>
        ) : (
          newsList.map((news) => (
            <div key={news._id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="flex flex-col md:flex-row items-start">
                <div className="w-full md:w-48 h-32 md:h-32 flex-shrink-0 overflow-hidden bg-gray-100 rounded-md">
                  <img
                    src={news.image}
                    alt={news.title}
                    className="w-full h-full object-cover block"
                    style={{ aspectRatio: '16/9' }}
                  />
                </div>
                <div className="flex-1 p-4 md:p-6">
                  <div className="mb-2 flex flex-col gap-2">
                    <h3 className="text-lg md:text-xl font-bold text-gray-800 break-words whitespace-pre-line">
                      {news.title}
                    </h3>
                    <div className="flex flex-row flex-wrap gap-2 mt-1">
                      <button
                        onClick={() => handleTogglePublish(news)}
                        className={`btn btn-xs md:btn-sm ${news.isPublished ? 'btn-warning' : 'btn-success'}`}
                        title={news.isPublished ? 'Jadikan Draft' : 'Publikasikan'}
                      >
                        {news.isPublished ? '📝' : '✓'}
                      </button>
                      <button
                        onClick={() => handleEdit(news)}
                        className="btn btn-xs md:btn-sm btn-ghost"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(news)}
                        className="btn btn-xs md:btn-sm btn-ghost text-error"
                        title="Hapus"
                        disabled={deleting && deleteTarget && deleteTarget._id === news._id}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-xs md:text-sm text-gray-600 mb-3 items-center">
                    <span>📅 {formatDateTime(news.createdAt)}</span>
                    <span>✍️ {news.createdBy?.nama || news.editor || 'Unknown'}</span>
                    <span className="flex items-center gap-1">
                      <Eye size={14} />
                      {news.views} views
                    </span>
                    <span className={`badge ${news.isPublished ? 'badge-success' : 'badge-warning'}`}>
                      {news.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 text-sm line-clamp-3 break-words">
                    {stripHtml(news.content)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm && deleteTarget}
        title="Konfirmasi Hapus Berita"
        description={deleteTarget ? `Apakah Anda yakin ingin menghapus berita "${deleteTarget.title}"?` : ''}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        confirmLabel="Hapus Berita"
        cancelLabel="Batal"
        isBusy={deleting}
        busyLabel="Menghapus..."
      />

      {/* Confirm Publish/Draft Modal (List-level) */}
      <ConfirmModal
        isOpen={showPublishConfirm && publishTarget}
        title={publishTarget !== null ? (publishTarget.newState ? 'Konfirmasi Publikasikan' : 'Konfirmasi Jadikan Draft') : 'Konfirmasi'}
        description={publishTarget !== null ? (publishTarget.newState ? `Apakah Anda yakin ingin mempublikasikan berita "${publishTarget.news.title}"?` : `Apakah Anda yakin ingin menjadikan berita "${publishTarget.news.title}" sebagai draft?`) : ''}
        onCancel={cancelPublish}
        onConfirm={confirmPublish}
        confirmLabel={publishTarget ? (publishTarget.newState ? 'Publikasikan' : 'Jadikan Draft') : 'Konfirmasi'}
        cancelLabel="Batal"
        isBusy={publishing}
        busyLabel={publishTarget ? (publishTarget.newState ? 'Mempublikasikan...' : 'Menjadikan Draft...') : 'Memproses...'}
        confirmClassName={publishTarget ? (publishTarget.newState ? 'btn btn-primary' : 'btn btn-ghost') : 'btn'}
      />
      {/* Confirm Publish/Draft Modal (Form-level) */}
      <ConfirmModal
        isOpen={showFormPublishConfirm}
        title={formPublishTarget !== null ? (formPublishTarget ? 'Konfirmasi Publikasikan' : 'Konfirmasi Jadikan Draft') : 'Konfirmasi'}
        description={formPublishTarget !== null ? (formPublishTarget ? 'Apakah Anda yakin ingin mempublikasikan berita ini?' : 'Apakah Anda yakin ingin menjadikan berita ini sebagai draft?') : ''}
        onCancel={cancelFormPublish}
        onConfirm={confirmFormPublish}
        confirmLabel={formPublishTarget ? 'Publikasikan' : 'Jadikan Draft'}
        cancelLabel="Batal"
        isBusy={formPublishing}
        busyLabel={formPublishTarget !== null ? (formPublishTarget ? 'Mempublikasikan...' : 'Menjadikan Draft...') : 'Memproses...'}
        confirmClassName={formPublishTarget ? 'btn btn-primary' : 'btn btn-ghost'}
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

export default NewsManager;
