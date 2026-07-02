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

  // ✅ Choix du destinataire
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

  // ✅ Charger les comptes pour l'admin
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

  // ✅ Réinitialiser le formulaire
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
        // Récupérer le compte associé au patient
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
      // Par défaut, sélectionner le premier compte si admin
      if (isAdmin && accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
        setTargetType('account');
      } else {
        setTargetType('account');
        setSelectedAccountId('');
      }
    }
  }, [visit, mode, isAdmin, accounts]);

  // ✅ Obtenir le compte sélectionné
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // ✅ Obtenir les patients du compte sélectionné
  const accountPatients = selectedAccount?.patients || [];

  // ✅ Vérifier si le compte a des patients
  const hasAccountPatients = accountPatients.length > 0;

  // ✅ Filtrer les comptes pour la recherche
  const filteredAccounts = accounts.filter(account =>
    account.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Gérer la soumission
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

      // ✅ CAS 1: Visite pour un patient du compte
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
        data.target_user_id = selectedAccountId;  // ✅ Le compte propriétaire
        data.target_type = 'patient';
        data.target_name = null;
      }

      // ✅ CAS 2: Visite pour le compte lui-même (personnel)
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

      // ✅ CAS 3: Fallback - utilisateur connecté
      else {
        data.target_type = 'personal';
        data.target_name = profile?.full_name || 'Personnel';
        data.patient_id = null;
      }

      console.log('📤 Création visite avec données:', data);

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

  // ✅ Rendu du sélecteur de compte
  const renderAccountSelector = () => {
    if (!isAdmin) return null;

    return (
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>
          Sélectionner un compte
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAccountSelector(!showAccountSelector)}
            className="w-full px-4 py-3 rounded-xl border text-left flex items-center justify-between transition focus:ring-2"
            style={{
              borderColor: colors.border || '#e5e0d8',
              background: 'var(--color-background, #f5f0e8)',
              color: colors.text,
            }}
          >
            <span className="truncate">
              {selectedAccount ? selectedAccount.display_name : 'Choisir un compte...'}
            </span>
            <span className="text-gray-400">▼</span>
          </button>

          {showAccountSelector && (
            <div className="absolute z-20 mt-1 w-full bg-white rounded-xl border shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: colors.border }}>
              <div className="p-2 sticky top-0 bg-white border-b" style={{ borderColor: colors.border }}>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher un compte..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border outline-none text-sm"
                    style={{ borderColor: colors.border, color: colors.text }}
                  />
                </div>
              </div>

              {isLoadingAccounts ? (
                <div className="p-4 text-center text-gray-400">Chargement...</div>
              ) : filteredAccounts.length === 0 ? (
                <div className="p-4 text-center text-gray-400">Aucun compte trouvé</div>
              ) : (
                filteredAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => {
                      setSelectedAccountId(account.id);
                      setShowAccountSelector(false);
                      setSearchTerm('');
                      // ✅ Par défaut : planifier pour le compte (personnel)
                      setTargetType('account');
                      // Réinitialiser le patient sélectionné
                      setFormData(prev => ({ ...prev, patient_id: '' }));
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: colors.text }}>
                        {account.full_name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {account.has_patient 
                          ? `👨‍👩‍👦 ${account.patients.length} proche(s) - 👤 Planifiable pour le compte aussi` 
                          : '👤 Compte personnel'}
                        {account.patient_category === 'maman_bebe' && ' 👶'}
                      </p>
                    </div>
                    {selectedAccountId === account.id && (
                      <span className="text-green-500 text-xs font-bold">✅</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {selectedAccount && (
          <p className="text-xs mt-1" style={{ color: colors.text + '60' }}>
            {selectedAccount.has_patient 
              ? `👨‍👩‍👦 ${selectedAccount.patients.length} proche(s) associé(s) - Vous pouvez planifier pour le compte ou pour un proche`
              : '👤 Compte personnel - Planification pour l\'utilisateur'}
          </p>
        )}
      </div>
    );
  };

  // ✅ Rendu du choix du destinataire (toujours visible pour l'admin après sélection d'un compte)
  const renderTargetTypeSelector = () => {
    if (!isAdmin || !selectedAccount) return null;

    // ✅ TOUJOURS PROPOSER LES 2 OPTIONS pour les comptes avec patients
    // ✅ Pour les comptes personnels, on cache car seule l'option 'account' est disponible
    if (!selectedAccount.has_patient) {
      return (
        <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: colors.primary + '05' }}>
          <UserCircle size={20} style={{ color: colors.primary }} />
          <div>
            <p className="text-sm font-medium" style={{ color: colors.text }}>
              Planification pour le compte personnel
            </p>
            <p className="text-[10px]" style={{ color: colors.text + '50' }}>
              {selectedAccount.full_name} - Aucun proche associé
            </p>
          </div>
        </div>
      );
    }

    // ✅ Compte avec patients → proposer les 2 options
    return (
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>
          Planifier pour :
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setTargetType('account');
              setFormData(prev => ({ ...prev, patient_id: '' }));
            }}
            className={`p-3 rounded-xl text-xs font-bold transition text-center ${
              targetType === 'account'
                ? 'text-white shadow-sm scale-[1.02]'
                : 'border bg-gray-50 text-gray-600'
            }`}
            style={{
              background: targetType === 'account' ? colors.primary : 'transparent',
              borderColor: targetType === 'account' ? colors.primary : colors.border,
            }}
          >
            <div className="flex items-center justify-center gap-1.5">
              <UserCircle size={16} />
              <span>👤 Le compte</span>
            </div>
            <p className="text-[8px] opacity-70 mt-0.5">{selectedAccount.full_name}</p>
          </button>

          <button
            type="button"
            onClick={() => setTargetType('patient')}
            className={`p-3 rounded-xl text-xs font-bold transition text-center ${
              targetType === 'patient'
                ? 'text-white shadow-sm scale-[1.02]'
                : 'border bg-gray-50 text-gray-600'
            }`}
            style={{
              background: targetType === 'patient' ? colors.primary : 'transparent',
              borderColor: targetType === 'patient' ? colors.primary : colors.border,
            }}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Users size={16} />
              <span>👨‍👩‍👦 Un proche</span>
            </div>
            <p className="text-[8px] opacity-70 mt-0.5">du compte</p>
          </button>
        </div>
      </div>
    );
  };

  // ✅ Rendu du sélecteur de patient
  const renderPatientSelector = () => {
    if (targetType !== 'patient') return null;

    const patientList = selectedAccount && selectedAccount.has_patient 
      ? accountPatients 
      : patients;

    if (patientList.length === 0) {
      return (
        <div className="p-3 rounded-xl text-center" style={{ background: '#FEF2F2' }}>
          <p className="text-sm text-amber-600">
            ⚠️ Ce compte n'a pas de proche enregistré.
          </p>
          <p className="text-xs text-amber-500 mt-1">
            Vous pouvez planifier une visite pour le compte lui-même en utilisant l'option "Le compte".
          </p>
        </div>
      );
    }

    return (
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
          {isFamily ? 'Proche' : isAidant ? 'Personne accompagnée' : 'Bénéficiaire'} *
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
          <select
            value={formData.patient_id}
            onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
            className="w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition focus:ring-2"
            style={{
              borderColor: colors.border || '#e5e0d8',
              background: 'var(--color-background, #f5f0e8)',
              color: colors.text,
            }}
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

  // ✅ Rendu du résumé du destinataire
  const renderTargetSummary = () => {
    if (!selectedAccount) return null;

    if (targetType === 'account') {
      return (
        <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: colors.primary + '05' }}>
          <UserCircle size={20} style={{ color: colors.primary }} />
          <div>
            <p className="text-sm font-medium" style={{ color: colors.text }}>
              {selectedAccount.full_name}
            </p>
            <p className="text-[10px]" style={{ color: colors.text + '50' }}>
              👤 Planification pour le compte lui-même
              {selectedAccount.has_patient && ` (${selectedAccount.patients.length} proche(s) associé(s))`}
            </p>
          </div>
        </div>
      );
    }

    if (targetType === 'patient') {
      const selectedPatient = accountPatients.find(p => p.id === formData.patient_id);
      return (
        <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: colors.primary + '05' }}>
          <Users size={20} style={{ color: colors.primary }} />
          <div>
            <p className="text-sm font-medium" style={{ color: colors.text }}>
              {selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Proche'}
            </p>
            <p className="text-[10px]" style={{ color: colors.text + '50' }}>
              👨‍👩‍👦 Proche de {selectedAccount.full_name}
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  // ✅ Rendu du disclaimer
  const renderDisclaimer = () => {
    let message = '';
    if (targetType === 'account' && selectedAccount) {
      message = `La visite sera planifiée pour le compte de ${selectedAccount.full_name}. 
        ${selectedAccount.has_patient ? 'Le compte a des proches mais vous planifiez pour l\'utilisateur lui-même.' : 'Compte personnel sans proche.'}`;
    } else if (targetType === 'patient' && selectedAccount) {
      message = `La visite sera planifiée pour un proche du compte de ${selectedAccount.full_name}.`;
    } else {
      message = 'La visite sera planifiée pour votre compte personnel.';
    }

    return (
      <div className="flex items-start space-x-2 p-3 rounded-xl" style={{ background: colors.primary + '10' }}>
        <AlertCircle size={20} style={{ color: colors.primary }} className="flex-shrink-0 mt-0.5" />
        <p className="text-xs" style={{ color: colors.text + '80' }}>
          {message}
        </p>
      </div>
    );
  };

  // ✅ Rendu pour les familles (non admin)
  const renderFamilyContent = () => {
    if (isAdmin) return null;

    return (
      <>
        {/* Choix du destinataire */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>
            Pour qui ?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setTargetType('account');
                setFormData(prev => ({ ...prev, patient_id: '' }));
              }}
              className={`p-3 rounded-xl text-xs font-bold transition text-center ${
                targetType === 'account'
                  ? 'text-white shadow-sm scale-[1.02]'
                  : 'border bg-gray-50 text-gray-600'
              }`}
              style={{
                background: targetType === 'account' ? colors.primary : 'transparent',
                borderColor: targetType === 'account' ? colors.primary : colors.border,
              }}
            >
              <div className="flex items-center justify-center gap-1.5">
                <UserCircle size={16} />
                <span>👤 Personnel</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTargetType('patient')}
              disabled={patients.length === 0}
              className={`p-3 rounded-xl text-xs font-bold transition text-center ${
                targetType === 'patient'
                  ? 'text-white shadow-sm scale-[1.02]'
                  : patients.length > 0
                    ? 'border bg-gray-50 text-gray-600 hover:bg-gray-100'
                    : 'opacity-50 cursor-not-allowed border bg-gray-100 text-gray-400'
              }`}
              style={{
                background: targetType === 'patient' ? colors.primary : 'transparent',
                borderColor: targetType === 'patient' ? colors.primary : colors.border,
              }}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Users size={16} />
                <span>{isFamily ? 'Proche' : isAidant ? 'Personne accompagnée' : 'Bénéficiaire'}</span>
              </div>
            </button>
          </div>
          {patients.length === 0 && (
            <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              Aucun proche enregistré. Vous pouvez créer une visite personnelle.
            </p>
          )}
        </div>

        {/* Sélection du patient */}
        {targetType === 'patient' && patients.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
              {isFamily ? 'Proche' : isAidant ? 'Personne accompagnée' : 'Bénéficiaire'} *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
              <select
                value={formData.patient_id}
                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                className="w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition focus:ring-2"
                style={{
                  borderColor: colors.border || '#e5e0d8',
                  background: 'var(--color-background, #f5f0e8)',
                  color: colors.text,
                }}
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

        {/* Résumé pour les familles */}
        {targetType === 'account' && (
          <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: colors.primary + '05' }}>
            <UserCircle size={20} style={{ color: colors.primary }} />
            <div>
              <p className="text-sm font-medium" style={{ color: colors.text }}>
                {profile?.full_name || 'Personnel'}
              </p>
              <p className="text-[10px]" style={{ color: colors.text + '50' }}>
                Visite personnelle - sans proche
              </p>
            </div>
          </div>
        )}
      </>
    );
  };

  const hasPatients = patients.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-4">
      {/* 🔹 ADMIN : Sélection du compte */}
      {isAdmin && renderAccountSelector()}

      {/* 🔹 ADMIN : Choix du destinataire (compte ou patient) */}
      {isAdmin && renderTargetTypeSelector()}

      {/* 🔹 FAMILLE : Contenu standard */}
      {!isAdmin && renderFamilyContent()}

      {/* 🔹 Résumé du destinataire (pour admin) */}
      {isAdmin && renderTargetSummary()}

      {/* 🔹 Sélection du patient (si targetType === 'patient') */}
      {renderPatientSelector()}

      {/* 🔹 Date et Heure */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Date *</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
            <input
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              className="w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition focus:ring-2"
              style={{
                borderColor: colors.border || '#e5e0d8',
                background: 'var(--color-background, #f5f0e8)',
                color: colors.text,
              }}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Heure *</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
            <input
              type="time"
              value={formData.scheduled_time}
              onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              className="w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition focus:ring-2"
              style={{
                borderColor: colors.border || '#e5e0d8',
                background: 'var(--color-background, #f5f0e8)',
                color: colors.text,
              }}
              required
            />
          </div>
        </div>
      </div>

      {/* 🔹 Durée */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Durée (minutes)</label>
        <select
          value={formData.duration_minutes}
          onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
          className="w-full px-4 py-3 rounded-xl border outline-none transition focus:ring-2"
          style={{
            borderColor: colors.border || '#e5e0d8',
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
      </div>

      {/* 🔹 Notes */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border outline-none transition focus:ring-2 resize-none"
          style={{
            borderColor: colors.border || '#e5e0d8',
            background: 'var(--color-background, #f5f0e8)',
            color: colors.text,
          }}
          rows={3}
          placeholder="Informations complémentaires..."
        />
      </div>

      {/* 🔹 Urgent */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={formData.is_urgent}
          onChange={(e) => setFormData({ ...formData, is_urgent: e.target.checked })}
          className="w-4 h-4 rounded"
          style={{ accentColor: colors.primary }}
        />
        <label className="text-sm font-medium" style={{ color: colors.text }}>
          ⚠️ Visite urgente
        </label>
      </div>

      {/* 🔹 Disclaimer */}
      {renderDisclaimer()}

      {/* 🔹 Boutons */}
      <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl font-medium border transition hover:bg-gray-50"
          style={{ borderColor: colors.border || '#e5e0d8', color: colors.text }}
        >
          Annuler
        </button>
        <button
          type="submit"
          className="flex-1 py-3 rounded-xl text-white font-medium transition hover:opacity-80 flex items-center justify-center disabled:opacity-50"
          style={{ background: colors.primary }}
          disabled={isLoading || (targetType === 'patient' && !formData.patient_id)}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            mode === 'create' ? 'Planifier' : 'Mettre à jour'
          )}
        </button>
      </div>
    </form>
  );
};

export default VisitModalContent;
