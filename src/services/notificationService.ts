// 📁 src/services/notificationService.ts
 
import { supabase } from '@/lib/supabase';
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationType } from '@/types';
import toast from 'react-hot-toast';

// ✅ URL UNIQUE
const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

// ✅ Configuration Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let messaging: any = null;
let firebaseApp: any = null;

const FOREGROUND_NOTIFICATION_TOAST_ID = 'sante-plus-foreground-notification';

// ✅ Initialisation Firebase
export const initializeFirebase = () => {
  try {
    if (getApps().length > 0) {
      firebaseApp = getApp();
    } else {
      firebaseApp = initializeApp(firebaseConfig);
    }

    messaging = getMessaging(firebaseApp);

    onMessage(messaging, (payload) => {
      console.log('📨 Message reçu en premier plan:', payload);

      const { notification, data } = payload;

      if (!notification) return;

      const notificationType = (data?.type as NotificationType) || 'system';
      const userId = useAuthStore.getState().user?.id;

      // ✅ Vérifier que la notification est pour l'utilisateur connecté
      if (data?.user_id && data.user_id !== userId) {
        console.log('ℹ️ Notification pour un autre utilisateur, ignorée');
        return;
      }

      const newNotification = {
        id: data?.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        user_id: userId || '',
        title: notification.title || 'Notification',
        body: notification.body || '',
        type: notificationType,
        data: data || {},
        image_url: notification.image || null,
        is_read: false,
        read_at: null,
        is_sent: true,
        sent_at: new Date().toISOString(),
        is_delivered: true,
        delivered_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      useNotificationStore.getState().addNotification(newNotification);

      const title = notification.title || 'Notification';
      const body = notification.body || '';

      toast.dismiss(FOREGROUND_NOTIFICATION_TOAST_ID);

      setTimeout(() => {
        toast.success(body ? `${title}\n${body}` : title, {
          id: FOREGROUND_NOTIFICATION_TOAST_ID,
          duration: 4200,
          icon: '📨',
          position: 'top-center',
          style: {
            whiteSpace: 'pre-line',
          },
        });
      }, 80);
    });

    console.log('✅ Firebase initialisé avec succès');
    return messaging;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    return null;
  }
};

// ✅ Demander la permission et enregistrer le token
export const requestNotificationPermission = async (userId: string) => {
  try {
    if (!messaging) {
      initializeFirebase();
    }

    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.warn('❌ Permission notifications refusée');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (!token) {
      console.warn('❌ Aucun token FCM généré');
      return null;
    }

    const { data: sessionData } = await supabase.auth.getSession();

    const response = await fetch(`${API_URL}/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session?.access_token}`,
      },
      body: JSON.stringify({
        token,
        device_info: navigator.userAgent,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de l'enregistrement du token");
    }

    console.log('✅ Token FCM enregistré avec succès');
    return token;
  } catch (error) {
    console.error('❌ Erreur permission notifications:', error);
    return null;
  }
};

// ✅ Supprimer le token (déconnexion)
export const removePushToken = async (token?: string) => {
  try {
    const { user } = useAuthStore.getState();

    if (!user) return;

    if (messaging && token) {
      await deleteToken(messaging);
    }

    const { data: sessionData } = await supabase.auth.getSession();

    await fetch(`${API_URL}/notifications/remove-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session?.access_token}`,
      },
      body: JSON.stringify({
        token: token || 'all',
        user_id: user.id,
      }),
    });

    console.log('✅ Token FCM supprimé');
  } catch (error) {
    console.error('❌ Erreur suppression token:', error);
  }
};

 
// ============================================================
// NOTIFICATIONS POUR LES AIDANTS - FILTRÉES PAR ASSIGNATION
// ============================================================
export const notifyAidant = {
  // ✅ Commande acceptée
  orderAccepted: (orderId: string, patientName: string) => ({
    title: '✅ Commande acceptée',
    body: `Vous avez accepté la commande pour ${patientName}. Préparez-la !`,
    data: { type: 'commande' as NotificationType, orderId, action: 'prepare' },
  }),

  // ✅ Commande prête
  orderReady: (orderId: string, patientName: string) => ({
    title: '📦 Commande prête',
    body: `La commande pour ${patientName} est prête à être livrée.`,
    data: { type: 'commande' as NotificationType, orderId, action: 'deliver' },
  }),

  // ✅ Commande livrée
  orderDelivered: (orderId: string, patientName: string) => ({
    title: '✅ Livraison terminée',
    body: `La commande pour ${patientName} a été livrée avec succès.`,
    data: { type: 'commande' as NotificationType, orderId, action: 'complete' },
  }),

  // ✅ Nouvelle commande disponible (aidant assigné)
  newOrderAvailable: (orderId: string, patientName: string) => ({
    title: '📦 Nouvelle commande disponible',
    body: `Une nouvelle commande pour ${patientName} est disponible. Acceptez-la !`,
    data: { type: 'commande' as NotificationType, orderId, action: 'accept' },
  }),

  // ✅ Commande urgente disponible (tous les aidants)
  urgentOrderAvailable: (orderId: string, patientName: string) => ({
    title: '🚨 Commande urgente disponible',
    body: `Commande pour ${patientName} - Premier arrivé, premier servi !`,
    data: { type: 'commande' as NotificationType, orderId, action: 'take', urgency: 'high' },
  }),

  // ✅ Nouvelle mission (visite)
  newMissionAvailable: (missionId: string, patientName: string) => ({
    title: '🆕 Nouvelle mission disponible',
    body: `Une nouvelle mission pour ${patientName} est disponible.`,
    data: { type: 'visite' as NotificationType, missionId, action: 'accept' },
  }),

  // ✅ Visite assignée (approbation/refus)
  newVisitAssigned: (visitId: string, patientName: string, date: string, time: string) => ({
    title: '📅 Nouvelle visite assignée',
    body: `Visite pour ${patientName} le ${date} à ${time}. Acceptez ou refusez.`,
    data: { type: 'visite' as NotificationType, visitId, action: 'approve' },
  }),

  // ✅ Rappel approbation visite
  visitApprovalReminder: (visitId: string, patientName: string, date: string) => ({
    title: '⏰ Rappel : Visite en attente',
    body: `Vous n'avez pas encore répondu pour la visite de ${patientName} le ${date}.`,
    data: { type: 'visite' as NotificationType, visitId, action: 'approve' },
  }),

  // ✅ Mission démarrée
  missionStarted: (missionId: string, patientName: string) => ({
    title: '🚀 Mission démarrée',
    body: `Vous avez démarré la mission pour ${patientName}.`,
    data: { type: 'visite' as NotificationType, missionId, action: 'complete' },
  }),

  // ✅ Mission terminée
  missionCompleted: (missionId: string, patientName: string) => ({
    title: '✅ Mission terminée',
    body: `La mission pour ${patientName} est terminée. En attente de validation.`,
    data: { type: 'visite' as NotificationType, missionId, action: 'validate' },
  }),

  // ✅ Visite validée
  visitValidated: (visitId: string, patientName: string) => ({
    title: '✅ Visite validée',
    body: `La visite pour ${patientName} a été validée par l'administration.`,
    data: { type: 'visite' as NotificationType, visitId, action: 'done' },
  }),
};

