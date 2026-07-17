// 📁 frontend/src/features/visits/pages/VisitsPage.tsx
// ✅ PAGE DES VISITES COMPLETE : PLANIFICATION RÉSERVÉE AUX ADMINS ET AGENDA EN LECTURE SEULE POUR LES FAMILLES

import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  AlertCircle,
  CheckCircle,
  Users,
  RefreshCw,
} from 'lucide-react';

import { useVisitStore } from '@/stores/visitStore';
import { usePatientStore } from '@/stores/patientStore';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { VisitCard } from '@/components/visits/VisitCard';
import { VisitModal } from '../components/VisitModal';
import { AssignAidantModal } from '@/features/aidants/components/AssignAidantModal';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

const VisitsPage = () => {
  const navigate = useNavigate();

  const { profile, role, user } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
  const { visits, isLoading, fetchVisits, startVisit, cancelVisit } = useVisitStore();
  const { patients, fetchPatients } = usePatientStore();

  const {
    hasActiveSubscription,
    remainingVisits,
    isFamily,
    isAidant: isAidantRole,
    isAdminOrCoordinator,
    isLoading: subLoading,
  } = useSubscriptionGuard();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedVisitForAssign, setSelectedVisitForAssign] = useState<any>(null);

  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startTouchY = useRef(0);

  // ✅ VERROU DE SÉCURITÉ CONTRE LES DOUBLES-CLICS SUR LES LISTES D'ACTIONS
  const isActionPending = useRef(false);

  // 🔒 Planification réservée à l'admin et au coordinateur
  const canPlanify = isAdminOrCoordinator;
  const canStartVisit = isAidantRole || isAdminOrCoordinator;
  const canCancelVisit = isAdminOrCoordinator;

  useEffect(() => {
    fetchVisits();
    fetchPatients();
  }, []);

  const statusFilterOptions = useMemo(() => {
    if (isAidantRole) {
      return [
        { value: 'all', label: 'Tout' },
        { value: 'planifiee', label: 'À valider' },
        { value: 'acceptee', label: 'Confirmées' },
        { value: 'en_cours', label: 'En cours' },
        { value: 'terminee', label: 'Terminées' },
      ];
    }
    return [
      { value: 'all', label: 'Toutes les visites' },
      { value: 'planifiee', label: 'Planifiées' },
      { value: 'en_cours', label: 'En cours' },
      { value: 'terminee', label: 'Terminées' },
      { value: 'validee', label: 'Validées' },
      { value: 'annulee', label: 'Annulées' },
    ];
  }, [isAidantRole]);

  const sortedVisits = useMemo(() => {
    return visits
      .filter((visit) => {
        if (filterStatus === 'all') return visit.status !== 'brouillon'; // Exclure les brouillons résiduels
        return visit.status === filterStatus;
      })
      .sort(
        (a, b) =>
          new Date(b.scheduled_date).getTime() -
          new Date(a.scheduled_date).getTime() // Plus récent au plus ancien
      );
  }, [visits, filterStatus]);

  const waitingForAidantCount = visits.filter(v => v.status === 'en_attente_aidant').length;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startTouchY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - startTouchY.current;

    if (diffY > 0 && window.scrollY === 0) {
      const resistance = Math.min(diffY * 0.38, 72);
      setPullY(resistance);
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    setIsPulling(false);
    if (pullY >= 50) {
      toast.promise(
        (async () => {
          await fetchVisits();
          await fetchPatients();
        })(),
        {
          loading: 'Actualisation des visites...',
          success: 'Planning synchronisé !',
          error: 'Échec de synchronisation.',
        }
      );
    }
    setPullY(0);
  };

  const handleShowAssignAidantModal = (visit: any) => {
    setSelectedVisitForAssign(visit);
    setShowAssignModal(true);
  };

  const handleAssignAidantSuccess = async () => {
    useVisitStore.getState().invalidateCache();
    await fetchVisits();
    toast.success('Aidant assigné avec succès');
  };

  const handleAdminAssignAidant = async (visitId: string, aidantId: string, assignmentType: string = 'permanente') => {
    if (isActionPending.current) return;
    
    isActionPending.current = true;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error('Session expirée');
        return;
      }

      const response = await fetch(`${API_URL}/visits/admin/assign-aidant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          visitId,
          aidantId,
          assignmentType,
          force: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'assignation');
      }

      toast.success(result.message || 'Aidant assigné avec succès');
      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur assignation:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
    } finally {
      isActionPending.current = false;
    }
  };

  const handleAdd = () => {
    if (!canPlanify) {
      toast.error('La planification manuelle est réservée à l’administration de Santé Plus.');
      return;
    }
    setSelectedVisit(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchVisits();
    setIsModalOpen(false);
  };

  const handleStartVisit = async (visitId: string) => {
    if (isActionPending.current) return;
    
    isActionPending.current = true;
    try {
      await startVisit(visitId);
      toast.success('Visite démarrée');
      fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur démarrage:', error);
      toast.error(error.message || 'Erreur lors du démarrage');
    } finally {
      isActionPending.current = false;
    }
  };

  const handleCancelVisit = async (visitId: string) => {
    if (isActionPending.current) return;
    if (!window.confirm('Annuler cette visite ?')) return;

    isActionPending.current = true;
    try {
      await cancelVisit(visitId);
      toast.success('Visite annulée');
      fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur annulation:', error);
      toast.error(error.message || 'Erreur lors de l\'annulation');
    } finally {
      isActionPending.current = false;
    }
  };

  if (isLoading || subLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full max-w-5xl mx-auto space-y-6 pb-6 px-1 sm:px-0" 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      
      {/* INDICATEUR DE PULL-TO-REFRESH MOBILE */}
      <div 
        className="w-full flex justify-center overflow-hidden transition-all duration-300 ease-out"
        style={{ 
          height: pullY > 0 ? `${pullY}px` : '0px',
          opacity: pullY > 0 ? Math.min(pullY / 45, 1) : 0
        }}
      >
        <div className="flex items-center gap-1.5 py-1 text-emerald-600">
          <RefreshCw 
            size={13} 
            className={cn("transition-all", pullY >= 50 ? "rotate-180 animate-spin" : "")} 
            style={{ transform: pullY < 50 ? `rotate(${pullY * 3.6}deg)` : undefined }}
          />
          <span className="text-[10px] font-black uppercase tracking-wider">
            {pullY >= 50 ? 'Relâcher pour actualiser' : 'Tirer pour rafraîchir'}
          </span>
        </div>
      </div>

      {/* CADRE UNIQUE ÉPURÉ */}
      <section className="relative overflow-hidden bg-white/60 border rounded-2xl p-6 flex flex-col items-center text-center gap-4 shadow-sm backdrop-blur-md" style={{ borderColor: colors.primary + '15' }}>
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-base sm:text-lg font-black tracking-tight" style={{ color: colors.text }}>
            {isAidantRole ? 'Mes missions d\'accompagnement' : 'Planning des visites'}
          </h1>
          <p className="text-xs max-w-sm mx-auto leading-relaxed" style={{ color: colors.textLight }}>
            {isAidantRole 
              ? 'Consultez votre emploi du temps d\'interventions programmées.' 
              : 'Consultez l\'agenda des interventions d\'aide à domicile programmées par l’administration.'}
          </p>
        </div>

        {isFamily && (
          <div className="px-5 py-3 rounded-2xl text-center max-w-xs w-full relative z-10" style={{ backgroundColor: colors.primary + '10', border: `1px solid ${colors.primary + '20'}` }}>
            <p className="text-[9px] font-extrabold uppercase tracking-wider leading-none" style={{ color: colors.primary }}>
              {hasActiveSubscription ? 'Forfait disponible' : 'Tarification'}
            </p>
            <p className="text-base font-black mt-1 leading-none" style={{ color: colors.primary }}>
              {hasActiveSubscription ? `${remainingVisits} visite${remainingVisits > 1 ? 's' : ''}` : 'Mode Ponctuel'}
            </p>
            <p className="text-[10px] font-medium mt-1 leading-none" style={{ color: colors.primary + '80' }}>
              {hasActiveSubscription ? 'Crédits d\'interventions actifs' : 'Accompagnement à l\'acte'}
            </p>
          </div>
        )}

        {isAdminOrCoordinator && waitingForAidantCount > 0 && (
          <button
            onClick={() => setFilterStatus('en_attente_aidant')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition relative z-10"
            style={{ backgroundColor: '#FF572215', color: '#FF5722', border: '1px solid #FF572230' }}
          >
            <AlertCircle size={12} className="animate-pulse" style={{ color: '#FF5722' }} />
            <span>{waitingForAidantCount} visite{waitingForAidantCount > 1 ? 's' : ''} sans auxiliaire rattaché</span>
          </button>
        )}

        {canPlanify && (
          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shadow-sm relative z-10"
            style={{ background: colors.primary }}
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>Planifier une visite (Admin)</span>
          </button>
        )}

        <button
          onClick={async () => {
            toast.promise(
              (async () => {
                await fetchVisits();
                await fetchPatients();
              })(),
              {
                loading: 'Mise à jour...',
                success: 'Planning actualisé !',
                error: 'Échec de la mise à jour',
              }
            );
          }}
          disabled={isLoading}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition shadow-inner"
          title="Rafraîchir"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>

      </section>

      {/* FILTRES */}
      <section className="w-full overflow-x-auto scrollbar-none py-1">
        <div className="inline-flex p-1 bg-gray-100/80 rounded-2xl border gap-1" style={{ borderColor: colors.primary + '10' }}>
          {statusFilterOptions.map((option) => {
            const isActive = filterStatus === option.value;
            const hasWaitingBadge = option.value === 'en_attente_aidant' && waitingForAidantCount > 0;

            return (
              <button
                key={option.value}
                onClick={() => setFilterStatus(option.value)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap select-none flex items-center gap-1.5",
                  isActive ? "bg-white shadow-sm font-extrabold" : "hover:opacity-80"
                )}
                style={{
                  color: isActive ? colors.primary : colors.textLight,
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                }}
              >
                <span>{option.label}</span>
                {hasWaitingBadge && (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold leading-none" style={{ backgroundColor: '#FF572220', color: '#FF5722' }}>
                    {waitingForAidantCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* LISTE DES VISITES */}
      {sortedVisits.length > 0 ? (
        <section className="space-y-3.5 visits-list">
          {sortedVisits.map((visit) => (
            <div key={visit.id} className="transition-all duration-200 hover:translate-y-[-1px]">
              <VisitCard
                visit={visit}
                onClick={() => navigate(`/app/visits/${visit.id}`)}
                showActions={true}
                onStart={
                  canStartVisit && (visit.status === 'acceptee' || visit.status === 'planifiee')
                    ? () => handleStartVisit(visit.id)
                    : undefined
                }
                onCancel={
                  canCancelVisit && (visit.status === 'planifiee' || visit.status === 'en_attente')
                    ? () => handleCancelVisit(visit.id)
                    : undefined
                }
                onShowAssignAidantModal={
                  isAdminOrCoordinator ? () => handleShowAssignAidantModal(visit) : undefined
                }
                onView={() => navigate(`/app/visits/${visit.id}`)}
                compact
              />
            </div>
          ))}
        </section>
      ) : (
        /* ÉCRAN VIDE */
        <section className="bg-white/40 rounded-2xl py-16 px-6 text-center border max-w-sm mx-auto flex flex-col items-center justify-center gap-4 backdrop-blur-sm shadow-sm" style={{ borderColor: colors.primary + '15' }}>
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
            <Calendar size={20} />
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-sm" style={{ color: colors.text }}>
              Aucun accompagnement trouvé
            </h3>
            <p className="text-xs max-w-xs leading-relaxed" style={{ color: colors.textLight }}>
              Aucun accompagnement programmé ne correspond à ce filtre de statut.
            </p>
          </div>

          {canPlanify && filterStatus === 'all' && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-white font-bold text-xs transition hover:opacity-90 shadow-sm"
              style={{ background: colors.primary }}
            >
              <Plus size={13} strokeWidth={2.5} />
              Planifier une visite
            </button>
          )}
        </section>
      )}

      {/* BOUTON FLOATING MOBILE ADMIN */}
      {canPlanify && (
        <button
          onClick={handleAdd}
          className="sm:hidden fixed bottom-24 right-5 z-40 w-12 h-12 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          style={{ 
            background: colors.primary,
            boxShadow: `0 8px 24px -6px ${colors.primary}`
          }}
          aria-label="Planifier un nouvel accompagnement"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      )}

      {/* MODALE DE CRÉATION ADMIN */}
      {canPlanify && (
        <VisitModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          mode={modalMode}
          visit={selectedVisit}
          patients={patients}
          onSuccess={handleModalSuccess}
        />
      )}

      {showAssignModal && selectedVisitForAssign && (
        <AssignAidantModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedVisitForAssign(null);
          }}
          targetType="visit"
          targetId={selectedVisitForAssign.id}
          targetName={selectedVisitForAssign.target_name || 
            `${selectedVisitForAssign.patient?.first_name || ''} ${selectedVisitForAssign.patient?.last_name || ''}`.trim() || 'Visite'}
          onSuccess={handleAssignAidantSuccess}
          currentAidantId={selectedVisitForAssign.aidant_id}
          colors={colors}
          allowForce={isAdminOrCoordinator}
          onAssignAidant={async (aidantId: string, assignmentType: string, force?: boolean) => { 
            await handleAdminAssignAidant(selectedVisitForAssign.id, aidantId, assignmentType); 
          }}
        />
      )}
    </div>
  );
};

export default VisitsPage;
