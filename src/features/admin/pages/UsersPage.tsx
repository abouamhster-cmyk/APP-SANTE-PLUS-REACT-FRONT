// 📁 src/features/admin/pages/UsersPage.tsx

import { useEffect, useState } from 'react';
import {
  User as UserIcon,
  Users,
  UserCheck,
  UserX,
  Search,
  Filter,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Shield,
  UserCog,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Award,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/helpers';
import toast from 'react-hot-toast';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { InfoRow } from '@/components/ui/InfoRow';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'family' | 'aidant' | 'coordinator' | 'admin';
  is_active: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  patient_category: string | null;
}

// ✅ Fonctions en dehors du composant
const getRoleLabel = (role: string): string => {
  const roles: Record<string, string> = {
    family: '👨‍👩‍👦 Famille',
    aidant: '🦸 Aidant',
    coordinator: '👔 Coordinateur',
    admin: '👑 Administrateur',
  };
  return roles[role] || role;
};

const getRoleColor = (role: string): string => {
  const colors: Record<string, string> = {
    family: '#4CAF50',
    aidant: '#2196F3',
    coordinator: '#FF9800',
    admin: '#9C27B0',
  };
  return colors[role] || '#9E9E9E';
};

const getStatusLabel = (isActive: boolean): string => {
  return isActive ? '🟢 Actif' : '🔴 Inactif';
};

const getStatusColor = (isActive: boolean): string => {
  return isActive ? '#4CAF50' : '#F44336';
};

