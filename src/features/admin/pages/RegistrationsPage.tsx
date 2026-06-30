// 📁 src/features/admin/pages/RegistrationsPage.tsx
 
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/helpers';
import toast from 'react-hot-toast';

// ✅ URL UNIQUE (pour les appels API si besoin)
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
  source: string;
  created_at: string;
  updated_at: string;
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    en_attente: 'En attente',
    validee: 'Validée',
    refusee: 'Refusée',
  };
  return labels[status] || status;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    en_attente: '#f59e0b',
    validee: '#10b981',
    refusee: '#ef4444',
  };
  return colors[status] || '#94a3b8';
};

const RegistrationsPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      setIsLoading(true);
      // ✅ Utilisation directe de Supabase (pas de localStorage)
      const { data: inscriptions, error: inscriptionsError } = await supabase
        .from('inscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (inscriptionsError) throw inscriptionsError;

      const userIds = [...new Set(inscriptions?.map(i => i.user_id).filter(Boolean))];
      let profileMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, role')
          .in('id', userIds);

        if (!profilesError && profiles) {
          profileMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const registrationsWithData = (inscriptions || []).map(reg => ({
        ...reg,
        user: reg.user_id ? profileMap[reg.user_id] || null : null,
      }));

      setRegistrations(registrationsWithData);
    } catch (error: any) {
      console.error('Fetch registrations error:', error);
      toast.error('Erreur lors du chargement des inscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch =
      reg.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-8">
        <div className="h-24 bg-white rounded-3xl animate-pulse shadow-sm" />
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
              📋 Inscriptions et dossiers
            </h1>
            <p className="text-xs" style={{ color: colors.textLight }}>
              Suivi et administration des demandes de souscription
            </p>
          </div>
          <button
            onClick={fetchRegistrations}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border bg-white hover:bg-gray-50"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>
      </section>

      {/* Recherche et Filtres */}
      <section className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col sm:flex-row gap-3">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par nom, email..."
          className="flex-1 px-3.5 py-2 rounded-xl border outline-none text-xs"
          style={{ borderColor: colors.border, background: 'var(--color-background)' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl border outline-none text-xs"
          style={{ borderColor: colors.border, background: 'var(--color-background)', color: colors.text }}
        >
          <option value="all">Tous les dossiers</option>
          <option value="en_attente">⏳ En attente</option>
          <option value="validee">✅ Validés</option>
          <option value="refusee">❌ Refusés</option>
        </select>
      </section>

      {/* Liste épurée */}
      <section className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden divide-y" style={{ borderColor: colors.border }}>
        {filteredRegistrations.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Aucun dossier trouvé</div>
        ) : (
          filteredRegistrations.map((reg) => (
            <div
              key={reg.id}
              onClick={() => navigate(`/app/registrations/${reg.id}`)}
              className="p-4 hover:bg-gray-50/50 transition cursor-pointer flex items-center justify-between gap-4"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="font-bold text-xs" style={{ color: colors.text }}>{reg.user?.full_name || 'Anonyme'}</p>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-wrap">
                  <span>{reg.user?.email}</span>
                  <span>•</span>
                  <span className="font-semibold" style={{ color: getStatusColor(reg.status) }}>{getStatusLabel(reg.status)}</span>
                  <span>•</span>
                  <span>{formatDate(reg.created_at)}</span>
                </div>
              </div>
              <button className="p-1.5 rounded-lg text-gray-400"><Eye size={14} /></button>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default RegistrationsPage;
