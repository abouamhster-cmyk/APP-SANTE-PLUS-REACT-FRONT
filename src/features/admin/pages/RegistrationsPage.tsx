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
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  FileText,
  X,
  AlertCircle,
  Loader2,
  ThumbsUp,
  ThumbsDown,
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

const RegistrationsPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // ✅ États pour les modals
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [processAction, setProcessAction] = useState<'validate' | 'reject' | null>(null);
  const [processComment, setProcessComment] = useState('');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Récupérer les inscriptions
  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      setIsLoading(true);

      // 1. Récupérer les inscriptions
      const { data: inscriptions, error: inscriptionsError } = await supabase
        .from('inscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (inscriptionsError) throw inscriptionsError;

      // 2. Récupérer les profils
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

      // 3. Récupérer les offres
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

      // 4. Fusionner les données
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

  // ✅ Filtrer les inscriptions
  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch =
      reg.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // ✅ Statistiques
  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'en_attente').length,
    validated: registrations.filter(r => r.status === 'validee').length,
    rejected: registrations.filter(r => r.status === 'refusee').length,
  };

  // ✅ Ouvrir le modal de traitement
  const openProcessModal = (registration: Registration, action: 'validate' | 'reject') => {
    setSelectedRegistration(registration);
    setProcessAction(action);
    setProcessComment('');
    setShowProcessModal(true);
  };

  // ✅ Traiter une inscription
  const handleProcess = async () => {
    if (!selectedRegistration || !processAction) return;

    setIsProcessing(true);
    try {
      const status = processAction === 'validate' ? 'validee' : 'refusee';
      
      const { error } = await supabase
        .from('inscriptions')
        .update({
          status,
          comments: processComment || null,
          processed_by: profile?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', selectedRegistration.id);

      if (error) throw error;

      // Notification à l'utilisateur
      if (selectedRegistration.user_id) {
        await supabase.from('notifications').insert({
          user_id: selectedRegistration.user_id,
          title: status === 'validee' ? '✅ Inscription validée' : '❌ Inscription refusée',
          body: status === 'validee'
            ? `Votre inscription a été validée. Bienvenue chez Santé Plus Services !`
            : `Votre inscription a été refusée. ${processComment || 'Contactez-nous pour plus d\'informations.'}`,
          type: 'system',
          data: { registration_id: selectedRegistration.id, status },
        });
      }

      toast.success(`Inscription ${status === 'validee' ? 'validée' : 'refusée'} avec succès`);
      setShowProcessModal(false);
      setSelectedRegistration(null);
      setProcessAction(null);
      fetchRegistrations();
    } catch (error) {
      console.error('Process registration error:', error);
      toast.error('Erreur lors du traitement');
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Voir les détails
  const handleViewDetails = (registration: Registration) => {
    navigate(`/app/registrations/${registration.id}`);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black" style={{ color: colors.text }}>
              📋 Gestion des inscriptions
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
              Gérez les demandes d'inscription des familles et des aidants
            </p>
          </div>
          <button
            onClick={fetchRegistrations}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl font-medium transition hover:opacity-80 flex items-center gap-2"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </section>

      {/* Statistiques */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          color={colors.primary}
          icon={<Users size={20} />}
        />
        <StatCard
          label="En attente"
          value={stats.pending}
          color="#FF9800"
          icon={<Clock size={20} />}
        />
        <StatCard
          label="Validées"
          value={stats.validated}
          color="#4CAF50"
          icon={<CheckCircle size={20} />}
        />
        <StatCard
          label="Refusées"
          value={stats.rejected}
          color="#F44336"
          icon={<XCircle size={20} />}
        />
      </section>

      {/* Filtres */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, email ou ID..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border outline-none text-sm"
              style={{
                borderColor: colors.border,
                background: 'var(--color-background)',
                color: colors.text,
              }}
            />
          </div>
          <div className="relative min-w-[180px]">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border outline-none text-sm appearance-none"
              style={{
                borderColor: colors.border,
                background: 'var(--color-background)',
                color: colors.text,
              }}
            >
              <option value="all">Tous les statuts</option>
              <option value="en_attente">⏳ En attente</option>
              <option value="validee">✅ Validées</option>
              <option value="refusee">❌ Refusées</option>
              <option value="info_requise">ℹ️ Info requise</option>
              <option value="en_cours_de_traitement">🔄 En cours</option>
            </select>
          </div>
        </div>
      </section>

      {/* Liste des inscriptions */}
      <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 size={40} className="animate-spin mx-auto" style={{ color: colors.primary }} />
            <p className="mt-2 text-sm" style={{ color: colors.text + '60' }}>Chargement des inscriptions...</p>
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-bold" style={{ color: colors.text }}>
              Aucune inscription trouvée
            </h3>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {searchTerm || statusFilter !== 'all'
                ? 'Aucune inscription ne correspond à vos critères'
                : 'Aucune inscription n\'a encore été enregistrée'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: colors.primary + '04' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Utilisateur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Offre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Date
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.border }}>
                {filteredRegistrations.map((registration) => {
                  const isPending = registration.status === 'en_attente';
                  const statusColor = getStatusColor(registration.status);

                  return (
                    <tr key={registration.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: colors.primary }}
                          >
                            {registration.user?.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-sm" style={{ color: colors.text }}>
                              {registration.user?.full_name || 'Utilisateur inconnu'}
                            </p>
                            <p className="text-xs" style={{ color: colors.text + '40' }}>
                              {registration.user?.email || 'Email inconnu'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            background: registration.user?.role === 'aidant' ? '#2196F315' : '#4CAF5015',
                            color: registration.user?.role === 'aidant' ? '#2196F3' : '#4CAF50',
                          }}
                        >
                          {registration.user?.role === 'aidant' ? '🦸 Aidant' : '👨‍👩‍👦 Famille'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: colors.text + '60' }}>
                          {registration.offre?.name || 'Aucune offre'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium" style={{ color: statusColor }}>
                          {getStatusLabel(registration.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: colors.text + '50' }}>
                          {formatDate(registration.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* ✅ Bouton Détails */}
                          <button
                            className="p-2 rounded-lg hover:bg-gray-100 transition"
                            style={{ color: colors.primary }}
                            onClick={() => handleViewDetails(registration)}
                            title="Voir les détails"
                          >
                            <Eye size={16} />
                          </button>

                          {/* ✅ Boutons Valider/Refuser (uniquement pour les inscriptions en attente) */}
                          {isPending && (
                            <>
                              <button
                                className="p-2 rounded-lg hover:bg-green-50 transition"
                                style={{ color: '#4CAF50' }}
                                onClick={() => openProcessModal(registration, 'validate')}
                                title="Valider l'inscription"
                              >
                                <ThumbsUp size={16} />
                              </button>
                              <button
                                className="p-2 rounded-lg hover:bg-red-50 transition"
                                style={{ color: '#F44336' }}
                                onClick={() => openProcessModal(registration, 'reject')}
                                title="Refuser l'inscription"
                              >
                                <ThumbsDown size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ============================================ */}
      {/* MODAL DE TRAITEMENT */}
      {/* ============================================ */}
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
            <p className="text-center" style={{ color: colors.text }}>
              {processAction === 'validate'
                ? `Confirmez-vous la validation de l'inscription de ${selectedRegistration.user?.full_name || 'cet utilisateur'} ?`
                : `Confirmez-vous le refus de l'inscription de ${selectedRegistration.user?.full_name || 'cet utilisateur'} ?`
              }
            </p>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>
                Commentaire (optionnel)
              </label>
              <textarea
                value={processComment}
                onChange={(e) => setProcessComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="w-full px-4 py-3 rounded-xl border outline-none text-sm resize-none"
                style={{
                  borderColor: colors.border,
                  background: 'var(--color-background)',
                  color: colors.text,
                }}
                rows={3}
              />
            </div>

            {processAction === 'validate' && (
              <div className="p-3 rounded-xl" style={{ background: '#4CAF5010', border: '1px solid #4CAF5020' }}>
                <p className="text-sm text-green-600">
                  ✅ L'utilisateur recevra une notification de validation par email.
                </p>
              </div>
            )}

            {processAction === 'reject' && (
              <div className="p-3 rounded-xl" style={{ background: '#F4433610', border: '1px solid #F4433620' }}>
                <p className="text-sm text-red-600">
                  ⚠️ L'utilisateur recevra une notification de refus par email.
                </p>
              </div>
            )}
          </div>
        </Modal>
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
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: color + '15', color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default RegistrationsPage;