const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-white py-6 mt-12">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p className="text-sm">
            © {currentYear} Peta Rawan Narkoba - Kota Tanjungpinang
          </p>
          <p className="text-xs mt-2 opacity-75">
            Badan Narkotika Nasional Kota Tanjungpinang
          </p>
          <div className="mt-3 flex items-center justify-center space-x-4 text-xs">
            <a href="tel:+6282275495694" className="flex items-center gap-2 hover:underline">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.08 4.18 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.72c.12 1.05.36 2.07.72 3.03a2 2 0 0 1-.45 2.11L8.09 10.91a16 16 0 0 0 6 6l1.05-1.05a2 2 0 0 1 2.11-.45c.96.36 1.98.6 3.03.72A2 2 0 0 1 22 16.92z" />
              </svg>
              <span className="sr-only">Telepon</span>
              <span>+62 822-7549-5694</span>
            </a>
            <span className="hidden sm:inline">•</span>
            <a href="mailto:bnnkota.tanjungpinang@gmail.com" className="flex items-center gap-2 hover:underline">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 4h16v16H4z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span className="sr-only">Email</span>
              <span>bnnkota.tanjungpinang@gmail.com</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
