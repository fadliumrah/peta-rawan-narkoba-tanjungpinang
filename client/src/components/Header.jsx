import { useEffect, useState } from 'react';
import { getActiveLogo } from '../services/api';

const Header = ({ isCompact = false }) => {
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    try {
      const response = await getActiveLogo();
      if (response.data.success) {
        setLogo(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <header className="text-white">
      <div className={`container mx-auto px-4 transition-all duration-500 ${
        isCompact ? 'py-2' : 'py-4'
      }`}>
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={scrollToTop}
          >
            {logo && logo.image && (
              <img 
                src={logo.image} 
                alt="BNN Logo" 
                className={`object-contain transition-all duration-500 ${
                  isCompact ? 'h-10 w-10' : 'h-16 w-16'
                }`}
              />
            )}
            <div className="transition-all duration-500">
              <h1 className={`font-bold transition-all duration-500 ${
                isCompact ? 'text-base' : 'text-xl'
              }`}>
                {logo?.title || 'BADAN NARKOTIKA NASIONAL'}
              </h1>
              <p className={`opacity-90 transition-all duration-500 ${
                isCompact ? 'text-xs' : 'text-sm'
              }`}>
                {logo?.subtitle || 'KOTA TANJUNGPINANG'}
              </p>
            </div>
          </div>
          <div 
            className="hidden md:block transition-all duration-500 cursor-pointer hover:opacity-80"
            onClick={scrollToTop}
          >
            <h2 className={`font-semibold transition-all duration-500 ${
              isCompact ? 'text-sm' : 'text-lg'
            }`}>Peta Rawan Narkoba</h2>
            <p className={`opacity-90 transition-all duration-500 ${
              isCompact ? 'text-xs' : 'text-sm'
            }`}>Sistem Informasi Geografis</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
