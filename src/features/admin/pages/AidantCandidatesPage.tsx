// 📁 src/features/admin/pages/AidantCandidatesPage.tsx
 
import { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Star,
  Phone,
  Mail,
  MapPin,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  X,
  Eye,
  Award,
  Briefcase,
  Calendar,
  ShieldCheck,
  FileText,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface AidantCandidate {
  id: string;
  user_id: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
  } | null;
  specialties: string[];
  available: boolean;
  rating: number;
  bio: string | null;
  address: string | null;
  zones: string[];
  experience_years: number | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

const AidantCandidatesPage = () => {
  const { profile, role } = useAuthStore();
  const [candidates, setCandidates] = useState<AidantCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<AidantCandidate | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setIsLoading(true);

      const { data: aidantsData, error: aidantsError } = await supabase
        .from('aidants')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (aidantsError) throw aidantsError;

      const userIds = [...new Set(aidantsData?.map(a => a.user_id).filter(Boolean))];
      let profileMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, role, avatar_url, created_at')
          .in('id', userIds);

        if (!profilesError && profiles) {
          profileMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const candidatesWithUser = (aidantsData || []).map(candidate => ({
        ...candidate,
        user: candidate.user_id ? profileMap[candidate.user_id] || null : null,
      }));

      setCandidates(candidatesWithUser);

    } catch (error: any) {
      console.error('Fetch candidates error:', error);
      toast.error('Erreur lors du chargement des candidats');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch =
      candidate.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '⏳ En attente';
      case 'approved': return '✅ Approuvé';
      case 'rejected': return '❌ Refusé';
      default: return status;
    }
  };

  const stats = {
    total: candidates.length,
    pending: candidates.filter(c => c.status === 'pending').length,
    withExperience: candidates.filter(c => (c.experience_years || 0) > 0).length,
    withBio: candidates.filter(c => c.bio).length,
  };

  // ============================================================
  // ✅ APPROUVER - APPEL BACKEND
  // ============================================================
const handleApprove = async (candidate: AidantCandidate) => {
  if (!window.confirm(`Êtes-vous sûr de vouloir approuver ${candidate.user?.full_name || 'ce candidat'} ?`)) return;

  setIsProcessing(true);
  try {
    // ✅ Récupérer le token avec la BONNE clé
    const session = JSON.parse(localStorage.getItem('sb-mrsrogkjthtnppecndyc-auth-token'));
    const token = session?.access_token;

    if (!token) {
      throw new Error('Token manquant');
    }

    console.log('📤 [APPROVE] Appel backend pour:', candidate.id);

    // ✅ Utiliser l'URL complète
    const response = await fetch('https://app-sante-plus-react.onrender.com/api/auth/admin/approve-aidant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        aidantId: candidate.id,
        comments: 'Compte aidant approuvé',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de l\'approbation');
    }

    console.log('✅ [APPROVE] Réponse:', data);

    toast.success(data.message || '✅ Aidant approuvé avec succès');
    
    if (data.email_sent === false) {
      toast.warning('⚠️ L\'email n\'a pas pu être envoyé');
    }

    fetchCandidates();
    setShowDetailsModal(false);
    
  } catch (error: any) {
    console.error('❌ Erreur approbation:', error);
    toast.error(error.message || 'Erreur lors de l\'approbation');
  } finally {
    setIsProcessing(false);
  }
};
  // ============================================================
  // ✅ REFUSER - APPEL BACKEND
  // ============================================================
  const handleReject = async (candidate: AidantCandidate) => {
    const reason = prompt('Motif du refus :');
    if (reason === null) return;
    if (!window.confirm(`Êtes-vous sûr de vouloir refuser ${candidate.user?.full_name || 'ce candidat'} ?`)) return;

    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token manquant');
      }

      console.log('📤 [FRONTEND] Refus aidant:', candidate.id);

      const response = await fetch('/api/auth/admin/reject-aidant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          aidantId: candidate.id,
          comments: reason || 'Candidature refusée',
        }),
      });

      const data = await response.json();

      console.log('📤 [FRONTEND] Réponse backend refus:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du refus');
      }

      toast.success(data.message || '❌ Aidant refusé avec succès');
      
      if (data.email_sent === false) {
        toast.warning('⚠️ L\'email n\'a pas pu être envoyé');
      }

      fetchCandidates();
      setShowDetailsModal(false);
      
    } catch (error: any) {
      console.error('❌ Erreur refus:', error);
      toast.error(error.message || 'Erreur lors du refus');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDetails = (candidate: AidantCandidate) => {
    setSelectedCandidate(candidate);
    setShowDetailsModal(true);
  };

  const handleRequestInfo = async (candidate: AidantCandidate) => {
    const message = prompt('Message à envoyer au candidat :');
    if (!message) return;

    try {
      await supabase.from('notifications').insert({
        user_id: candidate.user_id,
        title: 'ℹ️ Information complémentaire demandée',
        body: message,
        type: 'system',
        data: { aidant_id: candidate.id },
      });

      toast.success('📧 Notification envoyée');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black" style={{ color: colors.text }}>
              🦸 Candidatures Aidants
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
              Gérez les candidatures des aidants en attente de validation
            </p>
          </div>
          <button
            onClick={fetchCandidates}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl font-medium transition hover:opacity-80 flex items-center gap-2"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total candidats" value={stats.total} color={colors.primary} icon={<Users size={20} />} />
        <StatCard label="En attente" value={stats.pending} color="#FF9800" icon={<Clock size={20} />} />
        <StatCard label="Avec expérience" value={stats.withExperience} color="#2196F3" icon={<Award size={20} />} />
        <StatCard label="Avec bio" value={stats.withBio} color="#4CAF50" icon={<FileText size={20} />} />
      </section>

      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, email ou spécialité..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border outline-none text-sm"
              style={{
                borderColor: colors.border,
                background: 'var(--color-background)',
                color: colors.text,
              }}
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-t-transparent" style={{ borderColor: colors.primary }} />
            <p className="mt-2 text-sm" style={{ color: colors.text + '60' }}>Chargement des candidats...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-bold" style={{ color: colors.text }}>Aucun candidat en attente</h3>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {searchTerm ? 'Aucun candidat ne correspond à votre recherche' : 'Toutes les candidatures ont été traitées'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
            {filteredCandidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                colors={colors}
                onView={() => handleViewDetails(candidate)}
                onApprove={() => handleApprove(candidate)}
                onReject={() => handleReject(candidate)}
                onRequestInfo={() => handleRequestInfo(candidate)}
                isProcessing={isProcessing}
              />
            ))}
          </div>
        )}
      </section>

      {showDetailsModal && selectedCandidate && (
        <CandidateDetailsModal
          candidate={selectedCandidate}
          onClose={() => setShowDetailsModal(false)}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestInfo={handleRequestInfo}
          colors={colors}
          isProcessing={isProcessing}
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
  value: string | number;
  color: string;
  icon: React.ReactNode;
}

const StatCard = ({ label, value, color, icon }: StatCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-black" style={{ color }}>{value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '15', color }}>{icon}</div>
      </div>
    </div>
  );
};

