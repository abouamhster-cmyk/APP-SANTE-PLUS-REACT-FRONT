import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'https://app-sante-plus-react.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =============================================
// AUTH API
// =============================================
export const authAPI = {
  register: (data: any) => {
    console.log('📤 Sending register data:', data);
    return api.post('/auth/register', data);
  },
  login: (email: string, password: string) => {
    console.log('📤 Sending login data:', { email });
    return api.post('/auth/login', { email, password });
  },
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  getMe: () => api.get('/auth/me'),
  switchRole: (role: string) => api.post('/auth/switch-role', { role }),
  // 👨‍👩‍👦 Ajouter un proche (ex-addPatient)
  addProche: (data: any) => api.post('/auth/add-patient', data),
  // ✅ Ancien nom (alias)
  addPatient: (data: any) => api.post('/auth/add-patient', data),
};

// =============================================
// PROCHES API (ex-PATIENTS) 👨‍👩‍👦
// =============================================
export const procheAPI = {
  getAll: () => api.get('/patients'),
  getById: (id: string) => api.get(`/patients/${id}`),
  create: (data: any) => api.post('/patients', data),
  update: (id: string, data: any) => api.put(`/patients/${id}`, data),
  delete: (id: string) => api.delete(`/patients/${id}`),
  getVisits: (id: string) => api.get(`/patients/${id}/visits`),
  getOrders: (id: string) => api.get(`/patients/${id}/orders`),
};

// ✅ Ancien nom (alias pour compatibilité)
export const patientAPI = procheAPI;

// =============================================
// VISITS API
// =============================================
export const visitAPI = {
  getAll: () => api.get('/visits'),
  getById: (id: string) => api.get(`/visits/${id}`),
  create: (data: any) => api.post('/visits', data),
  update: (id: string, data: any) => api.put(`/visits/${id}`, data),
  delete: (id: string) => api.delete(`/visits/${id}`),
  start: (id: string) => api.post(`/visits/${id}/start`),
  complete: (id: string, data: any) => api.post(`/visits/${id}/complete`, data),
  validate: (id: string) => api.post(`/visits/${id}/validate`),
  cancel: (id: string) => api.post(`/visits/${id}/cancel`),
  addPhoto: (id: string, photo: FormData) => api.post(`/visits/${id}/photos`, photo),
};

// =============================================
// ORDERS API
// =============================================
export const orderAPI = {
  getAll: () => api.get('/orders'),
  getById: (id: string) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  update: (id: string, data: any) => api.put(`/orders/${id}`, data),
  delete: (id: string) => api.delete(`/orders/${id}`),
  accept: (id: string) => api.post(`/orders/${id}/accept`),
  prepare: (id: string) => api.post(`/orders/${id}/prepare`),
  deliver: (id: string, data?: any) => api.post(`/orders/${id}/deliver`, data),
  cancel: (id: string) => api.post(`/orders/${id}/cancel`),
  updateStatus: (id: string, status: string) => api.post(`/orders/${id}/status`, { status }),
};

// =============================================
// MESSAGES API
// =============================================
export const messageAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (conversationId: string) => api.get(`/messages/${conversationId}`),
  send: (data: any) => api.post('/messages', data),
  markAsRead: (messageId: string) => api.put(`/messages/${messageId}/read`),
  markAllRead: (conversationId: string) => api.put(`/messages/${conversationId}/read-all`),
  createConversation: (participantIds: string[]) => api.post('/messages/conversations', { participantIds }),
};

// =============================================
// PAYMENTS API
// =============================================
export const paymentAPI = {
  create: (data: any) => api.post('/payments', data),
  getStatus: (reference: string) => api.get(`/payments/${reference}`),
  getHistory: () => api.get('/payments/history'),
  getSubscriptions: () => api.get('/payments/subscriptions'),
  subscribe: (data: any) => api.post('/payments/subscribe', data),
  cancelSubscription: (id: string) => api.post(`/payments/subscriptions/${id}/cancel`),
};

// =============================================
// NOTIFICATIONS API
// =============================================
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  registerToken: (token: string, deviceInfo?: string) => api.post('/notifications/register-token', { token, device_info: deviceInfo }),
};

// =============================================
// ADMIN API
// =============================================
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getRegistrations: () => api.get('/admin/registrations'),
  processRegistration: (id: string, data: any) => api.put(`/admin/registrations/${id}`, data),
  getUsers: () => api.get('/admin/users'),
  updateUserRole: (userId: string, role: string) => api.put(`/admin/users/${userId}/role`, { role }),
  createAidant: (data: any) => api.post('/admin/aidants', data),
  getOffers: () => api.get('/admin/offers'),
  createOffer: (data: any) => api.post('/admin/offers', data),
  updateOffer: (id: string, data: any) => api.put(`/admin/offers/${id}`, data),
};