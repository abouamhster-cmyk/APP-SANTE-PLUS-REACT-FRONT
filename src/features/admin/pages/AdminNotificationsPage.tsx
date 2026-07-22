// 📁 src/features/admin/pages/AdminNotificationsPage.tsx
 
import { useEffect, useState, useMemo } from 'react';
import {
  Bell, Send, Users, RefreshCw, Eye, Trash2, X, CheckCircle, Clock, AlertCircle,
  Info, Tag, User, Loader2, Search, UserPlus, Shield, Calendar, UserCog, Briefcase
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/helpers';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';

interface NotificationItem {
  id: string;
  user_id: string;
  user?: { id: string; full_name: string; email: string; role: string } | null;
  title: string;
  body: string;
  type: 'visite' | 'message' | 'commande' | 'paiement' | 'system' | 'alert' | 'reminder' | 'promotion';
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

interface GroupedNotification {
  id: string;
  ids: string[];
  title: string;
  body: string;
  type: NotificationItem['type'];
  data: any;
  created_at: string;
  targetGroup: string;
  recipientCount: number;
  recipientNames: string[];
  isReadCount: number;
  sampleUser?: NotificationItem['user'];
}

interface PendingAidantVisit {
  id: string;
  target_name: string;
  scheduled_date: string;
  scheduled_time: string;
  user_id: string;
  family?: { id: string; full_name: string; email: string; phone: string } | null;
  patient?: { id: string; first_name: string; last_name: string; address: string } | null;
  created_at: string;
  waiting_for_aidant_since: string;
}

const notificationTypes = [
  { value: 'system', label: 'Système', icon: <Info size={14} />, color: '#3b82f6' },
  { value: 'alert', label: 'Alerte', icon: <AlertCircle size={14} />, color: '#ef4444' },
  { value: 'reminder', label: 'Rappel', icon: <Clock size={14} />, color: '#f59e0b' },
  { value: 'promotion', label: 'Promotion', icon: <Tag size={14} />, color: '#8b5cf6' },
  { value: 'visite', label: 'Visite', icon: <Calendar size={14} />, color: '#10b981' },
];

const targets = [
  { value: 'all', label: 'Tous', icon: <Users size={14} /> },
  { value: 'family', label: '👨‍👩‍👦 Familles', icon: <Users size={14} /> },
  { value: 'aidant', label: '🦸 Aidants', icon: <Briefcase size={14} /> },
  { value: 'coordinator', label: '👔 Coordinateurs', icon: <UserCog size={14} /> },
  { value: 'admin', label: '👑 Admins', icon: <Shield size={14} /> },
  { value: 'specific', label: '👤 Cible précise', icon: <User size={14} /> },
];

const getTargetBadgeLabel = (targetGroup: string, count: number, names: string[], sampleUser?: any) => {
  if (count === 1 && sampleUser?.full_name) {
    return `👤 ${sampleUser.full_name}`;
  }
  if (count === 1 && names.length > 0) {
    return `👤 ${names[0]}`;
  }
  switch (targetGroup) {
    case 'all':
      return `📢 Diffusion : Tous (${count} destinataires)`;
    case 'family':
      return `👨‍👩‍👦 Groupe : Familles (${count} destinataires)`;
    case 'aidant':
      return `🦸 Groupe : Aidants (${count} destinataires)`;
    case 'coordinator':
      return `👔 Groupe : Coordinateurs (${count} destinataires)`;
    case 'admin':
      return `👑 Groupe : Admins (${count} destinataires)`;
    case 'specific':
      return `👥 Groupe ciblé (${count} destinataires)`;
    default:
      return `📢 Diffusion (${count} destinataires)`;
  }
};

const AdminNotificationsPage = () => {
  const { profile, role } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingVisits, setPendingVisits] = useState<PendingAidantVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupedNotification | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPendingVisits, setShowPendingVisits] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: 'system' as NotificationItem['type'],
    target: 'all',
    targetUsers: [] as string[],
    link: '',
    image_url: '',
  });

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
    fetchPendingVisits();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const { data: notifsData, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) throw error;

      const userIds = [...new Set(notifsData?.map((n) => n.user_id).filter(Boolean))];
      let profileMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('id', userIds);

        if (profiles) {
          profileMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      setNotifications(
        (notifsData || []).map((n) => ({
          ...n,
          user: n.user_id ? profileMap[n.user_id] || null : null,
        }))
      );
    } catch (error: any) {
      console.error('Fetch notifications error:', error);
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await supabase.from('profiles').select('id, full_name, email, role').order('full_name');
      setUsers(data || []);
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  const fetchPendingVisits = async () => {
    try {
      const { data: visitsData, error } = await supabase
        .from('visites')
        .select('id, target_name, scheduled_date, scheduled_time, user_id, created_at, waiting_for_aidant_since, patient:patients(id, first_name, last_name, address)')
        .eq('status', 'en_attente_aidant')
        .order('created_at', { ascending: true });

      if (error) return;

      const userIds = [...new Set((visitsData || []).map((v) => v.user_id).filter(Boolean))];
      let familyMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .in('id', userIds);

        if (profiles) {
          familyMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      setPendingVisits(
        (visitsData || []).map((item: any) => ({
          id: item.id,
          target_name: item.target_name,
          scheduled_date: item.scheduled_date,
          scheduled_time: item.scheduled_time,
          user_id: item.user_id,
          created_at: item.created_at,
          waiting_for_aidant_since: item.waiting_for_aidant_since,
          patient: Array.isArray(item.patient) ? item.patient[0] : item.patient,
          family: familyMap[item.user_id] || null,
        }))
      );
    } catch (error) {
      console.error('Fetch pending visits catch error:', error);
    }
  };

  // ✅ ENVOI AVEC GENERATION D'UN BROADCAST_ID UNIQUE
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.body.trim()) {
      toast.error('Le titre et le message sont requis');
      return;
    }

    setIsSending(true);
    try {
      let targetUserIds: string[] = [];

      if (formData.target === 'all') {
        const { data } = await supabase.from('profiles').select('id');
        targetUserIds = data?.map((u) => u.id) || [];
      } else if (formData.target === 'specific') {
        targetUserIds = formData.targetUsers;
      } else {
        const { data } = await supabase.from('profiles').select('id').eq('role', formData.target);
        targetUserIds = data?.map((u) => u.id) || [];
      }

      if (targetUserIds.length === 0) {
        toast.error('Aucun destinataire sélectionné');
        setIsSending(false);
        return;
      }

      // Identifiant unique pour regrouper le lot sur le dashboard Admin
      const broadcastId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `bc_${Date.now()}`;

      const notificationsToInsert = targetUserIds.map((userId) => ({
        user_id: userId,
        title: formData.title.trim(),
        body: formData.body.trim(),
        type: formData.type,
        data: {
          link: formData.link || null,
          image_url: formData.image_url || null,
          sender: profile?.id,
          broadcast_id: broadcastId,
          target_group: formData.target,
          recipient_count: targetUserIds.length,
        },
        image_url: formData.image_url || null,
        is_read: false,
        is_sent: true,
        sent_at: new Date().toISOString(),
        is_delivered: true,
        delivered_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('notifications').insert(notificationsToInsert);
      if (error) throw error;

      toast.success(`Notification diffusée à ${targetUserIds.length} utilisateur(s)`);
      setFormData({
        title: '',
        body: '',
        type: 'system',
        target: 'all',
        targetUsers: [],
        link: '',
        image_url: '',
      });
      setShowFormModal(false);
      fetchNotifications();
    } catch (error: any) {
      toast.error("Erreur d'envoi: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  // ✅ SUPPRESSION GROUPÉE DE TOUTES LES NOTIFICATIONS DU MEME LOT
  const handleDeleteGroup = async (ids: string[]) => {
    if (!window.confirm(`Supprimer cette diffusion (${ids.length} destinataire(s)) ?`)) return;
    try {
      const { error } = await supabase.from('notifications').delete().in('id', ids);
      if (error) throw error;
      toast.success('Notification(s) supprimée(s)');
      fetchNotifications();
    } catch (error: any) {
      toast.error('Erreur lors de la suppression');
    }
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
      targetUsers: formData.targetUsers.filter((id) => id !== userId),
    });
  };

  const filteredUsers = users
    .filter(
      (user) =>
        user.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearch.toLowerCase())
    )
    .slice(0, 10);

  const getUserName = (userId: string) => {
    const u = users.find((item) => item.id === userId);
    return u?.full_name || 'Inconnu';
  };

  // ✅ ALGORITHME DE REGROUPEMENT PAR BROADCAST / BATCH / MINUTE
  const groupedNotifications = useMemo(() => {
    const filtered = notifications.filter((n) => {
      const matchesSearch =
        n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || n.type === filterType;
      return matchesSearch && matchesType;
    });

    const groupsMap = new Map<string, GroupedNotification>();

    filtered.forEach((notif) => {
      const broadcastId = notif.data?.broadcast_id;
      // Regroupement par broadcast_id ou par minute d'envoi si identique
      const timeKey = notif.created_at ? notif.created_at.substring(0, 16) : '';
      const groupKey = broadcastId 
        ? `bc_${broadcastId}` 
        : `${notif.title}_${notif.body}_${timeKey}`;

      const existing = groupsMap.get(groupKey);

      if (existing) {
        existing.ids.push(notif.id);
        existing.recipientCount += 1;
        if (notif.is_read) existing.isReadCount += 1;
        if (notif.user?.full_name && !existing.recipientNames.includes(notif.user.full_name)) {
          existing.recipientNames.push(notif.user.full_name);
        }
      } else {
        const targetGroup = notif.data?.target_group || (notif.user ? 'user' : 'all');
        groupsMap.set(groupKey, {
          id: notif.id,
          ids: [notif.id],
          title: notif.title,
          body: notif.body,
          type: notif.type,
          data: notif.data,
          created_at: notif.created_at,
          targetGroup: targetGroup,
          recipientCount: 1,
          recipientNames: notif.user?.full_name ? [notif.user.full_name] : [],
          isReadCount: notif.is_read ? 1 : 0,
          sampleUser: notif.user,
        });
      }
    });

    return Array.from(groupsMap.values());
  }, [notifications, searchTerm, filterType]);

  const stats = {
    total: notifications.length,
    groupedCount: groupedNotifications.length,
    sent: notifications.filter((n) => n.is_sent).length,
    read: notifications.filter((n) => n.is_read).length,
    alerts: notifications.filter((n) => n.type === 'alert').length,
    pendingAidant: pendingVisits.length,
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12 px-4 sm:px-0">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all border border-black/5" style={{ background: `${colors.primary}08` }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: colors.text }}>🔔 Notifications système</h1>
            <p className="text-xs font-semibold text-gray-500 mt-1">
              {stats.groupedCount} diffusion(s) regroupée(s) • {stats.total} message(s) individuels envoyés
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchNotifications} className="px-3.5 py-2 rounded-xl text-xs font-bold border bg-white hover:bg-gray-50 flex items-center gap-1.5">
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Actualiser
            </button>
            <button onClick={() => setShowFormModal(true)} className="px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-opacity hover:opacity-90" style={{ background: colors.primary }}>
              <Send size={14} /> Nouvelle alerte
            </button>
          </div>
        </div>
      </section>

      {/* Alerte Visites en attente d'aidants */}
      {stats.pendingAidant > 0 && (
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <UserPlus size={20} className="text-orange-500 shrink-0" />
              <div>
                <p className="font-bold text-xs text-orange-900">{stats.pendingAidant} visite(s) en attente d'aidant</p>
                <p className="text-[11px] text-orange-700">Toutes les places sont occupées, action requise.</p>
              </div>
            </div>
            <button onClick={() => setShowPendingVisits(!showPendingVisits)} className="px-3 py-1.5 bg-orange-500 text-white rounded-xl text-xs font-bold">
              {showPendingVisits ? 'Masquer' : 'Voir'}
            </button>
          </div>

          {showPendingVisits && (
            <div className="mt-3 pt-3 border-t border-orange-200 space-y-2">
              {pendingVisits.map((v) => (
                <div key={v.id} className="bg-white p-3 rounded-xl border border-orange-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-gray-800">{v.target_name || 'Patient'}</p>
                    <p className="text-[10px] text-gray-500">{formatDate(v.scheduled_date)} à {v.scheduled_time}</p>
                  </div>
                  <button onClick={() => window.location.href = `/app/visits/${v.id}`} className="px-2.5 py-1 rounded-lg text-white font-bold text-[10px]" style={{ background: colors.primary }}>
                    Assigner
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cartes de statistiques */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Diffusions" value={stats.groupedCount} color={colors.primary} icon={<Bell size={16} />} />
        <StatCard label="Total reçus" value={stats.total} color="#10b981" icon={<Send size={16} />} />
        <StatCard label="Total lues" value={stats.read} color="#3b82f6" icon={<CheckCircle size={16} />} />
        <StatCard label="Alertes" value={stats.alerts} color="#ef4444" icon={<AlertCircle size={16} />} />
      </section>

      {/* Filtres et recherche */}
      <section className="bg-white rounded-2xl p-3 border shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Rechercher par titre, message ou destinataire..." className="w-full h-11 pl-10 pr-4 rounded-xl border bg-gray-50 text-xs font-bold outline-none" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-11 px-4 rounded-xl border bg-gray-50 text-xs font-bold outline-none cursor-pointer">
          <option value="all">Tous les types</option>
          {notificationTypes.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </section>

      {/* Liste des notifications REGROUPÉES */}
      <section className="bg-white rounded-3xl border shadow-sm divide-y overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center"><Loader2 size={24} className="animate-spin mx-auto text-gray-300" /></div>
        ) : groupedNotifications.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-400 font-bold">Aucune notification enregistrée</div>
        ) : (
          groupedNotifications.map((group) => (
            <div key={group.id} className="p-4 hover:bg-gray-50/80 transition flex items-center justify-between gap-4">
              <div className="min-w-0 space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-xs text-gray-900">{group.title}</span>
                  {group.type === 'alert' && (
                    <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black bg-red-100 text-red-600 uppercase">ALERTE</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 line-clamp-1 leading-relaxed">{group.body}</p>
                <div className="flex items-center gap-2 text-[10px] flex-wrap">
                  <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    {getTargetBadgeLabel(group.targetGroup, group.recipientCount, group.recipientNames, group.sampleUser)}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-400 font-medium">{formatDate(group.created_at)}</span>
                  {group.recipientCount > 1 && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-blue-600 font-semibold">{group.isReadCount} / {group.recipientCount} lues</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => { setSelectedGroup(group); setShowDetailsModal(true); }} className="p-2 border rounded-xl hover:bg-gray-100 text-gray-600">
                  <Eye size={14} />
                </button>
                <button onClick={() => handleDeleteGroup(group.ids)} className="p-2 border border-red-100 text-red-500 rounded-xl hover:bg-red-50">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* MODALE DE CRÉATION D'ALERTE */}
      {showFormModal && (
        <Modal
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
          title="📝 Rédiger une alerte push"
          maxWidth="lg"
        >
          <form onSubmit={handleSendNotification} className="space-y-4 text-xs font-bold pt-1">
            <div>
              <label className="block text-gray-700 mb-1">Titre *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Information importante Santé Plus"
                className="w-full h-11 px-4 rounded-xl border bg-gray-50 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1">Message *</label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={3}
                placeholder="Rédigez votre alerte ici..."
                className="w-full p-3 rounded-xl border bg-gray-50 outline-none resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-1.5">Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {notificationTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value as any })}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] transition-all"
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
                <label className="block text-gray-700 mb-1.5">Destinataires</label>
                <div className="flex flex-wrap gap-1.5">
                  {targets.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, target: t.value as any, targetUsers: [] })}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] transition-all"
                      style={{
                        background: formData.target === t.value ? colors.primary : '#f1f5f9',
                        color: formData.target === t.value ? '#ffffff' : '#475569',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sélecteur si cible spécifique */}
            {formData.target === 'specific' && (
              <div className="relative pt-1">
                <label className="block text-gray-700 mb-1">Sélectionner les utilisateurs</label>
                <div className="flex flex-wrap gap-1 mb-2 max-h-24 overflow-y-auto">
                  {formData.targetUsers.map((uid) => (
                    <span key={uid} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                      {getUserName(uid)}
                      <button type="button" onClick={() => removeTargetUser(uid)} className="text-red-500 hover:text-red-700 ml-1"><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                  placeholder="Rechercher un utilisateur par nom..."
                  className="w-full h-10 px-3.5 rounded-xl border bg-gray-50 outline-none"
                />
                {showUserDropdown && userSearch.length > 0 && filteredUsers.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border rounded-xl shadow-xl max-h-36 overflow-y-auto divide-y">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => addTargetUser(u.id)}
                        className="w-full p-2.5 text-left text-xs hover:bg-gray-50 flex justify-between items-center"
                      >
                        <span className="font-bold">{u.full_name}</span>
                        <span className="text-[10px] text-gray-400">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-3 pt-4 border-t justify-end">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="flex-1 h-11 rounded-xl border text-xs font-bold hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="flex-1 h-11 rounded-xl text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-opacity hover:opacity-90"
                style={{ background: colors.primary }}
              >
                {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Envoyer l'alerte
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modale détails pour le groupe */}
      {showDetailsModal && selectedGroup && (
        <NotificationDetailsModal group={selectedGroup} onClose={() => setShowDetailsModal(false)} colors={colors} />
      )}
    </div>
  );
};

// =============================================
// SUBCOMPONENTS
// =============================================

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}

const StatCard = ({ label, value, color, icon }: StatCardProps) => (
  <div className="bg-white rounded-2xl p-4 border shadow-sm flex justify-between items-center">
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-black mt-0.5" style={{ color }}>{value}</p>
    </div>
    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, color }}>
      {icon}
    </div>
  </div>
);

interface NotificationDetailsModalProps {
  group: GroupedNotification;
  onClose: () => void;
  colors: any;
}

const NotificationDetailsModal = ({ group, onClose }: NotificationDetailsModalProps) => (
  <Modal isOpen={true} onClose={onClose} title="Détails de la diffusion" maxWidth="md">
    <div className="space-y-3 text-xs pt-1">
      <div>
        <span className="text-gray-400 font-semibold block mb-0.5">Titre :</span>
        <span className="font-bold text-gray-800 text-sm">{group.title}</span>
      </div>
      <div>
        <span className="text-gray-400 font-semibold block mb-0.5">Message :</span>
        <span className="text-gray-700 leading-relaxed block bg-gray-50 p-3 rounded-xl border">{group.body}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
        <div>
          <span className="text-gray-400 font-semibold block">Type :</span>
          <span className="font-bold uppercase text-emerald-600">{group.type}</span>
        </div>
        <div>
          <span className="text-gray-400 font-semibold block">Date d'envoi :</span>
          <span className="font-bold text-gray-800">{formatDate(group.created_at)}</span>
        </div>
      </div>
      <div className="pt-2 border-t space-y-1.5">
        <span className="text-gray-400 font-semibold block">Audience ({group.recipientCount} destinataires) :</span>
        <div className="bg-gray-50 p-3 rounded-xl border max-h-32 overflow-y-auto space-y-1">
          {group.recipientNames.length > 0 ? (
            group.recipientNames.map((name, i) => (
              <p key={i} className="text-gray-800 font-bold">• {name}</p>
            ))
          ) : (
            <p className="text-gray-500 italic">Destinataires généraux ({group.recipientCount})</p>
          )}
        </div>
      </div>
    </div>
  </Modal>
);

export default AdminNotificationsPage;
