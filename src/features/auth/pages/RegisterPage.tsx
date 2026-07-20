// 📁 src/features/auth/pages/RegisterPage.tsx
 
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Users,
  CheckCircle,
  HeartHandshake,
  Baby,
  MapPin,
  Briefcase,
  FileText,
  ShieldCheck,
  Loader2,
  Home,
  CreditCard,
  HelpCircle,
  Scale,
} from 'lucide-react';

import { authAPI } from '@/lib/api';
import { Logo } from '@/components/ui/Logo';
import { Offer } from '@/types';
import { InfoModal } from '@/components/ui/InfoModal';
import { FAQContent } from '../components/FAQContent';
import { CGUContent } from '../components/CGUContent';
import { useBranding } from '@/hooks/useBranding';
import { useOfferStore } from '@/stores/offerStore';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

type AccountChoice = 'family_with_patient' | 'personal' | 'aidant';
type PatientCategory = 'senior' | 'maman_bebe';

const SPECIALTIES = [
  { id: 'senior', label: 'Seniors', icon: '👴' },
  { id: 'maman_bebe', label: 'Maman & Bébé', icon: '👶' },
  { id: 'accompagnement', label: 'Accompagnement', icon: '🩺' },
  { id: 'autre', label: 'Autre', icon: '📝' },
];

const ZONES = [
  'Cotonou',
  'Abomey-Calavi',
  'Porto-Novo',
  'Ouidah',
  'Bohicon',
  'Parakou',
  'Autre',
];

// ============================================================
// 📊 GRILLE TARIFAIRE OFFICIELLE DES 8 ABONNEMENTS (RÉFÉRENTIEL COMPLET) [1]
// ============================================================

const OFFICIAL_SENIOR_OFFERS = [
  { name: 'Essentiel', price: 45000, duration: '4 visites/mois', target: 'Familles, suivi léger', icon: '🌱' },
  { name: 'Accompagnement', price: 80000, duration: '8 visites/mois', target: 'Sortie hôpital, convalescence', icon: '🩺' },
  { name: 'SérénitéSeniors', price: 100000, duration: '12 visites/mois', target: 'Personnes âgées suivi régulier', icon: '👵' },
  { name: 'PrivilègeFamille', price: 200000, duration: 'Suivi illimité', target: 'Familles en otse, coordination totale', icon: '👑' },
];

