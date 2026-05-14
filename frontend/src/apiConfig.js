const hostname = window.location.hostname;
const API_BASE_URL = (hostname === 'localhost' || hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : 'https://nexgenback-gamma.vercel.app'; // <-- REPLACE THIS WITH YOUR EXACT BACKEND VERCEL URL

export default API_BASE_URL;
