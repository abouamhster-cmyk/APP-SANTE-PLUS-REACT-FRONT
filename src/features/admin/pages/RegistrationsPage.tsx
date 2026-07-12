// 📁 src/features/admin/pages/RegistrationsPage.tsx
// ✅ PAGE DES INSCRIPTIONS : OPTIMISATION RESPONSIVE MOBILE ET ALIGNEMENT H-11 DES CONTRÔLES

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
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/helpers';
import { useRefreshableData } from '@/hooks/useRefreshableData';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

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

  const fetchRegistrations = async () => {
    try {
      setIsLoading(true);
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

  const { refreshAll, isRefreshing } = useRefreshableData({
    onRefresh: fetchRegistrations,
    onError: (error) => toast.error('Erreur lors du rafraîchissement des inscriptions'),
  });

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch =
      reg.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'en_attente').length,
    validated: registrations.filter(r => r.status === 'validee').length,
    refused: registrations.filter(r => r.status === 'refusee').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-8">
        <div className="h-24 bg-white rounded-3xl animate-pulse shadow-sm" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12 px-4 sm:px-0">
      <section 
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all border border-black/5"
        style={{ background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.primary}12 100%)` }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: colors.text }}>
              📋 Inscriptions & Dossiers
            </h1>
            <p className="text-xs font-semibold" style={{ color: colors.textLight }}>
              {stats.total} dossier{stats.total > 1 ? 's' : ''} • {stats.pending} en attente de validation
            </p>
          </div>
          
          <RefreshButton 
            onRefresh={() => {
              toast.success('Inscriptions actualisées');
            }}
          />
        </div>

        <div className="relative z-10 mt-4 flex flex-wrap gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
            <Users size={13} />
            Total: {stats.total}
          </div>
          {stats.pending > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700">
              <Clock size={13} />
              En attente: {stats.pending}
            </div>
          )}
          {stats.validated > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
              <CheckCircle size={13} />
              Validés: {stats.validated}
            </div>
          )}
          {stats.refused > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
              <XCircle size={13} />
              Refusés: {stats.refused}
            </div>
          )}
        </div>
      </section>

      {/* BARRE DE RECHERCHE - INTEGRATION DU FORMAT H-11 COHÉRENT */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, email..."
            className="w-full h-11 pl-11 pr-4 rounded-xl border outline-none bg-white border-gray-100 dark:border-gray-800/60 text-xs font-semibold focus:border-emerald-500/50 transition-all shadow-sm"
            style={{ color: colors.text }}
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 px-4 rounded-xl border outline-none text-xs font-semibold bg-white border-gray-100 dark:border-gray-800/60 shrink-0 sm:w-56 shadow-sm cursor-pointer focus:border-emerald-500/50 transition-all"
          style={{ color: colors.text }}
        >
          <option value="all">Tous les dossiers ({stats.total})</option>
          <option value="en_attente">⏳ En attente ({stats.pending})</option>
          <option value="validee">✅ Validés ({stats.validated})</option>
          <option value="refusee">❌ Refusés ({stats.refused})</option>
        </select>
      </section>

      {/* GRILLE LISTE D'INSCRIPTIONS */}
      <section className="bg-white rounded-3xl shadow-sm border border-gray-100/50 overflow-hidden divide-y" style={{ borderColor: colors.border }}>
        {filteredRegistrations.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs font-medium">
            {searchTerm || statusFilter !== 'all' 
              ? 'Aucun dossier ne correspond à votre recherche' 
              : 'Aucun dossier trouvé'}
          </div>
        ) : (
          filteredRegistrations.map((reg) => (
            <div
              key={reg.id}
              onClick={() => navigate(`/app/registrations/${reg.id}`)}
              className="p-4 hover:bg-gray-50/50 transition cursor-pointer flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-extrabold text-xs sm:text-sm" style={{ color: colors.text }}>
                  {reg.user?.full_name || 'Anonyme'}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider flex-wrap">
                  <span className="truncate max-w-[150px] sm:max-w-none">{reg.user?.email || 'Email inconnu'}</span>
                  <span>•</span>
                  <span 
                    className="font-black px-2 py-0.5 rounded-full text-[8px]"
                    style={{ 
                      background: getStatusColor(reg.status) + '15', 
                      color: getStatusColor(reg.status) 
                    }}
                  >
                    {getStatusLabel(reg.status)}
                  </span>
                  <span>•</span>
                  <span className="font-medium lowercase normal-case">{formatDate(reg.created_at)}</span>
                </div>
              </div>
              <button 
                className="p-2 rounded-xl hover:bg-gray-50 transition text-gray-400 hover:text-gray-600 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/app/registrations/${reg.id}`);
                }}
              >
                <Eye size={16} />
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default RegistrationsPage;
