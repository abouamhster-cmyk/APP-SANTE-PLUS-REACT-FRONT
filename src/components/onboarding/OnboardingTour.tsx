// 📁 src/components/onboarding/OnboardingTour.tsx
// ✅ ONBOARDING TOUR COMPLET : DESIGN FLOTTANT IMMERSIF PAR RÔLE AVEC OUVERTURE INSTANTANÉE APRÈS LES CGU

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
  UserCheck,
  LayoutDashboard,
  FileCheck,
  ClipboardList,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useContractStore } from '@/stores/contractStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { cn } from '@/utils/helpers';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
}

interface OnboardingTourProps {
  onComplete?: () => void;
}

type TimerType = ReturnType<typeof setTimeout> | null;

// Clés localStorage unifiées
const TOUR_STORAGE_KEY = 'sante_plus_tour_seen';
const TOUR_VERSION = '2.0.0';

export const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { profile, role, isAuthenticated, isInitialized, user } = useAuthStore();
  const { needsAcceptance } = useContractStore();
  const brand = useBranding();
  const colors = brand.colors;

  const {
    singular,
  } = useTerminology();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [hasAttemptedShow, setHasAttemptedShow] = useState(false);

  const showTimeoutRef = useRef<TimerType>(null);

  const isMaman = profile?.patient_category === 'maman_bebe' || profile?.proche_category === 'maman_bebe';

  // ============================================================
  // 1. VÉRIFICATION DU TOUR DÉJÀ VU
  // ============================================================
  useEffect(() => {
    const saved = localStorage.getItem(TOUR_STORAGE_KEY);
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
  }, []);

  // ============================================================
  // 2. DÉFINITION DES ÉTAPES AVEC COULEURS DYNAMIQUES PAR RÔLE [24]
  // ============================================================
  const steps: TourStep[] = useMemo(() => {
    if (!isAuthenticated || !role) return [];

    const seniorImg = '/assets/images/banners/senior-banner.png';
    const mamanImg = '/assets/images/banners/maman-banner.png';
    const aidantImg = '/assets/images/banners/aidant-banner.png';
    const coordImg = '/assets/images/banners/coord-banner.png';

    // 🦸 RÔLE : AIDANT (5 Étapes)
    if (role === 'aidant') {
      return [
        {
          id: 'welcome-aidant',
          title: '👋 Bienvenue dans l’équipe',
          description: 'Vous êtes maintenant aidant certifié chez Santé Plus Services. Voici un rapide tour de votre espace professionnel.',
          icon: <Sparkles size={28} />,
          image: aidantImg,
        },
        {
          id: 'missions',
          title: '📋 Vos Missions d\'Aide',
          description: 'Consultez et acceptez en un clic les demandes de visites d\'accompagnements ou d\'achats urgents dans votre zone.',
          icon: <Briefcase size={28} />,
          image: aidantImg,
        },
        {
          id: 'planning',
          title: '📅 Votre Planning de Visites',
          description: 'Visualisez toutes vos interventions acceptées et préparez vos itinéraires sur une interface de calendrier claire.',
          icon: <Calendar size={28} />,
          image: aidantImg,
        },
        {
          id: 'orders-aidant',
          title: '🛒 Achats & Livraisons d\'Urgence',
          description: 'Aidez les familles à proximité en effectuant et en livrant leurs besoins (médicaments en pharmacie, courses de confort).',
          icon: <ShoppingBag size={28} />,
          image: aidantImg,
        },
        {
          id: 'complete-aidant',
          title: '🚀 Prêt à Accompagner',
          description: 'Votre profil est validé. Vous pouvez dès maintenant commencer à assister vos premiers bénéficiaires.',
          icon: <Check size={28} />,
          image: aidantImg,
        },
      ];
    }

    // 👨‍👩‍👦 RÔLE : FAMILLE / CLIENTS (6 Étapes - Onglet Messages Supprimé) [24]
    if (role === 'family') {
      const banner = isMaman ? mamanImg : seniorImg;
      return [
        {
          id: 'welcome-family',
          title: '👋 Bienvenue sur Santé Plus',
          description: `Accompagnez vos proches et gérez leur confort au quotidien en toute sérénité depuis chez vous ou la diaspora.`,
          icon: <Sparkles size={28} />,
          image: banner,
        },
        {
          id: 'patients',
          title: `👨‍👩‍👦 Fiches des ${isMaman ? 'Mamans / Bébés' : 'Seniors'}`,
          description: `Renseignez le profil d'identité, les allergies et les habitudes de vie de votre proche pour un suivi personnalisé.`,
          icon: <Users size={28} />,
          image: banner,
        },
        {
          id: 'visits',
          title: '📅 Planification des Visites',
          description: 'L\'administration planifie pour vous des visites d’accompagnement de confort et de présence pour veiller sur la sécurité de votre parent.',
          icon: <Calendar size={28} />,
          image: banner,
        },
        {
          id: 'orders',
          title: '🛒 Livraisons de courses à l\'acte',
          description: 'Faites livrer en urgence des médicaments sur ordonnance, des produits d’hygiène bébé ou des courses de première nécessité.',
          icon: <ShoppingBag size={28} />,
          image: banner,
        },
        {
          id: 'billing',
          title: '💳 Formules d\'Abonnement',
          description: 'Gérez vos forfaits Seniors ou Maternité et suivez le solde de vos visites restantes de manière transparente.',
          icon: <CreditCard size={28} />,
          image: banner,
        },
        {
          id: 'complete-family',
          title: '🚀 Prêt à Commencer',
          description: `Le parcours d'onboarding est terminé. Vous pouvez dès à présent enregistrer votre premier ${singular}.`,
          icon: <Check size={28} />,
          image: banner,
        },
      ];
    }

    // 👑 RÔLE : ADMIN (5 Étapes) [24]
    return [
      {
        id: 'welcome-admin',
        title: '👋 Espace de Supervision',
        description: 'Bienvenue dans la console de gestion administrative globale de la plateforme de coordination Santé Plus.',
        icon: <Sparkles size={28} />,
        image: coordImg,
      },
      {
        id: 'registrations',
        title: '📋 Inscriptions d’Abonnés',
        description: 'Passez en revue et validez les nouvelles fiches d’inscriptions des familles pour leur ouvrir l’accès aux services.',
        icon: <ClipboardList size={28} />,
        image: coordImg,
      },
      {
        id: 'aidants',
        title: '🦸 Recrutement des Aidants',
        description: 'Gérez les candidatures opérationnelles, vérifiez les casiers judiciaires et homologuez les nouveaux aidants.',
        icon: <UserCheck size={28} />,
        image: coordImg,
      },
      {
        id: 'validations',
        title: '✓ Validation des Interventions',
        description: 'Examinez les comptes-rendus, photos et mémos vocaux soumis par les aidants pour valider la qualité finale des visites.',
        icon: <FileCheck size={28} />,
        image: coordImg,
      },
      {
        id: 'complete-admin',
        title: '🚀 Prêt à Piloter',
        description: 'La console administrative est prête. Vous avez le contrôle total sur la modération et la gestion des flux.',
        icon: <Check size={28} />,
        image: coordImg,
      },
    ];
  }, [role, isAuthenticated, isMaman, singular]);

  // ============================================================
  // 3. RETENIR L'AFFICHAGE JUSQU'À L'ACCEPTATION DU CONTRAT [1, 24]
  // ============================================================
  useEffect(() => {
    if (!isReady) return;
    if (!isInitialized) return;
    if (!isAuthenticated) return;
    if (hasSeenTour) return;
    if (needsAcceptance) return; // ✅ IMPORTANT : Ne s'affiche jamais si le contrat est en attente d'acceptation [1]
    if (steps.length === 0) return;
    if (hasAttemptedShow) return;

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
    
    // S'ouvre instantanément et automatiquement après la validation du contrat [24]
    showTimeoutRef.current = setTimeout(() => {
      setShouldShow(true);
      setIsOpen(true);
    }, 600);

    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    };
  }, [
    isReady,
    isInitialized,
    isAuthenticated,
    hasSeenTour,
    needsAcceptance,
    steps.length,
    location.pathname,
    hasAttemptedShow,
  ]);

  // ============================================================
  // 4. COMPLÉTION DU TOUR
  // ============================================================
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

    if (onComplete) onComplete();
  }, [onComplete, user?.id]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length, handleComplete]);

  // Touche Échap de confort
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleComplete();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleComplete]);

  if (
    hasSeenTour ||
    !shouldShow ||
    !isOpen ||
    !role ||
    !isReady ||
    !isInitialized ||
    needsAcceptance ||
    steps.length === 0
  ) {
    return null;
  }

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const totalSteps = steps.length;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 bg-black/10 backdrop-blur-sm">
      
      <div 
        className={cn(
          "relative w-full h-full sm:h-[620px] sm:max-w-lg bg-white sm:rounded-[2.5rem] shadow-2xl overflow-hidden border flex flex-col justify-between animate-fadeIn",
        )}
        style={{ borderColor: colors.primary + '15' }}
      >
        {/* Progress bar line supérieure de progression */}
        <div className="absolute top-0 left-0 right-0 h-[3px] z-20" style={{ backgroundColor: colors.primary + '15' }}>
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentStep + 1) / totalSteps) * 100}%`,
              background: colors.primary,
            }}
          />
        </div>

        {/* IMAGE FLOTTANTE BRANDING SUPÉRIEURE */}
        <div 
          className="w-full h-56 sm:h-64 relative overflow-hidden shrink-0 border-b"
          style={{ borderColor: colors.primary + '15' }}
        >
          <img 
            src={step.image} 
            alt={step.title} 
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* CONTENU TEXTUEL CENTRAL AÉRÉ */}
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 text-center min-h-0 bg-white">
          <div className="space-y-3.5 my-auto">
            <div className="flex justify-center text-4xl mb-1">
              {step.icon}
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight" style={{ color: colors.text }}>
              {step.title}
            </h2>
            
            <p className="text-xs sm:text-sm leading-relaxed max-w-sm mx-auto font-medium" style={{ color: colors.textLight }}>
              {step.description}
            </p>
          </div>

          {/* Indicateur de petits points de navigation (Dots) */}
          <div className="flex justify-center gap-1.5 pt-4 shrink-0">
            {steps.map((_, index) => (
              <div
                key={index}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: index === currentStep ? '24px' : '8px',
                  background: index === currentStep ? colors.primary : colors.primary + '25',
                }}
              />
            ))}
          </div>
        </div>

        {/* PIED DE PAGE MINIMALISTE */}
        <div className="p-5 sm:p-6 border-t flex items-center justify-between shrink-0" style={{ borderColor: colors.primary + '10', backgroundColor: colors.primary + '04' }}>
          <button
            type="button"
            onClick={handleComplete}
            className="text-xs font-bold uppercase tracking-wider select-none px-2 py-1 transition-colors"
            style={{ color: colors.textLight }}
          >
            Ignorer
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 rounded-2xl text-white font-extrabold text-xs sm:text-sm transition-all hover:opacity-95 shadow-md flex items-center gap-1.5 shrink-0"
            style={{ background: colors.primary }}
          >
            {isLastStep ? 'Commencer' : 'Suivant'}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
