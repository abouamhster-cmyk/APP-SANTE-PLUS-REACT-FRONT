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
} from 'lucide-react';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/helpers';
import { Modal } from '@/components/ui/Modal';
import { InfoRow } from '@/components/ui/InfoRow';
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

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'approved': return 'Approuvé';
    case 'pending': return 'En attente';
    case 'rejected': return 'Refusé';
    case 'active': return 'Actif';
    case 'inactive': return 'Inactif';
    default: return status || 'En attente';
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'approved': return '#10b981';
    case 'pending': return '#f59e0b';
    case 'rejected': return '#ef4444';
    case 'active': return '#10b981';
    case 'inactive': return '#94a3b8';
    default: return '#94a3b8';
  }
};

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
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
      <div className="space-y-6 max-w-5xl mx-auto pb-8">
        <div className="h-24 bg-white rounded-3xl animate-pulse shadow-sm" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse shadow-sm" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <section 
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all"
        style={{ background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.primary}12 100%)` }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: colors.text }}>
              🦸 Annuaire des aidants
            </h1>
            <p className="text-xs" style={{ color: colors.textLight }}>
              {stats.total} aidant{stats.total > 1 ? 's' : ''} inscrits sur la plateforme
            </p>
          </div>
          <button
            onClick={fetchAidants}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border bg-white hover:bg-gray-50 shrink-0 self-start sm:self-center"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </section>

      {/* Statistiques épurées */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} color={colors.primary} icon={<Users size={16} />} />
        <StatCard label="Actifs" value={stats.active} color="#10b981" icon={<UserCheck size={16} />} />
        <StatCard label="En attente" value={stats.pending} color="#f59e0b" icon={<Clock size={16} />} />
        <StatCard label="Vérifiés" value={stats.verified} color="#8b5cf6" icon={<Award size={16} />} />
      </section>

      {/* Barre de filtre épurée */}
      <section className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col sm:flex-row gap-3">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un aidant par son nom ou spécialité..."
          className="flex-1 px-3.5 py-2 rounded-xl border outline-none text-xs"
          style={{ borderColor: colors.border, background: 'var(--color-background)' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl border outline-none text-xs"
          style={{ borderColor: colors.border, background: 'var(--color-background)', color: colors.text }}
        >
          {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </section>

      {/* Liste épurée */}
      {filteredAidants.length > 0 ? (
        <section className="space-y-3">
          {filteredAidants.map((aidant) => (
            <div
              key={aidant.id}
              className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex items-center justify-between gap-4 transition hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: colors.primary }}
                >
                  {aidant.user?.full_name?.charAt(0) || 'A'}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="font-bold text-xs" style={{ color: colors.text }}>{aidant.user?.full_name || 'Aidant'}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-wrap">
                    <span>{aidant.user?.email || 'N/A'}</span>
                    <span>•</span>
                    <span className="font-semibold" style={{ color: getStatusColor(aidant.status) }}>{getStatusLabel(aidant.status)}</span>
                    <span>•</span>
                    <span className={aidant.available ? 'text-green-600 font-semibold' : 'text-gray-400 font-semibold'}>{aidant.available ? 'Disponible' : 'Indisponible'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleViewDetails(aidant)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600"><Eye size={14} /></button>
                <button
                  onClick={() => handleToggleAvailability(aidant.id, aidant.available)}
                  className="p-1.5 rounded-lg text-xs font-semibold px-2.5 py-1 rounded-lg border hover:bg-gray-50 transition-colors"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  {aidant.available ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center text-gray-400">Aucun aidant ne correspond aux filtres</div>
      )}

      {/* Modal Détails */}
      {showDetailsModal && selectedAidant && (
        <Modal isOpen={true} onClose={() => setShowDetailsModal(false)} title="🦸 Détails de l'aidant" maxWidth="md">
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: colors.border }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: colors.primary }}>
                {selectedAidant.user?.full_name?.charAt(0) || 'A'}
              </div>
              <div>
                <p className="font-bold" style={{ color: colors.text }}>{selectedAidant.user?.full_name || 'N/A'}</p>
                <p className="text-xs text-gray-500">{selectedAidant.user?.email || 'N/A'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <InfoRow label="Rôle" value="🦸 Aidant" />
              <InfoRow label="Statut" value={getStatusLabel(selectedAidant.status)} />
              <InfoRow label="Disponibilité" value={selectedAidant.available ? 'Disponible 🟢' : 'Indisponible 🔴'} />
              <InfoRow label="Note" value={`⭐ ${selectedAidant.rating || 0}/5`} />
              <InfoRow label="Missions" value={String(selectedAidant.total_missions || 0)} />
              <InfoRow label="Inscription" value={formatDate(selectedAidant.created_at)} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color, icon }: StatCardProps) => (
  <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex items-center justify-between">
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-extrabold" style={{ color }}>{value}</p>
    </div>
    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '0d', color }}>{icon}</div>
  </div>
);

export default AidantsPage;
