export const environment = {
  production: true,
  // Lokal: gunakan backend PHP di port 8080
  // Production (Vercel): arahkan ke Railway backend URL
  apiUrl: (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:8080/api'
    : 'https://test-imc-sandiirawan-production.up.railway.app/api'
};
