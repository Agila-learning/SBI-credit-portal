import axios from 'axios';

// Get the API URL from environment variables
// In Vite, environment variables must start with VITE_
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5052';

const api = axios.create({
  baseURL: API_URL,
});

// Automatically add the Authorization header if a token exists
api.interceptors.request.use((config) => {
  const storedUser = localStorage.getItem('fic_sbi_user');
  if (storedUser) {
    const { token } = JSON.parse(storedUser);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle response errors (like 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Session expired or unauthorized. Logging out...');
      localStorage.removeItem('fic_sbi_user');
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