// =============================================
// CANDIDATE CARD
// =============================================

interface CandidateCardProps {
  candidate: AidantCandidate;
  colors: any;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRequestInfo: () => void;
  isProcessing: boolean;
}

const CandidateCard = ({ candidate, colors, onView, onApprove, onReject, onRequestInfo, isProcessing }: CandidateCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-5 border transition hover:shadow-md" style={{ borderColor: colors.border }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: colors.primary }}>
            {candidate.user?.full_name?.charAt(0) || 'A'}
          </div>
          <div>
            <h3 className="font-bold" style={{ color: colors.text }}>{candidate.user?.full_name || 'Aidant inconnu'}</h3>
            <p className="text-xs" style={{ color: colors.text + '40' }}>{candidate.user?.email || 'Email inconnu'}</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: '#FF980015', color: '#FF9800' }}>⏳ En attente</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-1.5" style={{ color: colors.text + '60' }}>
          <Briefcase size={14} />
          <span>{candidate.specialties?.join(', ') || 'Aucune spécialité'}</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: colors.text + '60' }}>
          <Award size={14} />
          <span>{candidate.experience_years || 0} ans d'expérience</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: colors.text + '60' }}>
          <MapPin size={14} />
          <span>{candidate.zones?.join(', ') || 'Aucune zone'}</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: colors.text + '60' }}>
          <Calendar size={14} />
          <span>{formatDate(candidate.created_at)}</span>
        </div>
      </div>

      {candidate.bio && (
        <div className="mt-3 p-3 rounded-xl" style={{ background: colors.primary + '05' }}>
          <p className="text-sm line-clamp-2" style={{ color: colors.text + '70' }}>{candidate.bio}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onView} className="flex-1 py-2 rounded-xl text-sm font-medium transition hover:bg-gray-50 flex items-center justify-center gap-1.5" style={{ border: `1px solid ${colors.border}`, color: colors.text }}>
          <Eye size={16} /> Détails
        </button>
        <button onClick={onApprove} disabled={isProcessing} className="flex-1 py-2 rounded-xl text-white text-sm font-bold transition hover:opacity-80 flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ background: '#4CAF50' }}>
          <ThumbsUp size={16} /> Approuver
        </button>
        <button onClick={onReject} disabled={isProcessing} className="flex-1 py-2 rounded-xl text-white text-sm font-bold transition hover:opacity-80 flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ background: '#F44336' }}>
          <ThumbsDown size={16} /> Refuser
        </button>
      </div>

      <button onClick={onRequestInfo} disabled={isProcessing} className="w-full mt-2 py-1.5 rounded-xl text-xs font-medium transition hover:opacity-80 disabled:opacity-50" style={{ background: colors.primary + '10', color: colors.primary }}>
        📧 Demander plus d'informations
      </button>
    </div>
  );
};

