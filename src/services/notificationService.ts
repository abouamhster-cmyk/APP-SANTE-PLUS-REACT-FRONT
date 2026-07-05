// 📁 src/services/notificationService.ts

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationType } from '@/types';
import toast from 'react-hot-toast';

// ✅ URL UNIQUE
const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

// ============================================================
// DEMANDER LA PERMISSION ET ENREGISTRER LE TOKEN
// ============================================================

export const requestNotificationPermission = async (userId: string) => {
  try {
    // ✅ Vérifier si déjà enregistré
    const storedToken = localStorage.getItem('push_token');
    if (storedToken) {
      console.log('ℹ️ Token push déjà enregistré');
      return storedToken;
    }

    // ✅ Vérifier la permission
    if (!('Notification' in window)) {
      console.warn('❌ Notifications non supportées');
      return null;
    }

    const permission = await Notification.requestPermission();
    console.log('📢 Permission notification:', permission);

    if (permission !== 'granted') {
      console.warn('❌ Permission notifications refusée');
      return null;
    }

    // ✅ Générer un token unique
    const token = `push_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    console.log('✅ Token push généré:', token.substring(0, 30) + '...');

    // ✅ Enregistrer le token sur le backend
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      console.warn('❌ Pas de token d\'authentification');
      return null;
    }

    const response = await fetch(`${API_URL}/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        token,
        device_info: navigator.userAgent,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erreur enregistrement token:', error);
      throw new Error(error.error || "Erreur lors de l'enregistrement du token");
    }

    // ✅ Sauvegarder le token en local
    localStorage.setItem('push_token', token);
    console.log('✅ Token push enregistré avec succès');

    return token;
  } catch (error) {
    console.error('❌ Erreur permission notifications:', error);
    return null;
  }
};

// ============================================================
// SUPPRIMER LE TOKEN (DÉCONNEXION)
// ============================================================

export const removePushToken = async (token?: string) => {
  try {
    const { user } = useAuthStore.getState();
    if (!user) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (accessToken) {
      await fetch(`${API_URL}/notifications/remove-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          token: token || 'all',
          user_id: user.id,
        }),
      });
    }

    localStorage.removeItem('push_token');
    console.log('✅ Token push supprimé');
  } catch (error) {
    console.error('❌ Erreur suppression token:', error);
  }
};

// ============================================================
// INITIALISATION (simplifiée)
// ============================================================

export const initializeFirebase = () => {
  console.log('✅ Notifications initialisées (mode simplifié)');
  return null;
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
  newOrderAvailable: (orderId: string, patientName: string) => ({
    title: '📦 Nouvelle commande disponible',
    body: `Une nouvelle commande pour ${patientName} est disponible. Acceptez-la !`,
    data: { type: 'commande' as NotificationType, orderId, action: 'accept' },
  }),
  urgentOrderAvailable: (orderId: string, patientName: string) => ({
    title: '🚨 Commande urgente disponible',
    body: `Commande pour ${patientName} - Premier arrivé, premier servi !`,
    data: { type: 'commande' as NotificationType, orderId, action: 'take', urgency: 'high' },
  }),
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
  missionStarted: (missionId: string, patientName: string) => ({
    title: '🚀 Mission démarrée',
    body: `Vous avez démarré la mission pour ${patientName}.`,
    data: { type: 'visite' as NotificationType, missionId, action: 'complete' },
  }),
  missionCompleted: (missionId: string, patientName: string) => ({
    title: '✅ Mission terminée',
    body: `La mission pour ${patientName} est terminée. En attente de validation.`,
    data: { type: 'visite' as NotificationType, missionId, action: 'validate' },
  }),
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
  visitStarted: (visitId: string, patientName: string) => ({
    title: '🚀 Visite en cours',
    body: `La visite pour ${patientName} a commencé.`,
    data: { type: 'visite' as NotificationType, visitId },
  }),
  visitCompleted: (visitId: string, patientName: string) => ({
    title: '✅ Visite terminée',
    body: `La visite pour ${patientName} est terminée. En attente de validation.`,
    data: { type: 'visite' as NotificationType, visitId },
  }),
  visitValidated: (visitId: string, patientName: string) => ({
    title: '✅ Visite validée',
    body: `La visite pour ${patientName} a été validée.`,
    data: { type: 'visite' as NotificationType, visitId, status: 'validated' },
  }),
  visitReminder: (visitId: string, patientName: string, date: string) => ({
    title: '⏰ Rappel de visite',
    body: `La visite pour ${patientName} le ${date} est dans moins de 24h.`,
    data: { type: 'visite' as NotificationType, visitId, status: 'reminder' },
  }),
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
  visitExpired: (visitId: string, patientName: string, date: string) => ({
    title: '⏰ Visite expirée - Réassignation nécessaire',
    body: `La visite de ${patientName} le ${date} n'a pas reçu de réponse de l'aidant.`,
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
  orderNoResponse: (orderId: string, patientName: string) => ({
    title: '⏰ Commande sans réponse - 30min',
    body: `Aucune réponse pour la commande de ${patientName}. Disponible à tous les aidants.`,
    data: { type: 'commande' as NotificationType, orderId, action: 'monitor' },
  }),
  orderAvailable: (orderId: string, patientName: string) => ({
    title: '🚨 Commande urgente disponible',
    body: `La commande de ${patientName} est maintenant disponible à tous les aidants.`,
    data: { type: 'commande' as NotificationType, orderId, action: 'monitor' },
  }),
  newRegistration: (userId: string, fullName: string) => ({
    title: '📋 Nouvelle inscription',
    body: `${fullName} s'est inscrit sur la plateforme.`,
    data: { type: 'system' as NotificationType, userId, action: 'review' },
  }),
  newAidantApplication: (userId: string, fullName: string) => ({
    title: '🦸 Nouvelle candidature aidant',
    body: `${fullName} a postulé comme aidant.`,
    data: { type: 'system' as NotificationType, userId, action: 'review' },
  }),
};

// ============================================================
// UTILITAIRES DE NOTIFICATION
// ============================================================

export const notify = {
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

  sendToAidants: async (title: string, body: string, type: NotificationType, data: any = {}, onlyAvailable: boolean = true) => {
    try {
      let query = supabase
        .from('profiles')
        .select('id')
        .eq('role', 'aidant');

      if (onlyAvailable) {
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

  sendToPatientAidants: async (patientId: string, title: string, body: string, type: NotificationType, data: any = {}) => {
    try {
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
