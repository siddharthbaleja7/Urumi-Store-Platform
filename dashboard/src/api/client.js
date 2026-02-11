import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = {
    getStores: () => axios.get(`${API_BASE_URL}/stores`),
    getStore: (id) => axios.get(`${API_BASE_URL}/stores/${id}`),
    createStore: (data) => axios.post(`${API_BASE_URL}/stores`, data),
    deleteStore: (id) => axios.delete(`${API_BASE_URL}/stores/${id}`)
};
