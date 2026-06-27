// 📁 src/features/billing/pages/BillingPage.tsx
 
import { useEffect, useState } from 'react';
import {
  CreditCard,
  CheckCircle,
  Clock,
  ShieldCheck,
  Calendar,
  Zap,
  Package,
  ArrowRight,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { usePaymentStore } from '@/stores/paymentStore';
import { useOfferStore } from '@/stores/offerStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { PaymentModal } from '../components/PaymentModal';
import { SubscriptionCard } from '@/components/subscriptions/SubscriptionCard';
import { VisitDaysPicker } from '@/components/subscriptions/VisitDaysPicker';
import { Offer } from '@/types';
import toast from 'react-hot-toast';

const BillingPage = () => {
  const { profile, role } = useAuthStore();

  const {
    singular,
    plural,
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
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
  const [showSubscriptions, setShowSubscriptions] = useState(true);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    if (!offersInitialized) {
      fetchOffers();
    }
  }, [offersInitialized, fetchOffers]);

  useEffect(() => {
    fetchSubscriptions();
    fetchPayments();
  }, []);

  useEffect(() => {
    if (offers.length === 0) return;

    let filtered: Offer[] = [];

    switch (activeTab) {
      case 'senior':
        filtered = offers.filter(o => o.category === 'senior' || o.category === 'pack_confort');
        break;
      case 'maman_bebe':
        filtered = offers.filter(o => o.category === 'maman_bebe' || o.category === 'pack_confort');
        break;
      case 'ponctuelle':
        filtered = offers.filter(o => o.category === 'ponctuelle' || o.type === 'ponctuelle');
        break;
      default:
        filtered = offers;
        break;
    }

    setFilteredOffers(filtered);
  }, [offers, activeTab]);

  const activeSubscription = subscriptions.find((sub) => sub.status === 'actif');
  const hasActiveSubscription = subscriptions.some((sub) => sub.status === 'actif');

  const isOfferSubscribed = (offerId: string) => {
    return subscriptions.some((sub) => sub.offre_id === offerId && sub.status === 'actif');
  };

  const openPayment = (offer: Offer) => {
    if (offer.category === 'ponctuelle') {
      setSelectedOffer(offer);
      setIsPaymentOpen(true);
      return;
    }

    if (hasActiveSubscription) {
      toast.error('Vous avez déjà un abonnement actif');
      return;
    }

    setSelectedOffer(offer);
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = async () => {
    await fetchSubscriptions();
    await fetchPayments();
    await fetchOffers();
    setIsPaymentOpen(false);
    toast.success('Paiement effectué avec succès !');
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cet abonnement ?')) return;

    try {
      await cancelSubscription(subscriptionId);
      toast.success('Abonnement annulé');
      fetchSubscriptions();
    } catch (error) {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const handleManageDays = (subscription: any) => {
    setSelectedSubscription(subscription);
    setShowDayPicker(true);
  };

  const stats = {
    total: offers.length,
    senior: offers.filter((o) => o.category === 'senior').length,
    maman: offers.filter((o) => o.category === 'maman_bebe').length,
    ponctuelle: offers.filter((o) => o.category === 'ponctuelle' || o.type === 'ponctuelle').length,
  };

  const isLoading = storeLoading || offersLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-48 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-32 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  const userCategory = profile?.patient_category;
  const tabs = [
    { id: 'all', label: `Toutes (${stats.total})` },
    { id: 'senior', label: `👴 Senior (${stats.senior})` },
    { id: 'maman_bebe', label: `👶 Maman (${stats.maman})` },
    { id: 'ponctuelle', label: `⚡ Ponctuelle (${stats.ponctuelle})` },
  ];

  // ✅ Filtrer les tabs selon le rôle
  const visibleTabs = userCategory
    ? tabs.filter(t => t.id === 'all' || t.id === userCategory || t.id === 'ponctuelle')
    : tabs;

  return (
    <div className="space-y-4 pb-24 sm:pb-10">
      {/* HEADER */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-1.5"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <CreditCard size={12} />
              {isFamily ? 'Abonnement Proches' : isAidant ? 'Abonnement Aidant' : 'Abonnement'}
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              💳 Paiements & Abonnements
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {subscriptions.length} abonnement{subscriptions.length > 1 ? 's' : ''} actif{subscriptions.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </section>

      {/* ABONNEMENT ACTIF (résumé compact) */}
      {activeSubscription && (
        <section
          className="bg-white rounded-xl p-3 shadow-sm border-l-4"
          style={{ borderLeftColor: '#4CAF50' }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: '#4CAF5015', color: '#4CAF50' }}
              >
                <ShieldCheck size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-green-600">✅ Actif</p>
                <p className="text-sm font-medium truncate" style={{ color: colors.text }}>
                  {activeSubscription.offre?.name || 'Abonnement'}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  Expire le {new Date(activeSubscription.end_date).toLocaleDateString('fr-FR')}
                  {activeSubscription.auto_renew && ' • 🔄 Auto'}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold" style={{ color: colors.primary }}>
                {(activeSubscription.offre?.price || 0).toLocaleString()} FCFA
              </p>
              <p className="text-[10px] text-gray-400">
                📅 {activeSubscription.remaining_visits} visites
              </p>
            </div>
          </div>
        </section>
      )}

      {/* TABS COMPACTS */}
      <section className="bg-white rounded-2xl p-2 shadow-sm border border-black/5">
        <div className="flex gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === tab.id ? 'text-white' : 'text-gray-600'
              }`}
              style={{
                background: activeTab === tab.id ? colors.primary : 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* OFFRES */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredOffers.length > 0 ? (
          filteredOffers.map((offer) => (
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
          <div className="col-span-full bg-white rounded-2xl p-6 text-center shadow-sm border border-black/5">
            <CreditCard size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold" style={{ color: colors.text }}>
              Aucune offre disponible
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {activeTab === 'all'
                ? "Aucune offre n'est disponible pour le moment."
                : 'Aucune offre dans cette catégorie.'}
            </p>
          </div>
        )}
      </section>

      {/* HISTORIQUE */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: colors.text }}>
            Historique des paiements
          </h2>
          <span className="text-xs text-gray-400">{payments.length} paiement(s)</span>
        </div>

        {payments.length > 0 ? (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {payments.slice(0, 5).map((payment) => (
              <PaymentItem key={payment.id} payment={payment} colors={colors} />
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <CreditCard size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs text-gray-400">Aucun paiement enregistré</p>
          </div>
        )}
      </section>

      {/* MODALS */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setSelectedOffer(null);
        }}
        offer={selectedOffer}
        onSuccess={handlePaymentSuccess}
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
// OFFER CARD COMPACT
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
    if (isPonctuelle) return '#FF6B00';
    if (offer.category === 'maman_bebe') return '#E8B4B8';
    if (offer.category === 'pack_confort') return '#C9A84C';
    return color;
  };

  const badgeColor = getBadgeColor();

  return (
    <div
      className="bg-white rounded-xl p-3 shadow-sm border transition hover:shadow-md"
      style={{
        borderColor: offer.badge ? badgeColor : 'rgba(0,0,0,0.06)',
        borderWidth: isPonctuelle ? '2px' : '1px',
      }}
    >
      {offer.badge && (
        <span
          className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold text-white mb-2"
          style={{ background: badgeColor }}
        >
          {offer.badge}
        </span>
      )}

      <div className="flex items-start gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
          style={{ background: badgeColor + '15' }}
        >
          {getIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-sm truncate" style={{ color: textColor }}>
            {offer.name}
          </h3>
          <p className="text-[10px] text-gray-400">
            {isPonctuelle ? '⚡ Ponctuelle' : offer.category === 'maman_bebe' ? '👶 Maman' : offer.category === 'pack_confort' ? '⭐ Pack' : '👴 Senior'}
          </p>
        </div>
      </div>

      <div className="mt-2">
        <span className="text-lg font-bold" style={{ color: badgeColor }}>
          {offer.price.toLocaleString()}
        </span>
        <span className="text-xs text-gray-400 ml-1">FCFA</span>
        {offer.period && <span className="text-xs text-gray-400 ml-1">/ {offer.period}</span>}
      </div>

      {offer.features && offer.features.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {offer.features.slice(0, 2).map((feature, index) => (
            <div key={index} className="flex items-center gap-1 text-[10px] text-gray-500">
              <CheckCircle size={10} style={{ color: badgeColor }} />
              <span className="truncate">{feature}</span>
            </div>
          ))}
          {offer.features.length > 2 && (
            <span className="text-[9px] text-gray-400">+{offer.features.length - 2} autres</span>
          )}
        </div>
      )}

      <button
        onClick={onChoose}
        disabled={isDisabled}
        className="mt-3 w-full py-1.5 rounded-lg text-white font-bold text-xs transition hover:opacity-90 disabled:opacity-50"
        style={{ background: isDisabled ? '#9CA3AF' : badgeColor }}
      >
        {isPonctuelle ? 'Demander' : isSubscribed ? '✅ Déjà souscrit' : hasActiveSubscription ? 'Abonnement actif' : 'Choisir'}
      </button>
    </div>
  );
};

// =============================================
// PAYMENT ITEM
// =============================================

interface PaymentItemProps {
  payment: any;
  colors: any;
}

const PaymentItem = ({ payment, colors }: PaymentItemProps) => {
  const isValid = payment.status === 'valide';

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 p-2 border border-black/5">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: isValid ? '#4CAF5015' : '#FF980015',
            color: isValid ? '#4CAF50' : '#FF9800',
          }}
        >
          {isValid ? <CheckCircle size={14} /> : <Clock size={14} />}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-xs truncate" style={{ color: colors.text }}>
            {Number(payment.amount || 0).toLocaleString()} FCFA
          </p>
          <p className="text-[9px] text-gray-400">
            {new Date(payment.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>
      <span
        className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold"
        style={{
          background: isValid ? '#4CAF5015' : '#FF980015',
          color: isValid ? '#4CAF50' : '#FF9800',
        }}
      >
        {isValid ? 'Validé' : payment.status === 'en_attente' ? 'En attente' : payment.status}
      </span>
    </div>
  );
};

export default BillingPage;
