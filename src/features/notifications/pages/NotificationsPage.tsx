// 📁 NotificationsPage.tsx (Modern UI Version)

import { Bell, Check, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDateTime } from '@/utils/helpers';

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

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* HEADER MODERNE */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: colors.text }}
          >
            🔔 Notifications
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

      {/* LISTE */}
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
                    : 'bg-gray-50 opacity-70'
                }`}
                style={{
                  borderColor: isUnread ? colors.primary + '40' : '#eee',
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
                    <div className="flex items-center gap-2">
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
                    </div>

                    <p
                      className="text-sm mt-1 leading-relaxed"
                      style={{ color: colors.text + '80' }}
                    >
                      {notification.body}
                    </p>

                    <p
                      className="text-xs mt-2"
                      style={{ color: colors.text + '50' }}
                    >
                      {formatDateTime(notification.created_at)}
                    </p>
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
        // EMPTY STATE PREMIUM
        <div className="bg-white rounded-3xl p-12 text-center shadow-md">
          <div
            className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-5"
            style={{
              background: colors.primary + '15',
              color: colors.primary,
            }}
          >
            <Bell size={36} />
          </div>

          <h3 className="text-lg font-bold" style={{ color: colors.text }}>
            Aucune notification
          </h3>

          <p
            className="mt-2 text-sm max-w-sm mx-auto"
            style={{ color: colors.text + '70' }}
          >
            {getEmptyMessage()}
          </p>

          <p
            className="text-xs mt-3"
            style={{ color: colors.text + '40' }}
          >
            Vous serez alerté en temps réel.
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
