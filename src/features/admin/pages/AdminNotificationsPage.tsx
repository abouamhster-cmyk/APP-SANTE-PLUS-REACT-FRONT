// 📁 src/features/admin/pages/AdminNotificationsPage.tsx

import { useEffect, useState } from 'react';
import {
  Bell,
  Send,
  Users,
  UserCheck,
  UserX,
  Mail,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MessageCircle,
  Megaphone,
  Info,
  Tag,
  Calendar,
  User,
  Loader2,
  Plus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatTime } from '@/utils/helpers';
import toast from 'react-hot-toast';

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

interface NotificationForm {
  title: string;
  body: string;
  type: 'system' | 'alert' | 'reminder' | 'promotion' | 'information';
  target: 'all' | 'family' | 'aidant' | 'coordinator' | 'admin' | 'specific';
  targetUsers: string[];
  link: string;
  image_url: string;
}

const AdminNotificationsPage = () => {
  const { profile, role } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
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

  // ✅ Charger les notifications et les utilisateurs
  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);

      // 1. Récupérer les notifications
      const { data: notifsData, error: notifsError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (notifsError) throw notifsError;

      // 2. Récupérer les profils
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

      // 3. Fusionner les données
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

  // ✅ Filtrer les notifications
  const filteredNotifications = notifications.filter(notif => {
    const matchesSearch =
      notif.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || notif.type === filterType;

    return matchesSearch && matchesType;
  });

  // ✅ Statistiques
  const stats = {
    total: notifications.length,
    sent: notifications.filter(n => n.is_sent).length,
    delivered: notifications.filter(n => n.is_delivered).length,
    read: notifications.filter(n => n.is_read).length,
  };

  // ✅ Types de notification
  const notificationTypes = [
    { value: 'system', label: 'Système', icon: <Info size={16} />, color: '#2196F3' },
    { value: 'alert', label: 'Alerte', icon: <AlertCircle size={16} />, color: '#F44336' },
    { value: 'reminder', label: 'Rappel', icon: <Bell size={16} />, color: '#FF9800' },
    { value: 'promotion', label: 'Promotion', icon: <Tag size={16} />, color: '#9C27B0' },
    { value: 'information', label: 'Information', icon: <MessageCircle size={16} />, color: '#4CAF50' },
  ];

  // ✅ Cibles
  const targets = [
    { value: 'all', label: 'Tous les utilisateurs', icon: <Users size={16} /> },
    { value: 'family', label: '👨‍👩‍👦 Familles', icon: <Users size={16} /> },
    { value: 'aidant', label: '🦸 Aidants', icon: <UserCheck size={16} /> },
    { value: 'coordinator', label: '👔 Coordinateurs', icon: <UserCheck size={16} /> },
    { value: 'admin', label: '👑 Administrateurs', icon: <UserCheck size={16} /> },
    { value: 'specific', label: '👤 Utilisateurs spécifiques', icon: <User size={16} /> },
  ];

  // ✅ Envoyer une notification
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
      // 1. Récupérer les utilisateurs cibles
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

      // 2. Créer les notifications
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

      // 3. Insérer en base (batch)
      const { error } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);

      if (error) throw error;

      toast.success(`✅ Notification envoyée à ${targetUserIds.length} utilisateur${targetUserIds.length > 1 ? 's' : ''}`);

      // 4. Réinitialiser le formulaire
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
      toast.error('Erreur lors de l\'envoi : ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  // ✅ Supprimer une notification
  const handleDeleteNotification = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette notification ?')) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Notification supprimée');
      fetchNotifications();
    } catch (error) {
      console.error('Delete notification error:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // ✅ Voir les détails
  const handleViewDetails = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDetailsModal(true);
  };

  // ✅ Ajouter un utilisateur à la liste cible
  const addTargetUser = (userId: string) => {
    if (!formData.targetUsers.includes(userId)) {
      setFormData({ ...formData, targetUsers: [...formData.targetUsers, userId] });
    }
    setUserSearch('');
    setShowUserDropdown(false);
  };

  // ✅ Retirer un utilisateur de la liste cible
  const removeTargetUser = (userId: string) => {
    setFormData({
      ...formData,
      targetUsers: formData.targetUsers.filter(id => id !== userId),
    });
  };

  // ✅ Filtrer les utilisateurs pour la recherche
  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearch.toLowerCase())
  ).slice(0, 10);

  // ✅ Obtenir le nom d'un utilisateur par son ID
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Utilisateur inconnu';
  };

  // ✅ Obtenir l'icône du type
  const getTypeIcon = (type: string) => {
    const found = notificationTypes.find(t => t.value === type);
    return found?.icon || <Bell size={16} />;
  };

  const getTypeColor = (type: string) => {
    const found = notificationTypes.find(t => t.value === type);
    return found?.color || '#9E9E9E';
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black" style={{ color: colors.text }}>
              🔔 Gestion des notifications
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
              Envoyez des notifications à vos utilisateurs
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchNotifications}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl font-medium transition hover:opacity-80 flex items-center gap-2"
              style={{ background: colors.primary + '12', color: colors.primary }}
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              Actualiser
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 rounded-xl text-white font-bold transition hover:opacity-80 flex items-center gap-2"
              style={{ background: colors.primary }}
            >
              <Plus size={18} />
              Nouvelle notification
            </button>
          </div>
        </div>
      </section>

      {/* Statistiques */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          color={colors.primary}
          icon={<Bell size={20} />}
        />
        <StatCard
          label="Envoyées"
          value={stats.sent}
          color="#4CAF50"
          icon={<Send size={20} />}
        />
        <StatCard
          label="Délivrées"
          value={stats.delivered}
          color="#2196F3"
          icon={<CheckCircle size={20} />}
        />
        <StatCard
          label="Lues"
          value={stats.read}
          color="#FF9800"
          icon={<Eye size={20} />}
        />
      </section>

      {/* Formulaire d'envoi */}
      {showForm && (
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{ color: colors.text }}>
              📝 Nouvelle notification
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-5">
            {/* Titre */}
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: colors.text }}>
                Titre *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre de la notification"
                maxLength={100}
                className="w-full px-4 py-3 rounded-2xl border outline-none text-sm"
                style={{
                  borderColor: colors.border,
                  background: 'var(--color-background)',
                  color: colors.text,
                }}
                required
              />
              <p className="text-xs mt-1" style={{ color: colors.text + '40' }}>
                {formData.title.length}/100 caractères
              </p>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: colors.text }}>
                Message *
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Contenu de la notification"
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 rounded-2xl border outline-none text-sm resize-none"
                style={{
                  borderColor: colors.border,
                  background: 'var(--color-background)',
                  color: colors.text,
                }}
                required
              />
              <p className="text-xs mt-1" style={{ color: colors.text + '40' }}>
                {formData.body.length}/500 caractères
              </p>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: colors.text }}>
                Type de notification
              </label>
              <div className="flex flex-wrap gap-2">
                {notificationTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.value as any })}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                      formData.type === type.value
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{
                      background: formData.type === type.value ? type.color : 'transparent',
                    }}
                  >
                    {type.icon}
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Destinataires */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: colors.text }}>
                Destinataires
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {targets.map((target) => (
                  <button
                    key={target.value}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, target: target.value as any, targetUsers: [] });
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                      formData.target === target.value
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{
                      background: formData.target === target.value ? colors.primary : 'transparent',
                    }}
                  >
                    {target.icon}
                    {target.label}
                  </button>
                ))}
              </div>

              {/* Sélection d'utilisateurs spécifiques */}
              {formData.target === 'specific' && (
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {formData.targetUsers.map((userId) => (
                      <span
                        key={userId}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                        style={{ background: colors.primary + '15', color: colors.primary }}
                      >
                        {getUserName(userId)}
                        <button
                          type="button"
                          onClick={() => removeTargetUser(userId)}
                          className="hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      placeholder="Rechercher un utilisateur..."
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border outline-none text-sm"
                      style={{
                        borderColor: colors.border,
                        background: 'var(--color-background)',
                        color: colors.text,
                      }}
                    />
                  </div>

                  {/* Dropdown des utilisateurs */}
                  {showUserDropdown && userSearch.length > 0 && filteredUsers.length > 0 && (
                    <div
                      className="absolute z-10 mt-1 w-full bg-white rounded-xl border shadow-lg max-h-48 overflow-y-auto"
                      style={{ borderColor: colors.border }}
                    >
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => addTargetUser(user.id)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition flex items-center gap-2"
                          disabled={formData.targetUsers.includes(user.id)}
                          style={{
                            opacity: formData.targetUsers.includes(user.id) ? 0.5 : 1,
                          }}
                        >
                          <span className="font-medium">{user.full_name}</span>
                          <span className="text-xs" style={{ color: colors.text + '40' }}>
                            {user.email}
                          </span>
                          {formData.targetUsers.includes(user.id) && (
                            <CheckCircle size={14} style={{ color: colors.primary }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Lien (optionnel) */}
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: colors.text }}>
                Lien (optionnel)
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-2xl border outline-none text-sm"
                style={{
                  borderColor: colors.border,
                  background: 'var(--color-background)',
                  color: colors.text,
                }}
              />
            </div>

            {/* Image (optionnel) */}
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: colors.text }}>
                Image (URL - optionnel)
              </label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-2xl border outline-none text-sm"
                style={{
                  borderColor: colors.border,
                  background: 'var(--color-background)',
                  color: colors.text,
                }}
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl font-medium border transition hover:bg-gray-50"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSending || !formData.title.trim() || !formData.body.trim()}
                className="flex-1 py-3 rounded-xl text-white font-bold transition hover:opacity-80 flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: colors.primary }}
              >
                {isSending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Envoyer la notification
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Filtres */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher une notification..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border outline-none text-sm"
              style={{
                borderColor: colors.border,
                background: 'var(--color-background)',
                color: colors.text,
              }}
            />
          </div>
          <div className="relative min-w-[180px]">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border outline-none text-sm appearance-none"
              style={{
                borderColor: colors.border,
                background: 'var(--color-background)',
                color: colors.text,
              }}
            >
              <option value="all">Tous les types</option>
              <option value="system">Système</option>
              <option value="alert">Alerte</option>
              <option value="reminder">Rappel</option>
              <option value="promotion">Promotion</option>
              <option value="information">Information</option>
            </select>
          </div>
        </div>
      </section>

      {/* Liste des notifications */}
      <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-t-transparent" style={{ borderColor: colors.primary }} />
            <p className="mt-2 text-sm" style={{ color: colors.text + '60' }}>Chargement des notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={48} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-bold" style={{ color: colors.text }}>
              Aucune notification trouvée
            </h3>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {searchTerm || filterType !== 'all'
                ? 'Aucune notification ne correspond à vos critères'
                : 'Aucune notification n\'a encore été envoyée'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: colors.border }}>
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 hover:bg-gray-50 transition cursor-pointer"
                onClick={() => handleViewDetails(notification)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: getTypeColor(notification.type) + '15', color: getTypeColor(notification.type) }}
                  >
                    {getTypeIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm" style={{ color: colors.text }}>
                          {notification.title}
                        </p>
                        <p className="text-sm line-clamp-2" style={{ color: colors.text + '60' }}>
                          {notification.body}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {notification.is_read && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                            ✅ Lu
                          </span>
                        )}
                        {!notification.is_read && notification.is_sent && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600">
                            ⏳ Non lu
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: colors.text + '30' }}>
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {notification.user?.full_name || 'Système'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(notification.created_at)}
                      </span>
                      <span>•</span>
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          background: getTypeColor(notification.type) + '15',
                          color: getTypeColor(notification.type),
                        }}
                      >
                        {notification.type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(notification);
                      }}
                      className="p-2 rounded-lg hover:bg-gray-100 transition"
                      style={{ color: colors.primary }}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 transition"
                      style={{ color: '#F44336' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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

// =============================================
// STAT CARD
// =============================================

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}

const StatCard = ({ label, value, color, icon }: StatCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-black" style={{ color }}>{value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: color + '15', color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

// =============================================
// NOTIFICATION DETAILS MODAL
// =============================================

interface NotificationDetailsModalProps {
  notification: Notification;
  onClose: () => void;
  colors: any;
}

const NotificationDetailsModal = ({ notification, onClose, colors }: NotificationDetailsModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b" style={{ borderColor: colors.border }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>
              🔔 Détails de la notification
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: getTypeColor(notification.type) + '15', color: getTypeColor(notification.type) }}
            >
              {getTypeIcon(notification.type)}
            </div>
            <div>
              <p className="font-bold" style={{ color: colors.text }}>{notification.title}</p>
              <p className="text-sm" style={{ color: colors.text + '60' }}>{notification.body}</p>
            </div>
          </div>

          <InfoRow label="Type" value={notification.type} />
          <InfoRow label="Destinataire" value={notification.user?.full_name || 'Système'} />
          <InfoRow label="Email" value={notification.user?.email || 'N/A'} />
          <InfoRow label="Statut" value={notification.is_read ? '✅ Lu' : '⏳ Non lu'} />
          {notification.read_at && (
            <InfoRow label="Lu le" value={formatDate(notification.read_at)} />
          )}
          <InfoRow label="Envoyé le" value={formatDate(notification.created_at)} />
          {notification.sent_at && (
            <InfoRow label="Envoyé à" value={formatDate(notification.sent_at)} />
          )}
          {notification.is_delivered && notification.delivered_at && (
            <InfoRow label="Délivré le" value={formatDate(notification.delivered_at)} />
          )}

          {notification.data?.link && (
            <div className="p-3 rounded-xl" style={{ background: colors.primary + '05' }}>
              <p className="text-sm font-medium" style={{ color: colors.text }}>🔗 Lien</p>
              <a
                href={notification.data.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm break-all hover:underline"
                style={{ color: colors.primary }}
              >
                {notification.data.link}
              </a>
            </div>
          )}

          {notification.image_url && (
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: colors.text }}>🖼️ Image</p>
              <img
                src={notification.image_url}
                alt="Notification"
                className="max-w-full rounded-xl max-h-48 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================
// HELPERS
// =============================================

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'system': return <Info size={16} />;
    case 'alert': return <AlertCircle size={16} />;
    case 'reminder': return <Bell size={16} />;
    case 'promotion': return <Tag size={16} />;
    case 'information': return <MessageCircle size={16} />;
    default: return <Bell size={16} />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'system': return '#2196F3';
    case 'alert': return '#F44336';
    case 'reminder': return '#FF9800';
    case 'promotion': return '#9C27B0';
    case 'information': return '#4CAF50';
    default: return '#9E9E9E';
  }
};

// =============================================
// INFO ROW
// =============================================

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow = ({ label, value }: InfoRowProps) => {
  return (
    <div className="flex justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'var(--color-border, #e5e0d8)' }}>
      <span className="text-sm font-medium" style={{ color: 'var(--color-text-light, #6b7280)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--color-text, #2d2d2d)' }}>{value}</span>
    </div>
  );
};

export default AdminNotificationsPage;