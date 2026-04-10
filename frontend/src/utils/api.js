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

export default api;
export { API_URL };
