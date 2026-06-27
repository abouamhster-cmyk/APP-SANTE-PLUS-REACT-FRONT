// 📁 src/features/discharge/pages/DischargePage.tsx

import { useEffect, useState } from 'react'; import { Plus, Calendar, Clock,
Hospital, Stethoscope, User, Eye, Loader2, Filter, CheckCircle,
} from 'lucide-react'; import { useDischargeStore } from
'@/stores/dischargeStore'; import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore'; import {
getThemeColors, getThemeByRole } from '@/lib/permissions'; import {
useTerminology } from '@/hooks/useTerminology'; import { formatDate } from
'@/utils/helpers'; import { DischargeRequestModal } from
'../components/DischargeRequestModal'; import { DischargeDetailsModal } from
'../components/DischargeDetailsModal'; import { DischargeStatus } from
'@/types'; import toast from 'react-hot-toast';

const DischargePage = () => { const { profile, role } = useAuthStore(); const {
discharges, isLoading, fetchDischarges, updateStatus } = useDischargeStore();
const { patients, fetchPatients } = usePatientStore();

const { singular, getCategoryLabel, isFamily, isAidant, isAdminOrCoordinator, }
= useTerminology();

const [showRequestModal, setShowRequestModal] = useState(false); const
[showDetailsModal, setShowDetailsModal] = useState(false); const
[selectedDischarge, setSelectedDischarge] = useState(null); const [filter,
setFilter] = useState<DischargeStatus | 'all'>('all');

const themeName = getThemeByRole(role, profile?.patient_category as any); const
colors = getThemeColors(themeName); const isFamilyRole = role === 'family';

useEffect(() => { fetchDischarges(); if (isFamilyRole) { fetchPatients(); } },
[]);

const filteredDischarges = discharges.filter(d => filter === 'all' || d.status
=== filter );

const getStatusColor = (status: DischargeStatus): string => { switch (status) {
case 'pending': return '#FF9800'; case 'assessing': return '#2196F3'; case
'planned': return '#4CAF50'; case 'in_progress': return '#FF5722'; case
'completed': return '#4CAF50'; case 'cancelled': return '#F44336'; default:
return '#9E9E9E'; } };

const getStatusLabel = (status: DischargeStatus): string => { switch (status) {
case 'pending': return '📋 En attente'; case 'assessing': return '🔍 Évaluation';
case 'planned': return '📅 Planifiée'; case 'in_progress': return '🚗 En cours';
case 'completed': return '✅ Terminée'; case 'cancelled': return '❌ Annulée';
default: return status; } };

const getPageTitle = () => { if (isFamily) return '🏥 Sortie hôpital - Proche';
if (isAidant) return '🏥 Sortie hôpital - Personne accompagnée'; if
(isAdminOrCoordinator) return '🏥 Gestion des sorties'; return '🏥 Sortie
hôpital'; };

const getEmptyMessage = () => { if (isFamily) return 'Demandez un accompagnement
pour une sortie d'hôpital.'; if (isAidant) return 'Les demandes de sortie
apparaîtront ici.'; return 'Les demandes de sortie apparaîtront ici.'; };

const stats = { total: discharges.length, pending: discharges.filter(d =>
d.status === 'pending' || d.status === 'assessing').length, in_progress:
discharges.filter(d => d.status === 'planned' || d.status ===
'in_progress').length, completed: discharges.filter(d => d.status ===
'completed').length, };

// ✅ Options de filtre const filterOptions = [ { value: 'all', label: '📋 Toutes'
}, { value: 'pending', label: '📋 En attente' }, { value: 'planned', label: '📅
Planifiées' }, { value: 'in_progress', label: '🚗 En cours' }, { value:
'completed', label: '✅ Terminées' }, { value: 'cancelled', label: '❌ Annulées'
}, ];

if (isLoading) { return (    {[1, 2, 3, 4].map((item) => (  ))}   
{[1, 2, 3].map((item) => (  ))}   ); }

return (  {/* HEADER */}    <div className="inline-flex items-center gap-1.5
px-2.5 py-1 rounded-full text-[10px] font-bold mb-1.5" style={{ background:
colors.primary + '12', color: colors.primary, }} >  Sortie 

        <h1 className="text-xl font-black" style={{ color: colors.text }}>
          {getPageTitle()}
        </h1>

        <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
          {stats.total} demande{stats.total > 1 ? 's' : ''} au total
        </p>
      </div>

      {isFamilyRole && (
        <button
          onClick={() => setShowRequestModal(true)}
          className="px-3 py-2 rounded-xl text-white font-bold text-sm flex items-center gap-1.5"
          style={{ background: colors.primary }}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Demander</span>
        </button>
      )}
    </div>
  </section>

  {/* STATS */}
  <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
    <CompactStat label="Total" value={stats.total} color={colors.primary} icon={<Hospital size={14} />} />
    <CompactStat label="En attente" value={stats.pending} color="#FF9800" icon={<Clock size={14} />} />
    <CompactStat label="En cours" value={stats.in_progress} color="#2196F3" icon={<Calendar size={14} />} />
    <CompactStat label="Terminées" value={stats.completed} color="#4CAF50" icon={<CheckCircle size={14} />} />
  </section>

  {/* FILTRE */}
  <section className="bg-white rounded-2xl p-2 shadow-sm border border-black/5">
    <div className="flex items-center gap-2">
      <Filter size={14} className="text-gray-400" />
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value as any)}
        className="flex-1 px-2 py-1.5 text-xs rounded-xl border bg-gray-50 outline-none"
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
    <section className="space-y-2">
      {filteredDischarges.map((discharge) => (
        <div
          key={discharge.id}
          className="bg-white rounded-xl p-3 shadow-sm border-l-4 cursor-pointer hover:shadow-md transition"
          style={{ borderLeftColor: getStatusColor(discharge.status) }}
          onClick={() => {
            setSelectedDischarge(discharge);
            setShowDetailsModal(true);
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ background: colors.primary }}
                >
                  {discharge.patient?.first_name?.[0]}{discharge.patient?.last_name?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: colors.text }}>
                    {discharge.patient?.first_name} {discharge.patient?.last_name}
                  </p>
                  <div className="flex items-center gap-1.5 text-[9px] flex-wrap" style={{ color: colors.text + '50' }}>
                    <span className="flex items-center gap-0.5">
                      <Hospital size={10} /> {discharge.hospital_name}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Calendar size={10} /> {formatDate(discharge.discharge_date)}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[8px] font-medium"
                      style={{
                        background: getStatusColor(discharge.status) + '20',
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
                onClick={(e) => { e.stopPropagation();
                  setSelectedDischarge(discharge);
                  setShowDetailsModal(true);
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                style={{ color: colors.primary }}
              >
                <Eye size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </section>
  ) : (
    <section className="bg-white rounded-2xl p-6 text-center shadow-sm">
      <Hospital size={32} className="mx-auto mb-3 opacity-30" />
      <h3 className="text-sm font-bold" style={{ color: colors.text }}>
        {filter !== 'all' ? 'Aucune sortie dans cette catégorie' : 'Aucune sortie d\'hôpital'}
      </h3>
      <p className="text-xs text-gray-400 mt-1">{getEmptyMessage()}</p>
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

); };

// ============================================= // COMPACT STAT //
=============================================

interface CompactStatProps { icon: React.ReactNode; label: string; value:
number; color: string; }

const CompactStat = ({ icon, label, value, color }: CompactStatProps) => {
return (    {label} <p className="text-base font-bold mt-0.5" style={{ color
}}>{value}  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
style={{ background: color + '15', color }}> {icon}    ); };

export default DischargePage;