// ============================================================
// NOTIFICATIONS POUR LES FAMILLES
// ============================================================
export const notifyFamily = {
  // ✅ Commande acceptée
  orderAccepted: (orderId: string) => ({
    title: '✅ Commande acceptée',
    body: 'Un aidant a accepté votre commande et la prépare.',
    data: { type: 'commande' as NotificationType, orderId },
  }),

  // ✅ Commande en préparation
  orderPreparing: (orderId: string) => ({
    title: '🔄 Commande en préparation',
    body: 'Votre commande est en cours de préparation.',
    data: { type: 'commande' as NotificationType, orderId },
  }),

  // ✅ Commande prête
  orderReady: (orderId: string) => ({
    title: '📦 Commande prête',
    body: 'Votre commande est prête et va être livrée.',
    data: { type: 'commande' as NotificationType, orderId },
  }),

  // ✅ Commande en livraison
  orderDelivering: (orderId: string) => ({
    title: '🚚 Commande en livraison',
    body: 'Votre commande est en route !',
    data: { type: 'commande' as NotificationType, orderId },
  }),

  // ✅ Commande livrée
  orderDelivered: (orderId: string) => ({
    title: '✅ Commande livrée',
    body: 'Votre commande a été livrée avec succès.',
    data: { type: 'commande' as NotificationType, orderId },
  }),

  // ✅ Nouvelle visite planifiée
  visitPlanned: (visitId: string, patientName: string, date: string, time: string) => ({
    title: '📅 Nouvelle visite planifiée',
    body: `Une visite pour ${patientName} est prévue le ${date} à ${time}.`,
    data: { type: 'visite' as NotificationType, visitId },
  }),

  // ✅ Visite acceptée par l'aidant
  visitApproved: (visitId: string, patientName: string, date: string) => ({
    title: '✅ Visite acceptée',
    body: `L'aidant a accepté la visite pour ${patientName} le ${date}.`,
    data: { type: 'visite' as NotificationType, visitId, status: 'approved' },
  }),

  // ✅ Visite refusée par l'aidant
  visitRefused: (visitId: string, patientName: string, date: string, reason: string) => ({
    title: '❌ Visite refusée',
    body: `L'aidant a refusé la visite pour ${patientName} le ${date}. Motif: ${reason}`,
    data: { type: 'visite' as NotificationType, visitId, status: 'refused' },
  }),

  // ✅ Visite réassignée
  visitReassigned: (visitId: string, patientName: string, date: string) => ({
    title: '🔄 Nouvel aidant assigné',
    body: `Un nouvel aidant a été assigné pour ${patientName} le ${date}.`,
    data: { type: 'visite' as NotificationType, visitId, status: 'reassigned' },
  }),

  // ✅ Visite démarrée
  visitStarted: (visitId: string, patientName: string) => ({
    title: '🚀 Visite en cours',
    body: `La visite pour ${patientName} a commencé.`,
    data: { type: 'visite' as NotificationType, visitId },
  }),

  // ✅ Visite terminée
  visitCompleted: (visitId: string, patientName: string) => ({
    title: '✅ Visite terminée',
    body: `La visite pour ${patientName} est terminée. En attente de validation.`,
    data: { type: 'visite' as NotificationType, visitId },
  }),

  // ✅ Visite validée
  visitValidated: (visitId: string, patientName: string) => ({
    title: '✅ Visite validée',
    body: `La visite pour ${patientName} a été validée.`,
    data: { type: 'visite' as NotificationType, visitId, status: 'validated' },
  }),

  // ✅ Rappel de visite
  visitReminder: (visitId: string, patientName: string, date: string) => ({
    title: '⏰ Rappel de visite',
    body: `La visite pour ${patientName} le ${date} est dans moins de 24h.`,
    data: { type: 'visite' as NotificationType, visitId, status: 'reminder' },
  }),

  // ✅ Paiement requis (visite ponctuelle)
  paymentRequired: (visitId: string, patientName: string, amount: number) => ({
    title: '💳 Paiement requis',
    body: `Le paiement de ${amount} FCFA est requis pour valider la visite de ${patientName}.`,
    data: { type: 'visite' as NotificationType, visitId, action: 'pay' },
  }),
};