const OFFICIAL_MAMAN_OFFERS = [
  { name: 'Essentiel', price: 65000, duration: '2 semaines', target: 'Découverte post-partum', icon: '👶' },
  { name: 'Confort', price: 100000, duration: '3 semaines', target: 'Accompagnement standard', icon: '🌸' },
  { name: 'Sérénité', price: 140000, duration: '4 semaines', target: 'Suivi rapproché premium', icon: '💖' },
  { name: 'Privilège', price: 200000, duration: '5 semaines', target: 'Coaching complet + diaspora', icon: '👑' },
];

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const RegisterPage = () => {
  const navigate = useNavigate();
  const brand = useBranding();
  const colors = brand.colors;

  const [step, setStep] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showCGU, setShowCGU] = useState(false);
  const [acceptCGU, setAcceptCGU] = useState(false);

  const [accountChoice, setAccountChoice] = useState<AccountChoice>('family_with_patient');

  const { offers, fetchOffers, isInitialized: offersInitialized } = useOfferStore();

  useEffect(() => {
    if (!offersInitialized) {
      fetchOffers();
    }
  }, [offersInitialized, fetchOffers]);

  // Formulaire raccordé
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'family',
    hasPatient: true,
    patientCategory: 'senior' as PatientCategory,
    patientData: {
      first_name: '',
      last_name: '',
      age: '',
      gender: '',
      address: '',
      phone: '',
      emergency_contact: '',
      emergency_contact_name: '',
      notes: '',
      allergies: '',
      treatments: '',
      conditions: '',
      medical_history: '',
    },
    offreId: '', // Stocke l'UUID de l'offre résolu en BD [1]
  });

  // Profil aidant raccordé
  const [aidantData, setAidantData] = useState({
    birth_date: '',
    address: '',
    experience_years: '',
    specialties: [] as string[],
    availability: true,
    zones: [] as string[],
    bio: '',
  });

  // État local de sélection visuelle d'offre (stocke le nom pour correspondance) [1]
  const [selectedPlanName, setSelectedPlanName] = useState<string>('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isAidant = accountChoice === 'aidant';
  const isPersonal = accountChoice === 'personal';
  const isFamilyWithPatient = accountChoice === 'family_with_patient';
  const isMaman = formData.patientCategory === 'maman_bebe';
  const primaryColor = colors.primary;
  const textColor = colors.text;

  const steps = useMemo(() => {
    if (isFamilyWithPatient) {
      return [
        { number: 1, label: 'Choix' },
        { number: 2, label: 'Service' },
        { number: 3, label: 'Identité' },
        { number: 4, label: 'Proche' },
        { number: 5, label: 'Validation' },
      ];
    }
    if (isAidant) {
      return [
        { number: 1, label: 'Choix' },
        { number: 2, label: 'Identité' },
        { number: 3, label: 'Profil' },
        { number: 4, label: 'Zone' },
        { number: 5, label: 'Validation' },
      ];
    }
    return [
      { number: 1, label: 'Choix' },
      { number: 2, label: 'Identité' },
      { number: 3, label: 'Validation' },
    ];
  }, [isAidant, isFamilyWithPatient]);

  const totalSteps = steps.length;
  const serviceLabel = formData.patientCategory === 'maman_bebe' ? 'Maman & Bébé' : 'Senior';
  const pageSubtitle = isAidant ? 'Rejoindre nos équipes d\'aidants' : isPersonal ? 'Création de compte rapide' : 'Prise en charge d\'un proche';

  const handleAccountChoice = (choice: AccountChoice) => {
    setAccountChoice(choice);
    if (choice === 'aidant') {
      setFormData((prev) => ({ ...prev, role: 'aidant', hasPatient: false }));
    }
    if (choice === 'personal') {
      setFormData((prev) => ({ ...prev, role: 'family', hasPatient: false }));
    }
    if (choice === 'family_with_patient') {
      setFormData((prev) => ({ ...prev, role: 'family', hasPatient: true }));
    }
    setTimeout(() => setStep(2), 150);
  };

  const handleServiceChoice = (category: PatientCategory) => {
    setFormData((prev) => ({ ...prev, patientCategory: category }));
    setSelectedPlanName(''); // reset plan si la catégorie change [1]
    setTimeout(() => setStep(3), 150);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (name.startsWith('patient.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        patientData: { ...prev.patientData, [field]: value },
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const toggleSpecialty = (id: string) => {
    setAidantData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(id)
        ? prev.specialties.filter((item) => item !== id)
        : [...prev.specialties, id],
    }));
  };

  const toggleZone = (zone: string) => {
    setAidantData((prev) => ({
      ...prev,
      zones: prev.zones.includes(zone)
        ? prev.zones.filter((item) => item !== zone)
        : [...prev.zones, zone],
    }));
  };

  // ✅ VALIDATION ET CONTROLE EN DIRECT DE CHAQUE ETAPE
  const canGoNext = () => {
    const identityStep = isFamilyWithPatient ? 3 : 2;
    if (step === identityStep) {
      if (!formData.full_name.trim()) {
        toast.error('Veuillez saisir votre nom complet');
        return false;
      }
      if (!formData.phone.trim()) {
        toast.error('Veuillez saisir votre téléphone');
        return false;
      }
      if (!formData.email.trim()) {
        toast.error('Veuillez saisir votre email');
        return false;
      }
      if (formData.password.length < 6) {
        toast.error('Le mot de passe doit contenir au moins 6 caractères');
        return false;
      }
    }
    
    // Validation aidant
    if (isAidant && step === 3) {
      if (!aidantData.birth_date) {
        toast.error('Veuillez saisir votre date de naissance');
        return false;
      }
      if (!aidantData.experience_years) {
        toast.error('Veuillez spécifier vos années d’expérience');
        return false;
      }
      if (!aidantData.address.trim()) {
        toast.error('Veuillez renseigner votre adresse de résidence');
        return false;
      }
      if (aidantData.specialties.length === 0) {
        toast.error('Sélectionnez au moins une spécialité d’accompagnement');
        return false;
      }
    }

    if (isAidant && step === 4) {
      if (aidantData.zones.length === 0) {
        toast.error('Veuillez sélectionner au moins une zone d’intervention');
        return false;
      }
      if (!aidantData.bio.trim()) {
        toast.error('Veuillez renseigner une courte description de vos compétences');
        return false;
      }
    }

    // Validation proche
    if (isFamilyWithPatient && step === 4) {
      if (!formData.patientData.first_name.trim()) {
        toast.error('Veuillez renseigner le prénom de votre proche');
        return false;
      }
      if (!formData.patientData.last_name.trim()) {
        toast.error('Veuillez renseigner le nom de famille de votre proche');
        return false;
      }
      if (!formData.patientData.address.trim()) {
        toast.error('Veuillez renseigner l\'adresse de votre proche');
        return false;
      }
    }
    return true;
  };

  const canSubmit = () => {
    // Si famille avec patient, l'offre d'abonnement est obligatoire lors de l'inscription ! [1]
    const isOfferSelected = !isFamilyWithPatient || formData.offreId !== '';
    return formData.full_name.trim() && formData.email.trim() && formData.phone.trim() && formData.password.length >= 6 && acceptCGU && isOfferSelected;
  };

  const handleContinue = () => {
    if (!canGoNext()) return;
    setStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (step !== totalSteps) return;

    if (!acceptCGU) {
      toast.error('Veuillez accepter les Conditions Générales d\'Utilisation');
      return;
    }

    setIsLoading(true);
    try {
      const registerData: any = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: isAidant ? 'aidant' : 'family',
      };
      
      if (!isAidant) {
        registerData.hasPatient = isFamilyWithPatient;
        registerData.patientCategory = formData.patientCategory;
        registerData.offreId = formData.offreId;
        registerData.patientData = isFamilyWithPatient ? {
          first_name: formData.patientData.first_name.trim(),
          last_name: formData.patientData.last_name.trim(),
          age: formData.patientData.age ? parseInt(formData.patientData.age, 10) : null,
          gender: formData.patientData.gender || null,
          address: formData.patientData.address.trim(),
          phone: formData.patientData.phone.trim() || null,
          emergency_contact: formData.patientData.emergency_contact.trim() || null,
          emergency_contact_name: formData.patientData.emergency_contact_name.trim() || null,
          notes: formData.patientData.notes.trim() || null,
          allergies: formData.patientData.allergies.trim() || null,
          treatments: formData.patientData.treatments.trim() || null,
          conditions: formData.patientData.conditions.trim() || null,
          medical_history: formData.patientData.medical_history.trim() || null,
          category: formData.patientCategory,
        } : null;
      }
      
      if (isAidant) {
        registerData.aidantData = {
          birth_date: aidantData.birth_date,
          address: aidantData.address.trim(),
          experience_years: aidantData.experience_years ? parseInt(aidantData.experience_years, 10) : null,
          specialties: aidantData.specialties,
          availability: aidantData.availability,
          zones: aidantData.zones,
          bio: aidantData.bio.trim(),
        };
      }

      const response = await authAPI.register(registerData);
      if (response.data?.success) {
        toast.success(isAidant ? 'Candidature envoyée ! L\'administration l\'étudiera sous 48h.' : 'Bienvenue ! Votre compte est actif.');
        navigate('/login');
      }
    } catch (error: any) {
      console.error('❌ Erreur inscription:', error);
      toast.error(error.response?.data?.error || "Erreur lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ ACTION DE SELECTION D'ABONNEMENT INTERACTIVE (FUSIONNE L'UUID RÉEL SÉCURISÉ) [1]
  const handleSelectPlan = (planName: string) => {
    setSelectedPlanName(planName);

    // Résoudre l'UUID de l'offre en direct depuis le store des offres
    const matchedOffer = offers.find(o => o.name.toLowerCase() === planName.toLowerCase());
    if (matchedOffer?.id) {
      setFormData(prev => ({ ...prev, offreId: matchedOffer.id }));
      toast.success(`Abonnement ${planName} sélectionné !`);
    } else {
      // Fallback au cas ou la base de données n'est pas encore synchrone
      setFormData(prev => ({ ...prev, offreId: planName }));
    }
  };

  // ✅ CONSTITUTION DES CARTES DE SOUSCRIPTIONS INTERACTIVES TOTALEMENT ALIGNÉES ! [1]
  const renderOfferPreview = () => {
    const targetOffers = formData.patientCategory === 'maman_bebe' ? OFFICIAL_MAMAN_OFFERS : OFFICIAL_SENIOR_OFFERS;

    return (
      <div className="space-y-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 animate-fadeIn" style={{ background: `${primaryColor}15`, color: primaryColor }}>
            <CreditCard size={16} />
          </div>
          <div>
            <p className="font-bold text-xs sm:text-sm" style={{ color: textColor }}>Sélectionnez un forfait d'accompagnement *</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-none">Choisissez l'offre initiale requise (règlement ultérieur).</p>
          </div>
        </div>

        {/* GRILLE DE CARTES INTERACTIVES SÉLECTIONNABLES ALIGNÉES [1] */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {targetOffers.map((plan) => {
            const isSelected = selectedPlanName.toLowerCase() === plan.name.toLowerCase();
            return (
              <button
                key={plan.name}
                type="button"
                onClick={() => handleSelectPlan(plan.name)}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[140px] relative hover:shadow-md animate-fadeIn",
                  isSelected 
                    ? "border-[2px] bg-[--color-primary]05 shadow-sm"
                    : "bg-white border-gray-200 hover:border-gray-300"
                )}
                style={{
                  borderColor: isSelected ? primaryColor : undefined,
                  backgroundColor: isSelected ? `${primaryColor}08` : '#ffffff',
                }}
              >
                {/* Badge sélectionné en haut à droite [1] */}
                {isSelected && (
                  <span className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider text-white" style={{ background: primaryColor }}>
                    Sélectionné
                  </span>
                )}

                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 bg-gray-50 border shadow-inner">
                  {plan.icon}
                </div>

                <div className="mt-4">
                  <p className="font-extrabold text-xs" style={{ color: colors.text }}>
                    {plan.name} <span className="text-[10px] font-medium text-gray-400">({plan.duration})</span>
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-snug line-clamp-2">{plan.target}</p>
                  <p className="text-xs font-black mt-2" style={{ color: primaryColor }}>
                    {plan.price.toLocaleString()} FCFA
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {!formData.offreId && (
          <p className="text-[10px] font-bold text-red-500 animate-pulse">
            ⚠️ Veuillez sélectionner un forfait ci-dessus pour finaliser votre dossier d'inscription [1].
          </p>
        )}
      </div>
    );
  };

  const renderValidationStep = () => {
    return (
      <div className="space-y-4 animate-fadeIn">
        <div className="space-y-0.5">
          <h3 className="text-base font-bold" style={{ color: textColor }}>
            {isAidant ? 'Vérifier ma candidature' : 'Vérifier mon inscription'}
          </h3>
          <p className="text-xs" style={{ color: colors.textLight }}>
            Relisez attentivement vos informations avant de valider votre compte.
          </p>
        </div>

        <div className="rounded-2xl p-4 border space-y-2.5" style={{ background: `${primaryColor}06`, borderColor: `${primaryColor}20` }}>
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${primaryColor}12`, color: primaryColor }}>
              <User size={16} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Nom complet de l'adhérent</p>
              <p className="text-xs font-semibold break-words mt-0.5" style={{ color: textColor }}>{formData.full_name || 'Non renseigné'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${primaryColor}12`, color: primaryColor }}>
              <Mail size={16} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">E-mail</p>
              <p className="text-xs font-semibold break-words mt-0.5" style={{ color: textColor }}>{formData.email || 'Non renseigné'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${primaryColor}12`, color: primaryColor }}>
              <Phone size={16} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Téléphone de l'adhérent</p>
              <p className="text-xs font-semibold break-words mt-0.5" style={{ color: textColor }}>{formData.phone || 'Non renseigné'}</p>
            </div>
          </div>

          {isAidant ? (
            <>
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${primaryColor}12`, color: primaryColor }}>
                  <Briefcase size={16} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Type d'engagement</p>
                  <p className="text-xs font-semibold break-words mt-0.5" style={{ color: textColor }}>Candidature intervenant (Aidant)</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${primaryColor}12`, color: primaryColor }}>
                  <FileText size={16} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Spécialités d'accompagnement</p>
                  <p className="text-xs font-semibold break-words mt-0.5" style={{ color: textColor }}>{aidantData.specialties.map((id: string) => SPECIALTIES.find((item) => item.id === id)?.label || id).join(', ') || 'Non renseigné'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${primaryColor}12`, color: primaryColor }}>
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Zones d'intervention (Bénin)</p>
                  <p className="text-xs font-semibold break-words mt-0.5" style={{ color: textColor }}>{aidantData.zones.length ? aidantData.zones.join(', ') : 'Non renseigné'}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${primaryColor}12`, color: primaryColor }}>
                  <Home size={16} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Type de compte</p>
                  <p className="text-xs font-semibold break-words mt-0.5" style={{ color: textColor }}>{isPersonal ? 'Compte personnel sans proche à charge' : 'Accompagnement d\'un proche'}</p>
                </div>
              </div>
              {!isPersonal && (
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${primaryColor}12`, color: primaryColor }}>
                    <Baby size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Catégorie d'accompagnement</p>
                    <p className="text-xs font-semibold break-words mt-0.5" style={{ color: textColor }}>{serviceLabel}</p>
                  </div>
                </div>
              )}
              {isFamilyWithPatient && formData.patientData.first_name && (
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${primaryColor}12`, color: primaryColor }}>
                    <Users size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Identity du proche</p>
                    <p className="text-xs font-semibold break-words mt-0.5" style={{ color: textColor }}>
                      {formData.patientData.first_name} {formData.patientData.last_name}
                      {formData.patientData.address && ` • Adresse: ${formData.patientData.address}`}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex items-start gap-2.5 pt-2 border-t" style={{ borderColor: colors.border }}>
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${primaryColor}12`, color: primaryColor }}>
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Vérification de sécurité</p>
              <p className="text-xs font-semibold break-words mt-0.5" style={{ color: primaryColor }}>
                {isAidant ? '⏳ En attente de validation administrative (48h)' : '🟢 Validation automatique'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {isAidant 
                  ? 'Toutes les candidatures font l\'objet d\'une étude de profil et d\'un entretien physique par nos équipes.'
                  : 'Votre compte famille est immédiatement validé et prêt à l\'usage.'}
              </p>
            </div>
          </div>
        </div>

        {isFamilyWithPatient && renderOfferPreview()}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 sm:p-6 lg:p-8" style={{ background: colors.background }}>
      <div className={`w-full max-w-5xl transition-all duration-500 ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        
        <div className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-sm border-0 sm:border overflow-hidden min-h-screen sm:min-h-0 sm:h-[600px] w-full" style={{ borderColor: colors.border }}>
          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] h-full">

            {/* Colonne latérale */}
            <div className="hidden lg:flex flex-col justify-between p-10 h-full" style={{ background: colors.gradient || colors.primary }}>
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                    <Logo size="sm" showText={false} whiteBg={true} className="justify-center" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Santé Plus Services</p>
                    <p className="text-white/60 text-[11px]">Accompagnement à domicile</p>
                  </div>
                </div>
                <h1 className="text-2xl font-extrabold text-white leading-tight">
                  {isMaman ? 'Un cocon doux pour maman & bébé.' : isAidant ? "Rejoignez le réseau Santé Plus." : 'Un accompagnement simple et rassurant.'}
                </h1>
                <p className="text-xs text-white/70 mt-3">
                  {isMaman ? 'Un suivi et une aide physique post-partum de confiance.' : isAidant ? 'Valorisez vos compétences d\'auxiliaires de vie sociale.' : 'Votre proche au cœur de nos priorités.'}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-white/80 text-xs"><CheckCircle size={14} className="text-white shrink-0" />Suivi d'activité et GPS transparent</div>
                <div className="flex items-center gap-2.5 text-white/80 text-xs"><CheckCircle size={14} className="text-white shrink-0" />Intervenants rigoureusement formés</div>
                <div className="flex items-center gap-2.5 text-white/80 text-xs"><CheckCircle size={14} className="text-white shrink-0" />Coordination et rapports en temps réel</div>
              </div>
            </div>

            {/* Formulaire Principal */}
            <main className="px-6 py-6 sm:p-6 lg:p-8 flex flex-col justify-between min-h-screen sm:min-h-0 sm:h-full bg-white">

              {/* Logo Mobile */}
              <div className="lg:hidden flex justify-center mb-6">
                <div className="w-12 h-12 rounded-2xl border-none flex items-center justify-center" style={{ background: `${primaryColor}12` }}>
                  <Logo size="sm" showText={false} whiteBg={false} className="justify-center" />
                </div>
              </div>

              {/* En-tête */}
              <div className="mb-4 sm:mb-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: textColor }}>
                      {isMaman ? '🌸 Créer mon espace maman' : isAidant ? '🦸 Rejoindre les aidants' : 'Créer un compte'}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: colors.textLight }}>
                      {step === 1 ? 'Choisissez d\'abord votre profil' : 
                       step === totalSteps ? 'Dossier de synthèse d\'inscription' : 
                       pageSubtitle}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0">
                    Étape {step}/{totalSteps}
                  </span>
                </div>

                {/* Barre de progression */}
                <div className="mt-4">
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: `${primaryColor}20` }}>
                    <div className="h-full transition-all duration-300 rounded-full" style={{ width: `${(step / totalSteps) * 100}%`, background: primaryColor }} />
                  </div>
                  <div className="hidden sm:grid gap-2 mt-1.5" style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}>
                    {steps.map((item) => (
                      <p key={item.number} className="text-[10px] font-semibold text-center truncate" style={{ color: step >= item.number ? primaryColor : '#9ca3af' }}>
                        {item.label}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contenu dynamique */}
              <div className="flex-1 flex flex-col justify-between min-h-0">
                <div 
                  className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 space-y-4"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: `${primaryColor}20 transparent`
                  }}
                >
                  {/* Étape 1 : Choix du type de compte */}
                  {step === 1 && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="space-y-0.5">
                        <h3 className="text-base font-bold" style={{ color: textColor }}>Quel est votre besoin ?</h3>
                        <p className="text-xs" style={{ color: colors.textLight }}>Sélectionnez le type d'inscription requis.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button type="button" onClick={() => handleAccountChoice('family_with_patient')} className="text-left p-4 rounded-2xl border transition-all hover:border-gray-300 flex flex-col justify-between min-h-[135px] sm:min-h-[145px]" style={{ borderColor: accountChoice === 'family_with_patient' ? primaryColor : '#e5e7eb', background: accountChoice === 'family_with_patient' ? `${primaryColor}08` : '#ffffff' }}>
                          <div className="w-8 h-8 rounded-2xl flex items-center justify-center mb-2" style={{ background: accountChoice === 'family_with_patient' ? `${primaryColor}20` : '#f3f4f6', color: accountChoice === 'family_with_patient' ? primaryColor : '#9ca3af' }}><Users size={18} /></div>
                          <div><p className="font-bold text-xs" style={{ color: accountChoice === 'family_with_patient' ? primaryColor : '#111827' }}>Pour un proche</p><p className="text-[11px] text-gray-500 mt-0.5 leading-tight line-clamp-2">Seniors, mamans ou nouveau-nés à accompagner à domicile.</p></div>
                        </button>
                        <button type="button" onClick={() => handleAccountChoice('personal')} className="text-left p-4 rounded-2xl border transition-all hover:border-gray-300 flex flex-col justify-between min-h-[135px] sm:min-h-[145px]" style={{ borderColor: accountChoice === 'personal' ? primaryColor : '#e5e7eb', background: accountChoice === 'personal' ? `${primaryColor}08` : '#ffffff' }}>
                          <div className="w-8 h-8 rounded-2xl flex items-center justify-center mb-2" style={{ background: accountChoice === 'personal' ? `${primaryColor}20` : '#f3f4f6', color: accountChoice === 'personal' ? primaryColor : '#9ca3af' }}><Home size={18} /></div>
                          <div><p className="font-bold text-xs" style={{ color: accountChoice === 'personal' ? primaryColor : '#111827' }}>Compte personnel</p><p className="text-[11px] text-gray-500 mt-0.5 leading-tight line-clamp-2">Pour des commandes ponctuelles sans proche à charge.</p></div>
                        </button>
                        <button type="button" onClick={() => handleAccountChoice('aidant')} className="text-left p-4 rounded-2xl border transition-all hover:border-gray-300 flex flex-col justify-between min-h-[135px] sm:min-h-[145px]" style={{ borderColor: accountChoice === 'aidant' ? primaryColor : '#e5e7eb', background: accountChoice === 'aidant' ? `${primaryColor}08` : '#ffffff' }}>
                          <div className="w-8 h-8 rounded-2xl flex items-center justify-center mb-2" style={{ background: accountChoice === 'aidant' ? `${primaryColor}20` : '#f3f4f6', color: accountChoice === 'aidant' ? primaryColor : '#9ca3af' }}><HeartHandshake size={18} /></div>
                          <div><p className="font-bold text-xs" style={{ color: accountChoice === 'aidant' ? primaryColor : '#111827' }}>Devenir aidant</p><p className="text-[11px] text-gray-500 mt-0.5 leading-tight line-clamp-2">Proposer mes services logistiques et d'accompagnement social.</p></div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Étape 2 : Choix du service (Proche uniquement) */}
                  {step === 2 && isFamilyWithPatient && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="space-y-0.5">
                        <h3 className="text-base font-bold" style={{ color: textColor }}>Quelle assistance recherchez-vous ?</h3>
                        <p className="text-xs" style={{ color: colors.textLight }}>Sélectionnez la catégorie cible.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <button type="button" onClick={() => handleServiceChoice('senior')} className="p-4 rounded-2xl border text-left transition-all hover:border-gray-300 flex flex-col justify-between min-h-[130px] sm:min-h-[140px]" style={{ borderColor: formData.patientCategory === 'senior' ? primaryColor : '#e5e7eb', background: formData.patientCategory === 'senior' ? `${primaryColor}08` : '#ffffff' }}>
                          <div className="w-8 h-8 rounded-2xl flex items-center justify-center mb-2" style={{ background: formData.patientCategory === 'senior' ? `${primaryColor}20` : '#f3f4f6', color: formData.patientCategory === 'senior' ? primaryColor : '#9ca3af' }}><Users size={18} /></div>
                          <div><p className="font-bold text-xs" style={{ color: textColor }}>Senior</p><p className="text-[11px] text-gray-500 mt-0.5 leading-tight line-clamp-2">Aide sociale, veille, rappel de médicaments et présence d'écoute.</p></div>
                        </button>
                        <button type="button" onClick={() => handleServiceChoice('maman_bebe')} className="p-4 rounded-2xl border text-left transition-all hover:border-gray-300 flex flex-col justify-between min-h-[130px] sm:min-h-[140px]" style={{ borderColor: formData.patientCategory === 'maman_bebe' ? primaryColor : '#e5e7eb', background: formData.patientCategory === 'maman_bebe' ? `${primaryColor}08` : '#ffffff' }}>
                          <div className="w-8 h-8 rounded-2xl flex items-center justify-center mb-2" style={{ background: formData.patientCategory === 'maman_bebe' ? `${primaryColor}20` : '#f3f4f6', color: formData.patientCategory === 'maman_bebe' ? primaryColor : '#9ca3af' }}><Baby size={18} /></div>
                          <div><p className="font-bold text-xs" style={{ color: textColor }}>Maman & Bébé</p><p className="text-[11px] text-gray-500 mt-0.5 leading-tight line-clamp-2">Soutien post-partum, soins d'éveil du nourrisson et aide maman.</p></div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Étape Identité */}
                  {((step === 2 && !isFamilyWithPatient) || (step === 3 && isFamilyWithPatient)) && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="space-y-0.5"><h3 className="text-base font-bold" style={{ color: textColor }}>Identifiants de l'adhérent</h3><p className="text-xs" style={{ color: colors.textLight }}>Informations personnelles du titulaire du compte.</p></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Nom complet *</label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: colors.textLight }} /><input name="full_name" value={formData.full_name} onChange={handleChange} placeholder="Ex: Jean Dupont" className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }} required /></div></div>
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Téléphone *</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: colors.textLight }} /><input name="phone" value={formData.phone} onChange={handleChange} placeholder="+229 90 00 00 00" className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }} required /></div></div>
                        <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Adresse e-mail de connexion *</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: colors.textLight }} /><input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="votremail@adresse.com" className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }} required /></div></div>
                        <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Mot de passe de sécurité *</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: colors.textLight }} /><input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required minLength={6} placeholder="Minimum 6 caractères" className="w-full pl-9 pr-9 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: colors.textLight }}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
                      </div>
                    </div>
                  )}

                  {/* Synthèse Intermédiaire (Personal) */}
                  {step === 3 && isPersonal && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="space-y-0.5"><h3 className="text-base font-bold" style={{ color: textColor }}>Validation finale de mon compte</h3><p className="text-xs" style={{ color: colors.textLight }}>Relisez vos informations avant de créer le compte.</p></div>
                      <div className="rounded-2xl p-4 border space-y-3" style={{ background: `${primaryColor}06`, borderColor: `${primaryColor}20` }}>
                        <div className="flex items-start gap-2.5"><div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${primaryColor}15`, color: primaryColor }}><User size={16} /></div><div><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Nom complet de l'abonné</p><p className="text-xs font-semibold break-words mt-0.5" style={{ color: textColor }}>{formData.full_name || 'Non renseigné'}</p></div></div>
                        <div className="flex items-start gap-2.5"><div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${primaryColor}15`, color: primaryColor }}><Mail size={16} /></div><div><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">E-mail</p><p className="text-xs font-semibold break-words mt-0.5" style={{ color: textColor }}>{formData.email || 'Non renseigné'}</p></div></div>
                        <div className="flex items-start gap-2.5"><div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${primaryColor}15`, color: primaryColor }}><Phone size={16} /></div><div><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Téléphone de l'abonné</p><p className="text-xs font-semibold break-words mt-0.5" style={{ color: textColor }}>{formData.phone || 'Non renseigné'}</p></div></div>
                        <div className="flex items-start gap-2.5"><div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${primaryColor}15`, color: primaryColor }}><Home size={16} /></div><div><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Type de compte</p><p className="text-xs font-semibold break-words mt-0.5" style={{ color: textColor }}>Compte personnel d'achats ponctuels (sans proche rattaché)</p></div></div>
                        <p className="text-[10px] text-gray-400 pt-2 border-t border-black/5">Votre compte sera immédiatement validé automatiquement.</p>
                      </div>
                    </div>
                  )}

                  {/* Profil de l'aidant */}
                  {step === 3 && isAidant && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="space-y-0.5"><h3 className="text-base font-bold" style={{ color: textColor }}>Votre profil d'intervenant</h3><p className="text-xs" style={{ color: colors.textLight }}>Renseignez vos spécialités et coordonnées d'aide.</p></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Date de naissance *</label><input type="date" name="birth_date" value={aidantData.birth_date} onChange={(e) => setAidantData({ ...aidantData, birth_date: e.target.value })} className="w-full px-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }} required /></div>
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Années d'expérience *</label><select name="experience_years" value={aidantData.experience_years} onChange={(e) => setAidantData({ ...aidantData, experience_years: e.target.value })} className="w-full px-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }} required><option value="">Sélectionner</option><option value="0">Débutant / &lt; 1 an</option><option value="2">2 à 3 ans</option><option value="4">4 à 5 ans</option><option value="6">6 à 10 ans</option><option value="10">Plus de 10 ans</option></select></div>
                        <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Adresse précise de résidence *</label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: colors.textLight }} /><input name="address" value={aidantData.address} onChange={(e) => setAidantData({ ...aidantData, address: e.target.value })} placeholder="Quartier, Ville de résidence" className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }} required /></div></div>
                      </div>
                      <div><p className="text-xs font-semibold mb-1.5" style={{ color: textColor }}>Spécialités principales d'accompagnement *</p><div className="grid grid-cols-2 gap-2">{SPECIALTIES.map((item) => { const active = aidantData.specialties.includes(item.id); return <button type="button" key={item.id} onClick={() => toggleSpecialty(item.id)} className="px-3 py-2.5 rounded-2xl border text-left text-xs transition-all hover:border-gray-300" style={{ borderColor: active ? primaryColor : '#e5e7eb', background: active ? `${primaryColor}08` : '#ffffff', color: textColor }}><span className="mr-2">{item.icon}</span>{item.label}</button>; })}</div></div>
                    </div>
                  )}

                  {/* Informations Proche */}
                  {step === 4 && isFamilyWithPatient && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="space-y-0.5"><h3 className="text-base font-bold" style={{ color: textColor }}>Fiche d'identité de votre proche</h3><p className="text-xs" style={{ color: colors.textLight }}>Renseignez son dossier clinique. Service : {serviceLabel}</p></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Prénom du proche *</label><input name="patient.first_name" value={formData.patientData.first_name} onChange={handleChange} placeholder="Prénom" className="w-full px-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }} required /></div>
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Nom de famille du proche *</label><input name="patient.last_name" value={formData.patientData.last_name} onChange={handleChange} placeholder="Nom de famille" className="w-full px-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }} required /></div>
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Âge du proche (ans)</label><input name="patient.age" type="number" min="0" max="130" value={formData.patientData.age} onChange={handleChange} placeholder="Ex: 78" className="w-full px-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }} /></div>
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Sexe du proche</label><select name="patient.gender" value={formData.patientData.gender} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }}><option value="">Sélectionner</option><option value="male">Homme</option><option value="female">Femme</option><option value="other">Autre</option></select></div>
                        <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Lieu précis de prise en charge (Adresse) *</label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: colors.textLight }} /><input name="patient.address" value={formData.patientData.address} onChange={handleChange} placeholder="Quartier, Ville ou repères de livraison" className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }} required /></div></div>
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Téléphone du proche (optionnel)</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: colors.textLight }} /><input name="patient.phone" value={formData.patientData.phone} onChange={handleChange} placeholder="Ex: 90 00 00 00" className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }} /></div></div>
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Téléphone d'urgence (Garant)</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: colors.textLight }} /><input name="patient.emergency_contact" value={formData.patientData.emergency_contact} onChange={handleChange} placeholder="Ex: 97 00 00 00" className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }} /></div></div>
                        <div className="sm:col-span-2"><div><label className="block text-xs font-semibold mb-1" style={{ color: colors.text }}>Nom complet du contact d'urgence</label><input name="patient.emergency_contact_name" value={formData.patientData.emergency_contact_name} onChange={handleChange} placeholder="Lien de parenté ou nom complet" className="w-full px-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: colors.text }} /></div></div>
                        <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Consignes et notes d'accompagnement utiles</label><textarea name="patient.notes" value={formData.patientData.notes} onChange={handleChange} rows={2} placeholder="Saisissez ici ses habitudes, restrictions alimentaires ou besoins..." className="w-full px-3.5 py-2 rounded-2xl border outline-none text-xs resize-none focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }} /></div>
                      </div>
                    </div>
                  )}

                  {/* Zones et dispo (Aidant uniquement) */}
                  {step === 4 && isAidant && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="space-y-0.5"><h3 className="text-base font-bold" style={{ color: textColor }}>Rayon de mobilité d'intervention</h3><p className="text-xs" style={{ color: colors.textLight }}>Où et quand pouvez-vous vous déplacer ?</p></div>
                      <div><p className="text-xs font-semibold mb-1.5" style={{ color: textColor }}>Zones de travail privilégiées *</p><div className="flex flex-wrap gap-2">{ZONES.map((zone) => { const active = aidantData.zones.includes(zone); return <button type="button" key={zone} onClick={() => toggleZone(zone)} className="px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all animate-fadeIn" style={{ borderColor: active ? primaryColor : '#e5e7eb', background: active ? primaryColor : '#ffffff', color: active ? '#ffffff' : '#4b5563' }}>{zone}</button>; })}</div></div>
                      <div><label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Votre description professionnelle</label><textarea value={aidantData.bio} onChange={(e) => setAidantData({ ...aidantData, bio: e.target.value })} rows={3} placeholder="Parlez-nous brièvement de vos motivations et de votre savoir-faire..." className="w-full px-3.5 py-2 rounded-2xl border outline-none text-xs resize-none focus:ring-1" style={{ borderColor: colors.border, background: colors.background, color: textColor }} /></div>
                      <label className="flex items-center gap-3 rounded-2xl border p-3 cursor-pointer bg-white" style={{ borderColor: colors.border }}><input type="checkbox" checked={aidantData.availability} onChange={(e) => setAidantData({ ...aidantData, availability: e.target.checked })} className="w-4 h-4 rounded" style={{ accentColor: primaryColor }} /><span className="text-xs font-medium" style={{ color: textColor }}>Je suis immédiatement disponible pour démarrer</span></label>
                    </div>
                  )}

                  {/* Étape finale : Validation */}
                  {step === totalSteps && renderValidationStep()}
                </div>

                {/* ============================================
                    MENTIONS LÉGALES & CGU
                    ============================================ */}
                <div className="space-y-2 mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <button type="button" onClick={() => setShowFAQ(true)} className="flex items-center gap-1.5 font-medium hover:underline opacity-80 hover:opacity-100" style={{ color: primaryColor }}><HelpCircle size={14} /> Consulter la FAQ</button>
                    <button type="button" onClick={() => setShowCGU(true)} className="flex items-center gap-1.5 font-medium hover:underline opacity-80 hover:opacity-100" style={{ color: primaryColor }}><Scale size={14} /> Lire les CGU</button>
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptCGU}
                      onChange={(e) => setAcceptCGU(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 shrink-0"
                      style={{ accentColor: primaryColor }}
                    />
                    <span className="text-xs leading-relaxed" style={{ color: colors.textLight }}>
                      J'accepte sans réserve les <button type="button" onClick={() => setShowCGU(true)} className="font-bold hover:underline" style={{ color: primaryColor }}>Conditions Générales d'Utilisation</button> de Santé Plus Services.
                    </span>
                  </label>
                  {!acceptCGU && step === totalSteps && (
                    <p className="text-[11px] font-semibold text-red-500">
                      ⚠️ L'acceptation des CGU est requise pour soumettre votre dossier.
                    </p>
                  )}
                </div>

                {/* ============================================
                    BOUTONS DE NAVIGATION
                    ============================================ */}
                <div className="flex gap-3 mt-4">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 max-w-[150px] py-2.5 rounded-2xl text-xs font-bold border transition-colors hover:bg-gray-50 flex items-center justify-center gap-1.5"
                      style={{ borderColor: colors.border, color: textColor }}
                    >
                      <ArrowLeft size={14} /> Retour
                    </button>
                  )}

                  {step !== totalSteps ? (
                    <button
                      type="button"
                      onClick={handleContinue}
                      className="flex-1 py-2.5 rounded-2xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95"
                      style={{ background: primaryColor }}
                    >
                      Continuer <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!canSubmit() || isLoading}
                      className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: canSubmit() ? primaryColor : '#9CA3AF' }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} />
                          {isAidant ? 'Soumettre ma candidature' : 'Créer mon compte'}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Redirection Connexion */}
              <div className="mt-4 text-center text-xs">
                <p style={{ color: colors.textLight }}>Déjà membre ? <Link to="/login" className="font-bold hover:underline" style={{ color: primaryColor }}>Se connecter</Link></p>
              </div>
            </main>
          </div>
        </div>
      </div>

      <InfoModal isOpen={showFAQ} onClose={() => setShowFAQ(false)} title="❓ FAQ" icon={<HelpCircle size={18} />} maxWidth="lg"><FAQContent /></InfoModal>
      <InfoModal isOpen={showCGU} onClose={() => setShowCGU(false)} title="📜 Conditions Générales d'Utilisation" icon={<Scale size={18} />} maxWidth="xl"><CGUContent /></InfoModal>
    </div>
  );
};

export default RegisterPage;
