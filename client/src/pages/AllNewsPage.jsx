import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllNews } from '../services/api';
import { formatDateTime } from '../utils/dateFormatter';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Calendar, User, Eye, ChevronLeft, ChevronRight, Search, X, Filter, ArrowLeft } from 'lucide-react';

const AllNewsPage = () => {
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [allNews, setAllNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const searchTimeout = useRef(null);

  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('allNewsScrollPosition');
    
    if (savedScrollPosition) {
      // Restore scroll position after content is loaded
      const scrollPos = parseInt(savedScrollPosition);
      sessionStorage.removeItem('allNewsScrollPosition');
      
      // Wait for content to render before scrolling
      setTimeout(() => {
        window.scrollTo(0, scrollPos);
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
    
    fetchNews(currentPage);
  }, [currentPage]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
      setShowBackButton(scrollPosition > 400); // Show button after scrolling 400px
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  const fetchNews = async (page) => {
    setLoading(true);
    try {
      const response = await getAllNews(page, 100); // Ambil banyak untuk filtering lokal
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

  const stripHtml = (html) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (query) => {
    setSearchQuery(query);

    // clear debounce
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!query.trim()) {
      // restore to current page data
      filterAndSortNews('', sortBy);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await getAllNews(1, 1000, false, query.trim());
        if (response.data.success) {
          let items = response.data.data;
          // apply sort locally
          if (sortBy === 'latest') {
            items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          } else if (sortBy === 'oldest') {
            items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          } else if (sortBy === 'views') {
            items.sort((a, b) => (b.views || 0) - (a.views || 0));
          } else if (sortBy === 'title') {
            items.sort((a, b) => a.title.localeCompare(b.title));
          }
          setNews(items);
        } else {
          setNews([]);
        }
      } catch (err) {
        console.error('Search failed:', err);
        setNews([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const handleSortChange = (sort) => {
    setSortBy(sort);
    filterAndSortNews(searchQuery, sort);
  };

  const handleNewsClick = () => {
    // Save current scroll position before navigating to detail
    sessionStorage.setItem('allNewsScrollPosition', window.scrollY.toString());
  };

  const filterAndSortNews = (query, sort) => {
    let filtered = [...allNews];

    // Filter by search query
    if (query.trim()) {
      filtered = filtered.filter(item => {
        const searchLower = query.toLowerCase().trim();
        const title = (item.title || '').toLowerCase();
        const author = (item.createdBy?.nama || item.editor || '').toLowerCase();
        const content = stripHtml(item.content || '').toLowerCase();
        const createdAt = formatDateTime(item.createdAt || '').toLowerCase();
        
        return (
          title.includes(searchLower) ||
          author.includes(searchLower) ||
          content.includes(searchLower) ||
          createdAt.includes(searchLower)
        );
      });
    }

    // Sort
    if (sort === 'latest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === 'views') {
      filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    setNews(filtered);
  };

  const clearSearch = () => {
    setSearchQuery('');
    filterAndSortNews('', sortBy);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header with same effect as HomePage */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
          isScrolled 
            ? 'bg-primary/95 backdrop-blur-md shadow-xl' 
            : 'bg-primary'
        }`}
      >
        <Header isCompact={isScrolled} />
      </div>
      
      {/* Spacer untuk mengkompensasi fixed header */}
      <div className={`transition-all duration-500 ${isScrolled ? 'h-[64px]' : 'h-[88px]'}`}></div>
      
      {/* Floating Back Button */}
      <button
        onClick={() => navigate(-1)}
        className={`fixed bottom-8 left-8 z-40 group flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 hover:scale-105 transition-all duration-300 font-semibold ${
          showBackButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16 pointer-events-none'
        }`}
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-200" />
        <span>Kembali</span>
      </button>
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumb & Back Button */}
        <div className="flex items-center gap-3 mb-6">
          <Link 
            to="/" 
            className="btn btn-ghost btn-sm gap-2 hover:bg-primary/10"
          >
            <ArrowLeft size={16} />
            Kembali
          </Link>
          <div className="text-sm breadcrumbs">
            <ul>
              <li><Link to="/">Beranda</Link></li>
              <li className="text-primary font-semibold">Semua Berita</li>
            </ul>
          </div>
        </div>

        {/* Header Section with Stats */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 text-white mb-8 animate-fade-in-down">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3 animate-slide-in-left">
                📰 Semua Berita
              </h1>
              <p className="text-blue-100 text-lg animate-slide-in-left animation-delay-100">
                Informasi lengkap seputar pencegahan dan penanggulangan narkoba
              </p>
              {!loading && (
                <div className="flex gap-4 mt-4">
                  <div className="badge badge-lg bg-white/20 text-white border-0">
                    Total: {allNews.length} berita
                  </div>
                  {searchQuery && (
                    <div className="badge badge-lg bg-white/20 text-white border-0">
                      Hasil: {news.length} berita
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white p-6 rounded-2xl shadow-lg mb-8 border border-gray-100 animate-fade-in-up animation-delay-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2">
              <label className="label">
                <span className="label-text font-semibold flex items-center gap-2">
                  <Search size={16} />
                  Cari Berita
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Cari berdasarkan judul, penulis, atau konten..."
                  className="input input-bordered w-full pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-100 rounded-r-lg px-2"
                  >
                    <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              {searchLoading && <div className="mt-2 text-sm text-gray-500">Mencari...</div>}
            </div>

            {/* Sort Dropdown */}
            <div>
              <label className="label">
                <span className="label-text font-semibold flex items-center gap-2">
                  <Filter size={16} />
                  Urutkan
                </span>
              </label>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="select select-bordered w-full"
              >
                <option value="latest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="views">Paling Banyak Dilihat</option>
                <option value="title">Judul (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-96 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Search className="mx-auto h-20 w-20 text-gray-300 mb-4" />
            <h3 className="text-2xl font-bold text-gray-700 mb-2">
              {searchQuery ? 'Tidak Ada Hasil' : 'Belum Ada Berita'}
            </h3>
            <p className="text-gray-500 text-lg mb-6">
              {searchQuery 
                ? `Tidak ditemukan berita yang cocok dengan "${searchQuery}"`
                : 'Belum ada berita tersedia saat ini'}
            </p>
            {searchQuery ? (
              <button onClick={clearSearch} className="btn btn-primary">
                Tampilkan Semua Berita
              </button>
            ) : (
              <Link to="/" className="btn btn-primary">
                Kembali ke Beranda
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Results Info */}
            <div className="mb-6 flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-900">
                <Eye size={18} />
                <span className="font-semibold">
                  Menampilkan {news.length} berita
                  {searchQuery && ` untuk "${searchQuery}"`}
                </span>
              </div>
              {searchQuery && (
                <button onClick={clearSearch} className="btn btn-sm btn-ghost gap-2">
                  <X size={16} />
                  Reset
                </button>
              )}
            </div>

            {/* News Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {news.map((item, index) => (
                <Link
                  key={item._id}
                  to={`/news/${item._id}`}
                  onClick={handleNewsClick}
                  className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-primary/30 flex flex-col hover-lift stagger-item"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="h-48 overflow-hidden bg-gray-200">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-lg mb-3 line-clamp-3 group-hover:text-primary transition-colors leading-tight min-h-[4.5rem]">
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

            {/* Pagination - Hide when searching */}
            {!searchQuery && pagination && pagination.totalPages > 1 && (
              <div className="flex flex-col items-center gap-4 mt-12 bg-white p-6 rounded-2xl shadow-lg">
                <div className="text-sm text-gray-600">
                  Halaman {currentPage} dari {pagination.totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn btn-outline gap-2"
                  >
                    <ChevronLeft size={16} />
                    Sebelumnya
                  </button>
                  
                  <div className="flex gap-1">
                    {[...Array(Math.min(pagination.totalPages, 5))].map((_, index) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = index + 1;
                      } else if (currentPage <= 3) {
                        pageNum = index + 1;
                      } else if (currentPage >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + index;
                      } else {
                        pageNum = currentPage - 2 + index;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`btn btn-sm ${
                            currentPage === pageNum ? 'btn-primary' : 'btn-ghost'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    className="btn btn-outline gap-2"
                  >
                    Selanjutnya
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AllNewsPage;
