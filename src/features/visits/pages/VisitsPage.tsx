// 📁 src/features/visits/pages/VisitsPage.tsx GOOD

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  XCircle,
  AlertCircle,
  CreditCard,   
} from 'lucide-react';

import { useVisitStore } from '@/stores/visitStore';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { VisitCard } from '@/components/visits/VisitCard';
import { VisitModal } from '../components/VisitModal';
import { VisitPaymentModal } from '../components/VisitPaymentModal';
import toast from 'react-hot-toast';

const VisitsPage = () => {
  const navigate = useNavigate();

  const { profile, role } = useAuthStore();
  const { visits, isLoading, fetchVisits, startVisit, cancelVisit } = useVisitStore();
  const { patients, fetchPatients } = usePatientStore();

  const {
    singular,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  // ✅ États pour le paiement
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingVisit, setPendingVisit] = useState<any>(null);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const canPlanify = isAdminOrCoordinator || isFamily;
  const canStartVisit = isAidant || isAdminOrCoordinator;
  const canCancelVisit = isAdminOrCoordinator || isFamily;

  useEffect(() => {
    fetchVisits();
    fetchPatients();
  }, []);

  // ✅ FILTRES SIMPLIFIÉS ET PROPRES
  const statusFilterOptions = useMemo(() => {
    if (isAidant) {
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
      { value: 'acceptee', label: 'Confirmées' },
      { value: 'en_cours', label: 'En cours' },
      { value: 'terminee', label: 'Terminées' },
      { value: 'brouillon', label: 'En attente de paiement' },
    ];
  }, [isAidant]);

  const sortedVisits = useMemo(() => {
    return visits
      .filter((visit) => {
        if (filterStatus === 'all') return true;
        return visit.status === filterStatus;
      })
      .sort(
        (a, b) =>
          new Date(a.scheduled_date).getTime() -
          new Date(b.scheduled_date).getTime()
      );
  }, [visits, filterStatus]);

  const handleAdd = () => {
    if (!canPlanify) {
      toast.error('Vous n\'avez pas les droits pour planifier une visite');
      return;
    }
    setSelectedVisit(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleModalSuccess = (newVisit?: any) => {
    fetchVisits();
    setIsModalOpen(false);
    
    if (newVisit && newVisit.metadata?.requires_payment) {
      setPendingVisit(newVisit);
      setShowPaymentModal(true);
      toast('💳 Paiement requis pour planifier la visite', { icon: '💳', duration: 4000 });
    } else {
      toast.success(modalMode === 'create' ? 'Visite planifiée' : 'Visite mise à jour');
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    setPendingVisit(null);
    await fetchVisits();
    toast.success('✅ Visite planifiée après paiement !');
  };

  const handleStartVisit = async (visitId: string) => {
    try {
      await startVisit(visitId);
      toast.success('Visite démarrée');
      fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du démarrage');
    }
  };

  const handleCancelVisit = async (visitId: string) => {
    if (!window.confirm('Annuler cette visite ?')) return;

    try {
      await cancelVisit(visitId);
      toast.success('Visite annulée');
      fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'annulation');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-white rounded-2xl animate-pulse" />
        <div className="h-10 bg-white rounded-2xl animate-pulse w-2/3" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden space-y-5 pb-24 sm:pb-10">
      
      {/* ============================================================
      EN-TÊTE CHALEUREUX
      ============================================================ */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-xl font-black text-gray-800" style={{ color: colors.text }}>
            {isAidant ? 'Mes missions' : 'Planning des visites'}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {isAidant 
              ? 'Retrouvez vos accompagnements programmés et passés.' 
              : 'Suivi et planification des visites d\'accompagnement à domicile.'}
          </p>
        </div>

        {canPlanify && (
          <button
            onClick={handleAdd}
            className="hidden sm:inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-xs transition hover:opacity-90 shadow-sm"
            style={{ background: colors.primary }}
          >
            <Plus size={14} />
            Planifier une visite
          </button>
        )}
      </section>

      {/* ============================================================
      BARRE DE FILTRES HORIZONTALE (TABS)
      ============================================================ */}
      <section className="w-full overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-1.5 pb-1">
          {statusFilterOptions.map((option) => {
            const isActive = filterStatus === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setFilterStatus(option.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                style={{
                  backgroundColor: isActive ? colors.primary : undefined,
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ============================================================
      LISTE DE VISITES
      ============================================================ */}
      {sortedVisits.length > 0 ? (
        <section className="space-y-3 min-w-0 max-w-full">
          {sortedVisits.map((visit) => (
            <div key={visit.id} className="min-w-0 max-w-full overflow-hidden">
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
                  canCancelVisit && (visit.status === 'planifiee' || visit.status === 'en_attente' || visit.status === 'brouillon')
                    ? () => handleCancelVisit(visit.id)
                    : undefined
                }
                onView={() => navigate(`/app/visits/${visit.id}`)}
              />
            </div>
          ))}
        </section>
      ) : (
        /* ÉCRAN VIDE SIMPLIFIÉ */
        <section className="bg-white rounded-2xl py-12 px-4 text-center border border-black/5">
          <div
            className="w-11 h-11 rounded-2xl mx-auto flex items-center justify-center mb-3"
            style={{
              background: colors.primary + '10',
              color: colors.primary,
            }}
          >
            {filterStatus === 'brouillon' ? <CreditCard size={20} /> : <Calendar size={20} />}
          </div>

          <h3 className="text-sm font-bold text-gray-700">
            {filterStatus !== 'all' ? 'Aucune visite correspondante' : 'Aucune visite planifiée'}
          </h3>

          <p className="text-xs text-gray-400 mt-0.5">
            {filterStatus !== 'all' ? 'Essayez de changer de filtre pour voir d\'autres statuts.' : 'Les visites programmées s\'afficheront ici.'}
          </p>

          {canPlanify && filterStatus === 'all' && (
            <button
              onClick={handleAdd}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs transition hover:opacity-90"
              style={{ background: colors.primary }}
            >
              <Plus size={14} />
              Créer une planification
            </button>
          )}
        </section>
      )}

      {/* ============================================================
      ACCÈS RAPIDE FLOUTÉ (MOBILE ONLY)
      ============================================================ */}
      {canPlanify && (
        <button
          onClick={handleAdd}
          className="sm:hidden fixed bottom-20 right-4 z-40 w-11 h-11 rounded-2xl text-white shadow-lg flex items-center justify-center active:scale-95 transition"
          style={{ background: colors.primary }}
          aria-label="Planifier une visite"
        >
          <Plus size={20} />
        </button>
      )}

      {/* MODAL DE PLANIFICATION */}
      <VisitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        visit={selectedVisit}
        patients={patients}
        onSuccess={handleModalSuccess}
      />

      {/* MODAL DE PAIEMENT */}
      {showPaymentModal && pendingVisit && (
        <VisitPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPendingVisit(null);
          }}
          visit={pendingVisit}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default VisitsPage;
