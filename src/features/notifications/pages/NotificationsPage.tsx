// 📁 src/features/notifications/pages/NotificationsPage.tsx

import { useState, useEffect } from 'react';
import { Bell, Check, X, RefreshCw, Mail, Inbox, BellRing, BellOff } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDateTime } from '@/utils/helpers';
import { Illustration } from '@/components/ui/Illustration';
import toast from 'react-hot-toast';

const NotificationsPage = () => {
  const { profile, role } = useAuthStore();
  const { 
    notifications, 
    unreadCount,
    fetchNotifications,
    markAsRead, 
    markAllRead,
    clearNotifications,
    notificationsEnabled,
    toggleNotifications,
    isLoading,
  } = useNotificationStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Chargement initial
  useEffect(() => {
    fetchNotifications(true);
  }, []);

  // ✅ Rafraîchir manuellement
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications(true);
    setIsRefreshing(false);
    toast.success('Notifications actualisées');
  };

  // ✅ Activer/Désactiver les notifications
  const handleToggleNotifications = () => {
    toggleNotifications();
    toast.success(
      notificationsEnabled ? 'Notifications désactivées' : 'Notifications activées'
    );
  };

  // ✅ Tout marquer comme lu
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) {
      toast('Aucune notification non lue', { icon: 'ℹ️' });
      return;
    }
    await markAllRead();
    toast.success('Toutes les notifications ont été marquées comme lues');
  };

  // ✅ Supprimer une notification
  const handleDelete = async (id: string) => {
    // ✅ Marquer comme lu puis supprimer de l'interface
    await markAsRead(id);
    // ✅ On pourrait ajouter une vraie suppression ici
  };

  const getEmptyMessage = () => {
    if (isFamily) return "Suivez facilement les activités de vos proches.";
    if (isAidant) return "Vos missions et interventions apparaîtront ici.";
    if (isAdminOrCoordinator) return "Suivez les activités et inscriptions en temps réel.";
    return "Vos notifications apparaîtront ici.";
  };

  const getEmptyTitle = () => {
    if (isFamily) return "Aucune notification pour vos proches";
    if (isAidant) return "Aucune mission en attente";
    if (isAdminOrCoordinator) return "Aucune alerte administrative";
    return "Aucune notification";
  };

  // ✅ Son de notification
  useEffect(() => {
    if (notifications.length > 0 && unreadCount > 0) {
      // ✅ Jouer le son pour les nouvelles notifications
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {
        // Ignorer
      }
    }
  }, [notifications.length, unreadCount]);

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-24 sm:pb-10 px-4 sm:px-0">

      {/* ============================================================
      HEADER AVEC ACTIONS
      ============================================================ */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-1.5"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <Bell size={12} />
              Notifications
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              🔔 Notifications
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {unreadCount > 0
                ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
                : "Tout est à jour"}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* ✅ Bouton Rafraîchir */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl hover:bg-gray-100 transition"
              title="Actualiser"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>

            {/* ✅ Bouton Toggle Notifications */}
            <button
              onClick={handleToggleNotifications}
              className={`p-2 rounded-xl hover:bg-gray-100 transition ${
                notificationsEnabled ? 'text-green-500' : 'text-gray-400'
              }`}
              title={notificationsEnabled ? 'Notifications activées' : 'Notifications désactivées'}
            >
              {notificationsEnabled ? <BellRing size={18} /> : <BellOff size={18} />}
            </button>

            {/* ✅ Bouton Tout marquer comme lu */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition hover:opacity-90"
                style={{
                  background: colors.primary,
                  color: '#fff',
                }}
              >
                <Check size={14} />
                Tout lire
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================
      LISTE DES NOTIFICATIONS
      ============================================================ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const isUnread = !notification.is_read;

            return (
              <div
                key={notification.id}
                onClick={() => isUnread && markAsRead(notification.id)}
                className={`group relative rounded-xl p-3 transition-all duration-300 cursor-pointer border ${
                  isUnread
                    ? 'bg-white shadow-sm hover:shadow-md'
                    : 'bg-gray-50/70 opacity-75'
                }`}
                style={{
                  borderColor: isUnread ? colors.primary + '40' : '#e5e7eb',
                }}
              >
                {/* INDICATEUR GAUCHE */}
                {isUnread && (
                  <div
                    className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
                    style={{ background: colors.primary }}
                  />
                )}

                <div className="flex justify-between items-start gap-3">

                  {/* CONTENU */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className="font-semibold text-sm"
                        style={{ color: colors.text }}
                      >
                        {notification.title}
                      </h4>

                      {isUnread && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: colors.primary + '15',
                            color: colors.primary,
                          }}
                        >
                          Nouveau
                        </span>
                      )}

                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500"
                      >
                        {notification.type || 'Système'}
                      </span>
                    </div>

                    <p
                      className="text-sm mt-1 leading-relaxed"
                      style={{ color: colors.text + '80' }}
                    >
                      {notification.body}
                    </p>

                    <div className="flex items-center gap-3 mt-2">
                      <p
                        className="text-xs"
                        style={{ color: colors.text + '50' }}
                      >
                        {formatDateTime(notification.created_at)}
                      </p>
                      {notification.is_read && (
                        <span
                          className="text-[10px]"
                          style={{ color: colors.text + '30' }}
                        >
                          ✓ Lu
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-100 transition"
                      >
                        <Check size={14} style={{ color: colors.primary }} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 transition"
                    >
                      <X size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ============================================================
        EMPTY STATE MODERN
        ============================================================ */
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-black/5">
          <Illustration 
            type="message" 
            size="lg" 
            className="mx-auto mb-5 opacity-40"
            color={colors.primary}
          />

          <h3 className="text-lg font-bold" style={{ color: colors.text }}>
            {getEmptyTitle()}
          </h3>

          <p
            className="mt-2 text-sm max-w-sm mx-auto"
            style={{ color: colors.text + '70' }}
          >
            {getEmptyMessage()}
          </p>

          <div
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
            style={{
              background: colors.primary + '08',
              color: colors.primary + '80',
            }}
          >
            <Bell size={14} />
            Alertes en temps réel
          </div>

          {/* ✅ Bouton pour activer les notifications si désactivées */}
          {!notificationsEnabled && (
            <button
              onClick={handleToggleNotifications}
              className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-bold"
              style={{ background: colors.primary }}
            >
              <BellRing size={16} className="inline mr-2" />
              Activer les notifications
            </button>
          )}
        </div>
      )}

      {/* ============================================================
      STATS EN BAS
      ============================================================ */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t" style={{ borderColor: colors.border }}>
          <span>{notifications.length} notification{notifications.length > 1 ? 's' : ''}</span>
          <span>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</span>
          <button
            onClick={() => {
              if (window.confirm('Vider toutes les notifications ?')) {
                clearNotifications();
                toast.success('Notifications vidées');
              }
            }}
            className="text-red-400 hover:text-red-600 transition"
          >
            Tout vider
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
