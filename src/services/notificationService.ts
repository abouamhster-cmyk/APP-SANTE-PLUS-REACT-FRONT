// 📁 src/services/notificationService.ts

import { supabase } from '@/lib/supabase';
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationType } from '@/types';
import toast from 'react-hot-toast';

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

// ✅ ID fixe : empêche l'empilement des toasts Firebase foreground
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

    // ✅ Écouter les messages en premier plan
    onMessage(messaging, (payload) => {
      console.log('📨 Message reçu en premier plan:', payload);

      const { notification, data } = payload;

      if (!notification) return;

      const notificationType = (data?.type as NotificationType) || 'system';

      // ✅ Notification locale ajoutée au store
      const newNotification = {
        id: data?.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        user_id: useAuthStore.getState().user?.id || '',
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

      // ✅ Toast premium : une seule bulle visible à la fois
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

    // ✅ Envoyer le token au backend
    const { data: sessionData } = await supabase.auth.getSession();

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/notifications/register-token`,
      {
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
      }
    );

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

    await fetch(`${import.meta.env.VITE_API_URL}/notifications/remove-token`, {
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
// NOTIFICATIONS POUR LES AIDANTS
// ============================================================
export const notifyAidant = {
  orderAccepted: (orderId: string, patientName: string) => ({
    title: '✅ Commande acceptée',
    body: `Vous avez accepté la commande pour ${patientName}. Préparez-la !`,
    data: { type: 'commande' as NotificationType, orderId, action: 'prepare' },
  }),

  orderReady: (orderId: string, patientName: string) => ({
    title: '📦 Commande prête',
    body: `La commande pour ${patientName} est prête à être livrée.`,
    data: { type: 'commande' as NotificationType, orderId, action: 'deliver' },
  }),

  orderDelivered: (orderId: string, patientName: string) => ({
    title: '✅ Livraison terminée',
    body: `La commande pour ${patientName} a été livrée avec succès.`,
    data: { type: 'commande' as NotificationType, orderId, action: 'complete' },
  }),

  newOrderAvailable: (orderId: string) => ({
    title: '📦 Nouvelle commande disponible',
    body: 'Une nouvelle commande est disponible. Acceptez-la !',
    data: { type: 'commande' as NotificationType, orderId, action: 'accept' },
  }),

  newMissionAvailable: (missionId: string, patientName: string) => ({
    title: '🆕 Nouvelle mission disponible',
    body: `Une nouvelle mission pour ${patientName} est disponible.`,
    data: { type: 'visite' as NotificationType, missionId, action: 'accept' },
  }),

  missionStarted: (missionId: string, patientName: string) => ({
    title: '🚀 Mission démarrée',
    body: `Vous avez démarré la mission pour ${patientName}.`,
    data: { type: 'visite' as NotificationType, missionId, action: 'complete' },
  }),

  missionCompleted: (missionId: string, patientName: string) => ({
    title: '✅ Mission terminée',
    body: `La mission pour ${patientName} est terminée.`,
    data: { type: 'visite' as NotificationType, missionId, action: 'validate' },
  }),

  // ✅ NOUVEAU : Visite assignée (approbation/refus)
  newVisitAssigned: (visitId: string, patientName: string, date: string, time: string) => ({
    title: '📅 Nouvelle visite assignée',
    body: `Visite pour ${patientName} le ${date} à ${time}. Acceptez ou refusez.`,
    data: { type: 'visite' as NotificationType, visitId, action: 'approve' },
  }),

  visitApprovalReminder: (visitId: string, patientName: string, date: string) => ({
    title: '⏰ Rappel : Visite en attente',
    body: `Vous n'avez pas encore répondu pour la visite de ${patientName} le ${date}.`,
    data: { type: 'visite' as NotificationType, visitId, action: 'approve' },
  }),
};

