// 📁 src/lib/api.ts
 
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
  addProche: (data: any) => api.post('/auth/add-patient', data),
  addPatient: (data: any) => api.post('/auth/add-patient', data),
  deleteAccount: (userId: string) => api.post('/auth/delete-account', { userId }),
};

// =============================================
// PROCHES API (ex-PATIENTS)
// =============================================
export const procheAPI = {
  getAll: () => api.get('/patients'),
  getById: (id: string) => api.get(`/patients/${id}`),
  create: (data: any) => api.post('/patients', data),
  update: (id: string, data: any) => api.put(`/patients/${id}`, data),
  delete: (id: string) => api.delete(`/patients/${id}`),
  getVisits: (id: string) => api.get(`/patients/${id}/visits`),
  getOrders: (id: string) => api.get(`/patients/${id}/orders`),
  // ✅ NOUVEAU : Assigner un aidant à un patient
  assignAidant: (patientId: string, aidantId: string, assignmentType: string = 'permanente') => 
    api.post(`/patients/${patientId}/assign-aidant`, { aidantId, assignmentType }),
  getAidants: (patientId: string) => api.get(`/patients/${patientId}/aidants`),
};

export const patientAPI = procheAPI;

// =============================================
// VISITS API - AVEC NOUVEAUX STATUTS
// =============================================
export const visitAPI = {
  getAll: () => api.get('/visits'),
  getById: (id: string) => api.get(`/visits/${id}`),
  create: (data: any) => api.post('/visits', data),
  update: (id: string, data: any) => api.put(`/visits/${id}`, data),
  delete: (id: string) => api.delete(`/visits/${id}`),
  
  // ✅ NOUVEAUX STATUTS
  approve: (id: string) => api.post(`/visits/${id}/approve`),
  refuse: (id: string, reason: string) => api.post(`/visits/${id}/refuse`, { reason }),
  reassign: (id: string, aidantId: string, assignmentType: string = 'ponctuelle') => 
    api.post(`/visits/${id}/reassign`, { aidant_id: aidantId, assignment_type: assignmentType }),
  confirmPayment: (id: string, transactionId: string) => 
    api.post(`/visits/${id}/confirm-payment`, { transaction_id: transactionId }),
  
  // ✅ EXISTANTS
  start: (id: string) => api.post(`/visits/${id}/start`),
  complete: (id: string, data: any) => api.post(`/visits/${id}/complete`, data),
  validate: (id: string) => api.post(`/visits/${id}/validate`),
  cancel: (id: string) => api.post(`/visits/${id}/cancel`),
  addPhoto: (id: string, photo: FormData) => api.post(`/visits/${id}/photos`, photo),
  
  // ✅ RÉCUPÉRATION
  getPending: () => api.get('/visits/pending'),
  getNeedingReassign: () => api.get('/visits/needing-reassign'),
};

// =============================================
// ORDERS API - AVEC NOUVEAUX STATUTS
// =============================================
export const orderAPI = {
  getAll: () => api.get('/orders'),
  getById: (id: string) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  update: (id: string, data: any) => api.put(`/orders/${id}`, data),
  delete: (id: string) => api.delete(`/orders/${id}`),
  
  // ✅ NOUVEAUX STATUTS
  take: (id: string) => api.post(`/orders/${id}/take`),
  accept: (id: string) => api.post(`/orders/${id}/accept`),
  prepare: (id: string) => api.post(`/orders/${id}/prepare`),
  deliver: (id: string, data?: any) => api.post(`/orders/${id}/deliver`, data),
  cancel: (id: string) => api.post(`/orders/${id}/cancel`),
  validate: (id: string) => api.post(`/orders/${id}/validate`),
  confirmPayment: (id: string, transactionId: string) => 
    api.post(`/orders/${id}/confirm-payment`, { transaction_id: transactionId }),
  
  // ✅ UPDATE STATUS (générique)
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
  registerToken: (token: string, deviceInfo?: string) => 
    api.post('/notifications/register-token', { token, device_info: deviceInfo }),
  removeToken: (token: string) => api.post('/notifications/remove-token', { token }),
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
  
  // ✅ NOUVEAU : Gestion des aidants
  getAvailableAidants: () => api.get('/admin/aidants/available'),
  assignAidant: (data: { familyId: string; aidantId: string; assignmentType: string }) => 
    api.post('/admin/assign-aidant', data),
};

// =============================================
// CONTRAT API
// =============================================
export const contractAPI = {
  getStatus: () => api.get('/contract/status'),
  getActive: () => api.get('/contract/active'),
  accept: (contractId: string) => api.post('/contract/accept', { contract_id: contractId }),
  getHistory: () => api.get('/contract/history'),
};

// =============================================
// SETTINGS API
// =============================================
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getPublic: () => api.get('/settings/public'),
  getByCategory: (category: string) => api.get(`/settings/category/${category}`),
  getByKey: (key: string) => api.get(`/settings/${key}`),
  update: (key: string, value: any) => api.put(`/settings/${key}`, { value }),
  updateMultiple: (settings: Record<string, any>) => api.put('/settings', { settings }),
};

// =============================================
// OFFERS API
// =============================================
export const offersAPI = {
  getAll: () => api.get('/offers'),
  getById: (id: string) => api.get(`/offers/${id}`),
  create: (data: any) => api.post('/offers', data),
  update: (id: string, data: any) => api.put(`/offers/${id}`, data),
  delete: (id: string) => api.delete(`/offers/${id}`),
  sync: () => api.post('/offers/sync'),
};
