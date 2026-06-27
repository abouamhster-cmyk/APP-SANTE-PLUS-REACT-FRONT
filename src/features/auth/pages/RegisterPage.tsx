// 📁 src/features/auth/pages/RegisterPage.tsx
// 📌 Inscription  

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
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
import { OFFERS } from '@/lib/constants';
import { Offer } from '@/types';
import { InfoModal } from '@/components/ui/InfoModal';
import { FAQContent } from '../components/FAQContent';
import { CGUContent } from '../components/CGUContent';
import toast from 'react-hot-toast';

type AccountChoice = 'family_with_patient' | 'personal' | 'aidant';
type PatientCategory = 'senior' | 'maman_bebe';
type BrandingTheme = 'senior' | 'maman' | 'aidant' | 'general';

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

// ============================================
// 🎨 SYSTEME DE BRANDING DYNAMIQUE
// ============================================

const BRANDING = {
  general: {
    primary: '#113f30',
    primaryLight: '#1d5a46',
    primaryDark: '#0a271e',
    secondary: '#d4af37',
    secondaryLight: '#fcf9f2',
    accent: '#d4af37',
    text: '#1f2937',
    textLight: '#4b5563',
    background: '#faf9f6',
    surface: '#ffffff',
    border: '#e5e7eb',
    gradient: 'linear-gradient(135deg, #113f30 0%, #081f18 100%)',
    logoRole: 'general' as const,
  },
  senior: {
    primary: '#113f30',
    primaryLight: '#1d5a46',
    primaryDark: '#0a271e',
    secondary: '#d4af37',
    secondaryLight: '#fcf9f2',
    accent: '#d4af37',
    text: '#1f2937',
    textLight: '#4b5563',
    background: '#faf9f6',
    surface: '#ffffff',
    border: '#e5e7eb',
    gradient: 'linear-gradient(135deg, #113f30 0%, #081f18 100%)',
    logoRole: 'general' as const,
  },
  maman: {
    primary: '#db4a6d',
    primaryLight: '#e66785',
    primaryDark: '#a82e4a',
    secondary: '#fdf2f4',
    secondaryLight: '#fffbfc',
    accent: '#db4a6d',
    text: '#371e24',
    textLight: '#6b5459',
    background: '#fdf9fa',
    surface: '#ffffff',
    border: '#f5e1e5',
    gradient: 'linear-gradient(135deg, #db4a6d 0%, #a82e4a 100%)',
    logoRole: 'maman' as const,
  },
  aidant: {
    primary: '#235e4e',
    primaryLight: '#327c69',
    primaryDark: '#143d32',
    secondary: '#f0f6f4',
    secondaryLight: '#fafdfc',
    accent: '#327c69',
    text: '#162b25',
    textLight: '#506760',
    background: '#f7faf9',
    surface: '#ffffff',
    border: '#e2ece8',
    gradient: 'linear-gradient(135deg, #235e4e 0%, #112d25 100%)',
    logoRole: 'general' as const,
  },
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const RegisterPage = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOfferDetails, setShowOfferDetails] = useState(false);

  const [showFAQ, setShowFAQ] = useState(false);
  const [showCGU, setShowCGU] = useState(false);
  const [acceptCGU, setAcceptCGU] = useState(false);

  const [accountChoice, setAccountChoice] =
    useState<AccountChoice>('family_with_patient');

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
      notes: '',
      allergies: '',
      treatments: '',
    },
    offreId: '',
  });

  const [aidantData, setAidantData] = useState({
    birth_date: '',
    address: '',
    experience_years: '',
    specialties: [] as string[],
    availability: true,
    zones: [] as string[],
    bio: '',
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getActiveBranding = (): BrandingTheme => {
    if (accountChoice === 'aidant') {
      return 'aidant';
    }
    if (accountChoice === 'family_with_patient') {
      return formData.patientCategory === 'maman_bebe' ? 'maman' : 'senior';
    }
    return 'general';
  };

  const activeBranding = getActiveBranding();
  const branding = BRANDING[activeBranding];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', branding.primary);
    root.style.setProperty('--color-primary-light', branding.primaryLight);
    root.style.setProperty('--color-primary-dark', branding.primaryDark);
    root.style.setProperty('--color-secondary', branding.secondary);
    root.style.setProperty('--color-secondary-light', branding.secondaryLight);
    root.style.setProperty('--color-accent', branding.accent);
    root.style.setProperty('--color-text', branding.text);
    root.style.setProperty('--color-text-light', branding.textLight);
    root.style.setProperty('--color-background', branding.background);
    root.style.setProperty('--color-surface', branding.surface);
    root.style.setProperty('--color-border', branding.border);
    root.className = `theme-${activeBranding}`;
    localStorage.setItem('sante_plus_theme', activeBranding);
  }, [activeBranding, branding]);

  const isAidant = accountChoice === 'aidant';
  const isPersonal = accountChoice === 'personal';
  const isFamilyWithPatient = accountChoice === 'family_with_patient';

  const steps = useMemo(() => {
    if (isFamilyWithPatient) {
      return [
        { number: 1, label: 'Choix' },
        { number: 2, label: 'Service' },
        { number: 3, label: 'Identité' },
        { number: 4, label: 'Proche' },
        { number: 5, label: 'Fin' },
      ];
    }
    if (isAidant) {
      return [
        { number: 1, label: 'Choix' },
        { number: 2, label: 'Identité' },
        { number: 3, label: 'Profil' },
        { number: 4, label: 'Zone' },
        { number: 5, label: 'Fin' },
      ];
    }
    return [
      { number: 1, label: 'Choix' },
      { number: 2, label: 'Identité' },
      { number: 3, label: 'Fin' },
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

  const canGoNext = () => {
    const identityStep = isFamilyWithPatient ? 3 : 2;
    if (step === identityStep) {
      if (!formData.full_name.trim()) { toast.error('Veuillez saisir votre nom complet'); return false; }
      if (!formData.phone.trim()) { toast.error('Veuillez saisir votre téléphone'); return false; }
      if (!formData.email.trim()) { toast.error('Veuillez saisir votre email'); return false; }
      if (formData.password.length < 6) { toast.error('Le mot de passe doit contenir au moins 6 caractères'); return false; }
    }
    if (isAidant && step === 3) {
      if (!aidantData.address.trim()) { toast.error('Veuillez renseigner votre adresse ou quartier'); return false; }
      if (aidantData.specialties.length === 0) { toast.error('Sélectionnez au moins une spécialité'); return false; }
    }
    if (isFamilyWithPatient && step === 4) {
      if (!formData.patientData.first_name.trim()) { toast.error('Veuillez renseigner le prénom du proche'); return false; }
      if (!formData.patientData.last_name.trim()) { toast.error('Veuillez renseigner le nom du proche'); return false; }
      if (!formData.patientData.address.trim()) { toast.error('Veuillez renseigner l\'adresse ou le quartier'); return false; }
    }
    return true;
  };

  const canSubmit = () => {
    return formData.full_name.trim() && formData.email.trim() && formData.phone.trim() && formData.password.length >= 6 && acceptCGU;
  };

  const goNext = () => { if (!canGoNext()) return; setStep((prev) => Math.min(prev + 1, totalSteps)); };
  const goBack = () => { setStep((prev) => Math.max(prev - 1, 1)); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (step !== totalSteps) { goNext(); return; }
    if (!acceptCGU) { toast.error('Veuillez accepter les Conditions Générales d\'Utilisation'); return; }
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
          first_name: formData.patientData.first_name,
          last_name: formData.patientData.last_name,
          age: formData.patientData.age,
          gender: formData.patientData.gender,
          address: formData.patientData.address,
          phone: formData.patientData.phone,
          emergency_contact: formData.patientData.emergency_contact,
          notes: formData.patientData.notes,
          allergies: formData.patientData.allergies,
          treatments: formData.patientData.treatments,
          category: formData.patientCategory,
        } : null;
      }
      if (isAidant) {
        registerData.aidantData = {
          birth_date: aidantData.birth_date,
          address: aidantData.address,
          experience_years: aidantData.experience_years,
          specialties: aidantData.specialties,
          availability: aidantData.availability,
          zones: aidantData.zones,
          bio: aidantData.bio,
        };
      }
      const response = await authAPI.register(registerData);
      if (response.data?.success) {
        toast.success(isAidant ? 'Candidature envoyée. Notre équipe vous contactera.' : 'Inscription envoyée. Votre compte est en attente de validation.');
        navigate('/login');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erreur lors de l'inscription");
    } finally { setIsLoading(false); }
  };

  const renderOfferPreview = () => {
    const offers = formData.patientCategory === 'maman_bebe' ? OFFERS.maman_bebe : OFFERS.senior;
    return (
      <div className="rounded-2xl p-5 border" style={{ background: `${branding.primary}04`, borderColor: `${branding.primary}12` }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}10`, color: branding.primary }}>
              <CreditCard size={18} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: branding.text }}>Aperçu des abonnements {serviceLabel}</p>
              <p className="text-xs text-gray-500">Choix définitif après validation de votre compte.</p>
            </div>
          </div>
          <button type="button" onClick={() => setShowOfferDetails(!showOfferDetails)} className="text-xs font-semibold self-start sm:self-center hover:underline" style={{ color: branding.primary }}>
            {showOfferDetails ? 'Masquer le détail' : 'Voir les détails'}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {offers.map((offer: Offer, index: number) => (
            <div key={index} className="bg-white rounded-xl p-3.5 border transition-all" style={{ borderColor: branding.border }}>
              <p className="text-base">{offer.badge?.split(' ')[0] || '📌'}</p>
              <p className="text-xs font-semibold mt-1.5 truncate" style={{ color: branding.text }}>{offer.name}</p>
              <p className="text-xs font-bold mt-1" style={{ color: branding.primary }}>{Number(offer.price || 0).toLocaleString()} FCFA</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{offer.period}</p>
            </div>
          ))}
        </div>
        {showOfferDetails && (
          <div className="mt-3 bg-white rounded-xl border p-4 space-y-2.5" style={{ borderColor: branding.border }}>
            {offers.map((offer: Offer, index: number) => (
              <div key={index} className="flex justify-between items-center gap-3 text-xs border-b last:border-b-0 pb-2 last:pb-0" style={{ borderColor: branding.border }}>
                <span className="font-medium text-gray-700">{offer.name}{offer.visitsPerWeek ? ` · ${offer.visitsPerWeek * 4} visites/mois` : ''}{offer.durationDays && !offer.visitsPerWeek ? ` · ${offer.durationDays} jours` : ''}</span>
                <span className="font-bold" style={{ color: branding.primary }}>{Number(offer.price || 0).toLocaleString()} FCFA</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getLogoRole = () => activeBranding === 'maman' ? 'maman' : 'general';
  const primaryColor = branding.primary;
  const isMaman = activeBranding === 'maman';

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8" style={{ background: branding.background }}>
      <div className={`w-full max-w-5xl transition-all duration-500 ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: branding.border }}>
          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr]">

            {/* Colonne latérale de présentation - Version stable corrigée */}
            <aside className="hidden lg:flex flex-col justify-between p-10" style={{ background: branding.gradient }}>
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Logo size="sm" showText={false} whiteBg={true} className="justify-center" role={getLogoRole()} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Santé Plus</p>
                    <p className="text-white/60 text-[11px]">Services à la personne</p>
                  </div>
                </div>
                <h1 className="text-2xl font-extrabold text-white leading-tight">
                  {isMaman ? 'Un cocon doux pour maman & bébé.' : isAidant ? "Rejoignez l'équipe Santé Plus." : 'Un accompagnement simple et rassurant.'}
                </h1>
                <p className="text-xs text-white/70 mt-3">
                  {isMaman ? 'Accompagnement spécialisé pour les jeunes mamans.' : isAidant ? 'Valorisez vos compétences et offrez du soutien.' : 'Créez votre compte en quelques étapes.'}
                </p>
              </div>
              <div className="space-y-2">
                <InfoLine text="Comptes validés manuellement" />
                <InfoLine text="Suivi d'activité transparent" />
                <InfoLine text="Interventions professionnelles" />
              </div>
            </aside>

            {/* Formulaire Principal */}
            <main className="p-5 sm:p-8 lg:p-10 flex flex-col justify-between min-h-[680px]">

              {/* Logo Mobile */}
              <div className="lg:hidden flex justify-center mb-6">
                <div className="w-14 h-14 rounded-xl bg-white shadow-sm border flex items-center justify-center" style={{ borderColor: branding.border }}>
                  <Logo size="sm" showText={false} whiteBg={false} className="justify-center" role={getLogoRole()} />
                </div>
              </div>

              {/* En-tête et Fil d'Ariane épuré */}
              <div className="mb-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: branding.text }}>
                      {isMaman ? '🌸 Créer mon espace maman' : isAidant ? '🦸 Rejoindre les aidants' : 'Créer un compte'}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: branding.textLight }}>{step === 1 ? 'Choisissez d\'abord votre besoin' : pageSubtitle}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}>
                    {step}/{totalSteps}
                  </span>
                </div>

                {/* Barre de progression simplifiée */}
                <div className="mt-5">
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full transition-all duration-300 rounded-full" style={{ width: `${(step / totalSteps) * 100}%`, background: branding.primary }} />
                  </div>
                  <div className="hidden sm:grid gap-2 mt-2" style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}>
                    {steps.map((item) => (
                      <p key={item.number} className="text-[10px] font-semibold text-center truncate" style={{ color: step >= item.number ? branding.primary : '#9ca3af' }}>
                        {item.label}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contenu dynamique des étapes */}
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
                <div className="flex-1">

                  {/* Étape 1 : Choix du type de compte */}
                  {step === 1 && (
                    <div className="space-y-5 animate-fadeIn">
                      <SectionTitle title="Quel est votre besoin ?" description="Sélectionnez le profil qui vous correspond." branding={branding} />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <AccountTypeCard active={accountChoice === 'family_with_patient'} icon={<Users size={20} />} title="Pour un proche" description="Seniors, mamans ou bébés ayant besoin d'assistance." onClick={() => handleAccountChoice('family_with_patient')} branding={branding} />
                        <AccountTypeCard active={accountChoice === 'personal'} icon={<Home size={20} />} title="Compte personnel" description="Créer mon espace sans accompagnement immédiat." onClick={() => handleAccountChoice('personal')} branding={branding} />
                        <AccountTypeCard active={accountChoice === 'aidant'} icon={<HeartHandshake size={20} />} title="Devenir aidant" description="Proposer mes services et rejoindre le réseau." onClick={() => handleAccountChoice('aidant')} branding={branding} />
                      </div>
                    </div>
                  )}

                  {/* Étape 2 : Choix du service (Proche uniquement) */}
                  {step === 2 && isFamilyWithPatient && (
                    <div className="space-y-5 animate-fadeIn">
                      <SectionTitle title="Qui accompagnerons-nous ?" description="Choisissez la catégorie concernée." branding={branding} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <ChoiceCard active={formData.patientCategory === 'senior'} icon={<Users size={20} />} title="Senior" description="Accompagnement quotidien d'une personne âgée à domicile." onClick={() => handleServiceChoice('senior')} branding={branding} />
                        <ChoiceCard active={formData.patientCategory === 'maman_bebe'} icon={<Baby size={20} />} title="Maman & Bébé" description="Aide post-partum, soins bébé et soutien de la maman." onClick={() => handleServiceChoice('maman_bebe')} branding={branding} />
                      </div>
                    </div>
                  )}

                  {/* Étape Identité (selon parcours) */}
                  {((step === 2 && !isFamilyWithPatient) || (step === 3 && isFamilyWithPatient)) && (
                    <div className="space-y-5 animate-fadeIn">
                      <SectionTitle title="Création de vos identifiants" description="Vos informations de connexion personnelles." branding={branding} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Nom complet" name="full_name" value={formData.full_name} onChange={handleChange} icon={<User size={16} />} placeholder="Ex: Jean Dupont" required branding={branding} />
                        <InputField label="Téléphone" name="phone" value={formData.phone} onChange={handleChange} icon={<Phone size={16} />} placeholder="+229 90 00 00 00" required branding={branding} />
                        <div className="sm:col-span-2">
                          <InputField label="Adresse e-mail" name="email" type="email" value={formData.email} onChange={handleChange} icon={<Mail size={16} />} placeholder="votremail@adresse.com" required branding={branding} />
                        </div>
                        <div className="sm:col-span-2">
                          <PasswordField value={formData.password} showPassword={showPassword} setShowPassword={setShowPassword} onChange={handleChange} branding={branding} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Synthèse Intermédiaire (Compte personnel) */}
                  {step === 3 && isPersonal && (
                    <div className="space-y-5 animate-fadeIn">
                      <SectionTitle title="Dernière vérification" description="Relisez vos informations avant de valider." branding={branding} />
                      <SummaryCard accountChoice={accountChoice} formData={formData} aidantData={aidantData} serviceLabel={serviceLabel} branding={branding} />
                    </div>
                  )}

                  {/* Profil de l'aidant */}
                  {step === 3 && isAidant && (
                    <div className="space-y-5 animate-fadeIn">
                      <SectionTitle title="Votre expérience" description="Renseignez vos spécialités d'accompagnement." branding={branding} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Date de naissance" type="date" name="birth_date" value={aidantData.birth_date} onChange={(e) => setAidantData({ ...aidantData, birth_date: e.target.value })} branding={branding} />
                        <InputField label="Années d'expérience" as="select" name="experience_years" value={aidantData.experience_years} onChange={(e) => setAidantData({ ...aidantData, experience_years: e.target.value })} branding={branding}>
                          <option value="">Sélectionner</option>
                          <option value="0">Débutant / &lt; 1 an</option>
                          <option value="2">2 à 3 ans</option>
                          <option value="4">4 à 5 ans</option>
                          <option value="6">6 à 10 ans</option>
                          <option value="10">Plus de 10 ans</option>
                        </InputField>
                        <div className="sm:col-span-2">
                          <InputField label="Adresse de résidence" name="address" value={aidantData.address} onChange={(e) => setAidantData({ ...aidantData, address: e.target.value })} icon={<MapPin size={16} />} placeholder="Quartier, Ville" required branding={branding} />
                        </div>
                      </div>
                      <MiniSelector title="Spécialités principales" items={SPECIALTIES} selected={aidantData.specialties} onToggle={toggleSpecialty} branding={branding} />
                    </div>
                  )}

                  {/* Informations Proche (Proche uniquement) */}
                  {step === 4 && isFamilyWithPatient && (
                    <div className="space-y-5 animate-fadeIn">
                      <SectionTitle title="Le proche à accompagner" description={`Service ciblé : ${serviceLabel}`} branding={branding} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Prénom" name="patient.first_name" value={formData.patientData.first_name} onChange={handleChange} required branding={branding} />
                        <InputField label="Nom de famille" name="patient.last_name" value={formData.patientData.last_name} onChange={handleChange} required branding={branding} />
                        <InputField label="Âge (ans)" name="patient.age" type="number" value={formData.patientData.age} onChange={handleChange} branding={branding} />
                        <InputField label="Sexe" name="patient.gender" as="select" value={formData.patientData.gender} onChange={handleChange} branding={branding}>
                          <option value="">Sélectionner</option>
                          <option value="male">Homme</option>
                          <option value="female">Femme</option>
                        </InputField>
                        <div className="sm:col-span-2">
                          <InputField label="Lieu de prise en charge" name="patient.address" value={formData.patientData.address} onChange={handleChange} icon={<MapPin size={16} />} placeholder="Adresse précise ou repères utiles" required branding={branding} />
                        </div>
                        <InputField label="Téléphone (optionnel)" name="patient.phone" value={formData.patientData.phone} onChange={handleChange} icon={<Phone size={16} />} branding={branding} />
                        <InputField label="Contact d'urgence" name="patient.emergency_contact" value={formData.patientData.emergency_contact} onChange={handleChange} icon={<Phone size={16} />} branding={branding} />
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Consignes ou besoins particuliers</label>
                          <textarea name="patient.notes" value={formData.patientData.notes} onChange={handleChange} rows={3} placeholder="Traitements, régimes, allergies, autonomie..." className="w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs resize-none focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Zones et dispo (Aidant uniquement) */}
                  {step === 4 && isAidant && (
                    <div className="space-y-5 animate-fadeIn">
                      <SectionTitle title="Mobilité et présentation" description="Où et quand pouvez-vous intervenir ?" branding={branding} />
                      <ZoneSelector selected={aidantData.zones} onToggle={toggleZone} branding={branding} />
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Votre description professionnelle</label>
                        <textarea value={aidantData.bio} onChange={(e) => setAidantData({ ...aidantData, bio: e.target.value })} rows={4} placeholder="Parlez-nous brièvement de vos motivations et de votre savoir-faire..." className="w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs resize-none focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} />
                      </div>
                      <label className="flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer bg-white" style={{ borderColor: branding.border }}>
                        <input type="checkbox" checked={aidantData.availability} onChange={(e) => setAidantData({ ...aidantData, availability: e.target.checked })} className="w-4 h-4 rounded" style={{ accentColor: branding.primary }} />
                        <span className="text-xs font-medium" style={{ color: branding.text }}>Je suis immédiatement disponible pour démarrer</span>
                      </label>
                    </div>
                  )}

                  {/* Synthèse finale avant soumission */}
                  {step === totalSteps && !isPersonal && (
                    <div className="space-y-5 animate-fadeIn">
                      <SectionTitle title={isAidant ? 'Vérifier ma candidature' : 'Vérifier mon inscription'} description="Veuillez confirmer l'exactitude des données saisies." branding={branding} />
                      <SummaryCard accountChoice={accountChoice} formData={formData} aidantData={aidantData} serviceLabel={serviceLabel} branding={branding} />
                      {isFamilyWithPatient && renderOfferPreview()}
                    </div>
                  )}
                </div>

                {/* Mentions Légales & CGU */}
                <div className="space-y-3 mt-6 pt-5 border-t" style={{ borderColor: branding.border }}>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <button type="button" onClick={() => setShowFAQ(true)} className="flex items-center gap-1.5 font-medium hover:underline opacity-80 hover:opacity-100" style={{ color: branding.primary }}><HelpCircle size={14} /> Consulter la FAQ</button>
                    <button type="button" onClick={() => setShowCGU(true)} className="flex items-center gap-1.5 font-medium hover:underline opacity-80 hover:opacity-100" style={{ color: branding.primary }}><Scale size={14} /> Lire les CGU</button>
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={acceptCGU} onChange={(e) => setAcceptCGU(e.target.checked)} className="w-4 h-4 mt-0.5 rounded border-gray-300 shrink-0" style={{ accentColor: branding.primary }} />
                    <span className="text-xs leading-relaxed" style={{ color: branding.textLight }}>J'accepte sans réserve les <button type="button" onClick={() => setShowCGU(true)} className="font-bold hover:underline" style={{ color: branding.primary }}>Conditions Générales d'Utilisation</button> de Santé Plus.</span>
                  </label>
                  {!acceptCGU && (step === totalSteps) && <p className="text-[11px] font-semibold text-rose-500">⚠️ L'acceptation des CGU est requise pour soumettre votre dossier.</p>}
                </div>

                {/* Actions de navigation */}
                <div className="flex gap-3 mt-6">
                  {step > 1 && (
                    <button type="button" onClick={goBack} className="flex-1 max-w-[150px] py-3 rounded-xl text-xs font-bold border transition-colors hover:bg-gray-50 flex items-center justify-center gap-1.5" style={{ borderColor: branding.border, color: branding.text }}>
                      <ArrowLeft size={14} /> Retour
                    </button>
                  )}
                  {step !== 1 && !(step === 2 && isFamilyWithPatient) && (
                    <button type={step === totalSteps ? 'submit' : 'button'} onClick={step === totalSteps ? undefined : goNext} disabled={isLoading} className={`flex-1 py-3 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm`} style={{ background: step === totalSteps && !canSubmit() ? '#9CA3AF' : branding.primary }}>
                      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <>{step === totalSteps ? (isAidant ? 'Soumettre ma candidature' : 'Créer mon compte') : 'Continuer'} <ArrowRight size={14} /></>}
                    </button>
                  )}
                </div>
              </form>

              {/* Redirection Connexion */}
              <div className="mt-6 text-center text-xs">
                <p style={{ color: branding.textLight }}>Déjà membre ? <Link to="/login" className="font-bold hover:underline" style={{ color: branding.primary }}>Se connecter</Link></p>
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

// ============================================
// COMPOSANTS COMPLÉMENTAIRES
// ============================================

interface InfoLineProps { text: string; }
const InfoLine = ({ text }: InfoLineProps) => (
  <div className="flex items-center gap-2.5 text-white/80 text-xs"><CheckCircle size={14} className="text-white shrink-0" />{text}</div>
);

interface SectionTitleProps { title: string; description: string; branding: any; }
const SectionTitle = ({ title, description, branding }: SectionTitleProps) => (
  <div className="space-y-1"><h3 className="text-base font-bold" style={{ color: branding.text }}>{title}</h3><p className="text-xs" style={{ color: branding.textLight }}>{description}</p></div>
);

interface AccountTypeCardProps { active: boolean; icon: ReactNode; title: string; description: string; onClick: () => void; branding: any; }
const AccountTypeCard = ({ active, icon, title, description, onClick, branding }: AccountTypeCardProps) => (
  <button type="button" onClick={onClick} className="text-left p-5 rounded-xl border transition-all hover:border-gray-300 flex flex-col justify-between min-h-[160px]" style={{ borderColor: active ? branding.primary : '#e5e7eb', background: active ? `${branding.primary}04` : '#ffffff' }}>
    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: active ? `${branding.primary}10` : '#f3f4f6', color: active ? branding.primary : '#9ca3af' }}>{icon}</div>
    <div>
      <p className="font-bold text-xs" style={{ color: active ? branding.primary : '#111827' }}>{title}</p>
      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed line-clamp-2">{description}</p>
    </div>
  </button>
);

interface ChoiceCardProps { active: boolean; icon: ReactNode; title: string; description: string; onClick: () => void; branding: any; }
const ChoiceCard = ({ active, icon, title, description, onClick, branding }: ChoiceCardProps) => (
  <button type="button" onClick={onClick} className="p-5 rounded-xl border text-left transition-all hover:border-gray-300 flex flex-col justify-between min-h-[150px]" style={{ borderColor: active ? branding.primary : '#e5e7eb', background: active ? `${branding.primary}04` : '#ffffff' }}>
    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: active ? `${branding.primary}10` : '#f3f4f6', color: active ? branding.primary : '#9ca3af' }}>{icon}</div>
    <div>
      <p className="font-bold text-xs" style={{ color: branding.text }}>{title}</p>
      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed line-clamp-2">{description}</p>
    </div>
  </button>
);

interface InputFieldProps { label: string; name?: string; value: string; type?: string; as?: 'input' | 'select'; placeholder?: string; required?: boolean; icon?: ReactNode; children?: ReactNode; branding: any; onChange: (e: any) => void; }
const InputField = ({ label, name, value, type = 'text', as = 'input', placeholder, required, icon, children, branding, onChange }: InputFieldProps) => (
  <div>
    <label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>{label}{required ? ' *' : ''}</label>
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: branding.textLight }}>{icon}</div>}
      {as === 'select' ? (
        <select name={name} value={value} onChange={onChange} required={required} className={`w-full ${icon ? 'pl-9' : 'pl-3.5'} pr-3.5 py-2.5 rounded-xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition`} style={{ borderColor: branding.border, background: '#ffffff', color: branding.text }}>{children}</select>
      ) : (
        <input name={name} type={type} value={value} onChange={onChange} required={required} placeholder={placeholder} className={`w-full ${icon ? 'pl-9' : 'pl-3.5'} pr-3.5 py-2.5 rounded-xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition`} style={{ borderColor: branding.border, background: '#ffffff', color: branding.text }} />
      )}
    </div>
  </div>
);

