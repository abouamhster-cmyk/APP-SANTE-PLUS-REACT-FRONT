// 📁 src/features/admin/pages/AidantCandidatesPage.tsx
 
import { useEffect, useState } from 'react';
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
  const [isProcessing, setIsProcessing] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchCandidates();
  }, []);

  // ✅ REQUÊTE CORRIGÉE - En deux étapes
  const fetchCandidates = async () => {
    try {
      setIsLoading(true);

      // Étape 1 : Récupérer les aidants en attente
      const { data: aidants, error: aidantsError } = await supabase
        .from('aidants')
        .select('*')
        .eq('status', 'pending');

      if (aidantsError) throw aidantsError;

      // Étape 2 : Récupérer les profils des utilisateurs
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

      // Étape 3 : Fusionner
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

  // ✅ APPROUVER
  const handleApprove = async (candidate: AidantCandidate) => {
    const name = candidate.user?.full_name || 'ce candidat';
    if (!window.confirm(`Approuver ${name} ?`)) return;

    setIsProcessing(true);
    try {
      const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-'));
      if (!storageKey) throw new Error('Session non trouvée');
      
      const session = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const token = session?.access_token;

      if (!token) throw new Error('Token manquant');

      console.log('🟢 [APPROVE] Candidat:', candidate.id);

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
      console.log('🟢 [APPROVE] Réponse:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'approbation');
      }

      toast.success(data.message || '✅ Aidant approuvé avec succès');
      
      if (data.email_sent === false) {
        toast.error('⚠️ L\'email n\'a pas pu être envoyé');
      }

      fetchCandidates();
      
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      toast.error(error.message || 'Erreur lors de l\'approbation');
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ REFUSER
  const handleReject = async (candidate: AidantCandidate) => {
    const name = candidate.user?.full_name || 'ce candidat';
    const reason = prompt('Motif du refus :');
    if (reason === null) return;
    if (!window.confirm(`Refuser ${name} ?`)) return;

    setIsProcessing(true);
    try {
      const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-'));
      if (!storageKey) throw new Error('Session non trouvée');
      
      const session = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const token = session?.access_token;

      if (!token) throw new Error('Token manquant');

      console.log('🟢 [REJECT] Candidat:', candidate.id);

      const response = await fetch('https://app-sante-plus-react.onrender.com/api/auth/admin/reject-aidant', {
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
      console.log('🟢 [REJECT] Réponse:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du refus');
      }

      toast.success(data.message || '❌ Aidant refusé avec succès');
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
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{ borderColor: colors.primary }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <h1 className="text-2xl font-black" style={{ color: colors.text }}>
          🦸 Candidatures Aidants
        </h1>
        <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
          {candidates.length} candidat{candidates.length > 1 ? 's' : ''} en attente
        </p>
      </section>

      {candidates.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-black/5">
          <p className="text-lg font-medium" style={{ color: colors.text }}>Aucun candidat en attente</p>
          <p className="text-sm text-gray-500 mt-1">Toutes les candidatures ont été traitées</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg" style={{ color: colors.text }}>
                    {candidate.user?.full_name || 'Inconnu'}
                  </h3>
                  <p className="text-sm text-gray-500">{candidate.user?.email}</p>
                  <p className="text-sm text-gray-500">Spécialités: {candidate.specialties?.join(', ') || 'Aucune'}</p>
                  <p className="text-sm text-gray-500">Zones: {candidate.zones?.join(', ') || 'Aucune'}</p>
                  <p className="text-xs text-gray-400 mt-1">Candidature: {formatDate(candidate.created_at)}</p>
                  {candidate.bio && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{candidate.bio}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleApprove(candidate)}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-xl text-white font-bold text-sm bg-green-500 hover:bg-green-600 disabled:opacity-50"
                  >
                    ✅ Approuver
                  </button>
                  <button
                    onClick={() => handleReject(candidate)}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-xl text-white font-bold text-sm bg-red-500 hover:bg-red-600 disabled:opacity-50"
                  >
                    ❌ Refuser
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AidantCandidatesPage;
