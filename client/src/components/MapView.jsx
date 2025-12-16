import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getAllLocations, getLocationStats } from '../services/api';

// Fix untuk icon Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component untuk auto-fit bounds (hanya saat filter berubah, bukan saat klik marker)
function MapBounds({ locations, shouldFitBounds }) {
  const map = useMap();
  
  useEffect(() => {
    if (shouldFitBounds && locations && locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map(loc => [loc.latitude, loc.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [shouldFitBounds, locations, map]);
  
  return null;
}

// Component untuk mengatur scroll zoom behavior (hanya dengan Ctrl+Scroll)
// Zoom terfokus pada posisi pointer
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

// Component untuk membuat peta hanya bisa digeser ketika dua jari (mencegah gangguan saat scroll halaman di smartphone)
function TouchPanHandler() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();

    // For touch devices, default to allowing page vertical pan to avoid blocking scroll
    if ('ontouchstart' in window) {
      container.style.touchAction = 'pan-y';
      if (map.dragging && map.dragging.enabled()) {
        map.dragging.disable();
      }
    }

    const onTouchStart = (e) => {
      const touches = e.touches || [];
      if (touches.length >= 2) {
        // Two-finger gesture: enable map dragging and prevent page pan
        container.style.touchAction = 'none';
        if (map.dragging && !map.dragging.enabled()) map.dragging.enable();
      } else {
        // Single-finger: let page scroll (map shouldn't capture touch)
        container.style.touchAction = 'pan-y';
        if (map.dragging && map.dragging.enabled()) map.dragging.disable();
      }
    };

    const onTouchEnd = () => {
      // Revert to allowing page pan shortly after touch ends
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

// Daftar semua kelurahan dengan warna
const allKelurahan = [
  { name: 'Dompak', color: '#FF5733' },
  { name: 'Sei Jang', color: '#33FF57' },
  { name: 'Tanjung Ayun Sakti', color: '#3357FF' },
  { name: 'Tanjungpinang Timur', color: '#FF33F5' },
  { name: 'Tanjung Unggat', color: '#F5FF33' },
  { name: 'Bukit Cermin', color: '#33F5FF' },
  { name: 'Kampung Baru', color: '#FF8C33' },
  { name: 'Kemboja', color: '#8C33FF' },
  { name: 'Tanjungpinang Barat', color: '#33FF8C' },
  { name: 'Kampung Bugis', color: '#FF338C' },
  { name: 'Penyengat', color: '#8C8CFF' },
  { name: 'Senggarang', color: '#FF8C8C' },
  { name: 'Tanjungpinang Kota', color: '#8CFF8C' },
  { name: 'Air Raja', color: '#8C8CFF' },
  { name: 'Batu IX', color: '#FFCC33' },
  { name: 'Kampung Bulang', color: '#CC33FF' },
  { name: 'Melayu Kota Piring', color: '#33CCFF' },
  { name: 'Pinang Kencana', color: '#FF3366' }
];

const MapView = () => {
  const [locations, setLocations] = useState([]);
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKelurahan, setSelectedKelurahan] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [shouldFitBounds, setShouldFitBounds] = useState(true);
  
  // Default center ke Tanjungpinang
  const defaultCenter = [0.9136, 104.4565];

  useEffect(() => {
    fetchData();
  }, []);

  // Reset shouldFitBounds setelah zoom dilakukan
  useEffect(() => {
    if (shouldFitBounds) {
      const timer = setTimeout(() => {
        setShouldFitBounds(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldFitBounds]);

  const fetchData = async () => {
    try {
      const [locationsRes, statsRes] = await Promise.all([
        getAllLocations(),
        getLocationStats()
      ]);
      
      if (locationsRes.data.success) {
        setLocations(locationsRes.data.data);
      }
      
      if (statsRes.data.success) {
        setStatistics(statsRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCustomIcon = (color) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 15px;
          height: 15px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 1.5px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        ">
          <div style="
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(45deg);
          ">
            <span style="color: white; font-weight: bold; font-size: 8px;">📍</span>
          </div>
        </div>
      `,
      iconSize: [15, 15],
      iconAnchor: [7.5, 15],
      popupAnchor: [0, -15]
    });
  };

  // Filter locations berdasarkan kelurahan yang dipilih
  const filteredLocations = selectedKelurahan === 'all' 
    ? locations 
    : locations.filter(loc => loc.kelurahan === selectedKelurahan);

  // Hitung total titik
  const totalPoints = locations.length;

  // Merge kelurahan dengan statistics untuk menampilkan semua kelurahan (termasuk yang 0)
  const kelurahanWithStats = allKelurahan.map(kel => {
    const stat = statistics.find(s => s._id === kel.name);
    return {
      name: kel.name,
      color: kel.color,
      total: stat ? stat.total : 0
    };
  });

  if (loading) {
    return (
      <div className="w-full h-[500px] bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dropdown Kelurahan */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold flex items-center">
            📍 Legenda Kelurahan
          </h3>
          <div className="text-sm text-gray-600">
            Total: <span className="font-bold text-primary">{totalPoints}</span> titik
          </div>
        </div>
        
        {/* Dropdown Filter */}
        <div className="mb-4">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full md:w-auto btn btn-outline btn-sm flex items-center justify-between gap-2"
            >
              <span>
                {selectedKelurahan === 'all' 
                  ? '🗺️ Semua Kelurahan' 
                  : `📍 ${selectedKelurahan}`}
              </span>
              <svg 
                className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isDropdownOpen && (
              <div className="absolute z-50 mt-2 w-full md:w-80 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedKelurahan('all');
                    setShouldFitBounds(true);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b ${
                    selectedKelurahan === 'all' ? 'bg-blue-50 font-semibold' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>🗺️ Semua Kelurahan</span>
                    <span className="text-sm font-bold text-primary">{totalPoints} titik</span>
                  </div>
                </button>
                
                {kelurahanWithStats.map((kel, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedKelurahan(kel.name);
                      setShouldFitBounds(true);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 ${
                      selectedKelurahan === kel.name ? 'bg-blue-50 font-semibold' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: kel.color }}
                        ></div>
                        <span className="text-sm">{kel.name}</span>
                      </div>
                      <span className={`text-sm font-bold ${kel.total > 0 ? 'text-primary' : 'text-gray-400'}`}>
                        {kel.total}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Grid Statistik - Tampilkan semua 18 kelurahan */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-1.5">
          {kelurahanWithStats.map((kel, index) => (
            <button
              key={index}
              onClick={() => {
                setSelectedKelurahan(kel.name);
                setShouldFitBounds(true);
              }}
              className={`flex flex-col items-center justify-center p-1.5 rounded transition-all text-center ${
                selectedKelurahan === kel.name 
                  ? 'bg-blue-100 border-2 border-blue-500' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
              title={kel.name}
            >
              <div 
                className="w-2.5 h-2.5 rounded-full mb-1"
                style={{ backgroundColor: kel.color }}
              ></div>
              <p className="text-[10px] font-medium leading-tight truncate w-full px-0.5" style={{ maxWidth: '100%' }}>
                {kel.name.length > 12 ? kel.name.substring(0, 10) + '...' : kel.name}
              </p>
              <p className={`text-xs font-bold ${kel.total > 0 ? 'text-primary' : 'text-gray-400'}`}>
                {kel.total}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="w-full h-[500px] rounded-lg overflow-hidden shadow-lg">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ScrollZoomHandler />
          <TouchPanHandler />
          
          {filteredLocations.length > 0 && <MapBounds locations={filteredLocations} shouldFitBounds={shouldFitBounds} />}
          
          {filteredLocations.map((location) => (
            <Marker
              key={location._id}
              position={[location.latitude, location.longitude]}
              icon={createCustomIcon(location.color)}
            >
              <Popup>
                <div className="p-3 min-w-[200px] rounded-xl bg-white shadow-lg border border-gray-200 flex flex-col items-start">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block w-5 h-5 bg-blue-50 rounded-full flex items-center justify-center">
                      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={2} stroke='currentColor' className='w-3.5 h-3.5 text-blue-600'><path strokeLinecap='round' strokeLinejoin='round' d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' /><circle cx='12' cy='9' r='2.5' fill='currentColor'/></svg>
                    </span>
                    <span className="font-bold text-base text-blue-700">{location.kelurahan}</span>
                  </div>
                  {location.description && (
                    <p className="text-gray-800 mb-1 text-sm italic">{location.description}</p>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-pink-500 text-base">📍</span>
                    <span className="text-xs text-blue-900 font-mono font-bold">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
                  </div>
                  <div className="flex flex-col gap-2 w-full mt-1">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 rounded-lg shadow hover:bg-blue-700 text-sm font-semibold transition border border-blue-600 justify-center"
                    >
                      <span className="text-base">🚗</span>
                      <span className="tracking-wide font-bold text-yellow-300 drop-shadow">Petunjuk Arah</span>
                    </a>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg shadow hover:bg-blue-100 text-sm font-semibold transition justify-center"
                    >
                      <span className="text-base">🌐</span>
                      <span className="tracking-wide">Lihat di Google Maps</span>
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      
      {/* Hint untuk zoom */}
      <div className="mt-3 text-xs text-gray-500 flex items-center gap-1 bg-blue-50 p-2 rounded-lg border border-blue-200">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-blue-700">💡 Tip: Tekan <kbd className="px-1.5 py-0.5 text-xs font-semibold text-blue-800 bg-white border border-blue-300 rounded shadow-sm">Ctrl</kbd> + <strong>Scroll</strong> untuk zoom peta | Atau gunakan dua jari untuk zoom dan geser peta</span>
      </div>
    </div>
  );
};

export default MapView;