// ============================================================
// NOTIFICATIONS POUR LES ADMINISTRATEURS
// ============================================================
export const notifyAdmin = {
  // ✅ Visite à réassigner (expirée)
  visitExpired: (visitId: string, patientName: string, date: string) => ({
    title: '⏰ Visite expirée - Réassignation nécessaire',
    body: `La visite de ${patientName} le ${date} n'a pas reçu de réponse de l'aidant.`,
    data: { type: 'visite' as NotificationType, visitId, action: 'reassign' },
  }),

  // ✅ Visite refusée par l'aidant
  visitRefused: (visitId: string, patientName: string, date: string, reason: string) => ({
    title: '❌ Visite refusée par l\'aidant',
    body: `L'aidant a refusé la visite de ${patientName} le ${date}. Motif: ${reason}`,
    data: { type: 'visite' as NotificationType, visitId, action: 'reassign' },
  }),

  // ✅ Visite sans réponse (48h)
  visitNoResponse: (visitId: string, patientName: string, date: string) => ({
    title: '⏰ Visite sans réponse - 48h',
    body: `Aucune réponse de l'aidant pour la visite de ${patientName} le ${date}. Réassignation nécessaire.`,
    data: { type: 'visite' as NotificationType, visitId, action: 'reassign' },
  }),

  // ✅ Commande sans réponse (30min)
  orderNoResponse: (orderId: string, patientName: string) => ({
    title: '⏰ Commande sans réponse - 30min',
    body: `Aucune réponse pour la commande de ${patientName}. Disponible à tous les aidants.`,
    data: { type: 'commande' as NotificationType, orderId, action: 'monitor' },
  }),

  // ✅ Commande disponible (urgente)
  orderAvailable: (orderId: string, patientName: string) => ({
    title: '🚨 Commande urgente disponible',
    body: `La commande de ${patientName} est maintenant disponible à tous les aidants.`,
    data: { type: 'commande' as NotificationType, orderId, action: 'monitor' },
  }),

  // ✅ Nouvelle inscription
  newRegistration: (userId: string, fullName: string) => ({
    title: '📋 Nouvelle inscription',
    body: `${fullName} s'est inscrit sur la plateforme.`,
    data: { type: 'system' as NotificationType, userId, action: 'review' },
  }),

  // ✅ Candidature aidant
  newAidantApplication: (userId: string, fullName: string) => ({
    title: '🦸 Nouvelle candidature aidant',
    body: `${fullName} a postulé comme aidant.`,
    data: { type: 'system' as NotificationType, userId, action: 'review' },
  }),
};

