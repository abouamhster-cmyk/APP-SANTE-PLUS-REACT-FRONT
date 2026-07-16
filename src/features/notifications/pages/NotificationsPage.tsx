// 📁 src/features/notifications/pages/NotificationsPage.tsx

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  X, 
  RefreshCw, 
  BellRing, 
  Calendar, 
  ShoppingBag, 
  CreditCard, 
  AlertCircle, 
  Loader2,
  Trash2
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDateTime, cn } from '@/utils/helpers';
import { Illustration } from '@/components/ui/Illustration';
import toast from 'react-hot-toast';

// ============================================================
// DÉCORATEUR D'ICÔNE THÉMATIQUE COLORÉE (BRANDING & VISUEL)
// ============================================================
const getNotificationIcon = (type: string, colors: any) => {
  switch (type) {
    case 'visite':
      return (
        <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: colors.primary + '15', color: colors.primary }}>
          <Calendar size={18} />
        </div>
      );
    case 'commande':
      return (
        <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: colors.gold + '20', color: colors.gold }}>
          <ShoppingBag size={18} />
        </div>
      );
    case 'paiement':
      return (
        <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: colors.primary + '12', color: colors.primary }}>
          <CreditCard size={18} />
        </div>
      );
    case 'system':
    case 'alert':
      return (
        <div className="p-2.5 rounded-xl shrink-0 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 animate-pulse">
          <AlertCircle size={18} />
        </div>
      );
    default:
      return (
        <div 
          className="p-2.5 rounded-xl shrink-0" 
          style={{ backgroundColor: colors.primary + '15', color: colors.primary }}
        >
          <Bell size={18} />
        </div>
      );
  }
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
  
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
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  // ÉTATS DE PULL-TO-REFRESH MOBILE
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startTouchY = useRef(0);

  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

  useEffect(() => {
    fetchNotifications(true);
  }, []);

  // GESTION DU RAFAICHISSEMENT EN COULISSES (TACTILE & GLISSANT)
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
      toast.promise(
        fetchNotifications(true),
        {
          loading: 'Actualisation des alertes...',
          success: 'Flux d\'actualités synchronisé !',
          error: 'Échec de la mise à jour.',
        }
      );
    }
    setPullY(0);
  };

  const handleToggleNotifications = () => {
    toggleNotifications();
    toast.success(
      notificationsEnabled ? 'Alertes de l\'appareil désactivées' : 'Alertes de l\'appareil activées'
    );
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) {
      toast('Aucune alerte non lue', { icon: 'ℹ️' });
      return;
    }
    await markAllRead();
    toast.success('Toutes les alertes ont été marquées comme lues');
  };

  const handleDelete = async (id: string) => {
    setDeletedIds(prev => [...prev, id]);
    try {
      await markAsRead(id);
    } catch (e) {
      console.error('Erreur synchronisation suppression:', e);
    }
    toast.success('Alerte retirée');
  };

  const visibleNotifications = useMemo(() => {
    return notifications.filter(n => !deletedIds.includes(n.id));
  }, [notifications, deletedIds]);

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
    return "Aucune alerte";
  };

  useEffect(() => {
    if (notifications.length > 0 && unreadCount > 0) {
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.25;
        audio.play().catch(() => {});
      } catch (e) {
        // Ignorer le blocage autoplay navigateur
      }
    }
  }, [notifications.length, unreadCount]);

  return (
    <div 
      className="space-y-6 max-w-3xl mx-auto pb-6 animate-fadeIn"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      
      {/* ============================================================
          INDICATEUR DE PULL-TO-REFRESH MOBILE
          ============================================================ */}
      <div 
        className="w-full flex justify-center overflow-hidden transition-all duration-300 ease-out"
        style={{ 
          height: pullY > 0 ? `${pullY}px` : '0px',
          opacity: pullY > 0 ? Math.min(pullY / 45, 1) : 0
        }}
      >
        <div className="flex items-center gap-1.5 py-1" style={{ color: colors.primary }}>
          <RefreshCw 
            size={13} 
            className={cn("transition-all", pullY >= 50 ? "rotate-180 animate-spin" : "")} 
            style={{ transform: pullY < 50 ? `rotate(${pullY * 3.6}deg)` : undefined }}
          />
          <span className="text-[10px] font-black uppercase tracking-wider">
            {pullY >= 50 ? 'Relâcher pour actualiser' : 'Tirer pour rafraîchir'}
          </span>
        </div>
      </div>

      {/* ============================================================
          HEADER ÉDITORIAL
          ============================================================ */}
      <section className="relative overflow-hidden bg-white/60 border rounded-2xl p-6 text-center shadow-sm backdrop-blur-md flex flex-col items-center gap-4" style={{ borderColor: colors.primary + '15' }}>
        
        <div className="space-y-1.5 relative z-10">
          <h1 className="text-base sm:text-lg font-black tracking-tight" style={{ color: colors.text }}>
            Centre de notifications
          </h1>
          <p className="text-xs max-w-sm mx-auto leading-relaxed" style={{ color: colors.textLight }}>
            Suivez les rapports d'interventions, validations de plannings et paiements de vos accompagnements.
          </p>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          
          <button
            onClick={handleToggleNotifications}
            className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center transition-all shadow-sm",
              notificationsEnabled 
                ? "text-emerald-600" 
                : "bg-gray-50 border-gray-200 text-gray-400"
            )}
            style={{
              backgroundColor: notificationsEnabled ? colors.primary + '15' : 'transparent',
              borderColor: notificationsEnabled ? colors.primary + '30' : colors.primary + '15',
              color: notificationsEnabled ? colors.primary : colors.textLight,
            }}
            title={notificationsEnabled ? 'Alertes actives' : 'Alertes muettes'}
          >
            <Bell size={15} className={cn(notificationsEnabled ? "animate-swing origin-top" : "")} />
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 h-9 rounded-xl text-xs font-black text-white transition hover:opacity-90 shadow-md flex items-center justify-center gap-1"
              style={{ background: colors.primary }}
            >
              <Check size={13} strokeWidth={3} />
              <span>Tout marquer comme lu</span>
            </button>
          )}

          <button
            onClick={async () => {
              toast.promise(
                fetchNotifications(true),
                {
                  loading: 'Mise à jour...',
                  success: 'Alertes synchronisées !',
                  error: 'Échec de la mise à jour',
                }
              );
            }}
            disabled={isLoading}
            className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition shadow-inner"
            title="Rafraîchir"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </section>

      {/* ============================================================
          LISTE DES ALERTES
          ============================================================ */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border" style={{ borderColor: colors.primary + '15' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
          <p className="text-xs font-bold mt-3" style={{ color: colors.textLight }}>Chargement de votre flux d'actualités...</p>
        </div>
      ) : visibleNotifications.length > 0 ? (
        <div className="space-y-4">
          {visibleNotifications.map((notification) => {
            const isUnread = !notification.is_read;

            return (
              <div
                key={notification.id}
                onClick={() => isUnread && markAsRead(notification.id)}
                className={cn(
                  "group relative rounded-2xl p-5 border flex items-start gap-4 transition-all duration-300 cursor-pointer shadow-sm",
                  isUnread
                    ? "bg-white border"
                    : "bg-white/40 border opacity-80"
                )}
                style={{
                  borderColor: isUnread ? colors.primary + '20' : colors.primary + '10',
                }}
              >
                {isUnread && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: colors.primary }} />
                )}

                <div className="pl-1">
                  {getNotificationIcon(notification.type, colors)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={cn(
                      "text-xs sm:text-sm leading-snug",
                      isUnread ? "font-extrabold" : "font-semibold"
                    )} style={{ color: colors.text }}>
                      {notification.title}
                    </h4>

                    {isUnread && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500 text-white shrink-0">
                        Nouveau
                      </span>
                    )}

                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-50 border" style={{ borderColor: colors.primary + '15', color: colors.textLight }}>
                      {notification.type || 'Système'}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm leading-relaxed font-medium" style={{ color: colors.textLight }}>
                    {notification.body}
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <p className="text-[10px] font-bold" style={{ color: colors.textLight }}>
                      {formatDateTime(notification.created_at)}
                    </p>
                    {!isUnread && (
                      <span className="text-[10px] font-extrabold" style={{ color: colors.primary }}>
                        ✓ Lu
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                    className="p-2 rounded-xl bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all border"
                    style={{ borderColor: colors.primary + '15' }}
                    title="Supprimer définitivement"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <section className="bg-white/40 rounded-2xl py-16 px-6 text-center border max-w-sm mx-auto flex flex-col items-center justify-center gap-4 backdrop-blur-sm shadow-sm" style={{ borderColor: colors.primary + '15' }}>
          <Illustration 
            type="message" 
            size="md" 
            className="mx-auto opacity-35"
            color={colors.primary}
          />
          
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm" style={{ color: colors.text }}>
              {getEmptyTitle()}
            </h3>
            <p className="text-xs max-w-xs leading-relaxed" style={{ color: colors.textLight }}>
              {getEmptyMessage()}
            </p>
          </div>
        </section>
      )}

      {/* STATISTIQUES DU FOOTER & ACTIONS GLOBALES */}
      {visibleNotifications.length > 0 && (
        <div className="flex items-center justify-between text-[11px] pt-4 border-t" style={{ borderColor: colors.primary + '15', color: colors.textLight }}>
          <span className="font-semibold">{visibleNotifications.length} alerte{visibleNotifications.length > 1 ? 's' : ''} enregistrée{visibleNotifications.length > 1 ? 's' : ''}</span>
          <button
            onClick={() => {
              if (window.confirm('Voulez-vous vider définitivement tout votre historique d\'alertes ?')) {
                clearNotifications();
                setDeletedIds([]);
                toast.success('Historique de notifications vidé');
              }
            }}
            className="text-red-400 hover:text-red-500 font-extrabold flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-all"
          >
            <Trash2 size={12} />
            Tout effacer
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
