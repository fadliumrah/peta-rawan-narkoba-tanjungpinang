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
          <div className="mt-3 flex justify-center space-x-4 text-xs">
            <span>Telepon: +62 822-7549-5694</span>
            <span>•</span>
            <span>Email: bnnkota.tanjungpinang@gmail.com</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
