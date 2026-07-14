// 📁 src/features/discharge/pages/DischargePage.tsx
// ✅ PAGE SORTIE HÔPITAL : FUSION SUR LE MOTEUR DE VISITES ET INTEGRATION PARFAITE DU WIZARD

import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Clock, Hospital, CheckCircle, Eye, Loader2, Filter, XCircle, CreditCard, UserPlus } from 'lucide-react';
import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate } from '@/utils/helpers';
import { DischargeRequestModal } from '../components/DischargeRequestModal';
import { DischargeDetailsModal } from '../components/DischargeDetailsModal';
import { VisitPaymentModal } from '@/features/visits/components/VisitPaymentModal'; 
import { VisitWizardModal } from '@/features/visits/components/VisitWizardModal'; // Import du Wizard d'assignation
import { DischargeStatus } from '@/types';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

// Adaptateur unifié : convertit une visite d'hôpital au format attendu par le UI
const mapVisitToDischarge = (visit: any) => {
  return {
    id: visit.id,
    status: visit.status,
    patient_id: visit.patient_id,
    patient: visit.patient,
    aidant_id: visit.aidant_id,
    aidant: visit.aidant,
    hospital_name: visit.metadata?.hospital_name || 'Hôpital non spécifié',
    hospital_service: visit.metadata?.hospital_service || 'Non précisé',
    doctor_name: visit.metadata?.doctor_name || 'Non précisé',
    discharge_date: visit.metadata?.discharge_date || visit.scheduled_date,
    discharge_time: visit.metadata?.discharge_time || visit.scheduled_time,
    notes: visit.notes,
    report: visit.report,
    photos: visit.photos || [],
    audios: visit.audios || [],
    user_id: visit.user_id,
    is_ponctual: visit.is_ponctual,
    payment_status: visit.payment_status,
  };
};

