import { useEffect, useState } from 'react';
import { getActiveBanner } from '../services/api';

const Banner = () => {
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanner();
  }, []);

  const fetchBanner = async () => {
    try {
      const response = await getActiveBanner();
      if (response.data.success && response.data.data) {
        setBanner(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching banner:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-64 bg-gray-200 animate-pulse rounded-lg"></div>
    );
  }

  if (!banner) {
    return null;
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-xl h-[180px] md:h-[250px] group animate-scale-in">
      <img 
        src={banner.image} 
        alt="Banner" 
        className="w-full h-full transition-transform duration-700 group-hover:scale-110"
        style={{ 
          objectFit: banner.imageFit || 'cover',
          objectPosition: banner.imagePosition ? `${banner.imagePosition.x}% ${banner.imagePosition.y}%` : 'center'
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 md:p-4 transition-all duration-500">
        <h2 className="text-white text-sm md:text-xl font-bold mb-0.5 md:mb-1 drop-shadow-lg animate-slide-in-left animation-delay-200">
          {banner.caption}
        </h2>
        <p className="text-white/90 text-xs md:text-sm drop-shadow animate-slide-in-left animation-delay-300">
          {banner.location}
        </p>
      </div>
    </div>
  );
};

export default Banner;