// =============================================
// CANDIDATE DETAILS MODAL
// =============================================

interface CandidateDetailsModalProps {
  candidate: AidantCandidate;
  onClose: () => void;
  onApprove: (candidate: AidantCandidate) => Promise<void>;
  onReject: (candidate: AidantCandidate) => Promise<void>;
  onRequestInfo: (candidate: AidantCandidate) => Promise<void>;
  colors: any;
  isProcessing: boolean;
}

const CandidateDetailsModal = ({ candidate, onClose, onApprove, onReject, onRequestInfo, colors, isProcessing }: CandidateDetailsModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b" style={{ borderColor: colors.border }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>🦸 Détails du candidat</h2>
            <p className="text-sm" style={{ color: colors.text + '60' }}>{candidate.user?.full_name || 'Aidant inconnu'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <InfoRow label="Nom complet" value={candidate.user?.full_name || 'N/A'} />
          <InfoRow label="Email" value={candidate.user?.email || 'N/A'} />
          <InfoRow label="Téléphone" value={candidate.user?.phone || 'N/A'} />
          <InfoRow label="Statut" value="⏳ En attente de validation" />
          <InfoRow label="Expérience" value={`${candidate.experience_years || 0} ans`} />
          
          {candidate.specialties && candidate.specialties.length > 0 && (
            <div>
              <p className="text-sm font-medium" style={{ color: colors.text + '60' }}>Spécialités</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {candidate.specialties.map((spec) => (
                  <span key={spec} className="text-xs px-2 py-1 rounded-full" style={{ background: colors.primary + '10', color: colors.primary }}>{spec}</span>
                ))}
              </div>
            </div>
          )}

          {candidate.zones && candidate.zones.length > 0 && (
            <div>
              <p className="text-sm font-medium" style={{ color: colors.text + '60' }}>Zones d'intervention</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {candidate.zones.map((zone) => (
                  <span key={zone} className="text-xs px-2 py-1 rounded-full" style={{ background: '#2196F315', color: '#2196F3' }}>{zone}</span>
                ))}
              </div>
            </div>
          )}

          {candidate.bio && (
            <div className="p-3 rounded-xl" style={{ background: colors.primary + '05' }}>
              <p className="text-sm font-medium" style={{ color: colors.text }}>📝 Bio</p>
              <p className="text-sm" style={{ color: colors.text + '70' }}>{candidate.bio}</p>
            </div>
          )}

          <InfoRow label="Date de candidature" value={formatDate(candidate.created_at)} />

          <div className="space-y-3 pt-4 border-t" style={{ borderColor: colors.border }}>
            <p className="text-sm font-medium" style={{ color: colors.text }}>Actions</p>
            <div className="flex gap-3">
              <button onClick={() => onApprove(candidate)} disabled={isProcessing} className="flex-1 py-3 rounded-xl text-white font-bold transition hover:opacity-80 flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: '#4CAF50' }}>
                <ThumbsUp size={18} /> Approuver
              </button>
              <button onClick={() => onReject(candidate)} disabled={isProcessing} className="flex-1 py-3 rounded-xl text-white font-bold transition hover:opacity-80 flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: '#F44336' }}>
                <ThumbsDown size={18} /> Refuser
              </button>
            </div>
            <button onClick={() => onRequestInfo(candidate)} disabled={isProcessing} className="w-full py-2.5 rounded-xl font-medium transition hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: colors.primary + '10', color: colors.primary }}>
              <Mail size={18} /> Demander plus d'informations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================
// INFO ROW
// =============================================

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow = ({ label, value }: InfoRowProps) => {
  return (
    <div className="flex justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'var(--color-border, #e5e0d8)' }}>
      <span className="text-sm font-medium" style={{ color: 'var(--color-text-light, #6b7280)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--color-text, #2d2d2d)' }}>{value}</span>
    </div>
  );
};

export default AidantCandidatesPage;
