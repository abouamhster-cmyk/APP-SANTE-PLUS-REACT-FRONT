// 📁 src/features/profile/pages/ProfilePage.tsx

import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Phone,
  Edit2,
  Save,
  Camera,
  Calendar,
  LogOut,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Users,
  Smartphone,
  ShoppingBag,
  ShieldCheck,
  Lock,
  Bell,
  Moon,
  Globe,
  Sun,
  Trash2,
  User,
  X,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type ProfileTab = 'profile' | 'settings' | 'security';

interface Preferences {
  notifications: boolean;
  darkMode: boolean;
  language: 'fr' | 'en';
}

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

const applyThemeMode = (darkMode: boolean) => {
  const root = document.documentElement;

  root.classList.toggle('dark', darkMode);
  root.dataset.theme = darkMode ? 'dark' : 'light';

  const vars = darkMode ? darkThemeVars : lightThemeVars;

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  document.body.style.backgroundColor = vars['--color-background'];
  document.body.style.color = vars['--color-text'];
};

const getSavedPreferences = (): Preferences => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_PREFERENCES;

    const parsed = JSON.parse(saved);

    return {
      notifications:
        typeof parsed.notifications === 'boolean'
          ? parsed.notifications
          : DEFAULT_PREFERENCES.notifications,
      darkMode:
        typeof parsed.darkMode === 'boolean'
          ? parsed.darkMode
          : DEFAULT_PREFERENCES.darkMode,
      language:
        parsed.language === 'en' || parsed.language === 'fr'
          ? parsed.language
          : DEFAULT_PREFERENCES.language,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

const ProfilePage = () => {
  const navigate = useNavigate();

  const { profile, role, logout, updateProfile, refreshProfile } =
    useAuthStore();

  const { patients, fetchPatients } = usePatientStore();
  const { visits, fetchVisits } = useVisitStore();
  const { orders, fetchOrders } = useOrderStore();

  const toggleNotifications = useNotificationStore(
    (state) => state.toggleNotifications
  );

  const notificationsEnabled = useNotificationStore(
    (state) => state.notificationsEnabled
  );

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [preferenceMessage, setPreferenceMessage] = useState('');

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

  const currentRole = (profile?.role || role || null) as string | null;

  const themeName = getThemeByRole(
    currentRole as any,
    profile?.patient_category as any
  );

  const colors = getThemeColors(themeName);

  const roleEmojiLabel =
    currentRole === 'admin'
      ? '👑 Administrateur'
      : currentRole === 'coordinator' || currentRole === 'COORDINATEUR'
        ? '👔 Coordinateur'
        : currentRole === 'aidant' || currentRole === 'AIDANT'
          ? '🦸 Aidant'
          : '👨‍👩‍👦 Famille';

  const roleTextLabel =
    currentRole === 'admin'
      ? 'Administrateur'
      : currentRole === 'coordinator' || currentRole === 'COORDINATEUR'
        ? 'Coordinateur'
        : currentRole === 'aidant' || currentRole === 'AIDANT'
          ? 'Aidant'
          : 'Famille';

  useEffect(() => {
    const prefs = getSavedPreferences();

    setFormData((prev) => ({
      ...prev,
      preferences: prefs,
    }));

    applyThemeMode(prefs.darkMode);
  }, []);

  useEffect(() => {
    if (!profile) return;

    setFormData((prev) => ({
      ...prev,
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      email: profile.email || '',
    }));

    setAvatarPreview(profile.avatar_url || null);
  }, [profile]);

  useEffect(() => {
    fetchPatients();
    fetchVisits();
    fetchOrders();
  }, [fetchPatients, fetchVisits, fetchOrders]);

  const savePreferences = (prefs: Preferences, message?: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

    setFormData((prev) => ({
      ...prev,
      preferences: prefs,
    }));

    if (message) {
      setPreferenceMessage(message);

      window.setTimeout(() => {
        setPreferenceMessage('');
      }, 1800);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.full_name.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }

    if (!profile?.id) {
      toast.error('Profil introuvable');
      return;
    }

    setIsLoading(true);

    try {
      let avatarUrl = profile.avatar_url || null;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop() || 'png';
        const cleanExt =
          fileExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';

        const fileName = `${profile.id}/${Date.now()}.${cleanExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, {
            upsert: true,
            contentType: avatarFile.type,
          });

        if (uploadError) {
          console.error('❌ Erreur upload avatar:', uploadError);
          throw new Error(uploadError.message || "Impossible d'envoyer la photo");
        }

        if (!uploadData?.path) {
          throw new Error("L'image a été envoyée mais le chemin est introuvable");
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);

        avatarUrl = `${publicUrl}?v=${Date.now()}`;
      }

      await updateProfile({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        avatar_url: avatarUrl,
        preferences: formData.preferences,
      });

      setAvatarPreview(avatarUrl);
      setAvatarFile(null);
      setIsEditing(false);

      if (refreshProfile) {
        await refreshProfile();
      }

      toast.success('Profil mis à jour');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour profil:', error);
      toast.error(error?.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Changement de mot de passe avec vérification de l'ancien
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();

    // ✅ Vérifier que l'ancien mot de passe est rempli
    if (!passwordData.currentPassword) {
      toast.error('Veuillez entrer votre mot de passe actuel');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    // ✅ Vérifier que le nouveau mot de passe est différent de l'ancien
    if (passwordData.newPassword === passwordData.currentPassword) {
      toast.error('Le nouveau mot de passe doit être différent de l\'ancien');
      return;
    }

    setIsLoading(true);

    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      // ✅ Vérifier l'ancien mot de passe avec signInWithPassword
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        toast.error('Mot de passe actuel incorrect');
        setIsLoading(false);
        return;
      }

      // ✅ Changer le mot de passe
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) {
        if (error.message.includes('Password should be different')) {
          throw new Error('Le nouveau mot de passe doit être différent de l\'ancien');
        }
        throw error;
      }

      toast.success('✅ Mot de passe mis à jour avec succès');
      setShowPasswordModal(false);

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('❌ Erreur changement mot de passe:', error);
      toast.error(error?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

 
const handleDeleteAccount = async () => {
  if (
    !window.confirm(
      '⚠️ ATTENTION : Cette action supprimera définitivement votre compte ET tous vos proches. Cette action est irréversible.'
    )
  ) {
    return;
  }

  setIsLoading(true);

  try {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error('Utilisateur non trouvé');

    // ✅ Récupérer TOUS les patients liés à cet utilisateur
    const { data: links, error: linksError } = await supabase
      .from('patient_family_links')
      .select('patient_id')
      .eq('family_id', user.id);

    if (linksError) throw linksError;

    const patientIds = links?.map(l => l.patient_id) || [];

    // ✅ Supprimer les patients (CASCADE)
    if (patientIds.length > 0) {
      const { error: deletePatientsError } = await supabase
        .from('patients')
        .delete()
        .in('id', patientIds);

      if (deletePatientsError) throw deletePatientsError;
    }

    // ✅ Supprimer les liens
    await supabase
      .from('patient_family_links')
      .delete()
      .eq('family_id', user.id);

    // ✅ Supprimer les inscriptions
    await supabase
      .from('inscriptions')
      .delete()
      .eq('user_id', user.id);

    // ✅ Supprimer les notifications
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    // ✅ Supprimer le profil
    await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    // ✅ Supprimer l'utilisateur Supabase Auth
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    await fetch(`${import.meta.env.VITE_API_URL}/auth/delete-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: user.id }),
    });

    // ✅ Nettoyer le localStorage
    localStorage.removeItem('sante_plus_preferences');
    localStorage.removeItem('auth-storage');

    // ✅ Déconnexion
    await supabase.auth.signOut();
    
    toast.success('✅ Compte et tous vos proches supprimés avec succès');
    navigate('/login');
    
  } catch (error: any) {
    console.error('❌ Erreur suppression:', error);
    toast.error(error?.message || 'Erreur lors de la suppression du compte');
  } finally {
    setIsLoading(false);
  }
};
  const handleLanguageChange = (lang: 'fr' | 'en') => {
    const newPrefs: Preferences = {
      ...formData.preferences,
      language: lang,
    };

    savePreferences(
      newPrefs,
      lang === 'fr' ? 'Langue définie en français' : 'Language set to English'
    );

    setShowLanguageModal(false);
  };

  const handleToggleNotifications = () => {
    const nextValue = !formData.preferences.notifications;

    const newPrefs: Preferences = {
      ...formData.preferences,
      notifications: nextValue,
    };

    savePreferences(
      newPrefs,
      nextValue ? 'Notifications activées' : 'Notifications désactivées'
    );

    if (notificationsEnabled !== nextValue) {
      toggleNotifications?.();
    }
  };

  const handleToggleDarkMode = () => {
    const nextValue = !formData.preferences.darkMode;

    const newPrefs: Preferences = {
      ...formData.preferences,
      darkMode: nextValue,
    };

    applyThemeMode(nextValue);

    savePreferences(
      newPrefs,
      nextValue ? 'Mode sombre activé' : 'Mode clair activé'
    );
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5MB");
      return;
    }

    setAvatarFile(file);

    const reader = new FileReader();

    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };

    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const quickStats = [
    {
      label: 'Proches',
      value: patients.length,
      icon: patients.length > 0 ? <Users size={18} /> : <User size={18} />,
    },
    {
      label: 'Visites',
      value: visits.length,
      icon: <Calendar size={18} />,
    },
    {
      label: 'Commandes',
      value: orders.length,
      icon: <ShoppingBag size={18} />,
    },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  return (
    <div className="space-y-5 pb-8">
      {preferenceMessage && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-2xl shadow-lg text-white text-sm font-bold"
          style={{ background: colors.primary }}
        >
          {preferenceMessage}
        </div>
      )}

      <section
        className="rounded-3xl overflow-hidden shadow-sm border"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}14, #ffffff 45%, ${colors.primary}08)`,
          borderColor: colors.primary + '14',
        }}
      >
        <div className="p-5 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="relative w-fit">
                <div
                  className="w-24 h-24 md:w-28 md:h-28 rounded-3xl flex items-center justify-center text-3xl text-white font-black overflow-hidden shadow-sm"
                  style={{ background: colors.primary }}
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(profile?.full_name || 'U')
                  )}
                </div>

                {isEditing && (
                  <label
                    className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white shadow-md flex items-center justify-center cursor-pointer hover:scale-105 transition"
                    style={{ color: colors.primary }}
                  >
                    <Camera size={18} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="min-w-0">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-2"
                  style={{
                    background: colors.primary + '12',
                    color: colors.primary,
                  }}
                >
                  <ShieldCheck size={13} />
                  Compte actif
                </div>

                <h1
                  className="text-2xl md:text-3xl font-black leading-tight break-words"
                  style={{ color: colors.text }}
                >
                  {profile?.full_name || 'Utilisateur'}
                </h1>

                <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
                  {roleEmojiLabel}
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3 text-sm">
                  <span
                    className="inline-flex items-center gap-2"
                    style={{ color: colors.text + '80' }}
                  >
                    <Mail size={15} />
                    {profile?.email || 'Email non renseigné'}
                  </span>

                  <span
                    className="inline-flex items-center gap-2"
                    style={{ color: colors.text + '80' }}
                  >
                    <Phone size={15} />
                    {profile?.phone || 'Non renseigné'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-white font-bold text-sm transition hover:opacity-90"
              style={{ background: colors.primary }}
            >
              <Edit2 size={17} />
              Modifier
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-3 mt-5">
            {quickStats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl p-3 bg-white/80 border"
                style={{ borderColor: colors.primary + '10' }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
                  style={{
                    background: colors.primary + '10',
                    color: colors.primary,
                  }}
                >
                  {item.icon}
                </div>

                <p
                  className="text-xl font-black leading-none"
                  style={{ color: colors.text }}
                >
                  {item.value}
                </p>

                <p className="text-xs mt-1" style={{ color: colors.text + '60' }}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isEditing && (
        <section className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-black/5">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-black" style={{ color: colors.text }}>
                Modifier le profil
              </h2>
              <p className="text-sm text-gray-500">
                Mettez à jour vos informations personnelles.
              </p>
            </div>

            <button
              onClick={() => {
                setIsEditing(false);
                setAvatarFile(null);
                setAvatarPreview(profile?.avatar_url || null);
              }}
              className="px-3 py-2 rounded-xl border text-sm font-bold hover:bg-gray-50"
              style={{ borderColor: colors.primary + '18', color: colors.text }}
            >
              Annuler
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Nom complet"
              value={formData.full_name}
              onChange={(value) =>
                setFormData({ ...formData, full_name: value })
              }
              colors={colors}
            />

            <Field
              label="Téléphone"
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              colors={colors}
            />

            <div className="md:col-span-2">
              <Field
                label="Email"
                value={formData.email}
                onChange={() => {}}
                disabled
                colors={colors}
              />

              <p className="text-xs mt-1 text-gray-400">
                L’email ne peut pas être modifié ici.
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={isLoading}
            className="mt-5 w-full md:w-auto px-5 py-3 rounded-2xl text-white font-bold transition hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: colors.primary }}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} />
                Enregistrer les changements
              </>
            )}
          </button>
        </section>
      )}

      <section className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-black/5">
          {[
            { id: 'profile', label: 'Profil' },
            { id: 'settings', label: 'Préférences' },
            { id: 'security', label: 'Sécurité' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ProfileTab)}
              className="px-5 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition"
              style={{
                borderColor:
                  activeTab === tab.id ? colors.primary : 'transparent',
                color:
                  activeTab === tab.id ? colors.primary : colors.text + '60',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 md:p-6">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoCard
                label="Nom complet"
                value={profile?.full_name || 'Non renseigné'}
                colors={colors}
              />
              <InfoCard
                label="Email"
                value={profile?.email || 'Non renseigné'}
                colors={colors}
              />
              <InfoCard
                label="Téléphone"
                value={profile?.phone || 'Non renseigné'}
                colors={colors}
              />
              <InfoCard label="Rôle" value={roleTextLabel} colors={colors} />
              <InfoCard
                label="Membre depuis"
                value={
                  profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('fr-FR')
                    : 'Non disponible'
                }
                colors={colors}
              />
              <InfoCard
                label="Dernière mise à jour"
                value={
                  profile?.updated_at
                    ? new Date(profile.updated_at).toLocaleDateString('fr-FR')
                    : 'Non disponible'
                }
                colors={colors}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-3">
              <SettingToggle
                icon={<Bell size={18} />}
                title="Notifications"
                description={
                  formData.preferences.notifications
                    ? 'Les alertes importantes sont activées'
                    : 'Les alertes importantes sont désactivées'
                }
                active={formData.preferences.notifications}
                onClick={handleToggleNotifications}
                colors={colors}
              />

              <SettingToggle
                icon={
                  formData.preferences.darkMode ? (
                    <Moon size={18} />
                  ) : (
                    <Sun size={18} />
                  )
                }
                title="Mode sombre"
                description={
                  formData.preferences.darkMode
                    ? 'Affichage sombre activé'
                    : 'Affichage clair activé'
                }
                active={formData.preferences.darkMode}
                onClick={handleToggleDarkMode}
                colors={colors}
              />

              <button
                type="button"
                className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl border text-left hover:bg-gray-50 transition"
                style={{
                  background: colors.primary + '05',
                  borderColor: colors.primary + '10',
                }}
                onClick={() => setShowLanguageModal(true)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{
                      background: colors.primary + '10',
                      color: colors.primary,
                    }}
                  >
                    <Globe size={18} />
                  </div>

                  <div>
                    <p className="font-bold" style={{ color: colors.text }}>
                      Langue
                    </p>

                    <p className="text-sm text-gray-500">
                      {formData.preferences.language === 'fr'
                        ? 'Français'
                        : 'English'}
                    </p>
                  </div>
                </div>

                <ChevronRight size={18} className="text-gray-400" />
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-3">
              <ActionRow
                icon={<Lock size={18} />}
                title="Changer le mot de passe"
                description="Mettre à jour votre accès"
                onClick={() => setShowPasswordModal(true)}
                colors={colors}
              />

              <div
                className="flex items-center justify-between gap-4 p-4 rounded-2xl border"
                style={{
                  background: colors.primary + '05',
                  borderColor: colors.primary + '10',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{
                      background: colors.primary + '10',
                      color: colors.primary,
                    }}
                  >
                    <Smartphone size={18} />
                  </div>

                  <div>
                    <p className="font-bold" style={{ color: colors.text }}>
                      Appareil connecté
                    </p>

                    <p className="text-sm text-gray-500">
                      {navigator.userAgent?.split(' ').slice(-2).join(' ') ||
                        'Navigateur'}
                    </p>
                  </div>
                </div>

                <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-600 font-bold">
                  Actif
                </span>
              </div>
              
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full p-4 rounded-2xl border-2 border-red-500 bg-red-50 text-red-600 font-bold text-left hover:bg-red-100 transition flex items-center gap-3"
              >
                <Trash2 size={20} />
                <div>
                  <p>🗑️ Supprimer mon compte</p>
                  <p className="text-xs font-normal text-red-400">
                    ⚠️ Cette action supprimera définitivement votre compte et TOUS vos proches.
                  </p>
                </div>
              </button>
              
            </div>
          )}
        </div>
      </section>

      <button
        onClick={handleLogout}
        className="w-full bg-white rounded-2xl p-4 shadow-sm border border-red-100 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition"
      >
        <LogOut size={20} />
        Se déconnecter
      </button>

      {/* ✅ MODAL CHANGER MOT DE PASSE AVEC ANCIEN MOT DE PASSE */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black" style={{ color: colors.text }}>
                🔒 Changer le mot de passe
              </h3>

              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-5">
              Pour des raisons de sécurité, veuillez entrer votre mot de passe actuel,
              puis choisissez un nouveau mot de passe.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* ✅ Ancien mot de passe */}
              <PasswordInput
                label="Mot de passe actuel *"
                value={passwordData.currentPassword}
                onChange={(value) =>
                  setPasswordData({
                    ...passwordData,
                    currentPassword: value,
                  })
                }
                colors={colors}
                placeholder="Votre mot de passe actuel"
              />

              <div className="border-t border-gray-200 my-2" />

              {/* ✅ Nouveau mot de passe */}
              <PasswordInput
                label="Nouveau mot de passe *"
                value={passwordData.newPassword}
                onChange={(value) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: value,
                  })
                }
                colors={colors}
                placeholder="Minimum 6 caractères"
              />

              {/* ✅ Confirmation */}
              <PasswordInput
                label="Confirmer le mot de passe *"
                value={passwordData.confirmPassword}
                onChange={(value) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: value,
                  })
                }
                colors={colors}
                placeholder="Retapez votre nouveau mot de passe"
              />

              {/* ✅ Indicateur de force du mot de passe */}
              {passwordData.newPassword && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${Math.min((passwordData.newPassword.length / 10) * 100, 100)}%`,
                        background: passwordData.newPassword.length >= 8 ? '#4CAF50' : 
                                   passwordData.newPassword.length >= 6 ? '#FF9800' : '#F44336',
                      }}
                    />
                  </div>
                  <span className="text-xs" style={{ color: colors.text + '50' }}>
                    {passwordData.newPassword.length >= 8 ? '✅ Fort' :
                     passwordData.newPassword.length >= 6 ? '⚠️ Moyen' : '❌ Faible'}
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                  }}
                  className="flex-1 py-3 rounded-2xl font-bold border"
                  style={{
                    borderColor: colors.primary + '15',
                    color: colors.text,
                  }}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="flex-1 py-3 rounded-2xl text-white font-bold transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: colors.primary }}
                >
                  {isLoading ? '...' : 'Changer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black" style={{ color: colors.text }}>
                Choisir la langue
              </h3>

              <button
                onClick={() => setShowLanguageModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-5">
              Sélectionnez la langue de l'application.
            </p>

            <div className="space-y-2">
              <LanguageOption
                label="🇫🇷 Français"
                active={formData.preferences.language === 'fr'}
                onClick={() => handleLanguageChange('fr')}
                colors={colors}
              />

              <LanguageOption
                label="🇬🇧 English"
                active={formData.preferences.language === 'en'}
                onClick={() => handleLanguageChange('en')}
                colors={colors}
              />
            </div>

            <button
              onClick={() => setShowLanguageModal(false)}
              className="w-full mt-4 py-3 rounded-2xl font-bold border"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl w-full max-w-md p-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mx-auto"
              style={{ background: '#F4433615', color: '#F44336' }}
            >
              <AlertCircle size={28} />
            </div>

            <h3
              className="text-lg font-black text-center"
              style={{ color: colors.text }}
            >
              Supprimer le compte
            </h3>

            <p className="text-sm mt-2 text-center text-gray-500">
              Cette action est irréversible. Toutes vos données seront
              supprimées.
              <br />
              <span className="font-bold text-red-500">
                Êtes-vous sûr de vouloir continuer ?
              </span>
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 rounded-2xl font-bold border"
                style={{
                  borderColor: colors.primary + '15',
                  color: colors.text,
                }}
              >
                Annuler
              </button>

              <button
                onClick={handleDeleteAccount}
                disabled={isLoading}
                className="flex-1 py-3 rounded-2xl text-white font-bold bg-red-500 hover:bg-red-600 transition disabled:opacity-50"
              >
                {isLoading ? '...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ColorsLike {
  primary: string;
  text: string;
  border?: string;
}

interface FieldProps {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  colors: ColorsLike;
}

const Field = ({ label, value, onChange, disabled, colors }: FieldProps) => {
  return (
    <div>
      <label
        className="block text-sm font-bold mb-1"
        style={{ color: colors.text }}
      >
        {label}
      </label>

      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-2xl border outline-none text-sm disabled:bg-gray-50"
        style={{
          borderColor: colors.primary + '15',
          color: disabled ? colors.text + '60' : colors.text,
          background: disabled ? '#f9fafb' : '#fff',
        }}
      />
    </div>
  );
};

interface InfoCardProps {
  label: string;
  value: string;
  colors: ColorsLike;
}

const InfoCard = ({ label, value, colors }: InfoCardProps) => {
  return (
    <div
      className="p-4 rounded-2xl border"
      style={{
        background: colors.primary + '04',
        borderColor: colors.primary + '10',
      }}
    >
      <p
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: colors.text + '50' }}
      >
        {label}
      </p>

      <p className="font-bold mt-1 break-words" style={{ color: colors.text }}>
        {value}
      </p>
    </div>
  );
};

interface SettingToggleProps {
  icon: ReactNode;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  colors: ColorsLike;
}

const SettingToggle = ({
  icon,
  title,
  description,
  active,
  onClick,
  colors,
}: SettingToggleProps) => {
  return (
    <button
      type="button"
      className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl border text-left hover:bg-gray-50 transition"
      style={{
        background: colors.primary + '05',
        borderColor: colors.primary + '10',
      }}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{
            background: colors.primary + '10',
            color: colors.primary,
          }}
        >
          {icon}
        </div>

        <div>
          <p className="font-bold" style={{ color: colors.text }}>
            {title}
          </p>

          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>

      <div
        className="w-12 h-7 rounded-full transition relative shrink-0"
        style={{ background: active ? colors.primary : '#d1d5db' }}
      >
        <div
          className="absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform"
          style={{
            transform: active ? 'translateX(22px)' : 'translateX(2px)',
          }}
        />
      </div>
    </button>
  );
};

interface ActionRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  colors: ColorsLike;
}

const ActionRow = ({
  icon,
  title,
  description,
  onClick,
  colors,
}: ActionRowProps) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl border text-left hover:bg-gray-50 transition"
      style={{
        background: colors.primary + '05',
        borderColor: colors.primary + '10',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{
            background: colors.primary + '10',
            color: colors.primary,
          }}
        >
          {icon}
        </div>

        <div>
          <p className="font-bold" style={{ color: colors.text }}>
            {title}
          </p>

          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>

      <ChevronRight size={18} className="text-gray-400" />
    </button>
  );
};

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  colors: ColorsLike;
  placeholder?: string;
}

const PasswordInput = ({
  label,
  value,
  onChange,
  colors,
  placeholder,
}: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <label
        className="block text-sm font-bold mb-1"
        style={{ color: colors.text }}
      >
        {label}
      </label>

      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border outline-none text-sm pr-10"
          style={{
            borderColor: colors.primary + '15',
            color: colors.text,
          }}
          required
          minLength={6}
          placeholder={placeholder || ''}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: colors.text + '50' }}
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  );
};

interface LanguageOptionProps {
  label: string;
  active: boolean;
  onClick: () => void;
  colors: ColorsLike;
}

const LanguageOption = ({
  label,
  active,
  onClick,
  colors,
}: LanguageOptionProps) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 rounded-2xl border transition hover:bg-gray-50"
      style={{
        borderColor: active ? colors.primary : '#e5e7eb',
        background: active ? colors.primary + '08' : '#ffffff',
      }}
    >
      <span className="font-medium" style={{ color: colors.text }}>
        {label}
      </span>

      {active && <CheckCircle size={20} style={{ color: colors.primary }} />}
    </button>
  );
};

export default ProfilePage;
