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
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/helpers';
import { Modal, ModalActions } from '@/components/ui/Modal';
import toast from 'react-hot-toast';

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

// ✅ Fonctions de statut
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    en_attente: '⏳ En attente',
    validee: '✅ Validée',
    refusee: '❌ Refusée',
    info_requise: 'ℹ️ Info requise',
    en_cours_de_traitement: '🔄 En cours',
  };
  return labels[status] || status;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    en_attente: '#FF9800',
    validee: '#4CAF50',
    refusee: '#F44336',
    info_requise: '#2196F3',
    en_cours_de_traitement: '#9C27B0',
  };
  return colors[status] || '#9E9E9E';
};

// ✅ Options de filtre
const statusOptions = [
  { value: 'all', label: 'Tous' },
  { value: 'en_attente', label: '⏳ En attente' },
  { value: 'validee', label: '✅ Validées' },
  { value: 'refusee', label: '❌ Refusées' },
  { value: 'info_requise', label: 'ℹ️ Info requise' },
  { value: 'en_cours_de_traitement', label: '🔄 En cours' },
];

const RegistrationsPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [processAction, setProcessAction] = useState<'validate' | 'reject' | null>(null);
  const [processComment, setProcessComment] = useState('');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchRegistrations();
  }, []);

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

      const offreIds = [...new Set(inscriptions?.map(i => i.offre_id).filter(Boolean))];
      let offreMap: Record<string, any> = {};

      if (offreIds.length > 0) {
        const { data: offres, error: offresError } = await supabase
          .from('offres')
          .select('id, name, price, category')
          .in('id', offreIds);

        if (!offresError && offres) {
          offreMap = offres.reduce((acc, o) => {
            acc[o.id] = o;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const registrationsWithData = (inscriptions || []).map(reg => ({
        ...reg,
        user: reg.user_id ? profileMap[reg.user_id] || null : null,
        offre: reg.offre_id ? offreMap[reg.offre_id] || null : null,
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

  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'en_attente').length,
    validated: registrations.filter(r => r.status === 'validee').length,
    rejected: registrations.filter(r => r.status === 'refusee').length,
  };

  const openProcessModal = (registration: Registration, action: 'validate' | 'reject') => {
    setSelectedRegistration(registration);
    setProcessAction(action);
    setProcessComment('');
    setShowProcessModal(true);
  };

  const handleProcess = async () => {
    if (!selectedRegistration || !processAction) return;

    setIsProcessing(true);
    try {
      const status = processAction === 'validate' ? 'validee' : 'refusee';

      const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-'));
      if (!storageKey) throw new Error('Session non trouvée');

      const session = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const token = session?.access_token;

      if (!token) throw new Error('Token manquant');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/admin/process-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registrationId: selectedRegistration.id,
          status,
          comments: processComment || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du traitement');
      }

      toast.success(data.message || `Inscription ${status === 'validee' ? 'validée' : 'refusée'}`);

      if (data.email_sent === false) {
        toast.error('⚠️ L\'email n\'a pas pu être envoyé');
      }

      setShowProcessModal(false);
      setSelectedRegistration(null);
      setProcessAction(null);
      setProcessComment('');
      fetchRegistrations();
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      toast.error(error.message || 'Erreur lors du traitement');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDetails = (registration: Registration) => {
    navigate(`/app/registrations/${registration.id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-16 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-12 bg-white rounded-xl animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-16 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 sm:pb-10">
      {/* HEADER */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-1.5"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <Users size={12} />
              Inscriptions
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              📋 Inscriptions
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {stats.total} inscription{stats.total > 1 ? 's' : ''} au total
            </p>
          </div>

          <button
            onClick={fetchRegistrations}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </section>

      {/* STATS COMPACTES */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <CompactStat
          icon={<Users size={14} />}
          label="Total"
          value={stats.total}
          color={colors.primary}
        />
        <CompactStat
          icon={<Clock size={14} />}
          label="En attente"
          value={stats.pending}
          color="#FF9800"
        />
        <CompactStat
          icon={<CheckCircle size={14} />}
          label="Validées"
          value={stats.validated}
          color="#4CAF50"
        />
        <CompactStat
          icon={<XCircle size={14} />}
          label="Refusées"
          value={stats.rejected}
          color="#F44336"
        />
      </section>

      {/* RECHERCHE + FILTRE */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, email..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-gray-50 outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
            />
          </div>

          <div className="relative min-w-[120px]">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-gray-50 outline-none appearance-none"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* LISTE */}
      {filteredRegistrations.length > 0 ? (
        <section className="space-y-2">
          {filteredRegistrations.map((registration) => {
            const isPending = registration.status === 'en_attente';
            const statusColor = getStatusColor(registration.status);

            return (
              <div
                key={registration.id}
                className="bg-white rounded-xl p-3 shadow-sm border border-black/5 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: colors.primary }}
                  >
                    {registration.user?.full_name?.charAt(0) || 'U'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: colors.text }}>
                      {registration.user?.full_name || 'Utilisateur inconnu'}
                    </p>
                    <div className="flex items-center gap-2 text-xs" style={{ color: colors.text + '50' }}>
                      <span>{registration.user?.email || 'Email inconnu'}</span>
                      <span>•</span>
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                        style={{
                          background: statusColor + '15',
                          color: statusColor,
                        }}
                      >
                        {getStatusLabel(registration.status)}
                      </span>
                      <span>•</span>
                      <span>{formatDate(registration.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                      style={{ color: colors.primary }}
                      onClick={() => handleViewDetails(registration)}
                      title="Voir les détails"
                    >
                      <Eye size={16} />
                    </button>

                    {isPending && (
                      <>
                        <button
                          className="p-1.5 rounded-lg hover:bg-green-50 transition"
                          style={{ color: '#4CAF50' }}
                          onClick={() => openProcessModal(registration, 'validate')}
                          title="Valider"
                        >
                          <ThumbsUp size={16} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-red-50 transition"
                          style={{ color: '#F44336' }}
                          onClick={() => openProcessModal(registration, 'reject')}
                          title="Refuser"
                        >
                          <ThumbsDown size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="bg-white rounded-2xl p-6 text-center shadow-sm border border-black/5">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            <Users size={24} />
          </div>

          <h3 className="text-base font-bold" style={{ color: colors.text }}>
            {searchTerm || statusFilter !== 'all'
              ? 'Aucune inscription trouvée'
              : 'Aucune inscription'}
          </h3>

          <p className="text-xs mt-1 text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? 'Aucune inscription ne correspond à vos critères.'
              : 'Aucune inscription n\'a encore été enregistrée.'}
          </p>
        </section>
      )}

      {/* MODAL DE TRAITEMENT */}
      {showProcessModal && selectedRegistration && processAction && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowProcessModal(false);
            setSelectedRegistration(null);
            setProcessAction(null);
          }}
          title={processAction === 'validate' ? '✅ Valider l\'inscription' : '❌ Refuser l\'inscription'}
          icon={processAction === 'validate' ? <CheckCircle size={24} /> : <XCircle size={24} />}
          maxWidth="md"
          actions={
            <ModalActions
              onCancel={() => {
                setShowProcessModal(false);
                setSelectedRegistration(null);
                setProcessAction(null);
              }}
              onConfirm={handleProcess}
              confirmLabel={processAction === 'validate' ? 'Valider' : 'Refuser'}
              isLoading={isProcessing}
              confirmColor={processAction === 'validate' ? '#4CAF50' : '#F44336'}
            />
          }
        >
          <div className="space-y-4">
            <p className="text-center text-sm" style={{ color: colors.text }}>
              {processAction === 'validate'
                ? `Confirmez-vous la validation de l'inscription de ${selectedRegistration.user?.full_name || 'cet utilisateur'} ?`
                : `Confirmez-vous le refus de l'inscription de ${selectedRegistration.user?.full_name || 'cet utilisateur'} ?`}
            </p>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>
                Commentaire (optionnel)
              </label>
              <textarea
                value={processComment}
                onChange={(e) => setProcessComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="w-full px-3 py-2 text-sm rounded-xl border outline-none resize-none"
                style={{
                  borderColor: colors.border,
                  background: 'var(--color-background)',
                  color: colors.text,
                }}
                rows={2}
              />
            </div>

            {processAction === 'validate' && (
              <div className="p-2 rounded-xl text-center text-xs text-green-600" style={{ background: '#4CAF5010' }}>
                ✅ L'utilisateur recevra une notification de validation par email.
              </div>
            )}

            {processAction === 'reject' && (
              <div className="p-2 rounded-xl text-center text-xs text-red-600" style={{ background: '#F4433610' }}>
                ⚠️ L'utilisateur recevra une notification de refus par email.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

// =============================================
// COMPACT STAT
// =============================================

interface CompactStatProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

const CompactStat = ({ icon, label, value, color }: CompactStatProps) => {
  return (
    <div className="bg-white rounded-xl p-2.5 shadow-sm border border-black/5">
      <div className="flex items-center justify-between gap-1">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className="text-lg font-bold mt-0.5" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: color + '14', color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default RegistrationsPage;