// ============================================================
// UTILITAIRES DE NOTIFICATION GÉNÉRIQUES AVEC FILTRAGE
// ============================================================
export const notify = {
  // ✅ Envoyer une notification à plusieurs utilisateurs
  sendToMultiple: async (userIds: string[], title: string, body: string, type: NotificationType, data: any = {}) => {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title,
        body,
        type,
        data,
        is_read: false,
        is_sent: true,
        sent_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;
      return { success: true, sent: userIds.length };
    } catch (error) {
      console.error('❌ Erreur envoi notifications multiples:', error);
      return { success: false, error, sent: 0 };
    }
  },

  // ✅ Envoyer à tous les admins
  sendToAdmins: async (title: string, body: string, type: NotificationType, data: any = {}) => {
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'coordinator']);

      if (!admins || admins.length === 0) {
        console.log('ℹ️ Aucun admin trouvé');
        return { success: true, sent: 0 };
      }

      return await notify.sendToMultiple(
        admins.map((a: any) => a.id),
        title,
        body,
        type,
        data
      );
    } catch (error) {
      console.error('❌ Erreur envoi aux admins:', error);
      return { success: false, error };
    }
  },

  // ✅ Envoyer à tous les aidants (avec filtrage par disponibilité)
  sendToAidants: async (title: string, body: string, type: NotificationType, data: any = {}, onlyAvailable: boolean = true) => {
    try {
      let query = supabase
        .from('profiles')
        .select('id')
        .eq('role', 'aidant');

      if (onlyAvailable) {
        // Récupérer les aidants disponibles via la table aidants
        const { data: aidants } = await supabase
          .from('aidants')
          .select('user_id')
          .eq('available', true)
          .eq('is_verified', true);

        if (!aidants || aidants.length === 0) {
          console.log('ℹ️ Aucun aidant disponible trouvé');
          return { success: true, sent: 0 };
        }

        const userIds = aidants.map((a: any) => a.user_id);
        return await notify.sendToMultiple(userIds, title, body, type, data);
      }

      const { data: profiles } = await query;

      if (!profiles || profiles.length === 0) {
        console.log('ℹ️ Aucun aidant trouvé');
        return { success: true, sent: 0 };
      }

      return await notify.sendToMultiple(
        profiles.map((p: any) => p.id),
        title,
        body,
        type,
        data
      );
    } catch (error) {
      console.error('❌ Erreur envoi aux aidants:', error);
      return { success: false, error };
    }
  },

  // ✅ Envoyer à une famille spécifique
  sendToFamily: async (familyId: string, title: string, body: string, type: NotificationType, data: any = {}) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: familyId,
          title,
          body,
          type,
          data,
          is_read: false,
          is_sent: true,
          sent_at: new Date().toISOString(),
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur envoi à la famille:', error);
      return { success: false, error };
    }
  },

  // ✅ Envoyer à un aidant spécifique
  sendToAidant: async (aidantUserId: string, title: string, body: string, type: NotificationType, data: any = {}) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: aidantUserId,
          title,
          body,
          type,
          data,
          is_read: false,
          is_sent: true,
          sent_at: new Date().toISOString(),
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur envoi à l\'aidant:', error);
      return { success: false, error };
    }
  },

  // ✅ Envoyer à tous les aidants assignés à un patient
  sendToPatientAidants: async (patientId: string, title: string, body: string, type: NotificationType, data: any = {}) => {
    try {
      // Récupérer les aidants assignés à ce patient via les visites
      const { data: visits } = await supabase
        .from('visites')
        .select('aidant_id')
        .eq('patient_id', patientId)
        .not('aidant_id', 'is', null);

      if (!visits || visits.length === 0) {
        console.log('ℹ️ Aucun aidant assigné à ce patient');
        return { success: true, sent: 0 };
      }

      const aidantIds = [...new Set(visits.map((v: any) => v.aidant_id))];
      const { data: aidants } = await supabase
        .from('aidants')
        .select('user_id')
        .in('id', aidantIds)
        .eq('available', true)
        .eq('is_verified', true);

      if (!aidants || aidants.length === 0) {
        console.log('ℹ️ Aucun aidant disponible trouvé');
        return { success: true, sent: 0 };
      }

      return await notify.sendToMultiple(
        aidants.map((a: any) => a.user_id),
        title,
        body,
        type,
        { ...data, patient_id: patientId }
      );
    } catch (error) {
      console.error('❌ Erreur envoi aux aidants du patient:', error);
      return { success: false, error };
    }
  },
};

