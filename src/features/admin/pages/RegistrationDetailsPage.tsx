// 📁 src/features/admin/pages/RegistrationDetailsPage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { InfoRow } from '@/components/ui/InfoRow';
import toast from 'react-hot-toast';

// ✅ URL UNIQUE
const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

interface Registration {
  id: string;
  user_id: string | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
  } | null;
  patient_data: any;
  offre_id: string | null;
  offre?: {
    id: string;
    name: string;
    price: number;
    category: string;
  } | null;
  status: 'en_attente' | 'validee' | 'refusee' | 'info_requise' | 'en_cours_de_traitement';
  comments: string | null;
  processed_by: string | null;
  processed_at: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    en_attente: 'En attente ⏳',
    validee: 'Validée ✅',
    refusee: 'Refusée ❌',
    info_requise: 'Info requise ℹ️',
    en_cours_de_traitement: 'En cours 🔄',
  };
  return labels[status] || status;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    en_attente: '#f59e0b',
    validee: '#10b981',
    refusee: '#ef4444',
    info_requise: '#3b82f6',
    en_cours_de_traitement: '#8b5cf6',
  };
  return colors[status] || '#94a3b8';
};

const RegistrationDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [comment, setComment] = useState('');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    if (id) fetchRegistration(id);
  }, [id]);

  const fetchRegistration = async (registrationId: string) => {
    try {
      setIsLoading(true);
      const { data: registrationData, error: registrationError } = await supabase
        .from('inscriptions')
        .select('*')
        .eq('id', registrationId)
        .single();

      if (registrationError) throw registrationError;

      let user = null;
      if (registrationData.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, role')
          .eq('id', registrationData.user_id)
          .single();
        user = profileData;
      }

      let offre = null;
      if (registrationData.offre_id) {
        const { data: offreData } = await supabase
          .from('offres')
          .select('id, name, price, category')
          .eq('id', registrationData.offre_id)
          .single();
        offre = offreData;
      }

      setRegistration({ ...registrationData, user, offre });
    } catch (error: any) {
      console.error('Fetch registration error:', error);
      toast.error('Erreur lors du chargement de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcess = async (status: 'validee' | 'refusee') => {
    if (!registration) return;
    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Token manquant');

      const response = await fetch(`${API_URL}/auth/admin/process-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          registrationId: registration.id,
          status,
          comments: comment || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur lors du traitement');

      toast.success(data.message || `Dossier traité`);
      fetchRegistration(registration.id);
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      toast.error(error.message || 'Erreur lors du traitement');
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

  if (!registration) {
    return <div className="p-8 text-center text-gray-400">Dossier introuvable</div>;
  }

  const isPending = registration.status === 'en_attente';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app/registrations')} className="p-1.5 hover:bg-gray-50 rounded-lg"><ArrowLeft size={16} /></button>
          <div>
            <h1 className="font-extrabold text-sm text-gray-800">Dossier #{registration.id.slice(0, 8)}</h1>
            <p className="text-[11px] text-gray-400">{registration.user?.full_name}</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full self-start sm:self-center" style={{ background: `${getStatusColor(registration.status)}12`, color: getStatusColor(registration.status) }}>
          {getStatusLabel(registration.status)}
        </span>
      </section>

      {/* Détails Utilisateur et Offre */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">👤 Informations Utilisateur</h3>
          <InfoRow label="Nom" value={registration.user?.full_name || 'N/A'} />
          <InfoRow label="Email" value={registration.user?.email || 'N/A'} />
          <InfoRow label="Téléphone" value={registration.user?.phone || 'N/A'} />
        </section>

        <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">📦 Formule Sélectionnée</h3>
          {registration.offre ? (
            <>
              <InfoRow label="Nom" value={registration.offre.name} />
              <InfoRow label="Tarif" value={formatCurrency(registration.offre.price)} />
              <InfoRow label="Période" value={registration.offre.category} />
            </>
          ) : (
            <p className="text-xs text-gray-400">Aucun abonnement présélectionné</p>
          )}
        </section>
      </div>

      {/* Patient Data */}
      {registration.patient_data && (
        <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">👶 Informations Patient</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(registration.patient_data).map(([key, value]) => (
              <InfoRow key={key} label={key.replace(/_/g, ' ')} value={String(value || 'N/A')} />
            ))}
          </div>
        </section>
      )}

      {/* Validation */}
      {isPending && (
        <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">✏️ Décision d'administration</h3>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Commentaire de traitement (optionnel, envoyé par email au client)"
            className="w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs resize-none"
            style={{ borderColor: colors.border, background: 'var(--color-background)' }}
            rows={2}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => handleProcess('refusee')}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
            >
              Refuser le dossier
            </button>
            <button
              onClick={() => handleProcess('validee')}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90"
              style={{ background: colors.primary }}
            >
              Valider le dossier
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default RegistrationDetailsPage;
