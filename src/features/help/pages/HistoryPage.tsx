// 📁 src/features/help/pages/HistoryPage.tsx
// ✅ PAGE HISTORIQUE COMPLET : ALIGNEMENT DES IDENTITÉS BÉNÉFICIAIRES DYNAMIQUES ET MODERNISATION VISUELLE

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, XCircle, Clock, Eye, Filter, Search } from 'lucide-react';
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

  const getPageTitle = () => '📋 Mon historique';

  const isLoading = visitsLoading || ordersLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-16 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-12 bg-white rounded-xl animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-16 bg-white rounded-xl animate-pulse" />
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
    { value: 'all', label: 'Tous' },
    { value: 'terminee', label: '✅ Terminée / Livrée' },
    { value: 'validee', label: '💜 Validée' },
    { value: 'annulee', label: '❌ Annulée' },
  ];

  return (
    <div className="space-y-4 pb-24 sm:pb-10 animate-fadeIn">
      {/* HEADER */}
      <section className="bg-white dark:bg-[#17231d] rounded-2xl p-5 shadow-sm border border-black/5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold mb-2"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <Calendar size={12} />
              Historique
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              {getPageTitle()}
            </h1>

            <p className="text-xs mt-0.5 text-gray-400">
              {stats.total} élément(s) archivé(s) dans vos dossiers
            </p>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-3 gap-2.5">
        <CompactStat label="Total" value={stats.total} color={colors.primary} icon={<Calendar size={14} />} />
        <CompactStat label="Missions" value={stats.missions} color="#10B981" icon={<CheckCircle size={14} />} />
        <CompactStat label="Livraisons" value={stats.deliveries} color="#FF9800" icon={<Clock size={14} />} />
      </section>

      {/* TABS + FILTRES */}
      <section className="bg-white dark:bg-[#17231d] rounded-2xl p-3 shadow-sm border border-black/5 space-y-3">
        <div className="p-0.5 bg-gray-100/80 dark:bg-[#1c2a21]/50 rounded-xl border border-gray-200/10 dark:border-[#2c3f35]/20 gap-1 flex">
          <button
            onClick={() => setActiveType('all')}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeType === 'all'
                ? "bg-white dark:bg-[#17231d] text-gray-900 dark:text-white shadow-sm font-extrabold"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
            )}
            style={activeType === 'all' ? { color: colors.primary } : undefined}
          >
            Tous ({stats.total})
          </button>
          <button
            onClick={() => setActiveType('missions')}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeType === 'missions'
                ? "bg-white dark:bg-[#17231d] text-gray-900 dark:text-white shadow-sm font-extrabold"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
            )}
            style={activeType === 'missions' ? { color: colors.primary } : undefined}
          >
            📋 Missions ({stats.missions})
          </button>
          <button
            onClick={() => setActiveType('deliveries')}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeType === 'deliveries'
                ? "bg-white dark:bg-[#17231d] text-gray-900 dark:text-white shadow-sm font-extrabold"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
            )}
            style={activeType === 'deliveries' ? { color: colors.primary } : undefined}
          >
            🚚 Livraisons ({stats.deliveries})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par bénéficiaire ou adresse..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-gray-50 dark:bg-[#1d2d25] outline-none border-transparent focus:border-gray-200"
              style={{ color: colors.text }}
            />
          </div>
          <div className="relative min-w-[120px]">
            <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-8 pr-2 py-2 text-xs rounded-xl border bg-gray-50 dark:bg-[#1d2d25] outline-none appearance-none border-transparent"
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

      {/* LISTE D'HISTORIQUE ULTRA-PROPRE */}
      {filteredItems.length > 0 ? (
        <section className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#17231d] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800/60 cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              onClick={() => {
                if (item.type === 'mission') {
                  navigate(`/app/visits/${item.id}`);
                } else {
                  navigate(`/app/orders/${item.id}`);
                }
              }}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Liseré vertical dynamique */}
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
                  className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-850 text-gray-400 hover:text-gray-750 dark:hover:text-gray-200 flex items-center justify-center transition-all"
                >
                  <Eye size={13} />
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="bg-white/40 dark:bg-[#17231d]/40 rounded-2xl py-16 px-6 text-center border border-gray-100 dark:border-gray-800/40 max-w-sm mx-auto flex flex-col items-center justify-center gap-4 backdrop-blur-sm shadow-sm">
          <Calendar size={32} className="text-gray-400 dark:text-gray-500 opacity-60" />
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
// COMPACT STAT
// =============================================

interface CompactStatProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

const CompactStat = ({ icon, label, value, color }: CompactStatProps) => {
  return (
    <div className="bg-white dark:bg-[#17231d] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800/60 flex items-center justify-between gap-3 h-20">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
        <p className="text-base font-black text-gray-800 dark:text-gray-100 mt-1" style={{ color }}>{value}</p>
      </div>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner" style={{ background: color + '12', color }}>
        {icon}
      </div>
    </div>
  );
};

export default HistoryPage;
