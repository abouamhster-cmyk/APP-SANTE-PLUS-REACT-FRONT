// 📁 src/components/onboarding/OnboardingTour.tsx

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  ArrowRight,
  Check,
  Sparkles,
  Users,
  Calendar,
  ShoppingBag,
  Briefcase,
  MessageCircle,
  ShieldCheck,
  CreditCard,
  Loader2,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { cn } from '@/utils/helpers';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  actionPath?: string;
  actionLabel?: string;
  condition?: () => boolean;
  skipCondition?: () => boolean;
}

interface OnboardingTourProps {
  onComplete?: () => void;
}

type TimerType = ReturnType<typeof setTimeout> | null;

// Clés localStorage
const TOUR_STORAGE_KEY = 'sante_plus_tour_seen';
const TOUR_VERSION = '2.0.0';
const LOGIN_COUNT_KEY = 'sante_plus_login_count';

export const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { profile, role, isAuthenticated, isInitialized, user } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();
  const { visits, fetchVisits } = useVisitStore();
  const { orders, fetchOrders } = useOrderStore();

  // ✅ Jargon dynamique selon le rôle
  const {
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    plural,          // "proches" / "personnes accompagnées" / "bénéficiaires"
    add,             // "Ajouter un proche" / "Ajouter une personne" / "Ajouter un bénéficiaire"
    list,            // "Mes proches" / "Mes personnes accompagnées" / "Bénéficiaires"
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [hasAttemptedShow, setHasAttemptedShow] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  const navigationTimeoutRef = useRef<TimerType>(null);
  const showTimeoutRef = useRef<TimerType>(null);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // =============================================
  // 1. VÉRIFICATION DU TOUR DÉJÀ VU ET PREMIÈRE CONNEXION
  // =============================================
  useEffect(() => {
    const saved = localStorage.getItem(TOUR_STORAGE_KEY);
    const loginCount = parseInt(localStorage.getItem(LOGIN_COUNT_KEY) || '0', 10);
    
    if (loginCount === 0 && isAuthenticated) {
      setIsFirstLogin(true);
    }

    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.version === TOUR_VERSION && data.seen === true) {
          setHasSeenTour(true);
        }
      } catch (e) {
        console.warn('Erreur lecture tour:', e);
      }
    }
    setIsReady(true);
  }, [isAuthenticated]);

  // =============================================
  // 2. INCRÉMENTER LE COMPTEUR DE CONNEXIONS
  // =============================================
  useEffect(() => {
    if (isAuthenticated && isInitialized) {
      const currentCount = parseInt(localStorage.getItem(LOGIN_COUNT_KEY) || '0', 10);
      localStorage.setItem(LOGIN_COUNT_KEY, String(currentCount + 1));
      
      if (currentCount === 0) {
        setIsFirstLogin(true);
      }
    }
  }, [isAuthenticated, isInitialized]);

  // =============================================
  // 3. CHARGEMENT DES DONNÉES NÉCESSAIRES
  // =============================================
  useEffect(() => {
    if (!isAuthenticated || !role) return;

    const loadData = async () => {
      setIsLoadingData(true);
      try {
        if (role === 'family') {
          await Promise.all([
            fetchPatients(),
            fetchVisits(),
            fetchOrders(),
          ]);
        } else if (role === 'aidant') {
          await Promise.all([
            fetchVisits(),
            fetchOrders(),
          ]);
        }
      } catch (error) {
        console.warn('Erreur chargement données tour:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [isAuthenticated, role, fetchPatients, fetchVisits, fetchOrders]);

  // =============================================
  // 4. DÉFINITION DES ÉTAPES
  // =============================================
  const steps = useMemo(() => {
    if (!isAuthenticated || !role) return [];

    if (role === 'aidant') {
      return getAidantSteps(visits.length, orders.length);
    }

    if (role === 'family') {
      return getFamilySteps(
        patients.length,
        visits.length,
        orders.length,
        profile?.patient_category,
        { singular, plural, add, list }
      );
    }

    return getDefaultSteps();
  }, [
    isAuthenticated,
    role,
    patients.length,
    visits.length,
    orders.length,
    profile?.patient_category,
    singular,
    plural,
    add,
    list,
  ]);

  const filteredSteps = useMemo(() => {
    return steps.filter((step) => {
      if (step.skipCondition && step.skipCondition()) return false;
      if (step.condition && !step.condition()) return false;
      return true;
    });
  }, [steps]);

  // =============================================
  // 5. DÉCISION D'AFFICHAGE (PREMIÈRE CONNEXION UNIQUEMENT)
  // =============================================
  useEffect(() => {
    if (!isReady) return;
    if (!isInitialized) return;
    if (!isAuthenticated) return;
    if (hasSeenTour) return;
    if (isLoadingData) return;
    if (filteredSteps.length === 0) return;
    if (hasAttemptedShow) return;
    
    if (!isFirstLogin) {
      console.log('ℹ️ Pas la première connexion, tour non affiché');
      return;
    }

    const blockedPages = [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/admin-setup',
    ];

    const isBlocked = blockedPages.some(p => location.pathname.includes(p));
    if (isBlocked) return;

    setHasAttemptedShow(true);

    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    
    showTimeoutRef.current = setTimeout(() => {
      setShouldShow(true);
      setIsOpen(true);
    }, 1200);

    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    };
  }, [
    isReady,
    isInitialized,
    isAuthenticated,
    hasSeenTour,
    isLoadingData,
    filteredSteps.length,
    location.pathname,
    hasAttemptedShow,
    isFirstLogin,
  ]);

  // =============================================
  // 6. NETTOYAGE DES TIMEOUTS
  // =============================================
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
    };
  }, []);

  // =============================================
  // 7. COMPLÉTION DU TOUR (DÉCLARÉ EN PREMIER)
  // =============================================
  const handleComplete = useCallback(() => {
    setIsOpen(false);
    setShouldShow(false);
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({
      seen: true,
      version: TOUR_VERSION,
      completedAt: new Date().toISOString(),
      userId: user?.id,
    }));
    setHasSeenTour(true);
    setIsFirstLogin(false);

    if (onComplete) onComplete();
  }, [onComplete, user?.id]);

  // =============================================
  // 8. SKIP (utilise handleComplete)
  // =============================================
  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  // =============================================
  // 9. GESTION DE LA NAVIGATION (utilise handleComplete)
  // =============================================
  const handleNavigateAndContinue = useCallback((path: string) => {
    if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);

    setIsNavigating(true);
    setIsTransitioning(true);

    navigate(path);

    navigationTimeoutRef.current = setTimeout(() => {
      setIsNavigating(false);
      setIsTransitioning(false);

      if (currentStep < filteredSteps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleComplete();
      }
    }, 400);

  }, [currentStep, filteredSteps.length, navigate, handleComplete]);

  // =============================================
  // 10. GESTION DE LA PROCHAINE ÉTAPE (utilise handleComplete)
  // =============================================
  const handleNext = useCallback(() => {
    const activeStep = filteredSteps[currentStep];
    if (!activeStep) return;

    if (activeStep.actionPath && location.pathname !== activeStep.actionPath) {
      handleNavigateAndContinue(activeStep.actionPath);
      return;
    }

    if (currentStep < filteredSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
      return;
    }

    handleComplete();
  }, [currentStep, filteredSteps, location.pathname, handleNavigateAndContinue, handleComplete]);

  // =============================================
  // 11. GESTION DE LA TOUCHE ÉCHAP
  // =============================================
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleSkip();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleSkip]);

  // =============================================
  // 12. RENDU
  // =============================================
  if (
    hasSeenTour ||
    !shouldShow ||
    !isOpen ||
    !role ||
    !isReady ||
    !isInitialized ||
    isLoadingData ||
    filteredSteps.length === 0
  ) {
    return null;
  }

  const step = filteredSteps[currentStep];
  const isLastStep = currentStep === filteredSteps.length - 1;
  const totalSteps = filteredSteps.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300" 
        onClick={handleSkip}
        style={{ opacity: isOpen ? 1 : 0 }}
      />

      <div 
        className={cn(
          "relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-black/5 transition-all duration-300",
          isTransitioning ? "scale-95 opacity-70" : "scale-100 opacity-100"
        )}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentStep + 1) / totalSteps) * 100}%`,
              background: colors.primary,
            }}
          />
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={handleSkip}
          disabled={isNavigating}
          className="absolute top-4 right-4 w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center z-10 transition disabled:opacity-50"
          aria-label="Fermer le tour"
        >
          <X size={18} className="text-gray-500" />
        </button>

        {/* Contenu */}
        <div className="p-6 pt-8">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300"
            style={{
              background: colors.primary + '12',
              color: colors.primary,
            }}
          >
            {step.icon}
          </div>

          <h2
            className="text-xl font-black text-center transition-colors duration-300"
            style={{ color: colors.text }}
          >
            {step.title}
          </h2>

          <p className="text-sm text-center mt-2 text-gray-500 leading-relaxed transition-colors duration-300">
            {step.description}
          </p>

          <div className="flex justify-center gap-1.5 mt-6">
            {filteredSteps.map((_, index) => (
              <div
                key={index}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: index === currentStep ? '24px' : '8px',
                  background:
                    index === currentStep
                      ? colors.primary
                      : colors.primary + '28',
                }}
              />
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleSkip}
              disabled={isNavigating}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold border hover:bg-gray-50 transition disabled:opacity-50"
              style={{
                borderColor: colors.border || '#e5e0d8',
                color: colors.text,
              }}
            >
              {isNavigating ? 'Chargement...' : 'Passer'}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={isNavigating}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                background: isNavigating ? '#9CA3AF' : colors.primary,
                minWidth: '100px',
              }}
            >
              {isNavigating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Navigation...
                </>
              ) : isLastStep ? (
                <>
                  Commencer
                  <Check size={16} />
                </>
              ) : (
                <>
                  {step.actionLabel || 'Suivant'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-3">
            {currentStep + 1} / {totalSteps}
          </p>
        </div>
      </div>
    </div>
  );
};

// =============================================
// DÉFINITIONS DES ÉTAPES AVEC JARGON DYNAMIQUE
// =============================================

function getAidantSteps(visitsCount: number, ordersCount: number): TourStep[] {
  const hasMissions = visitsCount > 0;
  const hasOrders = ordersCount > 0;

  return [
    {
      id: 'welcome-aidant',
      title: '👋 Bienvenue dans l’équipe',
      description:
        'Vous êtes maintenant aidant chez Santé Plus. Voici un rapide tour de votre espace.',
      icon: <Sparkles size={32} />,
    },
    {
      id: 'missions',
      title: '📋 Mes missions',
      description: hasMissions
        ? 'Vous avez déjà des missions assignées. Retrouvez-les ici.'
        : 'Retrouvez ici toutes les missions qui vous sont assignées.',
      icon: <Briefcase size={32} />,
      actionPath: '/app/missions',
      actionLabel: hasMissions ? 'Voir mes missions' : 'Découvrir les missions',
    },
    {
      id: 'planning',
      title: '📅 Planning',
      description: 'Visualisez vos missions à venir dans un planning clair.',
      icon: <Calendar size={32} />,
      actionPath: '/app/planning',
      actionLabel: 'Voir mon planning',
    },
    {
      id: 'orders-aidant',
      title: '🛒 Commandes',
      description: hasOrders
        ? 'Des commandes vous ont déjà été confiées.'
        : 'Vous pouvez voir les commandes à préparer.',
      icon: <ShoppingBag size={32} />,
      actionPath: '/app/orders',
      actionLabel: hasOrders ? 'Voir les commandes' : 'Découvrir les commandes',
    },
    {
      id: 'complete-aidant',
      title: '✅ Prêt à commencer',
      description: 'Vous êtes prêt à commencer vos missions.',
      icon: <Check size={32} />,
    },
  ];
}

function getFamilySteps(
  patientsCount: number,
  visitsCount: number,
  ordersCount: number,
  patientCategory: string | null | undefined,
  terminology: { singular: string; plural: string; add: string; list: string }
): TourStep[] {
  const hasPatients = patientsCount > 0;
  const hasVisits = visitsCount > 0;
  const hasOrders = ordersCount > 0;
  const isWithoutPatient = !hasPatients && !patientCategory;

  const { singular, plural, add, list } = terminology;

  return [
    {
      id: 'welcome-family',
      title: '👋 Bienvenue sur Santé Plus',
      description: isWithoutPatient
        ? `Vous avez créé un compte personnel. Vous pouvez ajouter un ${singular} plus tard.`
        : hasPatients
          ? `Vous avez ${patientsCount} ${singular}${patientsCount > 1 ? 's' : ''} à accompagner.`
          : `Vous allez accompagner votre ${singular} avec Santé Plus.`,
      icon: <Sparkles size={32} />,
    },
    {
      id: 'patients',
      title: `👨‍👩‍👦 ${list}`,
      description: isWithoutPatient
        ? `Ajoutez un ${singular} pour bénéficier des services d’accompagnement.`
        : hasPatients
          ? `Retrouvez les informations de vos ${plural} ici.`
          : `Ajoutez votre premier ${singular} pour commencer.`,
      icon: <Users size={32} />,
      actionPath: '/app/patients',
      actionLabel: isWithoutPatient ? add : `Voir mes ${plural}`,
    },
    {
      id: 'visits',
      title: '📅 Visites',
      description: hasVisits
        ? `Vous avez ${visitsCount} visite${visitsCount > 1 ? 's' : ''} planifiée${visitsCount > 1 ? 's' : ''}.`
        : `Consultez les visites planifiées pour vos ${plural}.`,
      icon: <Calendar size={32} />,
      actionPath: '/app/visits',
      actionLabel: hasVisits ? 'Voir les visites' : 'Découvrir les visites',
      condition: () => !isWithoutPatient || hasVisits,
    },
    {
      id: 'orders',
      title: '🛒 Commandes',
      description: hasOrders
        ? `Vous avez ${ordersCount} commande${ordersCount > 1 ? 's' : ''} en cours.`
        : 'Commandez des médicaments, produits de soin ou autres besoins.',
      icon: <ShoppingBag size={32} />,
      actionPath: '/app/orders',
      actionLabel: hasOrders ? 'Voir mes commandes' : 'Faire une commande',
    },
    {
      id: 'messages',
      title: '💬 Messages',
      description:
        'Communiquez avec votre équipe d’aidants et les coordinateurs.',
      icon: <MessageCircle size={32} />,
      actionPath: '/app/messages',
      actionLabel: 'Voir mes messages',
    },
    {
      id: 'billing',
      title: '💳 Abonnement',
      description: 'Gérez vos abonnements et vos paiements en toute sécurité.',
      icon: <CreditCard size={32} />,
      actionPath: '/app/billing',
      actionLabel: 'Voir les offres',
    },
    {
      id: 'complete-family',
      title: '✅ Prêt à commencer',
      description: isWithoutPatient
        ? `Vous pouvez utiliser Santé Plus et ajouter un ${singular} à tout moment.`
        : `Vous êtes prêt à accompagner votre ${singular} avec Santé Plus.`,
      icon: <Check size={32} />,
    },
  ];
}

function getDefaultSteps(): TourStep[] {
  return [
    {
      id: 'welcome-admin',
      title: '👋 Bienvenue dans l’administration',
      description:
        'Voici un rapide tour des fonctionnalités d’administration.',
      icon: <Sparkles size={32} />,
    },
    {
      id: 'registrations',
      title: '📋 Inscriptions',
      description:
        'Gérez les demandes d’inscription des familles et des aidants.',
      icon: <Users size={32} />,
      actionPath: '/app/registrations',
      actionLabel: 'Voir les inscriptions',
    },
    {
      id: 'aidants',
      title: '🦸 Aidants',
      description: 'Gérez les aidants et les candidatures.',
      icon: <Briefcase size={32} />,
      actionPath: '/app/aidants',
      actionLabel: 'Voir les aidants',
    },
    {
      id: 'complete-admin',
      title: '✅ Prêt à gérer',
      description:
        'Vous avez accès aux fonctionnalités d’administration.',
      icon: <Check size={32} />,
    },
  ];
}