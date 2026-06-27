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
  Search,
  Image,
  Mic,
  Volume2,
  Download,
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
  const { getCategoryLabel, isAdminOrCoordinator } = useTerminology();

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

  const fetchVisitsToValidate = async () => {
    try {
      setIsLoading(true);
      const { data: visitsData, error: visitsError } = await supabase
        .from('visites')
        .select('*')
        .in('status', ['terminee', 'validee', 'replanifiee'])
        .order('created_at', { ascending: false });

      if (visitsError) throw visitsError;
      if (!visitsData || visitsData.length === 0) {
        setVisits([]);
        setFilteredVisits([]);
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
        const photos = photosMap[visit.id] || [];
        const audios = audiosMap[visit.id] || [];
        return { ...visit, patient, aidant, photos, audios, metadata: { ...visit.metadata, audio_url: visit.metadata?.audio_url || null } };
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
        v.aidant?.user?.full_name?.toLowerCase().includes(term)
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
      if (!response.ok) throw new Error();
      toast.success('✅ Visite validée');
      setShowDetailModal(false);
      fetchVisitsToValidate();
    } catch {
      toast.error('Erreur de validation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (visitId: string) => {
    if (!window.confirm('Refuser cette visite ?')) return;
    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/visits/${visitId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({ reason: validationComment || 'Rapport non conforme' }),
      });
      if (!response.ok) throw new Error();
      toast.success('❌ Visite refusée');
      setShowDetailModal(false);
      fetchVisitsToValidate();
    } catch {
      toast.error('Erreur de refus');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { terminee: 'En attente ⏳', validee: 'Validée ✅', replanifiee: 'À refaire ❌' };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = { terminee: '#f59e0b', validee: '#10b981', replanifiee: '#ef4444' };
    return colors[status] || '#94a3b8';
  };

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
              Vérifiez les comptes-rendus et livraisons d'interventions à domicile
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
      </section>

      {/* Barre de Recherche épurée */}
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
          <option value="terminee">⏳ En attente</option>
          <option value="validee">✅ Validées</option>
          <option value="replanifiee">❌ Refusées</option>
        </select>
      </section>

      {/* Liste épurée */}
      <section className="space-y-3">
        {filteredVisits.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-gray-400">Aucune visite en attente de traitement</div>
        ) : (
          filteredVisits.map((visit) => (
            <div
              key={visit.id}
              onClick={() => { setSelectedVisit(visit); setShowDetailModal(true); }}
              className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 border"
              style={{ borderColor: colors.border }}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-xs" style={{ color: colors.text }}>{visit.patient?.first_name} {visit.patient?.last_name}</p>
                  <span className="text-[10px] font-semibold" style={{ color: getStatusColor(visit.status) }}>{getStatusLabel(visit.status)}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
                  <span>📅 {formatDate(visit.scheduled_date)}</span>
                  <span>📍 {visit.patient?.address}</span>
                  <span>🦸 {visit.aidant?.user?.full_name}</span>
                </div>
              </div>
              <button className="px-3.5 py-2 rounded-xl text-xs font-bold border hover:bg-gray-50 transition-colors shrink-0 self-start sm:self-center" style={{ borderColor: colors.border, color: colors.text }}>Détails</button>
            </div>
          ))
        )}
      </section>

      {/* Modal Détails & Validation */}
      {showDetailModal && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: colors.border }}>
              <h2 className="font-bold text-sm uppercase tracking-wider text-gray-400">📋 Validation d'intervention</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-gray-50 rounded-lg"><XCircle size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-xs">{selectedVisit.patient?.first_name} {selectedVisit.patient?.last_name}</p>
                <p className="text-gray-500">Aidant : {selectedVisit.aidant?.user?.full_name}</p>
                {selectedVisit.notes && <p className="text-gray-600 bg-gray-50 p-2.5 rounded-xl italic">"{selectedVisit.notes}"</p>}
              </div>

              {selectedVisit.photos && selectedVisit.photos.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">📸 Preuves de visite ({selectedVisit.photos.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedVisit.photos.map((p, i) => (
                      <img key={i} src={p.photo_url} alt="Visite" className="aspect-square object-cover rounded-xl border" />
                    ))}
                  </div>
                </div>
              )}

              {selectedVisit.metadata?.audio_url && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">🎙️ Rapport vocal</p>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                    <Volume2 size={16} style={{ color: colors.primary }} />
                    <audio controls className="flex-1 scale-90 origin-left"><source src={selectedVisit.metadata.audio_url} /></audio>
                  </div>
                </div>
              )}

              {/* Décision d'administration */}
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
                    <button onClick={() => handleReject(selectedVisit.id)} className="px-4 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100">Refuser le rapport</button>
                    <button onClick={() => handleValidate(selectedVisit.id)} className="px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{ background: colors.primary }}>Valider la visite</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVisitValidationPage;