interface PasswordFieldProps { value: string; showPassword: boolean; setShowPassword: (value: boolean) => void; branding: any; onChange: (e: any) => void; }
const PasswordField = ({ value, showPassword, setShowPassword, branding, onChange }: PasswordFieldProps) => (
  <div>
    <label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Mot de passe *</label>
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: branding.textLight }} />
      <input type={showPassword ? 'text' : 'password'} name="password" value={value} onChange={onChange} required minLength={6} placeholder="Minimum 6 caractères" className="w-full pl-9 pr-9 py-2.5 rounded-xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: '#ffffff', color: branding.text }} />
      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: branding.textLight }}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
    </div>
  </div>
);

interface MiniSelectorProps { title: string; items: { id: string; label: string; icon: string }[]; selected: string[]; branding: any; onToggle: (id: string) => void; }
const MiniSelector = ({ title, items, selected, branding, onToggle }: MiniSelectorProps) => (
  <div>
    <p className="text-xs font-semibold mb-2" style={{ color: branding.text }}>{title}</p>
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => {
        const active = selected.includes(item.id);
        return <button type="button" key={item.id} onClick={() => onToggle(item.id)} className="px-3 py-2.5 rounded-xl border text-left text-xs transition-all hover:border-gray-300" style={{ borderColor: active ? branding.primary : '#e5e7eb', background: active ? `${branding.primary}04` : '#ffffff', color: branding.text }}><span className="mr-2">{item.icon}</span>{item.label}</button>;
      })}
    </div>
  </div>
);

