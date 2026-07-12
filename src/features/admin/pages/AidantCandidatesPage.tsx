// 📁 src/features/admin/pages/AidantCandidatesPage.tsx
// ✅ PAGE CANDIDATS : ALIGNEMENTS DE BOUTONS PARFAITEMENT STACKES SUR MOBILE SANS OVERFLOW

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/helpers';
import { UserCheck, Check, X, Loader2, Eye, MapPin, Briefcase } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CandidateDetailsModal } from '../components/CandidateDetailsModal';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<AidantCandidate | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setIsLoading(true);
      const { data: aidants, error: aidantsError } = await supabase
        .from('aidants')
        .select('*')
        .eq('status', 'pending');

      if (aidantsError) throw aidantsError;

      const userIds = (aidants || []).map((a: any) => a.user_id).filter(Boolean);
      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, role, avatar_url')
          .in('id', userIds);

        if (!profilesError && profiles) {
          profilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      const candidatesWithUser = (aidants || []).map((aidant: any) => ({
        ...aidant,
        user: aidant.user_id ? profilesMap[aidant.user_id] || null : null,
      }));

      setCandidates(candidatesWithUser);
    } catch (error: any) {
      console.error('Erreur fetch candidates:', error);
      toast.error(error.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (candidate: AidantCandidate) => {
    const name = candidate.user?.full_name || 'ce candidat';
    if (!window.confirm(`Approuver ${name} ?`)) return;

    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Token manquant');

      const response = await fetch(`${API_URL}/auth/admin/approve-aidant`, {
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
      if (!response.ok) throw new Error(data.error || 'Erreur lors de l\'approbation');

      toast.success(data.message || 'Aidant approuvé avec succès');
      setShowDetailsModal(false);
      fetchCandidates();
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      toast.error(error.message || 'Erreur lors de l\'approbation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (candidate: AidantCandidate) => {
    const name = candidate.user?.full_name || 'ce candidat';
    const reason = prompt('Motif du refus :');
    if (reason === null) return;
    if (!window.confirm(`Refuser ${name} ?`)) return;

    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Token manquant');

      const response = await fetch(`${API_URL}/auth/admin/reject-aidant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          aidantId: candidate.id,
          comments: reason || 'Candidature refusée',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur lors du refus');

      toast.success(data.message || 'Aidant refusé avec succès');
      setShowDetailsModal(false);
      fetchCandidates();
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      toast.error(error.message || 'Erreur lors du refus');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="animate-spin text-gray-300" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 px-4 sm:px-0">
      {/* Header */}
      <section 
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all border border-black/5"
        style={{ background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.primary}12 100%)` }}
      >
        <div className="relative z-10">
          <h1 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: colors.text }}>
            🦸 Candidatures Aidants
          </h1>
          <p className="text-xs font-semibold mt-0.5 text-gray-400">
            {candidates.length} dossier{candidates.length > 1 ? 's' : ''} en attente de vérification administrative
          </p>
        </div>
      </section>

      {candidates.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm max-w-sm mx-auto">
          <p className="text-xs font-bold text-gray-400">Aucun dossier en attente d'approbation</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {candidates.map((candidate) => (
            <div 
              key={candidate.id} 
              className="bg-white rounded-3xl p-5 shadow-sm border flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-[var(--color-primary)]/30 border-gray-100"
              onClick={() => {
                setSelectedCandidate(candidate);
                setShowDetailsModal(true);
              }}
            >
              <div className="space-y-2.5 flex-1 min-w-0">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-gray-800">{candidate.user?.full_name || 'Candidat Anonyme'}</h3>
                  <p className="text-[11px] text-gray-400 font-semibold">{candidate.user?.email} · {candidate.user?.phone || 'Pas de numéro'}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {candidate.specialties?.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider" style={{ background: `${colors.primary}08`, color: colors.primary }}>
                      {s === 'maman_bebe' ? '👶 Maman' :
                       s === 'senior' ? '👴 Senior' :
                       s === 'accompagnement' ? '🤝 Accompagnement' :
                       s}
                    </span>
                  ))}
                  {candidate.zones && candidate.zones.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100/50 flex items-center gap-1 shrink-0">
                      <MapPin size={10} /> {candidate.zones[0]}{candidate.zones.length > 1 ? ` +${candidate.zones.length - 1}` : ''}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-50 text-gray-500 border">
                    Expérience : {candidate.experience_years ? `${candidate.experience_years} ans` : 'Non renseignée'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${candidate.available ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {candidate.available ? '🟢 Disponible' : '🔴 Indisponible'}
                  </span>
                </div>

                {candidate.bio && (
                  <p className="text-xs text-gray-500 leading-relaxed italic border-l-2 pl-2 truncate max-w-[250px] sm:max-w-md" style={{ borderColor: colors.primary }}>
                    "{candidate.bio}"
                  </p>
                )}
                
                <p className="text-[10px] text-gray-400 font-bold">Soumis le {formatDate(candidate.created_at)}</p>
              </div>

              {/* ✅ ACTIONS RESPONSIVES : Évite les sorties de bloc sur mobile */}
              <div className="flex items-center justify-end gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 shrink-0 flex-wrap">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReject(candidate);
                  }}
                  disabled={isProcessing}
                  className="px-4 h-9 rounded-xl text-xs font-bold bg-gray-50 text-red-500 hover:bg-red-50 transition-all border flex items-center gap-1.5"
                >
                  <X size={12} /> Refuser
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApprove(candidate);
                  }}
                  disabled={isProcessing}
                  className="px-4 h-9 rounded-xl text-white text-xs font-extrabold transition-opacity hover:opacity-90 flex items-center gap-1.5 shadow-sm"
                  style={{ background: colors.primary }}
                >
                  <Check size={12} /> Approuver
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCandidate(candidate);
                    setShowDetailsModal(true);
                  }}
                  className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors border border-gray-100"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Détails */}
      {showDetailsModal && selectedCandidate && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCandidate(null);
          }}
          title="🦸 Détails de la candidature"
          maxWidth="2xl"
        >
          <CandidateDetailsModal
            candidate={selectedCandidate}
            onApprove={() => handleApprove(selectedCandidate)}
            onReject={() => handleReject(selectedCandidate)}
            colors={colors}
            isProcessing={isProcessing}
          />
        </Modal>
      )}
    </div>
  );
};

export default AidantCandidatesPage;
