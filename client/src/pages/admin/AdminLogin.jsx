import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/api';
import { setToken, setUserInfo } from '../../utils/auth';
import { LogIn, Eye, EyeOff } from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting login with:', formData.username);
      const response = await login(formData);
      console.log('Login response:', response.data);
      
      if (response.data.success) {
        const { token, ...userData } = response.data.data;
        console.log('Token:', token ? 'Received' : 'Missing');
        console.log('User data:', userData);
        
        setToken(token);
        setUserInfo(userData);
        navigate('/admin/dashboard');
      } else {
        setError('Login gagal: Response tidak valid');
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
      setError(
        error.response?.data?.message || 'Login gagal. Silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Header - Compact */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl mb-3 shadow-lg">
              <LogIn className="text-white" size={28} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
              Admin Login
            </h1>
            <p className="text-sm text-gray-600">
              Peta Rawan Narkoba - Tanjungpinang
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error mb-4 py-3">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">{error}</span>
                <span className="text-xs opacity-75">Pastikan username dan password benar</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-semibold text-gray-700">Username</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="input input-bordered w-full h-11 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan username"
                required
                autoFocus
              />
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-semibold text-gray-700">Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input input-bordered w-full h-11 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Masukkan password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 w-full shadow-lg h-12 mt-4"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Login
                </>
              )}
            </button>
          </form>

   
          <div className="mt-6 text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
            <p className="font-medium">© {new Date().getFullYear()} BNN Kota Tanjungpinang</p>
            <p className="text-[10px] mt-0.5">Sistem Informasi Pemetaan Rawan Narkoba</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
