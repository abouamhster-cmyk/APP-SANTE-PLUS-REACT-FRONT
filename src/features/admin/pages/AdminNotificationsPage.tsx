// 📁 frontend/src/features/admin/pages/AdminNotificationsPage.tsx

import { useEffect, useState } from 'react';
import {
  Bell,
  Send,
  Users,
  UserCheck,
  RefreshCw,
  Eye,
  Trash2,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageCircle,
  Info,
  Tag,
  User,
  Loader2,
  Plus,
  Filter,
  Search,
  UserPlus,
  Shield,
  Calendar,
  MapPin,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatTime } from '@/utils/helpers';
import { Modal } from '@/components/ui/Modal';
import { InfoRow } from '@/components/ui/InfoRow';
import toast from 'react-hot-toast';

// ============================================================
// TYPES
// ============================================================

interface Notification {
  id: string;
  user_id: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  } | null;
  title: string;
  body: string;
  type: 'system' | 'alert' | 'reminder' | 'promotion' | 'information';
  data: any;
  image_url: string | null;
  is_read: boolean;
  read_at: string | null;
  is_sent: boolean;
  sent_at: string | null;
  is_delivered: boolean;
  delivered_at: string | null;
  created_at: string;
}

interface PendingAidantVisit {
  id: string;
  target_name: string;
  scheduled_date: string;
  scheduled_time: string;
  user_id: string;
  family?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  } | null;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    address: string;
  } | null;
  created_at: string;
  waiting_for_aidant_since: string;
}

