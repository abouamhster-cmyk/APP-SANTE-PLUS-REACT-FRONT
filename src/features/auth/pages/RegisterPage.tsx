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
    primary: '#1a4a3a',
    primaryLight: '#2a6a4a',
    primaryDark: '#0d2a22',
    secondary: '#c9a84c',
    secondaryLight: '#dcc07a',
    accent: '#c9a84c',
    text: '#2d2d2d',
    textLight: '#6b7280',
    background: '#f5f0e8',
    surface: '#ffffff',
    border: '#e5e0d8',
    gradient: 'linear-gradient(135deg, #1a4a3a 0%, #0d3329 100%)',
    logoRole: 'general' as const,
  },
  senior: {
    primary: '#1a4a3a',
    primaryLight: '#2a6a4a',
    primaryDark: '#0d2a22',
    secondary: '#c9a84c',
    secondaryLight: '#dcc07a',
    accent: '#c9a84c',
    text: '#2d2d2d',
    textLight: '#6b7280',
    background: '#f5f0e8',
    surface: '#ffffff',
    border: '#e5e0d8',
    gradient: 'linear-gradient(135deg, #1a4a3a 0%, #0d3329 100%)',
    logoRole: 'general' as const,
  },
  maman: {
    primary: '#e8436a',
    primaryLight: '#f06292',
    primaryDark: '#c62850',
    secondary: '#fce4ec',
    secondaryLight: '#fdf0f3',
    accent: '#e8436a',
    text: '#4a2c2c',
    textLight: '#8a6c6c',
    background: '#fff5f7',
    surface: '#ffffff',
    border: '#f8d4dc',
    gradient: 'linear-gradient(135deg, #e8436a 0%, #c62850 100%)',
    logoRole: 'maman' as const,
  },
  aidant: {
    primary: '#2c6e5c',
    primaryLight: '#3a8a72',
    primaryDark: '#1a4a3a',
    secondary: '#e8f0ed',
    secondaryLight: '#f0f5f2',
    accent: '#3a8a72',
    text: '#1a3a2e',
    textLight: '#5f766d',
    background: '#f5faf8',
    surface: '#ffffff',
    border: '#dce8e4',
    gradient: 'linear-gradient(135deg, #2c6e5c 0%, #1a4a3a 100%)',
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

  // ✅ États pour les modals légaux
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

  // ✅ Déterminer le branding actif en fonction des choix
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

  // ✅ Appliquer les couleurs CSS dynamiquement
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
  const pageSubtitle = isAidant ? 'Candidature aidant' : isPersonal ? 'Compte personnel' : 'Accompagnement d’un proche';

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
    setTimeout(() => setStep(2), 120);
  };

  const handleServiceChoice = (category: PatientCategory) => {
    setFormData((prev) => ({ ...prev, patientCategory: category }));
    setTimeout(() => setStep(3), 120);
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
      if (!formData.patientData.address.trim()) { toast.error('Veuillez renseigner l’adresse ou le quartier'); return false; }
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
      <div className="rounded-3xl p-5 border" style={{ background: `${branding.primary}06`, borderColor: `${branding.primary}14` }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${branding.primary}12`, color: branding.primary }}>
              <CreditCard size={18} />
            </div>
            <div>
              <p className="font-black" style={{ color: branding.text }}>Aperçu des abonnements {serviceLabel}</p>
              <p className="text-xs text-gray-500">Vous choisirez votre formule après validation du compte.</p>
            </div>
          </div>
          <button type="button" onClick={() => setShowOfferDetails(!showOfferDetails)} className="text-xs font-bold hover:underline" style={{ color: branding.primary }}>
            {showOfferDetails ? 'Masquer' : 'Détails'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {offers.map((offer: Offer, index: number) => (
            <div key={index} className="bg-white rounded-2xl p-3 border" style={{ borderColor: branding.border }}>
              <p className="text-lg">{offer.badge?.split(' ')[0] || '📌'}</p>
              <p className="text-xs font-black mt-1" style={{ color: branding.text }}>{offer.name}</p>
              <p className="text-xs font-black mt-1" style={{ color: branding.primary }}>{Number(offer.price || 0).toLocaleString()} FCFA</p>
              <p className="text-[10px] text-gray-400">{offer.period}</p>
            </div>
          ))}
        </div>
        {showOfferDetails && (
          <div className="mt-4 bg-white rounded-2xl border p-4 space-y-2">
            {offers.map((offer: Offer, index: number) => (
              <div key={index} className="flex justify-between gap-3 text-xs border-b last:border-b-0 pb-2 last:pb-0" style={{ borderColor: branding.border }}>
                <span className="font-bold text-gray-700">{offer.name}{offer.visitsPerWeek ? ` · ${offer.visitsPerWeek * 4} visites/mois` : ''}{offer.durationDays && !offer.visitsPerWeek ? ` · ${offer.durationDays} jours` : ''}</span>
                <span className="font-black" style={{ color: branding.primary }}>{Number(offer.price || 0).toLocaleString()} FCFA</span>
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
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-8" style={{ background: branding.background }}>
      <div className={`w-full max-w-6xl transition-all duration-700 ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <div className="bg-white rounded-[2rem] shadow-lg border overflow-hidden" style={{ borderColor: branding.border }}>
          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.25fr]">
            <aside className="hidden lg:flex flex-col justify-between p-10 min-h-[760px]" style={{ background: branding.gradient }}>
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                    <Logo size="sm" showText={false} whiteBg={true} className="justify-center" role={getLogoRole()} />
                  </div>
                  <div>
                    <p className="text-white font-black leading-tight">Santé Plus</p>
                    <p className="text-white/55 text-xs">Services</p>
                  </div>
                </div>
                <div className="mt-16">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-bold">
                    <ShieldCheck size={13} /> Inscription sécurisée
                  </div>
                  <h1 className="text-4xl font-black text-white mt-5 leading-tight max-w-sm">
                    {isMaman ? 'Un espace doux pour maman & bébé.' : isAidant ? 'Rejoignez l\'équipe Santé Plus.' : 'Un espace simple pour mieux accompagner.'}
                  </h1>
                  <p className="text-sm text-white/65 mt-4 leading-relaxed max-w-sm">
                    {isMaman ? 'Accompagnement personnalisé pour les jeunes mamans et leur bébé.' : isAidant ? 'Proposez vos services et devenez aidant chez Santé Plus.' : 'Choisissez votre profil, envoyez votre demande, puis notre équipe valide l’accès.'}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <InfoLine text="Validation humaine des comptes" />
                <InfoLine text="Suivi clair et sécurisé" />
                <InfoLine text="Accompagnement à domicile" />
              </div>
            </aside>

            <main className="p-6 sm:p-8 lg:p-10 min-h-[760px] flex flex-col">
              <div className="lg:hidden text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-white shadow-md border-4 flex items-center justify-center mx-auto" style={{ borderColor: primaryColor }}>
                  <Logo size="md" showText={false} whiteBg={false} className="justify-center" role={getLogoRole()} />
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black" style={{ color: branding.text }}>
                      {isMaman ? '🌸 Créer mon compte maman' : isAidant ? '🦸 Créer mon compte aidant' : 'Créer mon compte'}
                    </h2>
                    <p className="text-sm mt-1" style={{ color: branding.textLight }}>{step === 1 ? 'Choisissez d’abord votre besoin' : pageSubtitle}</p>
                  </div>
                  <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-bold" style={{ background: `${branding.primary}12`, color: branding.primary }}>Étape {step}/{totalSteps}</span>
                </div>
                <div className="grid gap-2 mt-6" style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}>
                  {steps.map((item) => {
                    const active = step >= item.number;
                    return (
                      <div key={item.number}>
                        <div className="h-2 rounded-full transition" style={{ background: active ? branding.primary : '#e5e7eb' }} />
                        <p className="hidden sm:block text-[11px] font-bold mt-2" style={{ color: active ? branding.primary : '#9ca3af' }}>{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                <div className="flex-1">
                  {step === 1 && (
                    <div className="space-y-6">
                      <SectionTitle title="Votre type de compte" description="Cliquez sur le choix qui correspond à votre besoin." branding={branding} />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <AccountTypeCard active={accountChoice === 'family_with_patient'} icon={<Users size={24} />} title="Avec un proche" description="Inscrire un senior, une maman ou un bébé à accompagner." onClick={() => handleAccountChoice('family_with_patient')} branding={branding} />
                        <AccountTypeCard active={accountChoice === 'personal'} icon={<Home size={24} />} title="Compte personnel" description="Créer mon espace maintenant, sans patient pour le moment." onClick={() => handleAccountChoice('personal')} branding={branding} />
                        <AccountTypeCard active={accountChoice === 'aidant'} icon={<HeartHandshake size={24} />} title="Devenir aidant" description="Proposer mes services et rejoindre l’équipe Santé Plus." onClick={() => handleAccountChoice('aidant')} branding={branding} />
                      </div>
                    </div>
                  )}

                  {step === 2 && isFamilyWithPatient && (
                    <div className="space-y-6">
                      <SectionTitle title="Qui souhaitez-vous accompagner ?" description="Cliquez sur le service concerné." branding={branding} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ChoiceCard active={formData.patientCategory === 'senior'} icon={<Users size={23} />} title="Senior" description="Accompagnement d’une personne âgée à domicile." onClick={() => handleServiceChoice('senior')} branding={branding} />
                        <ChoiceCard active={formData.patientCategory === 'maman_bebe'} icon={<Baby size={23} />} title="Maman & Bébé" description="Soutien grossesse, post-partum ou bébé." onClick={() => handleServiceChoice('maman_bebe')} branding={branding} />
                      </div>
                    </div>
                  )}

                  {((step === 2 && !isFamilyWithPatient) || (step === 3 && isFamilyWithPatient)) && (
                    <div className="space-y-6">
                      <SectionTitle title="Vos informations" description="Ces informations serviront à créer votre accès." branding={branding} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <InputField label="Nom complet" name="full_name" value={formData.full_name} onChange={handleChange} icon={<User size={18} />} placeholder="Votre nom et prénom" required branding={branding} />
                        <InputField label="Téléphone" name="phone" value={formData.phone} onChange={handleChange} icon={<Phone size={18} />} placeholder="+229 90 00 00 00" required branding={branding} />
                        <div className="sm:col-span-2">
                          <InputField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} icon={<Mail size={18} />} placeholder="exemple@email.com" required branding={branding} />
                        </div>
                        <div className="sm:col-span-2">
                          <PasswordField value={formData.password} showPassword={showPassword} setShowPassword={setShowPassword} onChange={handleChange} branding={branding} />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 3 && isPersonal && (
                    <div className="space-y-6">
                      <SectionTitle title="Vérifiez votre inscription" description="Un dernier contrôle avant l’envoi." branding={branding} />
                      <SummaryCard accountChoice={accountChoice} formData={formData} aidantData={aidantData} serviceLabel={serviceLabel} branding={branding} />
                    </div>
                  )}

                  {step === 3 && isAidant && (
                    <div className="space-y-6">
                      <SectionTitle title="Votre profil aidant" description="Dites-nous votre expérience et vos spécialités." branding={branding} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <InputField label="Date de naissance" type="date" name="birth_date" value={aidantData.birth_date} onChange={(e) => setAidantData({ ...aidantData, birth_date: e.target.value })} branding={branding} />
                        <InputField label="Expérience" as="select" name="experience_years" value={aidantData.experience_years} onChange={(e) => setAidantData({ ...aidantData, experience_years: e.target.value })} branding={branding}>
                          <option value="">Sélectionner</option>
                          <option value="0">Débutant</option>
                          <option value="2">2-3 ans</option>
                          <option value="4">4-5 ans</option>
                          <option value="6">6-10 ans</option>
                          <option value="10">10+ ans</option>
                        </InputField>
                        <div className="sm:col-span-2">
                          <InputField label="Adresse / quartier" name="address" value={aidantData.address} onChange={(e) => setAidantData({ ...aidantData, address: e.target.value })} icon={<MapPin size={18} />} placeholder="Votre adresse ou quartier" required branding={branding} />
                        </div>
                      </div>
                      <MiniSelector title="Spécialités" items={SPECIALTIES} selected={aidantData.specialties} onToggle={toggleSpecialty} branding={branding} />
                    </div>
                  )}

                  {step === 4 && isFamilyWithPatient && (
                    <div className="space-y-6">
                      <SectionTitle title="Informations du proche" description={`Service choisi : ${serviceLabel}`} branding={branding} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <InputField label="Prénom" name="patient.first_name" value={formData.patientData.first_name} onChange={handleChange} required branding={branding} />
                        <InputField label="Nom" name="patient.last_name" value={formData.patientData.last_name} onChange={handleChange} required branding={branding} />
                        <InputField label="Âge" name="patient.age" type="number" value={formData.patientData.age} onChange={handleChange} branding={branding} />
                        <InputField label="Sexe" name="patient.gender" as="select" value={formData.patientData.gender} onChange={handleChange} branding={branding}>
                          <option value="">Sélectionner</option>
                          <option value="male">Homme</option>
                          <option value="female">Femme</option>
                        </InputField>
                        <div className="sm:col-span-2">
                          <InputField label="Adresse / quartier" name="patient.address" value={formData.patientData.address} onChange={handleChange} icon={<MapPin size={18} />} placeholder="Quartier, maison, repère..." required branding={branding} />
                        </div>
                        <InputField label="Téléphone du proche" name="patient.phone" value={formData.patientData.phone} onChange={handleChange} icon={<Phone size={18} />} branding={branding} />
                        <InputField label="Contact d’urgence" name="patient.emergency_contact" value={formData.patientData.emergency_contact} onChange={handleChange} icon={<Phone size={18} />} branding={branding} />
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-bold mb-1.5" style={{ color: branding.text }}>Repères utiles</label>
                          <textarea name="patient.notes" value={formData.patientData.notes} onChange={handleChange} rows={3} placeholder="Allergies, traitements, précautions, repères..." className="w-full px-4 py-3 rounded-2xl border outline-none text-sm resize-none" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 4 && isAidant && (
                    <div className="space-y-6">
                      <SectionTitle title="Zone et disponibilité" description="Indiquez où vous pouvez intervenir." branding={branding} />
                      <ZoneSelector selected={aidantData.zones} onToggle={toggleZone} branding={branding} />
                      <div>
                        <label className="block text-sm font-bold mb-1.5" style={{ color: branding.text }}>Présentation</label>
                        <textarea value={aidantData.bio} onChange={(e) => setAidantData({ ...aidantData, bio: e.target.value })} rows={4} placeholder="Parlez brièvement de votre expérience..." className="w-full px-4 py-3 rounded-2xl border outline-none text-sm resize-none" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} />
                      </div>
                      <label className="flex items-center gap-3 rounded-2xl border p-4 cursor-pointer" style={{ borderColor: branding.border }}>
                        <input type="checkbox" checked={aidantData.availability} onChange={(e) => setAidantData({ ...aidantData, availability: e.target.checked })} className="w-4 h-4" style={{ accentColor: branding.primary }} />
                        <span className="text-sm font-bold" style={{ color: branding.text }}>Disponible immédiatement</span>
                      </label>
                    </div>
                  )}

                  {step === totalSteps && !isPersonal && (
                    <div className="space-y-6">
                      <SectionTitle title={isAidant ? 'Vérifiez votre candidature' : 'Vérifiez votre inscription'} description="Un dernier contrôle avant l’envoi." branding={branding} />
                      <SummaryCard accountChoice={accountChoice} formData={formData} aidantData={aidantData} serviceLabel={serviceLabel} branding={branding} />
                      {isFamilyWithPatient && renderOfferPreview()}
                    </div>
                  )}
                </div>

                <div className="space-y-4 mt-6 pt-6 border-t" style={{ borderColor: branding.border }}>
                  <div className="flex flex-wrap gap-4">
                    <button type="button" onClick={() => setShowFAQ(true)} className="flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: branding.primary }}><HelpCircle size={16} /> Foire aux questions (FAQ)</button>
                    <button type="button" onClick={() => setShowCGU(true)} className="flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: branding.primary }}><Scale size={16} /> Conditions Générales d'Utilisation</button>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={acceptCGU} onChange={(e) => setAcceptCGU(e.target.checked)} className="w-5 h-5 mt-0.5 rounded border-2 shrink-0" style={{ accentColor: branding.primary, borderColor: branding.border }} />
                    <span className="text-sm" style={{ color: branding.text }}>J'ai lu et j'accepte les <button type="button" onClick={() => setShowCGU(true)} className="font-bold hover:underline" style={{ color: branding.primary }}>Conditions Générales d'Utilisation</button></span>
                  </label>
                  {!acceptCGU && (step === totalSteps) && <p className="text-xs" style={{ color: '#F44336' }}>⚠️ Vous devez accepter les CGU pour créer votre compte</p>}
                </div>

                <div className="flex gap-3 mt-8">
                  {step > 1 && (
                    <button type="button" onClick={goBack} className="flex-1 py-3.5 rounded-2xl font-bold border transition hover:bg-gray-50 flex items-center justify-center gap-2" style={{ borderColor: branding.border, color: branding.text }}>
                      <ArrowLeft size={18} /> Retour
                    </button>
                  )}
                  {step !== 1 && !(step === 2 && isFamilyWithPatient) && (
                    <button type={step === totalSteps ? 'submit' : 'button'} onClick={step === totalSteps ? undefined : goNext} disabled={isLoading} className={`flex-1 py-3.5 rounded-2xl text-white font-bold transition hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 ${step === totalSteps && !canSubmit() ? 'opacity-50 cursor-not-allowed' : ''}`} style={{ background: step === totalSteps && !canSubmit() ? '#9CA3AF' : branding.primary }}>
                      {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>{step === totalSteps ? (isAidant ? 'Envoyer' : 'Créer le compte') : 'Continuer'} <ArrowRight size={18} /></>}
                    </button>
                  )}
                </div>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm" style={{ color: branding.textLight }}>Déjà inscrit ? <Link to="/login" className="font-bold hover:underline" style={{ color: branding.primary }}>Se connecter</Link></p>
              </div>
            </main>
          </div>
        </div>
        <p className="mt-4 text-center text-xs" style={{ color: branding.textLight }}>Santé Plus Services — Un service d'accompagnement non médical</p>
      </div>

      <InfoModal isOpen={showFAQ} onClose={() => setShowFAQ(false)} title="❓ Foire aux questions" icon={<HelpCircle size={20} />} maxWidth="lg"><FAQContent /></InfoModal>
      <InfoModal isOpen={showCGU} onClose={() => setShowCGU(false)} title="📜 Conditions Générales d'Utilisation" icon={<Scale size={20} />} maxWidth="xl"><CGUContent /></InfoModal>
    </div>
  );
};

// ============================================
// COMPOSANTS AVEC BRANDING
// ============================================

interface InfoLineProps { text: string; }
const InfoLine = ({ text }: InfoLineProps) => (
  <div className="flex items-center gap-3 text-white/75 text-sm"><CheckCircle size={16} className="text-white" />{text}</div>
);

interface SectionTitleProps { title: string; description: string; branding: any; }
const SectionTitle = ({ title, description, branding }: SectionTitleProps) => (
  <div><h3 className="text-xl font-black" style={{ color: branding.text }}>{title}</h3><p className="text-sm mt-1" style={{ color: branding.textLight }}>{description}</p></div>
);

interface AccountTypeCardProps { active: boolean; icon: ReactNode; title: string; description: string; onClick: () => void; branding: any; }
const AccountTypeCard = ({ active, icon, title, description, onClick, branding }: AccountTypeCardProps) => (
  <button type="button" onClick={onClick} className="text-left p-5 rounded-3xl border-2 transition hover:shadow-sm min-h-[185px]" style={{ borderColor: active ? branding.primary : '#e5e7eb', background: active ? `${branding.primary}08` : '#ffffff' }}>
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: active ? `${branding.primary}12` : '#f3f4f6', color: active ? branding.primary : '#9ca3af' }}>{icon}</div>
    <p className="font-black text-base" style={{ color: active ? branding.primary : '#111827' }}>{title}</p>
    <p className="text-sm text-gray-500 mt-2 leading-relaxed">{description}</p>
  </button>
);

interface ChoiceCardProps { active: boolean; icon: ReactNode; title: string; description: string; onClick: () => void; branding: any; }
const ChoiceCard = ({ active, icon, title, description, onClick, branding }: ChoiceCardProps) => (
  <button type="button" onClick={onClick} className="p-6 rounded-3xl border text-left transition hover:shadow-sm min-h-[170px]" style={{ borderColor: active ? branding.primary : '#e5e7eb', background: active ? `${branding.primary}08` : '#ffffff' }}>
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: active ? `${branding.primary}12` : '#f3f4f6', color: active ? branding.primary : '#9ca3af' }}>{icon}</div>
    <p className="font-black" style={{ color: branding.text }}>{title}</p>
    <p className="text-sm text-gray-500 mt-2 leading-relaxed">{description}</p>
  </button>
);

