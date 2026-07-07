// 📁 src/lib/api.ts

import axios from 'axios';
import { supabase } from './supabase';

// NOTE: VITE_API_URL se termine déjà par /api dans Vercel
const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

// ✅ Fonction utilitaire pour normaliser les URLs
const normalizeApiUrl = (endpoint: string): string => {
  const cleanBase = API_URL.replace(/\/+$/, '');
  let cleanEndpoint = endpoint.replace(/^\/+/, '');
  
  if (cleanEndpoint.startsWith('api/')) {
    if (cleanBase.endsWith('/api') || cleanBase.includes('/api')) {
      cleanEndpoint = cleanEndpoint.replace(/^api\//, '');
      return `${cleanBase}/${cleanEndpoint}`;
    }
    return `${cleanBase}/${cleanEndpoint}`;
  }
  
  if (cleanBase.endsWith('/api')) {
    return `${cleanBase}/${cleanEndpoint}`;
  }
  
  if (cleanBase.includes('/api')) {
    return `${cleanBase}/${cleanEndpoint}`;
  }
  
  return `${cleanBase}/api/${cleanEndpoint}`;
};

// ✅ Vérification au chargement
console.log('📡 API_URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 secondes timeout
});

// ✅ INTERCEPTEUR REQUÊTE - Ajout du token
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    console.log(`📤 [api] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ INTERCEPTEUR RÉPONSE - Gestion d'erreur améliorée
api.interceptors.response.use(
  (response) => {
    console.log(`📤 [api] Réponse: ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    // ✅ Log détaillé de l'erreur
    console.error('❌ [api] Erreur:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // ✅ Transformer l'erreur en message lisible
    if (error.response?.data?.error) {
      error.message = error.response.data.error;
    } else if (error.response?.data?.message) {
      error.message = error.response.data.message;
    } else if (error.response?.status === 401) {
      error.message = 'Session expirée. Veuillez vous reconnecter.';
    } else if (error.response?.status === 403) {
      error.message = 'Accès non autorisé.';
    } else if (error.response?.status === 404) {
      error.message = 'Ressource non trouvée.';
    } else if (error.response?.status === 500) {
      error.message = 'Erreur serveur. Veuillez réessayer plus tard.';
    } else if (error.code === 'ECONNABORTED') {
      error.message = 'La requête a expiré. Vérifiez votre connexion.';
    } else if (!error.response) {
      error.message = 'Erreur de connexion. Vérifiez votre réseau.';
    }
    
    return Promise.reject(error);
  }
);

// =============================================
// AUTH API
// =============================================
export const authAPI = {
  register: (data: any) => {
    console.log('📤 Sending register data:', data);
    return api.post(normalizeApiUrl('/auth/register'), data);
  },
  login: (email: string, password: string) => {
    console.log('📤 Sending login data:', { email });
    return api.post(normalizeApiUrl('/auth/login'), { email, password });
  },
  forgotPassword: (email: string) => api.post(normalizeApiUrl('/auth/forgot-password'), { email }),
  resetPassword: (token: string, password: string) => api.post(normalizeApiUrl('/auth/reset-password'), { token, password }),
  getMe: () => api.get(normalizeApiUrl('/auth/me')),
  switchRole: (role: string) => api.post(normalizeApiUrl('/auth/switch-role'), { role }),
  addProche: (data: any) => api.post(normalizeApiUrl('/auth/add-patient'), data),
  addPatient: (data: any) => api.post(normalizeApiUrl('/auth/add-patient'), data),
  deleteAccount: (userId: string) => api.post(normalizeApiUrl('/auth/delete-account'), { userId }),
  
  // ✅ Admin - Approbation aidant
  approveAidant: (aidantId: string, comments?: string) => 
    api.post(normalizeApiUrl('/auth/admin/approve-aidant'), { aidantId, comments }),
  
  // ✅ Admin - Refus aidant
  rejectAidant: (aidantId: string, comments?: string) => 
    api.post(normalizeApiUrl('/auth/admin/reject-aidant'), { aidantId, comments }),
  
  // ✅ Admin - Traiter une inscription
  processRegistration: (registrationId: string, status: string, comments?: string) =>
    api.post(normalizeApiUrl('/auth/admin/process-registration'), { registrationId, status, comments }),
};

