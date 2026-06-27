// 📁 src/features/discharge/pages/DischargePage.tsx
 
import { useEffect, useState } from 'react';
import { Plus, Calendar, Hospital, Eye, Loader2, Filter, Activity, Clock, CheckCircle } from 'lucide-react';
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
  const { discharges, isLoading, fetchDischarges } = useDischargeStore();
  const { patients, fetchPatients } = usePatientStore();

  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDischarge, setSelectedDischarge] = useState<any>(null);
  const [filter, setFilter] = useState<DischargeStatus | 'all'>('all');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);
  const isFamilyRole = role === 'family';

  useEffect(() => {
    fetchDischarges();
    if (isFamilyRole) fetchPatients();
  }, []);

  const filteredDischarges = discharges.filter(d => filter === 'all' || d.status === filter);

  const getStatusConfig = (status: DischargeStatus) => {
    switch (status) {
      case 'pending': return { label: '📋 En attente', color: '#f59e0b', bg: '#f59e0b10' };
      case 'planned': return { label: '📅 Planifiée', color: '#10b981', bg: '#10b98110' };
      case 'in_progress': return { label: '🚗 En cours', color: '#3b82f6', bg: '#3b82f610' };
      case 'completed': return { label: '✅ Terminée', color: '#10b981', bg: '#10b98110' };
      case 'cancelled': return { label: '❌ Annulée', color: '#ef4444', bg: '#ef444410' };
      default: return { label: status, color: '#64748b', bg: '#f1f5f9' };
    }
  };

  const stats = {
    total: discharges.length,
    pending: discharges.filter(d => d.status === 'pending').length,
    active: discharges.filter(d => d.status === 'in_progress' || d.status === 'planned').length,
    completed: discharges.filter(d => d.status === 'completed').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4">
        <div className="h-28 bg-white rounded-3xl animate-pulse shadow-sm" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse shadow-sm" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 sm:pb-8">
      {/* HEADER ÉPURÉ */}
      <section className="relative overflow-hidden rounded-3xl p-6 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase" style={{ background: colors.primary + '0d', color: colors.primary }}>
              <Hospital size={11} /> Sorties hôpital
            </div>
            <h1 className="text-xl font-extrabold mt-1" style={{ color: colors.text }}>Suivi des sorties</h1>
            <p className="text-xs text-gray-400 mt-0.5">{stats.total} demande(s) au total</p>
          </div>
          {isFamilyRole && (
            <button onClick={() => setShowRequestModal(true)} className="px-4 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition hover:opacity-90 shadow-sm" style={{ background: colors.primary }}>
              <Plus size={14} /> Demander
            </button>
          )}
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} color={colors.primary} icon={<Hospital size={16} />} />
        <StatCard label="En attente" value={stats.pending} color="#f59e0b" icon={<Clock size={16} />} />
        <StatCard label="En cours" value={stats.active} color="#3b82f6" icon={<Calendar size={16} />} />
        <StatCard label="Terminées" value={stats.completed} color="#10b981" icon={<CheckCircle size={16} />} />
      </section>

      {/* FILTRE */}
      <section className="flex items-center gap-2 bg-white rounded-2xl p-2 shadow-sm border border-black/5">
        <Filter size={14} className="text-gray-400 ml-2" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="w-full bg-transparent text-xs font-bold p-2 outline-none" style={{ color: colors.text }}>
          <option value="all">Toutes les sorties</option>
          <option value="pending">En attente</option>
          <option value="planned">Planifiées</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminées</option>
        </select>
      </section>

      {/* LISTE */}
      <section className="space-y-3">
        {filteredDischarges.length > 0 ? filteredDischarges.map((d) => {
          const status = getStatusConfig(d.status);
          return (
            <div key={d.id} onClick={() => { setSelectedDischarge(d); setShowDetailsModal(true); }} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-md transition cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs" style={{ background: colors.primary + '0a', color: colors.primary }}>
                  {d.patient?.first_name?.[0]}{d.patient?.last_name?.[0]}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: colors.text }}>{d.patient?.first_name} {d.patient?.last_name}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{d.hospital_name} • {formatDate(d.discharge_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ color: status.color, background: status.bg }}>{status.label}</span>
                <Eye size={16} className="text-gray-300" />
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-10 bg-white rounded-3xl shadow-sm">
            <p className="text-xs text-gray-400 font-medium">Aucune sortie trouvée.</p>
          </div>
        )}
      </section>

      {showRequestModal && <DischargeRequestModal patients={patients} onClose={() => setShowRequestModal(false)} onSuccess={() => { setShowRequestModal(false); fetchDischarges(); toast.success('Demande envoyée'); }} colors={colors} />}
      {showDetailsModal && selectedDischarge && <DischargeDetailsModal discharge={selectedDischarge} onClose={() => setShowDetailsModal(false)} onUpdate={fetchDischarges} colors={colors} />}
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) => (
  <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex items-center justify-between">
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-extrabold" style={{ color }}>{value}</p>
    </div>
    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '0a', color }}>{icon}</div>
  </div>
);

export default DischargePage;
