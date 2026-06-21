// 📁 src/features/help/pages/HistoryPage.tsx
// 📌 Historique des missions et livraisons pour les aidants

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, XCircle, Clock, Eye, Filter, Search, ChevronDown, MapPin } from 'lucide-react';
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

  // ✅ Jargon dynamique selon le rôle
  const {
    singular,
    getCategoryLabel,
    isAidant,
  } = useTerminology();

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

  // ✅ Filtrer les missions et commandes de l'aidant (avec statuts simplifiés)
  const myMissions = visits.filter(v => 
    v.aidant_id === aidantId && 
    (v.status === 'terminee' || v.status === 'validee' || v.status === 'annulee')
  );
  
  // ✅ Commandes avec statuts simplifiés
  const myDeliveries = orders.filter(o => 
    o.aidant_id === aidantId && 
    (o.status === 'livree' || o.status === 'validee' || o.status === 'annulee')
  );

  // ✅ Filtrer par recherche
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

  // ✅ Filtrer par statut
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

  // ✅ Filtrer et trier
  const filteredItems = filterBySearch(filterByStatus(historyItems))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ✅ Statuts simplifiés pour l'historique
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

  // ✅ Libellé dynamique pour le titre
  const getPageTitle = () => {
    return '📋 Mon historique';
  };

  // ✅ Message vide selon le type
  const getEmptyMessage = (type: HistoryType) => {
    if (searchTerm) {
      return 'Aucun résultat pour cette recherche';
    }
    switch (type) {
      case 'all':
        return 'Vos missions et livraisons terminées apparaîtront ici';
      case 'missions':
        return 'Vos missions terminées apparaîtront ici';
      case 'deliveries':
        return 'Vos livraisons terminées apparaîtront ici';
      default:
        return 'Aucun élément dans votre historique';
    }
  };

  const isLoading = visitsLoading || ordersLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: colors.text }}>Chargement...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: myMissions.length + myDeliveries.length,
    missions: myMissions.length,
    deliveries: myDeliveries.length,
  };

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
          {getPageTitle()}
        </h1>
        <p className="mt-1" style={{ color: colors.text + '99' }}>
          {stats.total} éléments dans votre historique
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={stats.total} color={colors.primary} icon={<Calendar size={18} />} />
        <StatCard label="Missions" value={stats.missions} color="#4CAF50" icon={<CheckCircle size={18} />} />
        <StatCard label="Livraisons" value={stats.deliveries} color="#FF5722" icon={<Clock size={18} />} />
      </div>

      {/* FILTRES */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveType('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeType === 'all' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
            style={{ background: activeType === 'all' ? colors.primary : 'transparent' }}
          >
            Tous ({stats.total})
          </button>
          <button
            onClick={() => setActiveType('missions')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeType === 'missions' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
            style={{ background: activeType === 'missions' ? colors.primary : 'transparent' }}
          >
            📋 Missions ({stats.missions})
          </button>
          <button
            onClick={() => setActiveType('deliveries')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeType === 'deliveries' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
            style={{ background: activeType === 'deliveries' ? colors.primary : 'transparent' }}
          >
            🚚 Livraisons ({stats.deliveries})
          </button>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border outline-none text-sm"
              style={{ borderColor: colors.border, color: colors.text }}
              placeholder="Rechercher..."
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-xl border outline-none text-sm"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <option value="all">Tous les statuts</option>
            <option value="terminee">✅ Terminée</option>
            <option value="validee">✅ Validée</option>
            <option value="livree">📦 Livrée</option>
            <option value="annulee">❌ Annulée</option>
            <option value="en_cours">🔄 En cours</option>
          </select>
        </div>
      </div>

      {/* LISTE */}
      {filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              colors={colors}
              onView={() => {
                if (item.type === 'mission') {
                  navigate(`/app/visits/${item.id}`);
                } else {
                  navigate(`/app/orders/${item.id}`);
                }
              }}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              formatDate={formatDate}
              formatTime={formatTime}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <Calendar size={64} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium" style={{ color: colors.text }}>
            Aucun historique
          </h3>
          <p className="mt-1" style={{ color: colors.text + '80' }}>
            {getEmptyMessage(activeType)}
          </p>
        </div>
      )}
    </div>
  );
};

// =============================================
// STAT CARD
// =============================================

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

const StatCard = ({ label, value, color, icon }: StatCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '15', color }}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// =============================================
// HISTORY CARD
// =============================================

interface HistoryCardProps {
  item: any;
  colors: any;
  onView: () => void;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
}

const HistoryCard = ({ item, colors, onView, getStatusColor, getStatusLabel, formatDate, formatTime }: HistoryCardProps) => {
  const isMission = item.type === 'mission';
  const statusColor = getStatusColor(item.status);

  return (
    <div
      className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border-l-4 cursor-pointer"
      style={{ borderLeftColor: statusColor }}
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-semibold" style={{ color: colors.text }}>
              {isMission ? '📋' : '📦'} {item.patient?.first_name || 'Client'} {item.patient?.last_name || ''}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: statusColor + '20', color: statusColor }}
            >
              {getStatusLabel(item.status)}
            </span>
            <span className="text-xs text-gray-400">
              {isMission ? 'Mission' : 'Livraison'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm" style={{ color: colors.text + '60' }}>
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {formatDate(item.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {formatTime(item.created_at)}
            </span>
            {item.address && (
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {item.address}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="flex items-center gap-1 px-4 py-2 rounded-xl font-medium text-sm transition hover:bg-gray-50"
          style={{ color: colors.text, background: 'transparent', border: `1px solid ${colors.primary + '20'}` }}
        >
          <Eye size={16} />
          Détails
        </button>
      </div>
    </div>
  );
};

export default HistoryPage;