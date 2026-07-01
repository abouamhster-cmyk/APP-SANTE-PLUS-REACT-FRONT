// 📁 src/features/billing/pages/BillingPage.tsx

import { useEffect, useState } from 'react';
import {
  CreditCard,
  CheckCircle,
  Clock,
  ShieldCheck,
  Package,
  User,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { usePaymentStore } from '@/stores/paymentStore';
import { useOfferStore } from '@/stores/offerStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { PaymentModal } from '../components/PaymentModal';
import { VisitDaysPicker } from '@/components/subscriptions/VisitDaysPicker';
import { Offer } from '@/types';
import toast from 'react-hot-toast';

const BillingPage = () => {
  const { profile, role } = useAuthStore();

  const {
    isFamily,
    isAidant,
  } = useTerminology();

  const {
    subscriptions,
    payments,
    isLoading: storeLoading,
    fetchSubscriptions,
    fetchPayments,
    cancelSubscription,
  } = usePaymentStore();

  const {
    offers,
    isLoading: offersLoading,
    fetchOffers,
    isInitialized: offersInitialized,
  } = useOfferStore();

  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'senior' | 'maman_bebe' | 'ponctuelle'>('all');
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);

  // ✅ AJOUTER CES ÉTATS MANQUANTS
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Récupérer la catégorie du patient
  const patientCategory = profile?.patient_category;

  // ✅ Déterminer si c'est un compte personnel
  const isPersonalAccount = role === 'family' && !patientCategory;

  // ✅ Déterminer si c'est un aidant
  const isAidantRole = role === 'aidant';

  useEffect(() => {
    if (!offersInitialized) {
      fetchOffers();
    }
  }, [offersInitialized, fetchOffers]);

  useEffect(() => {
    fetchSubscriptions();
    fetchPayments();
  }, []);

  // ✅ FILTRAGE DES OFFRES SELON LE TYPE DE COMPTE
  useEffect(() => {
    if (offers.length === 0) return;

    let filtered: Offer[] = [];

    // 🚫 AIDANT → Aucune offre
    if (isAidantRole) {
      setFilteredOffers([]);
      return;
    }

    // ✅ ADMIN/COORD → Toutes les offres
    if (role === 'admin' || role === 'coordinator') {
      filtered = offers;
      setFilteredOffers(filtered);
      return;
    }

    // ✅ COMPTE PERSONNEL → Uniquement Pack Confort
    if (isPersonalAccount) {
      filtered = offers.filter((o: Offer) => 
        o.category === 'pack_confort' || 
        o.type === 'ponctuelle' ||
        o.id?.startsWith('ponctual-')
      );
      setFilteredOffers(filtered);
      return;
    }

    // ✅ COMPTE SENIOR → Senior + Pack Confort
    if (patientCategory === 'senior') {
      filtered = offers.filter((o: Offer) => 
        o.category === 'senior' || 
        o.category === 'pack_confort' ||
        o.type === 'ponctuelle' ||
        o.id?.startsWith('ponctual-')
      );
      setFilteredOffers(filtered);
      return;
    }

    // ✅ COMPTE MAMAN & BÉBÉ → Maman & Bébé + Pack Confort
    if (patientCategory === 'maman_bebe') {
      filtered = offers.filter((o: Offer) => 
        o.category === 'maman_bebe' || 
        o.category === 'pack_confort' ||
        o.type === 'ponctuelle' ||
        o.id?.startsWith('ponctual-')
      );
      setFilteredOffers(filtered);
      return;
    }

    // Fallback → Toutes les offres
    filtered = offers;
    setFilteredOffers(filtered);
  }, [offers, patientCategory, role, isAidantRole, isPersonalAccount]);

  // ✅ Filtrer les onglets visibles
  const getVisibleTabs = (): ('all' | 'senior' | 'maman_bebe' | 'ponctuelle')[] => {
    if (isAidantRole) return [];
    if (isPersonalAccount) return ['all', 'ponctuelle'];
    if (patientCategory === 'senior') return ['all', 'senior', 'ponctuelle'];
    if (patientCategory === 'maman_bebe') return ['all', 'maman_bebe', 'ponctuelle'];
    return ['all', 'senior', 'maman_bebe', 'ponctuelle'];
  };

  const activeSubscription = subscriptions.find((sub) => sub.status === 'actif');
  const hasActiveSubscription = subscriptions.some((sub) => sub.status === 'actif');

  const isOfferSubscribed = (offerId: string) => {
    return subscriptions.some((sub) => sub.offre_id === offerId && sub.status === 'actif');
  };

  const openPayment = (offer: Offer) => {
    // ✅ Si c'est une offre ponctuelle
    if (offer.category === 'ponctuelle' || offer.type === 'ponctuelle') {
      setSelectedOffer(offer);
      // ✅ orderData = null pour les paiements directs sans commande
      setPendingOrderData(null);
      setIsPaymentOpen(true);
      return;
    }

    if (hasActiveSubscription) {
      toast.error('Vous avez déjà un abonnement actif');
      return;
    }

    setSelectedOffer(offer);
    // ✅ orderData = null pour les abonnements
    setPendingOrderData(null);
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = async () => {
    await fetchSubscriptions();
    await fetchPayments();
    await fetchOffers();
    setIsPaymentOpen(false);
    toast.success('Paiement effectué avec succès !');
  };

  // ✅ Statistiques avec types explicites
  const stats = {
    total: offers.length,
    senior: offers.filter((o: Offer) => o.category === 'senior').length,
    maman: offers.filter((o: Offer) => o.category === 'maman_bebe').length,
    ponctuelle: offers.filter((o: Offer) => o.category === 'ponctuelle' || o.type === 'ponctuelle').length,
  };

  const isLoading = storeLoading || offersLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-8">
        <div className="h-28 bg-white rounded-3xl animate-pulse shadow-sm" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-44 bg-white rounded-2xl animate-pulse shadow-sm" />
          ))}
        </div>
        <div className="h-32 bg-white rounded-3xl animate-pulse shadow-sm" />
      </div>
    );
  }

  // ✅ Si l'utilisateur est un aidant, afficher un message
  if (isAidantRole) {
    return (
      <div className="max-w-5xl mx-auto pb-8">
        <section className="bg-white rounded-3xl p-8 text-center shadow-sm border border-black/5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: colors.primary + '15' }}>
            <ShieldCheck size={32} style={{ color: colors.primary }} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: colors.text }}>
            🦸 Espace Aidant
          </h2>
          <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: colors.text + '70' }}>
            En tant qu'aidant, vous n'avez pas besoin de souscrire d'abonnement. 
            Les visites et commandes vous sont assignées par l'administration.
          </p>
          <p className="text-xs mt-4" style={{ color: colors.text + '50' }}>
            Vous pouvez consulter vos missions dans l'onglet "Missions" et "Commandes".
          </p>
        </section>
      </div>
    );
  }

  const visibleTabs = getVisibleTabs();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 sm:pb-8">
      {/* HEADER */}
      <section 
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.primary}12 100%)`,
        }}
      >
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <CreditCard size={11} />
              {isPersonalAccount ? 'Abonnement Confort' : isFamily ? 'Abonnement Proches' : 'Facturation'}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: colors.text }}>
              Paiements & Abonnements
            </h1>

            <p className="text-xs" style={{ color: colors.textLight }}>
              {subscriptions.length} formule{subscriptions.length > 1 ? 's' : ''} souscrite{subscriptions.length > 1 ? 's' : ''} au total
            </p>
          </div>
        </div>
      </section>

      {/* ABONNEMENT ACTIF */}
      {activeSubscription && (
        <section
          className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border-l-4 transition-all"
          style={{ borderLeftColor: '#10b981' }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#10b9810f', color: '#10b981' }}
              >
                <ShieldCheck size={18} />
              </div>
              <div className="min-w-0 space-y-0.5">
                <span className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase">Actif</span>
                <h2 className="text-sm font-extrabold truncate" style={{ color: colors.text }}>
                  {activeSubscription.offre?.name || 'Abonnement actif'}
                </h2>
                <p className="text-[10px] text-gray-400 truncate">
                  Renouvellement le {new Date(activeSubscription.end_date).toLocaleDateString('fr-FR')}
                  {activeSubscription.auto_renew && ' • 🔄 Reconductible'}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 space-y-0.5">
              <p className="text-base font-extrabold" style={{ color: colors.primary }}>
                {(activeSubscription.offre?.price || 0).toLocaleString()} FCFA
              </p>
              <p className="text-[10px] text-gray-400 font-medium">
                📅 {activeSubscription.remaining_visits} visites restantes
              </p>
            </div>
          </div>
        </section>
      )}

      {/* FILTRES PAR CATÉGORIES */}
      {visibleTabs.length > 0 && (
        <section className="bg-white rounded-2xl p-2 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {visibleTabs.map((tabId) => {
              // ✅ Calcul des comptes avec types explicites
              const counts = {
                'all': filteredOffers.length,
                'senior': offers.filter((o: Offer) => o.category === 'senior' || o.category === 'pack_confort').length,
                'maman_bebe': offers.filter((o: Offer) => o.category === 'maman_bebe' || o.category === 'pack_confort').length,
                'ponctuelle': offers.filter((o: Offer) => o.category === 'ponctuelle' || o.type === 'ponctuelle').length,
              };

              const label = {
                'all': `Toutes (${counts.all})`,
                'senior': `👴 Senior (${counts.senior})`,
                'maman_bebe': `👶 Maman (${counts.maman_bebe})`,
                'ponctuelle': `⚡ Ponctuelle (${counts.ponctuelle})`,
              }[tabId] || tabId;

              return (
                <button
                  key={tabId}
                  onClick={() => setActiveTab(tabId as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap`}
                  style={{
                    background: activeTab === tabId ? colors.primary : 'transparent',
                    color: activeTab === tabId ? '#ffffff' : '#64748b',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* GRILLE DES OFFRES DISPONIBLES */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOffers.length > 0 ? (
          filteredOffers.map((offer: Offer) => (
            <OfferCardCompact
              key={offer.id}
              offer={offer}
              color={colors.primary}
              textColor={colors.text}
              isSubscribed={isOfferSubscribed(offer.id)}
              hasActiveSubscription={hasActiveSubscription}
              onChoose={() => openPayment(offer)}
            />
          ))
        ) : (
          <div className="col-span-full bg-white rounded-3xl p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <Package size={28} className="mx-auto mb-3 text-gray-300" />
            <p className="text-xs font-bold" style={{ color: colors.text }}>
              Aucun service disponible
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {isAidantRole
                ? 'En tant qu\'aidant, vous n\'avez pas accès aux abonnements.'
                : isPersonalAccount
                  ? 'Aucune offre Pack Confort disponible pour le moment.'
                  : 'Aucune offre disponible pour votre type de compte.'}
            </p>
          </div>
        )}
      </section>

      {/* HISTORIQUE DES TRANSACTIONS */}
      <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.025)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold tracking-wider uppercase text-gray-400">
            Historique des paiements
          </h2>
          <span className="text-[10px] font-bold text-gray-400 px-2 py-0.5 rounded-full bg-gray-50">{payments.length} transaction(s)</span>
        </div>

        {payments.length > 0 ? (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {payments.slice(0, 5).map((payment: any) => (
              <PaymentItem key={payment.id} payment={payment} colors={colors} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <CreditCard size={24} className="mx-auto mb-2 text-gray-300" />
            <p className="text-[11px] text-gray-400">Aucun historique de paiement</p>
          </div>
        )}
      </section>

      {/* MODALS */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setSelectedOffer(null);
          setPendingOrderData(null);
        }}
        offer={selectedOffer}
        onSuccess={handlePaymentSuccess}
        orderData={pendingOrderData}
        forcePonctual={selectedOffer?.category === 'ponctuelle' || selectedOffer?.type === 'ponctuelle'}
      />

      {showDayPicker && selectedSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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
// COMPOSANT CARTE OFFRE ÉPURÉE
// =============================================

interface OfferCardCompactProps {
  offer: Offer;
  color: string;
  textColor: string;
  isSubscribed: boolean;
  hasActiveSubscription: boolean;
  onChoose: () => void;
}

const OfferCardCompact = ({
  offer,
  color,
  textColor,
  isSubscribed,
  hasActiveSubscription,
  onChoose,
}: OfferCardCompactProps) => {
  const isPonctuelle = offer.category === 'ponctuelle' || offer.type === 'ponctuelle';
  const isDisabled = isPonctuelle ? false : (isSubscribed || hasActiveSubscription);

  const getIcon = () => {
    if (isPonctuelle) return '⚡';
    if (offer.category === 'maman_bebe') return '👶';
    if (offer.category === 'pack_confort') return '⭐';
    return '👴';
  };

  const getBadgeColor = () => {
    if (isPonctuelle) return '#f59e0b';
    if (offer.category === 'maman_bebe') return '#db4a6d';
    if (offer.category === 'pack_confort') return '#d4af37';
    return color;
  };

  const badgeColor = getBadgeColor();

  return (
    <div
      className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.035)] flex flex-col justify-between"
      style={{
        borderColor: offer.badge ? badgeColor : 'transparent',
        borderWidth: offer.badge ? '1.5px' : '1px',
      }}
    >
      <div>
        {offer.badge && (
          <span
            className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold text-white mb-2.5"
            style={{ background: badgeColor }}
          >
            {offer.badge}
          </span>
        )}

        <div className="flex items-start gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0"
            style={{ background: badgeColor + '0f' }}
          >
            {getIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-sm truncate" style={{ color: textColor }}>
              {offer.name}
            </h3>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
              {isPonctuelle ? '⚡ Service Ponctuel' : offer.category === 'maman_bebe' ? '👶 Accompagnement Maman' : offer.category === 'pack_confort' ? '⭐ Pack Confort' : '👴 Accompagnement Senior'}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-xl font-black" style={{ color: badgeColor }}>
            {offer.price.toLocaleString()}
          </span>
          <span className="text-xs text-gray-400 font-bold">FCFA</span>
          {offer.period && <span className="text-xs text-gray-400 font-medium ml-0.5">/ {offer.period}</span>}
        </div>

        {offer.features && offer.features.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-50 space-y-1.5">
            {offer.features.slice(0, 2).map((feature: string, index: number) => (
              <div key={index} className="flex items-start gap-2 text-xs text-gray-500">
                <CheckCircle size={12} style={{ color: badgeColor }} className="shrink-0 mt-0.5" />
                <span className="truncate leading-tight">{feature}</span>
              </div>
            ))}
            {offer.features.length > 2 && (
              <span className="text-[9px] text-gray-400 font-semibold block pt-0.5">+{offer.features.length - 2} autres prestations</span>
            )}
          </div>
        )}
      </div>

      <button
        onClick={onChoose}
        disabled={isDisabled}
        className="mt-4 w-full py-2.5 rounded-xl text-white font-bold text-xs transition-all hover:opacity-95 disabled:opacity-75"
        style={{ background: isDisabled ? '#cbd5e1' : badgeColor }}
      >
        {isPonctuelle ? 'Commander' : isSubscribed ? '✅ Formule active' : hasActiveSubscription ? 'Abonnement en cours' : 'Choisir cette offre'}
      </button>
    </div>
  );
};

// =============================================
// COMPOSANT LIGNE DE TRANSACTIONS
// =============================================

interface PaymentItemProps {
  payment: any;
  colors: any;
}

const PaymentItem = ({ payment, colors }: PaymentItemProps) => {
  const isValid = payment.status === 'valide';

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
          <p className="text-[10px] text-gray-400 font-medium">
            Le {new Date(payment.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
      <span
        className="shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold"
        style={{
          background: isValid ? '#10b98112' : '#f59e0b12',
          color: isValid ? '#10b981' : '#f59e0b',
        }}
      >
        {isValid ? 'Payé' : payment.status === 'en_attente' ? 'En traitement' : payment.status}
      </span>
    </div>
  );
};

export default BillingPage;