interface InputFieldProps { label: string; name?: string; value: string; type?: string; as?: 'input' | 'select'; placeholder?: string; required?: boolean; icon?: ReactNode; children?: ReactNode; branding: any; onChange: (e: any) => void; }
const InputField = ({ label, name, value, type = 'text', as = 'input', placeholder, required, icon, children, branding, onChange }: InputFieldProps) => (
  <div>
    <label className="block text-sm font-bold mb-1.5" style={{ color: branding.text }}>{label}{required ? ' *' : ''}</label>
    <div className="relative">
      {icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: branding.textLight }}>{icon}</div>}
      {as === 'select' ? (
        <select name={name} value={value} onChange={onChange} required={required} className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3 rounded-2xl border outline-none text-sm`} style={{ borderColor: branding.border, background: branding.background, color: branding.text }}>{children}</select>
      ) : (
        <input name={name} type={type} value={value} onChange={onChange} required={required} placeholder={placeholder} className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3 rounded-2xl border outline-none text-sm`} style={{ borderColor: branding.border, background: branding.background, color: branding.text }} />
      )}
    </div>
  </div>
);

interface PasswordFieldProps { value: string; showPassword: boolean; setShowPassword: (value: boolean) => void; branding: any; onChange: (e: any) => void; }
const PasswordField = ({ value, showPassword, setShowPassword, branding, onChange }: PasswordFieldProps) => (
  <div>
    <label className="block text-sm font-bold mb-1.5" style={{ color: branding.text }}>Mot de passe *</label>
    <div className="relative">
      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: branding.textLight }} />
      <input type={showPassword ? 'text' : 'password'} name="password" value={value} onChange={onChange} required minLength={6} placeholder="Minimum 6 caractères" className="w-full pl-11 pr-11 py-3 rounded-2xl border outline-none text-sm" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} />
      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: branding.textLight }}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
    </div>
  </div>
);

