// 📁 src/components/onboarding/OnboardingTour.tsx

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Sparkles,
  Users,
  Calendar,
  ShoppingBag,
  Briefcase,
  UserCheck,
  ClipboardList,
  FileCheck,
  CreditCard,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useContractStore } from '@/stores/contractStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { supabase } from '@/lib/supabase';
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

// Clés localStorage unifiées
const TOUR_STORAGE_KEY = 'sante_plus_tour_seen';
const TOUR_VERSION = '2.0.0';

export const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { profile, role, isAuthenticated, isInitialized, user, setUser } = useAuthStore();

  // Attente de l'état d'initialisation et de chargement des CGU
  const {
    needsAcceptance,
    isChecking: isContractChecking,
    isInitialized: isContractInitialized,
  } = useContractStore();

  const brand = useBranding();
  const colors = brand.colors;

  const { singular } = useTerminology();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  const isMaman = profile?.patient_category === 'maman_bebe' || profile?.proche_category === 'maman_bebe';

  // ============================================================
  // 1. VÉRIFICATION DOUBLE SÉCURISÉ (BASE DE DONNÉES + CACHE COHÉRENT)
  // ============================================================
  useEffect(() => {
    if ((profile as any)?.has_seen_onboarding === true) {
      setHasSeenTour(true);
      setIsReady(true);
      return;
    }

    const saved = localStorage.getItem(TOUR_STORAGE_KEY);
    if (saved && profile?.id) {
      try {
        const data = JSON.parse(saved);
        if (data.version === TOUR_VERSION && data.seen === true && data.userId === profile.id) {
          setHasSeenTour(true);
        } else {
          setHasSeenTour(false);
        }
      } catch (e) {
        console.warn('Erreur lecture tour:', e);
      }
    } else {
      setHasSeenTour(false);
    }
    setIsReady(true);
  }, [profile]);

  // ============================================================
  // SÉCURITÉ DE SESSION : Réinitialiser l'état d'onboarding dès la déconnexion/reconnexion
  // ============================================================
  useEffect(() => {
    if (user?.id) {
      setShouldShow(false);
      setIsOpen(false);
    }
  }, [user?.id]);

  // ============================================================
  // 2. DÉFINITION DES ÉTAPES PAR RÔLE AVEC DESIGNS ET IMAGES DYNAMIQUES RÉELS
  // ============================================================
  const steps: TourStep[] = useMemo(() => {
    if (!isAuthenticated || !role) return [];

    const seniorImg = '/assets/images/banners/senior-banner.png';
    const mamanImg = '/assets/images/banners/maman-banner.png';
    const aidantImg = '/assets/images/banners/aidant-banner.png';
    const coordImg = '/assets/images/banners/coord-banner.png';

    const seniorVisitImg = '/assets/images/banners/senior-visit.png';
    const mamanVisitImg = '/assets/images/banners/maman-visit.png';
    const coordVisitImg = '/assets/images/banners/coord-visit.png';

    // 🦸 RÔLE : AIDANT
    if (role === 'aidant') {
      return [
        {
          id: 'welcome-aidant',
          title: 'Bienvenue dans l\u2019équipe',
          description: 'Vous êtes maintenant aidant certifié chez Santé Plus Services. Voici un rapide tour de votre espace professionnel.',
          icon: <Sparkles size={22} />,
          image: aidantImg,
        },
        {
          id: 'missions',
          title: 'Vos missions d\'aide',
          description: 'Consultez et acceptez en un clic les demandes de visites d\'accompagnement ou d\'achats urgents dans votre zone.',
          icon: <Briefcase size={22} />,
          image: seniorVisitImg,
        },
        {
          id: 'planning',
          title: 'Votre planning de visites',
          description: 'Visualisez toutes vos interventions acceptées et préparez vos itinéraires sur une interface de calendrier claire.',
          icon: <Calendar size={22} />,
          image: aidantImg,
        },
        {
          id: 'orders-aidant',
          title: 'Achats & livraisons d\'urgence',
          description: 'Aidez les familles à proximité en effectuant et en livrant leurs besoins : médicaments en pharmacie, courses de confort.',
          icon: <ShoppingBag size={22} />,
          image: seniorVisitImg,
        },
        {
          id: 'complete-aidant',
          title: 'Prêt à accompagner',
          description: 'Votre profil est validé. Vous pouvez dès maintenant commencer à assister vos premiers bénéficiaires.',
          icon: <Check size={22} />,
          image: aidantImg,
        },
      ];
    }

    // 👨‍👩‍👦 RÔLE : FAMILLE / CLIENTS
    if (role === 'family') {
      const banner = isMaman ? mamanImg : seniorImg;
      const visitBanner = isMaman ? mamanVisitImg : seniorVisitImg;

      return [
        {
          id: 'welcome-family',
          title: 'Bienvenue sur Santé Plus',
          description: 'Accompagnez vos proches et gérez leur confort au quotidien, en toute sérénité, depuis chez vous ou la diaspora.',
          icon: <Sparkles size={22} />,
          image: banner,
        },
        {
          id: 'patients',
          title: `Fiches des ${isMaman ? 'mamans / bébés' : 'seniors'}`,
          description: 'Renseignez le profil, les allergies et les habitudes de vie de votre proche pour un suivi personnalisé.',
          icon: <Users size={22} />,
          image: visitBanner,
        },
        {
          id: 'visits',
          title: 'Planification des visites',
          description: 'L\'administration planifie pour vous des visites d\'accompagnement et de présence pour veiller sur votre parent.',
          icon: <Calendar size={22} />,
          image: visitBanner,
        },
        {
          id: 'orders',
          title: 'Livraisons de courses à l\'acte',
          description: 'Faites livrer en urgence des médicaments sur ordonnance, des produits d\'hygiène bébé ou des courses de première nécessité.',
          icon: <ShoppingBag size={22} />,
          image: aidantImg,
        },
        {
          id: 'billing',
          title: 'Formules d\'abonnement',
          description: 'Gérez vos forfaits Seniors ou Maternité et suivez le solde de vos visites restantes en toute transparence.',
          icon: <CreditCard size={22} />,
          image: banner,
        },
        {
          id: 'complete-family',
          title: 'Prêt à commencer',
          description: `Le parcours d'onboarding est terminé. Vous pouvez dès à présent enregistrer votre premier ${singular}.`,
          icon: <Check size={22} />,
          image: banner,
        },
      ];
    }

    // 👑 RÔLE : ADMIN
    return [
      {
        id: 'welcome-admin',
        title: 'Espace de supervision',
        description: 'Bienvenue dans la console de gestion administrative globale de la plateforme de coordination Santé Plus.',
        icon: <Sparkles size={22} />,
        image: coordImg,
      },
      {
        id: 'registrations',
        title: 'Inscriptions d\u2019abonnés',
        description: 'Passez en revue et validez les nouvelles fiches d\'inscription des familles pour leur ouvrir l\'accès aux services.',
        icon: <ClipboardList size={22} />,
        image: coordImg,
      },
      {
        id: 'aidants',
        title: 'Recrutement des aidants',
        description: 'Gérez les candidatures, vérifiez les casiers judiciaires et homologuez les nouveaux aidants.',
        icon: <UserCheck size={22} />,
        image: aidantImg,
      },
      {
        id: 'validations',
        title: 'Validation des interventions',
        description: 'Examinez les comptes-rendus, photos et mémos vocaux soumis par les aidants pour valider la qualité des visites.',
        icon: <FileCheck size={22} />,
        image: coordVisitImg,
      },
      {
        id: 'complete-admin',
        title: 'Prêt à piloter',
        description: 'La console administrative est prête. Vous avez le contrôle total sur la modération et la gestion des flux.',
        icon: <Check size={22} />,
        image: coordImg,
      },
    ];
  }, [role, isAuthenticated, isMaman, singular]);

  // ============================================================
  // 3. ENTRÉE SÉCURISÉE (SANS CONCURRENCE DE RENDER)
  // ============================================================
  useEffect(() => {
    if (!isReady) return;
    if (!isInitialized) return;
    if (!isAuthenticated) return;
    if (hasSeenTour) return;
    if (!isContractInitialized) return;
    if (isContractChecking) return;
    if (needsAcceptance) return;
    if (steps.length === 0) return;

    setShouldShow(true);
    setIsOpen(true);
  }, [
    isReady,
    isInitialized,
    isAuthenticated,
    hasSeenTour,
    isContractInitialized,
    isContractChecking,
    needsAcceptance,
    steps.length,
    location.pathname,
  ]);

  // ============================================================
  // 4. COMPLÉTION DU TOUR ET ENREGISTREMENT SERVEUR
  // ============================================================
  const handleComplete = useCallback(async () => {
    setIsOpen(false);
    setShouldShow(false);

    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({
      seen: true,
      version: TOUR_VERSION,
      completedAt: new Date().toISOString(),
      userId: profile?.id,
    }));

    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ has_seen_onboarding: true })
          .eq('id', user.id);

        if (profile) {
          setUser(user, { ...profile, has_seen_onboarding: true } as any);
        }
        console.log('📊 [Onboarding Engine] Sauvegarde définitive serveur effectuée');
      } catch (err) {
        console.warn('⚠️ Échec de sauvegarde de l\'onboarding sur le serveur');
      }
    }

    setHasSeenTour(true);
    if (onComplete) onComplete();
  }, [onComplete, user, profile, setUser]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length, handleComplete]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 bg-black/25 backdrop-blur-sm animate-fadeIn">

      <div
        className={cn(
          'relative w-full h-full sm:h-[580px] sm:max-w-sm bg-[#FCFAF6] dark:bg-[#151c18] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-fadeIn',
        )}
      >
        {/* Barre de progression fine, en haut, sans encadré ni bordure superflue */}
        <div className="absolute top-0 left-0 right-0 h-[3px] z-20 bg-black/5 dark:bg-white/10">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentStep + 1) / totalSteps) * 100}%`,
              background: colors.primary,
            }}
          />
        </div>

        {/* Bouton Ignorer, discret, en surimpression de l'image (gagne de la place en bas) */}
        <button
          type="button"
          onClick={handleComplete}
          className="absolute top-5 right-5 z-20 text-[11px] font-semibold uppercase tracking-wider text-white/90 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-full hover:bg-black/40 transition-colors"
        >
          Ignorer
        </button>

        {/* ============================================================
            BLOC ILLUSTRATIF — image généreuse, un seul fondu, pas de double voile
            ============================================================ */}
        <div className="w-full h-[52%] relative overflow-hidden shrink-0">
          <img
            key={currentStep}
            src={step.image}
            alt={step.title}
            className="absolute inset-0 w-full h-full object-cover animate-fadeIn"
          />
          {/* Un seul dégradé bas, juste ce qu'il faut pour la lisibilité du badge */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#FCFAF6] dark:from-[#151c18] to-transparent" />
        </div>

        {/* ============================================================
            BADGE D'ICÔNE "SIGNATURE" — à cheval entre l'image et le texte
            ============================================================ */}
        <div className="relative flex justify-center -mt-7 shrink-0 z-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-white dark:bg-[#1f2a23] ring-4 ring-[#FCFAF6] dark:ring-[#151c18]"
            style={{ color: colors.primary }}
          >
            {step.icon}
          </div>
        </div>

        {/* ============================================================
            CONTENU TEXTUEL — plus grand, plus aéré, plus lisible
            ============================================================ */}
        <div
          key={step.id}
          className="flex-1 flex flex-col items-center justify-center text-center px-7 sm:px-9 pt-3 pb-1 space-y-3 min-h-0 animate-fadeIn"
        >
          <h2 className="text-xl sm:text-[22px] font-extrabold tracking-tight leading-snug" style={{ color: colors.text }}>
            {step.title}
          </h2>

          <p className="text-[13.5px] sm:text-sm leading-relaxed max-w-[290px] text-gray-500 dark:text-gray-300">
            {step.description}
          </p>

          {/* Points de progression */}
          <div className="flex justify-center gap-1.5 pt-2 shrink-0">
            {steps.map((_, index) => (
              <div
                key={index}
                className="h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: index === currentStep ? '22px' : '6px',
                  background: index === currentStep ? colors.primary : colors.primary + '22',
                }}
              />
            ))}
          </div>
        </div>

        {/* ============================================================
            PIED DE PAGE — un seul CTA plein largeur, plus confortable au tap
            ============================================================ */}
        <div className="px-7 pb-7 pt-4 shrink-0 w-full">
          <button
            type="button"
            onClick={handleNext}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all active:scale-[0.98] hover:opacity-95 shadow-sm flex items-center justify-center gap-2"
            style={{ background: colors.primary }}
          >
            {isLastStep ? 'Commencer' : 'Suivant'}
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
