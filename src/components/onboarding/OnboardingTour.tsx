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

type TimerType = ReturnType<typeof setTimeout> | null;

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
  const [hasAttemptedShow, setHasAttemptedShow] = useState(false);

  const showTimeoutRef = useRef<TimerType>(null);

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

  // Réinitialiser la tentative si changement de compte [24]
  useEffect(() => {
    if (user?.id) {
      setHasAttemptedShow(false);
      setShouldShow(false);
      setIsOpen(false);
    }
  }, [user?.id]);

  // ============================================================
  // 2. ÉTAPES DE PRÉSENTATION PAR RÔLE [24]
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
          description: `Le parcours d'onboarding est terminé. Vous pouvez dès à présent enregistrer votre premier l'accompagnement de votre proche.`,
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
  // 3. ENTRÉE SÉCURISÉE SANS CONCURRENCE (VÉRIFIÉ ET APPROUVÉ)  
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
    if (hasAttemptedShow) return;

    setHasAttemptedShow(true);

    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    
    // Déclenchement automatique immédiat et fluide après signature [24]
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
    isContractInitialized, 
    isContractChecking, 
    needsAcceptance, 
    steps.length,
    location.pathname,
    hasAttemptedShow,
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

   const handleDotClick = (index: number) => {
    setCurrentStep(index);
  };

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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 bg-black/30 backdrop-blur-md">
      
      {/* CARD CONTENEUR DE PRESENTATION STYLE PREMIUM MOBILE [23, 24] */}
      <div 
        className="relative w-full h-full sm:h-[620px] sm:max-w-lg bg-white sm:rounded-[2.5rem] shadow-2xl overflow-hidden border flex flex-col justify-between animate-fadeIn"
        style={{ 
          borderColor: colors.primary + '15',
           background: `linear-gradient(180deg, ${colors.background} 0%, #FCFAF6 100%)`
        }}
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
            📦 ÉTAPE VISUELLE PRINCIPALE  
            ============================================================ */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-8 pb-0">
          
          {/* ✅ CADRE PHOTO ORGANIQUE FLUIDE TRÈS HAUT DE GAMME (Morphed Border Radius) [24] */}
          <div 
            className="w-48 h-48 sm:w-52 sm:h-52 rounded-[40%_60%_70%_30%_/_40%_50%_65%_55%] overflow-hidden border-2 shadow-md relative transition-all duration-500 ease-in-out shrink-0 bg-white"
            style={{ borderColor: colors.primary + '20' }}
          >
            <img 
              src={step.image} 
              alt={step.title} 
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
            {/* Voilage d'ombrage discret */}
            <div className="absolute inset-0 bg-black/[0.04]" />
          </div>

          {/* Badge icone flottant sous le blob */}
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md -mt-5 z-10 transition-transform duration-300"
            style={{ background: colors.primary }}
          >
            {step.icon}
          </div>
        </div>

        {/* ============================================================
            📦 CARTE "BOTTOM SHEET" INFÉRIEURE  
            ============================================================ */}
        <div className="bg-white rounded-t-[2.5rem] p-6 sm:p-8 pb-8 flex flex-col justify-between h-[280px] shrink-0 border-t" style={{ borderColor: colors.primary + '08' }}>
          
          {/* Titre & Description centrés épurés */}
          <div className="text-center space-y-3 my-auto">
            <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight" style={{ color: colors.text }}>
              {step.title}
            </h2>
            <p className="text-[11px] sm:text-xs leading-relaxed max-w-xs mx-auto font-bold text-gray-500 dark:text-gray-300">
              {step.description}
            </p>
          </div>

           <div className="space-y-6 pt-4">
            
             <div className="flex justify-center gap-1.5 shrink-0">
              {steps.map((_, index) => {
                const isCurrent = index === currentStep;
                return (
                  <button
                    key={index}
                    onClick={() => handleDotClick(index)}  
                    className="h-1.5 rounded-full transition-all duration-300 outline-none"
                    style={{
                      width: isCurrent ? '20px' : '6px',  
                      background: isCurrent ? colors.primary : colors.primary + '25',
                    }}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <button
                type="button"
                onClick={handleComplete}
                className="text-[11px] font-black uppercase tracking-wider text-gray-400 hover:text-gray-600 transition"
              >
                Ignorer
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-2xl text-white font-black text-xs sm:text-sm transition-all hover:opacity-95 shadow-md flex items-center gap-1.5 hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: colors.primary }}
              >
                {isLastStep ? 'Commencer' : 'Suivant'}
                <ArrowRight size={13} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