// =============================================
// PROCHES API (ex-PATIENTS)
// =============================================
export const procheAPI = {
  getAll: () => api.get(normalizeApiUrl('/patients')),
  getById: (id: string) => api.get(normalizeApiUrl(`/patients/${id}`)),
  create: (data: any) => api.post(normalizeApiUrl('/patients'), data),
  update: (id: string, data: any) => api.put(normalizeApiUrl(`/patients/${id}`), data),
  delete: (id: string) => api.delete(normalizeApiUrl(`/patients/${id}`)),
  getVisits: (id: string) => api.get(normalizeApiUrl(`/patients/${id}/visits`)),
  getOrders: (id: string) => api.get(normalizeApiUrl(`/patients/${id}/orders`)),
  assignAidant: (patientId: string, aidantId: string, assignmentType: string = 'permanente') => 
    api.post(normalizeApiUrl(`/patients/${patientId}/assign-aidant`), { aidantId, assignmentType }),
  getAidants: (patientId: string) => api.get(normalizeApiUrl(`/patients/${patientId}/aidants`)),
};

export const patientAPI = procheAPI;

// =============================================
// VISITS API
// =============================================
export const visitAPI = {
  getAll: () => api.get(normalizeApiUrl('/visits')),
  getById: (id: string) => api.get(normalizeApiUrl(`/visits/${id}`)),
  create: (data: any) => api.post(normalizeApiUrl('/visits'), data),
  update: (id: string, data: any) => api.put(normalizeApiUrl(`/visits/${id}`), data),
  delete: (id: string) => api.delete(normalizeApiUrl(`/visits/${id}`)),
  approve: (id: string) => api.post(normalizeApiUrl(`/visits/${id}/approve`)),
  refuse: (id: string, reason: string) => api.post(normalizeApiUrl(`/visits/${id}/refuse`), { reason }),
  reassign: (id: string, aidantId: string, assignmentType: string = 'ponctuelle') => 
    api.post(normalizeApiUrl(`/visits/${id}/reassign`), { aidant_id: aidantId, assignment_type: assignmentType }),
  confirmPayment: (id: string, transactionId: string) => 
    api.post(normalizeApiUrl(`/visits/${id}/confirm-payment`), { transaction_id: transactionId }),
  start: (id: string) => api.post(normalizeApiUrl(`/visits/${id}/start`)),
  complete: (id: string, data: any) => api.post(normalizeApiUrl(`/visits/${id}/complete`), data),
  validate: (id: string) => api.post(normalizeApiUrl(`/visits/${id}/validate`)),
  cancel: (id: string) => api.post(normalizeApiUrl(`/visits/${id}/cancel`)),
  addPhoto: (id: string, photo: FormData) => api.post(normalizeApiUrl(`/visits/${id}/photos`), photo),
  getPending: () => api.get(normalizeApiUrl('/visits/pending')),
  getNeedingReassign: () => api.get(normalizeApiUrl('/visits/needing-reassign')),
  cancelDraft: (id: string, reason?: string) => 
    api.post(normalizeApiUrl(`/visits/${id}/cancel-draft`), { reason }),
  getPrice: (id: string) => api.get(normalizeApiUrl(`/visits/${id}/price`)),
  getDrafts: () => api.get(normalizeApiUrl('/visits/drafts/my')),
  // ✅ Convertir un brouillon en visite avec abonnement
  convertToSubscription: (id: string) => 
    api.post(normalizeApiUrl(`/visits/${id}/convert-to-subscription`)),
  // ✅ Obtenir les comptes pour l'admin
  getAccounts: () => api.get(normalizeApiUrl('/visits/accounts')),
};

