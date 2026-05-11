const hostname = window.location.hostname;
const API_BASE_URL = (hostname === 'localhost' || hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : 'https://taskbuddy-1-rtz2.onrender.com';

export default API_BASE_URL;
