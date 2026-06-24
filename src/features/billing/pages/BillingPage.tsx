// 📁 src/features/billing/pages/BillingPage.tsx

import { useEffect, useState } from 'react';
import {
  CreditCard,
  CheckCircle,
  Clock,
  ShieldCheck,
  Calendar,
  Zap,
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

  // ✅ Jargon dynamique selon le rôle
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
    getOffersByCategory,
    getPonctualOffers,
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

  // ✅ Charger les offres depuis le store
  useEffect(() => {
    if (!offersInitialized) {
      fetchOffers();
    }
  }, [offersInitialized, fetchOffers]);

  // ✅ Charger les abonnements et paiements
  useEffect(() => {
    fetchSubscriptions();
    fetchPayments();
  }, []);

  // ✅ Filtrer les offres selon l'onglet actif
  useEffect(() => {
    if (offers.length === 0) return;

    let filtered: Offer[] = [];

    switch (activeTab) {
      case 'senior':
        filtered = offers.filter(o => 
          o.category === 'senior' || 
          o.category === 'pack_confort'
        );
        break;
      case 'maman_bebe':
        filtered = offers.filter(o => 
          o.category === 'maman_bebe' || 
          o.category === 'pack_confort'
        );
        break;
      case 'ponctuelle':
        filtered = offers.filter(o => 
          o.category === 'ponctuelle' || 
          o.type === 'ponctuelle'
        );
        break;
      default:
        filtered = offers;
        break;
    }

    setFilteredOffers(filtered);
  }, [offers, activeTab]);

  const activeSubscription = subscriptions.find((sub) => sub.status === 'actif');

  const isOfferSubscribed = (offerId: string) => {
    return subscriptions.some(
      (sub) => sub.offre_id === offerId && sub.status === 'actif'
    );
  };

  const hasActiveSubscription = subscriptions.some((sub) => sub.status === 'actif');

  // ✅ Libellés dynamiques
  const getPageTitle = () => {
    if (isFamily) return 'Abonnements - Proches';
    if (isAidant) return 'Abonnements - Personnes accompagnées';
    if (isAdminOrCoordinator) return 'Abonnements - Bénéficiaires';
    return 'Paiements';
  };

  const getPageDescription = () => {
    if (isFamily) {
      return 'Choisissez une offre adaptée à vos besoins pour accompagner vos proches.';
    }
    if (isAidant) {
      return 'Gérez vos abonnements pour les personnes que vous accompagnez.';
    }
    if (isAdminOrCoordinator) {
      return 'Consultez les abonnements des bénéficiaires.';
    }
    return 'Choisissez une offre adaptée à vos besoins.';
  };

  const getBeneficiaryLabel = () => {
    if (isFamily) return 'pour votre proche';
    if (isAidant) return 'pour la personne accompagnée';
    if (isAdminOrCoordinator) return 'pour le bénéficiaire';
    return '';
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
    // Rafraîchir les offres au cas où
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

  // ✅ Statistiques dynamiques
  const stats = {
    total: offers.length,
    senior: offers.filter((o) => o.category === 'senior').length,
    maman: offers.filter((o) => o.category === 'maman_bebe').length,
    pack: offers.filter((o) => o.category === 'pack_confort').length,
    ponctuelle: offers.filter((o) => o.category === 'ponctuelle' || o.type === 'ponctuelle').length,
  };

  const renderTabs = () => {
    const userCategory = profile?.patient_category;
    if (userCategory) {
      const label = userCategory === 'maman_bebe' ? '👶 Maman & Bébé' : '👴 Senior';
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="px-4 py-2 rounded-full text-sm font-bold"
            style={{
              background: colors.primary + '15',
              color: colors.primary,
            }}
          >
            {label}
          </span>
          <span className="text-xs text-gray-500">
            Offres adaptées à votre profil
          </span>
          <button
            onClick={() => setActiveTab('ponctuelle')}
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${
              activeTab === 'ponctuelle' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
            style={{
              background: activeTab === 'ponctuelle' ? colors.primary : 'transparent',
            }}
          >
            ⚡ Ponctuelle ({stats.ponctuelle})
          </button>
        </div>
      );
    }

    return (
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition ${
            activeTab === 'all' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
          style={{
            background: activeTab === 'all' ? colors.primary : 'transparent',
          }}
        >
          Toutes ({stats.total})
        </button>
        <button
          onClick={() => setActiveTab('senior')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition ${
            activeTab === 'senior' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
          style={{
            background: activeTab === 'senior' ? colors.primary : 'transparent',
          }}
        >
          👴 Senior ({stats.senior})
        </button>
        <button
          onClick={() => setActiveTab('maman_bebe')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition ${
            activeTab === 'maman_bebe' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
          style={{
            background: activeTab === 'maman_bebe' ? colors.primary : 'transparent',
          }}
        >
          👶 Maman & Bébé ({stats.maman})
        </button>
        <button
          onClick={() => setActiveTab('ponctuelle')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition ${
            activeTab === 'ponctuelle' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
          style={{
            background: activeTab === 'ponctuelle' ? colors.primary : 'transparent',
          }}
        >
          ⚡ Ponctuelle ({stats.ponctuelle})
        </button>
      </div>
    );
  };

  const isLoading = storeLoading || offersLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-64 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-40 bg-white rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 pb-8">
        {/* HEADER */}
        <section className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-black/5">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-2"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <CreditCard size={13} />
              {isFamily ? 'Abonnement Proches' : isAidant ? 'Abonnement Aidant' : 'Abonnement'}
            </div>

            <h1 className="text-2xl font-black leading-tight" style={{ color: colors.text }}>
              {getPageTitle()}
            </h1>

            <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
              {getPageDescription()}
            </p>

            {offers.length === 0 && (
              <p className="text-sm mt-2 text-yellow-600">
                ⚠️ Aucune offre n'est actuellement disponible. Contactez l'administrateur.
              </p>
            )}
          </div>
        </section>

        {/* ABONNEMENTS ACTIFS */}
        {subscriptions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: colors.text }}>
                📋 Mes abonnements
              </h2>
              <button
                onClick={() => setShowSubscriptions(!showSubscriptions)}
                className="text-sm font-medium transition hover:opacity-80"
                style={{ color: colors.primary }}
              >
                {showSubscriptions ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            {showSubscriptions && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subscriptions.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    colors={colors}
                    onRenew={() => {
                      toast.success('Fonctionnalité de renouvellement à venir');
                    }}
                    onCancel={() => handleCancelSubscription(sub.id)}
                    onManageDays={() => handleManageDays(sub)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ABONNEMENT ACTIF (résumé) */}
        {activeSubscription && (
          <section
            className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border-l-4"
            style={{ borderLeftColor: '#4CAF50' }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: '#4CAF5015', color: '#4CAF50' }}
                >
                  <ShieldCheck size={21} />
                </div>
                <div>
                  <p className="text-xs font-bold text-green-600">✅ Abonnement actif</p>
                  <h2 className="font-black" style={{ color: colors.text }}>
                    {activeSubscription.offre?.name || 'Abonnement'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Expire le {new Date(activeSubscription.end_date).toLocaleDateString('fr-FR')}
                    {activeSubscription.auto_renew && (
                      <span className="ml-2 text-xs text-green-600">• Renouvellement automatique</span>
                    )}
                  </p>
                  {activeSubscription.remaining_visits !== undefined && (
                    <p className="text-sm mt-1" style={{ color: colors.primary }}>
                      📅 {activeSubscription.remaining_visits} visites restantes
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xl font-black" style={{ color: colors.primary }}>
                  {(activeSubscription.offre?.price || 0).toLocaleString()} FCFA
                </p>
                <span className="text-xs text-gray-500">/ {activeSubscription.offre?.type || 'mois'}</span>
              </div>
            </div>
          </section>
        )}

        {/* ONGLETS */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
          {renderTabs()}
        </section>

        {/* OFFRES */}
        <section>
          {filteredOffers.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {filteredOffers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  color={colors.primary}
                  textColor={colors.text}
                  isSubscribed={isOfferSubscribed(offer.id)}
                  hasActiveSubscription={hasActiveSubscription}
                  onChoose={() => openPayment(offer)}
                  beneficiaryLabel={getBeneficiaryLabel()}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-black/5">
              <CreditCard size={48} className="mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-black" style={{ color: colors.text }}>
                Aucune offre disponible
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {activeTab === 'all'
                  ? "Aucune offre n'est disponible pour le moment. Contactez l'administrateur."
                  : 'Aucune offre dans cette catégorie.'}
              </p>
            </div>
          )}
        </section>

        {/* HISTORIQUE */}
        <section className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-black/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black" style={{ color: colors.text }}>
                Historique des paiements
              </h2>
              <p className="text-sm text-gray-500">
                {payments.length} paiement{payments.length > 1 ? 's' : ''} effectué
                {payments.length > 1 ? 's' : ''}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: colors.primary + '12', color: colors.primary }}
            >
              <CreditCard size={20} />
            </div>
          </div>

          {payments.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {payments.slice(0, 10).map((payment) => (
                <PaymentItem key={payment.id} payment={payment} colors={colors} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-gray-50 p-6 text-center">
              <CreditCard size={34} className="mx-auto mb-2 opacity-30" />
              <p className="font-semibold" style={{ color: colors.text }}>
                Aucun paiement
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Les paiements validés apparaîtront ici.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* MODAL DE PAIEMENT */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setSelectedOffer(null);
        }}
        offer={selectedOffer}
        onSuccess={handlePaymentSuccess}
      />

      {/* MODAL CHOIX DES JOURS DE VISITE */}
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
    </>
  );
};

// =============================================
// OFFER CARD
// =============================================

interface OfferCardProps {
  offer: Offer;
  color: string;
  textColor: string;
  isSubscribed: boolean;
  hasActiveSubscription: boolean;
  onChoose: () => void;
  beneficiaryLabel?: string;
}

const OfferCard = ({
  offer,
  color,
  textColor,
  isSubscribed,
  hasActiveSubscription,
  onChoose,
  beneficiaryLabel = '',
}: OfferCardProps) => {
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

  const getButtonText = () => {
    if (isPonctuelle) return 'Demander cette intervention';
    if (isSubscribed) return '✅ Déjà souscrit';
    if (hasActiveSubscription) return 'Abonnement actif';
    return `Choisir ce pack ${beneficiaryLabel}`;
  };

  return (
    <div
      className="relative bg-white rounded-2xl p-5 shadow-sm border transition hover:shadow-md flex flex-col"
      style={{
        borderColor: offer.badge ? badgeColor : 'rgba(0,0,0,0.06)',
        borderWidth: isPonctuelle ? '2px' : '1px',
      }}
    >
      {offer.badge && (
        <div className="absolute top-3 right-3">
          <span
            className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ background: badgeColor }}
          >
            {offer.badge}
          </span>
        </div>
      )}

      {isPonctuelle && (
        <div className="absolute top-3 left-3">
          <span
            className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-1"
            style={{ background: '#FF6B00' }}
          >
            <Zap size={12} />
            Sans engagement
          </span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
          style={{ background: badgeColor + '15' }}
        >
          {getIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-black leading-tight" style={{ color: textColor }}>
            {offer.name}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {isPonctuelle
              ? '⚡ Intervention ponctuelle'
              : offer.category === 'maman_bebe'
              ? '👶 Maman & Bébé'
              : offer.category === 'pack_confort'
              ? '⭐ Pack Confort'
              : '👴 Senior'}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div>
          <span className="text-2xl font-black" style={{ color: badgeColor }}>
            {offer.price.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500 ml-1">FCFA</span>
          {offer.period && (
            <span className="text-sm text-gray-500 ml-1">/ {offer.period}</span>
          )}
        </div>

        {offer.visitsPerWeek && (
          <p className="text-xs text-gray-400 mt-1">
            {offer.visitsPerWeek * 4} visites par mois
          </p>
        )}

        {offer.durationDays && !offer.visitsPerWeek && !isPonctuelle && (
          <p className="text-xs text-gray-400 mt-1">
            {offer.durationDays} jours
          </p>
        )}

        {isPonctuelle && (
          <p className="text-xs text-gray-400 mt-1">
            ⏱️ Intervention unique, sans abonnement
          </p>
        )}
      </div>

      {offer.features && offer.features.length > 0 && (
        <div className="mt-4 space-y-1.5 flex-1">
          {offer.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle size={15} style={{ color: badgeColor }} className="shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onChoose}
        disabled={isDisabled}
        className="mt-5 w-full py-2.5 rounded-xl text-white font-bold text-sm transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ background: isDisabled ? '#9CA3AF' : badgeColor }}
      >
        {getButtonText()}
      </button>

      {isPonctuelle && (
        <p className="text-xs text-center mt-3 text-gray-400">
          Paiement unique, intervention réalisée sous 24h
        </p>
      )}
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
    <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3 border border-black/5">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: isValid ? '#4CAF5015' : '#FF980015',
            color: isValid ? '#4CAF50' : '#FF9800',
          }}
        >
          {isValid ? <CheckCircle size={19} /> : <Clock size={19} />}
        </div>

        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">
            {Number(payment.amount || 0).toLocaleString()} FCFA
          </p>
          <p className="text-xs text-gray-500">
            {new Date(payment.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      <span
        className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold"
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
