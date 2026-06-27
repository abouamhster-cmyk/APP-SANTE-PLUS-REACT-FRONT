// 📁 src/features/help/pages/HistoryPage.tsx
 
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, XCircle, Clock, Eye, Filter, Search, MapPin } from 'lucide-react';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime } from '@/utils/helpers';
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

  const myMissions = visits.filter(v =>
    v.aidant_id === aidantId &&
    (v.status === 'terminee' || v.status === 'validee' || v.status === 'annulee')
  );

  const myDeliveries = orders.filter(o =>
    o.aidant_id === aidantId &&
    (o.status === 'livree' || o.status === 'validee' || o.status === 'annulee')
  );

  const filterBySearch = (items: any[]) => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      item.patient?.first_name?.toLowerCase().includes(term) ||
      item.patient?.last_name?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.address?.toLowerCase().includes(term)
    );
  };

  const filterByStatus = (items: any[]) => {
    if (filterStatus === 'all') return items;
    return items.filter(item => item.status === filterStatus);
  };

  let historyItems: any[] = [];
  if (activeType === 'all') {
    historyItems = [
      ...myMissions.map(m => ({ ...m, type: 'mission' })),
      ...myDeliveries.map(d => ({ ...d, type: 'delivery' }))
    ];
  } else if (activeType === 'missions') {
    historyItems = myMissions.map(m => ({ ...m, type: 'mission' }));
  } else {
    historyItems = myDeliveries.map(d => ({ ...d, type: 'delivery' }));
  }

  const filteredItems = filterBySearch(filterByStatus(historyItems))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      terminee: '#4CAF50',
      validee: '#9C27B0',
      annulee: '#F44336',
      livree: '#4CAF50',
      en_cours: '#FF9800',
      creee: '#9E9E9E',
    };
    return colors[status] || '#9E9E9E';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      terminee: '✅ Terminée',
      validee: '✅ Validée',
      annulee: '❌ Annulée',
      livree: '📦 Livrée',
      en_cours: '🔄 En cours',
      creee: '📝 Créée',
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

  // ✅ Options de filtre
  const filterOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'terminee', label: '✅ Terminée' },
    { value: 'validee', label: '✅ Validée' },
    { value: 'livree', label: '📦 Livrée' },
    { value: 'annulee', label: '❌ Annulée' },
    { value: 'en_cours', label: '🔄 En cours' },
  ];

  return (
    <div className="space-y-4 pb-24 sm:pb-10">
      {/* HEADER */}
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
              <Calendar size={12} />
              Historique
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              {getPageTitle()}
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {stats.total} élément(s) dans votre historique
            </p>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-3 gap-2">
        <CompactStat label="Total" value={stats.total} color={colors.primary} icon={<Calendar size={14} />} />
        <CompactStat label="Missions" value={stats.missions} color="#4CAF50" icon={<CheckCircle size={14} />} />
        <CompactStat label="Livraisons" value={stats.deliveries} color="#FF5722" icon={<Clock size={14} />} />
      </section>

      {/* TABS + FILTRES */}
      <section className="bg-white rounded-2xl p-2 shadow-sm border border-black/5 space-y-2">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveType('all')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
              activeType === 'all' ? 'text-white' : 'text-gray-600'
            }`}
            style={{ background: activeType === 'all' ? colors.primary : 'transparent' }}
          >
            Tous ({stats.total})
          </button>
          <button
            onClick={() => setActiveType('missions')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
              activeType === 'missions' ? 'text-white' : 'text-gray-600'
            }`}
            style={{ background: activeType === 'missions' ? colors.primary : 'transparent' }}
          >
            📋 Missions ({stats.missions})
          </button>
          <button
            onClick={() => setActiveType('deliveries')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
              activeType === 'deliveries' ? 'text-white' : 'text-gray-600'
            }`}
            style={{ background: activeType === 'deliveries' ? colors.primary : 'transparent' }}
          >
            🚚 Livraisons ({stats.deliveries})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border bg-gray-50 outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
            />
          </div>
          <div className="relative min-w-[100px]">
            <Filter size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border bg-gray-50 outline-none appearance-none"
              style={{ borderColor: colors.border, color: colors.text }}
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

      {/* LISTE */}
      {filteredItems.length > 0 ? (
        <section className="space-y-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl p-3 shadow-sm border-l-4 cursor-pointer hover:shadow-md transition"
              style={{ borderLeftColor: getStatusColor(item.status) }}
              onClick={() => {
                if (item.type === 'mission') {
                  navigate(`/app/visits/${item.id}`);
                } else {
                  navigate(`/app/orders/${item.id}`);
                }
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: colors.text }}>
                    {item.type === 'mission' ? '📋' : '📦'} {item.patient?.first_name || 'Client'} {item.patient?.last_name || ''}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs flex-wrap" style={{ color: colors.text + '60' }}>
                    <span className="flex items-center gap-0.5">
                      <Calendar size={11} /> {formatDate(item.created_at)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Clock size={11} /> {formatTime(item.created_at)}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[8px] font-medium"
                      style={{
                        background: getStatusColor(item.status) + '20',
                        color: getStatusColor(item.status),
                      }}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                  style={{ color: colors.primary }}
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="bg-white rounded-2xl p-6 text-center shadow-sm">
          <Calendar size={32} className="mx-auto mb-3 opacity-30" />
          <h3 className="text-sm font-bold" style={{ color: colors.text }}>
            {searchTerm ? 'Aucun résultat' : 'Aucun historique'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {searchTerm
              ? 'Aucun élément ne correspond à votre recherche.'
              : 'Vos missions et livraisons terminées apparaîtront ici.'}
          </p>
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
    <div className="bg-white rounded-xl p-2.5 shadow-sm border border-black/5">
      <div className="flex items-center justify-between gap-1">
        <div>
          <p className="text-[9px] font-medium text-gray-400">{label}</p>
          <p className="text-base font-bold mt-0.5" style={{ color }}>{value}</p>
        </div>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + '15', color }}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