// =============================================
// ORDERS API
// =============================================
export const orderAPI = {
  getAll: () => api.get(normalizeApiUrl('/orders')),
  getById: (id: string) => api.get(normalizeApiUrl(`/orders/${id}`)),
  create: (data: any) => api.post(normalizeApiUrl('/orders'), data),
  update: (id: string, data: any) => api.put(normalizeApiUrl(`/orders/${id}`), data),
  delete: (id: string) => api.delete(normalizeApiUrl(`/orders/${id}`)),
  take: (id: string) => api.post(normalizeApiUrl(`/orders/${id}/take`)),
  accept: (id: string) => api.post(normalizeApiUrl(`/orders/${id}/accept`)),
  prepare: (id: string) => api.post(normalizeApiUrl(`/orders/${id}/prepare`)),
  deliver: (id: string, data?: any) => api.post(normalizeApiUrl(`/orders/${id}/deliver`), data),
  cancel: (id: string) => api.post(normalizeApiUrl(`/orders/${id}/cancel`)),
  validate: (id: string) => api.post(normalizeApiUrl(`/orders/${id}/validate`)),
  confirmPayment: (id: string, transactionId: string) => 
    api.post(normalizeApiUrl(`/orders/${id}/confirm-payment`), { transaction_id: transactionId }),
  updateStatus: (id: string, status: string) => api.post(normalizeApiUrl(`/orders/${id}/status`), { status }),
};

// =============================================
// MESSAGES API
// =============================================
export const messageAPI = {
  getConversations: () => api.get(normalizeApiUrl('/messages/conversations')),
  getMessages: (conversationId: string) => api.get(normalizeApiUrl(`/messages/${conversationId}`)),
  send: (data: any) => api.post(normalizeApiUrl('/messages'), data),
  markAsRead: (messageId: string) => api.put(normalizeApiUrl(`/messages/${messageId}/read`)),
  markAllRead: (conversationId: string) => api.put(normalizeApiUrl(`/messages/${conversationId}/read-all`)),
  createConversation: (participantIds: string[]) => 
    api.post(normalizeApiUrl('/messages/conversations'), { participantIds }),
};

// =============================================
// PAYMENTS API
// =============================================
export const paymentAPI = {
  create: (data: any) => api.post(normalizeApiUrl('/payments'), data),
  getStatus: (reference: string) => api.get(normalizeApiUrl(`/payments/${reference}`)),
  getHistory: () => api.get(normalizeApiUrl('/payments/history')),
  getSubscriptions: () => api.get(normalizeApiUrl('/payments/subscriptions')),
  subscribe: (data: any) => api.post(normalizeApiUrl('/payments/subscribe'), data),
  cancelSubscription: (id: string) => api.post(normalizeApiUrl(`/payments/subscriptions/${id}/cancel`)),
  // ✅ Générer un paiement via FedaPay
  generatePayment: (data: {
    amount: number;
    description?: string;
    plan_id?: string;
    abonnement_id?: string;
    email?: string;
    is_ponctual?: boolean;
    is_visit?: boolean;
    visit_id?: string;
    order_data?: any;
    patient_id?: string;
    target_type?: string;
    target_name?: string;
    type?: 'visit' | 'order' | 'subscription';
  }) => api.post(normalizeApiUrl('/billing/generate-payment'), data),
  // ✅ Vérifier un paiement
  verifyPayment: (transactionId?: string, reference?: string) => {
    const params = new URLSearchParams();
    if (transactionId) params.append('transaction_id', transactionId);
    if (reference) params.append('reference', reference);
    return api.get(normalizeApiUrl(`/billing/verify-payment?${params.toString()}`));
  },
};

// =============================================
// NOTIFICATIONS API
// =============================================
export const notificationAPI = {
  getAll: () => api.get(normalizeApiUrl('/notifications')),
  getUnreadCount: () => api.get(normalizeApiUrl('/notifications/unread-count')),
  markAsRead: (id: string) => api.put(normalizeApiUrl(`/notifications/${id}/read`)),
  markAllRead: () => api.put(normalizeApiUrl('/notifications/read-all')),
  registerToken: (token: string, deviceInfo?: string) => 
    api.post(normalizeApiUrl('/notifications/register-token'), { token, device_info: deviceInfo }),
  removeToken: (token: string) => api.post(normalizeApiUrl('/notifications/remove-token'), { token }),
};

