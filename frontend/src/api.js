import axios from 'axios';
const api = axios.create({ baseURL: '/api', headers: {'Accept':'application/json'}, timeout: 240000 });
export default api;
