// 📁 src/features/visits/components/VisitModalContent.tsx

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
  CheckCircle, 
  Loader2, 
  MapPin, 
  Hospital 
} from 'lucide-react';

import { Visit, Patient } from '@/types';
import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { useTerminology } from '@/hooks/useTerminology';
import { useBranding } from '@/hooks/useBranding';
import { supabase } from '@/lib/supabase';
import { getPonctualPrice } from '@/lib/constants';
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
  onOpenWizard?: (data: any, wizardData: any) => void;
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
  onOpenWizard,
}: VisitModalContentProps) => {
  const { createVisit, updateVisit } = useVisitStore();
  const { profile, role } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;

  const {
    hasActiveSubscription,
    remainingVisits,
    can,
    isFamily,
    isAidant: isAidantRole,
    isAdminOrCoordinator,
  } = useSubscriptionGuard();

  const { getCategoryLabel } = useTerminology();

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  const [targetType, setTargetType] = useState<'account' | 'patient'>('account');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [formData, setFormData] = useState({
    patient_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    notes: '',
    is_urgent: false,
    address: '',
    prestation_type: 'domicile',
    hospital_name: '',
    hospital_service: '',
    doctor_name: '',
  });

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const accountPatients = selectedAccount?.patients || [];
  const filteredAccounts = accounts.filter(account =>
    account.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = isAdminOrCoordinator;
  const isFamilyUser = isFamily;
  const isAidant = isAidantRole;

  const subscriptionMessage = (() => {
    if (isAidant || isAdmin) return null;

    if (hasActiveSubscription && remainingVisits > 0) {
      return {
        type: 'success',
        icon: <CheckCircle size={14} className="text-green-600" />,
        text: `${remainingVisits} visite(s) restante(s) sur votre forfait`, 
        colorClass: 'bg-green-50/70 border-green-100 text-green-800'
      };
    }

    const ponctualPrice = getPonctualPrice(formData.duration_minutes || 60);
    return {
      type: 'warning',
      icon: <AlertCircle size={14} className="text-amber-500" />,
      text: `Forfait épuisé ou inactif. Mode ponctuel appliqué : ${ponctualPrice.toLocaleString()} FCFA`,
      colorClass: 'bg-amber-50/70 border-amber-100 text-amber-850'
    };
  })();

  useEffect(() => {
    if (isAdmin) fetchAccounts();
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
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erreur');
      const result = await response.json();
      setAccounts(result.data || []);
    } catch (error) {
      console.error(error);
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
        address: visit.address || '',
        prestation_type: visit.metadata?.prestation_type || 'domicile',
        hospital_name: visit.metadata?.hospital_name || '',
        hospital_service: visit.metadata?.hospital_service || '',
        doctor_name: visit.metadata?.doctor_name || '',
      });
      if (visit.patient_id) {
        setTargetType('patient');
        if (visit.user_id) setSelectedAccountId(visit.user_id);
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
        address: '',
        prestation_type: 'domicile',
        hospital_name: '',
        hospital_service: '',
        doctor_name: '',
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

  const selectPersonnel = () => {
    setTargetType('account');
    const currentPhone = isAdmin ? selectedAccount?.phone : profile?.phone;
    const phoneSuffix = currentPhone ? ` (Tél: ${currentPhone})` : '';
    setFormData(prev => ({
      ...prev,
      patient_id: '',
      address: phoneSuffix ? `Mon adresse ${phoneSuffix}`.trim() : '',
    }));
  };

  const selectPatientType = () => {
    setTargetType('patient');
    setFormData(prev => ({ ...prev, patient_id: '', address: '' }));
  };

  const handlePatientSelect = (patientId: string) => {
    const patientList = isAdmin && selectedAccount?.has_patient ? accountPatients : patients;
    const selectedPatientObj = patientList.find(p => p.id === patientId);

    if (selectedPatientObj) {
      const phoneSuffix = selectedPatientObj.phone ? ` (Tél: ${selectedPatientObj.phone})` : '';
      setFormData(prev => ({
        ...prev,
        patient_id: patientId,
        address: `${selectedPatientObj.address || ''}${phoneSuffix}`.trim(),
      }));
    } else {
      setFormData(prev => ({ ...prev, patient_id: patientId, address: '' }));
    }
  };

  const handleAddressChange = (value: string) => {
    setFormData(prev => ({ ...prev, address: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.address.trim()) {
      toast.error('Veuillez renseigner l’adresse de l’intervention');
      setIsLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      if (formData.scheduled_date < today) {
        toast.error('La date de visite ne peut pas être dans le passé');
        setIsLoading(false);
        return;
      }

      const payloadMetadata = {
        prestation_type: formData.prestation_type,
        ...(formData.prestation_type === 'hospital_discharge' ? {
          is_discharge: true,
          hospital_name: formData.hospital_name.trim(),
          hospital_service: formData.hospital_service.trim() || null,
          doctor_name: formData.doctor_name.trim() || null,
        } : {}),
        ...(formData.prestation_type === 'medical_appointment' ? {
          is_medical_appointment: true,
          hospital_name: formData.hospital_name.trim(),
          hospital_service: formData.hospital_service.trim() || null,
          doctor_name: formData.doctor_name.trim() || null,
        } : {}),
      };

      let data: any = {
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        duration_minutes: formData.duration_minutes,
        notes: formData.notes ? formData.notes.trim() : null,
        is_urgent: formData.is_urgent,
        actions: [],
        requested_by: profile?.id,
        address: formData.address.trim(),
        latitude: null,
        longitude: null,
        metadata: payloadMetadata,
      };

      if (targetType === 'patient' && formData.patient_id) {
        const accountId = isAdmin ? selectedAccountId : profile?.id;
        data.patient_id = formData.patient_id;
        data.target_user_id = accountId;
        data.target_type = 'patient';
        data.target_name = null;
      } else {
        const accountId = isAdmin ? selectedAccountId : profile?.id;
        data.target_user_id = accountId;
        data.target_type = 'personal';
        data.target_name = isAdmin ? (selectedAccount?.full_name || 'Personnel') : (profile?.full_name || 'Personnel');
        data.patient_id = null;
      }

      if (isFamilyUser && !can('visit')) {
        data.is_ponctual = true;
        data.requires_payment = true;
      }

      if (mode === 'create') {
        try {
          const result = await createVisit(data);
          if (result?.status === 'brouillon') {
            toast.success(`💳 Visite créée en brouillon. Paiement requis.`);
          } else if (result?.status === 'en_attente_aidant') {
            toast.success('🦸 Visite créée en attente d\'aidant.');
          } else {
            toast.success(`✅ Visite planifiée avec succès !`);
          }
          onSuccess(result);
        } catch (error: any) {
          const errorData = error.response?.data;
          const isWizardRequired = (error.response?.status === 422 && errorData?.wizard_required) || (error.response?.status === 400 && errorData?.code === 'WIZARD_REQUIRED');

          if (isWizardRequired) {
            const wizardObj = errorData?.wizard || errorData;
            if (onOpenWizard) {
              onOpenWizard(data, {
                targetType: wizardObj.targetType || (targetType === 'patient' ? 'patient' : 'personal_account'),
                targetId: wizardObj.targetId || (targetType === 'patient' ? formData.patient_id : selectedAccountId),
                targetName: wizardObj.targetName || (targetType === 'patient' ? selectedAccount?.patients.find(p => p.id === formData.patient_id)?.first_name : selectedAccount?.full_name),
                familyId: wizardObj.familyId || selectedAccountId,
                scheduledDate: data.scheduled_date,
                scheduledTime: data.scheduled_time,
              });
            }
            setIsLoading(false);
            return;
          }
          toast.error(errorData?.error || error?.message || 'Erreur');
          setIsLoading(false);
        }
      } else if (visit) {
        await updateVisit(visit.id, data);
        toast.success('Visite mise à jour !');
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // INTERFACE-HELPER FUNCTIONS (RÉINTÉGRÉES POUR SÉCURISER TS)
  // ============================================================

  const renderAccountSelector = () => {
    if (!isAdmin) return null;

    return (
      <div className="space-y-1 mb-2">
        <label className="block text-[10px] font-black uppercase text-gray-500">
          Sélectionner un compte
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAccountSelector(!showAccountSelector)}
            className="w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between transition focus:ring-1 text-xs font-semibold bg-white"
            style={{ borderColor: colors.primary + '20', color: colors.text }}
          >
            <span className="truncate">
              {selectedAccount ? selectedAccount.display_name : 'Choisir un compte...'}
            </span>
            <span className="text-gray-400 text-xs shrink-0">▼</span>
          </button>

          {showAccountSelector && (
            <div className="absolute z-30 mt-1 left-0 right-0 w-full bg-white rounded-xl border shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: colors.primary + '15' }}>
              <div className="p-2 sticky top-0 bg-white border-b" style={{ borderColor: colors.primary + '15' }}>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border outline-none text-xs"
                    style={{ borderColor: colors.primary + '20', color: colors.text }}
                  />
                </div>
              </div>

              {isLoadingAccounts ? (
                <div className="p-3 text-center text-xs text-gray-400">Chargement...</div>
              ) : filteredAccounts.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-400">Aucun compte</div>
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
                    className="w-full px-3.5 py-2.5 text-left hover:bg-gray-50 transition flex items-center justify-between border-b last:border-0 text-xs"
                    style={{ borderColor: colors.primary + '10' }}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold truncate" style={{ color: colors.text }}>{account.full_name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {account.has_patient ? `👨‍👩‍👦 ${account.patients.length} proche(s)` : '👤 Personnel'}
                      </p>
                    </div>
                    {selectedAccountId === account.id && <span className="text-green-500 text-xs font-bold">✓</span>}
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
    if (!selectedAccount.has_patient) return null;

    return (
      <div className="space-y-1 mb-2">
        <label className="block text-[10px] font-black uppercase text-gray-500">Planifier pour :</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={selectPersonnel}
            className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 border ${
              targetType === 'account' ? 'text-white' : 'bg-gray-50 text-gray-500'
            }`}
            style={{
              background: targetType === 'account' ? colors.primary : 'transparent',
              borderColor: targetType === 'account' ? colors.primary : colors.primary + '20',
            }}
          >
            <div className="flex items-center gap-1"><UserCircle size={13} />Le compte</div>
          </button>

          <button
            type="button"
            onClick={selectPatientType}
            className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 border ${
              targetType === 'patient' ? 'text-white' : 'bg-gray-50 text-gray-500'
            }`}
            style={{
              background: targetType === 'patient' ? colors.primary : 'transparent',
              borderColor: targetType === 'patient' ? colors.primary : colors.primary + '20',
            }}
          >
            <div className="flex items-center gap-1"><Users size={13} />Un proche</div>
          </button>
        </div>
      </div>
    );
  };

  const renderPatientSelector = () => {
    if (targetType !== 'patient') return null;

    const patientList = isAdmin && selectedAccount?.has_patient ? accountPatients : patients;

    if (patientList.length === 0) {
      return (
        <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: '#FFFBEB', borderColor: '#F59E0B30' }}>
          <p className="text-xs font-bold text-amber-700">Aucun proche enregistré pour ce compte.</p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
          Proche associé *
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <select
            value={formData.patient_id}
            onChange={(e) => handlePatientSelect(e.target.value)}
            className="w-full pl-9 pr-3 h-11 rounded-xl border outline-none text-xs font-semibold bg-gray-50/50"
            style={{ borderColor: colors.primary + '20', color: colors.text }}
            required={targetType === 'patient'}
          >
            <option value="">Sélectionner un proche</option>
            {patientList.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.first_name} {patient.last_name} - {getCategoryLabel(patient.category)}
              </option>
            ))}
          </select>
        </div>
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
        <div className="p-3 rounded-xl flex items-start gap-2.5 border bg-gray-50/20" style={{ borderColor: colors.primary + '20' }}>
          <div className="p-1.5 bg-white rounded-lg shrink-0 border border-gray-100" style={{ color: colors.primary }}>
            {isAccount ? <UserCircle size={15} /> : <Users size={15} />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: colors.text }}>{targetName}</p>
            <p className="text-[10px] mt-0.5 text-gray-400">
              {isAccount ? '👤 Planification pour votre propre compte.' : `👨‍👩‍👦 Planification pour votre proche.`}
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
      <div className="p-3 rounded-xl flex items-start gap-2.5 border bg-gray-50/20" style={{ borderColor: colors.primary + '20' }}>
        <div className="p-1.5 bg-white rounded-lg shrink-0 border border-gray-100" style={{ color: colors.primary }}>
          {isAccount ? <UserCircle size={15} /> : <Users size={15} />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold truncate" style={{ color: colors.text }}>{targetName}</p>
          <p className="text-[10px] mt-0.5 text-gray-400">
            {isAccount ? `👤 Planification pour ${selectedAccount.full_name}.` : `👨‍👩‍👦 Planification pour un proche lié.`}
          </p>
        </div>
      </div>
    );
  };

  const renderFamilyContent = () => {
    if (isAdmin) return null;

    const hasPatients = patients.length > 0;

    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Pour qui ?</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={selectPersonnel}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
              targetType === 'account' ? 'text-white shadow-sm' : 'bg-gray-50 text-gray-500'
            }`}
            style={{
              background: targetType === 'account' ? colors.primary : 'transparent',
              borderColor: targetType === 'account' ? colors.primary : colors.primary + '20',
            }}
          >
            <UserCircle size={14} /> Personnel
          </button>

          <button
            type="button"
            onClick={selectPatientType}
            disabled={!hasPatients}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
              targetType === 'patient' ? 'text-white shadow-sm' : 'bg-gray-50 text-gray-500'
            }`}
            style={{
              background: targetType === 'patient' ? colors.primary : 'transparent',
              borderColor: targetType === 'patient' ? colors.primary : colors.primary + '20',
            }}
          >
            <Users size={14} /> Un proche
          </button>
        </div>
      </div>
    );
  };

  // ============================================================
  // BLOC DE RENDU DU CODE
  // ============================================================

  const hasPatients = patients.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-full">
      {/* 1. SECTEUR DESTINATAIRE INTELLIGENT */}
      <div className="space-y-2">
        <label className="block text-xs font-black uppercase tracking-wider text-gray-500">
          Destinataire de l'intervention
        </label>
        
        {isAdmin && (
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
            {renderAccountSelector()}
            {renderTargetTypeSelector()}
          </div>
        )}

        {!isAdmin && (
          <>
            {hasPatients ? renderFamilyContent() : (
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600">
                  <User size={15} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">{profile?.full_name}</p>
                  <p className="text-[10px] text-gray-400 font-semibold">Planification sur votre compte personnel</p>
                </div>
              </div>
            )}
          </>
        )}

        {targetType === 'patient' && renderPatientSelector()}
      </div>

      {/* RÉSUMÉ DU DESTINATAIRE */}
      {renderTargetSummary()}

      {/* 2. SÉLECTEUR DE TYPE D'INTERVENTION */}
      <div className="space-y-1">
        <label className="block text-xs font-black uppercase tracking-wider text-gray-500">
          Type de visite *
        </label>
        <select
          value={formData.prestation_type}
          onChange={(e) => setFormData(prev => ({ ...prev, prestation_type: e.target.value }))}
          className="w-full h-11 px-3.5 rounded-xl border outline-none text-xs font-bold bg-gray-50/50 cursor-pointer"
          style={{ borderColor: colors.primary + '20', color: colors.text }}
        >
          <option value="domicile">🏡 Aide, présence et confort à domicile</option>
          <option value="medical_appointment">🩺 Accompagnement à un Rendez-vous médical</option>
          <option value="hospital_discharge">🏥 Accompagnement / Sortie d'hôpital</option>
        </select>
      </div>

      {/* 3. CHAMPS CLINIQUES CONDITIONNELS */}
      {(formData.prestation_type === 'hospital_discharge' || formData.prestation_type === 'medical_appointment') && (
        <div className="animate-fadeIn space-y-3 p-3.5 rounded-2xl bg-gray-50/50 border border-gray-100">
          <p className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-600">
            <Hospital size={13} /> Détails de l'établissement hospitalier
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block font-bold mb-1" style={{ color: colors.text }}>Nom de l'établissement *</label>
              <input type="text" value={formData.hospital_name} onChange={(e) => setFormData(prev => ({ ...prev, hospital_name: e.target.value }))} placeholder="Ex: CNHU, Clinique..." className="w-full h-10 px-3 rounded-xl border outline-none font-semibold bg-white" style={{ borderColor: colors.primary + '20' }} required />
            </div>
            <div>
              <label className="block font-bold mb-1" style={{ color: colors.text }}>Service</label>
              <input type="text" value={formData.hospital_service} onChange={(e) => setFormData(prev => ({ ...prev, hospital_service: e.target.value }))} placeholder="Ex: Cardiologie..." className="w-full h-10 px-3 rounded-xl border outline-none font-semibold bg-white" style={{ borderColor: colors.primary + '20' }} />
            </div>
          </div>
        </div>
      )}

      {/* 4. ADRESSE */}
      <div className="space-y-1">
        <label className="block text-xs font-black uppercase tracking-wider text-gray-500">
          Adresse de l'intervention *
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            value={formData.address}
            onChange={(e) => handleAddressChange(e.target.value)}
            required
            className="w-full pl-9 pr-3 h-11 rounded-xl border outline-none text-xs font-semibold bg-gray-50/50"
            style={{ borderColor: colors.primary + '20', color: colors.text }}
            placeholder="Ex: Cotonou Cadjehoun, juste à côté de la pharmacie"
          />
        </div>
      </div>

      {/* 5. BANDEAU FORFAIT ÉPURÉ */}
      {isFamilyUser && subscriptionMessage && (
        <div className={`p-3 rounded-xl flex items-center gap-2.5 border ${subscriptionMessage.colorClass}`}>
          {subscriptionMessage.icon}
          <p className="text-xs font-semibold leading-normal">{subscriptionMessage.text}</p>
        </div>
      )}

      {/* 6. GRILLE TEMPORELLE (Date / Heure / Durée) */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className="block text-[10px] font-black uppercase text-gray-500">Date *</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
            <input type="date" value={formData.scheduled_date} onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })} className="w-full pl-8 pr-2 h-10 rounded-xl border text-xs font-semibold" style={{ borderColor: colors.primary + '20', color: colors.text }} required min={new Date().toISOString().split('T')[0]} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-black uppercase text-gray-500">Heure *</label>
          <div className="relative">
            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
            <input type="time" value={formData.scheduled_time} onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })} className="w-full pl-8 pr-2 h-10 rounded-xl border text-xs font-semibold" style={{ borderColor: colors.primary + '20', color: colors.text }} required />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-black uppercase text-gray-500">Durée</label>
          <select value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })} className="w-full h-10 px-2 rounded-xl border text-xs font-semibold bg-white cursor-pointer" style={{ borderColor: colors.primary + '20', color: colors.text }}>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">1h00</option>
            <option value="120">2h00</option>
          </select>
        </div>
      </div>

      {/* 7. NOTES */}
      <div className="space-y-1">
        <label className="block text-xs font-black uppercase tracking-wider text-gray-500">Notes importantes</label>
        <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-xs bg-gray-50/20" rows={2} placeholder="Détails, consignes pour l'aidant..." />
      </div>

      {/* 8. CONTROLES ACTION */}
      <div className="flex gap-2 pt-4 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-xs font-bold border transition" style={{ borderColor: colors.primary + '25', color: colors.text }}>
          Annuler
        </button>
        <button type="submit" disabled={isLoading} className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition flex items-center justify-center" style={{ background: colors.primary }}>
          {isLoading ? <Loader2 size={15} className="animate-spin" /> : (mode === 'create' ? 'Planifier la visite' : 'Mettre à jour')}
        </button>
      </div>
    </form>
  );
};
