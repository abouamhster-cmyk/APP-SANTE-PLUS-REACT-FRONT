// 📁 src/features/help/pages/HistoryPage.tsx
 
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, XCircle, Clock, Eye, Filter, Search, RefreshCw } from 'lucide-react';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime, formatCurrency, cn } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type HistoryType = 'all' | 'missions' | 'deliveries';

const HistoryPage = () => {
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();
  const { visits, fetchVisits, isLoading: visitsLoading } = useVisitStore();
  const { orders, fetchOrders, isLoading: ordersLoading } = useOrderStore();

  const { isAidant } = useTerminology();

  const [aidantId, setAidantId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<HistoryType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ÉTATS DE PULL-TO-REFRESH MOBILE
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startTouchY = useRef(0);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    const getAidantId = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('aidants')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!error && data) setAidantId(data.id);
    };
    getAidantId();
  }, [user]);

  useEffect(() => {
    fetchVisits();
    fetchOrders();
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
        Promise.all([fetchVisits(), fetchOrders()]),
        {
          loading: 'Actualisation de l\'historique...',
          success: 'Historique synchronisé !',
          error: 'Échec de synchronisation.',
        }
      );
    }
    setPullY(0);
  };

  const myMissions = useMemo(() => {
    return visits.filter(v =>
      v.aidant_id === aidantId &&
      (v.status === 'terminee' || v.status === 'validee' || v.status === 'annulee')
    );
  }, [visits, aidantId]);

  const myDeliveries = useMemo(() => {
    return orders.filter(o =>
      o.aidant_id === aidantId &&
      (o.status === 'livree' || o.status === 'validee' || o.status === 'annulee')
    );
  }, [orders, aidantId]);

  // ✅ RÉSOLUTION DYNAMIQUE ET SÉCURISÉE DE L'IDENTITÉ POUR TOUS LES CAS DE BRIDAGE D'ACCOMPAGNEMENT
  const getItemDisplayName = useCallback((item: any) => {
    if (item.patient) {
      return `${item.patient.first_name} ${item.patient.last_name}`;
    }
    if (item.target_name) {
      return item.target_name;
    }
    if (item.family?.full_name) {
      return item.family.full_name;
    }
    return 'Bénéficiaire';
  }, []);

  const filterBySearch = useCallback((items: any[]) => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => {
      const name = getItemDisplayName(item).toLowerCase();
      return name.includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.address?.toLowerCase().includes(term);
    });
  }, [searchTerm, getItemDisplayName]);

  const filterByStatus = useCallback((items: any[]) => {
    if (filterStatus === 'all') return items;
    return items.filter(item => item.status === filterStatus);
  }, [filterStatus]);

  const historyItems = useMemo(() => {
    if (activeType === 'missions') {
      return myMissions.map(m => ({ ...m, type: 'mission' as const }));
    }
    if (activeType === 'deliveries') {
      return myDeliveries.map(d => ({ ...d, type: 'delivery' as const }));
    }
    return [
      ...myMissions.map(m => ({ ...m, type: 'mission' as const })),
      ...myDeliveries.map(d => ({ ...d, type: 'delivery' as const }))
    ];
  }, [activeType, myMissions, myDeliveries]);

  const filteredItems = useMemo(() => {
    return filterBySearch(filterByStatus(historyItems))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [historyItems, filterBySearch, filterByStatus]);

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      terminee: '#8B5CF6',
      validee: '#10B981',
      annulee: '#EF4444',
      livree: '#10B981',
      en_cours: '#3B82F6',
      creee: '#6B7280',
    };
    return statusColors[status] || '#9E9E9E';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      terminee: 'Terminée',
      validee: 'Validée',
      annulee: 'Annulée',
      livree: 'Livrée',
      en_cours: 'En cours',
      creee: 'Créée',
    };
    return labels[status] || status;
  };

  const getPageTitle = () => 'Mon historique d\'interventions';

  const isLoading = visitsLoading || ordersLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-gray-100 dark:bg-gray-850 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 bg-gray-100 dark:bg-gray-850 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2].map((item) => (
            <div key={item} className="h-20 bg-gray-100 dark:bg-gray-850 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = {
    total: myMissions.length + myDeliveries.length,
    missions: myMissions.length,
    deliveries: myDeliveries.length,
  };

  const filterOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'terminee', label: '✅ Terminées' },
    { value: 'validee', label: '✔️ Validées' },
    { value: 'annulee', label: '❌ Annulées' },
  ];

  return (
    <div 
      className="space-y-6 pb-6 animate-fadeIn"
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
      <section className="relative overflow-hidden bg-white/60 dark:bg-[#17231d]/60 border border-gray-100/80 dark:border-gray-800/40 rounded-2xl p-6 text-center shadow-sm backdrop-blur-md">
        <div className="space-y-1.5 relative z-10">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-gray-800 dark:text-gray-100">
            {getPageTitle()}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm mx-auto leading-relaxed">
            Consultez l'historique archivé de vos accompagnements d'aide et livraisons validés par l'administration.
          </p>
        </div>

        {/* Bouton de rafraîchissement manuel en haut à droite du cadre */}
        <button
          onClick={async () => {
            toast.promise(
              Promise.all([fetchVisits(), fetchOrders()]),
              {
                loading: 'Mise à jour...',
                success: 'Historique actualisé !',
                error: 'Échec de la mise à jour',
              }
            );
          }}
          disabled={isLoading}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-gray-50 dark:bg-[#24362d] flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
          title="Actualiser"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </section>

      {/* ============================================================
          WIDGET BENTO D'ACTIVITÉ (SANS COMPACT STATS SACCADÉS ET CHEVAUCHÉS)
          ============================================================ */}
      <section className="grid grid-cols-3 gap-2.5 w-full">
        <CompactStat label="Total" value={stats.total} color={colors.primary} icon={<Calendar size={14} />} />
        <CompactStat label="Missions" value={stats.missions} color="#10B981" icon={<CheckCircle size={14} />} />
        <CompactStat label="Courses" value={stats.deliveries} color="#FF9800" icon={<Clock size={14} />} />
      </section>

      {/* TABS + RECHERCHES FILTRES */}
      <section className="bg-white dark:bg-[#17231d] rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800/40 space-y-3">
        
        {/* Sélecteur de segments de premier niveau */}
        <div className="p-1 bg-gray-150/70 dark:bg-[#1c2a21]/50 rounded-xl border border-gray-200/10 dark:border-[#2c3f35]/20 gap-1 flex overflow-x-auto scrollbar-none">
          {[
            { key: 'all', label: `Tout (${stats.total})` },
            { key: 'missions', label: `📋 Missions (${stats.missions})` },
            { key: 'deliveries', label: `🚚 Livraisons (${stats.deliveries})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveType(tab.key as HistoryType)}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap select-none",
                activeType === tab.key
                  ? "bg-white dark:bg-[#17231d] text-gray-900 dark:text-white shadow-sm font-extrabold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              )}
              style={activeType === tab.key ? { color: colors.primary } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Moteur de recherche et filtre harmonisés à hauteur H-11 */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par bénéficiaire ou adresse..."
              className="w-full h-11 pl-10 pr-4 text-xs rounded-xl border outline-none bg-gray-50/50 dark:bg-[#1d2d25]/50 border-gray-100 dark:border-gray-800/60 font-medium"
              style={{ color: colors.text }}
            />
          </div>

          <div className="relative sm:w-48 shrink-0">
            <Filter size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-11 pl-9 pr-8 text-xs rounded-xl border outline-none bg-gray-50/50 dark:bg-[#1d2d25] border-gray-100 dark:border-gray-800/60 font-semibold cursor-pointer appearance-none"
              style={{ color: colors.text }}
            >
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* LISTE D'HISTORIQUE DE HAUTE PRÉCISION */}
      {filteredItems.length > 0 ? (
        <section className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#17231d] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-[#2c3f35]/50 cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              onClick={() => {
                if (item.type === 'mission') {
                  navigate(`/app/visits/${item.id}`);
                } else {
                  navigate(`/app/orders/${item.id}`);
                }
              }}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Liseré vertical dynamique épuré */}
                <div 
                  className="w-1 h-10 rounded-full shrink-0" 
                  style={{ backgroundColor: getStatusColor(item.status) }} 
                />

                <div className="min-w-0 space-y-0.5">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    {item.type === 'mission' ? '📋 Mission d\'accompagnement' : '📦 Livraison de commande'}
                  </span>
                  <p className="font-extrabold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {getItemDisplayName(item)}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] flex-wrap text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-0.5">
                      <Calendar size={11} className="text-gray-400" /> {formatDate(item.created_at)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Clock size={11} className="text-gray-400" /> {formatTime(item.created_at)}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        background: getStatusColor(item.status) + '12',
                        color: getStatusColor(item.status),
                      }}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.type === 'mission') {
                      navigate(`/app/visits/${item.id}`);
                    } else {
                      navigate(`/app/orders/${item.id}`);
                    }
                  }}
                  className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/20 text-gray-400 hover:text-gray-800 flex items-center justify-center transition-all"
                >
                  <Eye size={13} />
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : (
        /* Écran vide chic & moderne */
        <section className="bg-white/40 dark:bg-[#17231d]/40 rounded-2xl py-16 px-6 text-center border border-gray-100 dark:border-gray-800/40 max-w-sm mx-auto flex flex-col items-center justify-center gap-4 backdrop-blur-sm shadow-sm">
          <Calendar size={32} className="text-gray-400 dark:text-gray-500 opacity-60 animate-pulse" />
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-gray-800 dark:text-gray-100">
              {searchTerm ? 'Aucun résultat correspondant' : 'Historique vierge'}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed">
              {searchTerm
                ? 'Essayez d\'ajuster vos filtres de recherche ou de réinitialiser les termes.'
                : 'Toutes vos interventions d’aide et vos livraisons d’urgence finalisées apparaîtront ici.'}
            </p>
          </div>
        </section>
      )}
    </div>
  );
};

// =============================================
// COMPACT STAT (REFAÇONNÉ POUR SUPPRIMER TOUT CHEVAUCHEMENT)
// =============================================

interface CompactStatProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

const CompactStat = ({ icon, label, value, color }: CompactStatProps) => {
  return (
    <div className="bg-white dark:bg-[#17231d] p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/60 shadow-sm flex flex-col justify-between h-28 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 truncate mr-1">
          {label}
        </span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-inner" style={{ background: color + '12', color }}>
          {icon}
        </div>
      </div>
      <p className="text-sm sm:text-base font-black leading-none" style={{ color }}>
        {value}
      </p>
    </div>
  );
};

export default HistoryPage;
