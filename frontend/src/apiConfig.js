const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
    (hostname === 'localhost' || hostname === '127.0.0.1')
        ? 'http://localhost:3000'
        : 'https://nexgen-backend-seven.vercel.app'
);

export default API_BASE_URL;
