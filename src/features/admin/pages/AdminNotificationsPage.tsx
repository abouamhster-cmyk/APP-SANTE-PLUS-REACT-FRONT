// 📁 src/features/admin/pages/AdminNotificationsPage.tsx
// ✅ INTERFACE ADMINISTRATION NOTIFICATIONS AVEC ENVOI CIBLÉ & MODALES CORRIGÉES

import { useEffect, useState } from 'react';
import {
  Bell, Send, Users, RefreshCw, Eye, Trash2, X, CheckCircle, Clock, AlertCircle,
  Info, Tag, User, Loader2, Search, Filter, UserPlus, Shield, Calendar, UserCog, Briefcase
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/helpers';
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

const AdminNotificationsPage = () => {
  const { profile, role } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingVisits, setPendingVisits] = useState<PendingAidantVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
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
        .limit(100);

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
      const { data } = await supabase
        .from('visites')
        .select('id, target_name, scheduled_date, scheduled_time, user_id, created_at, waiting_for_aidant_since, patient:patients(id, first_name, last_name, address), family:profiles!visites_user_id_fkey(id, full_name, email, phone)')
        .eq('status', 'en_attente_aidant')
        .order('created_at', { ascending: true });

      setPendingVisits(
        (data || []).map((item: any) => ({
          id: item.id,
          target_name: item.target_name,
          scheduled_date: item.scheduled_date,
          scheduled_time: item.scheduled_time,
          user_id: item.user_id,
          created_at: item.created_at,
          waiting_for_aidant_since: item.waiting_for_aidant_since,
          patient: Array.isArray(item.patient) ? item.patient[0] : item.patient,
          family: Array.isArray(item.family) ? item.family[0] : item.family,
        }))
      );
    } catch (error) {
      console.error('Fetch pending visits error:', error);
    }
  };

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

      const notificationsToInsert = targetUserIds.map((userId) => ({
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

      const { error } = await supabase.from('notifications').insert(notificationsToInsert);
      if (error) throw error;

      toast.success(`Notification envoyée à ${targetUserIds.length} utilisateur(s)`);
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
      toast.error("Erreur d'envoi: " + error.message);
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
    } catch (error: any) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch =
      n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || n.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: notifications.length,
    sent: notifications.filter((n) => n.is_sent).length,
    delivered: notifications.filter((n) => n.is_delivered).length,
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
            <p className="text-xs font-semibold text-gray-500 mt-1">Envoi d'alertes push et suivi de la diffusion</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchNotifications} className="px-3.5 py-2 rounded-xl text-xs font-bold border bg-white hover:bg-gray-50 flex items-center gap-1.5">
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Actualiser
            </button>
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-sm" style={{ background: colors.primary }}>
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
              <UserPlus size={20} className="text-orange-500" />
              <div>
                <p className="font-bold text-xs text-orange-900">{stats.pendingAidant} visite(s) en attente d'aidant</p>
                <p className="text-[11px] text-orange-700">Toutes les places sont occupées, action requise.</p>
              </div>
            </div>
            <button onClick={() => setShowPendingVisits(!showPendingVisits)} className="px-3 py-1.5 bg-orange-500 text-white rounded-xl text-xs font-bold">
              {showPendingVisits ? 'Masquer' : 'Voir'}
            </button>
          </div>
        </div>
      )}

      {/* Cartes de statistiques */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} color={colors.primary} icon={<Bell size={16} />} />
        <StatCard label="Envoyées" value={stats.sent} color="#10b981" icon={<Send size={16} />} />
        <StatCard label="Lues" value={stats.read} color="#3b82f6" icon={<CheckCircle size={16} />} />
        <StatCard label="Alertes" value={stats.alerts} color="#ef4444" icon={<AlertCircle size={16} />} />
      </section>

      {/* Formulaire de création */}
      {showForm && (
        <section className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-xs font-black uppercase text-gray-400">📝 Rédiger une alerte push</h2>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-4 text-xs font-bold">
            <div>
              <label className="block mb-1">Titre *</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full h-11 px-4 rounded-xl border bg-gray-50 outline-none" required />
            </div>

            <div>
              <label className="block mb-1">Corps du message *</label>
              <textarea value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} rows={3} className="w-full p-4 rounded-xl border bg-gray-50 outline-none resize-none" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5">Type de notification</label>
                <div className="flex flex-wrap gap-1.5">
                  {notificationTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value as any })}
                      className="px-3 py-1.5 rounded-lg text-[11px] transition-all"
                      style={{ background: formData.type === type.value ? type.color : '#f1f5f9', color: formData.type === type.value ? '#ffffff' : '#475569' }}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-1.5">Destinataires</label>
                <div className="flex flex-wrap gap-1.5">
                  {targets.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, target: t.value as any, targetUsers: [] })}
                      className="px-3 py-1.5 rounded-lg text-[11px] transition-all"
                      style={{ background: formData.target === t.value ? colors.primary : '#f1f5f9', color: formData.target === t.value ? '#ffffff' : '#475569' }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border">Annuler</button>
              <button type="submit" disabled={isSending} className="px-5 py-2 rounded-xl text-white font-bold" style={{ background: colors.primary }}>
                {isSending ? <Loader2 size={14} className="animate-spin" /> : 'Envoyer'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Filtres et recherche */}
      <section className="bg-white rounded-2xl p-3 border shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Rechercher..." className="w-full h-11 pl-10 pr-4 rounded-xl border bg-gray-50 text-xs font-bold outline-none" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-11 px-4 rounded-xl border bg-gray-50 text-xs font-bold outline-none">
          <option value="all">Tous les types</option>
          {notificationTypes.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </section>

      {/* Liste des notifications */}
      <section className="bg-white rounded-3xl border shadow-sm divide-y overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center"><Loader2 size={24} className="animate-spin mx-auto text-gray-300" /></div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-400 font-bold">Aucune notification enregistrée</div>
        ) : (
          filteredNotifications.map((notif) => (
            <div key={notif.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <p className="font-extrabold text-xs text-gray-800 truncate">{notif.title}</p>
                <p className="text-xs text-gray-500 line-clamp-1">{notif.body}</p>
                <p className="text-[10px] text-gray-400">{notif.user?.full_name || 'Global'} • {formatDate(notif.created_at)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setSelectedNotification(notif); setShowDetailsModal(true); }} className="p-2 border rounded-xl hover:bg-gray-100"><Eye size={14} /></button>
                <button onClick={() => handleDeleteNotification(notif.id)} className="p-2 border border-red-100 text-red-500 rounded-xl hover:bg-red-50"><Trash2 size={14} /></button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Modale détails */}
      {showDetailsModal && selectedNotification && (
        <NotificationDetailsModal notification={selectedNotification} onClose={() => setShowDetailsModal(false)} colors={colors} />
      )}
    </div>
  );
};

// =============================================
// SUBCOMPONENTS DÉFINIS COMPLETEMENT
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
  notification: NotificationItem;
  onClose: () => void;
  colors: any;
}

const NotificationDetailsModal = ({ notification, onClose }: NotificationDetailsModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="font-black text-sm">Détails de la notification</h3>
        <button onClick={onClose}><X size={18} /></button>
      </div>
      <div className="space-y-2 text-xs">
        <div><span className="text-gray-400 font-semibold block">Titre :</span><span className="font-bold text-gray-800">{notification.title}</span></div>
        <div><span className="text-gray-400 font-semibold block">Message :</span><span className="text-gray-700 leading-relaxed">{notification.body}</span></div>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div><span className="text-gray-400 font-semibold block">Type :</span><span className="font-bold uppercase text-emerald-600">{notification.type}</span></div>
          <div><span className="text-gray-400 font-semibold block">Date :</span><span className="font-bold text-gray-800">{formatDate(notification.created_at)}</span></div>
        </div>
      </div>
    </div>
  </div>
);

export default AdminNotificationsPage;