// =============================================
// ADMIN API
// =============================================
export const adminAPI = {
  getStats: () => api.get(normalizeApiUrl('/admin/stats')),
  getRegistrations: () => api.get(normalizeApiUrl('/admin/registrations')),
  processRegistration: (id: string, data: any) => api.put(normalizeApiUrl(`/admin/registrations/${id}`), data),
  getUsers: () => api.get(normalizeApiUrl('/admin/users')),
  updateUserRole: (userId: string, role: string) => api.put(normalizeApiUrl(`/admin/users/${userId}/role`), { role }),
  createAidant: (data: any) => api.post(normalizeApiUrl('/admin/aidants'), data),
  getOffers: () => api.get(normalizeApiUrl('/admin/offers')),
  createOffer: (data: any) => api.post(normalizeApiUrl('/admin/offers'), data),
  updateOffer: (id: string, data: any) => api.put(normalizeApiUrl(`/admin/offers/${id}`), data),
  getAvailableAidants: () => api.get(normalizeApiUrl('/admin/aidants/available')),
  assignAidant: (data: { familyId: string; aidantId: string; assignmentType: string }) => 
    api.post(normalizeApiUrl('/admin/assign-aidant'), data),
  deleteUser: (userId: string) => api.delete(normalizeApiUrl(`/admin/users/${userId}`)),
};

// =============================================
// ✅ ASSIGNMENTS API 
// =============================================
export const assignmentAPI = {
  getAll: (filters?: { targetType?: string; targetId?: string; status?: string; aidantUserId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.targetType) params.append('targetType', filters.targetType);
    if (filters?.targetId) params.append('targetId', filters.targetId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.aidantUserId) params.append('aidantUserId', filters.aidantUserId);
    
    const url = `/assignments${params.toString() ? `?${params.toString()}` : ''}`;
    return api.get(normalizeApiUrl(url));
  },

  getMyAssignments: (filters?: { status?: string; targetType?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.targetType) params.append('targetType', filters.targetType);
    
    const url = `/assignments/my${params.toString() ? `?${params.toString()}` : ''}`;
    return api.get(normalizeApiUrl(url));
  },

  getActive: (targetType: string, targetId: string, familyId?: string) => {
    const params = new URLSearchParams({ targetType, targetId });
    if (familyId) params.append('familyId', familyId);
    return api.get(normalizeApiUrl(`/assignments/active?${params.toString()}`));
  },

  getAllForTarget: (targetType: string, targetId: string, familyId?: string) => {
    const params = new URLSearchParams({ targetType, targetId });
    if (familyId) params.append('familyId', familyId);
    return api.get(normalizeApiUrl(`/assignments/all?${params.toString()}`));
  },

  familyAssign: (data: {
    aidantUserId: string;
    targetType: 'personal_account' | 'patient';
    targetId?: string;
    patientId?: string;
    assignmentType?: string;
  }) => {
    return api.post(normalizeApiUrl('/assignments/family/assign'), data);
  },

  create: (data: {
    aidantUserId: string;
    targetType: string;
    targetId: string;
    familyId?: string | null;
    assignmentType?: string;
    reason?: string | null;
    expiresAt?: string | null;
  }) => api.post(normalizeApiUrl('/assignments'), data),

  revoke: (assignmentId: string, reason?: string) => 
    api.delete(normalizeApiUrl(`/assignments/${assignmentId}`), { data: { reason } }),

  check: (aidantUserId: string, targetType: string, targetId: string) => {
    const params = new URLSearchParams({ aidantUserId, targetType, targetId });
    return api.get(normalizeApiUrl(`/assignments/check?${params.toString()}`));
  },

  getByAidant: (aidantUserId: string, status?: string) => {
    const url = `/assignments/aidant/${aidantUserId}${status ? `?status=${status}` : ''}`;
    return api.get(normalizeApiUrl(url));
  },

  getByTarget: (targetType: string, targetId: string, status?: string) => {
    const url = `/assignments/target/${targetType}/${targetId}${status ? `?status=${status}` : ''}`;
    return api.get(normalizeApiUrl(url));
  },

  adminGetAll: () => api.get(normalizeApiUrl('/assignments/admin/all')),

  adminUpdateStatus: (assignmentId: string, status: string, reason?: string) =>
    api.put(normalizeApiUrl(`/assignments/admin/${assignmentId}/status`), { status, reason }),

  adminGetStats: () => api.get(normalizeApiUrl('/assignments/admin/stats')),

  adminForceAssign: (data: {
    aidantUserId: string;
    targetType: string;
    targetId: string;
    familyId?: string | null;
    assignmentType?: string;
    reason?: string | null;
    expiresAt?: string | null;
    force?: boolean;
  }) => api.post(normalizeApiUrl('/assignments/admin/force'), data),
};

