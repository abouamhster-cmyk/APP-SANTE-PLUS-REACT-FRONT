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
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { PaymentModal } from '../components/PaymentModal';
import { VisitDaysPicker } from '@/components/subscriptions/VisitDaysPicker';
import { Offer } from '@/types';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

// =============================================
// TYPES
// =============================================

type TabType = 'all' | 'senior' | 'maman_bebe';

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

const BillingPage = () => {
  const { profile, role } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();
  const { hasActiveSubscription } = useSubscriptionGuard();

  const {
    isFamily,
  } = useTerminology();

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

  // ÉTATS DE PULL-TO-REFRESH MOBILE
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startTouchY = useRef(0);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const patientCategory = profile?.patient_category;
  const isPersonalAccount = role === 'family' && !patientCategory && patients.length === 0;
  const isAidantRole = role === 'aidant';

  // =============================================
  // EFFETS : CHARGEMENT DES DONNÉES
  // =============================================

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    if (!offersInitialized) {
      fetchOffers();
    }
  }, [offersInitialized, fetchOffers]);

  useEffect(() => {
    fetchSubscriptions();
    fetchPayments();
  }, []);

  // ============================================================
  // ✅ LOGIQUE DE COHÉRENCE VERTICALE DYNAMIQUE
  // ============================================================
  
  const hasSeniorPatient = useMemo(() => patients.some(p => p.category === 'senior'), [patients]);
  const hasMamanPatient = useMemo(() => patients.some(p => p.category === 'maman_bebe'), [patients]);
  const isSeniorProfile = profile?.patient_category === 'senior' || profile?.proche_category === 'senior';
  const isMamanProfile = profile?.patient_category === 'maman_bebe' || profile?.proche_category === 'maman_bebe';

  const showSenior = hasSeniorPatient || isSeniorProfile;
  const showMaman = hasMamanPatient || isMamanProfile;
  
  // Compte personnel sans proche enregistré : on affiche tout l'univers pour lui laisser le choix de souscription
  const showAll = !showSenior && !showMaman;

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

  // Définir dynamiquement les onglets visibles
  const visibleTabs = useMemo(() => {
    if (isAidantRole) return [];
    
    const tabs: TabType[] = ['all'];
    const hasSeniorAllowed = allowedOffers.some(o => o.category === 'senior');
    const hasMamanAllowed = allowedOffers.some(o => o.category === 'maman_bebe');

    if (hasSeniorAllowed) tabs.push('senior');
    if (hasMamanAllowed) tabs.push('maman_bebe');

    return tabs;
  }, [allowedOffers, isAidantRole]);

  // Offres finalement affichées selon l'onglet actif
  const displayedOffers = useMemo(() => {
    if (activeTab === 'all') return allowedOffers;
    return allowedOffers.filter(o => o.category === activeTab);
  }, [allowedOffers, activeTab]);

  useEffect(() => {
    if (activeTab !== 'all' && !visibleTabs.includes(activeTab)) {
      setActiveTab('all');
    }
  }, [visibleTabs, activeTab]);

  // GESTION DU RAFAICHISSEMENT EN COULISSES
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
        Promise.all([fetchSubscriptions(), fetchPayments(), fetchOffers()]),
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
  const hasActiveSub = subscriptions.some((sub) => sub.status === 'actif');

  const isOfferSubscribed = (offerId: string) => {
    return subscriptions.some((sub) => sub.offre_id === offerId && sub.status === 'actif');
  };

  const openPayment = (offer: Offer) => {
    const activePatient = patients.length > 0 ? patients[0] : null;
    const patientId = activePatient?.id || null;

    if (hasActiveSub) {
      toast.error('Vous disposez déjà d\'un forfait actif');
      return;
    }

    setSelectedOffer(offer);
    setSelectedPatientId(patientId);
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = async () => {
    await fetchSubscriptions();
    await fetchPayments();
    await fetchOffers();
    setIsPaymentOpen(false);
    toast.success('Paiement effectué avec succès !');
  };

  // ✅ CORRIGÉ : Remplacement de filteredOffers par allowedOffers pour l'analyse des métriques
  const stats = useMemo(() => {
    return {
      total: allowedOffers.length,
      senior: allowedOffers.filter((o: Offer) => o.category === 'senior').length,
      maman: allowedOffers.filter((o: Offer) => o.category === 'maman_bebe').length,
      pack: allowedOffers.filter((o: Offer) => o.category === 'pack_confort').length,
    };
  }, [allowedOffers]);

  const isLoading = storeLoading || offersLoading;

  // Libellés de catégories intelligents selon le type de compte
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
      return "Sélectionnez une formule d'accompagnement pour organiser vos propres visites de soutien, de convalescence après hospitalisation ou de livraison.";
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

  // 🦸 VUE AIDANT ÉPURÉE
  if (isAidantRole) {
    return (
      <div className="max-w-5xl mx-auto pb-6">
        <section className="bg-white dark:bg-[#17231d] rounded-2xl py-14 px-6 text-center border border-gray-100 dark:border-[#2c3f35] max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#24362d] flex items-center justify-center text-gray-400 mx-auto">
            <ShieldCheck size={22} style={{ color: colors.primary }} />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Espace Intervenant homologué</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed">
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
      
      {/* INDICATEUR REFRESH */}
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

      {/* HEADER ÉDITORIAL */}
      <section className="relative overflow-hidden bg-white/60 dark:bg-[#17231d]/60 border border-gray-100/80 dark:border-gray-800/40 rounded-2xl p-6 text-center shadow-sm backdrop-blur-md">
        <div className="space-y-1.5 relative z-10">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-gray-800 dark:text-gray-100">
            Forfaits & Abonnements
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm mx-auto leading-relaxed">
            {getSubTitleText()}
          </p>
        </div>

        <button
          onClick={async () => {
            toast.promise(
              Promise.all([fetchSubscriptions(), fetchPayments(), fetchOffers()]),
              {
                loading: 'Mise à jour...',
                success: 'Crédits et dossiers synchronisés !',
                error: 'Échec de la mise à jour',
              }
            );
          }}
          disabled={isLoading}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-gray-50 dark:bg-[#24362d] flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
          title="Actualiser"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </section>

      {/* ABONNEMENT ACTIF */}
      {activeSubscription && (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 shadow-md border border-gray-800">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Formule active
              </span>
              <h2 className="text-base font-black tracking-tight">
                {activeSubscription.offre?.name || 'Abonnement actif'}
              </h2>
              <p className="text-xs text-gray-300 font-medium leading-relaxed">
                Renouvellement le {new Date(activeSubscription.end_date).toLocaleDateString('fr-FR')}
                {activeSubscription.auto_renew && ' • Reconduction automatique active'}
              </p>
            </div>
            <div className="sm:text-right shrink-0 space-y-1">
              <p className="text-lg font-black tracking-tight">
                {(activeSubscription.offre?.price || 0).toLocaleString()} FCFA
              </p>
              <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {activeSubscription.remaining_visits} visite(s) restantes
              </span>
            </div>
          </div>
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        </section>
      )}

      {/* ONGLETS COHÉRENTS */}
      {visibleTabsList.length > 1 && (
        <section className="w-full overflow-x-auto scrollbar-none py-1">
          <div className="inline-flex p-1 bg-gray-100/80 dark:bg-[#1c2a21]/50 rounded-2xl border border-gray-200/10 dark:border-[#2c3f35]/20 gap-1">
            {visibleTabsList.map((tabId) => {
              const isActive = activeTab === tabId;

              return (
                <button
                  key={tabId}
                  onClick={() => setActiveTab(tabId as any)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap select-none flex items-center gap-1.5",
                    isActive
                      ? "bg-white dark:bg-[#17231d] text-gray-900 dark:text-white shadow-sm font-extrabold"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                  )}
                  style={isActive ? { color: colors.primary } : undefined}
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
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedOffers.map((offer: Offer) => (
            <OfferCardCompact
              key={offer.id}
              offer={offer}
              color={colors.primary}
              textColor={colors.text}
              isSubscribed={isOfferSubscribed(offer.id)}
              hasActiveSubscription={hasActiveSub}
              onChoose={() => openPayment(offer)}
              isPersonalAccount={isPersonalAccount}
              hasSeniorPatient={hasSeniorPatient}
            />
          ))}
        </section>
      ) : (
        <div className="col-span-full bg-white dark:bg-[#17231d] rounded-2xl py-12 px-4 text-center border border-gray-100 dark:border-gray-800/40 max-w-sm mx-auto flex flex-col items-center justify-center gap-3">
          <Package size={24} className="text-gray-400 dark:text-gray-500" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Aucun forfait disponible</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Aucune offre active n'est disponible pour vos critères actuels.</p>
          </div>
        </div>
      )}

      {/* RAPPEL DISCRET : MODE PONCTUEL DISPONIBLE */}
      {!hasActiveSub && (
        <div className="bg-white/40 dark:bg-[#17231d]/40 rounded-xl p-4 border border-gray-100 dark:border-gray-800/30 flex items-start gap-3 backdrop-blur-sm max-w-md mx-auto">
          <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">
              {isPersonalAccount ? 'Formules pour vous-même' : 'Mode ponctuel disponible'}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal">
              {isPersonalAccount 
                ? "Vous pouvez activer un forfait d'accompagnement pour votre propre compte ou régler à l'acte chaque course de livraison d'urgence (à partir de 2 500 FCFA)."
                : "Vous pouvez régler directement à l'acte chaque course d'urgence (à partir de 2 500 FCFA) ou vos visites de confort."}
            </p>
          </div>
        </div>
      )}

      {/* HISTORIQUE DE TRANSACTIONS */}
      <section className="bg-white dark:bg-[#17231d] rounded-2xl p-5 border border-gray-100 dark:border-gray-800/50 shadow-sm">
        <div className="flex items-center justify-between border-b dark:border-gray-800/40 pb-3 mb-4">
          <h2 className="text-xs font-black tracking-wider uppercase text-gray-400">
            Historique des paiements
          </h2>
          <span className="text-[10px] font-black text-gray-400 px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800">{payments.length} txn</span>
        </div>

        {payments.length > 0 ? (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {payments.slice(0, 5).map((payment: any) => (
              <PaymentItem key={payment.id} payment={payment} colors={colors} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <CreditCard size={20} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-[10px] text-gray-400">Aucune transaction enregistrée</p>
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

// =============================================
// COMPOSANT COMPACT CARTE OFFRES
// =============================================

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
      className="bg-white dark:bg-[#17231d] rounded-2xl p-5 shadow-sm border flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:translate-y-[-1px]"
      style={{
        borderColor: offer.badge ? badgeColor : 'transparent',
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
            <h3 className="font-extrabold text-sm truncate text-gray-900 dark:text-gray-100">
              {offer.name}
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-0.5">
              {getCategoryLabel()}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-xl font-black text-gray-900 dark:text-white">
            {offer.price.toLocaleString()}
          </span>
          <span className="text-xs text-gray-400 font-bold">FCFA</span>
          {offer.period && <span className="text-xs text-gray-400 font-medium ml-1">/ {offer.period}</span>}
        </div>

        {offer.features && offer.features.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100/60 dark:border-gray-800/40 space-y-1.5">
            {offer.features.slice(0, 2).map((feature: string, index: number) => (
              <div key={index} className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                <CheckCircle size={12} style={{ color: badgeColor }} className="shrink-0 mt-0.5" />
                <span className="truncate leading-tight font-medium">{feature}</span>
              </div>
            ))}
            {offer.features.length > 2 && (
              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold block pt-1">+{offer.features.length - 2} prestations incluses</span>
            )}
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

// =============================================
// COMPOSANT COMPACT TRANSACTIONS
// =============================================

interface PaymentItemProps {
  payment: any;
  colors: any;
}

const PaymentItem = ({ payment, colors }: PaymentItemProps) => {
  const isValid = payment.status === 'valide';

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/20 p-3 transition-colors hover:bg-gray-50">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 animate-fadeIn"
          style={{
            background: isValid ? '#10b9810a' : '#f59e0b0a',
            color: isValid ? '#10b981' : '#f59e0b',
          }}
        >
          {isValid ? <CheckCircle size={15} /> : <Clock size={15} />}
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100">
            {Number(payment.amount || 0).toLocaleString()} FCFA
          </p>
          <p className="text-[10px] text-gray-400 font-medium">
            Le {new Date(payment.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
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
        {isValid ? 'Payé' : payment.status === 'en_attente' ? 'En cours' : payment.status}
      </span>
    </div>
  );
};

export default BillingPage;
