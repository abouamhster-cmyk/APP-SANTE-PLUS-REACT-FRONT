// 📁 src/features/discharge/pages/DischargePage.tsx
// 📌 Sortie d'hôpital - Accompagnement complet

import { useEffect, useState } from 'react';
import { 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Hospital, 
  Stethoscope,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Loader2,
  Eye,
  Edit,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { useDischargeStore } from '@/stores/dischargeStore';
import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime } from '@/utils/helpers';
import { DischargeRequestModal } from '../components/DischargeRequestModal';
import { DischargeDetailsModal } from '../components/DischargeDetailsModal';
import { DischargeStatus } from '@/types';
import toast from 'react-hot-toast';

const DischargePage = () => {
  const { profile, role } = useAuthStore();
  const { discharges, isLoading, fetchDischarges, updateStatus } = useDischargeStore();
  const { patients, fetchPatients } = usePatientStore();
  
  // ✅ Jargon dynamique selon le rôle
  const {
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDischarge, setSelectedDischarge] = useState<any>(null);
  const [filter, setFilter] = useState<DischargeStatus | 'all'>('all');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);
  const isFamilyRole = role === 'family';

  useEffect(() => {
    fetchDischarges();
    if (isFamilyRole) {
      fetchPatients();
    }
  }, []);

  const filteredDischarges = discharges.filter(d => 
    filter === 'all' || d.status === filter
  );

  const getStatusColor = (status: DischargeStatus): string => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'assessing': return '#2196F3';
      case 'planned': return '#4CAF50';
      case 'in_progress': return '#FF5722';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: DischargeStatus): string => {
    switch (status) {
      case 'pending': return '📋 En attente';
      case 'assessing': return '🔍 Évaluation';
      case 'planned': return '📅 Planifiée';
      case 'in_progress': return '🚗 En cours';
      case 'completed': return '✅ Terminée';
      case 'cancelled': return '❌ Annulée';
      default: return status;
    }
  };

  // ✅ Libellé dynamique pour le titre
  const getPageTitle = () => {
    if (isFamily) return '🏥 Sortie d\'hôpital - Proche';
    if (isAidant) return '🏥 Sortie d\'hôpital - Personne accompagnée';
    if (isAdminOrCoordinator) return '🏥 Gestion des sorties d\'hôpital';
    return '🏥 Sortie d\'hôpital';
  };

  // ✅ Libellé dynamique pour la description
  const getPageDescription = () => {
    if (isFamily) {
      return 'Demandez un accompagnement complet pour la sortie d\'hôpital de votre proche.';
    }
    if (isAidant) {
      return 'Accompagnez les personnes lors de leur sortie d\'hôpital.';
    }
    if (isAdminOrCoordinator) {
      return 'Gérez et suivez toutes les demandes de sortie d\'hôpital.';
    }
    return 'Accompagnement complet pour les sorties d\'hôpital.';
  };

  // ✅ Libellé dynamique pour le bouton
  const getButtonLabel = () => {
    if (isFamily) return 'Demander une sortie';
    return 'Nouvelle demande';
  };

  // ✅ Libellé dynamique pour le message vide
  const getEmptyMessage = () => {
    if (isFamily) {
      return 'Demandez un accompagnement pour une sortie d\'hôpital de votre proche.';
    }
    if (isAidant) {
      return 'Les demandes de sortie pour les personnes que vous accompagnez apparaîtront ici.';
    }
    if (isAdminOrCoordinator) {
      return 'Les demandes de sortie des bénéficiaires apparaîtront ici.';
    }
    return 'Les demandes apparaîtront ici.';
  };

  // ✅ Libellé dynamique pour les statistiques
  const getStatsLabel = (type: 'total' | 'pending' | 'in_progress' | 'completed') => {
    if (isFamily) {
      switch (type) {
        case 'total': return 'Total';
        case 'pending': return 'En attente';
        case 'in_progress': return 'En cours';
        case 'completed': return 'Terminées';
      }
    }
    if (isAidant) {
      switch (type) {
        case 'total': return 'Mes missions';
        case 'pending': return 'À venir';
        case 'in_progress': return 'En cours';
        case 'completed': return 'Terminées';
      }
    }
    return {
      total: 'Total',
      pending: 'En attente',
      in_progress: 'En cours',
      completed: 'Terminées',
    }[type] || '';
  };

  const handleCreateSuccess = () => {
    setShowRequestModal(false);
    fetchDischarges();
    toast.success('Demande de sortie créée !');
  };

  const handleViewDetails = (discharge: any) => {
    setSelectedDischarge(discharge);
    setShowDetailsModal(true);
  };

  const stats = {
    total: discharges.length,
    pending: discharges.filter(d => d.status === 'pending' || d.status === 'assessing').length,
    in_progress: discharges.filter(d => d.status === 'planned' || d.status === 'in_progress').length,
    completed: discharges.filter(d => d.status === 'completed').length,
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black" style={{ color: colors.text }}>
              {getPageTitle()}
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
              {getPageDescription()}
            </p>
          </div>
          {isFamilyRole && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="px-6 py-3 rounded-xl text-white font-bold transition hover:opacity-90 flex items-center gap-2"
              style={{ background: colors.primary }}
            >
              <Plus size={20} />
              {getButtonLabel()}
            </button>
          )}
        </div>
      </section>

      {/* Statistiques */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={getStatsLabel('total')}
          value={stats.total}
          color={colors.primary}
        />
        <StatCard
          label={getStatsLabel('pending')}
          value={stats.pending}
          color="#FF9800"
        />
        <StatCard
          label={getStatsLabel('in_progress')}
          value={stats.in_progress}
          color="#2196F3"
        />
        <StatCard
          label={getStatsLabel('completed')}
          value={stats.completed}
          color="#4CAF50"
        />
      </section>

      {/* Filtres */}
      <section className="flex flex-wrap gap-2">
        {(['all', 'pending', 'planned', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${
              filter === status ? 'text-white' : 'text-gray-600'
            }`}
            style={{
              background: filter === status ? colors.primary : 'transparent',
            }}
          >
            {status === 'all' ? '📋 Toutes' :
             status === 'pending' ? '📋 En attente' :
             status === 'planned' ? '📅 Planifiées' :
             status === 'in_progress' ? '🚗 En cours' :
             status === 'completed' ? '✅ Terminées' :
             '❌ Annulées'}
          </button>
        ))}
      </section>

      {/* Liste des sorties */}
      <section className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={40} className="animate-spin" style={{ color: colors.primary }} />
          </div>
        ) : filteredDischarges.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-black/5">
            <Hospital size={48} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-bold" style={{ color: colors.text }}>
              {filter === 'all' ? 'Aucune sortie d\'hôpital' : 'Aucune sortie dans cette catégorie'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {getEmptyMessage()}
            </p>
          </div>
        ) : (
          filteredDischarges.map((discharge) => (
            <DischargeCard
              key={discharge.id}
              discharge={discharge}
              colors={colors}
              onView={() => handleViewDetails(discharge)}
              onStatusChange={(status: DischargeStatus) => updateStatus(discharge.id, status)}
            />
          ))
        )}
      </section>

      {/* Modals */}
      {showRequestModal && (
        <DischargeRequestModal
          patients={patients}
          onClose={() => setShowRequestModal(false)}
          onSuccess={handleCreateSuccess}
          colors={colors}
        />
      )}

      {showDetailsModal && selectedDischarge && (
        <DischargeDetailsModal
          discharge={selectedDischarge}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedDischarge(null);
          }}
          onUpdate={() => fetchDischarges()}
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
  value: number;
  color: string;
}

const StatCard = ({ label, value, color }: StatCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
      <p className="text-3xl font-black" style={{ color }}>{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
};

// =============================================
// DISCHARGE CARD
// =============================================

interface DischargeCardProps {
  discharge: any;
  colors: any;
  onView: () => void;
  onStatusChange: (status: DischargeStatus) => void;
}

const DischargeCard = ({ discharge, colors, onView, onStatusChange }: DischargeCardProps) => {
  const getStatusColor = (status: DischargeStatus): string => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'assessing': return '#2196F3';
      case 'planned': return '#4CAF50';
      case 'in_progress': return '#FF5722';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: DischargeStatus): string => {
    switch (status) {
      case 'pending': return '📋 En attente';
      case 'assessing': return '🔍 Évaluation';
      case 'planned': return '📅 Planifiée';
      case 'in_progress': return '🚗 En cours';
      case 'completed': return '✅ Terminée';
      case 'cancelled': return '❌ Annulée';
      default: return status;
    }
  };

  const statusColor = getStatusColor(discharge.status);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 hover:shadow-md transition">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          {/* Patient / Proche */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: colors.primary }}
            >
              {discharge.patient?.first_name?.[0]}{discharge.patient?.last_name?.[0]}
            </div>
            <div>
              <h3 className="font-bold" style={{ color: colors.text }}>
                {discharge.patient?.first_name} {discharge.patient?.last_name}
              </h3>
              <p className="text-sm" style={{ color: colors.text + '60' }}>
                {discharge.patient?.address || 'Adresse non renseignée'}
              </p>
            </div>
          </div>

          {/* Infos */}
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div className="flex items-center gap-1.5" style={{ color: colors.text + '70' }}>
              <Hospital size={14} />
              <span>{discharge.hospital_name}</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: colors.text + '70' }}>
              <Calendar size={14} />
              <span>{formatDate(discharge.discharge_date)}</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: colors.text + '70' }}>
              <Clock size={14} />
              <span>{discharge.discharge_time}</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: colors.text + '70' }}>
              <Stethoscope size={14} />
              <span>{discharge.hospital_service}</span>
            </div>
          </div>

          {/* Aidant assigné */}
          {discharge.aidant && (
            <div className="mt-2 flex items-center gap-1.5 text-sm" style={{ color: colors.primary }}>
              <User size={14} />
              <span>Aidant: {discharge.aidant.user?.full_name || 'Non assigné'}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{
              background: statusColor + '15',
              color: statusColor,
            }}
          >
            {getStatusLabel(discharge.status)}
          </span>
          
          <div className="flex gap-2">
            <button
              onClick={onView}
              className="px-3 py-1.5 rounded-xl text-sm font-bold transition hover:opacity-80 flex items-center gap-1"
              style={{ background: colors.primary + '15', color: colors.primary }}
            >
              <Eye size={14} />
              Détails
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DischargePage;