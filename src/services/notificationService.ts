// 📁 src/services/notificationService.ts

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { getFCMToken, onFCMessage } from '@/lib/firebase';
import { NotificationType } from '@/types';
import toast from 'react-hot-toast';

// ✅ URL UNIQUE
const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

// ============================================================
// ✅ CONFIGURATION DES SONS DE NOTIFICATION
// ============================================================

export const NOTIFICATION_SOUNDS = {
  DEFAULT: '/notification.mp3',
  SOUND_1: '/notification-sound-1.mp3',
  SOUND_2: '/notification-sound-2.mp3',
};

// ✅ Son actif (par défaut SOUND_1)
let activeSound = NOTIFICATION_SOUNDS.SOUND_1;
let isInitialized = false;

// ✅ INITIALISATION : Charger depuis localStorage ET depuis la base
export const initializeNotificationSound = async () => {
  if (isInitialized) return;
  isInitialized = true;

  try {
    // 1. Essayer de charger depuis la base
    const { user } = useAuthStore.getState();
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .single();

      if (!error && data?.preferences?.notification_sound) {
        const sound = data.preferences.notification_sound;
        if (Object.values(NOTIFICATION_SOUNDS).includes(sound)) {
          activeSound = sound;
          localStorage.setItem('notification_sound', sound);
          console.log('✅ Son chargé depuis la base:', sound);
          return;
        }
      }
    }

    // 2. Fallback: charger depuis localStorage
    const saved = localStorage.getItem('notification_sound');
    if (saved && Object.values(NOTIFICATION_SOUNDS).includes(saved)) {
      activeSound = saved;
      console.log('✅ Son chargé depuis localStorage:', saved);
      return;
    }

    // 3. Défaut
    activeSound = NOTIFICATION_SOUNDS.SOUND_1;
    console.log('ℹ️ Son par défaut utilisé');
  } catch (error) {
    console.warn('⚠️ Erreur chargement préférence son:', error);
    // Fallback localStorage
    const saved = localStorage.getItem('notification_sound');
    if (saved && Object.values(NOTIFICATION_SOUNDS).includes(saved)) {
      activeSound = saved;
    } else {
      activeSound = NOTIFICATION_SOUNDS.SOUND_1;
    }
  }
};

// ✅ SAUVEGARDER LE CHOIX DANS LA BASE
export const saveNotificationSoundPreference = async (soundUrl: string) => {
  try {
    const { user } = useAuthStore.getState();
    if (!user) {
      console.warn('⚠️ Utilisateur non connecté, sauvegarde locale uniquement');
      setNotificationSound(soundUrl);
      return;
    }

    // Récupérer les préférences actuelles
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const currentPrefs = profile?.preferences || {};
    const updatedPrefs = {
      ...currentPrefs,
      notification_sound: soundUrl,
    };

    // Sauvegarder dans Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ preferences: updatedPrefs })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Mettre à jour le localStorage
    localStorage.setItem('notification_sound', soundUrl);
    activeSound = soundUrl;

    console.log('✅ Son sauvegardé dans la base:', soundUrl);
  } catch (error) {
    console.error('❌ Erreur sauvegarde préférence son:', error);
    // Fallback: sauvegarde locale uniquement
    localStorage.setItem('notification_sound', soundUrl);
    activeSound = soundUrl;
  }
};

// ✅ CHANGER LE SON
export const setNotificationSound = (soundUrl: string) => {
  if (Object.values(NOTIFICATION_SOUNDS).includes(soundUrl)) {
    activeSound = soundUrl;
    localStorage.setItem('notification_sound', soundUrl);
    console.log('🔔 Son changé (local):', soundUrl);
    
    // ✅ Sauvegarder dans la base si connecté
    saveNotificationSoundPreference(soundUrl);
  } else {
    console.warn('⚠️ Son non disponible:', soundUrl);
  }
};

// ✅ Charger le son sauvegardé (fallback)
const loadSavedSound = () => {
  const saved = localStorage.getItem('notification_sound');
  if (saved && Object.values(NOTIFICATION_SOUNDS).includes(saved)) {
    activeSound = saved;
  }
};
loadSavedSound();

// ============================================================
// ✅ HELPER : TROUVER LA CLÉ SUPABASE AUTH
// ============================================================

function findSupabaseAuthKey(): string {
  const possibleKeys = [
    'supabase.auth.token',
    'supabase-auth-token',
    'sb-mrsrogkjthtnppecndyc-auth-token',
    'sb-mrsrogkjthtnppecndyc-auth-token.0',
    'sb-mrsrogkjthtnppecndyc-auth-token.1',
    'sb-localhost-auth-token',
  ];
  
  for (const key of possibleKeys) {
    if (localStorage.getItem(key)) {
      return key;
    }
  }
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-') && key.includes('auth-token')) {
      return key;
    }
  }
  
  return 'supabase.auth.token';
}

// ============================================================
// ✅ JOUER LE SON DE NOTIFICATION
// ============================================================

