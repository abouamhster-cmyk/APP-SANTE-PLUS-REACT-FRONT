// 📁 src/features/visits/components/VisitModalContent.tsx
// 📌 Contenu du formulaire de visite (sans wrapper modal)

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, AlertCircle, Users, UserCircle, Search } from 'lucide-react';
import { Visit, Patient } from '@/types';
import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { useTerminology } from '@/hooks/useTerminology';
import { getThemeColors } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface VisitModalContentProps {
  mode: 'create' | 'edit';
  visit: Visit | null;
  patients: Patient[];
  onSuccess: () => void;
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

export const VisitModalContent = ({
  mode,
  visit,
  patients,
  onSuccess,
  onCancel,
}: VisitModalContentProps) => {
  const { createVisit, updateVisit } = useVisitStore();
  const { profile, role } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const colors = getThemeColors('senior');

  const {
    singular,
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  // ✅ ÉTATS POUR LA GESTION DES COMPTES
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  // 'account' = pour le compte lui-même (personnel)
  // 'patient' = pour un patient du compte
  const [targetType, setTargetType] = useState<'account' | 'patient'>('account');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const [formData, setFormData] = useState({
    patient_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    notes: '',
    is_urgent: false,
  });

  const isAdmin = isAdminOrCoordinator;

  useEffect(() => {
    if (isAdmin) {
      fetchAccounts();
    }
  }, [isAdmin]);

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
      } else {
        setTargetType('account');
        setSelectedAccountId('');
      }
    }
  }, [visit, mode, isAdmin, accounts]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const accountPatients = selectedAccount?.patients || [];
  const filteredAccounts = accounts.filter(account =>
    account.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let data: any = {
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        duration_minutes: formData.duration_minutes,
        notes: formData.notes || null,
        is_urgent: formData.is_urgent,
        actions: [],
        requested_by: profile?.id,
      };

      if (targetType === 'patient') {
        if (!formData.patient_id) {
          toast.error(`Veuillez sélectionner un${singular.startsWith('béné') ? ' ' : 'e '}${singular}`);
          setIsLoading(false);
          return;
        }
        if (!selectedAccountId) {
          toast.error('Veuillez sélectionner un compte');
          setIsLoading(false);
          return;
        }
        data.patient_id = formData.patient_id;
        data.target_user_id = selectedAccountId;
        data.target_type = 'patient';
        data.target_name = null;
      }

      else if (targetType === 'account') {
        if (!selectedAccountId) {
          toast.error('Veuillez sélectionner un compte');
          setIsLoading(false);
          return;
        }
        data.target_user_id = selectedAccountId;
        data.target_type = 'personal';
        data.target_name = selectedAccount?.full_name || 'Compte personnel';
        data.patient_id = null;
      }

      else {
        data.target_type = 'personal';
        data.target_name = profile?.full_name || 'Personnel';
        data.patient_id = null;
      }

      if (mode === 'create') {
        await createVisit(data);
      } else if (visit) {
        await updateVisit(visit.id, data);
      }
      onSuccess();
    } catch (error: any) {
      console.error('❌ Erreur visite:', error);
      toast.error(error?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ SÉLECTEUR DE COMPTE (ADMIN)
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
              '--tw-ring-color': colors.primary
            } as any}
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

  // ✅ SÉLECTEUR DE DESTINATAIRE (ADMIN)
  const renderTargetTypeSelector = () => {
    if (!isAdmin || !selectedAccount) return null;

    if (!selectedAccount.has_patient) {
      return (
        <div className="p-3.5 rounded-xl flex items-center gap-2.5 border" style={{ background: colors.primary + '05', borderColor: colors.primary + '10' }}>
          <UserCircle size={18} style={{ color: colors.primary }} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-800 truncate">
              Planification personnelle ({selectedAccount.full_name})
            </p>
            <p className="text-[10px] text-gray-400 truncate">
              Aucun proche associé à ce profil
            </p>
          </div>
        </div>
      );
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
              Membres associés
            </span>
          </button>
        </div>
      </div>
    );
  };

  // ✅ SÉLECTEUR DE PATIENT
  const renderPatientSelector = () => {
    if (targetType !== 'patient') return null;

    const patientList = selectedAccount && selectedAccount.has_patient 
      ? accountPatients 
      : patients;

    if (patientList.length === 0) {
      return (
        <div className="p-3 rounded-xl border border-red-100 text-center" style={{ background: '#FEF2F2' }}>
          <p className="text-xs font-bold text-red-600">
            ⚠️ Aucun proche enregistré pour ce compte.
          </p>
          <p className="text-[10px] text-red-500 mt-0.5">
            Sélectionnez l'option "Le compte" pour planifier pour l'utilisateur.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
          {isFamily ? 'Proche' : isAidant ? 'Personne accompagnée' : 'Bénéficiaire'} *
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
              '--tw-ring-color': colors.primary
            } as any}
            required={targetType === 'patient'}
          >
            <option value="">Sélectionner un{singular.startsWith('béné') ? ' ' : 'e '}{singular}</option>
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

  // ✅ RÉSUMÉ DESTINATAIRE (ADMIN)
  const renderTargetSummary = () => {
    if (!selectedAccount) return null;

    if (targetType === 'account') {
      return (
        <div className="p-3 rounded-xl flex items-center gap-2.5 border" style={{ background: colors.primary + '03', borderColor: colors.border + '40' }}>
          <UserCircle size={18} style={{ color: colors.primary }} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-800 truncate">
              {selectedAccount.full_name}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              👤 Planification pour le titulaire principal
            </p>
          </div>
        </div>
      );
    }

    if (targetType === 'patient') {
      const selectedPatient = accountPatients.find(p => p.id === formData.patient_id);
      return (
        <div className="p-3 rounded-xl flex items-center gap-2.5 border" style={{ background: colors.primary + '03', borderColor: colors.border + '40' }}>
          <Users size={18} style={{ color: colors.primary }} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-800 truncate">
              {selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Sélection du proche requise'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              👨‍👩‍👦 Proche lié au compte de {selectedAccount.full_name}
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  // ✅ BANDEAU INFORMATIF / DISCLAIMER
  const renderDisclaimer = () => {
    let message = '';
    if (targetType === 'account' && selectedAccount) {
      message = `Planification pour le compte de ${selectedAccount.full_name}.`;
    } else if (targetType === 'patient' && selectedAccount) {
      message = `Planification pour un proche lié au compte de ${selectedAccount.full_name}.`;
    } else {
      message = 'Planification pour votre compte personnel.';
    }

    return (
      <div className="flex items-start gap-2.5 p-3 rounded-xl border" style={{ background: colors.primary + '05', borderColor: colors.primary + '10' }}>
        <AlertCircle size={15} style={{ color: colors.primary }} className="shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-500 leading-normal font-medium">
          {message}
        </p>
      </div>
    );
  };

  // ✅ FORMULAIRE STANDARD (FAMILLE / AIDANT HORS ADMIN)
  const renderFamilyContent = () => {
    if (isAdmin) return null;

    return (
      <>
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
              disabled={patients.length === 0}
              className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border min-w-0 w-full ${
                targetType === 'patient'
                  ? 'text-white shadow-sm'
                  : patients.length > 0
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
                {isFamily ? 'Proche' : isAidant ? 'Bénéficiaire' : 'Bénéficiaire'}
              </span>
            </button>
          </div>
          {patients.length === 0 && (
            <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
              <AlertCircle size={11} className="shrink-0" />
              Aucun proche enregistré. Option personnelle active.
            </p>
          )}
        </div>

        {targetType === 'patient' && patients.length > 0 && (
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
              {isFamily ? 'Proche' : isAidant ? 'Bénéficiaire' : 'Bénéficiaire'} *
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
                  '--tw-ring-color': colors.primary
                } as any}
                required={targetType === 'patient'}
              >
                <option value="">Sélectionner un{singular.startsWith('béné') ? ' ' : 'e '}{singular}</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name} - {getCategoryLabel(patient.category)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {targetType === 'account' && (
          <div className="p-3 rounded-xl flex items-center gap-2.5 border" style={{ background: colors.primary + '03', borderColor: colors.border + '40' }}>
            <UserCircle size={18} style={{ color: colors.primary }} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-800 truncate">
                {profile?.full_name || 'Personnel'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Visite à caractère personnel
              </p>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-full overflow-hidden">
      
      {/* 🔹 ADMIN : Sélection du compte */}
      {isAdmin && renderAccountSelector()}

      {/* 🔹 ADMIN : Choix destinataire */}
      {isAdmin && renderTargetTypeSelector()}

      {/* 🔹 FAMILLE : Configuration standard */}
      {!isAdmin && renderFamilyContent()}

      {/* 🔹 Résumé destinataire (admin) */}
      {isAdmin && renderTargetSummary()}

      {/* 🔹 Sélection patient */}
      {renderPatientSelector()}

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
                '--tw-ring-color': colors.primary
              } as any}
              required
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
                '--tw-ring-color': colors.primary
              } as any}
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
            '--tw-ring-color': colors.primary
          } as any}
        >
          <option value="30">30 minutes</option>
          <option value="45">45 minutes</option>
          <option value="60">1 heure</option>
          <option value="90">1h30</option>
          <option value="120">2 heures</option>
        </select>
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
            '--tw-ring-color': colors.primary
          } as any}
          rows={3}
          placeholder="Détails importants pour l'intervenant..."
        />
      </di