const DischargePage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  
  // Utilisation directe du store des visites
  const { visits, fetchVisits, createVisit, isLoading } = useVisitStore();
  const { patients, fetchPatients } = usePatientStore();
  const { hasActiveSubscription } = useSubscriptionGuard();

  const { singular, getCategoryLabel, isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false); 
  const [showWizardModal, setShowWizardModal] = useState(false); // Modal Wizard

  const [selectedDischarge, setSelectedDischarge] = useState<any>(null);
  const [selectedVisitForPayment, setSelectedVisitForPayment] = useState<any>(null); 
  
  // États de synchronisation du Wizard
  const [pendingDischargeData, setPendingDischargeData] = useState<any>(null); 
  const [wizardTarget, setWizardTarget] = useState<{
    targetType: 'patient' | 'personal_account' | 'personal';
    targetId: string;
    targetName: string;
  } | null>(null);

  const [filter, setFilter] = useState<DischargeStatus | 'all'>('all');

  const isActionPending = useRef(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);
  const isFamilyRole = role === 'family';

  useEffect(() => {
    fetchVisits();
    if (isFamilyRole) {
      fetchPatients();
    }
  }, []);

  // Filtrage des visites sur la métadonnée "is_discharge"
  const dischargeVisits = useMemo(() => {
    return (visits || [])
      .filter((v: any) => v.metadata?.is_discharge === true)
      .map((v: any) => mapVisitToDischarge(v));
  }, [visits]);

  const filteredDischarges = useMemo(() => {
    return dischargeVisits.filter(d => filter === 'all' || d.status === filter);
  }, [dischargeVisits, filter]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'brouillon': return '#8b5cf6';
      case 'planifiee': return '#4CAF50';
      case 'en_attente': return '#FF9800';
      case 'en_cours': return '#FF5722';
      case 'terminee': return '#9C27B0';
      case 'validee': return '#4CAF50';
      case 'annulee': return '#F44336';
      case 'refusee': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'brouillon': return '💳 En attente paiement';
      case 'planifiee': return '📅 Planifiée';
      case 'en_attente': return '⏳ En attente validation';
      case 'en_cours': return '🚗 En cours';
      case 'terminee': return '📝 Rapport soumis';
      case 'validee': return '✅ Validée';
      case 'annulee': return '❌ Annulée';
      case 'refusee': return '❌ Refusée';
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

  const stats = useMemo(() => {
    return {
      total: dischargeVisits.length,
      pending: dischargeVisits.filter(d => d.status === 'planifiee' || d.status === 'en_attente' || d.status === 'brouillon').length,
      in_progress: dischargeVisits.filter(d => d.status === 'en_cours').length,
      completed: dischargeVisits.filter(d => d.status === 'terminee' || d.status === 'validee').length,
    };
  }, [dischargeVisits]);

  const filterOptions = [
    { value: 'all', label: '📋 Toutes les demandes' },
    { value: 'brouillon', label: '💳 En attente de paiement' },
    { value: 'en_attente', label: '⏳ En attente validation' },
    { value: 'planifiee', label: '📅 Planifiées' },
    { value: 'en_cours', label: '🚗 En cours' },
    { value: 'terminee', label: '📝 Rapports soumis' },
    { value: 'validee', label: '✅ Validées' },
    { value: 'annulee', label: '❌ Annulées' },
  ];

  const handlePaymentRequired = (visit: any) => {
    setSelectedVisitForPayment(visit);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedVisitForPayment(null);
    fetchVisits();
    toast.success('💳 Paiement validé. Sortie d\'hôpital planifiée !');
  };

  // ✅ CANALISATION ET PRÉPARATION DU WIZARD (Récupère les données cibles de la visite en cours)
  const handleWizardRequired = (wizardData: any, pendingData: any) => {
    setPendingDischargeData(pendingData);
    setWizardTarget({
      targetType: pendingData.target_type || 'personal',
      targetId: pendingData.patient_id || profile?.id || '',
      targetName: pendingData.patient_id 
        ? `${patients.find(p => p.id === pendingData.patient_id)?.first_name || ''} ${patients.find(p => p.id === pendingData.patient_id)?.last_name || ''}`.trim()
        : (profile?.full_name || 'Personnel'),
    });
    setShowWizardModal(true);
  };

  // ✅ SUCCÈS DU WIZARD : Soumission finale de l'offre avec l'intervenant d'accompagnement sélectionné
  const handleWizardSuccess = async (wizardResult: {
    aidantId?: string | null;
    wizardChoice?: string;
    assignmentType?: string;
  }) => {
    if (!pendingDischargeData) return;

    // Fusionner les données d'assignation récoltées par le Wizard au sein du formulaire initial de sortie
    const completePayload = {
      ...pendingDischargeData,
      selected_aidant_id: wizardResult.aidantId,
      wizard_choice: wizardResult.wizardChoice,
      assignment_type: wizardResult.assignmentType,
    };

    try {
      const response = await createVisit(completePayload);

      setShowWizardModal(false);
      setWizardTarget(null);
      setPendingDischargeData(null);

      // Si l'offre finale exige d'abord un règlement FedaPay
      if (response.requires_payment || response.status === 'brouillon') {
        handlePaymentRequired(response);
      } else {
        await fetchVisits();
        toast.success('🎉 Sortie d\'hôpital planifiée avec succès !');
      }
    } catch (error: any) {
      console.error('❌ Erreur finalisation wizard sortie:', error);
      toast.error(error.message || 'Erreur lors de la planification de la sortie d\'hôpital');
    }
  };

  return (
    <div className="space-y-4 pb-24 sm:pb-10 px-4 sm:px-0">

      {/* HEADER AVEC AMÉNAGEMENT D’ALIGNEMENT RESPONSIVE */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

            <h1 className="text-base sm:text-lg font-black tracking-tight" style={{ color: colors.text }}>
              {getPageTitle()}
            </h1>

            <p className="text-xs mt-0.5 text-gray-400 font-semibold">
              {stats.total} demande{stats.total > 1 ? 's' : ''} au total
            </p>
          </div>

          {isFamilyRole && (
            <button
              onClick={() => {
                if (isActionPending.current) return;
                setShowRequestModal(true);
              }}
              className="w-full sm:w-auto h-11 px-5 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 shadow-sm shrink-0"
              style={{ background: colors.primary }}
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Demander un accompagnement</span>
            </button>
          )}
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CompactStat label="Total" value={stats.total} color={colors.primary} icon={<Hospital size={14} />} />
        <CompactStat label="En attente" value={stats.pending} color="#FF9800" icon={<Clock size={14} />} />
        <CompactStat label="En cours" value={stats.in_progress} color="#2196F3" icon={<Calendar size={14} />} />
        <CompactStat label="Terminées" value={stats.completed} color="#4CAF50" icon={<CheckCircle size={14} />} />
      </section>

      {/* FILTRE H-11 COHÉRENT */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gray-50 rounded-xl text-gray-400 shrink-0">
            <Filter size={14} />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="flex-1 h-11 px-4 text-xs font-bold rounded-xl border bg-gray-50/50 outline-none transition cursor-pointer text-gray-700"
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
                if (isActionPending.current) return;
                navigate(`/app/visits/${discharge.id}`);
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-inner"
                      style={{ background: colors.primary }}
                    >
                      {discharge.patient?.first_name?.[0] || 'P'}{discharge.patient?.last_name?.[0] || ''}
                    </div>
                    
                    <div className="min-w-0 space-y-1">
                      <p className="font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-100 truncate">
                        {discharge.patient ? `${discharge.patient.first_name} ${discharge.patient.last_name}` : '👤 Mon compte personnel'}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1 shrink-0">
                          <Hospital size={11} className="text-gray-400" /> {discharge.hospital_name}
                        </span>
                        <span className="text-gray-300 hidden sm:inline">•</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar size={11} className="text-gray-400" /> {formatDate(discharge.discharge_date)}
                        </span>
                        <span className="text-gray-300 hidden sm:inline">•</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mt-0.5 inline-block"
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
                      navigate(`/app/visits/${discharge.id}`);
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
        <section className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm max-w-sm mx-auto flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto text-gray-300">
            <Hospital size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-700">
              {filter !== 'all' ? 'Aucune sortie dans cette catégorie' : 'Aucune sortie d\'hôpital'}
            </h3>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed">{getEmptyMessage()}</p>
          </div>
        </section>
      )}

      {/* MODALS */}
      {showRequestModal && (
        <DischargeRequestModal
          patients={patients}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            fetchVisits();
          }}
          onPaymentRequired={handlePaymentRequired}
          onWizardRequired={handleWizardRequired} // ✅ Canalisation du Wizard
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
          onUpdate={() => fetchVisits()}
          colors={colors}
        />
      )}

      {/* MODAL PAIEMENT FEDAPAY */}
      {showPaymentModal && selectedVisitForPayment && (
        <VisitPaymentModal
          isOpen={true}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedVisitForPayment(null);
          }}
          visit={selectedVisitForPayment}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* ✅ DEPLOIEMENT DU WIZARD D'ASSIGNATION DE L'AIDANT CONFORME AU PROTOCOLE */}
      {showWizardModal && wizardTarget && pendingDischargeData && (
        <VisitWizardModal
          isOpen={true}
          onClose={() => {
            setShowWizardModal(false);
            setWizardTarget(null);
            setPendingDischargeData(null);
          }}
          onSuccess={handleWizardSuccess} // ✅ Signature de callback parfaitement conforme et typée
          targetType={wizardTarget.targetType}
          targetId={wizardTarget.targetId}
          targetName={wizardTarget.targetName}
          familyId={profile?.id}
          scheduledDate={pendingDischargeData.scheduled_date}
          scheduledTime={pendingDischargeData.scheduled_time}
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
    <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-sm flex items-center justify-between gap-3">
      <div className="space-y-0.5 min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</p>
        <p className="text-lg sm:text-xl font-black truncate" style={{ color }}>{value}</p>
      </div>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '10', color }}>
        {icon}
      </div>
    </div>
  );
};

export default DischargePage;
