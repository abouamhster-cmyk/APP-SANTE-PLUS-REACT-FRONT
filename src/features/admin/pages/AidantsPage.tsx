// 📁 src/features/admin/pages/AidantsPage.tsx
 
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Clock,
  Award,
  X,
} from 'lucide-react';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/helpers';
import { Modal, InfoRow } from '@/components/ui';
import toast from 'react-hot-toast';

interface Aidant {
  id: string;
  user_id: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
  } | null;
  specialties: string[];
  available: boolean;
  rating: number;
  total_missions: number;
  completed_missions: number;
  cancelled_missions: number;
  is_verified: boolean;
  status: string;
  zones: string[];
  created_at: string;
}

// ✅ Fonctions de statut
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'approved': return '✅ Approuvé';
    case 'pending': return '⏳ En attente';
    case 'rejected': return '❌ Refusé';
    case 'active': return '🟢 Actif';
    case 'inactive': return '⚪ Inactif';
    default: return status || '⏳ En attente';
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'approved': return '#4CAF50';
    case 'pending': return '#FF9800';
    case 'rejected': return '#F44336';
    case 'active': return '#4CAF50';
    case 'inactive': return '#9E9E9E';
    default: return '#9E9E9E';
  }
};

// ✅ Options de filtre
const statusOptions = [
  { value: 'all', label: 'Tous' },
  { value: 'approved', label: '✅ Approuvés' },
  { value: 'pending', label: '⏳ En attente' },
  { value: 'rejected', label: '❌ Refusés' },
  { value: 'available', label: '🟢 Disponibles' },
  { value: 'unavailable', label: '🔴 Indisponibles' },
];

