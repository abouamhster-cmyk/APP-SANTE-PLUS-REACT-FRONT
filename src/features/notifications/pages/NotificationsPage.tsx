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
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDateTime, cn } from '@/utils/helpers';
import { Illustration } from '@/components/ui/Illustration';
import toast from 'react-hot-toast';

// ============================================================
// DÉCORATEUR D'ICÔNE THÉMATIQUE COLORÉE (BRANDING & VISUEL)
// ============================================================
const getNotificationIcon = (type: string, defaultColor: string) => {
  switch (type) {
    case 'visite':
      return (
        <div className="p-2.5 rounded-xl shrink-0 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
          <Calendar size={18} />
        </div>
      );
    case 'commande':
      return (
        <div className="p-2.5 rounded-xl shrink-0 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
          <ShoppingBag size={18} />
        </div>
      );
    case 'paiement':
      return (
        <div className="p-2.5 rounded-xl shrink-0 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
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
          style={{ backgroundColor: `${defaultColor}15`, color: defaultColor }}
        >
          <Bell size={18} />
        </div>
      );
  }
};

const NotificationsPage = () => {
  const navigate = useNavigate();
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
  const [deletedIds, setDeletedIds] = useState<string[]>([]); // ✅ GESTION PHYSIQUE DES SUPPRESSIONS DE L'UI

  // ÉTATS DE PULL-TO-REFRESH MOBILE
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startTouchY = useRef(0);

  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

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

  // ✅ SUPPRESSION PHYSIQUE INSTANTANÉE RECOMMANDÉE
  const handleDelete = async (id: string) => {
    setDeletedIds(prev => [...prev, id]);
    try {
      await markAsRead(id); // Marquer comme lu sur le backend pour désengorger le store
    } catch (e) {
      console.error('Erreur synchronisation suppression:', e);
    }
    toast.success('Alerte retirée');
  };

  // ✅ FILTRAGE DYNAMIQUE DES SUPPRESSIONS POUR UN AFFICHAGE ULTRA-PROPRE
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

  // ✅ EFFET RETOUR SONORE NOTIFICATION
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
          🆕 INDICATEUR DE PULL-TO-REFRESH MOBILE (EXPANSION ÉLASTIQUE)
          ============================================================ */}
      <div 
        className="w-full flex justify-center overflow-hidden transition-all duration-300 ease-out"
        style={{ 
          height: pullY > 0 ? `${pullY}px` : '0px',
          opacity: pullY > 0 ? Math.min(pullY / 45, 1) : 0
        }}
      >
        <div className="flex items-center gap-1.5 py-1 text-emerald-600 dark:text-emerald-400">
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
          HEADER ÉDITORIAL DANS UN CADRE GLASSMORPHIC UNIQUE ET CENTRÉ
          ============================================================ */}
      <section className="relative overflow-hidden bg-white/60 dark:bg-[#17231d]/60 border border-gray-100/80 dark:border-gray-800/40 rounded-2xl p-6 text-center shadow-sm backdrop-blur-md flex flex-col items-center gap-4">
        
        {/* Titres */}
        <div className="space-y-1.5 relative z-10">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-gray-800 dark:text-gray-100">
            Centre de notifications
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm mx-auto leading-relaxed">
            Suivez les rapports d’interventions, validations de plannings et paiements de vos accompagnements.
          </p>
        </div>

        {/* Triggers & Options (Centré en bas, sans chevauchement) */}
        <div className="flex items-center gap-2 relative z-10">
          
          <button
            onClick={handleToggleNotifications}
            className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center transition-all shadow-sm",
              notificationsEnabled 
                ? "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/40" 
                : "bg-gray-50 border-gray-200 text-gray-400 dark:bg-[#1d2d25] dark:border-gray-800"
            )}
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

          {/* Fallback Refresh */}
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
            className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-[#24362d] flex items-center justify-center text-gray-400 hover:text-gray-600 transition shadow-inner"
            title="Rafraîchir"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </section>

      {/* ============================================================
          LISTE DES ALERTES AÉRÉES (ESPACEMENT COHÉRENT ET PROPRE)
          ============================================================ */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#17231d] rounded-2xl border border-gray-100 dark:border-[#2c3f35]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <p className="text-xs text-gray-400 font-bold mt-3">Chargement de votre flux d'actualités...</p>
        </div>
      ) : visibleNotifications.length > 0 ? (
        <div className="space-y-4"> {/* ✅ ESPACEMENT CONFORTABLE DES ALERTES SANS ENTASSEMENT */}
          {visibleNotifications.map((notification) => {
            const isUnread = !notification.is_read;

            return (
              <div
                key={notification.id}
                onClick={() => isUnread && markAsRead(notification.id)}
                className={cn(
                  "group relative rounded-2xl p-5 border flex items-start gap-4 transition-all duration-300 cursor-pointer shadow-sm",
                  isUnread
                    ? "bg-white dark:bg-[#17231d] border-gray-100 dark:border-gray-800"
                    : "bg-white/40 dark:bg-[#17231d]/30 border-gray-100/50 dark:border-gray-850/60 opacity-80"
                )}
              >
                {/* PILULE INDICATRICE DU STATUT DE LECTURE CHIC (STYLE IOS) */}
                {isUnread && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: colors.primary }} />
                )}

                {/* ICÔNE DU TYPE DE SERVICE */}
                <div className="pl-1">
                  {getNotificationIcon(notification.type, colors.primary)}
                </div>

                {/* CONTENU TEXTUEL LARGE */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={cn(
                      "text-xs sm:text-sm text-gray-800 dark:text-white leading-snug",
                      isUnread ? "font-extrabold" : "font-semibold"
                    )}>
                      {notification.title}
                    </h4>

                    {isUnread && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500 text-white shrink-0">
                        Nouveau
                      </span>
                    )}

                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 text-gray-400 dark:text-gray-300">
                      {notification.type || 'Système'}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                    {notification.body}
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <p className="text-[10px] text-gray-400 font-bold">
                      {formatDateTime(notification.created_at)}
                    </p>
                    {!isUnread && (
                      <span className="text-[10px] text-emerald-500 font-extrabold">
                        ✓ Lu
                      </span>
                    )}
                  </div>
                </div>

                {/* MODULE D'ACTIONS DIRECTS & PURGES (SANS EFFETS FLÉCHIS TRANSPARENTS BIZARRES) */}
                <div className="flex items-center gap-1 shrink-0 self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                    className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 transition-all border dark:border-gray-700"
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
        /* ÉCRAN VIDE CHIC */
        <section className="bg-white/40 dark:bg-[#17231d]/40 rounded-2xl py-16 px-6 text-center border border-gray-100 dark:border-gray-800/40 max-w-sm mx-auto flex flex-col items-center justify-center gap-4 backdrop-blur-sm shadow-sm">
          <Illustration 
            type="message" 
            size="md" 
            className="mx-auto opacity-35"
            color={colors.primary}
          />
          
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-gray-800 dark:text-gray-100">
              {getEmptyTitle()}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed max-w-xs">
              {getEmptyMessage()}
            </p>
          </div>
        </section>
      )}

      {/* STATISTIQUES DU FOOTER & ACTIONS GLOBALES */}
      {visibleNotifications.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-800" style={{ borderColor: colors.border }}>
          <span className="font-semibold">{visibleNotifications.length} alerte{visibleNotifications.length > 1 ? 's' : ''} enregistrée{visibleNotifications.length > 1 ? 's' : ''}</span>
          <button
            onClick={() => {
              if (window.confirm('Voulez-vous vider définitivement tout votre historique d\'alertes ?')) {
                clearNotifications();
                setDeletedIds([]); // Vider les index locaux
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
