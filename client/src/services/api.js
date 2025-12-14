import axios from 'axios';

// Allow overriding API base URL via Vite env var `VITE_API_BASE` when deployed
const BASE_URL = import.meta.env.VITE_API_BASE || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth
export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);

// Banner
export const getActiveBanner = () => api.get('/banner/active');
export const getAllBanners = () => api.get('/banner');
export const updateBanner = (formData) => api.post('/banner', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateBannerCaption = (id, data) => api.patch(`/banner/${id}`, data);
export const deleteBanner = (id) => api.delete(`/banner/${id}`);

// Logo
export const getActiveLogo = () => api.get('/logo/active');
export const updateLogo = (formData) => api.post('/logo', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Locations
export const getAllLocations = () => api.get('/locations');
export const getLocationStats = () => api.get('/locations/statistics');
export const getLocation = (id) => api.get(`/locations/${id}`);
export const createLocation = (data) => api.post('/locations', data);
export const updateLocation = (id, data) => api.put(`/locations/${id}`, data);
export const deleteLocation = (id) => api.delete(`/locations/${id}`);

// News
export const getAllNews = (page = 1, limit = 6, includeUnpublished = false, search = '') => api.get(`/news?page=${page}&limit=${limit}${includeUnpublished ? '&includeUnpublished=true' : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`);
export const getNews = (id, shouldCountView = true) => api.get(`/news/${id}${shouldCountView ? '' : '?skipViewCount=true'}`);
export const getNewsForAdmin = (id) => api.get(`/news/${id}?skipViewCount=true`);
export const createNews = (formData) => api.post('/news', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateNews = (id, formData) => api.put(`/news/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteNews = (id) => api.delete(`/news/${id}`);

export default api;
