// 📁 src/features/notifications/pages/NotificationsPage.tsx

import { Bell, Check, X, Mail, Inbox } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDateTime } from '@/utils/helpers';
import { Illustration } from '@/components/ui/Illustration';

const NotificationsPage = () => {
  const { profile, role } = useAuthStore();
  const { notifications, markAsRead, markAllRead } = useNotificationStore();

  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const unreadCount = notifications.filter(n => !n.is_read).length;

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

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* ============================================================
      HEADER
      ============================================================ */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: colors.text }}
          >
            Notifications
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
              : "Tout est à jour"}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all hover:scale-105"
            style={{
              background: colors.primary,
              color: '#fff',
            }}
          >
            <Check size={16} />
            Tout lire
          </button>
        )}
      </div>

      {/* ============================================================
      LISTE DES NOTIFICATIONS
      ============================================================ */}
      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const isUnread = !notification.is_read;

            return (
              <div
                key={notification.id}
                onClick={() => isUnread && markAsRead(notification.id)}
                className={`group relative rounded-2xl p-4 transition-all duration-300 cursor-pointer border ${
                  isUnread
                    ? 'bg-white shadow-md hover:shadow-lg'
                    : 'bg-gray-50/70 opacity-75'
                }`}
                style={{
                  borderColor: isUnread ? colors.primary + '40' : '#e5e7eb',
                }}
              >
                {/* INDICATEUR GAUCHE */}
                {isUnread && (
                  <div
                    className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
                    style={{ background: colors.primary }}
                  />
                )}

                <div className="flex justify-between items-start gap-3">

                  {/* CONTENU */}
                  <div className="flex-1">
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
                  {isUnread && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition p-1 rounded-lg hover:bg-gray-100"
                    >
                      <X size={14} style={{ color: colors.text + '50' }} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ============================================================
        EMPTY STATE MODERN
        ============================================================ */
        <div className="bg-white rounded-3xl p-12 text-center shadow-md border border-black/5">
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
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
