// 📁 src/features/admin/pages/AidantsPage.tsx

import { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Star,
  Phone,
  Mail,
  MapPin,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Award,
  Briefcase,
  Calendar,
  ShieldCheck,
  X, // ✅ Ajouter X ici
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatCurrency } from '@/utils/helpers';
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
  address: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

// ✅ Définir getStatusLabel en dehors du composant
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

// ✅ Définir getStatusColor en dehors du composant
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

  // ✅ Récupérer les aidants avec les profils
  useEffect(() => {
    fetchAidants();
  }, []);

  const fetchAidants = async () => {
    try {
      setIsLoading(true);

      // 1. Récupérer les aidants
      const { data: aidantsData, error: aidantsError } = await supabase
        .from('aidants')
        .select('*')
        .order('created_at', { ascending: false });

      if (aidantsError) throw aidantsError;

      // 2. Récupérer les profils
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

      // 3. Fusionner les données
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

  // ✅ Filtrer les aidants
  const filteredAidants = aidants.filter(aidant => {
    const matchesSearch =
      aidant.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aidant.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aidant.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || aidant.status === statusFilter ||
      (statusFilter === 'available' && aidant.available) ||
      (statusFilter === 'unavailable' && !aidant.available);

    return matchesSearch && matchesStatus;
  });

  // ✅ Statistiques
  const stats = {
    total: aidants.length,
    active: aidants.filter(a => a.status === 'approved' || a.status === 'active').length,
    pending: aidants.filter(a => a.status === 'pending').length,
    available: aidants.filter(a => a.available).length,
    verified: aidants.filter(a => a.is_verified).length,
  };

  // ✅ Voir les détails
  const handleViewDetails = (aidant: Aidant) => {
    setSelectedAidant(aidant);
    setShowDetailsModal(true);
  };

  // ✅ Mettre à jour le statut d'un aidant
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('aidants')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Statut de l'aidant mis à jour`);
      fetchAidants();
    } catch (error) {
      console.error('Update aidant status error:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // ✅ Basculer la disponibilité
  const handleToggleAvailability = async (id: string, available: boolean) => {
    try {
      const { error } = await supabase
        .from('aidants')
        .update({ 
          available: !available,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Disponibilité ${!available ? 'activée' : 'désactivée'}`);
      fetchAidants();
    } catch (error) {
      console.error('Toggle availability error:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black" style={{ color: colors.text }}>
              🦸 Gestion des aidants
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
              Gérez les aidants inscrits sur la plateforme
            </p>
          </div>
          <button
            onClick={fetchAidants}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl font-medium transition hover:opacity-80 flex items-center gap-2"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </section>

      {/* Statistiques */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          color={colors.primary}
          icon={<Users size={20} />}
        />
        <StatCard
          label="Actifs"
          value={stats.active}
          color="#4CAF50"
          icon={<UserCheck size={20} />}
        />
        <StatCard
          label="En attente"
          value={stats.pending}
          color="#FF9800"
          icon={<Clock size={20} />}
        />
        <StatCard
          label="Disponibles"
          value={stats.available}
          color="#2196F3"
          icon={<ShieldCheck size={20} />}
        />
        <StatCard
          label="Vérifiés"
          value={stats.verified}
          color="#9C27B0"
          icon={<Award size={20} />}
        />
      </section>

      {/* Filtres */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, email ou spécialité..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border outline-none text-sm"
              style={{
                borderColor: colors.border,
                background: 'var(--color-background)',
                color: colors.text,
              }}
            />
          </div>
          <div className="relative min-w-[180px]">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border outline-none text-sm appearance-none"
              style={{
                borderColor: colors.border,
                background: 'var(--color-background)',
                color: colors.text,
              }}
            >
              <option value="all">Tous les statuts</option>
              <option value="approved">✅ Approuvés</option>
              <option value="pending">⏳ En attente</option>
              <option value="rejected">❌ Refusés</option>
              <option value="available">🟢 Disponibles</option>
              <option value="unavailable">🔴 Indisponibles</option>
            </select>
          </div>
        </div>
      </section>

      {/* Liste des aidants */}
      <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-t-transparent" style={{ borderColor: colors.primary }} />
            <p className="mt-2 text-sm" style={{ color: colors.text + '60' }}>Chargement des aidants...</p>
          </div>
        ) : filteredAidants.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-bold" style={{ color: colors.text }}>
              Aucun aidant trouvé
            </h3>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {searchTerm || statusFilter !== 'all'
                ? 'Aucun aidant ne correspond à vos critères'
                : 'Aucun aidant n\'a encore été enregistré'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: colors.primary + '04' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Aidant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Spécialités
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Missions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Disponibilité
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.border }}>
                {filteredAidants.map((aidant) => (
                  <tr key={aidant.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: colors.primary }}
                        >
                          {aidant.user?.full_name?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <p className="font-medium text-sm" style={{ color: colors.text }}>
                            {aidant.user?.full_name || 'Aidant inconnu'}
                          </p>
                          <p className="text-xs" style={{ color: colors.text + '40' }}>
                            {aidant.user?.email || 'Email inconnu'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {aidant.specialties?.slice(0, 2).map((spec) => (
                          <span
                            key={spec}
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: colors.primary + '10', color: colors.primary }}
                          >
                            {spec}
                          </span>
                        ))}
                        {aidant.specialties?.length > 2 && (
                          <span className="text-[10px] text-gray-400">
                            +{aidant.specialties.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span style={{ color: colors.text + '60' }}>
                          {aidant.total_missions || 0}
                        </span>
                        <span className="text-green-500">
                          ✅ {aidant.completed_missions || 0}
                        </span>
                        <span className="text-red-400">
                          ❌ {aidant.cancelled_missions || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium" style={{ color: getStatusColor(aidant.status || 'pending') }}>
                        {getStatusLabel(aidant.status || 'pending')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          aidant.available ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {aidant.available ? '🟢 Disponible' : '🔴 Indisponible'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-2 rounded-lg hover:bg-gray-100 transition"
                          style={{ color: colors.primary }}
                          onClick={() => handleViewDetails(aidant)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-gray-100 transition"
                          style={{ color: aidant.available ? '#F44336' : '#4CAF50' }}
                          onClick={() => handleToggleAvailability(aidant.id, aidant.available)}
                        >
                          {aidant.available ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Détails */}
      {showDetailsModal && selectedAidant && (
        <AidantDetailsModal
          aidant={selectedAidant}
          onClose={() => setShowDetailsModal(false)}
          onUpdateStatus={handleUpdateStatus}
          colors={colors}
        />
      )}
    </div>
  );
};

// =============================================
// STAT CARD
// =============================================

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}

const StatCard = ({ label, value, color, icon }: StatCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-black" style={{ color }}>{value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: color + '15', color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

// =============================================
// AIDANT DETAILS MODAL
// =============================================

interface AidantDetailsModalProps {
  aidant: Aidant;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  colors: any;
}

const AidantDetailsModal = ({ aidant, onClose, onUpdateStatus, colors }: AidantDetailsModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStatusChange = async (status: string) => {
    setIsProcessing(true);
    try {
      await onUpdateStatus(aidant.id, status);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b" style={{ borderColor: colors.border }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>
              🦸 Détails de l'aidant
            </h2>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {aidant.user?.full_name || 'Aidant inconnu'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <InfoRow label="Nom complet" value={aidant.user?.full_name || 'N/A'} />
          <InfoRow label="Email" value={aidant.user?.email || 'N/A'} />
          <InfoRow label="Téléphone" value={aidant.user?.phone || 'N/A'} />
          <InfoRow label="Statut" value={getStatusLabel(aidant.status || 'pending')} />
          <InfoRow label="Disponibilité" value={aidant.available ? '🟢 Disponible' : '🔴 Indisponible'} />
          <InfoRow label="Vérifié" value={aidant.is_verified ? '✅ Oui' : '❌ Non'} />
          <InfoRow label="Note" value={`⭐ ${aidant.rating || 0}/5`} />
          <InfoRow label="Missions totales" value={String(aidant.total_missions || 0)} />
          <InfoRow label="Missions complétées" value={String(aidant.completed_missions || 0)} />
          <InfoRow label="Missions annulées" value={String(aidant.cancelled_missions || 0)} />
          
          {aidant.specialties && aidant.specialties.length > 0 && (
            <div>
              <p className="text-sm font-medium" style={{ color: colors.text + '60' }}>Spécialités</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {aidant.specialties.map((spec) => (
                  <span
                    key={spec}
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ background: colors.primary + '10', color: colors.primary }}
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {aidant.zones && aidant.zones.length > 0 && (
            <div>
              <p className="text-sm font-medium" style={{ color: colors.text + '60' }}>Zones d'intervention</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {aidant.zones.map((zone) => (
                  <span
                    key={zone}
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ background: '#2196F315', color: '#2196F3' }}
                  >
                    {zone}
                  </span>
                ))}
              </div>
            </div>
          )}

          {aidant.bio && (
            <div className="p-3 rounded-xl" style={{ background: colors.primary + '05' }}>
              <p className="text-sm font-medium" style={{ color: colors.text }}>📝 Bio</p>
              <p className="text-sm" style={{ color: colors.text + '70' }}>{aidant.bio}</p>
            </div>
          )}

          <InfoRow label="Date d'inscription" value={formatDate(aidant.created_at)} />

          {/* Actions */}
          {(aidant.status === 'pending' || aidant.status === 'rejected') && (
            <div className="space-y-3 pt-4 border-t" style={{ borderColor: colors.border }}>
              <p className="text-sm font-medium" style={{ color: colors.text }}>Actions</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleStatusChange('approved')}
                  disabled={isProcessing}
                  className="flex-1 py-3 rounded-xl text-white font-bold transition hover:opacity-80 flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: '#4CAF50' }}
                >
                  <CheckCircle size={18} />
                  Approuver
                </button>
                <button
                  onClick={() => handleStatusChange('rejected')}
                  disabled={isProcessing}
                  className="flex-1 py-3 rounded-xl text-white font-bold transition hover:opacity-80 flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: '#F44336' }}
                >
                  <XCircle size={18} />
                  Refuser
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================
// INFO ROW
// =============================================

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow = ({ label, value }: InfoRowProps) => {
  return (
    <div className="flex justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'var(--color-border, #e5e0d8)' }}>
      <span className="text-sm font-medium" style={{ color: 'var(--color-text-light, #6b7280)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--color-text, #2d2d2d)' }}>{value}</span>
    </div>
  );
};

export default AidantsPage;