const AidantsPage = () => {
  const { profile, role } = useAuthStore();
  const [aidants, setAidants] = useState<Aidant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAidant, setSelectedAidant] = useState<Aidant | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchAidants();
  }, []);

  const fetchAidants = async () => {
    try {
      setIsLoading(true);

      const { data: aidantsData, error: aidantsError } = await supabase
        .from('aidants')
        .select('*')
        .order('created_at', { ascending: false });

      if (aidantsError) throw aidantsError;

      const userIds = [...new Set(aidantsData?.map(a => a.user_id).filter(Boolean))];
      let profileMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, role, avatar_url')
          .in('id', userIds);

        if (!profilesError && profiles) {
          profileMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const aidantsWithUser = (aidantsData || []).map(aidant => ({
        ...aidant,
        user: aidant.user_id ? profileMap[aidant.user_id] || null : null,
      }));

      setAidants(aidantsWithUser);
    } catch (error: any) {
      console.error('Fetch aidants error:', error);
      toast.error('Erreur lors du chargement des aidants');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAidants = aidants.filter(aidant => {
    const matchesSearch =
      aidant.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aidant.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aidant.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'available' && aidant.available) ||
      (statusFilter === 'unavailable' && !aidant.available) ||
      aidant.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: aidants.length,
    active: aidants.filter(a => a.status === 'approved' || a.status === 'active').length,
    pending: aidants.filter(a => a.status === 'pending').length,
    available: aidants.filter(a => a.available).length,
    verified: aidants.filter(a => a.is_verified).length,
  };

  const handleViewDetails = (aidant: Aidant) => {
    setSelectedAidant(aidant);
    setShowDetailsModal(true);
  };

  const handleToggleAvailability = async (id: string, available: boolean) => {
    try {
      const { error } = await supabase
        .from('aidants')
        .update({ available: !available })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Disponibilité ${!available ? 'activée' : 'désactivée'}`);
      fetchAidants();
    } catch (error) {
      console.error('Toggle availability error:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((item) => (
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
              <Users size={12} />
              Aidants
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              🦸 Aidants
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {stats.total} aidant{stats.total > 1 ? 's' : ''} au total
            </p>
          </div>

          <button
            onClick={fetchAidants}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </section>

      {/* STATS COMPACTES */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <CompactStat
          icon={<Users size={14} />}
          label="Total"
          value={stats.total}
          color={colors.primary}
        />
        <CompactStat
          icon={<UserCheck size={14} />}
          label="Actifs"
          value={stats.active}
          color="#4CAF50"
        />
        <CompactStat
          icon={<Clock size={14} />}
          label="En attente"
          value={stats.pending}
          color="#FF9800"
        />
        <CompactStat
          icon={<Award size={14} />}
          label="Vérifiés"
          value={stats.verified}
          color="#9C27B0"
        />
      </section>

      {/* RECHERCHE + FILTRE */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, email..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-gray-50 outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
            />
          </div>

          <div className="relative min-w-[120px]">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-gray-50 outline-none appearance-none"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* LISTE */}
      {filteredAidants.length > 0 ? (
        <section className="space-y-2">
          {filteredAidants.map((aidant) => (
            <div
              key={aidant.id}
              className="bg-white rounded-xl p-3 shadow-sm border border-black/5 hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: colors.primary }}
                >
                  {aidant.user?.full_name?.charAt(0) || 'A'}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: colors.text }}>
                    {aidant.user?.full_name || 'Aidant inconnu'}
                  </p>
                  <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: colors.text + '50' }}>
                    <span>{aidant.user?.email || 'Email inconnu'}</span>
                    <span>•</span>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        background: getStatusColor(aidant.status || 'pending') + '15',
                        color: getStatusColor(aidant.status || 'pending'),
                      }}
                    >
                      {getStatusLabel(aidant.status || 'pending')}
                    </span>
                    <span>•</span>
                    <span className={aidant.available ? 'text-green-600' : 'text-red-400'}>
                      {aidant.available ? '🟢 Disponible' : '🔴 Indisponible'}
                    </span>
                    {aidant.specialties?.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[100px]">
                          {aidant.specialties.slice(0, 2).join(', ')}
                          {aidant.specialties.length > 2 && '...'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                    style={{ color: colors.primary }}
                    onClick={() => handleViewDetails(aidant)}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                    style={{ color: aidant.available ? '#F44336' : '#4CAF50' }}
                    onClick={() => handleToggleAvailability(aidant.id, aidant.available)}
                  >
                    {aidant.available ? <UserX size={16} /> : <UserCheck size={16} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="bg-white rounded-2xl p-6 text-center shadow-sm border border-black/5">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            <Users size={24} />
          </div>

          <h3 className="text-base font-bold" style={{ color: colors.text }}>
            {searchTerm || statusFilter !== 'all'
              ? 'Aucun aidant trouvé'
              : 'Aucun aidant enregistré'}
          </h3>

          <p className="text-xs mt-1 text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? 'Aucun aidant ne correspond à vos critères.'
              : 'Aucun aidant n\'a encore été enregistré.'}
          </p>
        </section>
      )}

      {/* MODAL DÉTAILS */}
      {showDetailsModal && selectedAidant && (
        <Modal
          isOpen={true}
          onClose={() => setShowDetailsModal(false)}
          title="🦸 Détails de l'aidant"
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: colors.border }}>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ background: colors.primary }}
              >
                {selectedAidant.user?.full_name?.charAt(0) || 'A'}
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: colors.text }}>
                  {selectedAidant.user?.full_name || 'Aidant inconnu'}
                </p>
                <p className="text-sm" style={{ color: colors.text + '50' }}>
                  {selectedAidant.user?.email || 'Email inconnu'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Statut" value={getStatusLabel(selectedAidant.status || 'pending')} />
              <InfoRow label="Disponibilité" value={selectedAidant.available ? '🟢 Disponible' : '🔴 Indisponible'} />
              <InfoRow label="Vérifié" value={selectedAidant.is_verified ? '✅ Oui' : '❌ Non'} />
              <InfoRow label="Note" value={`⭐ ${selectedAidant.rating || 0}/5`} />
              <InfoRow label="Missions totales" value={String(selectedAidant.total_missions || 0)} />
              <InfoRow label="Missions complétées" value={String(selectedAidant.completed_missions || 0)} />
              <InfoRow label="Missions annulées" value={String(selectedAidant.cancelled_missions || 0)} />
              <InfoRow label="Date d'inscription" value={formatDate(selectedAidant.created_at)} />
            </div>

            {selectedAidant.specialties?.length > 0 && (
              <div>
                <p className="text-sm font-medium" style={{ color: colors.text + '50' }}>Spécialités</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedAidant.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{ background: colors.primary + '10', color: colors.primary }}
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
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
          <p className="text-[9px] font-medium uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className="text-lg font-bold mt-0.5" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: color + '14', color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default AidantsPage;
