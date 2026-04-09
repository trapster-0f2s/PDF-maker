import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getInvoices   = (params)     => api.get('/invoices', { params });
export const getInvoice    = (id)         => api.get(`/invoices/${id}`);
export const createInvoice = (data)       => api.post('/invoices', data);
export const updateInvoice = (id, data)   => api.put(`/invoices/${id}`, data);
export const deleteInvoice = (id)         => api.delete(`/invoices/${id}`);
export const getStats      = ()           => api.get('/invoices/stats');
export const downloadPDF   = (id)         => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });