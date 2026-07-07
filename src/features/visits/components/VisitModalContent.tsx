// 📁 frontend/src/features/visits/components/VisitModalContent.tsx

import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  UserCircle,
  Users,
  Search,
  AlertCircle,
  CreditCard,
  Sparkles,
  CheckCircle,
  Loader2,
  Zap,
  UserPlus,
} from 'lucide-react';

import { Visit, Patient } from '@/types';
import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { useTerminology } from '@/hooks/useTerminology';
import { getThemeColors } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';
import { getPonctualPrice } from '@/lib/constants';
import { VisitWizardModal } from './VisitWizardModal';
import toast from 'react-hot-toast';

// ============================================================
// TYPES
// ============================================================

interface VisitModalContentProps {
  mode: 'create' | 'edit';
  visit: Visit | null;
  patients: Patient[];
  onSuccess: (newVisit?: any) => void;
  onCancel: () => void;
}

interface Account {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  patient_category: string | null;
  is_active: boolean;
  has_patient: boolean;
  patients: Patient[];
  display_name: string;
  type: 'account_with_patients' | 'personal_account';
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export const VisitModalContent = ({
  mode,
  visit,
  patients,
  onSuccess,
  onCancel,
}: VisitModalContentProps) => {
  const { createVisit, updateVisit } = useVisitStore();
  const { profile, role, user } = useAuthStore();

  // ✅ Utiliser le guard d'abonnement
  const {
    hasActiveSubscription,
    remainingVisits,
    can,
    getActionMessage,
    isFamily,
    isAidant: isAidantRole,
    isAdminOrCoordinator,
    isLoading: subLoading,
  } = useSubscriptionGuard();

  const [isLoading, setIsLoading] = useState(false);
  const colors = getThemeColors('senior');

  const {
    singular,
    plural,
    getCategoryLabel,
  } = useTerminology();

  // ✅ ÉTATS POUR LA GESTION DES COMPTES
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  const [targetType, setTargetType] = useState<'account' | 'patient'>('account');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // ✅ ÉTATS POUR LE WIZARD
  const [showWizard, setShowWizard] = useState(false);
  const [wizardData, setWizardData] = useState<any>(null);
  const [isWizardLoading, setIsWizardLoading] = useState(false);
  const [pendingVisitData, setPendingVisitData] = useState<any>(null);

  const [formData, setFormData] = useState({
    patient_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    notes: '',
    is_urgent: false,
  });

  const isAdmin = isAdminOrCoordinator;
  const isFamilyUser = isFamily;
  const isAidant = isAidantRole;

  // ✅ Message d'information sur l'abonnement
  const subscriptionMessage = (() => {
    if (isAidant || isAdmin) return null;

    if (hasActiveSubscription && remainingVisits > 0) {
      return {
        type: 'success',
        icon: <CheckCircle size={14} />,
        text: `✅ ${remainingVisits} visite${remainingVisits > 1 ? 's' : ''} disponible${remainingVisits > 1 ? 's' : ''} sur votre abonnement`,
      };
    }

    if (hasActiveSubscription && remainingVisits === 0) {
      return {
        type: 'warning',
        icon: <AlertCircle size={14} />,
        text: '⚠️ Plus de visites disponibles sur votre abonnement. Passez en mode ponctuel ou renouvelez.',
      };
    }

    return {
      type: 'info',
      icon: <CreditCard size={14} />,
      text: '💳 Aucun abonnement actif. Utilisez le mode ponctuel ou souscrivez un abonnement.',
    };
  })();

  // ✅ Prix ponctuel selon la durée
  const ponctualPrice = getPonctualPrice(formData.duration_minutes || 60);

  // ✅ Charger les comptes pour l'admin
  useEffect(() => {
    if (isAdmin) {
      fetchAccounts();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin && profile?.id) {
      setSelectedAccountId(profile.id);
    }
  }, [isAdmin, profile]);

  const fetchAccounts = async () => {
    try {
      setIsLoadingAccounts(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/visits/accounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Erreur lors du chargement des comptes');
      const result = await response.json();
      setAccounts(result.data || []);
    } catch (error) {
      console.error('❌ Erreur chargement comptes:', error);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    if (visit && mode === 'edit') {
      setFormData({
        patient_id: visit.patient_id || '',
        scheduled_date: visit.scheduled_date || '',
        scheduled_time: visit.scheduled_time || '',
        duration_minutes: visit.duration_minutes || 60,
        notes: visit.notes || '',
        is_urgent: visit.is_urgent || false,
      });
      if (visit.patient_id) {
        setTargetType('patient');
        if (visit.user_id) {
          setSelectedAccountId(visit.user_id);
        }
      } else if (visit.user_id) {
        setTargetType('account');
        setSelectedAccountId(visit.user_id);
      }
    } else {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().slice(0, 5);
      setFormData({
        patient_id: '',
        scheduled_date: today,
        scheduled_time: now,
        duration_minutes: 60,
        notes: '',
        is_urgent: false,
      });

      if (isAdmin && accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
        setTargetType('account');
      } else if (!isAdmin && profile?.id) {
        setSelectedAccountId(profile.id);
        setTargetType('account');
      } else {
        setTargetType('account');
        setSelectedAccountId('');
      }
    }
  }, [visit, mode, isAdmin, accounts, profile]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const accountPatients = selectedAccount?.patients || [];
  const filteredAccounts = accounts.filter(account =>
    account.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ============================================================
  // ✅ GESTION DU WIZARD
  // ============================================================

  const handleWizardSuccess = async (wizardResult: any) => {
    setIsWizardLoading(true);
    setShowWizard(false);

    try {
      // ✅ Préparer les données avec le choix du wizard
      const visitPayload = {
        ...pendingVisitData,
        wizard_choice: wizardResult.wizardChoice,
        selected_aidant_id: wizardResult.aidantId,
        assignment_type: wizardResult.assignmentType || 'ponctuelle',
        // ✅ S'assurer que l'aidant est bien passé
        aidant_id: wizardResult.aidantId,
      };

      console.log('📤 Wizard - Création visite avec aidant:', visitPayload);

      // ✅ Créer la visite via le store
      const result = await createVisit(visitPayload);

      console.log('📤 Wizard - Résultat création:', result);

      // ✅ Vérifier le résultat
      if (result?.status === 'en_attente_aidant') {
        toast.success('Visite créée en attente d\'aidant. L\'administration a été notifiée.');
        onSuccess(result);
      } else if (result?.status === 'brouillon') {
        toast.success(`💳 Visite créée en brouillon. Paiement requis pour la planifier.`);
        onSuccess(result);
      } else if (result?.id) {
        toast.success('✅ Visite planifiée avec succès !');
        onSuccess(result);
      } else {
        toast.success('✅ Visite planifiée avec succès !');
        onSuccess(result);
      }
    } catch (error: any) {
      console.error('❌ Erreur création visite avec wizard:', error);
      toast.error(error.message || 'Erreur lors de la création de la visite');
      // ✅ Réouvrir le wizard en cas d'erreur
      setShowWizard(true);
    } finally {
      setIsWizardLoading(false);
      setPendingVisitData(null);
    }
  };

  const handleWizardClose = () => {
    setShowWizard(false);
    setPendingVisitData(null);
  };

  // ============================================================
  // ✅ SOUMISSION DU FORMULAIRE - CORRIGÉE AVEC GESTION DU WIZARD
  // ============================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      if (formData.scheduled_date < today) {
        toast.error('La date de visite ne peut pas être dans le passé');
        setIsLoading(false);
        return;
      }

      let data: any = {
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        duration_minutes: formData.duration_minutes,
        notes: formData.notes || null,
        is_urgent: formData.is_urgent,
        actions: [],
        requested_by: profile?.id,
      };

      // ✅ CAS 1: Visite pour un patient (si un patient est sélectionné ET targetType = patient)
      if (targetType === 'patient' && formData.patient_id) {
        const accountId = isAdmin ? selectedAccountId : profile?.id;
        if (!accountId) {
          toast.error('Compte utilisateur introuvable');
          setIsLoading(false);
          return;
        }

        if (isAdmin && selectedAccount) {
          const patientBelongsToAccount = selectedAccount.patients.some(p => p.id === formData.patient_id);
          if (!patientBelongsToAccount) {
            toast.error('Ce patient n\'appartient pas au compte sélectionné');
            setIsLoading(false);
            return;
          }
        }

        data.patient_id = formData.patient_id;
        data.target_user_id = accountId;
        data.target_type = 'patient';
        data.target_name = null;
      }
      // ✅ CAS 2: Visite pour le compte lui-même (personnel) - TOUJOURS DISPONIBLE
      else {
        const accountId = isAdmin ? selectedAccountId : profile?.id;
        if (!accountId) {
          toast.error('Compte utilisateur introuvable');
          setIsLoading(false);
          return;
        }
        data.target_user_id = accountId;
        data.target_type = 'personal';
        data.target_name = isAdmin 
          ? (selectedAccount?.full_name || 'Personnel') 
          : (profile?.full_name || 'Personnel');
        data.patient_id = null;
      }

      // ✅ DÉTERMINER SI PAIEMENT REQUIS (BACKEND LE FERA AUSSI)
      if (isFamilyUser && !can('visit')) {
        data.is_ponctual = true;
        data.requires_payment = true;
        console.log('💳 Mode ponctuel activé pour cette visite');
      }

      console.log('📤 Données envoyées:', data);

      if (mode === 'create') {
        try {
          // ✅ Tenter de créer la visite
          const result = await createVisit(data);

          // ✅ Si la visite est en brouillon (paiement requis)
          if (result?.status === 'brouillon') {
            const price = getPonctualPrice(formData.duration_minutes || 60);
            toast.success(`💳 Visite créée en brouillon. Paiement de ${price.toLocaleString()} FCFA requis pour la planifier.`);
            onSuccess(result);
          } else if (result?.status === 'en_attente_aidant') {
            toast.success('🦸 Visite créée en attente d\'aidant. L\'administration a été notifiée.');
            onSuccess(result);
          } else {
            toast.success(`Visite planifiée pour ${data.target_name || 'le bénéficiaire'}`);
            onSuccess(result);
          }
        } catch (error: any) {
          console.error('❌ Erreur création visite:', error);
          
          // ✅ Vérifier si c'est une erreur de wizard (422 avec wizard_required)
          if (error.response?.status === 422 && error.response?.data?.wizard_required) {
            const wizardDataObj = error.response.data;
            console.log('🔄 Ouverture du wizard avec les données:', wizardDataObj);
            
            setPendingVisitData(data);
            setWizardData({
              targetType: wizardDataObj.targetType || 'personal_account',
              targetId: wizardDataObj.targetId || user?.id,
              targetName: wizardDataObj.targetName || 'Personnel',
              familyId: wizardDataObj.familyId || user?.id,
              scheduledDate: data.scheduled_date,
              scheduledTime: data.scheduled_time,
            });
            setShowWizard(true);
            setIsLoading(false);
            return;
          }
          
          // ✅ Autres erreurs
          toast.error(error?.message || 'Erreur lors de la création');
          setIsLoading(false);
        }
      } else if (visit) {
        await updateVisit(visit.id, data);
        toast.success('Visite mise à jour');
        onSuccess();
      }
    } catch (error: any) {
      console.error('❌ Erreur visite:', error);
      toast.error(error?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // RENDU DES SÉLECTEURS
  // ============================================================

  const renderAccountSelector = () => {
    if (!isAdmin) return null;

    return (
      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
          Sélectionner un compte
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAccountSelector(!showAccountSelector)}
            className="w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between transition focus:ring-1 text-xs sm:text-sm font-semibold"
            style={{
              borderColor: colors.border,
              background: 'var(--color-background, #f5f0e8)',
              color: colors.text,
            }}
          >
            <span className="truncate">
              {selectedAccount ? selectedAccount.display_name : 'Choisir un compte...'}
            </span>
            <span className="text-gray-400 text-xs shrink-0">▼</span>
          </button>

          {showAccountSelector && (
            <div
              className="absolute z-30 mt-1 left-0 right-0 w-full bg-white rounded-xl border shadow-lg max-h-60 overflow-y-auto"
              style={{ borderColor: colors.border }}
            >
              <div className="p-2 sticky top-0 bg-white border-b" style={{ borderColor: colors.border }}>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher un compte..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border outline-none text-xs"
                    style={{ borderColor: colors.border, color: colors.text }}
                  />
                </div>
              </div>

              {isLoadingAccounts ? (
                <div className="p-3 text-center text-xs text-gray-400">Chargement...</div>
              ) : filteredAccounts.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-400">Aucun compte trouvé</div>
              ) : (
                filteredAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => {
                      setSelectedAccountId(account.id);
                      setShowAccountSelector(false);
                      setSearchTerm('');
                      setTargetType('account');
                      setFormData(prev => ({ ...prev, patient_id: '' }));
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-gray-50 transition flex items-center justify-between border-b last:border-0"
                    style={{ borderColor: colors.border + '10' }}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs sm:text-sm font-bold truncate text-gray-800">
                        {account.full_name}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        {account.has_patient
                          ? `👨‍👩‍👦 ${account.patients.length} proche(s)`
                          : '👤 Compte personnel'}
                        {account.patient_category === 'maman_bebe' && ' 👶'}
                      </p>
                    </div>
                    {selectedAccountId === account.id && (
                      <span className="text-green-500 text-xs shrink-0 font-bold">✓</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTargetTypeSelector = () => {
    if (!isAdmin || !selectedAccount) return null;

    if (!selectedAccount.has_patient) {
      return null;
    }

    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
          Planifier pour :
        </label>
        <div className="grid grid-cols-2 gap-2 w-full min-w-0">
          <button
            type="button"
            onClick={() => {
              setTargetType('account');
              setFormData(prev => ({ ...prev, patient_id: '' }));
            }}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border min-w-0 w-full ${
              targetType === 'account'
                ? 'text-white shadow-sm'
                : 'bg-gray-50 text-gray-500'
            }`}
            style={{
              background: targetType === 'account' ? colors.primary : 'transparent',
              borderColor: targetType === 'account' ? colors.primary : colors.border,
            }}
          >
            <div className="flex items-center gap-1 truncate">
              <UserCircle size={14} />
              <span>Le compte</span>
            </div>
            <span className="text-[9px] opacity-75 truncate max-w-full">
              {selectedAccount.full_name}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTargetType('patient')}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border min-w-0 w-full ${
              targetType === 'patient'
                ? 'text-white shadow-sm'
                : 'bg-gray-50 text-gray-500'
            }`}
            style={{
              background: targetType === 'patient' ? colors.primary : 'transparent',
              borderColor: targetType === 'patient' ? colors.primary : colors.border,
            }}
          >
            <div className="flex items-center gap-1 truncate">
              <Users size={14} />
              <span>Un proche</span>
            </div>
            <span className="text-[9px] opacity-75 truncate">
              {selectedAccount.patients.length} proche{selectedAccount.patients.length > 1 ? 's' : ''} associé{selectedAccount.patients.length > 1 ? 's' : ''}
            </span>
          </button>
        </div>
      </div>
    );
  };

  const renderPatientSelector = () => {
    if (targetType !== 'patient') return null;

    const patientList = isAdmin && selectedAccount?.has_patient
      ? accountPatients
      : patients;

    if (patientList.length === 0) {
      return (
        <div className="p-3 rounded-xl border border-amber-200 text-center" style={{ background: '#FFFBEB' }}>
          <div className="flex items-center justify-center gap-2 text-amber-700">
            <AlertCircle size={16} />
            <p className="text-xs font-bold">Aucun proche enregistré pour ce compte.</p>
          </div>
          <p className="text-[10px] text-amber-600 mt-1">
            Sélectionnez l'option <strong>"Personnel"</strong> pour planifier pour l'utilisateur.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
          {isFamilyUser ? 'Proche' : isAidant ? 'Personne accompagnée' : 'Bénéficiaire'} *
        </label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <select
            value={formData.patient_id}
            onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border outline-none text-xs sm:text-sm font-semibold transition focus:ring-1"
            style={{
              borderColor: colors.border,
              background: 'var(--color-background, #f5f0e8)',
              color: colors.text,
            }}
            required={targetType === 'patient'}
          >
            <option value="">Sélectionner un{singular.startsWith('béné') ? ' ' : 'e '}{singular}</option>
            {patientList.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.first_name} {patient.last_name} - {getCategoryLabel(patient.category)}
                {patient.status === 'active' ? '' : ' (inactif)'}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[9px] text-gray-400 mt-0.5">
          {patientList.length} {singular}{patientList.length > 1 ? 's' : ''} disponible{patientList.length > 1 ? 's' : ''}
        </p>
      </div>
    );
  };

  const renderTargetSummary = () => {
    const isAccount = targetType === 'account';

    if (!isAdmin && profile) {
      const targetName = isAccount ? profile.full_name : (() => {
        const selectedPatient = patients.find(p => p.id === formData.patient_id);
        return selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'un proche';
      })();

      return (
        <div className="p-3 rounded-xl flex items-start gap-2.5 border bg-gray-50/20" style={{ borderColor: colors.border + '40' }}>
          <div className="p-1.5 bg-white rounded-lg shrink-0 border border-gray-100" style={{ color: colors.primary }}>
            {isAccount ? <UserCircle size={15} /> : <Users size={15} />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-800 truncate">
              {targetName}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {isAccount ? '👤 Planification pour votre propre compte.' : `👨‍👩‍👦 Planification d'une visite pour votre proche.`}
            </p>
          </div>
        </div>
      );
    }

    if (!selectedAccount) return null;

    const targetName = isAccount ? selectedAccount.full_name : (() => {
      const selectedPatient = accountPatients.find(p => p.id === formData.patient_id);
      return selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'un proche';
    })();

    return (
      <div className="p-3 rounded-xl flex items-start gap-2.5 border bg-gray-50/20" style={{ borderColor: colors.border + '40' }}>
        <div className="p-1.5 bg-white rounded-lg shrink-0 border border-gray-100" style={{ color: colors.primary }}>
          {isAccount ? <UserCircle size={15} /> : <Users size={15} />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-800 truncate">
            {targetName}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {isAccount
              ? `👤 Planification pour le titulaire principal de ${selectedAccount.full_name}.`
              : `👨‍👩‍👦 Planification pour un membre du compte de ${selectedAccount.full_name}.`}
          </p>
          {!isAccount && accountPatients.length > 0 && (
            <p className="text-[8px] text-gray-400 mt-0.5">
              {accountPatients.length} proche{accountPatients.length > 1 ? 's' : ''} disponible{accountPatients.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderFamilyContent = () => {
    if (isAdmin) return null;

    const hasPatients = patients.length > 0;

    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
          Pour qui ?
        </label>
        <div className="grid grid-cols-2 gap-2 w-full min-w-0">
          <button
            type="button"
            onClick={() => {
              setTargetType('account');
              setFormData(prev => ({ ...prev, patient_id: '' }));
            }}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border min-w-0 w-full ${
              targetType === 'account'
                ? 'text-white shadow-sm'
                : 'bg-gray-50 text-gray-500'
            }`}
            style={{
              background: targetType === 'account' ? colors.primary : 'transparent',
              borderColor: targetType === 'account' ? colors.primary : colors.border,
            }}
          >
            <UserCircle size={14} />
            <span className="truncate">Personnel</span>
          </button>

          <button
            type="button"
            onClick={() => setTargetType('patient')}
            disabled={!hasPatients}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border min-w-0 w-full ${
              targetType === 'patient'
                ? 'text-white shadow-sm'
                : hasPatients
                  ? 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  : 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400'
            }`}
            style={{
              background: targetType === 'patient' ? colors.primary : 'transparent',
              borderColor: targetType === 'patient' ? colors.primary : colors.border,
            }}
          >
            <Users size={14} />
            <span className="truncate">
              {isFamilyUser ? 'Proche' : isAidant ? 'Bénéficiaire' : 'Bénéficiaire'}
            </span>
          </button>
        </div>
        {!hasPatients && (
          <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
            <UserCircle size={11} className="shrink-0" />
            Aucun proche enregistré. Option personnelle active par défaut.
          </p>
        )}
        {hasPatients && (
          <p className="text-[9px] text-gray-400 mt-1">
            {patients.length} {singular}{patients.length > 1 ? 's' : ''} disponible{patients.length > 1 ? 's' : ''}
          </p>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================

  // Si le wizard est ouvert
  if (showWizard && wizardData) {
    return (
      <VisitWizardModal
        isOpen={showWizard}
        onClose={handleWizardClose}
        onSuccess={handleWizardSuccess}
        targetType={wizardData.targetType}
        targetId={wizardData.targetId}
        targetName={wizardData.targetName}
        familyId={wizardData.familyId}
        scheduledDate={wizardData.scheduledDate}
        scheduledTime={wizardData.scheduledTime}
        colors={colors}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-full overflow-hidden">

      {/* 🔹 ADMIN : Sélection de compte */}
      {isAdmin && renderAccountSelector()}

      {/* 🔹 ADMIN : Sélecteur de type d'allocation */}
      {isAdmin && renderTargetTypeSelector()}

      {/* 🔹 FAMILLE/AIDANT : Sélection standard */}
      {!isAdmin && renderFamilyContent()}

      {/* 🔹 Sélection patient (si "proche" sélectionné) */}
      {renderPatientSelector()}

      {/* 🔹 Résumé destinataire de la visite (Unifié) */}
      {renderTargetSummary()}

      {/* ============================================================
      ✅ BANDEAU D'INFORMATION ABONNEMENT (FAMILLE UNIQUEMENT)
      ============================================================ */}
      {isFamilyUser && subscriptionMessage && (
        <div
          className={`p-3 rounded-xl flex items-start gap-2.5 border ${
            subscriptionMessage.type === 'success' ? 'bg-green-50 border-green-200' :
            subscriptionMessage.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
            'bg-blue-50 border-blue-200'
          }`}
        >
          <div className={`mt-0.5 ${
            subscriptionMessage.type === 'success' ? 'text-green-600' :
            subscriptionMessage.type === 'warning' ? 'text-yellow-600' :
            'text-blue-600'
          }`}>
            {subscriptionMessage.icon}
          </div>
          <div>
            <p className={`text-xs font-medium ${
              subscriptionMessage.type === 'success' ? 'text-green-700' :
              subscriptionMessage.type === 'warning' ? 'text-yellow-700' :
              'text-blue-700'
            }`}>
              {subscriptionMessage.text}
            </p>
            {!hasActiveSubscription && (
              <p className="text-[10px] text-blue-600 mt-0.5">
                💳 Prix ponctuel : {ponctualPrice.toLocaleString()} FCFA pour {formData.duration_minutes} min
              </p>
            )}
            {hasActiveSubscription && remainingVisits === 0 && (
              <p className="text-[10px] text-yellow-600 mt-0.5">
                💳 Prix ponctuel : {ponctualPrice.toLocaleString()} FCFA pour {formData.duration_minutes} min
              </p>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
      BANDEAU POUR AIDANT (info sur la notification)
      ============================================================ */}
      {isAidant && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2">
          <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-blue-700">En tant qu'aidant, vous serez notifié de cette visite</p>
            <p className="text-[10px] text-blue-600">Une fois la visite approuvée, elle apparaîtra dans votre planning.</p>
          </div>
        </div>
      )}

      {/* 🔹 Grille Date et Heure */}
      <div className="grid grid-cols-2 gap-3 w-full min-w-0">
        <div className="space-y-1 min-w-0">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Date *</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              className="w-full pl-9 pr-2 py-2 rounded-xl border outline-none text-xs sm:text-sm font-semibold transition focus:ring-1"
              style={{
                borderColor: colors.border,
                background: 'var(--color-background, #f5f0e8)',
                color: colors.text,
              }}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="space-y-1 min-w-0">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Heure *</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="time"
              value={formData.scheduled_time}
              onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              className="w-full pl-9 pr-2 py-2 rounded-xl border outline-none text-xs sm:text-sm font-semibold transition focus:ring-1"
              style={{
                borderColor: colors.border,
                background: 'var(--color-background, #f5f0e8)',
                color: colors.text,
              }}
              required
            />
          </div>
        </div>
      </div>

      {/* 🔹 Durée */}
      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Durée estimée</label>
        <select
          value={formData.duration_minutes}
          onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
          className="w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs sm:text-sm font-semibold transition focus:ring-1"
          style={{
            borderColor: colors.border,
            background: 'var(--color-background, #f5f0e8)',
            color: colors.text,
          }}
        >
          <option value="30">30 minutes</option>
          <option value="45">45 minutes</option>
          <option value="60">1 heure</option>
          <option value="90">1h30</option>
          <option value="120">2 heures</option>
        </select>
        {/* ✅ AFFICHAGE DU PRIX PONCTUEL EN TEMPS RÉEL */}
        {isFamilyUser && !hasActiveSubscription && (
          <p className="text-[10px] text-gray-400 mt-1">
            💳 Prix ponctuel : {ponctualPrice.toLocaleString()} FCFA
          </p>
        )}
      </div>

      {/* 🔹 Notes */}
      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Notes complémentaires</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs sm:text-sm font-semibold transition focus:ring-1 resize-none"
          style={{
            borderColor: colors.border,
            background: 'var(--color-background, #f5f0e8)',
            color: colors.text,
          }}
          rows={3}
          placeholder="Détails importants pour l'intervenant..."
        />
      </div>

      {/* 🔹 Urgence */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="is_urgent"
          checked={formData.is_urgent}
          onChange={(e) => setFormData({ ...formData, is_urgent: e.target.checked })}
          className="w-4 h-4 rounded"
          style={{ accentColor: colors.primary }}
        />
        <label htmlFor="is_urgent" className="text-xs sm:text-sm font-bold text-gray-700 cursor-pointer select-none">
          ⚠️ Signaler comme visite urgente
        </label>
      </div>

      {/* 🔹 Boutons actions */}
      <div className="flex gap-2 pt-4 border-t" style={{ borderColor: colors.border }}>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition hover:bg-gray-50"
          style={{ borderColor: colors.border, color: colors.text }}
        >
          Annuler
        </button>
        <button
          type="submit"
          className="flex-1 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold transition hover:opacity-90 flex items-center justify-center disabled:opacity-55"
          style={{ background: colors.primary }}
          disabled={isLoading || isWizardLoading}
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            mode === 'create' ? 'Planifier' : 'Mettre à jour'
          )}
        </button>
      </div>
    </form>
  );
};

export default VisitModalContent;