interface NotificationForm {
  title: string;
  body: string;
  type: 'system' | 'alert' | 'reminder' | 'promotion' | 'information';
  target: 'all' | 'family' | 'aidant' | 'coordinator' | 'admin' | 'specific';
  targetUsers: string[];
  link: string;
  image_url: string;
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const AdminNotificationsPage = () => {
  const { profile, role } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingVisits, setPendingVisits] = useState<PendingAidantVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPendingVisits, setShowPendingVisits] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const [formData, setFormData] = useState<NotificationForm>({
    title: '',
    body: '',
    type: 'system',
    target: 'all',
    targetUsers: [],
    link: '',
    image_url: '',
  });

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Chargement initial
  useEffect(() => {
    fetchNotifications();
    fetchUsers();
    fetchPendingVisits();
  }, []);

  // ============================================================
  // RÉCUPÉRATION DES DONNÉES
  // ============================================================

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const { data: notifsData, error: notifsError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (notifsError) throw notifsError;

      const userIds = [...new Set(notifsData?.map(n => n.user_id).filter(Boolean))];
      let profileMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('id', userIds);

        if (!profilesError && profiles) {
          profileMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const notifsWithUser = (notifsData || []).map(notif => ({
        ...notif,
        user: notif.user_id ? profileMap[notif.user_id] || null : null,
      }));

      setNotifications(notifsWithUser);
    } catch (error: any) {
      console.error('Fetch notifications error:', error);
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  // ✅ Récupérer les visites en attente d'aidant - CORRIGÉ
  const fetchPendingVisits = async () => {
    try {
      const { data, error } = await supabase
        .from('visites')
        .select(`
          id,
          target_name,
          scheduled_date,
          scheduled_time,
          user_id,
          created_at,
          waiting_for_aidant_since,
          patient:patients(id, first_name, last_name, address),
          family:profiles!visites_user_id_fkey(id, full_name, email, phone)
        `)
        .eq('status', 'en_attente_aidant')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // ✅ CORRECTION: Transformer les données pour s'assurer que family et patient sont des objets uniques
      const formattedVisits: PendingAidantVisit[] = (data || []).map((item: any) => ({
        id: item.id,
        target_name: item.target_name,
        scheduled_date: item.scheduled_date,
        scheduled_time: item.scheduled_time,
        user_id: item.user_id,
        created_at: item.created_at,
        waiting_for_aidant_since: item.waiting_for_aidant_since,
        patient: Array.isArray(item.patient) ? item.patient[0] : item.patient,
        family: Array.isArray(item.family) ? item.family[0] : item.family,
      }));

      setPendingVisits(formattedVisits);
    } catch (error) {
      console.error('❌ fetchPendingVisits error:', error);
    }
  };

  // ============================================================
  // FILTRES
  // ============================================================

  const filteredNotifications = notifications.filter(notif => {
    const matchesSearch =
      notif.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || notif.type === filterType;
    return matchesSearch && matchesType;
  });

  // ============================================================
  // STATISTIQUES
  // ============================================================

  const stats = {
    total: notifications.length,
    sent: notifications.filter(n => n.is_sent).length,
    delivered: notifications.filter(n => n.is_delivered).length,
    read: notifications.filter(n => n.is_read).length,
    alerts: notifications.filter(n => n.type === 'alert').length,
    reminders: notifications.filter(n => n.type === 'reminder').length,
    system: notifications.filter(n => n.type === 'system').length,
    pendingAidant: pendingVisits.length,
  };

  // ============================================================
  // TYPES DE NOTIFICATIONS
  // ============================================================

  const notificationTypes = [
    { value: 'system', label: 'Système', icon: <Info size={14} />, color: '#3b82f6' },
    { value: 'alert', label: 'Alerte', icon: <AlertCircle size={14} />, color: '#ef4444' },
    { value: 'reminder', label: 'Rappel', icon: <Bell size={14} />, color: '#f59e0b' },
    { value: 'promotion', label: 'Promotion', icon: <Tag size={14} />, color: '#8b5cf6' },
    { value: 'information', label: 'Information', icon: <MessageCircle size={14} />, color: '#10b981' },
  ];

  const targets = [
    { value: 'all', label: 'Tous', icon: <Users size={14} /> },
    { value: 'family', label: '👨‍👩‍👦 Familles', icon: <Users size={14} /> },
    { value: 'aidant', label: '🦸 Aidants', icon: <UserCheck size={14} /> },
    { value: 'coordinator', label: '👔 Coordinateurs', icon: <UserCheck size={14} /> },
    { value: 'admin', label: '👑 Admins', icon: <UserCheck size={14} /> },
    { value: 'specific', label: '👤 Cible précise', icon: <User size={14} /> },
  ];

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.body.trim()) {
      toast.error('Le titre et le message sont obligatoires');
      return;
    }
    if (formData.target === 'specific' && formData.targetUsers.length === 0) {
      toast.error('Veuillez sélectionner au moins un utilisateur');
      return;
    }

    setIsSending(true);
    try {
      let targetUserIds: string[] = [];

      if (formData.target === 'all') {
        const { data } = await supabase.from('profiles').select('id');
        targetUserIds = data?.map(u => u.id) || [];
      } else if (formData.target === 'specific') {
        targetUserIds = formData.targetUsers;
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', formData.target);
        targetUserIds = data?.map(u => u.id) || [];
      }

      if (targetUserIds.length === 0) {
        toast.error('Aucun utilisateur cible trouvé');
        setIsSending(false);
        return;
      }

      const notificationsToInsert = targetUserIds.map(userId => ({
        user_id: userId,
        title: formData.title.trim(),
        body: formData.body.trim(),
        type: formData.type,
        data: {
          link: formData.link || null,
          image_url: formData.image_url || null,
          sender: profile?.id,
        },
        image_url: formData.image_url || null,
        is_read: false,
        is_sent: true,
        sent_at: new Date().toISOString(),
        is_delivered: true,
        delivered_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);

      if (error) throw error;
      toast.success(`Notification envoyée avec succès`);

      setFormData({
        title: '',
        body: '',
        type: 'system',
        target: 'all',
        targetUsers: [],
        link: '',
        image_url: '',
      });
      setShowForm(false);
      fetchNotifications();
    } catch (error: any) {
      console.error('Send notification error:', error);
      toast.error("Erreur lors de l'envoi : " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!window.confirm('Supprimer cette notification ?')) return;
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      toast.success('Notification supprimée');
      fetchNotifications();
    } catch (error) {
      console.error('Delete notification error:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleViewDetails = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDetailsModal(true);
  };

  const addTargetUser = (userId: string) => {
    if (!formData.targetUsers.includes(userId)) {
      setFormData({ ...formData, targetUsers: [...formData.targetUsers, userId] });
    }
    setUserSearch('');
    setShowUserDropdown(false);
  };

  const removeTargetUser = (userId: string) => {
    setFormData({
      ...formData,
      targetUsers: formData.targetUsers.filter(id => id !== userId),
    });
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearch.toLowerCase())
  ).slice(0, 10);

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Utilisateur inconnu';
  };

  const getTypeIcon = (type: string) => {
    const found = notificationTypes.find(t => t.value === type);
    return found?.icon || <Bell size={14} />;
  };

  const getTypeColor = (type: string) => {
    const found = notificationTypes.find(t => t.value === type);
    return found?.color || '#94a3b8';
  };

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <section 
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all"
        style={{ background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.primary}12 100%)` }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: colors.text }}>
              🔔 Gestion des notifications
            </h1>
            <p className="text-xs" style={{ color: colors.textLight }}>
              {stats.total} notifications • {stats.alerts} alertes • {stats.reminders} rappels
              {stats.pendingAidant > 0 && (
                <span className="ml-2 text-orange-500 font-bold">
                  ⚠️ {stats.pendingAidant} visite(s) en attente d'aidant
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2.5 shrink-0">
            <button
              onClick={() => {
                fetchNotifications();
                fetchPendingVisits();
              }}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 bg-white hover:bg-gray-50"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Actualiser
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-3.5 py-2 rounded-xl text-white text-xs font-bold transition-opacity hover:opacity-95 flex items-center gap-1.5 shadow-sm"
              style={{ background: colors.primary }}
            >
              <Plus size={14} />
              Nouvelle alerte
            </button>
          </div>
        </div>
      </section>

      {/* ✅ BANDEAU VISITES EN ATTENTE D'AIDANT */}
      {stats.pendingAidant > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-xl shadow-sm border border-orange-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <UserPlus size={20} className="text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-orange-800">
                  🦸 {stats.pendingAidant} visite{stats.pendingAidant > 1 ? 's' : ''} en attente d'aidant
                </p>
                <p className="text-sm text-orange-700">
                  Tous les aidants sont complets (4/4). Assignez un aidant à ces visites.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setShowPendingVisits(!showPendingVisits)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition"
              >
                {showPendingVisits ? 'Masquer' : 'Voir les visites'}
              </button>
            </div>
          </div>

          {/* ✅ Liste des visites en attente */}
          {showPendingVisits && pendingVisits.length > 0 && (
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {pendingVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="bg-white rounded-xl p-3 border border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-800">
                      {visit.target_name || visit.patient?.first_name || 'Patient'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-0.5">
                        <Calendar size={12} />
                        {formatDate(visit.scheduled_date)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Clock size={12} />
                        {visit.scheduled_time}
                      </span>
                      {visit.family && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <User size={12} />
                            {visit.family.full_name}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-[10px] text-orange-500 mt-0.5">
                      En attente depuis {formatDate(visit.waiting_for_aidant_since)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Rediriger vers la page de la visite
                      window.location.href = `/app/visits/${visit.id}`;
                    }}
                    className="px-3 py-1.5 rounded-lg text-white text-xs font-bold shrink-0"
                    style={{ background: colors.primary }}
                  >
                    👔 Assigner
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Statistiques épurées */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} color={colors.primary} icon={<Bell size={16} />} />
        <StatCard label="Envoyées" value={stats.sent} color="#10b981" icon={<Send size={16} />} />
        <StatCard label="Délivrées" value={stats.delivered} color="#3b82f6" icon={<CheckCircle size={16} />} />
        <StatCard label="Alertes" value={stats.alerts} color="#ef4444" icon={<AlertCircle size={16} />} />
        <StatCard 
          label="En attente aidant" 
          value={stats.pendingAidant} 
          color="#FF5722" 
          icon={<UserPlus size={16} />} 
        />
      </section>

      {/* Formulaire de création d'alerte épuré */}
      {showForm && (
        <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderColor: colors.border }}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">📝 Rédiger un message</h2>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-50 rounded-lg"><X size={16} /></button>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: colors.text }}>Titre *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Objet court"
                  maxLength={100}
                  className="w-full px-3.5 py-2 rounded-xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition"
                  style={{ borderColor: colors.border, background: 'var(--color-background)' }}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: colors.text }}>Lien (Optionnel)</label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition"
                  style={{ borderColor: colors.border, background: 'var(--color-background)' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: colors.text }}>Corps du message *</label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Rédigez ici le message..."
                rows={3}
                maxLength={500}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs resize-none focus:ring-1 focus:ring-[var(--color-primary)] transition"
                style={{ borderColor: colors.border, background: 'var(--color-background)' }}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {notificationTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value as any })}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: formData.type === type.value ? type.color : '#f1f5f9',
                        color: formData.type === type.value ? '#ffffff' : '#475569',
                      }}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>Destinataires</label>
                <div className="flex flex-wrap gap-1.5">
                  {targets.map((target) => (
                    <button
                      key={target.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, target: target.value as any, targetUsers: [] })}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: formData.target === target.value ? colors.primary : '#f1f5f9',
                        color: formData.target === target.value ? '#ffffff' : '#475569',
                      }}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {formData.target === 'specific' && (
              <div className="relative pt-2">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.targetUsers.map((userId) => (
                    <span
                      key={userId}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                      style={{ background: colors.primary + '12', color: colors.primary }}
                    >
                      {getUserName(userId)}
                      <button type="button" onClick={() => removeTargetUser(userId)} className="hover:text-red-500"><X size={10} /></button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                  placeholder="Rechercher par nom..."
                  className="w-full px-3.5 py-2 rounded-xl border outline-none text-xs"
                  style={{ borderColor: colors.border, background: 'var(--color-background)' }}
                />
                {showUserDropdown && userSearch.length > 0 && filteredUsers.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-xl border shadow-lg max-h-40 overflow-y-auto" style={{ borderColor: colors.border }}>
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => addTargetUser(user.id)}
                        className="w-full px-3.5 py-2 text-left text-xs hover:bg-gray-50 flex justify-between"
                      >
                        <span className="font-semibold">{user.full_name}</span>
                        <span className="text-gray-400">{user.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-3 border-t justify-end" style={{ borderColor: colors.border }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-50 hover:bg-gray-100"
                style={{ color: colors.text }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50"
                style={{ background: colors.primary }}
              >
                {isSending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Envoyer l'alerte
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Filtres épurés */}
      <section className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par titre ou destinataire..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border outline-none text-xs"
            style={{ borderColor: colors.border, background: 'var(--color-background)' }}
          />
        </div>
        <div className="relative min-w-[150px]">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border outline-none text-xs appearance-none"
            style={{ borderColor: colors.border, background: 'var(--color-background)', color: colors.text }}
          >
            <option value="all">Tous les types</option>
            {notificationTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Liste des alertes */}
      <section className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden divide-y" style={{ borderColor: colors.border }}>
        {isLoading ? (
          <div className="p-10 text-center"><Loader2 size={24} className="animate-spin mx-auto" style={{ color: colors.primary }} /></div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Aucune notification enregistrée</div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className="p-4 hover:bg-gray-50/50 transition cursor-pointer flex items-center justify-between gap-4"
              onClick={() => handleViewDetails(notification)}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: getTypeColor(notification.type) + '0d', color: getTypeColor(notification.type) }}
                >
                  {getTypeIcon(notification.type)}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="font-bold text-xs truncate" style={{ color: colors.text }}>{notification.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{notification.body}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 pt-1">
                    <span>{notification.user?.full_name || 'Général'}</span>
                    <span>•</span>
                    <span>{formatDate(notification.created_at)}</span>
                    {notification.type === 'alert' && (
                      <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-red-100 text-red-600">ALERTE</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => handleViewDetails(notification)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600"><Eye size={14} /></button>
                <button onClick={() => handleDeleteNotification(notification.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Modal Détails */}
      {showDetailsModal && selectedNotification && (
        <NotificationDetailsModal
          notification={selectedNotification}
          onClose={() => setShowDetailsModal(false)}
          colors={colors}
        />
      )}
    </div>
  );
};

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}

const StatCard = ({ label, value, color, icon }: StatCardProps) => (
  <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex items-center justify-between">
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-extrabold" style={{ color }}>{value}</p>
    </div>
    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '0d', color }}>{icon}</div>
  </div>
);

interface NotificationDetailsModalProps {
  notification: Notification;
  onClose: () => void;
  colors: any;
}

const NotificationDetailsModal = ({ notification, onClose, colors }: NotificationDetailsModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: colors.border }}>
        <h2 className="font-bold text-sm uppercase tracking-wider text-gray-400">🔔 Aperçu d'alerte</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-lg"><X size={16} /></button>
      </div>
      <div className="p-5 space-y-3.5">
        <div className="p-4 rounded-2xl" style={{ background: `${colors.primary}05` }}>
          <p className="font-bold text-xs" style={{ color: colors.text }}>{notification.title}</p>
          <p className="text-xs text-gray-600 mt-1">{notification.body}</p>
        </div>
        <div className="space-y-2 text-xs divide-y" style={{ borderColor: colors.border }}>
          <div className="flex justify-between py-1.5">
            <span className="text-gray-400">Type</span>
            <span className="font-semibold">{notification.type}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-gray-400">Cible</span>
            <span className="font-semibold">{notification.user?.full_name || 'Système'}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-gray-400">Envoyé</span>
            <span className="font-semibold">{formatDate(notification.created_at)}</span>
          </div>
          {notification.data?.link && (
            <div className="flex justify-between py-1.5">
              <span className="text-gray-400">Lien</span>
              <a href={notification.data.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate max-w-[150px]">
                Voir
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default AdminNotificationsPage;
