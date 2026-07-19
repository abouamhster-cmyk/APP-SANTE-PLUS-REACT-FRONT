// 📁 src/features/billing/pages/BillingPage.tsx
 
import { useEffect, useState, useRef, useMemo } from 'react';
import {
  CreditCard,
  CheckCircle,
  Clock,
  ShieldCheck,
  Package,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { usePaymentStore } from '@/stores/paymentStore';
import { useOfferStore } from '@/stores/offerStore';
import { usePatientStore } from '@/stores/patientStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { PaymentModal } from '../components/PaymentModal';
import { VisitDaysPicker } from '@/components/subscriptions/VisitDaysPicker';
import { Offer } from '@/types';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

type TabType = 'all' | 'senior' | 'maman_bebe';

const BillingPage = () => {
  const { profile, role } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
  const { patients, fetchPatients } = usePatientStore();

  const {
    subscriptions,
    payments,
    isLoading: storeLoading,
    fetchSubscriptions,
    fetchPayments,
  } = usePaymentStore();

  const {
    offers,
    isLoading: offersLoading,
    fetchOffers,
    isInitialized: offersInitialized,
  } = useOfferStore();

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startTouchY = useRef(0);

  const patientCategory = profile?.patient_category;
  const isPersonalAccount = role === 'family' && !patientCategory && patients.length === 0;
  const isAidantRole = role === 'aidant';

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    if (!offersInitialized) {
      fetchOffers();
    }
  }, [offersInitialized, fetchOffers]);

  useEffect(() => {
    fetchSubscriptions(true);
    fetchPayments(true);
  }, []);

  const hasSeniorPatient = useMemo(() => patients.some(p => p.category === 'senior'), [patients]);
  const hasMamanPatient = useMemo(() => patients.some(p => p.category === 'maman_bebe'), [patients]);
  const isSeniorProfile = profile?.patient_category === 'senior' || profile?.proche_category === 'senior';
  const isMamanProfile = profile?.patient_category === 'maman_bebe' || profile?.proche_category === 'maman_bebe';

  const showSenior = hasSeniorPatient || isSeniorProfile;
  const showMaman = hasMamanPatient || isMamanProfile;
  const showAll = !showSenior && !showMaman;

  // Filtrer les offres actives de type abonnement (mensuelle, trimestrielle, etc.)
  const allowedOffers = useMemo(() => {
    const activeSubscriptionOffers = offers.filter((o: Offer) => o.type !== 'ponctuelle' && o.is_active === true);

    if (showAll) {
      return activeSubscriptionOffers;
    }

    return activeSubscriptionOffers.filter((o: Offer) => {
      if (o.category === 'senior') return showSenior;
      if (o.category === 'maman_bebe') return showMaman;
      return true;
    });
  }, [offers, showAll, showSenior, showMaman]);

  const visibleTabs = useMemo(() => {
    if (isAidantRole) return [];
    const tabs: TabType[] = ['all'];
    const hasSeniorAllowed = allowedOffers.some(o => o.category === 'senior');
    const hasMamanAllowed = allowedOffers.some(o => o.category === 'maman_bebe');

    if (hasSeniorAllowed) tabs.push('senior');
    if (hasMamanAllowed) tabs.push('maman_bebe');

    return tabs;
  }, [allowedOffers, isAidantRole]);

  const displayedOffers = useMemo(() => {
    if (activeTab === 'all') return allowedOffers;
    return allowedOffers.filter(o => o.category === activeTab);
  }, [allowedOffers, activeTab]);

  useEffect(() => {
    if (activeTab !== 'all' && !visibleTabs.includes(activeTab)) {
      setActiveTab('all');
    }
  }, [visibleTabs, activeTab]);

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
        Promise.all([fetchSubscriptions(true), fetchPayments(true), fetchOffers()]),
        {
          loading: 'Actualisation de votre dossier...',
          success: 'Abonnements à jour !',
          error: 'Échec de synchronisation.',
        }
      );
    }
    setPullY(0);
  };

  const getVisibleTabs = (): TabType[] => {
    if (isAidantRole) return [];
    if (isPersonalAccount) return ['all'];
    if (patientCategory === 'senior') return ['all', 'senior'];
    if (patientCategory === 'maman_bebe') return ['all', 'maman_bebe'];
    return ['all', 'senior', 'maman_bebe'];
  };

  const visibleTabsList = getVisibleTabs();

  const activeSubscription = subscriptions.find((sub) => sub.status === 'actif');
  const isSubscriptionDepleted = useMemo(() => {
    if (!activeSubscription) return true;
    const isExpired = new Date(activeSubscription.end_date) < new Date();
    return activeSubscription.remaining_visits <= 0 || isExpired;
  }, [activeSubscription]);

  const hasActiveSub = !!(activeSubscription && !isSubscriptionDepleted);

  const isOfferSubscribed = (offerId: string) => {
    return subscriptions.some((sub) => sub.offre_id === offerId && sub.status === 'actif' && sub.remaining_visits > 0);
  };

  const openPayment = (offer: Offer) => {
    const activePatient = patients.length > 0 ? patients[0] : null;
    const patientId = activePatient?.id || null;

    if (hasActiveSub) {
      toast.error("Vous disposez déjà d'un forfait d'accompagnement actif.");
      return;
    }

    setSelectedOffer(offer);
    setSelectedPatientId(patientId);
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = async () => {
    await fetchSubscriptions(true);
    await fetchPayments(true);
    await fetchOffers();
    setIsPaymentOpen(false);
    toast.success('Paiement effectué avec succès !');
  };

  const getSubscriptionDurationText = (sub: any) => {
    if (!sub?.start_date || !sub?.end_date) return '';
    const start = new Date(sub.start_date);
    const end = new Date(sub.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (sub.offre?.category === 'maman_bebe') {
      const weeks = Math.round(diffDays / 7);
      return `${weeks} semaine${weeks > 1 ? 's' : ''}`;
    } else {
      const months = Math.round(diffDays / 30);
      if (months >= 1) {
        return `${months} mois`;
      }
      return `${diffDays} jours`;
    }
  };

  // ✅ HISTORIQUE UNIFIÉ AVEC CALCUL DYNAMIQUE DU MULTIPLICATEUR DE DURÉE DE MOIS/QUOTA
  const unifiedHistory = useMemo(() => {
    const historyList: any[] = [];
    const addedSubIds = new Set<string>();

    payments.forEach(p => {
      const metadata = p.metadata || {};
      const subId = p.abonnement_id || metadata.abonnement_id || metadata.subscription_id;
      if (subId) addedSubIds.add(subId);

      const durationText = metadata.duration_months && metadata.duration_months > 1 
        ? ` (${metadata.duration_months} mois)` 
        : '';

      historyList.push({
        id: p.id,
        amount: Number(p.amount || 0),
        status: p.status,
        date: p.created_at || p.paid_at,
        description: (metadata.description || 'Paiement forfait') + durationText,
      });
    });

    subscriptions.forEach(sub => {
      if (!addedSubIds.has(sub.id) && sub.offre) {
        let multiplier = 1;
        if (sub.offre.total_visits && sub.offre.total_visits > 0 && sub.total_visits) {
          multiplier = Math.max(1, Math.round(sub.total_visits / sub.offre.total_visits));
        } else if (sub.start_date && sub.end_date) {
          const start = new Date(sub.start_date);
          const end = new Date(sub.end_date);
          const diffDays = Math.round(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          
          // ✅ CORRECTIF DE FORMAT : Utilisation de la propriété CamelCase "durationDays" à la place de "duration_days" [23]
          const baseDays = sub.offre.durationDays || (sub.offre as any).duration_days || 30;
          multiplier = Math.max(1, Math.round(diffDays / baseDays));
        }

        const calculatedAmount = Number(sub.offre.price || 0) * multiplier;
        const durationText = multiplier > 1 ? ` (${multiplier} mois)` : '';

        historyList.push({
          id: `sub-${sub.id}`,
          amount: calculatedAmount,
          status: sub.status === 'actif' ? 'valide' : sub.status,
          date: sub.created_at || sub.start_date,
          description: `Souscription Forfait ${sub.offre.name}${durationText}`,
        });
      }
    });

    return historyList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, subscriptions]);

  const isLoading = storeLoading || offersLoading;

  const getTabLabel = (tabId: TabType) => {
    if (tabId === 'all') return 'Toutes les formules';
    if (tabId === 'senior') {
      return isPersonalAccount || !hasSeniorPatient 
        ? '🏡 Services & Convalescence' 
        : '👴 Accompagnement Seniors';
    }
    if (tabId === 'maman_bebe') {
      return '👶 Maman & Bébé';
    }
    return tabId;
  };

  const getSubTitleText = () => {
    if (isPersonalAccount) {
      return "Sélectionnez une formule d'accompagnement pour organiser vos propres visites de soutien, de convalescence après hospitalisation ou de livraison d'achats.";
    }
    return "Consultez votre crédit d'accompagnement mensuel, vos formules de visites et l'historique complet de vos règlements.";
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-6">
        <div className="h-28 bg-gray-100 dark:bg-gray-800/50 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-44 bg-gray-100 dark:bg-gray-850 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isAidantRole) {
    return (
      <div className="max-w-5xl mx-auto pb-6">
        <section className="bg-white rounded-2xl py-14 px-6 text-center border max-w-md mx-auto space-y-4" style={{ borderColor: colors.primary + '15' }}>
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mx-auto">
            <ShieldCheck size={22} style={{ color: colors.primary }} />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold" style={{ color: colors.text }}>Espace Intervenant homologué</h2>
            <p className="text-xs max-w-xs leading-relaxed" style={{ color: colors.textLight }}>
              En tant qu'auxiliaire de vie qualifié, vous n'avez pas d'abonnement ou de facturation d'heures à gérer sur cette interface.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div 
      className="space-y-6 max-w-5xl mx-auto pb-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="w-full flex justify-center overflow-hidden transition-all duration-300 ease-out"
        style={{ 
          height: pullY > 0 ? `${pullY}px` : '0px',
          opacity: pullY > 0 ? Math.min(pullY / 45, 1) : 0
        }}
      >
        <div className="flex items-center gap-1.5 py-1 text-emerald-600 dark:text-emerald-400">
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

      <section className="relative overflow-hidden bg-white/60 border rounded-2xl p-6 text-center shadow-sm backdrop-blur-md" style={{ borderColor: colors.primary + '15' }}>
        <div className="space-y-1.5 relative z-10">
          <h1 className="text-base sm:text-lg font-black tracking-tight" style={{ color: colors.text }}>
            Forfaits & Abonnements
          </h1>
          <p className="text-xs max-w-sm mx-auto leading-relaxed" style={{ color: colors.textLight }}>
            {getSubTitleText()}
          </p>
        </div>

        <button
          onClick={async () => {
            toast.promise(
              Promise.all([fetchSubscriptions(true), fetchPayments(true), fetchOffers()]),
              {
                loading: 'Mise à jour...',
                success: 'Crédits et dossiers synchronisés !',
                error: 'Échec de la mise à jour',
              }
            );
          }}
          disabled={isLoading}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
          title="Actualiser"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </section>

      {/* ABONNEMENT EN COURS D'UTILISATION */}
      {activeSubscription && (
        <section className="relative overflow-hidden rounded-2xl text-white p-6 shadow-md animate-fadeIn" style={{ background: colors.gradient || colors.primary }}>
          <div className="relative z-10 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-white/10 text-white border border-white/20">
                  {isSubscriptionDepleted ? 'Formule consommée / Terminée' : 'Abonnement en cours'}
                </span>
                <h2 className="text-lg font-black tracking-tight mt-1">
                  Forfait {activeSubscription.offre?.name || 'Abonnement'}
                </h2>
                <p className="text-[11px] text-gray-200 font-medium">
                  {activeSubscription.offre?.category === 'maman_bebe' ? '👶 Univers Maman & Bébé' : '👴 Univers Accompagnement Seniors'}
                </p>
              </div>
              <div className="sm:text-right shrink-0">
                <p className="text-xl font-black">
                  {Number(activeSubscription.offre?.price || 0).toLocaleString()} FCFA
                </p>
                <p className="text-[9px] text-gray-300">Règlement Unique</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-[9px] text-gray-300 font-bold uppercase tracking-wider">Date de souscription</p>
                <p className="font-bold mt-0.5">
                  {new Date(activeSubscription.created_at || activeSubscription.start_date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-300 font-bold uppercase tracking-wider">Engagement contractuel</p>
                <p className="font-bold mt-0.5">
                  Durée de {getSubscriptionDurationText(activeSubscription)}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-300 font-bold uppercase tracking-wider">Date de début</p>
                <p className="font-bold mt-0.5">
                  {new Date(activeSubscription.start_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-300 font-bold uppercase tracking-wider">Date de fin</p>
                <p className="font-bold mt-0.5">
                  {new Date(activeSubscription.end_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>

            {/* ✅ JAUGE DE VISITES UNIQUEMENT (La jauge de commandes incluses a été complètement et définitivement supprimée !) [23] */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              <div className="bg-white/10 rounded-xl p-3 border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-300 font-semibold uppercase">Crédit de Visites</p>
                  <p className="text-lg font-black mt-0.5">
                    {activeSubscription.remaining_visits} / {activeSubscription.total_visits} restantes
                  </p>
                </div>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  activeSubscription.remaining_visits <= 0 ? "bg-red-400" : "bg-emerald-400 animate-pulse"
                )} />
              </div>
            </div>

            {isSubscriptionDepleted && (
              <div className="p-3 bg-red-500/15 rounded-xl border border-red-500/25">
                <p className="text-xs font-bold text-red-200">⚠️ Votre forfait est entièrement consommé ou arrivé à échéance</p>
                <p className="text-[10px] text-gray-200 mt-0.5">
                  Vous pouvez à présent sélectionner une autre formule parmi la grille tarifaire ci-dessous.
                </p>
              </div>
            )}
          </div>
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        </section>
      )}

      {visibleTabsList.length > 1 && (
        <section className="w-full overflow-x-auto scrollbar-none py-1">
          <div className="inline-flex p-1 bg-gray-100/80 rounded-2xl border gap-1" style={{ borderColor: colors.primary + '10' }}>
            {visibleTabsList.map((tabId) => {
              const isActive = activeTab === tabId;

              return (
                <button
                  key={tabId}
                  onClick={() => setActiveTab(tabId as any)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap select-none flex items-center gap-1.5",
                    isActive
                      ? "bg-white shadow-sm font-extrabold"
                      : "hover:opacity-80"
                  )}
                  style={{
                    color: isActive ? colors.primary : colors.textLight,
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                  }}
                >
                  {getTabLabel(tabId)}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* GRILLE D'OFFRES D'ABONNEMENTS */}
      {displayedOffers.length > 0 ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
          {displayedOffers.map((offer: Offer) => (
            <OfferCardCompact
              key={offer.id}
              offer={offer}
              color={colors.primary}
              textColor={colors.text}
              isSubscribed={!!isOfferSubscribed(offer.id)}
              hasActiveSubscription={!!hasActiveSub}
              onChoose={() => openPayment(offer)}
              isPersonalAccount={!!isPersonalAccount}
              hasSeniorPatient={!!hasSeniorPatient}
            />
          ))}
        </section>
      ) : (
        <div className="col-span-full bg-white rounded-2xl py-12 px-4 text-center border max-w-sm mx-auto flex flex-col items-center justify-center gap-3" style={{ borderColor: colors.primary + '15' }}>
          <Package size={24} style={{ color: colors.textLight }} />
          <div className="space-y-1">
            <h3 className="text-sm font-bold" style={{ color: colors.text }}>Aucun forfait disponible</h3>
            <p className="text-xs" style={{ color: colors.textLight }}>Aucune offre active n'est disponible pour vos critères actuels.</p>
          </div>
        </div>
      )}

      {!hasActiveSub && (
        <div className="bg-white/40 rounded-xl p-4 border flex items-start gap-3 backdrop-blur-sm max-w-md mx-auto animate-fadeIn" style={{ borderColor: colors.primary + '15' }}>
          <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold" style={{ color: colors.text }}>
              {isPersonalAccount ? 'Formules pour vous-même' : 'Mode ponctuel disponible'}
            </p>
            <p className="text-[10px] leading-normal" style={{ color: colors.textLight }}>
              {isPersonalAccount 
                ? "Vous pouvez activer un forfait d'accompagnement pour votre propre compte ou régler à l'acte chaque course de livraison d'urgence (à partir de 2 500 FCFA)."
                : "Vous pouvez régler directement à l'acte chaque course d'urgence (à partir de 2 500 FCFA) ou vos visites de confort."}
            </p>
          </div>
        </div>
      )}

      {/* HISTORIQUE DE TRANSACTIONS AVEC MONTANT RÉEL DU MULTIPLICATEUR */}
      <section className="bg-white rounded-2xl p-5 border shadow-sm" style={{ borderColor: colors.primary + '15' }}>
        <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: colors.primary + '10' }}>
          <h2 className="text-xs font-black tracking-wider uppercase" style={{ color: colors.textLight }}>
            Historique des paiements
          </h2>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-gray-50" style={{ color: colors.textLight }}>{unifiedHistory.length} txn</span>
        </div>

        {unifiedHistory.length > 0 ? (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {unifiedHistory.slice(0, 5).map((item: any) => (
              <PaymentItem key={item.id} payment={item} colors={colors} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <CreditCard size={20} className="mx-auto mb-2 text-gray-300" />
            <p className="text-[10px]" style={{ color: colors.textLight }}>Aucune transaction enregistrée</p>
          </div>
        )}
      </section>

      {/* MODALS */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setSelectedOffer(null);
          setSelectedPatientId(null);
        }}
        offer={selectedOffer}
        onSuccess={handlePaymentSuccess}
        forcePonctual={false}
        patientId={selectedPatientId}
      />

      {showDayPicker && selectedSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <VisitDaysPicker
            subscriptionId={selectedSubscription.id}
            patientId={selectedSubscription.patient_id}
            totalVisits={selectedSubscription.total_visits || 0}
            remainingVisits={selectedSubscription.remaining_visits || 0}
            startDate={selectedSubscription.start_date}
            endDate={selectedSubscription.end_date}
            preferredDays={selectedSubscription.preferred_days || []}
            onSave={() => {
              setShowDayPicker(false);
              fetchSubscriptions();
            }}
            onClose={() => setShowDayPicker(false)}
            colors={colors}
          />
        </div>
      )}
    </div>
  );
};

interface OfferCardCompactProps {
  offer: Offer;
  color: string;
  textColor: string;
  isSubscribed: boolean;
  hasActiveSubscription: boolean;
  onChoose: () => void;
  isPersonalAccount: boolean;
  hasSeniorPatient: boolean;
}

const OfferCardCompact = ({
  offer,
  color,
  textColor,
  isSubscribed,
  hasActiveSubscription,
  onChoose,
  isPersonalAccount,
  hasSeniorPatient,
}: OfferCardCompactProps) => {
  const isDisabled = isSubscribed || hasActiveSubscription;

  const getIcon = () => {
    if (offer.category === 'maman_bebe') return '👶';
    if (isPersonalAccount || !hasSeniorPatient) return '🏡';
    return '👴';
  };

  const getBadgeColor = () => {
    if (offer.category === 'maman_bebe') return '#db4a6d';
    return color;
  };

  const badgeColor = getBadgeColor();

  const getCategoryLabel = () => {
    if (offer.category === 'maman_bebe') return '👶 Maman & Bébé';
    if (isPersonalAccount || !hasSeniorPatient) return '🏡 Santé Plus Services';
    return '👴 Santé Plus Services (Seniors)';
  };

  return (
    <div
      className="bg-white rounded-2xl p-5 shadow-sm border flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:translate-y-[-1px]"
      style={{
        borderColor: offer.badge ? badgeColor : color + '20',
        borderWidth: offer.badge ? '1.5px' : '1px',
      }}
    >
      <div>
        {offer.badge && (
          <span
            className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white mb-3"
            style={{ background: badgeColor }}
          >
            {offer.badge}
          </span>
        )}

        <div className="flex items-start gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0"
            style={{ background: badgeColor + '12' }}
          >
            {getIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-sm truncate" style={{ color: textColor }}>
              {offer.name}
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: color + '80' }}>
              {getCategoryLabel()}
            </p>
          </div>
        </div>

        {/* ✅ RENDU DESCRIPTIF DE L'OFFRE (Fiche d'aide à la décision) */}
        {offer.description && (
          <p className="text-[11px] text-gray-500 mt-2.5 leading-relaxed">
            {offer.description}
          </p>
        )}

        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-xl font-black" style={{ color: textColor }}>
            {offer.price.toLocaleString()}
          </span>
          <span className="text-xs font-bold" style={{ color: color }}>FCFA</span>
          {offer.period && <span className="text-xs font-medium ml-1" style={{ color: color + '60' }}>/ {offer.period}</span>}
        </div>

        {offer.features && offer.features.length > 0 && (
          <div className="mt-4 pt-3 border-t space-y-1.5" style={{ borderColor: color + '15' }}>
            {offer.features.map((feature: string, index: number) => (
              <div key={index} className="flex items-start gap-2 text-xs">
                <CheckCircle size={12} style={{ color: badgeColor }} className="shrink-0 mt-0.5" />
                <span className="leading-tight font-medium" style={{ color: color + '80' }}>{feature}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onChoose}
        disabled={isDisabled}
        className="mt-5 w-full py-2.5 rounded-xl text-white font-extrabold text-[11px] uppercase tracking-wider transition-all hover:opacity-95 disabled:opacity-55"
        style={{ background: isDisabled ? '#64748b' : badgeColor }}
      >
        {isSubscribed ? '✅ Forfait actif' : 
         hasActiveSubscription ? 'Forfait en cours' : 
         'Choisir ce forfait'}
      </button>
    </div>
  );
};

interface PaymentItemProps {
  payment: any;
  colors: any;
}

const PaymentItem = ({ payment, colors }: PaymentItemProps) => {
  const isValid = payment.status === 'valide' || payment.status === 'completed' || payment.status === 'actif';

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50/50 p-3 transition-colors hover:bg-gray-50">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: isValid ? '#10b9810a' : '#f59e0b0a',
            color: isValid ? '#10b981' : '#f59e0b',
          }}
        >
          {isValid ? <CheckCircle size={15} /> : <Clock size={15} />}
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="font-extrabold text-xs" style={{ color: colors.text }}>
            {Number(payment.amount || 0).toLocaleString()} FCFA
          </p>
          <p className="text-[10px] font-medium" style={{ color: colors.textLight }}>
            {payment.description} • le {new Date(payment.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
      <span
        className="shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider"
        style={{
          background: isValid ? '#10b98112' : '#f59e0b12',
          color: isValid ? '#10b981' : '#f59e0b',
        }}
      >
        {isValid ? 'Validé' : 'En attente'}
      </span>
    </div>
  );
};

export default BillingPage;