export const playNotificationSound = () => {
  try {
    const audio = new Audio(activeSound);
    audio.volume = 0.5;
    audio.play().catch(() => {
      // ✅ Fallback: API Web Audio
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => oscillator.stop(), 200);
        setTimeout(() => ctx.close(), 1000);
      } catch (e) {
        console.warn('⚠️ Son non disponible');
      }
    });
  } catch (error) {
    console.warn('⚠️ Erreur lecture son:', error);
  }
};

// ✅ Prévisualiser un son
export const previewNotificationSound = (soundUrl: string) => {
  try {
    const audio = new Audio(soundUrl);
    audio.volume = 0.3;
    audio.play();
    return true;
  } catch (error) {
    console.warn('⚠️ Erreur prévisualisation son:', error);
    return false;
  }
};

// ✅ Récupérer le son actif
export const getActiveSound = (): string => {
  return activeSound;
};

// ============================================================
// ✅ METTRE À JOUR LE BADGE
// ============================================================

export const updateNotificationBadge = (count: number) => {
  if (count > 0) {
    document.title = `(${count}) Santé Plus Services`;
  } else {
    document.title = 'Santé Plus Services';
  }
};

// ============================================================
// ✅ DEMANDER LA PERMISSION ET ENREGISTRER LE TOKEN (FCM)
// ============================================================

export const requestNotificationPermission = async (userId: string) => {
  try {
    const storedToken = localStorage.getItem('push_token');
    if (storedToken) {
      console.log('ℹ️ Token push déjà enregistré');
      return storedToken;
    }

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

    const fcmToken = await getFCMToken();
    if (!fcmToken) {
      console.warn('❌ Impossible d\'obtenir le FCM token');
      return null;
    }

    console.log('✅ FCM Token généré:', fcmToken.substring(0, 30) + '...');

    const authKey = findSupabaseAuthKey();
    console.log('🔑 Clé auth utilisée:', authKey);
    
    const authData = localStorage.getItem(authKey);
    
    if (!authData) {
      console.warn('❌ Pas de token d\'authentification');
      return null;
    }

    let parsed;
    try {
      parsed = JSON.parse(authData);
    } catch {
      console.warn('❌ Token auth invalide');
      return null;
    }

    const accessToken = parsed?.access_token || 
                        parsed?.currentSession?.access_token ||
                        parsed?.[0]?.access_token;

    if (!accessToken) {
      console.warn('❌ Pas de token d\'accès');
      return null;
    }

    console.log('🔐 Access token présent:', !!accessToken);

    const response = await fetch(`${API_URL}/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        token: fcmToken,
        device_info: navigator.userAgent,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erreur enregistrement token:', error);
      throw new Error(error.error || "Erreur lors de l'enregistrement du token");
    }

    localStorage.setItem('push_token', fcmToken);
    console.log('✅ Token push enregistré avec succès');

    const { unreadCount } = useNotificationStore.getState();
    updateNotificationBadge(unreadCount);

    onFCMessage((payload) => {
      console.log('📨 Message FCM reçu en foreground:', payload);
      
      const notification = payload.notification || {};
      const data = payload.data || {};
      
      useNotificationStore.getState().addNotification({
        id: `fcm_${Date.now()}`,
        user_id: userId,
        title: notification.title || 'Santé Plus',
        body: notification.body || 'Nouvelle notification',
        type: data.type || 'system',
        data: data,
        is_read: false,
        created_at: new Date().toISOString(),
      } as any);
      
      playNotificationSound();
    });

    return fcmToken;
  } catch (error) {
    console.error('❌ Erreur permission notifications:', error);
    return null;
  }
};

// ============================================================
// ✅ SUPPRIMER LE TOKEN (DÉCONNEXION)
// ============================================================

export const removePushToken = async (token?: string) => {
  try {
    const { user } = useAuthStore.getState();
    if (!user) return;

    const authKey = findSupabaseAuthKey();
    const authData = localStorage.getItem(authKey);
    
    if (!authData) {
      console.warn('❌ Pas de token d\'authentification');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(authData);
    } catch {
      console.warn('❌ Token auth invalide');
      return;
    }

    const accessToken = parsed?.access_token || 
                        parsed?.currentSession?.access_token ||
                        parsed?.[0]?.access_token;

    if (accessToken) {
      await fetch(`${API_URL}/notifications/remove-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          token: token || 'all',
          user_id: user.id,
        }),
      });
    }

    localStorage.removeItem('push_token');
    console.log('✅ Token push supprimé');
    updateNotificationBadge(0);
  } catch (error) {
    console.error('❌ Erreur suppression token:', error);
  }
};

// ============================================================
// ✅ INITIALISATION
// ============================================================

export const initializeFirebase = () => {
  console.log('✅ Firebase initialisé pour les notifications');
  return null;
};

// ============================================================
// ✅ NOTIFICATIONS POUR LES AIDANTS
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
// ✅ NOTIFICATIONS POUR LES FAMILLES
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
// ✅ NOTIFICATIONS POUR LES ADMINISTRATEURS
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
// ✅ UTILITAIRES DE NOTIFICATION
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
      
      playNotificationSound();
      
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
      
      playNotificationSound();
      
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
      
      playNotificationSound();
      
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
