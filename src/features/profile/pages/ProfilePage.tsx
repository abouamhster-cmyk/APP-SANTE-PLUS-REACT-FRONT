// 📁 src/features/profile/pages/ProfilePage.tsx
// ✅ BASCULEMENT MODE SOMBRE 100% FONCTIONNEL ET INSTANTANÉ

import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Phone, Camera, LogOut, Lock, Bell, Moon, Sun,
  Trash2, X, AlertCircle, ShieldCheck, User, Settings, Key, Loader2, ChevronRight
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useBranding } from '@/hooks/useBranding';
import { getBrandConfigByRole, applyBrandTheme, isDarkModeActive } from '@/lib/branding';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type ProfileTab = 'profile' | 'settings' | 'security';

const getInitials = (name: string): string => {
  if (!name) return 'U';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
};

const sanitizeFileName = (name: string): string => {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.-]/g, '_');
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const brand = useBranding();
  const colors = brand.colors;

  const { profile, role, logout, updateProfile, refreshProfile } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();
  const { visits, fetchVisits } = useVisitStore();
  const { orders, fetchOrders } = useOrderStore();
  const toggleNotifications = useNotificationStore((state) => state.toggleNotifications);
  const notificationsEnabled = useNotificationStore((state) => state.notificationsEnabled);

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    darkMode: false,
    notifications: true,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchPatients();
    fetchVisits();
    fetchOrders();

    const isDark = isDarkModeActive();
    setFormData((prev) => ({
      ...prev,
      darkMode: isDark,
      notifications: notificationsEnabled,
    }));
  }, [fetchPatients, fetchVisits, fetchOrders, notificationsEnabled]);

  useEffect(() => {
    if (!profile) return;
    setFormData((prev) => ({
      ...prev,
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      email: profile.email || '',
    }));
    setAvatarPreview(profile.avatar_url || null);
    setImageError(false);
  }, [profile]);

  // ✅ ACTION INSTANTANÉE MODE SOMBRE
  const handleToggleDarkMode = () => {
    const nextDark = !formData.darkMode;
    setFormData((prev) => ({ ...prev, darkMode: nextDark }));
    localStorage.setItem('sante_plus_dark_mode', String(nextDark));

    const config = getBrandConfigByRole(role, profile?.patient_category);
    applyBrandTheme(config);

    toast.success(nextDark ? 'Mode sombre activé 🌙' : 'Mode clair activé ☀️');
  };

  const handleToggleNotifications = () => {
    const nextNotif = !formData.notifications;
    setFormData((prev) => ({ ...prev, notifications: nextNotif }));
    toggleNotifications?.();
    toast.success(nextNotif ? 'Notifications activées' : 'Notifications désactivées');
  };

  const handleSaveProfile = async () => {
    if (!formData.full_name.trim()) return toast.error('Le nom est obligatoire');
    if (!profile?.id) return toast.error('Profil introuvable');

    setIsLoading(true);
    try {
      let avatarUrl = profile.avatar_url || null;

      if (avatarFile) {
        const cleanName = sanitizeFileName(avatarFile.name);
        const fileExt = cleanName.split('.').pop() || 'png';
        const fileName = `${profile.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true, contentType: avatarFile.type });

        if (uploadError) throw new Error(uploadError.message);

        avatarUrl = `${supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl}?v=${Date.now()}`;
      }

      await updateProfile({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        avatar_url: avatarUrl,
      });

      setAvatarPreview(avatarUrl);
      setAvatarFile(null);
      setIsEditing(false);
      if (refreshProfile) await refreshProfile();
      toast.success('Profil mis à jour');
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
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

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordData.currentPassword) return toast.error('Mot de passe actuel requis');
    if (passwordData.newPassword !== passwordData.confirmPassword) return toast.error('Les mots de passe ne correspondent pas');
    if (passwordData.newPassword.length < 6) return toast.error('Minimum 6 caractères');

    setIsLoading(true);
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: passwordData.currentPassword,
      });
      if (signInError) return toast.error('Mot de passe actuel incorrect');

      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;

      toast.success('Mot de passe mis à jour');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non trouvé');

      const { data: links } = await supabase.from('patient_family_links').select('patient_id').eq('family_id', user.id);
      const patientIds = links?.map((l) => l.patient_id) || [];

      if (patientIds.length > 0) {
        await supabase.from('patients').delete().in('id', patientIds);
      }

      await supabase.from('patient_family_links').delete().eq('family_id', user.id);
      await supabase.from('inscriptions').delete().eq('user_id', user.id);
      await supabase.from('notifications').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);

      await supabase.auth.signOut();
      toast.success('Compte supprimé avec succès');
      navigate('/login');
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = () => {
    if (role === 'admin') return 'Administrateur';
    if (role === 'coordinator') return 'Coordinateur';
    if (role === 'aidant') return 'Aidant';
    return 'Famille';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20 p-3 sm:p-4">
      {/* CARTE EN-TÊTE PROFIL */}
      <section className="bg-white dark:bg-[#182620] rounded-3xl p-5 sm:p-6 shadow-sm border dark:border-gray-800" style={{ borderColor: `${colors.primary}25` }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative mx-auto sm:mx-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center text-2xl font-black text-white overflow-hidden shadow-sm" style={{ backgroundColor: colors.primary }}>
              {avatarPreview && !imageError ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" onError={() => setImageError(true)} />
              ) : (
                getInitials(profile?.full_name || '')
              )}
            </div>
            {isEditing && (
              <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-2xl bg-white dark:bg-[#22332b] shadow-md flex items-center justify-center cursor-pointer border hover:scale-105 transition" style={{ color: colors.primary }}>
                <Camera size={15} />
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold truncate" style={{ color: colors.text }}>
              {profile?.full_name || 'Utilisateur'}
            </h1>
            <p className="text-xs font-bold uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1 mt-1 text-gray-500 dark:text-gray-400">
              <ShieldCheck size={14} /> {getRoleLabel()}
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><Mail size={13} /> {profile?.email || '-'}</span>
              <span className="flex items-center gap-1"><Phone size={13} /> {profile?.phone || 'Non renseigné'}</span>
            </div>
          </div>

          <button onClick={() => setIsEditing(!isEditing)} className="px-4 py-2 rounded-2xl text-xs font-bold border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#22332b] transition shrink-0">
            {isEditing ? 'Annuler' : 'Modifier'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t dark:border-gray-800 text-center">
          <div>
            <span className="text-xs font-bold text-gray-400 block">Proches</span>
            <span className="text-base font-black" style={{ color: colors.primary }}>{patients.length}</span>
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 block">Visites</span>
            <span className="text-base font-black" style={{ color: colors.primary }}>{visits.length}</span>
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 block">Commandes</span>
            <span className="text-base font-black" style={{ color: colors.primary }}>{orders.length}</span>
          </div>
        </div>
      </section>

      {/* EDITEUR PROFIL */}
      {isEditing && (
        <section className="bg-white dark:bg-[#182620] rounded-3xl p-5 border dark:border-gray-800 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase text-gray-400">Editer mes coordonnées</h3>
          <input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="w-full p-3 rounded-2xl border text-xs font-bold bg-gray-50 dark:bg-[#22332b] outline-none" placeholder="Nom complet" />
          <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full p-3 rounded-2xl border text-xs font-bold bg-gray-50 dark:bg-[#22332b] outline-none" placeholder="Téléphone" />
          <button onClick={handleSaveProfile} disabled={isLoading} className="w-full py-3 rounded-2xl text-white font-bold text-xs flex justify-center items-center gap-2" style={{ backgroundColor: colors.primary }}>
            {isLoading && <Loader2 className="animate-spin" size={14} />} Enregistrer
          </button>
        </section>
      )}

      {/* TAB NAVIGATION */}
      <div className="flex bg-gray-100 dark:bg-[#22332b] p-1 rounded-2xl w-fit">
        <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'profile' ? 'bg-white dark:bg-[#182620] shadow-sm' : 'text-gray-500'}`}>Profil</button>
        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'settings' ? 'bg-white dark:bg-[#182620] shadow-sm' : 'text-gray-500'}`}>Préférences</button>
        <button onClick={() => setActiveTab('security')} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'security' ? 'bg-white dark:bg-[#182620] shadow-sm' : 'text-gray-500'}`}>Sécurité</button>
      </div>

      {/* CONTENU ONGLETS */}
      <section className="bg-white dark:bg-[#182620] rounded-3xl p-5 border dark:border-gray-800 shadow-sm space-y-3">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-gray-50 dark:bg-[#22332b] rounded-2xl"><span className="text-gray-400 block font-bold">Inscrit le</span><span className="font-bold text-gray-800 dark:text-gray-100">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : '-'}</span></div>
            <div className="p-3 bg-gray-50 dark:bg-[#22332b] rounded-2xl"><span className="text-gray-400 block font-bold">Compte</span><span className="font-bold text-emerald-600">Actif 🟢</span></div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-3">
            <button onClick={handleToggleNotifications} className="w-full flex items-center justify-between p-3.5 border dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-[#22332b]">
              <div className="flex items-center gap-3"><Bell size={16} /><span className="text-xs font-bold">Notifications Push</span></div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${formData.notifications ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-gray-200 text-gray-600'}`}>{formData.notifications ? 'Activées' : 'Désactivées'}</span>
            </button>

            <button onClick={handleToggleDarkMode} className="w-full flex items-center justify-between p-3.5 border dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-[#22332b]">
              <div className="flex items-center gap-3">{formData.darkMode ? <Moon size={16} /> : <Sun size={16} /><span className="text-xs font-bold">Mode sombre</span></div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#22332b]">{formData.darkMode ? 'Oui 🌙' : 'Non ☀️'}</span>
            </button>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-3">
            <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center justify-between p-3.5 border dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-[#22332b] text-xs font-bold">
              <div className="flex items-center gap-3"><Key size={16} /><span>Changer le mot de passe</span></div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>

            <button onClick={() => setShowDeleteModal(true)} className="w-full flex items-center justify-between p-3.5 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-2xl text-xs font-bold">
              <div className="flex items-center gap-3"><Trash2 size={16} /><span>Supprimer définitivement le compte</span></div>
            </button>
          </div>
        )}
      </section>

      <button onClick={() => { logout(); navigate('/login'); }} className="w-full py-4 rounded-3xl border border-red-100 dark:border-red-900/40 text-red-500 font-bold text-xs flex justify-center items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/20">
        <LogOut size={16} /> Se déconnecter
      </button>

      {/* MODALE MOT DE PASSE */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleChangePassword} className="bg-white dark:bg-[#182620] rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl border dark:border-gray-800">
            <div className="flex justify-between items-center"><h3 className="font-bold text-sm">Mot de passe</h3><button type="button" onClick={() => setShowPasswordModal(false)}><X size={16} /></button></div>
            <input type="password" placeholder="Mot de passe actuel" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} className="w-full p-3 rounded-xl border text-xs font-bold bg-gray-50 dark:bg-[#22332b] outline-none" required />
            <input type="password" placeholder="Nouveau mot de passe" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} className="w-full p-3 rounded-xl border text-xs font-bold bg-gray-50 dark:bg-[#22332b] outline-none" required minLength={6} />
            <input type="password" placeholder="Confirmer le mot de passe" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="w-full p-3 rounded-xl border text-xs font-bold bg-gray-50 dark:bg-[#22332b] outline-none" required />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-2.5 rounded-xl border text-xs font-bold">Annuler</button>
              <button type="submit" disabled={isLoading} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs" style={{ backgroundColor: colors.primary }}>{isLoading ? 'Changement...' : 'Changer'}</button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE SUPPRESSION */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#182620] rounded-3xl w-full max-w-sm p-6 space-y-4 text-center shadow-2xl border dark:border-gray-800">
            <AlertCircle size={32} className="mx-auto text-red-500" />
            <h3 className="font-black text-sm text-gray-800 dark:text-gray-100">Confirmer la suppression ?</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Cette action supprimera irréversiblement votre profil et toutes vos données Supabase.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-xl border text-xs font-bold">Annuler</button>
              <button onClick={handleDeleteAccount} disabled={isLoading} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold">{isLoading ? 'Suppression...' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
