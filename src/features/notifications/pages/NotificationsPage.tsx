// 📁 src/features/notifications/pages/NotificationsPage.tsx
 
import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Bell, 
  Check, 
  X, 
  RefreshCw, 
  Loader2,
  Trash2
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useBranding } from '@/hooks/useBranding';
import { formatDateTime, cn } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// ============================================================
// 🧠 MOTEUR DE TRADUCTION DYNAMIQUE
// ============================================================
const formatNotificationContext = (notification: any, currentUser: any) => {
  const title = notification.title || '';
  const body = notification.body || '';
  const data = notification.data || {};
  const role = currentUser?.role;
  const currentUserId = currentUser?.id;

  if (
    notification.type === 'system' || 
    notification.type === 'visite' || 
    notification.type === 'alert' || 
    title.includes('assignation') || 
    title.includes('assigné') || 
    body.includes('assigné')
  ) {
    const aidantName = data.aidant_name || 'L\'aidant';
    const targetName = data.target_name || 'Bénéficiaire';
    const creatorName = data.creator_name || 'L\'administration';
    
    const creatorId = data.creator_id || data.created_by;
    const targetId = data.target_id;
    const isPermanent = data.assignment_type === 'primary' || data.assignment_type === 'secondary' || data.is_permanent === true;
    const typeLabel = isPermanent ? 'Permanente' : 'Ponctuelle';

    if (role === 'admin' || role === 'coordinator') {
      const isCreatorMe = creatorId === currentUserId;
      if (isCreatorMe) {
        return {
          title: 'Mon assignation d’aidant',
          body: `Vous avez assigné ${aidantName} à ${targetName} (${typeLabel})`
        };
      } else {
        return {
          title: 'Nouvelle assignation créée',
          body: `${creatorName} a assigné ${aidantName} à ${targetName} (${typeLabel})`
        };
      }
    }

    if (role === 'family') {
      const isTargetMe = targetId === currentUserId;
      if (isTargetMe) {
        return {
          title: isPermanent ? 'Votre aidant permanent est prêt' : 'Visite d’appoint programmée',
          body: isPermanent 
            ? `${aidantName} est désormais rattaché de manière permanente à votre compte.`
            : `${aidantName} est assigné pour votre prochaine visite ponctuelle.`
        };
      } else {
        return {
          title: isPermanent ? `Intervenant permanent pour ${targetName}` : `Visite programmée pour ${targetName}`,
          body: isPermanent 
            ? `${aidantName} est désormais l’intervenant permanent de ${targetName}.`
            : `${aidantName} effectuera la prochaine visite pour ${targetName}.`
        };
      }
    }

    if (role === 'aidant') {
      return {
        title: 'Nouvelle intervention rattachée',
        body: isPermanent 
          ? `Vous êtes assigné en tant que soignant référent pour ${targetName}.`
          : `Vous êtes assigné pour la visite ponctuelle de ${targetName}.`
      };
    }
  }

  return { title, body };
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const NotificationsPage = () => {
  const { profile } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
  
  const { 
    notifications, 
    unreadCount,
    fetchNotifications,
    markAsRead, 
    markAllRead,
    clearNotifications,
    isLoading,
  } = useNotificationStore();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startTouchY = useRef(0);
  const hasFetchedOnMount = useRef(false);

  // ✅ BARRAGE CONTRE LE DOUBLE RECHARGEMENT SUR MONTAGES MULTIPLES
  useEffect(() => {
    if (!hasFetchedOnMount.current) {
      hasFetchedOnMount.current = true;
      // Utilisation du cache si disponible, mise à jour silencieuse sinon
      fetchNotifications(false);
    }
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startTouchY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - startTouchY.current;

    if (diffY > 0 && window.scrollY === 0) {
      const resistance = Math.min(diffY * 0.38, 72);
      setPullY(resistance);
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    setIsPulling(false);
    if (pullY >= 50) {
      await fetchNotifications(true);
      toast.success('Actualisé !');
    }
    setPullY(0);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) {
      toast('Aucune alerte non lue', { icon: 'ℹ️' });
      return;
    }
    await markAllRead();
    toast.success('Tout est lu');
  };

  // ✅ SUPPRESSION INDIVIDUELLE
  const handleDeleteSingle = async (id: string) => {
    if (!profile?.id) return;
    setDeletingId(id);

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', profile.id);

      if (error) throw error;

      toast.success('Notification supprimée');
      await fetchNotifications(true);
    } catch (e: any) {
      console.error('Erreur suppression:', e);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  // ✅ SUPPRESSION TOTALE
  const handleClearAll = async () => {
    if (!profile?.id) return;
    if (!window.confirm('Voulez-vous vider définitivement tout votre historique de notifications ?')) return;

    setIsClearingAll(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', profile.id);

      if (error) throw error;

      clearNotifications();
      toast.success('Historique définitivement supprimé');
      await fetchNotifications(true);
    } catch (e: any) {
      console.error('Erreur vider notifications:', e);
      toast.error('Échec de la suppression');
    } finally {
      setIsClearingAll(false);
    }
  };

  // ✅ NE MONTRER LE SPINNER DE CHARGEMENT QUE SI LA LISTE EST ENCORE TOTALEMENT VIDE
  const showInitialSpinner = isLoading && notifications.length === 0;

  return (
    <div 
      className="space-y-4 max-w-2xl mx-auto pb-12 px-3 sm:px-0 animate-fadeIn"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      
      {/* PULL TO REFRESH */}
      <div 
        className="w-full flex justify-center overflow-hidden transition-all duration-300 ease-out"
        style={{ 
          height: pullY > 0 ? `${pullY}px` : '0px',
          opacity: pullY > 0 ? Math.min(pullY / 45, 1) : 0
        }}
      >
        <div className="flex items-center gap-1.5 py-1 text-xs font-bold" style={{ color: colors.primary }}>
          <RefreshCw size={12} className={cn("transition-all", pullY >= 50 ? "rotate-180 animate-spin" : "")} />
          <span>Relâcher pour actualiser</span>
        </div>
      </div>

      {/* HEADER */}
      <div className="flex items-center justify-between bg-white dark:bg-[#17231d] p-4 rounded-2xl border shadow-sm" style={{ borderColor: colors.primary + '15' }}>
        <div>
          <h1 className="text-sm font-black tracking-tight" style={{ color: colors.text }}>
            Notifications
          </h1>
          <p className="text-[11px] font-medium text-gray-400 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'À jour'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 h-8 rounded-xl text-xs font-bold text-white transition hover:opacity-95 flex items-center gap-1 shadow-sm"
              style={{ background: colors.primary }}
            >
              <Check size={12} strokeWidth={3} />
              <span>Tout lire</span>
            </button>
          )}

          <button
            onClick={() => fetchNotifications(true)}
            disabled={isLoading}
            className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-[#24362d] flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
            title="Actualiser"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* LISTE DES NOTIFICATIONS SANS SCINTILLEMENT */}
      {showInitialSpinner ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.primary }} />
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-2.5">
          {notifications.map((notification) => {
            const isUnread = !notification.is_read;
            const formatted = formatNotificationContext(notification, profile);

            return (
              <div
                key={notification.id}
                onClick={() => isUnread && markAsRead(notification.id)}
                className={cn(
                  "relative rounded-2xl p-4 border transition-all flex items-start justify-between gap-3 shadow-sm",
                  isUnread ? "bg-white dark:bg-[#17231d]" : "bg-gray-50/50 dark:bg-[#131d18] opacity-75"
                )}
                style={{
                  borderColor: isUnread ? colors.primary + '25' : colors.primary + '10',
                }}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={cn("text-xs leading-snug truncate", isUnread ? "font-black" : "font-semibold")} style={{ color: colors.text }}>
                      {formatted.title}
                    </h4>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
                    )}
                  </div>

                  <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 font-medium">
                    {formatted.body}
                  </p>

                  <p className="text-[10px] text-gray-400 font-bold pt-0.5">
                    {formatDateTime(notification.created_at)}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSingle(notification.id);
                  }}
                  disabled={deletingId === notification.id}
                  className="p-1.5 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors shrink-0 disabled:opacity-50"
                  title="Supprimer définitivement"
                >
                  {deletingId === notification.id ? (
                    <Loader2 size={14} className="animate-spin text-red-500" />
                  ) : (
                    <X size={14} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-[#17231d] rounded-2xl border p-6" style={{ borderColor: colors.primary + '15' }}>
          <Bell size={24} className="mx-auto mb-2 text-gray-300" />
          <p className="text-xs font-bold text-gray-500">Aucune notification pour le moment.</p>
        </div>
      )}

      {/* FOOTER */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between text-[11px] pt-2 px-1 text-gray-400">
          <span>{notifications.length} alerte(s)</span>
          <button
            onClick={handleClearAll}
            disabled={isClearingAll}
            className="text-red-400 hover:text-red-500 font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            {isClearingAll ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
            Tout effacer
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