// ============================================================
// NOTIFICATIONS POUR LES FAMILLES
// ============================================================
export const notifyFamily = {
  orderAccepted: (orderId: string) => ({
    title: '✅ Commande acceptée',
    body: 'Un aidant a accepté votre commande et la prépare.',
    data: { type: 'commande' as NotificationType, orderId },
  }),

  orderPreparing: (orderId: string) => ({
    title: '🔄 Commande en préparation',
    body: 'Votre commande est en cours de préparation.',
    data: { type: 'commande' as NotificationType, orderId },
  }),

  orderReady: (orderId: string) => ({
    title: '📦 Commande prête',
    body: 'Votre commande est prête et va être livrée.',
    data: { type: 'commande' as NotificationType, orderId },
  }),

  orderDelivering: (orderId: string) => ({
    title: '🚚 Commande en livraison',
    body: 'Votre commande est en route !',
    data: { type: 'commande' as NotificationType, orderId },
  }),

  orderDelivered: (orderId: string) => ({
    title: '✅ Commande livrée',
    body: 'Votre commande a été livrée avec succès.',
    data: { type: 'commande' as NotificationType, orderId },
  }),

  visitPlanned: (visitId: string, patientName: string, date: string, time: string) => ({
    title: '📅 Nouvelle visite planifiée',
    body: `Une visite pour ${patientName} est prévue le ${date} à ${time}.`,
    data: { type: 'visite' as NotificationType, visitId },
  }),

  visitStarted: (visitId: string, patientName: string) => ({
    title: '🚀 Visite en cours',
    body: `La visite pour ${patientName} a commencé.`,
    data: { type: 'visite' as NotificationType, visitId },
  }),

  visitCompleted: (visitId: string, patientName: string) => ({
    title: '✅ Visite terminée',
    body: `La visite pour ${patientName} est terminée.`,
    data: { type: 'visite' as NotificationType, visitId },
  }),

  // ✅ NOUVEAU : Approbation/Refus/Réassignation
  visitApproved: (visitId: string, patientName: string, date: string) => ({
    title: '✅ Visite acceptée',
    body: `L'aidant a accepté la visite pour ${patientName} le ${date}.`,
    data: { type: 'visite' as NotificationType, visitId, status: 'approved' },
  }),

  visitRefused: (visitId: string, patientName: string, date: string, reason: string) => ({
    title: '❌ Visite refusée',
    body: `L'aidant a refusé la visite pour ${patientName} le ${date}. Motif: ${reason}`,
    data: { type: 'visite' as NotificationType, visitId, status: 'refused' },
  }),

  visitReassigned: (visitId: string, patientName: string, date: string) => ({
    title: '🔄 Nouvel aidant assigné',
    body: `Un nouvel aidant a été assigné pour ${patientName} le ${date}.`,
    data: { type: 'visite' as NotificationType, visitId, status: 'reassigned' },
  }),

  visitReminder: (visitId: string, patientName: string, date: string) => ({
    title: '⏰ Rappel de visite',
    body: `La visite pour ${patientName} le ${date} est dans moins de 24h.`,
    data: { type: 'visite' as NotificationType, visitId, status: 'reminder' },
  }),
};

// ============================================================
// NOTIFICATIONS POUR LES ADMINISTRATEURS
// ============================================================
export const notifyAdmin = {
  // ✅ NOUVEAU : Visite à réassigner
  visitNeedsReassign: (visitId: string, patientName: string, date: string, reason: string) => ({
    title: '⚠️ Visite à réassigner',
    body: `La visite de ${patientName} le ${date} nécessite une réassignation. Motif: ${reason}`,
    data: { type: 'visite' as NotificationType, visitId, action: 'reassign' },
  }),

  visitRefused: (visitId: string, patientName: string, date: string, reason: string) => ({
    title: '❌ Visite refusée par l\'aidant',
    body: `L'aidant a refusé la visite de ${patientName} le ${date}. Motif: ${reason}`,
    data: { type: 'visite' as NotificationType, visitId, action: 'reassign' },
  }),

  visitNoResponse: (visitId: string, patientName: string, date: string) => ({
    title: '⏰ Visite sans réponse - 48h',
    body: `Aucune réponse de l'aidant pour la visite de ${patientName} le ${date}. Réassignation nécessaire.`,
    data: { type: 'visite' as NotificationType, visitId, action: 'reassign' },
  }),

  newRegistration: (userId: string, fullName: string) => ({
    title: '📋 Nouvelle inscription',
    body: `${fullName} s'est inscrit sur la plateforme.`,
    data: { type: 'system' as NotificationType, userId, action: 'review' },
  }),
};

// ============================================================
// UTILITAIRES DE NOTIFICATION GÉNÉRIQUES
// ============================================================
export const notify = {
  visitPlanned: (data: any) => ({
    title: 'Nouvelle visite planifiée',
    body: `Une visite est prévue pour ${data.patient_name} le ${data.date} à ${data.time}`,
    data: { type: 'visite' as NotificationType, ...data },
  }),

  orderStatusChanged: (orderId: string, status: string, patientName: string) => ({
    title: '📦 Mise à jour commande',
    body: `La commande pour ${patientName} est maintenant ${status}`,
    data: { type: 'commande' as NotificationType, orderId, status },
  }),

  messageReceived: (senderName: string, content: string) => ({
    title: `💬 Message de ${senderName}`,
    body: content.length > 50 ? content.substring(0, 50) + '...' : content,
    data: { type: 'message' as NotificationType },
  }),

  // ✅ NOUVEAU : Envoyer une notification à plusieurs utilisateurs
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
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur envoi notifications multiples:', error);
      return { success: false, error };
    }
  },

  // ✅ NOUVEAU : Envoyer à tous les admins
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

  // ✅ NOUVEAU : Envoyer à tous les aidants
  sendToAidants: async (title: string, body: string, type: NotificationType, data: any = {}) => {
    try {
      const { data: aidants } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'aidant');

      if (!aidants || aidants.length === 0) {
        console.log('ℹ️ Aucun aidant trouvé');
        return { success: true, sent: 0 };
      }

      return await notify.sendToMultiple(
        aidants.map((a: any) => a.id),
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
};

// ✅ Export par défaut
export default {
  initializeFirebase,
  requestNotificationPermission,
  removePushToken,
  notifyAidant,
  notifyFamily,
  notifyAdmin,
  notify,
};
