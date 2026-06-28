// 📁 src/features/profile/pages/ProfilePage.tsx

import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Phone,
  Edit2,
  Save,
  Camera,
  LogOut,
  ChevronRight,
  CheckCircle,
  Lock,
  Bell,
  Moon,
  Sun,
  Globe,
  Trash2,
  X,
  AlertCircle,
  Calendar,
  Users,
  ShoppingBag,
  ShieldCheck,
  Smartphone,
  User,
  UserCircle,
  Settings,
  Key,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { Illustration } from '@/components/ui/Illustration';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// =============================================
// TYPES
// =============================================

type ProfileTab = 'profile' | 'settings' | 'security';

interface Preferences {
  notifications: boolean;
  darkMode: boolean;
  language: 'fr' | 'en';
}

// =============================================
// CONSTANTES
// =============================================

const DEFAULT_PREFERENCES: Preferences = {
  notifications: true,
  darkMode: false,
  language: 'fr',
};

const STORAGE_KEY = 'sante_plus_preferences';

const lightThemeVars = {
  '--color-background': '#f5f0e8',
  '--color-text': '#2d2d2d',
  '--color-text-light': '#6b7280',
  '--color-border': '#e5e0d8',
};

const darkThemeVars = {
  '--color-background': '#101814',
  '--color-text': '#f3f7f5',
  '--color-text-light': '#a8b6b0',
  '--color-border': '#25362f',
};

// =============================================
// UTILITAIRES
// =============================================

const applyThemeMode = (darkMode: boolean) => {
  const root = document.documentElement;
  root.classList.toggle('dark', darkMode);
  root.dataset.theme = darkMode ? 'dark' : 'light';
  const vars = darkMode ? darkThemeVars : lightThemeVars;
  Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
  document.body.style.backgroundColor = vars['--color-background'];
  document.body.style.color = vars['--color-text'];
};

const getSavedPreferences = (): Preferences => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(saved);
    return {
      notifications: typeof parsed.notifications === 'boolean' ? parsed.notifications : DEFAULT_PREFERENCES.notifications,
      darkMode: typeof parsed.darkMode === 'boolean' ? parsed.darkMode : DEFAULT_PREFERENCES.darkMode,
      language: parsed.language === 'en' || parsed.language === 'fr' ? parsed.language : DEFAULT_PREFERENCES.language,
    };
  } catch { return DEFAULT_PREFERENCES; }
};

const getInitials = (name: string) => 
  name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

