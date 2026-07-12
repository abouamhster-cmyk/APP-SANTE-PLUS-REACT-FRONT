// 📁 frontend/src/features/admin/pages/AdminVisitValidationPage.tsx
// ✅ PAGE VALIDATION VISITES : ALIGNEMENT DES CONTROLES H-11 ET BOUTONS ACTIONS FLEXIBLES MOBILE

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Search,
  Volume2,
  AlertCircle,
  Loader2,
  UserPlus,
  Users,
  Shield,
  CreditCard,
  Phone,
  Star,
  Play,
  Check,
  X,
  Clock as ClockIcon,
  Briefcase,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useVisitStore } from '@/stores/visitStore';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime } from '@/utils/helpers';
import { AssignAidantModal } from '@/features/aidants/components/AssignAidantModal';
import { VisitWizardModal } from '@/features/visits/components/VisitWizardModal';
import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import toast from 'react-hot-toast';

// ✅ URL UNIQUE
const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

// ============================================================
// TYPES
// ============================================================

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
  aidant_id: string | null;
  patient_id: string | null;
  user_id: string;
  target_name: string | null;
  target_type: string;
  created_at: string;
  duration_minutes: number;
  is_urgent: boolean;
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
    selected_aidant?: string | null;
    wizard_choice?: string | null;
    auto_assigned_aidant?: boolean;
    payment_amount?: number | null;
    requires_payment?: boolean;
    is_ponctual?: boolean;
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
      avatar_url: string | null;
    } | null;
    rating: number;
    total_missions: number;
    specialties: string[];
  } | null;
  photos?: { photo_url: string; caption: string; created_at: string }[];
  audios?: { audio_url: string; created_at: string }[];
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
  en_attente_aidant: {
    label: '🦸 En attente d\'aidant',
    color: '#FF5722',
    bg: '#FF572215',
    icon: <UserPlus size={14} />,
  },
};

// ============================================================
// COMPOSANT DE DÉTAIL DE VISITE (MODAL)
// ============================================================

interface VisitDetailModalProps {
  visit: VisitToValidate | null;
  isOpen: boolean;
  onClose: () => void;
  onValidate: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onReassign: (id: string) => Promise<void>;
  colors: any;
  isProcessing: boolean;
}