interface ZoneSelectorProps { selected: string[]; branding: any; onToggle: (zone: string) => void; }
const ZoneSelector = ({ selected, branding, onToggle }: ZoneSelectorProps) => (
  <div>
    <p className="text-xs font-semibold mb-2" style={{ color: branding.text }}>Zones d'intervention</p>
    <div className="flex flex-wrap gap-2">
      {ZONES.map((zone) => {
        const active = selected.includes(zone);
        return <button type="button" key={zone} onClick={() => onToggle(zone)} className="px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all" style={{ borderColor: active ? branding.primary : '#e5e7eb', background: active ? branding.primary : '#ffffff', color: active ? '#ffffff' : '#4b5563' }}>{zone}</button>;
      })}
    </div>
  </div>
);

interface SummaryCardProps { accountChoice: AccountChoice; formData: any; aidantData: any; serviceLabel: string; branding: any; }
const SummaryCard = ({ accountChoice, formData, aidantData, serviceLabel, branding }: SummaryCardProps) => {
  const specialties = aidantData.specialties.map((id: string) => SPECIALTIES.find((item) => item.id === id)?.label || id).join(', ');
  const isAidant = accountChoice === 'aidant';
  const isPersonal = accountChoice === 'personal';
  return (
    <div className="rounded-xl p-4 border space-y-3.5" style={{ background: `${branding.primary}02`, borderColor: `${branding.primary}12` }}>
      <SummaryLine icon={<User size={16} />} label="Nom complet" value={formData.full_name} branding={branding} />
      <SummaryLine icon={<Mail size={16} />} label="E-mail" value={formData.email} branding={branding} />
      <SummaryLine icon={<Phone size={16} />} label="Téléphone" value={formData.phone} branding={branding} />
      {isAidant ? (
        <>
          <SummaryLine icon={<Briefcase size={16} />} label="Type" value="Candidature aidant" branding={branding} />
          <SummaryLine icon={<FileText size={16} />} label="Spécialités" value={specialties || 'Non renseigné'} branding={branding} />
          <SummaryLine icon={<MapPin size={16} />} label="Zones d'intervention" value={aidantData.zones.length ? aidantData.zones.join(', ') : 'Non renseigné'} branding={branding} />
        </>
      ) : (
        <>
          <SummaryLine icon={<Home size={16} />} label="Type de compte" value={isPersonal ? 'Compte personnel sans patient' : 'Accompagnement d\'un proche'} branding={branding} />
          {!isPersonal && <SummaryLine icon={<Baby size={16} />} label="Service" value={serviceLabel} branding={branding} />}
        </>
      )}
      <p className="text-[10px] text-gray-400 pt-2 border-t border-black/5">Toutes les inscriptions font l'objet d'une validation manuelle par l'équipe Santé Plus.</p>
    </div>
  );
};

interface SummaryLineProps { icon: ReactNode; label: string; value: string; branding: any; }
const SummaryLine = ({ icon, label, value, branding }: SummaryLineProps) => (
  <div className="flex items-start gap-2.5">
    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}>{icon}</div>
    <div>
      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-xs font-semibold break-words mt-0.5" style={{ color: branding.text }}>{value || 'Non renseigné'}</p>
    </div>
  </div>
);

export default RegisterPage;
