// ============================================================
// ✅ GLOBAL CONFIG
// Backend deploy hone ke baad PRODUCTION_URL yahan update karo
// ============================================================

const API_BASE_URL = (() => {
  const hostname = window.location.hostname;
  const isLocal  = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';

  // 🔧 Step: Backend Vercel pe deploy karo, woh URL yahan daalo
  // Example: 'https://resumeai-backend.vercel.app/api'
  const PRODUCTION_URL = 'https://ai-resume-builder-and-job-tracker-b.vercel.app/';

  return isLocal ? 'http://localhost:5000/api' : PRODUCTION_URL;
})();

window.API_CONFIG = {
  BASE: API_BASE_URL
};

console.log('🔧 API:', API_BASE_URL);