const UsersPage = () => {
  const { profile, role } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Récupérer les utilisateurs
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error: any) {
      console.error('Fetch users error:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Filtrer les utilisateurs
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // ✅ Statistiques
  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    family: users.filter(u => u.role === 'family').length,
    aidant: users.filter(u => u.role === 'aidant').length,
    coordinator: users.filter(u => u.role === 'coordinator').length,
    admin: users.filter(u => u.role === 'admin').length,
  };

  // ✅ Voir les détails
  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setShowDetailsModal(true);
  };

  // ✅ Éditer un utilisateur
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setShowEditModal(true);
  };

  // ✅ Mettre à jour le rôle
  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Rôle mis à jour`);
      fetchUsers();
      setShowEditModal(false);
    } catch (error) {
      console.error('Update role error:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // ✅ Soumettre la mise à jour du rôle
  const handleUpdateRoleSubmit = async () => {
    if (!selectedUser) return;
    if (selectedRole === selectedUser.role) {
      toast('Aucun changement', { icon: 'ℹ️' });
      return;
    }

    setIsProcessing(true);
    try {
      await handleUpdateRole(selectedUser.id, selectedRole);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Basculer le statut actif/inactif
  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Utilisateur ${!currentStatus ? 'activé' : 'désactivé'}`);
      fetchUsers();
    } catch (error) {
      console.error('Toggle status error:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // ✅ Supprimer un utilisateur
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      toast.success('Utilisateur supprimé');
      fetchUsers();
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // ✅ Rôles pour le select
  const roles = [
    { value: 'family', label: '👨‍👩‍👦 Famille' },
    { value: 'aidant', label: '🦸 Aidant' },
    { value: 'coordinator', label: '👔 Coordinateur' },
    { value: 'admin', label: '👑 Administrateur' },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black" style={{ color: colors.text }}>
              👥 Gestion des utilisateurs
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
              Gérez tous les utilisateurs de la plateforme
            </p>
          </div>
          <button
            onClick={fetchUsers}
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
      <section className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          color={colors.primary}
          icon={<Users size={20} />}
        />
        <StatCard
          label="Actifs"
          value={stats.active}
          color="#4CAF50"
          icon={<UserCheck size={20} />}
        />
        <StatCard
          label="Inactifs"
          value={stats.inactive}
          color="#F44336"
          icon={<UserX size={20} />}
        />
        <StatCard
          label="Familles"
          value={stats.family}
          color="#4CAF50"
          icon={<Users size={20} />}
        />
        <StatCard
          label="Aidants"
          value={stats.aidant}
          color="#2196F3"
          icon={<Award size={20} />}
        />
        <StatCard
          label="Admins"
          value={stats.admin + stats.coordinator}
          color="#9C27B0"
          icon={<Shield size={20} />}
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
              placeholder="Rechercher par nom, email ou téléphone..."
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
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border outline-none text-sm appearance-none"
              style={{
                borderColor: colors.border,
                background: 'var(--color-background)',
                color: colors.text,
              }}
            >
              <option value="all">Tous les rôles</option>
              <option value="family">👨‍👩‍👦 Familles</option>
              <option value="aidant">🦸 Aidants</option>
              <option value="coordinator">👔 Coordinateurs</option>
              <option value="admin">👑 Administrateurs</option>
            </select>
          </div>
        </div>
      </section>

      {/* Liste des utilisateurs */}
      <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-t-transparent" style={{ borderColor: colors.primary }} />
            <p className="mt-2 text-sm" style={{ color: colors.text + '60' }}>Chargement des utilisateurs...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-bold" style={{ color: colors.text }}>
              Aucun utilisateur trouvé
            </h3>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {searchTerm || roleFilter !== 'all'
                ? 'Aucun utilisateur ne correspond à vos critères'
                : 'Aucun utilisateur n\'a encore été enregistré'}
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
                    Rôle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Vérifié
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.border }}>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: colors.primary }}
                        >
                          {user.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-sm" style={{ color: colors.text }}>
                            {user.full_name || 'Utilisateur inconnu'}
                          </p>
                          <p className="text-xs" style={{ color: colors.text + '40' }}>
                            {user.email || 'Email inconnu'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{
                          background: getRoleColor(user.role) + '15',
                          color: getRoleColor(user.role),
                        }}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-medium"
                        style={{ color: getStatusColor(user.is_active) }}
                      >
                        {getStatusLabel(user.is_active)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs">
                        {user.email_verified ? '✅ Email' : '❌ Email'}
                        {user.phone_verified ? ' ✅ Tél' : ' ❌ Tél'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: colors.text + '50' }}>
                        {formatDate(user.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-2 rounded-lg hover:bg-gray-100 transition"
                          style={{ color: colors.primary }}
                          onClick={() => handleViewDetails(user)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-gray-100 transition"
                          style={{ color: '#2196F3' }}
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-gray-100 transition"
                          style={{ color: user.is_active ? '#F44336' : '#4CAF50' }}
                          onClick={() => handleToggleStatus(user.id, user.is_active)}
                        >
                          {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-red-50 transition"
                          style={{ color: '#F44336' }}
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ============================================ */}
      {/* MODAL DÉTAILS UTILISATEUR */}
      {/* ============================================ */}
      {showDetailsModal && selectedUser && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="👤 Détails de l'utilisateur"
          description={`ID: ${selectedUser.id?.slice(0, 8)}...`}
          icon={<UserIcon size={24} />}
          maxWidth="2xl"
          actions={
            <ModalActions
              onCancel={() => setShowDetailsModal(false)}
              cancelLabel="Fermer"
            />
          }
        >
          <div className="space-y-4">
            {/* Avatar et nom */}
            <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: colors.border }}>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ background: colors.primary }}
              >
                {selectedUser.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: colors.text }}>
                  {selectedUser.full_name || 'Utilisateur inconnu'}
                </p>
                <p className="text-sm" style={{ color: colors.text + '60' }}>
                  {selectedUser.email || 'Email inconnu'}
                </p>
              </div>
            </div>

            {/* Informations */}
            <InfoRow label="ID" value={selectedUser.id} />
            <InfoRow label="Nom complet" value={selectedUser.full_name || 'N/A'} />
            <InfoRow label="Email" value={selectedUser.email || 'N/A'} />
            <InfoRow label="Téléphone" value={selectedUser.phone || 'N/A'} />
            <InfoRow 
              label="Rôle" 
              value={getRoleLabel(selectedUser.role)} 
              highlight 
            />
            <InfoRow 
              label="Statut" 
              value={getStatusLabel(selectedUser.is_active)} 
              color={selectedUser.is_active ? '#4CAF50' : '#F44336'}
            />
            <InfoRow 
              label="Email vérifié" 
              value={selectedUser.email_verified ? '✅ Oui' : '❌ Non'} 
            />
            <InfoRow 
              label="Téléphone vérifié" 
              value={selectedUser.phone_verified ? '✅ Oui' : '❌ Non'} 
            />
            {selectedUser.patient_category && (
              <InfoRow 
                label="Catégorie patient" 
                value={selectedUser.patient_category === 'maman_bebe' ? '👶 Maman & Bébé' : '👴 Senior'} 
              />
            )}
            <InfoRow label="Date d'inscription" value={formatDate(selectedUser.created_at)} />
            <InfoRow label="Dernière mise à jour" value={formatDate(selectedUser.updated_at)} />
          </div>
        </Modal>
      )}

      {/* ============================================ */}
      {/* MODAL ÉDITION UTILISATEUR */}
      {/* ============================================ */}
      {showEditModal && selectedUser && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="✏️ Modifier le rôle"
          description={selectedUser.full_name || 'Utilisateur inconnu'}
          icon={<UserCog size={24} />}
          maxWidth="md"
          actions={
            <ModalActions
              onCancel={() => setShowEditModal(false)}
              onConfirm={handleUpdateRoleSubmit}
              confirmLabel="Mettre à jour"
              isLoading={isProcessing}
            />
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: colors.text }}>
                Nouveau rôle
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border outline-none text-sm"
                style={{
                  borderColor: colors.border,
                  background: 'var(--color-background)',
                  color: colors.text,
                }}
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
              <p className="text-sm" style={{ color: colors.text + '70' }}>
                ⚠️ Changer le rôle d'un utilisateur affecte ses permissions sur la plateforme.
              </p>
            </div>
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

export default UsersPage;