import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  getAllLocations, 
  createLocation, 
  updateLocation, 
  deleteLocation 
} from '../../../services/api';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MapPin, 
  Navigation, 
  Save, 
  X 
} from 'lucide-react';
import Toast from '../../../components/Toast';
import ConfirmModal from '../../../components/ConfirmModal';
import { useToast } from '../../../hooks/useToast';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const kelurahanList = [
  'Dompak',
  'Sei Jang',
  'Tanjung Ayun Sakti',
  'Tanjungpinang Timur',
  'Tanjung Unggat',
  'Bukit Cermin',
  'Kampung Baru',
  'Kemboja',
  'Tanjungpinang Barat',
  'Kampung Bugis',
  'Penyengat',
  'Senggarang',
  'Tanjungpinang Kota',
  'Air Raja',
  'Batu IX',
  'Kampung Bulang',
  'Melayu Kota Piring',
  'Pinang Kencana'
];

const kelurahanColors = {
  'Dompak': '#FF5733',
  'Sei Jang': '#33FF57',
  'Tanjung Ayun Sakti': '#3357FF',
  'Tanjungpinang Timur': '#FF33F5',
  'Tanjung Unggat': '#F5FF33',
  'Bukit Cermin': '#33F5FF',
  'Kampung Baru': '#FF8C33',
  'Kemboja': '#8C33FF',
  'Tanjungpinang Barat': '#33FF8C',
  'Kampung Bugis': '#FF338C',
  'Penyengat': '#8C8CFF',
  'Senggarang': '#FF8C8C',
  'Tanjungpinang Kota': '#8CFF8C',
  'Air Raja': '#8C8CFF',
  'Batu IX': '#FFCC33',
  'Kampung Bulang': '#CC33FF',
  'Melayu Kota Piring': '#33CCFF',
  'Pinang Kencana': '#FF3366'
};

// Component untuk handle map clicks
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Component untuk mengatur scroll zoom behavior (hanya dengan Ctrl+Scroll)
function ScrollZoomHandler() {
  const map = useMapEvents({});
  
  useEffect(() => {
    if (map) {
      // Disable default scroll wheel zoom
      map.scrollWheelZoom.disable();
      
      // Add custom scroll handler with zoom to cursor position
      const handleWheel = (e) => {
        // Only zoom if Ctrl key is pressed
        if (e.ctrlKey) {
          e.preventDefault();
          e.stopPropagation();
          
          const delta = e.deltaY || e.detail || e.wheelDelta;
          
          // Get mouse position relative to map container
          const containerPoint = L.point(e.layerX, e.layerY);
          const latLng = map.containerPointToLatLng(containerPoint);
          
          // Zoom in or out centered on cursor position
          if (delta < 0) {
            // Scroll up - zoom in
            map.setZoomAround(latLng, map.getZoom() + 1, {
              animate: true
            });
          } else {
            // Scroll down - zoom out
            map.setZoomAround(latLng, map.getZoom() - 1, {
              animate: true
            });
          }
        }
        // If Ctrl is not pressed, do nothing (allow page scroll)
      };
      
      const container = map.getContainer();
      container.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [map]);
  
  return null;
}

// Component untuk membuat peta hanya bisa digeser ketika dua jari di perangkat sentuh
function TouchPanHandler() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();

    // Default: allow vertical page pan on touch devices
    if ('ontouchstart' in window) {
      container.style.touchAction = 'pan-y';
      if (map.dragging && map.dragging.enabled()) map.dragging.disable();
    }

    const onTouchStart = (e) => {
      const touches = e.touches || [];
      if (touches.length >= 2) {
        // Two or more fingers: enable map dragging and prevent page pan
        container.style.touchAction = 'none';
        if (map.dragging && !map.dragging.enabled()) map.dragging.enable();
      } else {
        // Single finger: let page scroll
        container.style.touchAction = 'pan-y';
        if (map.dragging && map.dragging.enabled()) map.dragging.disable();
      }
    };

    const onTouchEnd = () => {
      setTimeout(() => {
        container.style.touchAction = 'pan-y';
        if (map.dragging && map.dragging.enabled()) map.dragging.disable();
      }, 50);
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchEnd);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      container.style.touchAction = '';
      if (map.dragging && !map.dragging.enabled()) map.dragging.enable();
    };
  }, [map]);

  return null;
}

