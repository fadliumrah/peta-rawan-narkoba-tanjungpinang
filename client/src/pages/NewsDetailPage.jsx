import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getNews } from '../services/api';
import { formatDateTime } from '../utils/dateFormatter';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Calendar, User, Eye, ArrowLeft } from 'lucide-react';

const NewsDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Scroll ke atas saat halaman dimuat
    window.scrollTo(0, 0);
    fetchNewsDetail();

    // Cleanup: ensure scroll position is saved if user navigates back
    return () => {
      // Position will be restored by the previous page
    };
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchNewsDetail = async () => {
    try {
      // Check if user already viewed this news in the last 24 hours
      const viewedNews = JSON.parse(localStorage.getItem('viewedNews') || '{}');
      const now = Date.now();
      const oneDayInMs = 24 * 60 * 60 * 1000;
      
      // Clean up old entries (older than 7 days)
      Object.keys(viewedNews).forEach(newsId => {
        if (now - viewedNews[newsId] > 7 * oneDayInMs) {
          delete viewedNews[newsId];
        }
      });
      
      // Check if already viewed in last 24 hours
      const shouldCountView = !viewedNews[id] || (now - viewedNews[id] > oneDayInMs);
      
      // Fetch news with or without counting view based on viewed status
      const response = await getNews(id, shouldCountView);
      if (response.data.success) {
        setNews(response.data.data);
        
        // Mark as viewed only if view was counted
        if (shouldCountView) {
          viewedNews[id] = now;
          localStorage.setItem('viewedNews', JSON.stringify(viewedNews));
        }
      }
    } catch (error) {
      console.error('Error fetching news detail:', error);
      setError('Berita tidak ditemukan');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary">
          <Header />
        </div>
        <div className="h-[88px]"></div>
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-200 h-96 rounded-lg animate-pulse"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary">
          <Header />
        </div>
        <div className="h-[88px]"></div>
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">{error}</h2>
            <Link to="/" className="btn btn-primary">
              Kembali ke Beranda
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Fixed Header with same effect as HomePage */}
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
        className="fixed bottom-8 left-8 z-50 group flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 hover:scale-105 transition-all duration-300 font-semibold"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-200" />
        <span>Kembali</span>
      </button>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <article className="bg-white rounded-lg shadow-lg overflow-hidden animate-fade-in-up">
            {/* Featured Image */}
            <div className="w-full h-96 overflow-hidden animate-scale-in">
              <img
                src={news.image}
                alt={news.title}
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
              />
            </div>

            {/* Content */}
            <div className="p-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-4 animate-slide-in-left animation-delay-100">
                {news.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6 pb-6 border-b animate-fade-in animation-delay-200">
                <span className="flex items-center space-x-2">
                  <Calendar size={16} />
                  <span>{formatDateTime(news.createdAt)}</span>
                </span>
                <span className="flex items-center space-x-2">
                  <User size={16} />
                  <span>Oleh: {news.createdBy?.nama || news.editor || 'Unknown'}</span>
                </span>
                <span className="flex items-center space-x-2">
                  <Eye size={16} />
                  <span>{news.views} views</span>
                </span>
              </div>

              {/* Article Content */}
              <div 
                className="prose prose-lg max-w-none animate-fade-in animation-delay-300"
                dangerouslySetInnerHTML={{ __html: news.content }}
              />
            </div>
          </article>

          {/* Back Button */}
          <div className="mt-8 text-center animate-fade-in-up animation-delay-400">
            <Link to="/" className="btn btn-primary hover-lift">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NewsDetailPage;
