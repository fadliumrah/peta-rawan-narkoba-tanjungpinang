import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getAllNews } from '../services/api';
import { formatDateTime } from '../utils/dateFormatter';
import { Calendar, User, Eye, Search, X } from 'lucide-react';

const NewsList = ({ limit = 6 }) => {
  const [news, setNews] = useState([]);
  const [allNews, setAllNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeout = useRef(null);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async (page = 1) => {
    try {
      const response = await getAllNews(page, limit);
      if (response.data.success) {
        setNews(response.data.data);
        setAllNews(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);

    // Clear previous debounce
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!query.trim()) {
      setNews(allNews);
      setSearchLoading(false);
      return;
    }

    // Debounce network calls to avoid flooding server on fast typing
    setSearchLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await getAllNews(1, 1000, false, query.trim());
        if (response.data.success) {
          setNews(response.data.data);
        } else {
          setNews([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setNews([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setNews(allNews);
  };

  const handleNewsClick = () => {
    // Save current scroll position before navigating to detail
    sessionStorage.setItem('homeScrollPosition', window.scrollY.toString());
  };

  const stripHtml = (html) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Clear debounce on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari berita berdasarkan judul, penulis, atau konten..."
            className="input input-bordered w-full pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-600">
            Ditemukan <span className="font-bold text-primary">{news.length}</span> berita
            {news.length === 0 && (
              <span className="text-red-500 ml-1">- Tidak ada hasil yang cocok</span>
            )}
          </div>
        )}
        {searchLoading && (
          <div className="mt-2 text-sm text-gray-500">Mencari...</div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-96 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : (
        <>
          {news.length === 0 && !searchQuery && (
            <div className="text-center py-12">
              <p className="text-gray-500">Belum ada berita tersedia</p>
            </div>
          )}

          {news.length === 0 && searchQuery && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <Search className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Tidak ada hasil</h3>
              <p className="text-gray-500 mb-4">Tidak ditemukan berita yang cocok dengan "{searchQuery}"</p>
              <button onClick={clearSearch} className="btn btn-primary btn-sm">
                Tampilkan Semua Berita
              </button>
            </div>
          )}

          {news.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item, index) => (
              <Link
                key={item._id}
                to={`/news/${item._id}`}
                onClick={handleNewsClick}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col hover-lift stagger-item"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-lg mb-3 line-clamp-3 hover:text-primary transition-colors leading-tight min-h-[4.5rem]">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed flex-1">
                    {stripHtml(item.content)}
                  </p>
                  
                  <div className="space-y-2.5 pt-4 border-t border-gray-100 mt-auto">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar size={14} className="text-blue-500 flex-shrink-0" />
                      <span className="font-medium">{formatDateTime(item.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <User size={14} className="text-green-500 flex-shrink-0" />
                      <span className="font-medium truncate">{item.createdBy?.nama || item.editor || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs min-h-[1.25rem]">
                      {item.views > 0 && (
                        <>
                          <Eye size={14} className="text-amber-500 flex-shrink-0" />
                          <span className="font-semibold text-gray-700">{item.views} views</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            </div>
          )}

          {!searchQuery && pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <Link
                to="/news"
                className="btn btn-primary"
              >
                Lihat Semua Berita ({pagination.totalItems})
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NewsList;