const LocationManager = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [clickMode, setClickMode] = useState(false);
  const [tempMarker, setTempMarker] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [mapRef, setMapRef] = useState(null);
  const mapContainerRef = useState(null)[0];
  const [filterKelurahan, setFilterKelurahan] = useState(''); // '' = semua, 'nama_kelurahan' = filter
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    kelurahan: '',
    description: ''
  });
  const formRef = useRef(null);
  const topRef = useRef(null);
  const { toasts, removeToast, success, error, warning, info } = useToast();

  const defaultCenter = [0.9136, 104.4565];

  // Get unique kelurahan list untuk dropdown filter
  const uniqueKelurahan = [...new Set(locations.map(loc => loc.kelurahan))].sort();

  // Filter locations berdasarkan kelurahan yang dipilih
  const filteredLocations = filterKelurahan === '' 
    ? locations 
    : locations.filter(loc => loc.kelurahan === filterKelurahan);

  const scrollToMap = () => {
    const mapElement = document.getElementById('admin-map-container');
    if (mapElement) {
      mapElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  const scrollToForm = () => {
    const formElement = document.getElementById('location-form');
    if (formElement) {
      // Scroll the form into view at the top of the viewport
      try {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // small offset if needed (header margins)
        window.scrollBy({ top: -20, left: 0, behavior: 'smooth' });
      } catch (e) {
        // jsdom may not implement scrollIntoView; ignore in tests
      }

      // Focus the first input for accessibility
      const firstInput = formElement.querySelector('input, select, textarea');
      if (firstInput && typeof firstInput.focus === 'function') {
        firstInput.focus();
      }
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await getAllLocations();
      if (response.data.success) {
        setLocations(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (latlng) => {
    if (clickMode) {
      setTempMarker({
        lat: latlng.lat,
        lng: latlng.lng
      });
      setShowConfirm(true);
      
      // TIDAK ada zoom otomatis - biarkan user mengontrol zoom sendiri
      
      info('Marker ditempatkan! Drag untuk menyesuaikan posisi, lalu klik Simpan Lokasi.');
    }
  };

  const handleMarkerDrag = (e) => {
    const newPos = e.target.getLatLng();
    setTempMarker({
      lat: newPos.lat,
      lng: newPos.lng
    });
  };

  const handleConfirmLocation = () => {
    if (tempMarker) {
      setFormData({
        ...formData,
        latitude: tempMarker.lat.toFixed(6),
        longitude: tempMarker.lng.toFixed(6)
      });
      setTempMarker(null);
      setShowConfirm(false);
      setClickMode(false);
      success('✅ Koordinat berhasil disimpan! Lengkapi data kelurahan lalu klik Simpan Lokasi.');
    }
  };

  const handleCancelLocation = () => {
    setTempMarker(null);
    setShowConfirm(false);
    setClickMode(false);
    info('Pemilihan lokasi dibatalkan.');
  };

  const handleGetGPS = () => {
    if (navigator.geolocation) {
      info('📍 Mendapatkan lokasi GPS...');
      setClickMode(true);
      
      // Scroll ke peta saat GPS diminta
      setTimeout(() => {
        scrollToMap();
      }, 100);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Gunakan temporary marker untuk GPS juga, agar bisa disesuaikan
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setTempMarker({ lat, lng });
          setShowConfirm(true);
          
          // TIDAK ada zoom otomatis - biarkan user mengontrol zoom
          
          const accuracy = position.coords.accuracy;
          success(`✅ GPS berhasil! Akurasi: ${accuracy.toFixed(0)}m. Drag marker hijau untuk menyesuaikan posisi.`, 5000);
        },
        (err) => {
          let errorMsg = 'Gagal mendapatkan lokasi GPS: ';
          switch(err.code) {
            case err.PERMISSION_DENIED:
              errorMsg += 'Izin lokasi ditolak. Aktifkan izin lokasi di browser.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMsg += 'Informasi lokasi tidak tersedia.';
              break;
            case err.TIMEOUT:
              errorMsg += 'Permintaan lokasi timeout.';
              break;
            default:
              errorMsg += err.message;
          }
          error(errorMsg, 5000);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      error('Browser tidak support GPS');
    }
  };

  const handleKelurahanChange = (kelurahan) => {
    setFormData({
      ...formData,
      kelurahan
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Data yang akan dikirim dengan warna otomatis dari kelurahan
      const dataToSend = {
        ...formData,
        // kecamatan dihapus
        cases: 1, // Default 1 kasus per titik
        color: kelurahanColors[formData.kelurahan] || '#FF5733' // Warna otomatis
      };

      if (editingId) {
        await updateLocation(editingId, dataToSend);
        success('Lokasi berhasil diupdate!');
      } else {
        await createLocation(dataToSend);
        success('Lokasi berhasil ditambahkan!');
      }
      
      resetForm();
      fetchLocations();
    } catch (err) {
      console.error('Error saving location:', err);
      error('Gagal menyimpan lokasi: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEdit = (location) => {
    setFormData({
      latitude: location.latitude,
      longitude: location.longitude,
      kelurahan: location.kelurahan,
      description: location.description || ''
    });
    setEditingId(location._id);
      setShowForm(true);

      // Scroll to the top of the LocationManager page so admin can see the form header
      // Use a small timeout to allow the component to render if needed
      setTimeout(() => {
        if (topRef.current && typeof topRef.current.scrollIntoView === 'function') {
          topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (formRef.current && typeof formRef.current.scrollIntoView === 'function') {
          // Fallback to form if topRef is not available
          formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);

    setShowForm(true);

    // After opening the form, scroll to it and focus first field
    // Use a small timeout to allow React to render the form first
    setTimeout(() => {
      scrollToForm();
    }, 80);

  };

  const handleDelete = (location) => {
    // Open a confirmation modal with the selected location
    setDeleteTarget(location);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLocation(deleteTarget._id);
      success('Lokasi berhasil dihapus!');
      fetchLocations();
    } catch (err) {
      console.error('Error deleting location:', err);
      error('Gagal menghapus lokasi');
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

  const resetForm = () => {
    setFormData({
      latitude: '',
      longitude: '',
      kelurahan: '',
      description: ''
    });
    setEditingId(null);
    setShowForm(false);
    setClickMode(false);
    setTempMarker(null);
    setShowConfirm(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div ref={topRef} className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2">Kelola Titik Lokasi</h2>
            <p className="text-blue-100">Total: {locations.length} lokasi</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn bg-white text-blue-600 hover:bg-blue-50 border-0 shadow-lg"
          >
            {showForm ? <X size={20} /> : <Plus size={20} />}
            {showForm ? 'Tutup Form' : 'Tambah Lokasi'}
          </button>
        </div>
      </div>

      {showForm && (
        <div id="location-form" className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="font-bold text-xl mb-4 text-gray-800">
            {editingId ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}
          </h3>
          
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Koordinat Input */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Latitude</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="input input-bordered"
                  placeholder="0.9136"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Longitude</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="input input-bordered"
                  placeholder="104.4565"
                  required
                />
              </div>
            </div>

            {/* Buttons untuk pilih koordinat */}
            <div className="space-y-2">
              <label className="label">
                <span className="label-text font-semibold">Cara Pilih Lokasi:</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setClickMode(!clickMode);
                    if (!clickMode) {
                      info('🗺️ Klik di peta untuk menempatkan marker. Drag marker hijau untuk menyesuaikan posisi.');
                      // Scroll ke peta setelah delay kecil agar toast muncul dulu
                      setTimeout(() => {
                        scrollToMap();
                      }, 100);
                    }
                  }}
                  className={`btn ${clickMode ? 'btn-success' : 'btn-outline btn-primary'}`}
                >
                  <MapPin size={18} />
                  {clickMode ? '✓ Klik Peta Aktif' : '📍 Klik di Peta'}
                </button>
                <button
                  type="button"
                  onClick={handleGetGPS}
                  className="btn btn-outline btn-accent"
                >
                  <Navigation size={18} />
                  📡 Gunakan GPS
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                💡 Tip: Klik tombol "Klik di Peta" lalu klik lokasi di peta, atau gunakan GPS untuk lokasi saat ini
              </p>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Kelurahan *</span>
              </label>
              <select
                value={formData.kelurahan}
                onChange={(e) => handleKelurahanChange(e.target.value)}
                className="select select-bordered"
                required
              >
                <option value="">Pilih Kelurahan</option>
                {kelurahanList.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <label className="label">
                <span className="label-text-alt text-info">Warna marker akan otomatis sesuai kelurahan</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Catatan (Opsional)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="textarea textarea-bordered"
                rows="3"
                placeholder="Catatan atau deskripsi lokasi..."
              ></textarea>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary flex-1">
                <Save size={20} />
                {editingId ? 'Update Lokasi' : 'Simpan Lokasi'}
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

      {/* Map */}
      <div id="admin-map-container" className="bg-white p-6 rounded-lg shadow-md scroll-mt-20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">
            Peta Lokasi
          </h3>
          {clickMode && (
            // Hide the bold green pill on small screens to avoid visual clutter on mobile
            <div className="hidden sm:inline-flex badge badge-success gap-2">
              <MapPin size={16} />
              Klik peta untuk pilih lokasi
            </div>
          )}
        </div>
        
        {/* Instruksi Mode Klik */}
        {clickMode && !tempMarker && (
          <div className="alert alert-info shadow-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
              <h3 className="font-bold">🗺️ Mode Klik Peta Aktif!</h3>
              <div className="text-sm">
                <p>✓ Klik di peta untuk menempatkan marker</p>
                <p>✓ Drag marker hijau untuk menyesuaikan posisi</p>
                <p>✓ Klik "Simpan Lokasi" setelah selesai</p>
              </div>
            </div>
          </div>
        )}

        <div className="h-[500px] rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg relative">
          {/* Panel Konfirmasi Lokasi - Compact & Efisien */}
          {showConfirm && tempMarker && (
            // Make the confirmation panel less visually aggressive on small screens
            <div className="absolute top-3 right-3 z-[1000] w-[240px] bg-white/98 backdrop-blur-sm border-2 border-gray-200 sm:border-green-500 rounded-lg shadow-2xl">
              <div className="p-2">
                <div className="flex items-center gap-1 mb-1.5">
                  <MapPin className="text-gray-600 sm:text-green-600" size={12} />
                  <p className="font-bold text-gray-700 sm:text-green-900 text-xs">Lokasi Baru</p>
                </div>
                <div className="space-y-0.5 mb-2">
                  <p className="text-[10px] text-gray-700 font-mono bg-gray-100 px-1.5 py-0.5 rounded sm:text-green-800 sm:bg-green-50">
                    Lat: <span className="font-bold">{tempMarker.lat.toFixed(6)}</span>
                  </p>
                  <p className="text-[10px] text-gray-700 font-mono bg-gray-100 px-1.5 py-0.5 rounded sm:text-green-800 sm:bg-green-50">
                    Lng: <span className="font-bold">{tempMarker.lng.toFixed(6)}</span>
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleConfirmLocation}
                    className="btn btn-success btn-xs flex-1 h-7 text-[11px] px-2"
                  >
                    <Save size={12} />
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelLocation}
                    className="btn btn-error btn-xs h-7 px-2"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <MapContainer
            center={defaultCenter}
            zoom={12}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%', cursor: clickMode ? 'crosshair' : 'grab' }}
            whenReady={(map) => {
              setMapRef(map.target);
            }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapClickHandler onMapClick={handleMapClick} />
            <ScrollZoomHandler />
            <TouchPanHandler />
            
            {/* Temporary Draggable Marker */}
            {tempMarker && (
              <Marker
                position={[tempMarker.lat, tempMarker.lng]}
                draggable={true}
                eventHandlers={{
                  dragend: handleMarkerDrag,
                }}
                icon={L.icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41]
                })}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-bold text-green-600">📍 Lokasi Baru</p>
                    <p className="text-xs">Drag untuk pindahkan</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {locations.map((loc) => (
              <Marker
                key={loc._id}
                position={[loc.latitude, loc.longitude]}
              >
                <Popup>
                  <div className="p-2">
                    <h4 className="font-bold">{loc.kelurahan}</h4>
                    {/* Kecamatan dihapus */}
                    {loc.description && (
                      <p className="text-xs text-gray-600 mt-1">{loc.description}</p>
                    )}
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => handleEdit(loc)}
                        className="btn btn-xs btn-primary"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(loc)}
                        className="btn btn-xs btn-error"
                        disabled={deleting && deleteTarget && deleteTarget._id === loc._id}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

        </div>
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>💡 Tip: Tekan <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl</kbd> + <strong>Scroll</strong> untuk zoom peta. Atau gunakan dua jari untuk zoom dan geser peta</span>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Filter Section */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 font-semibold text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter Kelurahan:
            </label>
            <select 
              value={filterKelurahan}
              onChange={(e) => setFilterKelurahan(e.target.value)}
              className="select select-bordered select-sm w-auto rounded-full px-3 bg-white ml-auto"
              aria-label="Filter Kelurahan"
            >
              <option value="">🌍 Tampilkan Semua ({locations.length} Lokasi)</option>
              {uniqueKelurahan.map((kelurahan) => (
                <option key={kelurahan} value={kelurahan}>
                  {kelurahan} ({locations.filter(loc => loc.kelurahan === kelurahan).length})
                </option>
              ))}
            </select>
            {filterKelurahan && (
              <button
                onClick={() => setFilterKelurahan('')}
                className="btn btn-sm btn-ghost text-blue-600 hover:text-blue-800 ml-2 p-2"
                title="Reset Filter"
                aria-label="Reset filter"
              >
                <X size={16} />
              </button>
            )}
            <div className="ml-auto text-sm text-gray-600">
              Menampilkan: <span className="font-bold text-blue-700">{filteredLocations.length}</span> dari <span className="font-bold">{locations.length}</span> lokasi
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Kelurahan</th>
                {/* <th>Kecamatan</th> */}
                <th>Koordinat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-semibold">Tidak ada data lokasi{filterKelurahan && ` untuk kelurahan ${filterKelurahan}`}</p>
                      {filterKelurahan && (
                        <button 
                          onClick={() => setFilterKelurahan('')}
                          className="btn btn-sm btn-primary mt-2 rounded-full px-4"
                        >
                          Tampilkan Semua Lokasi
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLocations.map((loc) => (
                  <tr key={loc._id}>
                    <td>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: loc.color }}
                        ></div>
                        <span className="font-medium">{loc.kelurahan}</span>
                      </div>
                    </td>
                    {/* <td>{loc.kecamatan}</td> */}
                    <td className="text-sm">
                      {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(loc)}
                          className="btn btn-sm btn-ghost"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(loc)}
                          className="btn btn-sm btn-ghost text-error"
                          disabled={deleting && deleteTarget && deleteTarget._id === loc._id}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm && deleteTarget}
        title="Konfirmasi Hapus Lokasi"
        description={deleteTarget ? `Apakah Anda yakin ingin menghapus lokasi ${deleteTarget.kelurahan}?` : ''}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        confirmLabel="Hapus Lokasi"
        cancelLabel="Batal"
        isBusy={deleting}        busyLabel="Menghapus..."      />

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

export default LocationManager;
