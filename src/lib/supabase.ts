// 📁 src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'Accept': 'application/json', 
     },
  },
});

// =============================================
// HELPERS AUTH - CORRIGÉS AVEC maybeSingle()
// =============================================
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

 export const getCurrentProfile = async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('❌ getCurrentProfile error:', error);
    return null;
  }
  
  return data;
};

// ✅ CORRIGÉ : Utiliser maybeSingle() au lieu de single()
export const getProfileById = async (userId: string) => {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();   

  if (error) {
    console.error('❌ getProfileById error:', error);
    return null;
  }
  
  return data;
};

// Utiliser maybeSingle() pour éviter les erreurs
export const getProfileByRole = async (role: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', role)
    .order('full_name');

  if (error) {
    console.error('❌ getProfileByRole error:', error);
    return [];
  }
  
  return data || [];
};

// =============================================
// UPLOAD FILES
// =============================================
export const uploadFile = async (bucket: string, path: string, file: File) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
};

export const deleteFile = async (bucket: string, path: string) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
  return true;
};

// =============================================
// REALTIME SUBSCRIPTIONS
// =============================================
export const subscribeToTable = (
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  callback: (payload: any) => void,
  filter?: { column: string; value: any }
) => {
  let channel = supabase.channel(`${table}-changes`);

  let query = channel.on(
    'postgres_changes',
    {
      event,
      schema: 'public',
      table,
      filter: filter ? `${filter.column}=eq.${filter.value}` : undefined,
    },
    callback
  );

  query.subscribe();
  return query;
};

export const unsubscribeFromChannel = (channel: any) => {
  if (channel) {
    supabase.removeChannel(channel);
  }
};

// =============================================
// ✅ NOTIFICATIONS REALTIME (POUR LA CONSOLE)
// =============================================

/**
 * S'abonne aux notifications en temps réel pour un utilisateur
 */
export const subscribeToNotifications = (
  userId: string,
  onInsert: (payload: any) => void
) => {
  console.log(`📡 [Realtime] Souscription aux notifications pour ${userId}`);
  
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('📨 [Realtime] Nouvelle notification reçue:', payload);
        onInsert(payload);
      }
    )
    .subscribe((status) => {
      console.log(`📡 [Realtime] Statut: ${status}`);
      if (status === 'SUBSCRIBED') {
        console.log('✅ [Realtime] Canal actif');
      }
    });

  return channel;
};

/**
 * Se désabonne du canal de notifications
 */
export const unsubscribeFromNotifications = (channel: any) => {
  if (channel) {
    supabase.removeChannel(channel);
    console.log('📡 [Realtime] Désabonné');
  }
};

// =============================================
// ✅ GESTION DES TOKENS PUSH
// =============================================

/**
 * Enregistre un token push pour un utilisateur
 */
export const registerPushToken = async (userId: string, token: string, deviceInfo?: string) => {
  try {
    // Supprimer l'ancien token
    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId);

    // Insérer le nouveau token
    const { error } = await supabase
      .from('push_tokens')
      .insert({
        user_id: userId,
        token: token,
        device_info: deviceInfo || navigator.userAgent,
        is_active: true,
        last_used_at: new Date().toISOString(),
      });

    if (error) throw error;
    console.log('✅ Token push enregistré');
    return true;
  } catch (error) {
    console.error('❌ Erreur enregistrement token:', error);
    return false;
  }
};

/**
 * Supprime un token push
 */
export const removePushToken = async (userId: string, token?: string) => {
  try {
    let query = supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId);

    if (token) {
      query = query.eq('token', token);
    }

    const { error } = await query;
    if (error) throw error;
    console.log('✅ Token push supprimé');
    return true;
  } catch (error) {
    console.error('❌ Erreur suppression token:', error);
    return false;
  }
};

// =============================================
// ✅ NOTIFICATIONS EN BASE
// =============================================

/**
 * Récupère les notifications d'un utilisateur
 */
export const getNotifications = async (userId: string, limit: number = 50) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Erreur récupération notifications:', error);
    return [];
  }
};

/**
 * Marque une notification comme lue
 */
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ Erreur marquage notification:', error);
    return false;
  }
};

/**
 * Marque toutes les notifications comme lues
 */
export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ Erreur marquage toutes les notifications:', error);
    return false;
  }
};

/**
 * Crée une notification
 */
export const createNotification = async (data: {
  user_id: string;
  title: string;
  body: string;
  type: string;
  data?: any;
}) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.user_id,
        title: data.title,
        body: data.body,
        type: data.type,
        data: data.data || {},
        is_read: false,
        is_sent: true,
        sent_at: new Date().toISOString(),
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ Erreur création notification:', error);
    return false;
  }
};

console.log('✅ Supabase client initialisé');