const VisitDetailModal = ({
  visit,
  isOpen,
  onClose,
  onValidate,
  onReject,
  onReassign,
  colors,
  isProcessing,
}: VisitDetailModalProps) => {
  const [validationComment, setValidationComment] = useState('');

  if (!visit) return null;

  const statusConfig = STATUS_CONFIG[visit.status] || STATUS_CONFIG['terminee'];
  const isTerminee = visit.status === 'terminee';
  const isExpired = visit.status === 'expire';
  const isRefused = visit.status === 'refusee';
  const isWaitingAidant = visit.status === 'en_attente_aidant';

  const getAidantDisplayName = () => {
    if (visit.aidant?.user?.full_name) {
      return visit.aidant.user.full_name;
    }
    if (visit.aidant && 'full_name' in visit.aidant) {
      return (visit.aidant as any).full_name;
    }
    if (visit.metadata?.selected_aidant) {
      return `Aidant sélectionné (${visit.metadata.selected_aidant.substring(0, 8)}...)`;
    }
    return 'Non assigné';
  };

  const getAidantStatus = () => {
    if (visit.aidant) return '✅ Assigné';
    if (visit.metadata?.selected_aidant) return '⏳ En attente d\'assignation (wizard)';
    if (isWaitingAidant) return '🦸 En attente d\'aidant';
    return '❌ Non assigné';
  };

  const getAidantColor = () => {
    if (visit.aidant) return '#10b981';
    if (visit.metadata?.selected_aidant) return '#f59e0b';
    if (isWaitingAidant) return '#FF5722';
    return '#ef4444';
  };

  const hasPhotos = visit.photos && visit.photos.length > 0;
  const hasAudio = visit.metadata?.audio_url;

  return (
    <ModalFullScreen
      isOpen={isOpen}
      onClose={onClose}
      onBack={onClose}
      title={`📋 Détails de la visite - ${visit.target_name || 'Patient'}`}
    >
      <div className="space-y-6 pb-4 max-w-3xl mx-auto">
        
        {/* EN-TÊTE AVEC STATUT */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold" style={{ color: colors.text }}>
              {visit.patient ? `${visit.patient.first_name} ${visit.patient.last_name}` : visit.target_name || 'Patient'}
            </h3>
            <p className="text-sm" style={{ color: colors.text + '70' }}>
              {visit.patient?.address || 'Adresse non renseignée'}
            </p>
          </div>
          <span
            className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
            style={{
              background: statusConfig.bg,
              color: statusConfig.color,
            }}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </span>
        </div>

        {/* GRILLE D'INFORMATIONS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoItem
            icon={<Calendar size={16} />}
            label="Date"
            value={formatDate(visit.scheduled_date)}
            color={colors.primary}
          />
          <InfoItem
            icon={<Clock size={16} />}
            label="Heure"
            value={visit.scheduled_time}
            color={colors.primary}
          />
          <InfoItem
            icon={<ClockIcon size={16} />}
            label="Durée"
            value={`${visit.duration_minutes || 60} min`}
            color={colors.primary}
          />
          <InfoItem
            icon={visit.is_urgent ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            label="Urgence"
            value={visit.is_urgent ? '⚠️ Urgent' : 'Normal'}
            color={visit.is_urgent ? '#ef4444' : '#10b981'}
          />
        </div>

        {/* AIDANT */}
        <div className="p-4 rounded-2xl border" style={{ borderColor: colors.border }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: getAidantColor() }}
            >
              {getAidantDisplayName().charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: colors.text }}>
                {getAidantDisplayName()}
              </p>
              <div className="flex items-center gap-2 text-xs" style={{ color: colors.text + '60' }}>
                <span>{getAidantStatus()}</span>
                {visit.aidant && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Star size={10} className="text-yellow-400 fill-yellow-400" />
                      {visit.aidant.rating || 0}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Briefcase size={10} />
                      {visit.aidant.total_missions || 0} missions
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* HORAIRES DE LA VISITE */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border" style={{ borderColor: colors.border }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.text + '40' }}>
              Début
            </p>
            <p className="font-bold text-sm" style={{ color: visit.start_time ? '#10b981' : colors.text + '50' }}>
              {visit.start_time ? formatTime(visit.start_time) : 'Non démarrée'}
            </p>
          </div>
          <div className="p-3 rounded-xl border" style={{ borderColor: colors.border }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.text + '40' }}>
              Fin
            </p>
            <p className="font-bold text-sm" style={{ color: visit.end_time ? '#ef4444' : colors.text + '50' }}>
              {visit.end_time ? formatTime(visit.end_time) : 'Non terminée'}
            </p>
          </div>
        </div>

        {/* ACTIONS RÉALISÉES */}
        {visit.actions && visit.actions.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.text + '40' }}>
              📋 Actions réalisées ({visit.actions.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {visit.actions.map((action, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: colors.primary + '12', color: colors.primary }}
                >
                  {action}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* NOTES / RAPPORT */}
        {(visit.notes || visit.report) && (
          <div className="p-4 rounded-2xl border" style={{ borderColor: colors.border, background: colors.primary + '04' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: colors.text + '40' }}>
              📝 Rapport
            </p>
            <p className="text-sm leading-relaxed" style={{ color: colors.text }}>
              {visit.report || visit.notes}
            </p>
          </div>
        )}

        {/* PHOTOS */}
        {hasPhotos && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.text + '40' }}>
              📸 Photos ({visit.photos!.length})
            </p>
            <div className="grid grid-cols-3 gap-2">
              {visit.photos!.slice(0, 6).map((photo, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-xl overflow-hidden border cursor-pointer hover:opacity-90 transition"
                  style={{ borderColor: colors.border }}
                  onClick={() => window.open(photo.photo_url, '_blank')}
                >
                  <img
                    src={photo.photo_url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-image.png';
                    }}
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60 text-center">
                      <p className="text-white text-[9px] truncate">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AUDIO */}
        {hasAudio && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.text + '40' }}>
              🎙️ Enregistrement audio
            </p>
            <div className="p-3 rounded-xl border flex items-center gap-3" style={{ borderColor: colors.border }}>
              <Volume2 size={20} style={{ color: colors.primary }} />
              <audio controls className="flex-1">
                <source src={visit.metadata.audio_url!} />
                Votre navigateur ne supporte pas la lecture audio.
              </audio>
            </div>
          </div>
        )}

        {/* ACTIONS SELON LE STATUT */}
        <div className="flex flex-wrap gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
          {isTerminee && (
            <>
              <div className="w-full">
                <textarea
                  value={validationComment}
                  onChange={(e) => setValidationComment(e.target.value)}
                  placeholder="Note ou motif de refus (optionnel)..."
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs resize-none"
                  style={{ borderColor: colors.border, background: 'var(--color-background)' }}
                  rows={2}
                />
              </div>
              <button
                onClick={() => onReject(visit.id)}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-red-50 text-red-500 hover:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <X size={16} />
                Refuser
              </button>
              <button
                onClick={() => onValidate(visit.id)}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: colors.primary }}
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Valider
              </button>
            </>
          )}

          {isWaitingAidant && (
            <div className="w-full space-y-3">
              <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-3">
                <UserPlus size={18} className="text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-orange-700">Cette visite est en attente d'aidant</p>
                  {visit.metadata?.waiting_for_aidant_since && (
                    <p className="text-xs text-orange-600">
                      En attente depuis {formatDate(visit.metadata.waiting_for_aidant_since)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onReassign(visit.id);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: '#FF5722' }}
                >
                  <UserPlus size={16} />
                  Assigner un aidant
                </button>
              </div>
            </div>
          )}

          {visit.status === 'validee' && (
            <div className="w-full p-3 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
              <CheckCircle size={20} className="text-green-500" />
              <div>
                <p className="text-sm font-bold text-green-700">✅ Visite déjà validée</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalFullScreen>
  );
};

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

const InfoItem = ({ icon, label, value, color }: InfoItemProps) => (
  <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--color-border, #e5e7eb)' }}>
    <div className="flex items-center gap-1.5">
      <span style={{ color }}>{icon}</span>
      <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: color + '90' }}>
        {label}
      </p>
    </div>
    <p className="text-sm font-bold mt-0.5" style={{ color }}>
      {value}
    </p>
  </div>
);

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

const AdminVisitValidationPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
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
          aidant_id: visit.aidant_id,
          patient_id: visit.patient_id,
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

  const handleViewDetails = (visit: VisitToValidate) => {
    setSelectedVisit(visit);
    setShowDetailModal(true);
  };

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
      
      toast.success('✅ Visite validée');
      setShowDetailModal(false);
      setSelectedVisit(null);
      await fetchVisitsToValidate();
      await fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur de validation');
    } finally {
      setIsProcessing(false);
      setValidationComment('');
    }
  };

  const handleReject = async (visitId: string) => {
    const reason = validationComment || 'Rapport non conforme';
    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/visits/${visitId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error('Erreur de refus');
      
      toast.success('❌ Visite refusée');
      setShowDetailModal(false);
      setSelectedVisit(null);
      await fetchVisitsToValidate();
      await fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur de refus');
    } finally {
      setIsProcessing(false);
      setValidationComment('');
    }
  };

  const handleReassign = async (visitId: string) => {
    const targetVisit = visits.find(v => v.id === visitId);
    if (!targetVisit) return;
    setSelectedVisitForAssign(targetVisit);
    setShowAssignModal(true);
  };

  const handleAssignSuccess = async () => {
    setShowAssignModal(false);
    setShowWizardModal(false);
    setSelectedVisitForAssign(null);
    await fetchVisitsToValidate();
    await fetchVisits();
    toast.success('Aidant assigné avec succès');
  };

  const stats = {
    total: visits.length,
    pending: visits.filter(v => v.status === 'terminee').length,
    validated: visits.filter(v => v.status === 'validee').length,
    expired: visits.filter(v => v.status === 'expire').length,
    refused: visits.filter(v => v.status === 'refusee').length,
    pendingPayment: visits.filter(v => v.status === 'attente_paiement').length,
    waitingAidant: visits.filter(v => v.status === 'en_attente_aidant').length,
  };

  const filterOptions = [
    { value: 'all', label: '📋 Toutes', count: stats.total },
    { value: 'terminee', label: '⏳ En attente', count: stats.pending },
    { value: 'validee', label: '✅ Validées', count: stats.validated },
    { value: 'expire', label: '⏰ Expirées', count: stats.expired },
    { value: 'refusee', label: '❌ Refusées', count: stats.refused },
    { value: 'en_attente_aidant', label: '🦸 En attente aidant', count: stats.waitingAidant },
  ];

  const getAidantName = (visit: VisitToValidate) => {
    if (visit.aidant?.user?.full_name) {
      return visit.aidant.user.full_name;
    }
    if (visit.metadata?.selected_aidant) {
      return `🔄 Aidant sélectionné`;
    }
    return 'Non assigné';
  };

  const isAidantAssigned = (visit: VisitToValidate) => {
    return !!visit.aidant_id || !!visit.aidant;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin" size={32} style={{ color: colors.primary }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 px-4 sm:px-0">
      {/* HEADER */}
      <section 
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all border border-black/5"
        style={{ background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.primary}12 100%)` }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: colors.text }}>
              📋 Rapports et validations
            </h1>
            <p className="text-xs font-semibold" style={{ color: colors.textLight }}>
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
            className="h-11 px-4 rounded-xl text-xs font-bold border bg-white hover:bg-gray-50 flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-center"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>

        {/* ALERTE */}
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
      </section>

      {/* METRIQUES */}
      <section className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
        <CompactStat label="Total" value={stats.total} color={colors.primary} />
        <CompactStat label="En attente" value={stats.pending} color="#f59e0b" />
        <CompactStat label="Validées" value={stats.validated} color="#10b981" />
        <CompactStat label="Expirées" value={stats.expired} color="#ef4444" />
        <CompactStat label="Refusées" value={stats.refused} color="#ef4444" />
        <CompactStat 
          label="🦸 En attente" 
          value={stats.waitingAidant} 
          color="#FF5722"
          className={stats.waitingAidant > 0 ? 'animate-pulse' : ''}
        />
      </section>

      {/* RECHERCHE & FILTRES */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par patient ou aidant..."
            className="w-full h-11 pl-11 pr-4 rounded-xl border outline-none bg-white border-gray-100 dark:border-gray-800/60 text-xs font-semibold focus:border-emerald-500/50 transition-all shadow-sm"
            style={{ borderColor: colors.border, color: colors.text }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="h-11 px-4 rounded-xl border outline-none text-xs font-semibold bg-white border-gray-100 dark:border-gray-800/60 shrink-0 sm:w-56 shadow-sm cursor-pointer focus:border-emerald-500/50 transition-all"
          style={{ borderColor: colors.border, background: 'var(--color-background)', color: colors.text }}
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} ({opt.count})
            </option>
          ))}
        </select>
      </section>

      {/* LISTE DES VISITES */}
      <section className="space-y-3">
        {filteredVisits.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-gray-400 text-xs font-medium border">
            {searchTerm || filterStatus !== 'all' 
              ? 'Aucune visite ne correspond aux critères' 
              : 'Aucune visite en attente de traitement'}
          </div>
        ) : (
          filteredVisits.map((visit) => {
            const isWaitingAidant = visit.status === 'en_attente_aidant';
            const isExpired = visit.status === 'expire';
            const isRefused = visit.status === 'refusee';
            const isPendingPayment = visit.status === 'attente_paiement';
            const aidantName = getAidantName(visit);
            const isAssigned = isAidantAssigned(visit);

            return (
              <div
                key={visit.id}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 border"
                style={{ 
                  borderColor: isWaitingAidant ? '#FF5722' : getStatusColor(visit.status),
                  borderLeftWidth: '4px',
                  borderLeftColor: isWaitingAidant ? '#FF5722' : getStatusColor(visit.status),
                }}
                onClick={() => handleViewDetails(visit)}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-xs sm:text-sm text-gray-800">
                      {visit.patient?.first_name || visit.target_name} {visit.patient?.last_name || ''}
                    </p>
                    <span className="text-[10px] font-semibold" style={{ color: getStatusColor(visit.status) }}>
                      {getStatusLabel(visit.status)}
                    </span>
                    {isWaitingAidant && (
                      <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full flex items-center gap-1 border border-orange-200">
                        <UserPlus size={10} />
                        En attente
                      </span>
                    )}
                    {isExpired && (
                      <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-200 animate-pulse">
                        <AlertCircle size={10} />
                        Expirée
                      </span>
                    )}
                    {isPendingPayment && (
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1 border border-purple-200">
                        <CreditCard size={10} />
                        En attente paiement
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider flex-wrap mt-0.5">
                    <span>📅 {formatDate(visit.scheduled_date)}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="truncate max-w-[200px]">📍 {visit.patient?.address || 'Adresse non renseignée'}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <User size={12} className="text-gray-400" />
                      <span className={isAssigned ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                        {aidantName}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  {isWaitingAidant && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReassign(visit.id); }}
                      className="flex-1 sm:flex-initial h-9 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                      style={{ background: '#FF5722' }}
                    >
                      <UserPlus size={12} />
                      Assigner
                    </button>
                  )}

                  {(isExpired || isRefused) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReassign(visit.id); }}
                      disabled={isProcessing}
                      className="flex-1 sm:flex-initial h-9 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                      style={{ background: '#FF5722' }}
                    >
                      <Shield size={12} />
                      Réassigner
                    </button>
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); handleViewDetails(visit); }}
                    className="flex-1 sm:flex-initial h-9 px-4 rounded-xl text-xs font-bold border bg-gray-50/50 hover:bg-gray-100 flex items-center justify-center gap-1.5 transition-colors"
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

      {/* MODAL DÉTAILS */}
      {showDetailModal && selectedVisit && (
        <VisitDetailModal
          visit={selectedVisit}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedVisit(null);
          }}
          onValidate={handleValidate}
          onReject={handleReject}
          onReassign={handleReassign}
          colors={colors}
          isProcessing={isProcessing}
        />
      )}

      {/* MODAL D'ASSIGNATION D'AIDANT */}
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
          colors={colors}
          allowForce={true}
          isAdmin={true}
        />
      )}
    </div>
  );
};

interface CompactStatProps {
  label: string;
  value: number;
  color: string;
  className?: string;
}

const CompactStat = ({ label, value, color, className = '' }: CompactStatProps) => (
  <div className={`bg-white rounded-xl p-2.5 shadow-sm border border-black/5 flex items-center justify-between gap-2 ${className}`}>
    <div className="space-y-0.5 min-w-0 pr-1">
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</p>
      <p className="text-sm sm:text-base font-black truncate" style={{ color }}>{value}</p>
    </div>
  </div>
);

export default AdminVisitValidationPage;
