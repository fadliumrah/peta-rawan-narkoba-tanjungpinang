import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Banner from '../components/Banner';
import MapView from '../components/MapView';
import NewsList from '../components/NewsList';

const HomePage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const mapSectionRef = useRef(null);

  useEffect(() => {
    // Restore scroll position if coming back from news detail
    const savedScrollPosition = sessionStorage.getItem('homeScrollPosition');
    
    if (savedScrollPosition) {
      const scrollPos = parseInt(savedScrollPosition);
      sessionStorage.removeItem('homeScrollPosition');
      
      // Wait for content to render before scrolling
      setTimeout(() => {
        window.scrollTo(0, scrollPos);
      }, 100);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
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
      
      <main className="flex-1">
        {/* Banner Section */}
        <section className="container mx-auto px-4 py-8 animate-fade-in">
          <Banner />
        </section>

        {/* Map Section */}
        <section ref={mapSectionRef} className="container mx-auto px-4 py-8 animate-fade-in-up">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-primary mb-2 animate-slide-in-left">
              🗺️ Peta Persebaran
            </h2>
            <p className="text-gray-600 animate-slide-in-left animation-delay-100">
              Titik lokasi rawan narkoba di Kota Tanjungpinang
            </p>
          </div>
          <div className="animate-fade-in animation-delay-200">
            <MapView />
          </div>
        </section>

        {/* News Section */}
        <section className="container mx-auto px-4 py-8 animate-fade-in-up animation-delay-300">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-primary mb-2 animate-slide-in-left">
              📰 Berita & Informasi Terkini
            </h2>
            <p className="text-gray-600 animate-slide-in-left animation-delay-100">
              Update terbaru seputar pencegahan dan penanggulangan narkoba
            </p>
          </div>
          <NewsList limit={6} />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
