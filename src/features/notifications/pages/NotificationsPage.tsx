// 📁 src/features/notifications/pages/NotificationsPage.tsx
 
import { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  Check, 
  X, 
  RefreshCw, 
  BellRing, 
  BellOff, 
  Calendar, 
  ShoppingBag, 
  CreditCard, 
  AlertCircle, 
  Loader2,
  Trash2
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDateTime } from '@/utils/helpers';
import { Illustration } from '@/components/ui/Illustration';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

// ============================================================
// DÉCORATEUR D'ICÔNE THÉMATIQUE COLORÉE (BRANDING & VISUEL)
// ============================================================
const getNotificationIcon = (type: string, defaultColor: string) => {
  switch (type) {
    case 'visite':
      return (
        <div className="p-2.5 rounded-2xl shrink-0 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
          <Calendar size={18} />
        </div>
      );
    case 'commande':
      return (
        <div className="p-2.5 rounded-2xl shrink-0 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
          <ShoppingBag size={18} />
        </div>
      );
    case 'paiement':
      return (
        <div className="p-2.5 rounded-2xl shrink-0 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
          <CreditCard size={18} />
        </div>
      );
    case 'system':
    case 'alert':
      return (
        <div className="p-2.5 rounded-2xl shrink-0 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 animate-pulse">
          <AlertCircle size={18} />
        </div>
      );
    default:
      return (
        <div 
          className="p-2.5 rounded-2xl shrink-0" 
          style={{ backgroundColor: `${defaultColor}15`, color: defaultColor }}
        >
          <Bell size={18} />
        </div>
      );
  }
};

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

  useEffect(() => {
    fetchNotifications(true);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications(true);
    setIsRefreshing(false);
    toast.success('Flux de notifications actualisé');
  };

  const handleToggleNotifications = () => {
    toggleNotifications();
    toast.success(
      notificationsEnabled ? 'Alertes de l\'appareil désactivées' : 'Alertes de l\'appareil activées'
    );
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) {
      toast('Aucune notification non lue', { icon: 'ℹ️' });
      return;
    }
    await markAllRead();
    toast.success('Toutes les notifications ont été marquées comme lues');
  };

  const handleDelete = async (id: string) => {
    await markAsRead(id);
    // On simule une suppression de l'UI en marquant simplement comme lu
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

  // ✅ EFFET RETOUR SONORE NOTIFICATION
  useEffect(() => {
    if (notifications.length > 0 && unreadCount > 0) {
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.25;
        audio.play().catch(() => {});
      } catch (e) {
        // Ignorer si les navigateurs bloquent l'autoplay
      }
    }
  }, [notifications.length, unreadCount]);

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-32 px-4 sm:px-0">

      {/* ============================================================
          HEADER DE LA PAGE AVEC ACTIONS COORDONNÉES
          ============================================================ */}
      <section className="bg-white dark:bg-[#17231d] rounded-3xl p-5 shadow-sm border border-black/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <Bell size={12} />
              Centre de notifications
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-gray-100">
              Fils d'actualités
            </h1>

            <p className="text-xs text-gray-400 mt-1">
              {unreadCount > 0
                ? `${unreadCount} alerte${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
                : "Toutes vos alertes sont à jour"}
            </p>
          </div>

          {/* Boutons d'actions compacts */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 dark:border-gray-800">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-10 h-10 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-[#1d2d25] dark:hover:bg-[#24362d] flex items-center justify-center transition border"
              title="Rafraîchir"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={handleToggleNotifications}
              className={cn(
                "w-10 h-10 rounded-2xl border flex items-center justify-center transition",
                notificationsEnabled 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/40" 
                  : "bg-gray-50 border-gray-200 text-gray-400 dark:bg-[#1d2d25] dark:border-gray-800"
              )}
              title={notificationsEnabled ? 'Alertes de l\'appareil actives' : 'Alertes de l\'appareil inactives'}
            >
              <Bell size={16} />
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2.5 rounded-2xl text-xs font-black text-white transition hover:opacity-90 flex items-center gap-1.5 shadow-md shrink-0"
                style={{
                  background: colors.primary,
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
          LISTE ET RENDU DYNAMIQUE DES CARTES DE NOTIFICATIONS
          ============================================================ */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#17231d] rounded-3xl border border-black/5">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <p className="text-xs text-gray-400 font-bold mt-3">Chargement des alertes...</p>
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const isUnread = !notification.is_read;

            return (
              <div
                key={notification.id}
                onClick={() => isUnread && markAsRead(notification.id)}
                className={cn(
                  "group relative rounded-3xl p-4 transition-all duration-300 cursor-pointer border flex items-start gap-4",
                  isUnread
                    ? "bg-white dark:bg-[#17231d] border-l-[5px] shadow-sm hover:shadow-md"
                    : "bg-white/40 dark:bg-[#17231d]/40 opacity-70 border-l-[5px] border-gray-100"
                )}
                style={{
                  borderLeftColor: isUnread ? colors.primary : '#d1d5db',
                }}
              >
                {/* ICÔNE BRANDÉE ET COLORÉE SELON TYPE */}
                {getNotificationIcon(notification.type, colors.primary)}

                {/* CONTENU TEXTUEL AVEC RETOURS DE LECTURE */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-xs sm:text-sm text-gray-800 dark:text-white truncate">
                      {notification.title}
                    </h4>

                    {isUnread && (
                      <span
                        className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500 text-white animate-pulse"
                      >
                        Nouveau
                      </span>
                    )}

                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-50 border dark:bg-[#24362d] dark:text-gray-300">
                      {notification.type || 'Système'}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 leading-relaxed font-medium">
                    {notification.body}
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <p className="text-[10px] text-gray-400 font-bold">
                      {formatDateTime(notification.created_at)}
                    </p>
                    {notification.is_read && (
                      <span className="text-[9px] text-emerald-500 font-extrabold flex items-center gap-0.5">
                        ✓ Lu
                      </span>
                    )}
                  </div>
                </div>

                {/* MODULE ACTIONS FLOTTANTES (Toujours affiché sur Mobile, Hover sur Bureau) */}
                <div className="flex items-center gap-1 shrink-0 self-center">
                  {isUnread && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 rounded-xl bg-gray-50 dark:bg-[#1d2d25] text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all border"
                      title="Marquer comme lu"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 rounded-xl bg-gray-50 dark:bg-[#1d2d25] text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all border"
                    title="Supprimer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // ============================================================
        // EMPTY STATE AVEC COMPOSANT D'ILLUSTRATION MODERNISÉ
        // ============================================================
        <div className="bg-white dark:bg-[#17231d] rounded-[2rem] p-12 text-center shadow-sm border border-black/5">
          <Illustration 
            type="message" 
            size="lg" 
            className="mx-auto mb-5 opacity-40"
            color={colors.primary}
          />

          <h3 className="text-base sm:text-lg font-black text-gray-800 dark:text-gray-100">
            {getEmptyTitle()}
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
            {getEmptyMessage()}
          </p>

          <div
            className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-50 dark:bg-[#1d2d25] text-gray-400"
          >
            <BellRing size={12} className="text-emerald-500 animate-bounce" />
            Alertes en temps réel actives
          </div>

          {!notificationsEnabled && (
            <div className="pt-4">
              <button
                onClick={handleToggleNotifications}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-xs font-black transition hover:opacity-90 shadow-md"
                style={{ background: colors.primary }}
              >
                <BellRing size={14} />
                Activer les notifications locales
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          STATS DU FOOTER & ACTIONS EN MASSE SÉCURISÉES
          ============================================================ */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-3 border-t dark:border-gray-800" style={{ borderColor: colors.border }}>
          <span className="font-semibold">{notifications.length} notification{notifications.length > 1 ? 's' : ''} • {unreadCount} non lue{unreadCount > 1 ? 's' : ''}</span>
          <button
            onClick={() => {
              if (window.confirm('Voulez-vous vraiment purger tout votre historique de notifications ?')) {
                clearNotifications();
                toast.success('Historique de notifications vidé');
              }
            }}
            className="text-red-400 hover:text-red-500 font-extrabold flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-red-50 transition"
          >
            <Trash2 size={12} />
            Tout vider
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