const ProfilePage = () => {
  const navigate = useNavigate();
  const { profile, role, logout, updateProfile, refreshProfile } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();
  const { visits, fetchVisits } = useVisitStore();
  const { orders, fetchOrders } = useOrderStore();
  const toggleNotifications = useNotificationStore((state) => state.toggleNotifications);
  const notificationsEnabled = useNotificationStore((state) => state.notificationsEnabled);

  // =============================================
  // ÉTATS
  // =============================================

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [preferenceMessage, setPreferenceMessage] = useState('');

  const formRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    preferences: DEFAULT_PREFERENCES,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // =============================================
  // THEME & RÔLE
  // =============================================

  const colors = getThemeColors(getThemeByRole(role as any, profile?.patient_category as any));

  const getRoleLabel = () => {
    if (role === 'admin') return 'Administrateur';
    if (role === 'coordinator') return 'Coordinateur';
    if (role === 'aidant') return 'Aidant';
    return 'Famille';
  };

  const getRoleIcon = () => {
    if (role === 'admin' || role === 'coordinator') return <ShieldCheck size={14} />;
    if (role === 'aidant') return <UserCircle size={14} />;
    return <Users size={14} />;
  };

  // =============================================
  // EFFETS
  // =============================================

  useEffect(() => {
    const prefs = getSavedPreferences();
    setFormData(prev => ({ ...prev, preferences: prefs }));
    applyThemeMode(prefs.darkMode);
  }, []);

  useEffect(() => {
    if (!profile) return;
    setFormData(prev => ({ 
      ...prev, 
      full_name: profile.full_name || '', 
      phone: profile.phone || '', 
      email: profile.email || '' 
    }));
    setAvatarPreview(profile.avatar_url || null);
  }, [profile]);

  useEffect(() => {
    fetchPatients();
    fetchVisits();
    fetchOrders();
  }, [fetchPatients, fetchVisits, fetchOrders]);

  // =============================================
  // FONCTIONS - PRÉFÉRENCES
  // =============================================

  const savePreferences = (prefs: Preferences, message?: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setFormData(prev => ({ ...prev, preferences: prefs }));
    if (message) { 
      setPreferenceMessage(message); 
      setTimeout(() => setPreferenceMessage(''), 1800); 
    }
  };

  // =============================================
  // FONCTIONS - PROFIL
  // =============================================

  const handleSaveProfile = async () => {
    if (!formData.full_name.trim()) return toast.error('Le nom est obligatoire');
    if (!profile?.id) return toast.error('Profil introuvable');
    
    setIsLoading(true);
    try {
      let avatarUrl = profile.avatar_url || null;
      
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop() || 'png';
        const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });
        
        if (uploadError) throw new Error(uploadError.message);
        avatarUrl = supabase.storage.from('avatars').getPublicUrl(uploadData.path).data.publicUrl + `?v=${Date.now()}`;
      }
      
      await updateProfile({ 
        full_name: formData.full_name.trim(), 
        phone: formData.phone.trim(), 
        avatar_url: avatarUrl, 
        preferences: formData.preferences 
      });
      
      setAvatarPreview(avatarUrl);
      setAvatarFile(null);
      setIsEditing(false);
      if (refreshProfile) await refreshProfile();
      toast.success('Profil mis à jour');
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la mise à jour');
    } finally { setIsLoading(false); }
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Veuillez sélectionner une image');
    if (file.size > 5 * 1024 * 1024) return toast.error("L'image ne doit pas dépasser 5MB");
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setAvatarPreview(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  // =============================================
  // FONCTIONS - MOT DE PASSE
  // =============================================

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordData.currentPassword) return toast.error('Mot de passe actuel requis');
    if (passwordData.newPassword !== passwordData.confirmPassword) return toast.error('Les mots de passe ne correspondent pas');
    if (passwordData.newPassword.length < 6) return toast.error('Minimum 6 caractères');
    if (passwordData.newPassword === passwordData.currentPassword) return toast.error('Le nouveau mot de passe doit être différent');
    
    setIsLoading(true);
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');
      
      const { error: signInError } = await supabase.auth.signInWithPassword({ 
        email: user.email!, 
        password: passwordData.currentPassword 
      });
      if (signInError) return toast.error('Mot de passe actuel incorrect');
      
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      
      toast.success('Mot de passe mis à jour');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error?.message || 'Erreur');
    } finally { setIsLoading(false); }
  };

  // =============================================
  // FONCTIONS - SUPPRESSION COMPTE
  // =============================================

  const handleDeleteAccount = async () => {
    if (!window.confirm('⚠️ Cette action supprimera définitivement votre compte ET tous vos proches.')) return;
    
    setIsLoading(true);
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non trouvé');
      
      const { data: links } = await supabase
        .from('patient_family_links')
        .select('patient_id')
        .eq('family_id', user.id);
      const patientIds = links?.map(l => l.patient_id) || [];
      
      if (patientIds.length > 0) {
        await supabase.from('patients').delete().in('id', patientIds);
      }
      
      await supabase.from('patient_family_links').delete().eq('family_id', user.id);
      await supabase.from('inscriptions').delete().eq('user_id', user.id);
      await supabase.from('notifications').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);
      
      const { data: sessionData } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_API_URL}/auth/delete-account`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${sessionData.session?.access_token}` 
        },
        body: JSON.stringify({ userId: user.id }),
      });
      
      localStorage.removeItem('sante_plus_preferences');
      localStorage.removeItem('auth-storage');
      await supabase.auth.signOut();
      toast.success('Compte supprimé avec succès');
      navigate('/login');
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la suppression');
    } finally { setIsLoading(false); }
  };

  // =============================================
  // FONCTIONS - PRÉFÉRENCES UI
  // =============================================

  const handleToggleNotifications = () => {
    const nextValue = !formData.preferences.notifications;
    savePreferences(
      { ...formData.preferences, notifications: nextValue }, 
      nextValue ? 'Notifications activées' : 'Notifications désactivées'
    );
    if (notificationsEnabled !== nextValue) toggleNotifications?.();
  };

  const handleToggleDarkMode = () => {
    const nextValue = !formData.preferences.darkMode;
    applyThemeMode(nextValue);
    savePreferences(
      { ...formData.preferences, darkMode: nextValue }, 
      nextValue ? 'Mode sombre activé' : 'Mode clair activé'
    );
  };

  const handleLanguageChange = (lang: 'fr' | 'en') => {
    savePreferences(
      { ...formData.preferences, language: lang }, 
      lang === 'fr' ? 'Langue définie en français' : 'Language set to English'
    );
    setShowLanguageModal(false);
  };

  // =============================================
  // FONCTIONS - DÉCONNEXION
  // =============================================

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // =============================================
  // STATS
  // =============================================

  const quickStats = [
    { label: 'Proches', value: patients.length, icon: <Users size={16} /> },
    { label: 'Visites', value: visits.length, icon: <Calendar size={16} /> },
    { label: 'Commandes', value: orders.length, icon: <ShoppingBag size={16} /> },
  ];

  // =============================================
  // RENDU
  // =============================================

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20 p-3 sm:p-4">
      
      {/* ========================================== */}
      {/* MESSAGE DE PRÉFÉRENCE */}
      {/* ========================================== */}
      {preferenceMessage && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-2xl shadow-lg text-white text-sm font-bold"
          style={{ background: colors.primary }}
        >
          {preferenceMessage}
        </div>
      )}

      {/* ========================================== */}
      {/* HEADER - CARTE PROFIL */}
      {/* ========================================== */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-black/5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          
          {/* Avatar */}
          <div className="relative mx-auto sm:mx-0">
            <div 
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-sm"
              style={{ background: colors.primary }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover rounded-3xl" />
              ) : (
                getInitials(profile?.full_name || '')
              )}
            </div>
            {isEditing && (
              <label 
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-2xl bg-white shadow-md flex items-center justify-center cursor-pointer hover:scale-105 transition"
                style={{ color: colors.primary }}
              >
                <Camera size={15} />
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            )}
          </div>

          {/* Infos utilisateur */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold truncate" style={{ color: colors.text }}>
              {profile?.full_name || 'Utilisateur'}
            </h1>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                {getRoleIcon()}
                {getRoleLabel()}
              </span>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 sm:gap-4 mt-2 text-xs opacity-70">
              <span className="flex items-center gap-1.5">
                <Mail size={13} /> {profile?.email || '-'}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone size={13} /> {profile?.phone || 'Non renseigné'}
              </span>
            </div>
          </div>

          {/* Bouton Modifier */}
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className="px-4 py-2 rounded-2xl text-xs font-bold transition hover:bg-gray-50 border border-gray-100 shrink-0"
          >
            {isEditing ? 'Annuler' : 'Modifier'}
          </button>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t" style={{ borderColor: colors.border }}>
          {quickStats.map((item) => (
            <div key={item.label} className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: colors.text + '70' }}>
                {item.icon}
                <span className="font-black" style={{ color: colors.primary }}>{item.value}</span>
              </div>
              <p className="text-[9px] text-gray-400 uppercase tracking-wider mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================== */}
      {/* ÉDITION (si active) */}
      {/* ========================================== */}
      {isEditing && (
        <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-black/5">
          <h3 className="text-sm font-bold mb-4" style={{ color: colors.text }}>Modifier mes informations</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input 
              value={formData.full_name} 
              onChange={e => setFormData({...formData, full_name: e.target.value})} 
              className="w-full p-3 rounded-2xl bg-gray-50 outline-none text-sm"
              placeholder="Nom complet"
            />
            <input 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
              className="w-full p-3 rounded-2xl bg-gray-50 outline-none text-sm"
              placeholder="Téléphone"
            />
            <div className="sm:col-span-2">
              <input 
                value={formData.email} 
                disabled 
                className="w-full p-3 rounded-2xl bg-gray-100 outline-none text-sm text-gray-400 cursor-not-allowed"
                placeholder="Email (non modifiable)"
              />
              <p className="text-[9px] text-gray-400 mt-1">L'email ne peut pas être modifié ici.</p>
            </div>
          </div>
          <button 
            onClick={handleSaveProfile} 
            disabled={isLoading}
            className="w-full mt-4 py-3 rounded-2xl text-white font-bold text-sm transition hover:opacity-90 disabled:opacity-60"
            style={{ background: colors.primary }}
          >
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </section>
      )}

      {/* ========================================== */}
      {/* TABS */}
      {/* ========================================== */}
      <div className="flex bg-gray-50 p-1 rounded-2xl w-fit mx-auto sm:mx-0">
        {(['profile', 'settings', 'security'] as const).map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`px-4 py-2 rounded-xl text-[10px] font-bold capitalize transition-all flex items-center gap-1.5 ${
              activeTab === tab ? 'bg-white shadow-sm' : 'text-gray-400'
            }`}
            style={{ color: activeTab === tab ? colors.primary : undefined }}
          >
            {tab === 'profile' && <User size={13} />}
            {tab === 'settings' && <Settings size={13} />}
            {tab === 'security' && <Lock size={13} />}
            {tab === 'profile' && 'Profil'}
            {tab === 'settings' && 'Préférences'}
            {tab === 'security' && 'Sécurité'}
          </button>
        ))}
      </div>

      {/* ========================================== */}
      {/* CONTENU DES TABS */}
      {/* ========================================== */}
      <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-black/5">
        
        {/* TAB PROFIL */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoField label="Nom complet" value={profile?.full_name || '-'} />
            <InfoField label="Email" value={profile?.email || '-'} />
            <InfoField label="Téléphone" value={profile?.phone || '-'} />
            <InfoField label="Rôle" value={getRoleLabel() || '-'} />
            <InfoField label="Membre depuis" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : '-'} />
            <InfoField label="Dernière mise à jour" value={profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('fr-FR') : '-'} />
          </div>
        )}

        {/* TAB PRÉFÉRENCES */}
        {activeTab === 'settings' && (
          <div className="space-y-3">
            <SettingToggle 
              icon={<Bell size={16} />} 
              title="Notifications" 
              description={formData.preferences.notifications ? 'Alertes importantes activées' : 'Alertes désactivées'}
              active={formData.preferences.notifications} 
              onClick={handleToggleNotifications} 
              colors={colors} 
            />
            <SettingToggle 
              icon={formData.preferences.darkMode ? <Moon size={16} /> : <Sun size={16} />} 
              title="Mode sombre" 
              description={formData.preferences.darkMode ? 'Affichage sombre' : 'Affichage clair'}
              active={formData.preferences.darkMode} 
              onClick={handleToggleDarkMode} 
              colors={colors} 
            />
            <button 
              onClick={() => setShowLanguageModal(true)} 
              className="w-full flex items-center justify-between p-4 rounded-2xl border hover:bg-gray-50 transition"
              style={{ borderColor: colors.border }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: colors.primary + '10', color: colors.primary }}>
                  <Globe size={16} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm" style={{ color: colors.text }}>Langue</p>
                  <p className="text-xs text-gray-400">{formData.preferences.language === 'fr' ? 'Français' : 'English'}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>
        )}

        {/* TAB SÉCURITÉ */}
        {activeTab === 'security' && (
          <div className="space-y-3">
            <ActionRow 
              icon={<Lock size={16} />} 
              title="Changer le mot de passe" 
              description="Mettre à jour votre accès"
              onClick={() => setShowPasswordModal(true)} 
              colors={colors} 
            />
            <div className="flex items-center justify-between p-4 rounded-2xl border" style={{ borderColor: colors.border }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: colors.primary + '10', color: colors.primary }}>
                  <Smartphone size={16} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm" style={{ color: colors.text }}>Appareil connecté</p>
                  <p className="text-xs text-gray-400">{navigator.userAgent?.split(' ').slice(-2).join(' ') || 'Navigateur'}</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-600 font-bold flex items-center gap-1">
                <CheckCircle size={10} />
                Actif
              </span>
            </div>
            <button 
              onClick={() => setShowDeleteModal(true)} 
              className="w-full p-4 rounded-2xl border-2 border-red-200 bg-red-50 text-red-600 font-bold text-left hover:bg-red-100 transition flex items-center gap-3"
            >
              <Trash2 size={16} />
              <div className="text-left">
                <p className="text-sm">Supprimer mon compte</p>
                <p className="text-[10px] font-normal text-red-400">⚠️ Supprime définitivement votre compte et tous vos proches</p>
              </div>
            </button>
          </div>
        )}
      </section>

      {/* ========================================== */}
      {/* DÉCONNEXION */}
      {/* ========================================== */}
      <button 
        onClick={handleLogout} 
        className="w-full flex items-center justify-center gap-2 text-xs font-bold text-red-500 p-4 rounded-3xl border border-red-100 hover:bg-red-50 transition"
      >
        <LogOut size={16} />
        Se déconnecter
      </button>

      {/* ========================================== */}
      {/* MODALS */}
      {/* ========================================== */}

      {/* Modal Changer mot de passe */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key size={20} style={{ color: colors.primary }} />
                <h3 className="font-black" style={{ color: colors.text }}>Nouveau mot de passe</h3>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-400">Entrez votre mot de passe actuel puis choisissez-en un nouveau.</p>
            <input 
              type="password" 
              placeholder="Mot de passe actuel" 
              className="w-full p-3 rounded-2xl bg-gray-50 text-sm outline-none"
              onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} 
            />
            <input 
              type="password" 
              placeholder="Nouveau mot de passe" 
              className="w-full p-3 rounded-2xl bg-gray-50 text-sm outline-none"
              onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} 
            />
            <input 
              type="password" 
              placeholder="Confirmer" 
              className="w-full p-3 rounded-2xl bg-gray-50 text-sm outline-none"
              onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} 
            />
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-2 rounded-xl font-bold text-sm border" style={{ borderColor: colors.border, color: colors.text }}>Annuler</button>
              <button onClick={handleChangePassword} className="flex-1 py-2 rounded-xl font-bold text-sm text-white" style={{ background: colors.primary }}>Valider</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Langue */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe size={20} style={{ color: colors.primary }} />
                <h3 className="font-black" style={{ color: colors.text }}>Choisir la langue</h3>
              </div>
              <button onClick={() => setShowLanguageModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2">
              <button onClick={() => handleLanguageChange('fr')} className="w-full p-3 rounded-2xl border flex items-center justify-between" style={{ borderColor: formData.preferences.language === 'fr' ? colors.primary : colors.border }}>
                <span>Français</span>
                {formData.preferences.language === 'fr' && <CheckCircle size={16} style={{ color: colors.primary }} />}
              </button>
              <button onClick={() => handleLanguageChange('en')} className="w-full p-3 rounded-2xl border flex items-center justify-between" style={{ borderColor: formData.preferences.language === 'en' ? colors.primary : colors.border }}>
                <span>English</span>
                {formData.preferences.language === 'en' && <CheckCircle size={16} style={{ color: colors.primary }} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 my-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#FEF2F2' }}>
                <AlertCircle size={28} style={{ color: '#EF4444' }} />
              </div>
              <h3 className="font-black text-center" style={{ color: colors.text }}>Supprimer le compte</h3>
              <p className="text-center text-sm text-gray-500 mt-2">
                Cette action est irréversible. Toutes vos données seront supprimées.
              </p>
              <p className="text-center text-sm font-bold text-red-500 mt-2">
                Êtes-vous sûr de vouloir continuer ?
              </p>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-2xl font-bold text-sm border" style={{ borderColor: colors.border, color: colors.text }}>Annuler</button>
              <button onClick={handleDeleteAccount} disabled={isLoading} className="flex-1 py-2.5 rounded-2xl font-bold text-sm text-white" style={{ background: '#EF4444' }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================
// COMPOSANTS
// =============================================

// =============================================
// INFO FIELD
// =============================================

const InfoField = ({ label, value }: { label: string; value: string }) => (
  <div className="p-4 rounded-2xl bg-gray-50">
    <p className="text-[10px] font-bold uppercase text-gray-400">{label}</p>
    <p className="text-sm font-semibold mt-1" style={{ color: 'var(--color-text, #2d2d2d)' }}>{value}</p>
  </div>
);

// =============================================
// SETTING TOGGLE
// =============================================

const SettingToggle = ({ 
  icon, title, description, active, onClick, colors 
}: { 
  icon: ReactNode; 
  title: string; 
  description: string; 
  active: boolean; 
  onClick: () => void; 
  colors: any 
}) => (
  <button 
    onClick={onClick} 
    className="w-full flex items-center justify-between p-4 rounded-2xl border hover:bg-gray-50 transition"
    style={{ borderColor: colors.border }}
  >
    <div className="flex items-center gap-3">
      <div 
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: colors.primary + '10', color: colors.primary }}
      >
        {icon}
      </div>
      <div className="text-left">
        <p className="font-bold text-sm" style={{ color: colors.text }}>{title}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </div>
    <div 
      className="w-10 h-6 rounded-full transition relative shrink-0"
      style={{ background: active ? colors.primary : '#d1d5db' }}
    >
      <div 
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
        style={{ transform: active ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </div>
  </button>
);

// =============================================
// ACTION ROW
// =============================================

const ActionRow = ({ 
  icon, title, description, onClick, colors, danger 
}: { 
  icon: ReactNode; 
  title: string; 
  description?: string; 
  onClick: () => void; 
  colors: any; 
  danger?: boolean 
}) => (
  <button 
    onClick={onClick} 
    className="w-full flex items-center justify-between p-4 rounded-2xl border transition hover:bg-gray-50"
    style={{ 
      borderColor: danger ? '#FECACA' : colors.border, 
      background: danger ? '#FEF2F2' : undefined 
    }}
  >
    <div className="flex items-center gap-3">
      <div 
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ 
          background: danger ? '#FEE2E2' : colors.primary + '10', 
          color: danger ? '#EF4444' : colors.primary 
        }}
      >
        {icon}
      </div>
      <div className="text-left">
        <p className="font-bold text-sm" style={{ color: danger ? '#EF4444' : colors.text }}>{title}</p>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
    </div>
    <ChevronRight size={16} className={danger ? 'text-red-400' : 'text-gray-400'} />
  </button>
);

export default ProfilePage;