interface MiniSelectorProps { title: string; items: { id: string; label: string; icon: string }[]; selected: string[]; branding: any; onToggle: (id: string) => void; }
const MiniSelector = ({ title, items, selected, branding, onToggle }: MiniSelectorProps) => (
  <div>
    <p className="text-sm font-bold mb-2" style={{ color: branding.text }}>{title}</p>
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => {
        const active = selected.includes(item.id);
        return <button type="button" key={item.id} onClick={() => onToggle(item.id)} className="px-3 py-3 rounded-2xl border text-left text-sm transition" style={{ borderColor: active ? branding.primary : '#e5e7eb', background: active ? `${branding.primary}08` : '#ffffff', color: branding.text }}><span className="mr-2">{item.icon}</span>{item.label}</button>;
      })}
    </div>
  </div>
);

interface ZoneSelectorProps { selected: string[]; branding: any; onToggle: (zone: string) => void; }
const ZoneSelector = ({ selected, branding, onToggle }: ZoneSelectorProps) => (
  <div>
    <p className="text-sm font-bold mb-2" style={{ color: branding.text }}>Zones d’intervention</p>
    <div className="flex flex-wrap gap-2">
      {ZONES.map((zone) => {
        const active = selected.includes(zone);
        return <button type="button" key={zone} onClick={() => onToggle(zone)} className="px-3 py-2 rounded-full text-xs font-bold border transition" style={{ borderColor: active ? branding.primary : '#e5e7eb', background: active ? branding.primary : '#ffffff', color: active ? '#ffffff' : '#4b5563' }}>{zone}</button>;
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
    <div className="rounded-3xl p-5 border space-y-4" style={{ background: `${branding.primary}06`, borderColor: `${branding.primary}15` }}>
      <SummaryLine icon={<User size={18} />} label="Nom" value={formData.full_name} branding={branding} />
      <SummaryLine icon={<Mail size={18} />} label="Email" value={formData.email} branding={branding} />
      <SummaryLine icon={<Phone size={18} />} label="Téléphone" value={formData.phone} branding={branding} />
      {isAidant ? (
        <>
          <SummaryLine icon={<Briefcase size={18} />} label="Type" value="Candidature aidant" branding={branding} />
          <SummaryLine icon={<FileText size={18} />} label="Spécialités" value={specialties || 'Non renseigné'} branding={branding} />
          <SummaryLine icon={<MapPin size={18} />} label="Zones" value={aidantData.zones.length ? aidantData.zones.join(', ') : 'Non renseigné'} branding={branding} />
        </>
      ) : (
        <>
          <SummaryLine icon={<Home size={18} />} label="Type" value={isPersonal ? 'Compte personnel sans patient' : 'Accompagnement d’un proche'} branding={branding} />
          {!isPersonal && <SummaryLine icon={<Baby size={18} />} label="Service" value={serviceLabel} branding={branding} />}
        </>
      )}
      <p className="text-xs text-gray-500 pt-2 border-t border-black/5">Votre demande sera vérifiée par l’équipe Santé Plus avant activation.</p>
    </div>
  );
};

interface SummaryLineProps { icon: ReactNode; label: string; value: string; branding: any; }
const SummaryLine = ({ icon, label, value, branding }: SummaryLineProps) => (
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}12`, color: branding.primary }}>{icon}</div>
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="font-bold break-words" style={{ color: branding.text }}>{value || 'Non renseigné'}</p>
    </div>
  </div>
);

export default RegisterPage;