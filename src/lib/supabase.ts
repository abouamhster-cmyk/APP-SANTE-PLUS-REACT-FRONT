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
      'Content-Type': 'application/json',
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

// ✅ CORRIGÉ : Utiliser maybeSingle() au lieu de single()
export const getCurrentProfile = async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();  // ✅ Utiliser maybeSingle

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

//  Utiliser maybeSingle() pour éviter les erreurs
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
