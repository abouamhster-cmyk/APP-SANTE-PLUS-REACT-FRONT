// 📁 src/features/discharge/pages/DischargePage.tsx

import { useEffect, useState } from 'react';
import { Plus, Calendar, Clock, Hospital, Stethoscope, User, Eye, Loader2, Filter, CheckCircle } from 'lucide-react';
import { useDischargeStore } from '@/stores/dischargeStore';
import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate } from '@/utils/helpers';
import { DischargeRequestModal } from '../components/DischargeRequestModal';
import { DischargeDetailsModal } from '../components/DischargeDetailsModal';
import { DischargeStatus } from '@/types';
import toast from 'react-hot-toast';

const DischargePage = () => {
  const { profile, role } = useAuthStore();
  const { discharges, isLoading, fetchDischarges, updateStatus } = useDischargeStore();
  const { patients, fetchPatients } = usePatientStore();

  const { singular, getCategoryLabel, isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

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

  const filteredDischarges = discharges.filter(d => filter === 'all' || d.status === filter);

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

  const getPageTitle = () => {
    if (isFamily) return '🏥 Sortie hôpital - Proche';
    if (isAidant) return '🏥 Sortie hôpital - Personne accompagnée';
    if (isAdminOrCoordinator) return '🏥 Gestion des sorties';
    return '🏥 Sortie hôpital';
  };

  const getEmptyMessage = () => {
    if (isFamily) return 'Demandez un accompagnement pour une sortie d\'hôpital.';
    if (isAidant) return 'Les demandes de sortie apparaîtront ici.';
    return 'Les demandes de sortie apparaîtront ici.';
  };

  const stats = {
    total: discharges.length,
    pending: discharges.filter(d => d.status === 'pending' || d.status === 'assessing').length,
    in_progress: discharges.filter(d => d.status === 'planned' || d.status === 'in_progress').length,
    completed: discharges.filter(d => d.status === 'completed').length,
  };

  const filterOptions = [
    { value: 'all', label: '📋 Toutes les demandes' },
    { value: 'pending', label: '📋 En attente' },
    { value: 'planned', label: '📅 Planifiées' },
    { value: 'in_progress', label: '🚗 En cours' },
    { value: 'completed', label: '✅ Terminées' },
    { value: 'cancelled', label: '❌ Annulées' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-white rounded-2xl animate-pulse shadow-sm" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-16 bg-white rounded-xl animate-pulse shadow-sm" />
          ))}
        </div>
        <div className="h-12 bg-white rounded-xl animate-pulse shadow-sm" />
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-16 bg-white rounded-xl animate-pulse shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 sm:pb-10 px-4 sm:px-0">

      {/* HEADER */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-2"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <Hospital size={12} />
              Sortie
            </div>

            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: colors.text }}>
              {getPageTitle()}
            </h1>

            <p className="text-xs mt-0.5 text-gray-400 font-medium">
              {stats.total} demande{stats.total > 1 ? 's' : ''} au total
            </p>
          </div>

          {isFamilyRole && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="px-4 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-1.5 transition-all hover:opacity-90 active:scale-95 shadow-sm"
              style={{ background: colors.primary }}
            >
              <Plus size={16} />
              <span>Demander</span>
            </button>
          )}
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <CompactStat label="Total" value={stats.total} color={colors.primary} icon={<Hospital size={14} />} />
        <CompactStat label="En attente" value={stats.pending} color="#FF9800" icon={<Clock size={14} />} />
        <CompactStat label="En cours" value={stats.in_progress} color="#2196F3" icon={<Calendar size={14} />} />
        <CompactStat label="Terminées" value={stats.completed} color="#4CAF50" icon={<CheckCircle size={14} />} />
      </section>

      {/* FILTRE */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400 shrink-0">
            <Filter size={14} />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border bg-gray-50/50 outline-none transition cursor-pointer text-gray-700"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            {filterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* LISTE */}
      {filteredDischarges.length > 0 ? (
        <section className="space-y-2.5">
          {filteredDischarges.map((discharge) => (
            <div
              key={discharge.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 border-l-4 cursor-pointer hover:bg-gray-50/40 transition-colors duration-200"
              style={{ borderLeftColor: getStatusColor(discharge.status) }}
              onClick={() => {
                setSelectedDischarge(discharge);
                setShowDetailsModal(true);
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    {/* Squircle Avatar */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                      style={{ background: colors.primary }}
                    >
                      {discharge.patient?.first_name?.[0]}{discharge.patient?.last_name?.[0]}
                    </div>
                    
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-bold text-gray-800 truncate">
                        {discharge.patient?.first_name} {discharge.patient?.last_name}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-gray-400 font-medium">
                        <span className="flex items-center gap-1 shrink-0">
                          <Hospital size={11} className="text-gray-300" /> {discharge.hospital_name}
                        </span>
                        <span className="text-gray-300 hidden xs:inline">•</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar size={11} className="text-gray-300" /> {formatDate(discharge.discharge_date)}
                        </span>
                        <span className="text-gray-300 hidden xs:inline">•</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-bold mt-0.5 inline-block"
                          style={{
                            background: getStatusColor(discharge.status) + '12',
                            color: getStatusColor(discharge.status),
                          }}
                        >
                          {getStatusLabel(discharge.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => { 
                      e.stopPropagation();
                      setSelectedDischarge(discharge);
                      setShowDetailsModal(true);
                    }}
                    className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors duration-150"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <Hospital size={24} className="text-gray-300" />
          </div>
          <h3 className="text-sm font-bold text-gray-700">
            {filter !== 'all' ? 'Aucune sortie dans cette catégorie' : 'Aucune sortie d\'hôpital'}
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">{getEmptyMessage()}</p>
        </section>
      )}

      {/* MODALS */}
      {showRequestModal && (
        <DischargeRequestModal
          patients={patients}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            fetchDischarges();
            toast.success('Demande de sortie créée !');
          }}
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
    <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center justify-between gap-3">
      <div className="space-y-0.5 min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl font-black truncate" style={{ color }}>{value}</p>
      </div>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '10', color }}>
        {icon}
      </div>
    </div>
  );
};

export default DischargePage;
