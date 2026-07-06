// 📁 frontend/src/features/admin/pages/AdminVisitValidationPage.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Search,
  Image,
  Mic,
  Volume2,
  AlertCircle,
  Filter,
  Loader2,
  UserPlus,
  Users,
  Shield,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useVisitStore } from '@/stores/visitStore';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime } from '@/utils/helpers';
import { AssignAidantModal } from '@/features/aidants/components/AssignAidantModal';
import { VisitWizardModal } from '@/features/visits/components/VisitWizardModal';
import toast from 'react-hot-toast';

// ✅ URL UNIQUE
const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

interface VisitToValidate {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  actions: string[];
  notes: string | null;
  report: string | null;
  start_time: string | null;
  end_time: string | null;
  metadata: {
    audio_url?: string | null;
    photos?: string[];
    signature_url?: string | null;
    duration_minutes?: number | null;
    completed_by?: string | null;
    completed_at?: string | null;
    end_location?: { lat: number; lng: number } | null;
    validation_comment?: string | null;
    validated_by?: string | null;
    validated_at?: string | null;
    rejected_by?: string | null;
    rejected_at?: string | null;
    rejection_reason?: string | null;
    cancelled_by?: string | null;
    cancelled_at?: string | null;
    cancellation_reason?: string | null;
    expired_at?: string | null;
    waiting_for_aidant?: boolean;
    waiting_for_aidant_since?: string | null;
  };
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    address: string;
    phone: string | null;
    category: string;
  } | null;
  aidant: {
    id: string;
    user: {
      id: string;
      full_name: string;
      email: string;
      phone: string;
    } | null;
    rating: number;
    total_missions: number;
  } | null;
  photos?: { photo_url: string; caption: string; created_at: string }[];
  audios?: { audio_url: string; created_at: string }[];
  user_id: string;
  target_name: string | null;
  created_at: string;
  family?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  } | null;
}

// ✅ STATUTS AVEC ICÔNES
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  terminee: {
    label: '⏳ En attente',
    color: '#f59e0b',
    bg: '#f59e0b15',
    icon: <Clock size={14} />,
  },
  validee: {
    label: '✅ Validée',
    color: '#10b981',
    bg: '#10b98115',
    icon: <CheckCircle size={14} />,
  },
  replanifiee: {
    label: '🔄 À refaire',
    color: '#3b82f6',
    bg: '#3b82f615',
    icon: <Calendar size={14} />,
  },
  expire: {
    label: '⏰ Expirée',
    color: '#ef4444',
    bg: '#ef444415',
    icon: <AlertCircle size={14} />,
  },
  refusee: {
    label: '❌ Refusée',
    color: '#ef4444',
    bg: '#ef444415',
    icon: <XCircle size={14} />,
  },
  attente_paiement: {
    label: '💳 En attente paiement',
    color: '#8b5cf6',
    bg: '#8b5cf615',
    icon: <CreditCard size={14} />,
  },
  // ✅ NOUVEAU STATUT
  en_attente_aidant: {
    label: '🦸 En attente d\'aidant',
    color: '#FF5722',
    bg: '#FF572215',
    icon: <UserPlus size={14} />,
  },
};

const AdminVisitValidationPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const { getCategoryLabel, isAdminOrCoordinator } = useTerminology();
  const { fetchVisits } = useVisitStore();

  const [visits, setVisits] = useState<VisitToValidate[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<VisitToValidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'terminee' | 'validee' | 'replanifiee' | 'expire' | 'refusee' | 'en_attente_aidant'>('all');
  const [selectedVisit, setSelectedVisit] = useState<VisitToValidate | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [validationComment, setValidationComment] = useState('');

  // ✅ États pour l'assignation d'aidant
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [selectedVisitForAssign, setSelectedVisitForAssign] = useState<VisitToValidate | null>(null);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchVisitsToValidate();
  }, []);

  useEffect(() => {
    filterVisits();
  }, [visits, searchTerm, filterStatus]);

  const fetchVisitsToValidate = async () => {
    try {
      setIsLoading(true);
      
      // ✅ Récupérer TOUTES les visites qui ont besoin d'attention
      const { data: visitsData, error: visitsError } = await supabase
        .from('visites')
        .select('*')
        .in('status', ['terminee', 'validee', 'replanifiee', 'expire', 'refusee', 'attente_paiement', 'en_attente_aidant'])
        .order('created_at', { ascending: false });

      if (visitsError) throw visitsError;
      if (!visitsData || visitsData.length === 0) {
        setVisits([]);
        setFilteredVisits([]);
        setIsLoading(false);
        return;
      }

      const patientIds = [...new Set(visitsData.map(v => v.patient_id).filter(Boolean))];
      let patientMap: Record<string, any> = {};

      if (patientIds.length > 0) {
        const { data: patients } = await supabase.from('patients').select('*').in('id', patientIds);
        if (patients) patientMap = patients.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      }

      const aidantIds = [...new Set(visitsData.map(v => v.aidant_id).filter(Boolean))];
      let aidantMap: Record<string, any> = {};

      if (aidantIds.length > 0) {
        const { data: aidants } = await supabase.from('aidants').select('*').in('id', aidantIds);
        if (aidants) {
          const userIds = aidants.map(a => a.user_id).filter(Boolean);
          let profileMap: Record<string, any> = {};
          if (userIds.length > 0) {
            const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
            if (profiles) profileMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
          }
          aidantMap = aidants.reduce((acc, a) => ({ ...acc, [a.id]: { ...a, user: a.user_id ? profileMap[a.user_id] || null : null } }), {});
        }
      }

      const familyIds = [...new Set(visitsData.map(v => v.user_id).filter(Boolean))];
      let familyMap: Record<string, any> = {};
      if (familyIds.length > 0) {
        const { data: families } = await supabase.from('profiles').select('id, full_name, email, phone').in('id', familyIds);
        if (families) familyMap = families.reduce((acc, f) => ({ ...acc, [f.id]: f }), {});
      }

      const visitIds = visitsData.map(v => v.id);
      let photosMap: Record<string, any[]> = {};
      if (visitIds.length > 0) {
        const { data: photos } = await supabase.from('visite_photos').select('*').in('visite_id', visitIds);
        if (photos) photosMap = photos.reduce((acc, p) => ({ ...acc, [p.visite_id]: [...(acc[p.visite_id] || []), p] }), {});
      }

      let audiosMap: Record<string, any[]> = {};
      if (visitIds.length > 0) {
        const { data: audios } = await supabase.from('visite_audios').select('*').in('visite_id', visitIds);
        if (audios) audiosMap = audios.reduce((acc, a) => ({ ...acc, [a.visite_id]: [...(acc[a.visite_id] || []), a] }), {});
      }

      const visitsWithRelations = visitsData.map((visit) => {
        const patient = visit.patient_id ? patientMap[visit.patient_id] || null : null;
        const aidant = visit.aidant_id ? aidantMap[visit.aidant_id] || null : null;
        const family = visit.user_id ? familyMap[visit.user_id] || null : null;
        const photos = photosMap[visit.id] || [];
        const audios = audiosMap[visit.id] || [];
        return { 
          ...visit, 
          patient, 
          aidant, 
          family,
          photos, 
          audios, 
          metadata: { 
            ...visit.metadata, 
            audio_url: visit.metadata?.audio_url || null,
            waiting_for_aidant: visit.status === 'en_attente_aidant',
            waiting_for_aidant_since: visit.metadata?.waiting_for_aidant_since || null,
          } 
        };
      });

      setVisits(visitsWithRelations);
    } catch (error: any) {
      console.error('Fetch visits error:', error);
      toast.error('Erreur lors du chargement des visites');
    } finally {
      setIsLoading(false);
    }
  };

  const filterVisits = () => {
    let filtered = [...visits];
    if (filterStatus !== 'all') filtered = filtered.filter(v => v.status === filterStatus);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.patient?.first_name?.toLowerCase().includes(term) ||
        v.patient?.last_name?.toLowerCase().includes(term) ||
        v.aidant?.user?.full_name?.toLowerCase().includes(term) ||
        v.target_name?.toLowerCase().includes(term) ||
        v.family?.full_name?.toLowerCase().includes(term)
      );
    }
    setFilteredVisits(filtered);
  };

  // ✅ HANDLER: Assigner un aidant à une visite en attente
  const handleAssignAidant = (visit: VisitToValidate) => {
    setSelectedVisitForAssign(visit);
    setShowAssignModal(true);
  };

  // ✅ HANDLER: Ouvrir le wizard pour une visite en attente
  const handleOpenWizard = (visit: VisitToValidate) => {
    setSelectedVisitForAssign(visit);
    setShowWizardModal(true);
  };

  // ✅ SUCCÈS DE L'ASSIGNATION
  const handleAssignSuccess = async () => {
    setShowAssignModal(false);
    setShowWizardModal(false);
    setSelectedVisitForAssign(null);
    await fetchVisitsToValidate();
    await fetchVisits();
    toast.success('Aidant assigné avec succès');
  };

  // ✅ VALIDER UNE VISITE
  const handleValidate = async (visitId: string) => {
    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/visits/${visitId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({ comment: validationComment }),
      });
      if (!response.ok) throw new Error('Erreur de validation');
      
      toast.success('Visite validée - Décompte effectué');
      setShowDetailModal(false);
      await fetchVisitsToValidate();
      await fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur de validation');
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ REFUSER UNE VISITE
  const handleReject = async (visitId: string) => {
    if (!window.confirm('Refuser cette visite ?')) return;
    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/visits/${visitId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({ reason: validationComment || 'Rapport non conforme' }),
      });
      if (!response.ok) throw new Error('Erreur de refus');
      
      toast.success('Visite refusée');
      setShowDetailModal(false);
      await fetchVisitsToValidate();
      await fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur de refus');
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ RÉASSIGNER UNE VISITE (admin)
  const handleReassign = async (visitId: string) => {
    const newAidantId = prompt('ID du nouvel aidant :');
    if (!newAidantId) return;

    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/visits/${visitId}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({ 
          aidant_id: newAidantId, 
          assignment_type: 'ponctuelle' 
        }),
      });
      if (!response.ok) throw new Error('Erreur de réassignation');
      
      toast.success('Visite réassignée');
      setShowDetailModal(false);
      await fetchVisitsToValidate();
      await fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur de réassignation');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const config = STATUS_CONFIG[status];
    return config?.label || status;
  };

  const getStatusColor = (status: string) => {
    const config = STATUS_CONFIG[status];
    return config?.color || '#94a3b8';
  };

  const getStatusIcon = (status: string) => {
    const config = STATUS_CONFIG[status];
    return config?.icon || <AlertCircle size={14} />;
  };

  // ✅ Statistiques
  const stats = {
    total: visits.length,
    pending: visits.filter(v => v.status === 'terminee').length,
    validated: visits.filter(v => v.status === 'validee').length,
    expired: visits.filter(v => v.status === 'expire').length,
    refused: visits.filter(v => v.status === 'refusee').length,
    pendingPayment: visits.filter(v => v.status === 'attente_paiement').length,
    // ✅ NOUVEAU: Visites en attente d'aidant
    waitingAidant: visits.filter(v => v.status === 'en_attente_aidant').length,
  };

  // ✅ FILTRES AVEC ONGLET "EN ATTENTE D'AIDANT"
  const filterOptions = [
    { value: 'all', label: '📋 Toutes', count: stats.total },
    { value: 'terminee', label: '⏳ En attente', count: stats.pending },
    { value: 'validee', label: '✅ Validées', count: stats.validated },
    { value: 'expire', label: '⏰ Expirées', count: stats.expired },
    { value: 'refusee', label: '❌ Refusées', count: stats.refused },
    { value: 'en_attente_aidant', label: '🦸 En attente aidant', count: stats.waitingAidant },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin" size={32} style={{ color: colors.primary }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <section 
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all"
        style={{ background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.primary}12 100%)` }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: colors.text }}>
              📋 Rapports et validations
            </h1>
            <p className="text-xs" style={{ color: colors.textLight }}>
              {stats.pending} en attente • {stats.expired} expirées • {stats.refused} refusées
              {stats.waitingAidant > 0 && (
                <span className="ml-2 text-orange-500 font-bold">
                  • 🦸 {stats.waitingAidant} en attente d'aidant
                </span>
              )}
            </p>
          </div>
          <button
            onClick={fetchVisitsToValidate}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border bg-white hover:bg-gray-50 shrink-0 self-start sm:self-center"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>

        {/* ✅ BANDEAU D'ALERTE - VISITES EN ATTENTE D'AIDANT */}
        {stats.waitingAidant > 0 && (
          <div className="relative z-10 mt-4 flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
              <UserPlus size={14} />
              {stats.waitingAidant} visite{stats.waitingAidant > 1 ? 's' : ''} en attente d'aidant
              <button
                onClick={() => setFilterStatus('en_attente_aidant')}
                className="ml-2 text-orange-600 hover:underline font-bold"
              >
                Voir
              </button>
            </div>
          </div>
        )}

        {/* ✅ BANDEAU D'ALERTE - EXPIRÉES/REFUSÉES */}
        {(stats.expired > 0 || stats.refused > 0) && (
          <div className="relative z-10 mt-2 flex flex-wrap gap-2">
            {stats.expired > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                <AlertCircle size={14} />
                {stats.expired} visite(s) expirée(s) - Réassignation nécessaire
              </div>
            )}
            {stats.refused > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                <XCircle size={14} />
                {stats.refused} visite(s) refusée(s) - Réassignation nécessaire
              </div>
            )}
          </div>
        )}
      </section>

      {/* Stats compactes */}
      <section className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        <CompactStat label="Total" value={stats.total} color={colors.primary} />
        <CompactStat label="En attente" value={stats.pending} color="#f59e0b" />
        <CompactStat label="Validées" value={stats.validated} color="#10b981" />
        <CompactStat label="Expirées" value={stats.expired} color="#ef4444" />
        <CompactStat label="Refusées" value={stats.refused} color="#ef4444" />
        {/* ✅ NOUVEAU STAT */}
        <CompactStat 
          label="🦸 En attente aidant" 
          value={stats.waitingAidant} 
          color="#FF5722"
          className={stats.waitingAidant > 0 ? 'animate-pulse' : ''}
        />
      </section>

      {/* Barre de recherche avec filtre */}
      <section className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col sm:flex-row gap-3">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par patient ou aidant..."
          className="flex-1 px-3.5 py-2 rounded-xl border outline-none text-xs"
          style={{ borderColor: colors.border, background: 'var(--color-background)' }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3.5 py-2 rounded-xl border outline-none text-xs"
          style={{ borderColor: colors.border, background: 'var(--color-background)', color: colors.text }}
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} ({opt.count})
            </option>
          ))}
        </select>
      </section>

      {/* Liste */}
      <section className="space-y-3">
        {filteredVisits.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-gray-400">
            {searchTerm || filterStatus !== 'all' 
              ? 'Aucune visite ne correspond aux critères' 
              : 'Aucune visite en attente de traitement'}
          </div>
        ) : (
          filteredVisits.map((visit) => {
            const isWaitingAidant = visit.status === 'en_attente_aidant';
            const isExpired = visit.status === 'expire';
            const isRefused = visit.status === 'refusee';
            const isTerminee = visit.status === 'terminee';

            return (
              <div
                key={visit.id}
                onClick={() => { setSelectedVisit(visit); setShowDetailModal(true); }}
                className={`bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${
                  isWaitingAidant ? 'border-orange-300 border-2' : ''
                }`}
                style={{ 
                  borderColor: isWaitingAidant ? '#FF5722' : getStatusColor(visit.status),
                  borderLeftWidth: '4px',
                  borderLeftColor: isWaitingAidant ? '#FF5722' : getStatusColor(visit.status),
                }}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-xs" style={{ color: colors.text }}>
                      {visit.patient?.first_name} {visit.patient?.last_name}
                    </p>
                    <span className="text-[10px] font-semibold" style={{ color: getStatusColor(visit.status) }}>
                      {getStatusLabel(visit.status)}
                    </span>
                    {isWaitingAidant && (
                      <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <UserPlus size={10} />
                        En attente
                      </span>
                    )}
                    {isExpired && (
                      <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <AlertCircle size={10} />
                        ⚠️ Expirée
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
                    <span>📅 {formatDate(visit.scheduled_date)}</span>
                    <span>📍 {visit.patient?.address}</span>
                    <span>🦸 {visit.aidant?.user?.full_name || 'Non assigné'}</span>
                    {visit.metadata?.duration_minutes && (
                      <span>⏱️ {visit.metadata.duration_minutes} min</span>
                    )}
                    {isWaitingAidant && visit.metadata?.waiting_for_aidant_since && (
                      <span className="text-orange-500">
                        ⏳ En attente depuis {formatDate(visit.metadata.waiting_for_aidant_since)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* ✅ BOUTON ASSIGNER POUR LES VISITES EN ATTENTE D'AIDANT */}
                  {isWaitingAidant && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAssignAidant(visit); }}
                        className="px-3 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1"
                        style={{ background: '#FF5722' }}
                      >
                        <UserPlus size={12} />
                        Assigner
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenWizard(visit); }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border hover:bg-gray-50 flex items-center gap-1"
                        style={{ borderColor: colors.border, color: colors.text }}
                      >
                        <Users size={12} />
                        Wizard
                      </button>
                    </>
                  )}

                  {/* ✅ BOUTON RÉASSIGNER POUR EXPIRÉES/REFUSÉES */}
                  {(isExpired || isRefused) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReassign(visit.id); }}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1"
                      style={{ background: '#FF5722' }}
                    >
                      <Shield size={12} />
                      Réassigner
                    </button>
                  )}

                  {/* ✅ BOUTON VALIDER POUR TERMINÉES */}
                  {isTerminee && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedVisit(visit); setShowDetailModal(true); }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold border hover:bg-gray-50 flex items-center gap-1"
                      style={{ borderColor: colors.border, color: colors.text }}
                    >
                      <CheckCircle size={12} />
                      Valider
                    </button>
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedVisit(visit); setShowDetailModal(true); }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border hover:bg-gray-50 flex items-center gap-1"
                    style={{ borderColor: colors.border, color: colors.text }}
                  >
                    <Eye size={12} />
                    Détails
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* ============================================================
      MODAL DÉTAILS ET VALIDATION
      ============================================================ */}
      {showDetailModal && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: colors.border }}>
              <h2 className="font-bold text-sm uppercase tracking-wider text-gray-400">
                📋 {getStatusLabel(selectedVisit.status)}
              </h2>
              <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-gray-50 rounded-lg">
                <XCircle size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Infos */}
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-sm">{selectedVisit.patient?.first_name} {selectedVisit.patient?.last_name}</p>
                <p className="text-gray-500">Aidant : {selectedVisit.aidant?.user?.full_name || 'Non assigné'}</p>
                <p className="text-gray-500">Date : {formatDate(selectedVisit.scheduled_date)} à {selectedVisit.scheduled_time}</p>
                {selectedVisit.notes && (
                  <p className="text-gray-600 bg-gray-50 p-2.5 rounded-xl italic">"{selectedVisit.notes}"</p>
                )}
              </div>

              {/* Photos */}
              {selectedVisit.photos && selectedVisit.photos.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    📸 Preuves ({selectedVisit.photos.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedVisit.photos.map((p, i) => (
                      <img key={i} src={p.photo_url} alt="Visite" className="aspect-square object-cover rounded-xl border" />
                    ))}
                  </div>
                </div>
              )}

              {/* Audio */}
              {selectedVisit.metadata?.audio_url && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">🎙️ Rapport vocal</p>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                    <Volume2 size={16} style={{ color: colors.primary }} />
                    <audio controls className="flex-1 scale-90 origin-left">
                      <source src={selectedVisit.metadata.audio_url} />
                    </audio>
                  </div>
                </div>
              )}

              {/* ✅ SI VISITE EN ATTENTE D'AIDANT */}
              {selectedVisit.status === 'en_attente_aidant' && (
                <div className="space-y-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                  <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
                    <p className="text-sm text-orange-700 flex items-center gap-2">
                      <UserPlus size={18} />
                      Cette visite est en attente d'assignation d'un aidant.
                    </p>
                    {selectedVisit.metadata?.waiting_for_aidant_since && (
                      <p className="text-xs text-orange-600 mt-1">
                        En attente depuis {formatDate(selectedVisit.metadata.waiting_for_aidant_since)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        handleAssignAidant(selectedVisit);
                      }}
                      className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2"
                      style={{ background: '#FF5722' }}
                    >
                      <UserPlus size={16} />
                      Assigner un aidant
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        handleOpenWizard(selectedVisit);
                      }}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold border hover:bg-gray-50 flex items-center justify-center gap-2"
                      style={{ borderColor: colors.border, color: colors.text }}
                    >
                      <Users size={16} />
                      Wizard
                    </button>
                  </div>
                </div>
              )}

              {/* Décision - selon le statut */}
              {selectedVisit.status === 'terminee' && (
                <div className="space-y-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                  <textarea
                    value={validationComment}
                    onChange={(e) => setValidationComment(e.target.value)}
                    placeholder="Note ou motif de refus..."
                    className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs resize-none"
                    style={{ borderColor: colors.border, background: 'var(--color-background)' }}
                    rows={2}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleReject(selectedVisit.id)}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100"
                    >
                      Refuser le rapport
                    </button>
                    <button
                      onClick={() => handleValidate(selectedVisit.id)}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 flex items-center gap-1"
                      style={{ background: colors.primary }}
                    >
                      {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={14} />}
                      Valider
                    </button>
                  </div>
                </div>
              )}

              {/* Expirée / Refusée */}
              {(selectedVisit.status === 'expire' || selectedVisit.status === 'refusee') && (
                <div className="space-y-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-sm text-red-700 flex items-center gap-2">
                      {selectedVisit.status === 'expire' 
                        ? <AlertCircle size={18} />
                        : <XCircle size={18} />}
                      {selectedVisit.status === 'expire' 
                        ? '⚠️ Cette visite a expiré car l\'aidant n\'a pas répondu dans les 24-48h.'
                        : '❌ Cette visite a été refusée par l\'aidant.'}
                    </p>
                    {selectedVisit.metadata?.rejection_reason && (
                      <p className="text-sm text-red-600 mt-1">
                        Motif : {selectedVisit.metadata.rejection_reason}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleReassign(selectedVisit.id)}
                    disabled={isProcessing}
                    className="w-full py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2"
                    style={{ background: '#FF5722' }}
                  >
                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                    Réassigner
                  </button>
                </div>
              )}

              {/* Déjà validée */}
              {selectedVisit.status === 'validee' && (
                <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle size={18} />
                    Cette visite a déjà été validée.
                  </p>
                  {selectedVisit.metadata?.validated_at && (
                    <p className="text-xs text-green-600 mt-1">
                      Validée le {formatDate(selectedVisit.metadata.validated_at)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
      MODAL D'ASSIGNATION D'AIDANT
      ============================================================ */}
      {showAssignModal && selectedVisitForAssign && (
        <AssignAidantModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedVisitForAssign(null);
          }}
          targetType="visit"
          targetId={selectedVisitForAssign.id}
          targetName={selectedVisitForAssign.target_name || 
            `${selectedVisitForAssign.patient?.first_name || ''} ${selectedVisitForAssign.patient?.last_name || ''}`.trim() || 'Visite'}
          onSuccess={handleAssignSuccess}
          currentAidantId={selectedVisitForAssign.aidant_id}
          isAdmin={true}
          allowForce={true}
        />
      )}

      {/* ============================================================
      MODAL WIZARD
      ============================================================ */}
      {showWizardModal && selectedVisitForAssign && (
        <VisitWizardModal
          isOpen={showWizardModal}
          onClose={() => {
            setShowWizardModal(false);
            setSelectedVisitForAssign(null);
          }}
          onSuccess={async (data) => {
            // ✅ Assigner l'aidant via l'API admin
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const token = sessionData?.session?.access_token;

              if (!token) {
                toast.error('Session expirée');
                return;
              }

              const response = await fetch(`${API_URL}/visits/admin/assign-aidant`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  visitId: selectedVisitForAssign.id,
                  aidantId: data.aidantId,
                  assignmentType: data.assignmentType || 'permanente',
                  force: data.wizardChoice === 'force' || false,
                }),
              });

              const result = await response.json();

              if (!response.ok) {
                throw new Error(result.error || 'Erreur lors de l\'assignation');
              }

              toast.success(result.message || 'Aidant assigné avec succès');
              await handleAssignSuccess();
            } catch (error: any) {
              console.error('❌ Erreur assignation:', error);
              toast.error(error.message || 'Erreur lors de l\'assignation');
            }
          }}
          targetType={selectedVisitForAssign.patient_id ? 'patient' : 'personal_account'}
          targetId={selectedVisitForAssign.patient_id || selectedVisitForAssign.user_id}
          targetName={selectedVisitForAssign.target_name || 
            `${selectedVisitForAssign.patient?.first_name || ''} ${selectedVisitForAssign.patient?.last_name || ''}`.trim() || 'Visite'}
          familyId={selectedVisitForAssign.user_id}
          scheduledDate={selectedVisitForAssign.scheduled_date}
          scheduledTime={selectedVisitForAssign.scheduled_time}
          colors={colors}
        />
      )}
    </div>
  );
};

// =============================================
// COMPACT STAT
// =============================================

interface CompactStatProps {
  label: string;
  value: number;
  color: string;
  className?: string;
}

const CompactStat = ({ label, value, color, className = '' }: CompactStatProps) => (
  <div className={`bg-white rounded-xl p-2.5 shadow-sm border border-black/5 ${className}`}>
    <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
    <p className="text-base font-bold mt-0.5" style={{ color }}>{value}</p>
  </div>
);

export default AdminVisitValidationPage;
