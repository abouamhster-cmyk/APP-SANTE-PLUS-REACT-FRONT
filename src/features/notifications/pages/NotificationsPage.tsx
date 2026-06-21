// 📁 src/features/notifications/pages/NotificationsPage.tsx
// 📌 Page : Notifications

import { Bell, Check, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDateTime } from '@/utils/helpers';

const NotificationsPage = () => {
  const { profile, role } = useAuthStore();
  const { notifications, markAsRead, markAllRead } = useNotificationStore();
  
  // ✅ Jargon dynamique selon le rôle
  const {
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // ✅ Message personnalisé selon le rôle
  const getEmptyMessage = () => {
    if (isFamily) {
      return "Vous serez notifié des nouvelles activités concernant vos proches.";
    }
    if (isAidant) {
      return "Vous serez notifié des nouvelles missions et commandes.";
    }
    if (isAdminOrCoordinator) {
      return "Vous serez notifié des nouvelles inscriptions et activités.";
    }
    return "Vous serez notifié des nouvelles activités.";
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
            🔔 Notifications
          </h1>
          <p className="mt-1" style={{ color: colors.text + '99' }}>
            {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition hover:opacity-80"
            style={{ background: colors.primary + '15', color: colors.primary }}
          >
            <Check size={16} />
            <span>Marquer tout comme lu</span>
          </button>
        )}
      </div>

      {/* LISTE DES NOTIFICATIONS */}
      {notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-2xl p-4 shadow-sm transition-all cursor-pointer ${
                !notification.is_read ? 'border-l-4' : 'opacity-70'
              }`}
              style={{ 
                borderColor: !notification.is_read ? colors.primary : 'transparent' 
              }}
              onClick={() => !notification.is_read && markAsRead(notification.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium" style={{ color: colors.text }}>
                      {notification.title}
                    </h4>
                    {!notification.is_read && (
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full" 
                        style={{ 
                          background: colors.primary + '15', 
                          color: colors.primary 
                        }}
                      >
                        Nouveau
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
                    {notification.body}
                  </p>
                  <p className="text-xs mt-2" style={{ color: colors.text + '50' }}>
                    {formatDateTime(notification.created_at)}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="flex items-start space-x-2">
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        markAsRead(notification.id); 
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition"
                    >
                      <X size={14} style={{ color: colors.text + '40' }} />
                    </button>
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" 
                      style={{ background: colors.primary }} 
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // 📌 ÉTAT VIDE
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4"
            style={{
              background: colors.primary + '12',
              color: colors.primary,
            }}
          >
            <Bell size={32} />
          </div>
          <h3 className="text-lg font-black" style={{ color: colors.text }}>
            Aucune notification
          </h3>
          <p className="mt-2 text-sm max-w-sm mx-auto leading-relaxed" style={{ color: colors.text + '70' }}>
            {getEmptyMessage()}
          </p>
          <p className="text-xs mt-3" style={{ color: colors.text + '40' }}>
            Les notifications apparaîtront ici en temps réel.
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;