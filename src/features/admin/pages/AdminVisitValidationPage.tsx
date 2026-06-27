// 📁 src/features/admin/pages/AdminVisitValidationPage.tsx
 
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
  Filter,
  Search,
  Phone,
  Mail,
  Image,
  Mic,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Volume2,
  Download,
  MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime } from '@/utils/helpers';
import toast from 'react-hot-toast';

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
  created_at: string;
}

const AdminVisitValidationPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();

  const {
    singular,
    plural,
    getCategoryLabel,
    isAdminOrCoordinator,
  } = useTerminology();

  const [visits, setVisits] = useState<VisitToValidate[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<VisitToValidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'terminee' | 'validee' | 'replanifiee'>('terminee');
  const [selectedVisit, setSelectedVisit] = useState<VisitToValidate | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [validationComment, setValidationComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchVisitsToValidate();
  }, []);

  useEffect(() => {
    filterVisits();
  }, [visits, searchTerm, filterStatus]);

  // =============================================
  // FETCH VISITS - CORRIGÉ (requêtes séparées)
  // =============================================
  const fetchVisitsToValidate = async () => {
    try {
      setIsLoading(true);

      // ✅ ÉTAPE 1 : Récupérer les visites
      const { data: visitsData, error: visitsError } = await supabase
        .from('visites')
        .select('*')
        .in('status', ['terminee', 'validee', 'replanifiee'])
        .order('created_at', { ascending: false });

      if (visitsError) throw visitsError;

      if (!visitsData || visitsData.length === 0) {
        setVisits([]);
        setFilteredVisits([]);
        setIsLoading(false);
        return;
      }

      // ✅ ÉTAPE 2 : Récupérer les patients
      const patientIds = [...new Set(visitsData.map(v => v.patient_id).filter(Boolean))];
      let patientMap: Record<string, any> = {};

      if (patientIds.length > 0) {
        const { data: patients, error: patientsError } = await supabase
          .from('patients')
          .select('*')
          .in('id', patientIds);

        if (!patientsError && patients) {
          patientMap = patients.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // ✅ ÉTAPE 3 : Récupérer les aidants
      const aidantIds = [...new Set(visitsData.map(v => v.aidant_id).filter(Boolean))];
      let aidantMap: Record<string, any> = {};

      if (aidantIds.length > 0) {
        const { data: aidants, error: aidantsError } = await supabase
          .from('aidants')
          .select('*')
          .in('id', aidantIds);

        if (!aidantsError && aidants) {
          // Récupérer les profils des aidants
          const userIds = aidants.map(a => a.user_id).filter(Boolean);
          let profileMap: Record<string, any> = {};

          if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('*')
              .in('id', userIds);

            if (!profilesError && profiles) {
              profileMap = profiles.reduce((acc, p) => {
                acc[p.id] = p;
                return acc;
              }, {} as Record<string, any>);
            }
          }

          aidantMap = aidants.reduce((acc, a) => {
            acc[a.id] = {
              ...a,
              user: a.user_id ? profileMap[a.user_id] || null : null,
            };
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // ✅ ÉTAPE 4 : Récupérer les photos
      const visitIds = visitsData.map(v => v.id);
      let photosMap: Record<string, any[]> = {};

      if (visitIds.length > 0) {
        const { data: photos, error: photosError } = await supabase
          .from('visite_photos')
          .select('*')
          .in('visite_id', visitIds);

        if (!photosError && photos) {
          photosMap = photos.reduce((acc, p) => {
            if (!acc[p.visite_id]) acc[p.visite_id] = [];
            acc[p.visite_id].push(p);
            return acc;
          }, {} as Record<string, any[]>);
        }
      }

      // ✅ ÉTAPE 5 : Récupérer les audios
      let audiosMap: Record<string, any[]> = {};

      if (visitIds.length > 0) {
        const { data: audios, error: audiosError } = await supabase
          .from('visite_audios')
          .select('*')
          .in('visite_id', visitIds);

        if (!audiosError && audios) {
          audiosMap = audios.reduce((acc, a) => {
            if (!acc[a.visite_id]) acc[a.visite_id] = [];
            acc[a.visite_id].push(a);
            return acc;
          }, {} as Record<string, any[]>);
        }
      }

      // ✅ ÉTAPE 6 : Fusionner toutes les données
      const visitsWithRelations = visitsData.map((visit) => {
        const patient = visit.patient_id ? patientMap[visit.patient_id] || null : null;
        const aidant = visit.aidant_id ? aidantMap[visit.aidant_id] || null : null;
        const photos = photosMap[visit.id] || [];
        const audios = audiosMap[visit.id] || [];

        // Extraire l'audio_url des métadonnées si présent
        const audioUrl = visit.metadata?.audio_url || null;

        return {
          ...visit,
          patient,
          aidant,
          photos,
          audios,
          metadata: {
            ...visit.metadata,
            audio_url: audioUrl,
          },
        };
      });

      setVisits(visitsWithRelations);
    } catch (error: any) {
      console.error('❌ Fetch visits error:', error);
      toast.error('Erreur lors du chargement des visites');
    } finally {
      setIsLoading(false);
    }
  };

  const filterVisits = () => {
    let filtered = [...visits];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(v => v.status === filterStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.patient?.first_name?.toLowerCase().includes(term) ||
        v.patient?.last_name?.toLowerCase().includes(term) ||
        v.aidant?.user?.full_name?.toLowerCase().includes(term) ||
        v.patient?.address?.toLowerCase().includes(term)
      );
    }

    setFilteredVisits(filtered);
  };

  const handleValidate = async (visitId: string) => {
    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/visits/${visitId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({ comment: validationComment }),
      });

      if (!response.ok) throw new Error('Erreur lors de la validation');

      toast.success('✅ Visite validée avec succès');
      setValidationComment('');
      setShowDetailModal(false);
      fetchVisitsToValidate();
    } catch (error) {
      console.error('❌ Validate error:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (visitId: string) => {
    if (!window.confirm('⚠️ Refuser cette visite ? L\'aidant devra la refaire.')) return;

    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/visits/${visitId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({ reason: validationComment || 'Non conforme' }),
      });

      if (!response.ok) throw new Error('Erreur lors du refus');

      toast.success('❌ Visite refusée');
      setValidationComment('');
      setShowDetailModal(false);
      fetchVisitsToValidate();
    } catch (error) {
      console.error('❌ Reject error:', error);
      toast.error('Erreur lors du refus');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      terminee: 'En attente',
      validee: 'Validée ✅',
      replanifiee: 'À refaire ❌',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      terminee: '#FF9800',
      validee: '#4CAF50',
      replanifiee: '#F44336',
    };
    return colors[status] || '#9E9E9E';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'terminee': return <Clock size={16} />;
      case 'validee': return <CheckCircle size={16} />;
      case 'replanifiee': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  // ✅ Libellé dynamique
  const getPersonLabel = () => {
    if (isAdminOrCoordinator) return 'Bénéficiaire';
    return 'Patient';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: colors.text }}>Chargement des visites...</p>
        </div>
      </div>
    );
  }

  const pendingCount = visits.filter(v => v.status === 'terminee').length;

  return (
    <div className="space-y-4 pb-4">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
            📋 Validation des visites
          </h1>
          <p className="mt-1" style={{ color: colors.text + '99' }}>
            {pendingCount} visite{pendingCount > 1 ? 's' : ''} en attente de validation
          </p>
        </div>
        <button
          onClick={fetchVisitsToValidate}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition hover:opacity-80"
          style={{ background: colors.primary + '15', color: colors.primary }}
        >
          <RefreshCw size={18} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="En attente"
          value={visits.filter(v => v.status === 'terminee').length}
          color="#FF9800"
          icon={<Clock size={20} />}
        />
        <StatCard
          label="Validées"
          value={visits.filter(v => v.status === 'validee').length}
          color="#4CAF50"
          icon={<CheckCircle size={20} />}
        />
        <StatCard
          label="Refusées"
          value={visits.filter(v => v.status === 'replanifiee').length}
          color="#F44336"
          icon={<XCircle size={20} />}
        />
      </div>

      {/* FILTRES */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none transition focus:ring-2 text-sm"
              style={{
                borderColor: colors.border || '#e5e0d8',
                background: 'var(--color-background, #f5f0e8)',
                color: colors.text,
              }}
              placeholder={`Rechercher un ${getPersonLabel().toLowerCase()} ou un aidant...`}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2.5 rounded-xl border outline-none text-sm"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <option value="terminee">⏳ En attente</option>
            <option value="all">Tous</option>
            <option value="validee">✅ Validées</option>
            <option value="replanifiee">❌ Refusées</option>
          </select>
        </div>
      </div>

      {/* LISTE DES VISITES */}
      {filteredVisits.length > 0 ? (
        <div className="space-y-4">
          {filteredVisits.map((visit) => (
            <VisitValidationCard
              key={visit.id}
              visit={visit}
              colors={colors}
              getStatusLabel={getStatusLabel}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              getPersonLabel={getPersonLabel}
              formatDate={formatDate}
              formatTime={formatTime}
              onView={() => {
                setSelectedVisit(visit);
                setShowDetailModal(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <CheckCircle size={64} className="mx-auto mb-4 opacity-30" style={{ color: colors.primary }} />
          <h3 className="text-lg font-medium" style={{ color: colors.text }}>
            {searchTerm ? 'Aucun résultat trouvé' : 'Aucune visite à valider'}
          </h3>
          <p className="mt-1" style={{ color: colors.text + '80' }}>
            {searchTerm ? 'Essayez une autre recherche' : 'Toutes les visites ont été traitées'}
          </p>
        </div>
      )}

      {/* MODAL DÉTAILS */}
      {showDetailModal && selectedVisit && (
        <VisitValidationDetailModal
          visit={selectedVisit}
          colors={colors}
          getPersonLabel={getPersonLabel}
          formatDate={formatDate}
          formatTime={formatTime}
          onClose={() => {
            setShowDetailModal(false);
            setValidationComment('');
          }}
          onValidate={() => handleValidate(selectedVisit.id)}
          onReject={() => handleReject(selectedVisit.id)}
          isProcessing={isProcessing}
          validationComment={validationComment}
          setValidationComment={setValidationComment}
          getStatusLabel={getStatusLabel}
          getStatusColor={getStatusColor}
        />
      )}
    </div>
  );
};

// =============================================
// STAT CARD
// =============================================

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

const StatCard = ({ label, value, color, icon }: StatCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '15', color }}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// =============================================
// VISIT VALIDATION CARD
// =============================================

interface VisitValidationCardProps {
  visit: VisitToValidate;
  colors: any;
  getStatusLabel: (status: string) => string;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getPersonLabel: () => string;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  onView: () => void;
}

const VisitValidationCard = ({
  visit,
  colors,
  getStatusLabel,
  getStatusColor,
  getStatusIcon,
  getPersonLabel,
  formatDate,
  formatTime,
  onView,
}: VisitValidationCardProps) => {
  const statusColor = getStatusColor(visit.status);
  const hasPhotos = visit.photos && visit.photos.length > 0;
  const hasAudio = visit.metadata?.audio_url || (visit.audios && visit.audios.length > 0);

  return (
    <div
      className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border-l-4 cursor-pointer"
      style={{ borderLeftColor: statusColor }}
      onClick={onView}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
              {visit.patient?.first_name} {visit.patient?.last_name}
            </h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
              style={{
                background: statusColor + '20',
                color: statusColor,
              }}
            >
              {getStatusIcon(visit.status)}
              {getStatusLabel(visit.status)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm" style={{ color: colors.text + '60' }}>
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {formatDate(visit.scheduled_date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {formatTime(visit.scheduled_time)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={14} />
              {visit.patient?.address || 'Adresse non précisée'}
            </span>
            <span className="flex items-center gap-1">
              <User size={14} />
              {getPersonLabel()} : {visit.aidant?.user?.full_name || 'Aidant'}{' '}
              <span className="text-xs" style={{ color: colors.text + '40' }}>
                (⭐ {visit.aidant?.rating || 0})
              </span>
            </span>
          </div>

          <div className="flex gap-3 mt-2">
            {hasPhotos && (
              <span className="text-xs flex items-center gap-1" style={{ color: colors.primary }}>
                <Image size={14} /> {visit.photos?.length || 0} photo(s)
              </span>
            )}
            {hasAudio && (
              <span className="text-xs flex items-center gap-1" style={{ color: colors.primary }}>
                <Mic size={14} /> Audio
              </span>
            )}
            {visit.actions && visit.actions.length > 0 && (
              <span className="text-xs flex items-center gap-1" style={{ color: colors.primary }}>
                <CheckCircle size={14} /> {visit.actions.length} action(s)
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="flex items-center gap-1 px-4 py-2 rounded-xl font-medium text-sm transition hover:opacity-80"
            style={{ background: colors.primary + '15', color: colors.primary }}
          >
            <Eye size={16} />
            Voir les détails
          </button>
        </div>
      </div>

      {visit.metadata?.duration_minutes && (
        <div className="mt-3 text-xs" style={{ color: colors.text + '40' }}>
          ⏱️ Durée: {visit.metadata.duration_minutes} minutes
        </div>
      )}
    </div>
  );
};

// =============================================
// VISIT VALIDATION DETAIL MODAL
// =============================================

interface VisitValidationDetailModalProps {
  visit: VisitToValidate;
  colors: any;
  getPersonLabel: () => string;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  onClose: () => void;
  onValidate: () => void;
  onReject: () => void;
  isProcessing: boolean;
  validationComment: string;
  setValidationComment: (comment: string) => void;
  getStatusLabel: (status: string) => string;
  getStatusColor: (status: string) => string;
}

const VisitValidationDetailModal = ({
  visit,
  colors,
  getPersonLabel,
  formatDate,
  formatTime,
  onClose,
  onValidate,
  onReject,
  isProcessing,
  validationComment,
  setValidationComment,
  getStatusLabel,
  getStatusColor,
}: VisitValidationDetailModalProps) => {
  const [expandedSections, setExpandedSections] = useState({
    photos: true,
    audio: true,
    report: true,
  });

  const isPending = visit.status === 'terminee';

  const getMetadata = (key: string, defaultValue: any = null) => {
    if (!visit.metadata) return defaultValue;
    return visit.metadata[key as keyof typeof visit.metadata] ?? defaultValue;
  };

  const validatedAt = getMetadata('validated_at');
  const validationCommentText = getMetadata('validation_comment');
  const rejectedAt = getMetadata('rejected_at');
  const rejectionReason = getMetadata('rejection_reason');

  const personLabel = getPersonLabel();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        {/* HEADER */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b" style={{ borderColor: colors.primary + '20' }}>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold" style={{ color: colors.text }}>
                📋 Rapport de visite
              </h2>
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: getStatusColor(visit.status) + '20',
                  color: getStatusColor(visit.status),
                }}
              >
                {getStatusLabel(visit.status)}
              </span>
            </div>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {personLabel} : {visit.patient?.first_name} {visit.patient?.last_name} • {formatDate(visit.scheduled_date)} à {formatTime(visit.scheduled_time)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            disabled={isProcessing}
          >
            <XCircle size={24} style={{ color: colors.text }} />
          </button>
        </div>

        {/* CONTENU */}
        <div className="p-6 space-y-6">
          {/* 1. INFOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
              <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: colors.text }}>
                <User size={18} />
                {personLabel}
              </h4>
              <p className="font-medium" style={{ color: colors.text }}>
                {visit.patient?.first_name} {visit.patient?.last_name}
              </p>
              <p className="text-sm" style={{ color: colors.text + '60' }}>
                📍 {visit.patient?.address}
              </p>
              {visit.patient?.phone && (
                <p className="text-sm" style={{ color: colors.text + '60' }}>
                  📞 {visit.patient?.phone}
                </p>
              )}
              <p className="text-sm" style={{ color: colors.text + '60' }}>
                {visit.patient?.category === 'maman_bebe' ? '👶 Maman & Bébé' : '👴 Senior'}
              </p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
              <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: colors.text }}>
                <User size={18} />
                Aidant
              </h4>
              <p className="font-medium" style={{ color: colors.text }}>
                {visit.aidant?.user?.full_name || 'N/A'}
              </p>
              <p className="text-sm" style={{ color: colors.text + '60' }}>
                📧 {visit.aidant?.user?.email}
              </p>
              <p className="text-sm" style={{ color: colors.text + '60' }}>
                ⭐ {visit.aidant?.rating || 0} • {visit.aidant?.total_missions || 0} missions
              </p>
            </div>
          </div>

          {/* 2. ACTIONS RÉALISÉES */}
          {visit.actions && visit.actions.length > 0 && (
            <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
              <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: colors.text }}>
                <CheckCircle size={18} />
                Actions réalisées
              </h4>
              <div className="flex flex-wrap gap-2">
                {visit.actions.map((action, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full text-xs"
                    style={{ background: colors.primary + '15', color: colors.primary }}
                  >
                    {action}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 3. NOTES */}
          {visit.notes && (
            <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
              <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: colors.text }}>
                <FileText size={18} />
                Notes
              </h4>
              <p className="text-sm" style={{ color: colors.text }}>
                {visit.notes}
              </p>
            </div>
          )}

          {/* 4. PHOTOS */}
          <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setExpandedSections({ ...expandedSections, photos: !expandedSections.photos })}
            >
              <h4 className="font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                <Image size={18} />
                Photos ({visit.photos?.length || 0})
              </h4>
              {expandedSections.photos ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {expandedSections.photos && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                {visit.photos?.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border">
                    <img
                      src={photo.photo_url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => window.open(photo.photo_url, '_blank')}
                    />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/50">
                        <p className="text-white text-xs truncate">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
                {(!visit.photos || visit.photos.length === 0) && (
                  <p className="text-sm col-span-full" style={{ color: colors.text + '40' }}>
                    Aucune photo
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 5. AUDIO */}
          {visit.metadata?.audio_url || (visit.audios && visit.audios.length > 0) ? (
            <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
              <button
                className="w-full flex items-center justify-between"
                onClick={() => setExpandedSections({ ...expandedSections, audio: !expandedSections.audio })}
              >
                <h4 className="font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                  <Mic size={18} />
                  Enregistrement audio
                </h4>
                {expandedSections.audio ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {expandedSections.audio && (
                <div className="mt-3">
                  {visit.metadata?.audio_url && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white">
                      <Volume2 size={20} style={{ color: colors.primary }} />
                      <audio controls className="flex-1">
                        <source src={visit.metadata.audio_url} />
                        Votre navigateur ne supporte pas l'audio.
                      </audio>
                      <a
                        href={visit.metadata.audio_url}
                        download
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                      >
                        <Download size={18} style={{ color: colors.primary }} />
                      </a>
                    </div>
                  )}
                  {visit.audios?.map((audio, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-white mt-2">
                      <Volume2 size={20} style={{ color: colors.primary }} />
                      <audio controls className="flex-1">
                        <source src={audio.audio_url} />
                        Votre navigateur ne supporte pas l'audio.
                      </audio>
                      <a
                        href={audio.audio_url}
                        download
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                      >
                        <Download size={18} style={{ color: colors.primary }} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* 6. COMMENTAIRE DE VALIDATION */}
          {isPending && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                <MessageSquare size={16} className="inline mr-1" />
                Commentaire (optionnel)
              </label>
              <textarea
                value={validationComment}
                onChange={(e) => setValidationComment(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border outline-none transition focus:ring-2 resize-none text-sm"
                style={{
                  borderColor: colors.border,
                  background: 'var(--color-background, #f5f0e8)',
                  color: colors.text,
                }}
                rows={3}
                placeholder="Ajouter un commentaire sur cette visite..."
                disabled={isProcessing}
              />
            </div>
          )}

          {/* 7. ACTIONS */}
          {isPending && (
            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
              <button
                onClick={onReject}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-xl font-medium border transition hover:bg-red-50 disabled:opacity-50"
                style={{ borderColor: '#F44336', color: '#F44336' }}
              >
                <XCircle size={18} className="inline mr-2" />
                Refuser
              </button>
              <button
                onClick={onValidate}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-xl text-white font-medium transition hover:opacity-80 disabled:opacity-50"
                style={{ background: '#4CAF50' }}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  <>
                    <CheckCircle size={18} className="inline mr-2" />
                    Valider
                  </>
                )}
              </button>
            </div>
          )}

          {/* 8. MÉTADONNÉES DE VALIDATION */}
          {validatedAt && (
            <div className="text-xs" style={{ color: colors.text + '40' }}>
              <p>✅ Validée le {formatDate(validatedAt)} à {formatTime(validatedAt)}</p>
              {validationCommentText && (
                <p>📝 Commentaire: {validationCommentText}</p>
              )}
            </div>
          )}

          {rejectedAt && (
            <div className="text-xs" style={{ color: colors.text + '40' }}>
              <p>❌ Refusée le {formatDate(rejectedAt)} à {formatTime(rejectedAt)}</p>
              {rejectionReason && (
                <p>📝 Raison: {rejectionReason}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminVisitValidationPage;
