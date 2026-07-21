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
  
  // Attente de l'état d'initialisation et de chargement des CGU [1]
  const { 
    needsAcceptance, 
    isChecking: isContractChecking, 
    isInitialized: isContractInitialized 
  } = useContractStore();

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

  const isMaman = profile?.patient_category === 'maman_bebe' || profile?.proche_category === 'maman_bebe';

  // ============================================================
  // 1. VÉRIFICATION DOUBLE SÉCURISÉ (BASE DE DONNÉES + CACHE COHÉRENT) [23]
  // ============================================================
  useEffect(() => {
    // A. Priorité absolue : Vérifier l'état dans le profil chargé depuis le serveur [23]
    if ((profile as any)?.has_seen_onboarding === true) {
      setHasSeenTour(true);
      setIsReady(true);
      return;
    }

    // B. Secours local de confort (LocalStorage lié à l'ID utilisateur) [23]
    const saved = localStorage.getItem(TOUR_STORAGE_KEY);
    if (saved && profile?.id) {
      try {
        const data = JSON.parse(saved);
        
        // Ségrégation stricte inter-comptes [23]
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
  // SÉCURITÉ DE SESSION : Réinitialiser l'état d'onboarding dès la déconnexion/reconnexion [24]
  // ============================================================
  useEffect(() => {
    if (user?.id) {
      setShouldShow(false);
      setIsOpen(false);
    }
  }, [user?.id]);

  // ============================================================
  // 2. DÉFINITION DES ÉTAPES PAR RÔLE [24]
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
          icon: <Sparkles size={24} />,
          image: aidantImg,
        },
        {
          id: 'missions',
          title: '📋 Vos Missions d\'Aide',
          description: 'Consultez et acceptez en un clic les demandes de visites d\'accompagnements ou d\'achats urgents dans votre zone.',
          icon: <Briefcase size={24} />,
          image: aidantImg,
        },
        {
          id: 'planning',
          title: '📅 Votre Planning de Visites',
          description: 'Visualisez toutes vos interventions acceptées et préparez vos itinéraires sur une interface de calendrier claire.',
          icon: <Calendar size={24} />,
          image: aidantImg,
        },
        {
          id: 'orders-aidant',
          title: '🛒 Achats & Livraisons d\'Urgence',
          description: 'Aidez les familles à proximité en effectuant et en livrant leurs besoins (médicaments en pharmacie, courses de confort).',
          icon: <ShoppingBag size={24} />,
          image: aidantImg,
        },
        {
          id: 'complete-aidant',
          title: '🚀 Prêt à Accompagner',
          description: 'Votre profil est validé. Vous pouvez dès maintenant commencer à assister vos premiers bénéficiaires.',
          icon: <Check size={24} />,
          image: aidantImg,
        },
      ];
    }

    // 👨‍👩‍👦 RÔLE : FAMILLE / CLIENTS (6 Étapes) [24]
    if (role === 'family') {
      const banner = isMaman ? mamanImg : seniorImg;
      return [
        {
          id: 'welcome-family',
          title: '👋 Bienvenue sur Santé Plus',
          description: `Accompagnez vos proches et gérez leur confort au quotidien en toute sérénité depuis chez vous ou la diaspora.`,
          icon: <Sparkles size={24} />,
          image: banner,
        },
        {
          id: 'patients',
          title: `👨‍👩‍👦 Fiches des ${isMaman ? 'Mamans / Bébés' : 'Seniors'}`,
          description: `Renseignez le profil d'identité, les allergies et les habitudes de vie de votre proche pour un suivi personnalisé.`,
          icon: <Users size={24} />,
          image: banner,
        },
        {
          id: 'visits',
          title: '📅 Planification des Visites',
          description: 'L\'administration planifie pour vous des visites d’accompagnement de confort et de présence pour veiller sur la sécurité de votre parent.',
          icon: <Calendar size={24} />,
          image: banner,
        },
        {
          id: 'orders',
          title: '🛒 Livraisons de courses à l\'acte',
          description: 'Faites livrer en urgence des médicaments sur ordonnance, des produits d’hygiène bébé ou des courses de première nécessité.',
          icon: <ShoppingBag size={24} />,
          image: banner,
        },
        {
          id: 'billing',
          title: '💳 Formules d\'Abonnement',
          description: 'Gérez vos forfaits Seniors ou Maternité et suivez le solde de vos visites restantes de manière de manière transparente.',
          icon: <CreditCard size={24} />,
          image: banner,
        },
        {
          id: 'complete-family',
          title: '🚀 Prêt à Commencer',
          description: `Le parcours d'onboarding est terminé. Vous pouvez dès à présent enregistrer votre premier ${singular}.`,
          icon: <Check size={24} />,
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
        icon: <Sparkles size={24} />,
        image: coordImg,
      },
      {
        id: 'registrations',
        title: '📋 Inscriptions d’Abonnés',
        description: 'Passez en revue et validez les nouvelles fiches d’inscriptions des familles pour leur ouvrir l’accès aux services.',
        icon: <ClipboardList size={24} />,
        image: coordImg,
      },
      {
        id: 'aidants',
        title: '🦸 Recrutement des Aidants',
        description: 'Gérez les candidatures opérationnelles, vérifiez les casiers judiciaires et homologuez les nouveaux aidants.',
        icon: <UserCheck size={24} />,
        image: coordImg,
      },
      {
        id: 'validations',
        title: '✓ Validation des Interventions',
        description: 'Examinez les comptes-rendus, photos et mémos vocaux soumis par les aidants pour valider la qualité finale des visites.',
        icon: <FileCheck size={24} />,
        image: coordImg,
      },
      {
        id: 'complete-admin',
        title: '🚀 Prêt à Piloter',
        description: 'La console administrative est prête. Vous avez le contrôle total sur la modération et la gestion des flux.',
        icon: <Check size={24} />,
        image: coordImg,
      },
    ];
  }, [role, isAuthenticated, isMaman, singular]);

  // ============================================================
  // 3. ENTRÉE SÉCURISÉE DE RACK (SANS CONCURRENCE DE RENDER) [1, 24]
  // ============================================================
  useEffect(() => {
    if (!isReady) return;
    if (!isInitialized) return;
    if (!isAuthenticated) return;
    if (hasSeenTour) return;

    if (!isContractInitialized) return; 
    if (isContractChecking) return; 
    if (needsAcceptance) return; // Bloquer tant que les CGU ne sont pas signées [1]

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
  // 4. COMPLÉTION DU TOUR ET ENREGISTREMENT PHYSIQUE SERVEUR [23]
  // ============================================================
  const handleComplete = useCallback(async () => {
    setIsOpen(false);
    setShouldShow(false);
    
    // A. Sauvegarde locale de confort [23]
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({
      seen: true,
      version: TOUR_VERSION,
      completedAt: new Date().toISOString(),
      userId: profile?.id,
    }));

    // B. SAUVEGARDE PHYSIQUE ET SÉCURISÉE EN BASE DE DONNÉES (Fiabilité 100%) [23]
    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ has_seen_onboarding: true })
          .eq('id', user.id);

        if (profile) {
          setUser(user, { ...profile, has_seen_onboarding: true } as any);
        }
        console.log('📊 [Onboarding Engine] Sauvegarde définitive serveur effectuée [23]');
      } catch (err) {
        console.warn('⚠️ Échec de sauvegarde de l\'onboarding sur le serveur [23]');
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

  // Touche Échap
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 bg-black/10 backdrop-blur-sm">
      
      {/* BOÎTE FLOATING CARD PREMIUM RESPONSIVE ET COMPACTE (Coins très arrondis) [24] */}
      <div 
        className={cn(
          "relative w-full h-full sm:h-[550px] sm:max-w-sm bg-[#FCFAF6] dark:bg-[#151c18] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border flex flex-col justify-between animate-fadeIn p-6 sm:p-7",
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

        {/* ============================================================
            1. BLOC ILLUSTRATIF IMMERSIF PLEIN-ÉCRAN (PREMIER TIERS DU COMPOSANT) [1, 23, 24]
            ============================================================ */}
        <div className="w-full h-[42%] relative overflow-hidden shrink-0">
          {/* L'image prend 100% de la surface supérieure, sans cadre ni cercle ! [23] */}
          <img 
            key={currentStep} // Force la transition de fondu enchaîné de l'image à chaque étape ! [23]
            src={step.image} 
            alt={step.title} 
            className="absolute inset-0 w-full h-full object-cover animate-fadeIn" // ✅ Remplissage complet sans cercles [23]
          />
          {/* Voile d'ombrage dégradé supérieur doux [24] */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/30" />
          
          {/* Courbe organique basse (Wave) qui se fond de manière invisible avec la carte blanche du bas */}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-[#FCFAF6] dark:bg-[#151c18] rounded-t-[2rem]" />
        </div>

        {/* ============================================================
            2. CONTENU TEXTUEL HARMONIEUSEMENT CENTRÉ SANS VIDE ARTIFICIEL [24]
            ============================================================ */}
        <div 
          key={step.id} // Force la ré-animation douce à chaque étape !
          className="flex-1 flex flex-col items-center justify-center text-center px-1 space-y-3.5 min-h-0 bg-[#FCFAF6] dark:bg-[#151c18] animate-fadeIn"
        >
          {/* Petit badge d'icône d'étape */}
          <div 
            className="w-10 h-10 rounded-2xl mx-auto flex items-center justify-center text-2xl shrink-0 bg-white border shadow-inner"
            style={{ borderColor: colors.primary + '12' }}
          >
            {step.icon}
          </div>
          
          <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight" style={{ color: colors.text }}>
            {step.title}
          </h2>
          
          <p className="text-xs sm:text-xs leading-relaxed max-w-[280px] font-bold text-gray-500 dark:text-gray-300">
            {step.description}
          </p>

          {/* Indicateur de petits points de navigation (Dots sous l'écrit pour la cohésion) [24] */}
          <div className="flex justify-center gap-1.5 pt-1 shrink-0">
            {steps.map((_, index) => (
              <div
                key={index}
                className="h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: index === currentStep ? '20px' : '6px', // Forme pilule dynamique [24]
                  background: index === currentStep ? colors.primary : colors.primary + '25',
                }}
              />
            ))}
          </div>
        </div>

        {/* PIED DE PAGE DISCRET (SKIP / NEXT) [24] */}
        <div className="pt-4 border-t flex items-center justify-between shrink-0 w-full" style={{ borderColor: colors.primary + '10' }}>
          <button
            type="button"
            onClick={handleComplete}
            className="text-[10px] sm:text-xs font-black uppercase tracking-wider select-none px-4 py-2 hover:bg-black/5 rounded-xl transition-all"
            style={{ color: colors.textLight }}
          >
            Ignorer
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2.5 rounded-xl text-white font-black text-xs sm:text-sm transition-all active:scale-[0.97] hover:opacity-95 shadow-sm flex items-center gap-1 shrink-0"
            style={{ background: colors.primary }}
          >
            {isLastStep ? 'Commencer' : 'Suivant'}
            <ArrowRight size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
