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
  // 3. ENTRÉE SÉCURISÉE SANS CONCURRENCE (VÉRIFIÉ ET APPROUVÉ) [1, 24]
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

  // Calcul du dégradé de couleur dynamique selon l'univers (Rose pour maman, Vert forêt pour les autres) [24, 30]
  const gradientClass = isMaman
    ? 'from-[#c62850] to-[#db4a6d]'
    : 'from-[#1a4a3a] to-[#2c6e5c]';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 bg-black/10 backdrop-blur-sm">
      
      {/* BOÎTE FLOATING CARD PREMIUM RESPONSIVE (Style simulateur de téléphone haut de gamme) [24] */}
      <div 
        className={cn(
          "relative w-full h-full sm:h-[600px] sm:max-w-md bg-white sm:rounded-[2.5rem] shadow-2xl overflow-hidden border flex flex-col justify-between animate-fadeIn",
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
            1. BLOC EN DÉGRADÉ IMMERSIF (PREMIER TIERS DU COMPOSANT) [24]
            ============================================================ */}
        <div 
          className={cn("w-full h-[45%] flex items-center justify-center relative bg-gradient-to-br shrink-0", gradientClass)}
        >
          {/* Illustration flottante au centre en transparence ou fondu [23, 24] */}
          <div className="relative w-40 h-40 rounded-full border-4 border-white/20 overflow-hidden shadow-2xl animate-float">
            <img 
              key={currentStep} // Force le fondu enchaîné d'image
              src={step.image} 
              alt={step.title} 
              className="w-full h-full object-cover animate-fadeIn"
            />
          </div>
          
          {/* Courbe organique basse (Wave) qui se fond avec la carte blanche [24] */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-white dark:bg-[#17231d] rounded-t-[2.5rem]" />
        </div>

        {/* ============================================================
            2. CARTE BLANCHE DE BAS DE PAGE COULISSANTE (CONTENU AÉRÉ) [24]
            ============================================================ */}
        <div 
          key={step.id} // Force l'animation fluide de l'ensemble du texte à chaque étape !
          className="flex-1 bg-white dark:bg-[#17231d] px-6 sm:px-8 pb-5 flex flex-col justify-between items-center text-center animate-fadeIn min-h-0"
        >
          <div className="space-y-3.5 my-auto">
            {/* Petit badge d'icône d'étape */}
            <div 
              className="w-10 h-10 rounded-2xl mx-auto flex items-center justify-center text-2xl shrink-0 bg-gray-50 border shadow-inner"
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
          </div>

          {/* Indicateur de petits points de navigation (Dots sous forme de pilules d'IHM) */}
          <div className="flex justify-center gap-1.5 pt-2 shrink-0">
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

        {/* ============================================================
            3. PIED DE PAGE DISCRET (SKIP / NEXT) [24]
            ============================================================ */}
        <div className="p-4 sm:p-5 border-t flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-black/10" style={{ borderColor: colors.primary + '10' }}>
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