// =============================================
// CONTRAT API
// =============================================
export const contractAPI = {
  getStatus: () => api.get(normalizeApiUrl('/contract/status')),
  getActive: () => api.get(normalizeApiUrl('/contract/active')),
  accept: (contractId: string) => api.post(normalizeApiUrl('/contract/accept'), { contract_id: contractId }),
  getHistory: () => api.get(normalizeApiUrl('/contract/history')),
};

// =============================================
// SETTINGS API
// =============================================
export const settingsAPI = {
  getAll: () => api.get(normalizeApiUrl('/settings')),
  getPublic: () => api.get(normalizeApiUrl('/settings/public')),
  getByCategory: (category: string) => api.get(normalizeApiUrl(`/settings/category/${category}`)),
  getByKey: (key: string) => api.get(normalizeApiUrl(`/settings/${key}`)),
  update: (key: string, value: any) => api.put(normalizeApiUrl(`/settings/${key}`), { value }),
  updateMultiple: (settings: Record<string, any>) => api.put(normalizeApiUrl('/settings'), { settings }),
};

// =============================================
// OFFERS API
// =============================================
export const offersAPI = {
  getAll: () => api.get(normalizeApiUrl('/offers')),
  getById: (id: string) => api.get(normalizeApiUrl(`/offers/${id}`)),
  create: (data: any) => api.post(normalizeApiUrl('/offers'), data),
  update: (id: string, data: any) => api.put(normalizeApiUrl(`/offers/${id}`), data),
  delete: (id: string) => api.delete(normalizeApiUrl(`/offers/${id}`)),
  sync: () => api.post(normalizeApiUrl('/offers/sync')),
  // ✅ Récupérer les offres par catégorie
  getByCategory: (category: string) => api.get(normalizeApiUrl(`/offers/categories?category=${category}`)),
  // ✅ Récupérer les offres ponctuelles
  getPonctual: () => api.get(normalizeApiUrl('/offers/ponctual')),
};

// =============================================
// SUBSCRIPTIONS API
// =============================================
export const subscriptionsAPI = {
  // ✅ Récupérer les abonnements de l'utilisateur
  getMy: () => api.get(normalizeApiUrl('/subscriptions/my')),
  // ✅ Vérifier si l'utilisateur a un abonnement actif
  getActive: () => api.get(normalizeApiUrl('/subscriptions/active')),
  // ✅ Créer un abonnement
  create: (data: { offreId: string; patientId?: string }) => 
    api.post(normalizeApiUrl('/subscriptions'), data),
  // ✅ Utiliser une visite (décompter)
  useVisit: (subscriptionId: string, data: { visitId: string; isPonctual?: boolean; wasPaid?: boolean }) =>
    api.post(normalizeApiUrl(`/subscriptions/${subscriptionId}/use-visit`), data),
  // ✅ Utiliser une commande (décompter)
  useOrder: (subscriptionId: string, data: { orderId: string; isPonctual?: boolean; wasPaid?: boolean }) =>
    api.post(normalizeApiUrl(`/subscriptions/${subscriptionId}/use-order`), data),
  // ✅ Renouveler un abonnement
  renew: (subscriptionId: string) => 
    api.post(normalizeApiUrl(`/subscriptions/${subscriptionId}/renew`)),
  // ✅ Annuler l'auto-renouvellement
  cancelAutoRenew: (subscriptionId: string) =>
    api.post(normalizeApiUrl(`/subscriptions/${subscriptionId}/cancel-auto-renew`)),
};

// =============================================
// ADMIN SETUP API
// =============================================
export const adminSetupAPI = {
  // ✅ Vérifier le PIN
  verifyPin: (pin: string) => api.post(normalizeApiUrl('/admin-setup/verify-pin'), { pin }),
  // ✅ Envoyer un OTP
  sendOTP: (email: string) => api.post(normalizeApiUrl('/admin-setup/send-otp'), { email }),
  // ✅ Vérifier l'OTP
  verifyOTP: (email: string, otp: string) => api.post(normalizeApiUrl('/admin-setup/verify-otp'), { email, otp }),
  // ✅ Créer un compte admin
  createAdmin: (data: { full_name: string; email: string; password: string; role: string; phone?: string; otp: string }) =>
    api.post(normalizeApiUrl('/admin-setup/create'), data),
};

export default api;
