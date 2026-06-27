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

    // ✅ Si on n'est pas à la dernière étape, on avance
    if (step !== totalSteps) {
      goNext();
      return;
    }

    // ✅ Si on est à la dernière étape, on vérifie les CGU avant de soumettre
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
      <div className="rounded-2xl p-4 border" style={{ background: `${branding.primary}04`, borderColor: `${branding.primary}12` }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}10`, color: branding.primary }}>
              <CreditCard size={16} />
            </div>
            <div>
              <p className="font-bold text-xs" style={{ color: branding.text }}>Aperçu des abonnements {serviceLabel}</p>
              <p className="text-[10px] text-gray-500">Choix définitif après validation de votre compte.</p>
            </div>
          </div>
          <button type="button" onClick={() => setShowOfferDetails(!showOfferDetails)} className="text-xs font-semibold self-start sm:self-center hover:underline" style={{ color: branding.primary }}>
            {showOfferDetails ? 'Masquer le détail' : 'Voir les détails'}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {offers.map((offer: Offer, index: number) => (
            <div key={index} className="bg-white rounded-2xl p-2.5 border transition-all" style={{ borderColor: branding.border }}>
              <p className="text-sm">{offer.badge?.split(' ')[0] || '📌'}</p>
              <p className="text-[10px] font-semibold mt-1 truncate" style={{ color: branding.text }}>{offer.name}</p>
              <p className="text-[10px] font-bold mt-0.5" style={{ color: branding.primary }}>{Number(offer.price || 0).toLocaleString()} FCFA</p>
              <p className="text-[9px] text-gray-400 mt-0.5">{offer.period}</p>
            </div>
          ))}
        </div>
        {showOfferDetails && (
          <div className="mt-3 bg-white rounded-2xl border p-3 space-y-2" style={{ borderColor: branding.border }}>
            {offers.map((offer: Offer, index: number) => (
              <div key={index} className="flex justify-between items-center gap-3 text-[11px] border-b last:border-b-0 pb-1.5 last:pb-0" style={{ borderColor: branding.border }}>
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

  // ============================================
  // AFFICHAGE DE L'ÉTAPE DE VALIDATION
  // ============================================
  const renderValidationStep = () => {
    return (
      <div className="space-y-4 animate-fadeIn">
        <div className="space-y-0.5">
          <h3 className="text-base font-bold" style={{ color: branding.text }}>
            {isAidant ? 'Vérifier ma candidature' : 'Vérifier mon inscription'}
          </h3>
          <p className="text-xs" style={{ color: branding.textLight }}>
            Relisez attentivement vos informations avant de valider.
          </p>
        </div>

        <div className="rounded-2xl p-4 border space-y-2.5" style={{ background: `${branding.primary}02`, borderColor: `${branding.primary}12` }}>
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}>
              <User size={16} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Nom complet</p>
              <p className="text-xs font-semibold break-words mt-0.5" style={{ color: branding.text }}>{formData.full_name || 'Non renseigné'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}>
              <Mail size={16} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">E-mail</p>
              <p className="text-xs font-semibold break-words mt-0.5" style={{ color: branding.text }}>{formData.email || 'Non renseigné'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}>
              <Phone size={16} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Téléphone</p>
              <p className="text-xs font-semibold break-words mt-0.5" style={{ color: branding.text }}>{formData.phone || 'Non renseigné'}</p>
            </div>
          </div>

          {isAidant ? (
            <>
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}>
                  <Briefcase size={16} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Type</p>
                  <p className="text-xs font-semibold break-words mt-0.5" style={{ color: branding.text }}>Candidature aidant</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}>
                  <FileText size={16} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Spécialités</p>
                  <p className="text-xs font-semibold break-words mt-0.5" style={{ color: branding.text }}>{aidantData.specialties.map((id: string) => SPECIALTIES.find((item) => item.id === id)?.label || id).join(', ') || 'Non renseigné'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}>
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Zones d'intervention</p>
                  <p className="text-xs font-semibold break-words mt-0.5" style={{ color: branding.text }}>{aidantData.zones.length ? aidantData.zones.join(', ') : 'Non renseigné'}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}>
                  <Home size={16} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Type de compte</p>
                  <p className="text-xs font-semibold break-words mt-0.5" style={{ color: branding.text }}>{isPersonal ? 'Compte personnel sans patient' : 'Accompagnement d\'un proche'}</p>
                </div>
              </div>
              {!isPersonal && (
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}>
                    <Baby size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Service</p>
                    <p className="text-xs font-semibold break-words mt-0.5" style={{ color: branding.text }}>{serviceLabel}</p>
                  </div>
                </div>
              )}
              {isFamilyWithPatient && formData.patientData.first_name && (
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}>
                    <Users size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Proche</p>
                    <p className="text-xs font-semibold break-words mt-0.5" style={{ color: branding.text }}>
                      {formData.patientData.first_name} {formData.patientData.last_name}
                      {formData.patientData.address && ` • ${formData.patientData.address}`}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex items-start gap-2.5 pt-2 border-t" style={{ borderColor: branding.border }}>
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}>
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Statut du compte</p>
              <p className="text-xs font-semibold break-words mt-0.5" style={{ color: branding.primary }}>
                ⏳ En attente de validation
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Toutes les inscriptions font l'objet d'une validation manuelle par l'équipe Santé Plus.
              </p>
            </div>
          </div>
        </div>

        {isFamilyWithPatient && renderOfferPreview()}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 sm:p-6 lg:p-8" style={{ background: branding.background }}>
      <div className={`w-full max-w-5xl transition-all duration-500 ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        
        {/* Container global */}
        <div className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-sm border-0 sm:border overflow-hidden min-h-screen sm:min-h-0 sm:h-[600px] w-full" style={{ borderColor: branding.border }}>
          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] h-full">

            {/* Colonne latérale */}
            <div className="hidden lg:flex flex-col justify-between p-10 h-full" style={{ background: branding.gradient }}>
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm">
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
                <div className="flex items-center gap-2.5 text-white/80 text-xs"><CheckCircle size={14} className="text-white shrink-0" />Comptes validés manuellement</div>
                <div className="flex items-center gap-2.5 text-white/80 text-xs"><CheckCircle size={14} className="text-white shrink-0" />Suivi d'activité transparent</div>
                <div className="flex items-center gap-2.5 text-white/80 text-xs"><CheckCircle size={14} className="text-white shrink-0" />Interventions professionnelles</div>
              </div>
            </div>

            {/* Formulaire Principal */}
            <main className="px-6 py-6 sm:p-6 lg:p-8 flex flex-col justify-between min-h-screen sm:min-h-0 sm:h-full">

              {/* Logo Mobile */}
              <div className="lg:hidden flex justify-center mb-6">
                <div className="w-12 h-12 rounded-2xl border-none flex items-center justify-center" style={{ background: `${branding.primary}08` }}>
                  <Logo size="sm" showText={false} whiteBg={false} className="justify-center" role={getLogoRole()} />
                </div>
              </div>

              {/* En-tête */}
              <div className="mb-4 sm:mb-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: branding.text }}>
                      {isMaman ? '🌸 Créer mon espace maman' : isAidant ? '🦸 Rejoindre les aidants' : 'Créer un compte'}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: branding.textLight }}>
                      {step === 1 ? 'Choisissez d\'abord votre besoin' : 
                       step === totalSteps ? 'Vérifiez vos informations avant validation' : 
                       pageSubtitle}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}>
                    {step}/{totalSteps}
                  </span>
                </div>

                {/* Barre de progression */}
                <div className="mt-4">
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full transition-all duration-300 rounded-full" style={{ width: `${(step / totalSteps) * 100}%`, background: branding.primary }} />
                  </div>
                  <div className="hidden sm:grid gap-2 mt-1.5" style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}>
                    {steps.map((item) => (
                      <p key={item.number} className="text-[10px] font-semibold text-center truncate" style={{ color: step >= item.number ? branding.primary : '#9ca3af' }}>
                        {item.label}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contenu dynamique */}
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between min-h-0">
                <div 
                  className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 space-y-4"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: `${branding.primary}20 transparent`
                  }}
                >
                  {/* Étape 1 : Choix du type de compte */}
                  {step === 1 && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="space-y-0.5">
                        <h3 className="text-base font-bold" style={{ color: branding.text }}>Quel est votre besoin ?</h3>
                        <p className="text-xs" style={{ color: branding.textLight }}>Sélectionnez le profil qui vous correspond.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button type="button" onClick={() => handleAccountChoice('family_with_patient')} className="text-left p-4 rounded-2xl border transition-all hover:border-gray-300 flex flex-col justify-between min-h-[135px] sm:min-h-[145px]" style={{ borderColor: accountChoice === 'family_with_patient' ? branding.primary : '#e5e7eb', background: accountChoice === 'family_with_patient' ? `${branding.primary}04` : '#ffffff' }}>
                          <div className="w-8 h-8 rounded-2xl flex items-center justify-center mb-2" style={{ background: accountChoice === 'family_with_patient' ? `${branding.primary}10` : '#f3f4f6', color: accountChoice === 'family_with_patient' ? branding.primary : '#9ca3af' }}><Users size={18} /></div>
                          <div><p className="font-bold text-xs" style={{ color: accountChoice === 'family_with_patient' ? branding.primary : '#111827' }}>Pour un proche</p><p className="text-[11px] text-gray-500 mt-0.5 leading-tight line-clamp-2">Seniors, mamans ou bébés ayant besoin d'assistance.</p></div>
                        </button>
                        <button type="button" onClick={() => handleAccountChoice('personal')} className="text-left p-4 rounded-2xl border transition-all hover:border-gray-300 flex flex-col justify-between min-h-[135px] sm:min-h-[145px]" style={{ borderColor: accountChoice === 'personal' ? branding.primary : '#e5e7eb', background: accountChoice === 'personal' ? `${branding.primary}04` : '#ffffff' }}>
                          <div className="w-8 h-8 rounded-2xl flex items-center justify-center mb-2" style={{ background: accountChoice === 'personal' ? `${branding.primary}10` : '#f3f4f6', color: accountChoice === 'personal' ? branding.primary : '#9ca3af' }}><Home size={18} /></div>
                          <div><p className="font-bold text-xs" style={{ color: accountChoice === 'personal' ? branding.primary : '#111827' }}>Compte personnel</p><p className="text-[11px] text-gray-500 mt-0.5 leading-tight line-clamp-2">Créer mon espace sans accompagnement immédiat.</p></div>
                        </button>
                        <button type="button" onClick={() => handleAccountChoice('aidant')} className="text-left p-4 rounded-2xl border transition-all hover:border-gray-300 flex flex-col justify-between min-h-[135px] sm:min-h-[145px]" style={{ borderColor: accountChoice === 'aidant' ? branding.primary : '#e5e7eb', background: accountChoice === 'aidant' ? `${branding.primary}04` : '#ffffff' }}>
                          <div className="w-8 h-8 rounded-2xl flex items-center justify-center mb-2" style={{ background: accountChoice === 'aidant' ? `${branding.primary}10` : '#f3f4f6', color: accountChoice === 'aidant' ? branding.primary : '#9ca3af' }}><HeartHandshake size={18} /></div>
                          <div><p className="font-bold text-xs" style={{ color: accountChoice === 'aidant' ? branding.primary : '#111827' }}>Devenir aidant</p><p className="text-[11px] text-gray-500 mt-0.5 leading-tight line-clamp-2">Proposer mes services et rejoindre le réseau.</p></div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Étape 2 : Choix du service (Proche uniquement) */}
                  {step === 2 && isFamilyWithPatient && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="space-y-0.5">
                        <h3 className="text-base font-bold" style={{ color: branding.text }}>Qui accompagnerons-nous ?</h3>
                        <p className="text-xs" style={{ color: branding.textLight }}>Choisissez la catégorie concernée.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <button type="button" onClick={() => handleServiceChoice('senior')} className="p-4 rounded-2xl border text-left transition-all hover:border-gray-300 flex flex-col justify-between min-h-[130px] sm:min-h-[140px]" style={{ borderColor: formData.patientCategory === 'senior' ? branding.primary : '#e5e7eb', background: formData.patientCategory === 'senior' ? `${branding.primary}04` : '#ffffff' }}>
                          <div className="w-8 h-8 rounded-2xl flex items-center justify-center mb-2" style={{ background: formData.patientCategory === 'senior' ? `${branding.primary}10` : '#f3f4f6', color: formData.patientCategory === 'senior' ? branding.primary : '#9ca3af' }}><Users size={18} /></div>
                          <div><p className="font-bold text-xs" style={{ color: branding.text }}>Senior</p><p className="text-[11px] text-gray-500 mt-0.5 leading-tight line-clamp-2">Accompagnement quotidien d'une personne âgée à domicile.</p></div>
                        </button>
                        <button type="button" onClick={() => handleServiceChoice('maman_bebe')} className="p-4 rounded-2xl border text-left transition-all hover:border-gray-300 flex flex-col justify-between min-h-[130px] sm:min-h-[140px]" style={{ borderColor: formData.patientCategory === 'maman_bebe' ? branding.primary : '#e5e7eb', background: formData.patientCategory === 'maman_bebe' ? `${branding.primary}04` : '#ffffff' }}>
                          <div className="w-8 h-8 rounded-2xl flex items-center justify-center mb-2" style={{ background: formData.patientCategory === 'maman_bebe' ? `${branding.primary}10` : '#f3f4f6', color: formData.patientCategory === 'maman_bebe' ? branding.primary : '#9ca3af' }}><Baby size={18} /></div>
                          <div><p className="font-bold text-xs" style={{ color: branding.text }}>Maman & Bébé</p><p className="text-[11px] text-gray-500 mt-0.5 leading-tight line-clamp-2">Aide post-partum, soins bébé et soutien de la maman.</p></div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Étape Identité */}
                  {((step === 2 && !isFamilyWithPatient) || (step === 3 && isFamilyWithPatient)) && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="space-y-0.5"><h3 className="text-base font-bold" style={{ color: branding.text }}>Création de vos identifiants</h3><p className="text-xs" style={{ color: branding.textLight }}>Vos informations de connexion personnelles.</p></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Nom complet *</label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: branding.textLight }} /><input name="full_name" value={formData.full_name} onChange={handleChange} placeholder="Ex: Jean Dupont" className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} required /></div></div>
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Téléphone *</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: branding.textLight }} /><input name="phone" value={formData.phone} onChange={handleChange} placeholder="+229 90 00 00 00" className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} required /></div></div>
                        <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Adresse e-mail *</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: branding.textLight }} /><input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="votremail@adresse.com" className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} required /></div></div>
                        <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Mot de passe *</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: branding.textLight }} /><input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required minLength={6} placeholder="Minimum 6 caractères" className="w-full pl-9 pr-9 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: branding.textLight }}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
                      </div>
                    </div>
                  )}

                  {/* Synthèse Intermédiaire (Personal) */}
                  {step === 3 && isPersonal && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="space-y-0.5"><h3 className="text-base font-bold" style={{ color: branding.text }}>Dernière vérification</h3><p className="text-xs" style={{ color: branding.textLight }}>Relisez vos informations avant de valider.</p></div>
                      <div className="rounded-2xl p-4 border space-y-3" style={{ background: `${branding.primary}02`, borderColor: `${branding.primary}12` }}>
                        <div className="flex items-start gap-2.5"><div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}><User size={16} /></div><div><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Nom complet</p><p className="text-xs font-semibold break-words mt-0.5" style={{ color: branding.text }}>{formData.full_name || 'Non renseigné'}</p></div></div>
                        <div className="flex items-start gap-2.5"><div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}><Mail size={16} /></div><div><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">E-mail</p><p className="text-xs font-semibold break-words mt-0.5" style={{ color: branding.text }}>{formData.email || 'Non renseigné'}</p></div></div>
                        <div className="flex items-start gap-2.5"><div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}><Phone size={16} /></div><div><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Téléphone</p><p className="text-xs font-semibold break-words mt-0.5" style={{ color: branding.text }}>{formData.phone || 'Non renseigné'}</p></div></div>
                        <div className="flex items-start gap-2.5"><div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${branding.primary}08`, color: branding.primary }}><Home size={16} /></div><div><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Type de compte</p><p className="text-xs font-semibold break-words mt-0.5" style={{ color: branding.text }}>Compte personnel sans patient</p></div></div>
                        <p className="text-[10px] text-gray-400 pt-2 border-t border-black/5">Toutes les inscriptions font l'objet d'une validation manuelle par l'équipe Santé Plus.</p>
                      </div>
                    </div>
                  )}

                  {/* Profil de l'aidant */}
                  {step === 3 && isAidant && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="space-y-0.5"><h3 className="text-base font-bold" style={{ color: branding.text }}>Votre expérience</h3><p className="text-xs" style={{ color: branding.textLight }}>Renseignez vos spécialités d'accompagnement.</p></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Date de naissance</label><input type="date" name="birth_date" value={aidantData.birth_date} onChange={(e) => setAidantData({ ...aidantData, birth_date: e.target.value })} className="w-full px-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} /></div>
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Années d'expérience</label><select name="experience_years" value={aidantData.experience_years} onChange={(e) => setAidantData({ ...aidantData, experience_years: e.target.value })} className="w-full px-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }}><option value="">Sélectionner</option><option value="0">Débutant / &lt; 1 an</option><option value="2">2 à 3 ans</option><option value="4">4 à 5 ans</option><option value="6">6 à 10 ans</option><option value="10">Plus de 10 ans</option></select></div>
                        <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Adresse de résidence *</label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: branding.textLight }} /><input name="address" value={aidantData.address} onChange={(e) => setAidantData({ ...aidantData, address: e.target.value })} placeholder="Quartier, Ville" className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} required /></div></div>
                      </div>
                      <div><p className="text-xs font-semibold mb-1.5" style={{ color: branding.text }}>Spécialités principales</p><div className="grid grid-cols-2 gap-2">{SPECIALTIES.map((item) => { const active = aidantData.specialties.includes(item.id); return <button type="button" key={item.id} onClick={() => toggleSpecialty(item.id)} className="px-3 py-2.5 rounded-2xl border text-left text-xs transition-all hover:border-gray-300" style={{ borderColor: active ? branding.primary : '#e5e7eb', background: active ? `${branding.primary}04` : '#ffffff', color: branding.text }}><span className="mr-2">{item.icon}</span>{item.label}</button>; })}</div></div>
                    </div>
                  )}

                  {/* Informations Proche */}
                  {step === 4 && isFamilyWithPatient && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="space-y-0.5"><h3 className="text-base font-bold" style={{ color: branding.text }}>Le proche à accompagner</h3><p className="text-xs" style={{ color: branding.textLight }}>Service ciblé : {serviceLabel}</p></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Prénom *</label><input name="patient.first_name" value={formData.patientData.first_name} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} required /></div>
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Nom de famille *</label><input name="patient.last_name" value={formData.patientData.last_name} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} required /></div>
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Âge (ans)</label><input name="patient.age" type="number" value={formData.patientData.age} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} /></div>
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Sexe</label><select name="patient.gender" value={formData.patientData.gender} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }}><option value="">Sélectionner</option><option value="male">Homme</option><option value="female">Femme</option></select></div>
                        <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Lieu de prise en charge *</label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: branding.textLight }} /><input name="patient.address" value={formData.patientData.address} onChange={handleChange} placeholder="Adresse précise ou repères utiles" className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} required /></div></div>
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Téléphone (optionnel)</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: branding.textLight }} /><input name="patient.phone" value={formData.patientData.phone} onChange={handleChange} className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} /></div></div>
                        <div><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Contact d'urgence</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: branding.textLight }} /><input name="patient.emergency_contact" value={formData.patientData.emergency_contact} onChange={handleChange} className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} /></div></div>
                        <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Consignes ou besoins particuliers</label><textarea name="patient.notes" value={formData.patientData.notes} onChange={handleChange} rows={2} placeholder="Traitements, régimes, allergies, autonomie..." className="w-full px-3.5 py-2 rounded-2xl border outline-none text-xs resize-none focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} /></div>
                      </div>
                    </div>
                  )}

                  {/* Zones et dispo (Aidant uniquement) */}
                  {step === 4 && isAidant && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="space-y-0.5"><h3 className="text-base font-bold" style={{ color: branding.text }}>Mobilité et présentation</h3><p className="text-xs" style={{ color: branding.textLight }}>Où et quand pouvez-vous intervenir ?</p></div>
                      <div><p className="text-xs font-semibold mb-1.5" style={{ color: branding.text }}>Zones d'intervention</p><div className="flex flex-wrap gap-2">{ZONES.map((zone) => { const active = aidantData.zones.includes(zone); return <button type="button" key={zone} onClick={() => toggleZone(zone)} className="px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all" style={{ borderColor: active ? branding.primary : '#e5e7eb', background: active ? branding.primary : '#ffffff', color: active ? '#ffffff' : '#4b5563' }}>{zone}</button>; })}</div></div>
                      <div><label className="block text-xs font-semibold mb-1" style={{ color: branding.text }}>Votre description professionnelle</label><textarea value={aidantData.bio} onChange={(e) => setAidantData({ ...aidantData, bio: e.target.value })} rows={3} placeholder="Parlez-nous brièvement de vos motivations et de votre savoir-faire..." className="w-full px-3.5 py-2 rounded-2xl border outline-none text-xs resize-none focus:ring-1 focus:ring-[var(--color-primary)] transition" style={{ borderColor: branding.border, background: branding.background, color: branding.text }} /></div>
                      <label className="flex items-center gap-3 rounded-2xl border p-3 cursor-pointer bg-white" style={{ borderColor: branding.border }}><input type="checkbox" checked={aidantData.availability} onChange={(e) => setAidantData({ ...aidantData, availability: e.target.checked })} className="w-4 h-4 rounded" style={{ accentColor: branding.primary }} /><span className="text-xs font-medium" style={{ color: branding.text }}>Je suis immédiatement disponible pour démarrer</span></label>
                    </div>
                  )}

                  {/* ✅ ÉTAPE FINALE : VALIDATION (MODIFIÉE) */}
                  {step === totalSteps && renderValidationStep()}
                </div>

                {/* ============================================
                    MENTIONS LÉGALES & CGU (EN BAS)
                    ============================================ */}
                <div className="space-y-2 mt-4 pt-4 border-t" style={{ borderColor: branding.border }}>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <button type="button" onClick={() => setShowFAQ(true)} className="flex items-center gap-1.5 font-medium hover:underline opacity-80 hover:opacity-100" style={{ color: branding.primary }}><HelpCircle size={14} /> Consulter la FAQ</button>
                    <button type="button" onClick={() => setShowCGU(true)} className="flex items-center gap-1.5 font-medium hover:underline opacity-80 hover:opacity-100" style={{ color: branding.primary }}><Scale size={14} /> Lire les CGU</button>
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptCGU}
                      onChange={(e) => setAcceptCGU(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 shrink-0"
                      style={{ accentColor: branding.primary }}
                    />
                    <span className="text-xs leading-relaxed" style={{ color: branding.textLight }}>
                      J'accepte sans réserve les <button type="button" onClick={() => setShowCGU(true)} className="font-bold hover:underline" style={{ color: branding.primary }}>Conditions Générales d'Utilisation</button> de Santé Plus.
                    </span>
                  </label>
                  {!acceptCGU && step === totalSteps && (
                    <p className="text-[11px] font-semibold text-red-500">
                      ⚠️ L'acceptation des CGU est requise pour soumettre votre dossier.
                    </p>
                  )}
                </div>

                {/* ============================================
                    BOUTONS DE NAVIGATION (MODIFIÉS)
                    ============================================ */}
                <div className="flex gap-3 mt-4">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={goBack}
                      className="flex-1 max-w-[150px] py-2.5 rounded-2xl text-xs font-bold border transition-colors hover:bg-gray-50 flex items-center justify-center gap-1.5"
                      style={{ borderColor: branding.border, color: branding.text }}
                    >
                      <ArrowLeft size={14} /> Retour
                    </button>
                  )}

                  {/* ✅ Bouton "Continuer" ou "Créer mon compte" selon l'étape */}
                  {step !== totalSteps ? (
                    // ✅ BOUTON CONTINUER (étapes 1 à 4)
                    <button
                      type="button"
                      onClick={goNext}
                      className="flex-1 py-2.5 rounded-2xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95"
                      style={{ background: branding.primary }}
                    >
                      Continuer <ArrowRight size={14} />
                    </button>
                  ) : (
                    // ✅ BOUTON CRÉER MON COMPTE (étape finale)
                    <button
                      type="submit"
                      disabled={!canSubmit() || isLoading}
                      className="flex-1 py-2.5 rounded-2xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: canSubmit() ? branding.primary : '#9CA3AF' }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} />
                          Créer mon compte
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>

              {/* Redirection Connexion */}
              <div className="mt-4 text-center text-xs">
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

export default RegisterPage;
