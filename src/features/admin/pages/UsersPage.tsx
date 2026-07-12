// 📁 src/features/admin/pages/UsersPage.tsx
// ✅ PAGE UTILISATEURS : OPTIMISATION RESPONSIVE SANS COMPRESSION DES DETAILS ET DES ACTIONS

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Shield,
  XCircle,
  Loader2,
} from 'lucide-react';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/helpers';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { InfoRow } from '@/components/ui/InfoRow';
import { useRefreshableData } from '@/hooks/useRefreshableData';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

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
  patient_category: string | null;
}

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

const roleOptions = [
  { value: 'all', label: 'Tous les rôles' },
  { value: 'family', label: '👨‍👩‍👦 Famille' },
  { value: 'aidant', label: '🦸 Aidant' },
  { value: 'coordinator', label: '👔 Coordinateur' },
  { value: 'admin', label: '👑 Administrateur' },
];

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

  const { refreshAll, isRefreshing } = useRefreshableData({
    onRefresh: fetchUsers,
    onError: (error) => toast.error('Erreur lors du rafraîchissement des utilisateurs'),
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    family: users.filter(u => u.role === 'family').length,
    aidant: users.filter(u => u.role === 'aidant').length,
    admin: users.filter(u => u.role === 'admin' || u.role === 'coordinator').length,
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setShowEditModal(true);
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Rôle mis à jour');
      await fetchUsers();
      setShowEditModal(false);
    } catch (error) {
      console.error('Update role error:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

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

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Utilisateur ${!currentStatus ? 'activé' : 'désactivé'}`);
      await fetchUsers();
    } catch (error) {
      console.error('Toggle status error:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');
      
      toast.success('Utilisateur supprimé');
      await fetchUsers();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
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
    <div className="space-y-4 pb-24 sm:pb-10 px-4 sm:px-0">
      {/* HEADER */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-1.5"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <Users size={12} />
              Utilisateurs
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              👥 Utilisateurs
            </h1>

            <p className="text-xs mt-0.5 text-gray-400 font-semibold">
              {stats.total} utilisateur{stats.total > 1 ? 's' : ''} au total
            </p>
          </div>

          <RefreshButton 
            onRefresh={() => {
              toast.success('Utilisateurs actualisés');
            }}
          />
        </div>
      </section>

      {/* COMPACT STATS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <CompactStat
          icon={<Users size={14} />}
          label="Total"
          value={stats.total}
          color={colors.primary}
        />
        <CompactStat
          icon={<UserCheck size={14} />}
          label="Actifs"
          value={stats.active}
          color="#4CAF50"
        />
        <CompactStat
          icon={<UserX size={14} />}
          label="Inactifs"
          value={stats.inactive}
          color="#F44336"
        />
        <CompactStat
          icon={<Shield size={14} />}
          label="Admins"
          value={stats.admin}
          color="#9C27B0"
        />
      </section>

      {/* BARRE DE CONTRÔLES H-11 COHÉRENTE */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, email..."
              className="w-full h-11 pl-11 pr-4 rounded-xl border outline-none bg-gray-50/50 border-gray-100 dark:border-gray-800/60 text-xs font-semibold focus:border-emerald-500/50 transition-all shadow-sm"
              style={{ color: colors.text }}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-11 px-4 rounded-xl border outline-none text-xs font-semibold bg-white border-gray-100 dark:border-gray-800/60 shrink-0 sm:w-56 shadow-sm cursor-pointer focus:border-emerald-500/50 transition-all"
            style={{ color: colors.text }}
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* LISTE DES UTILISATEURS ADAPTATIVE */}
      {filteredUsers.length > 0 ? (
        <section className="space-y-2.5">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0 shadow-inner"
                  style={{ background: colors.primary }}
                >
                  {user.full_name?.charAt(0) || 'U'}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-sm text-gray-800 dark:text-gray-100 truncate">
                    {user.full_name || 'Utilisateur inconnu'}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider flex-wrap mt-0.5">
                    <span className="truncate max-w-[130px] sm:max-w-none">{user.email || 'Email inconnu'}</span>
                    <span>•</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-black"
                      style={{
                        background: getRoleColor(user.role) + '15',
                        color: getRoleColor(user.role),
                      }}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                    <span>•</span>
                    <span style={{ color: user.is_active ? '#4CAF50' : '#F44336' }}>
                      {getStatusLabel(user.is_active)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTIONS PANEL RESPONSIVE : Séparateur et boutons larges sur mobile */}
              <div className="flex items-center justify-end gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                <button
                  onClick={() => handleViewDetails(user)}
                  className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors border border-gray-100"
                  title="Détails"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => handleEditUser(user)}
                  className="p-2 rounded-xl bg-blue-50/50 hover:bg-blue-100 text-blue-600 transition-colors border border-blue-100/50"
                  title="Modifier le rôle"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleToggleStatus(user.id, user.is_active)}
                  className={cn(
                    "p-2 rounded-xl transition-colors border",
                    user.is_active 
                      ? "bg-red-50 hover:bg-red-100 text-red-500 border-red-100" 
                      : "bg-green-50 hover:bg-green-100 text-green-600 border-green-100"
                  )}
                  title={user.is_active ? 'Désactiver' : 'Activer'}
                >
                  {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                </button>
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm max-w-sm mx-auto flex flex-col items-center justify-center gap-3">
          <div
            className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center text-gray-300 bg-gray-50"
          >
            <Users size={24} />
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-gray-800 dark:text-gray-100">
              {searchTerm || roleFilter !== 'all'
                ? 'Aucun utilisateur trouvé'
                : 'Aucun utilisateur enregistré'}
            </h3>

            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed">
              {searchTerm || roleFilter !== 'all'
                ? 'Aucun utilisateur ne correspond à vos critères.'
                : 'Aucun utilisateur n\'a encore été enregistré.'}
            </p>
          </div>
        </section>
      )}

      {showDetailsModal && selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setShowDetailsModal(false)}
          title="👤 Détails de l'utilisateur"
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: colors.border }}>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ background: colors.primary }}
              >
                {selectedUser.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: colors.text }}>
                  {selectedUser.full_name || 'Utilisateur inconnu'}
                </p>
                <p className="text-sm" style={{ color: colors.text + '50' }}>
                  {selectedUser.email || 'Email inconnu'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Rôle" value={getRoleLabel(selectedUser.role)} />
              <InfoRow label="Statut" value={getStatusLabel(selectedUser.is_active)} />
              <InfoRow label="Email vérifié" value={selectedUser.email_verified ? '✅ Oui' : '❌ Non'} />
              <InfoRow label="Téléphone vérifié" value={selectedUser.phone_verified ? '✅ Oui' : '❌ Non'} />
              {selectedUser.patient_category && (
                <InfoRow
                  label="Catégorie"
                  value={selectedUser.patient_category === 'maman_bebe' ? '👶 Maman & Bébé' : '👴 Senior'}
                />
              )}
              <InfoRow label="Date d'inscription" value={formatDate(selectedUser.created_at)} />
            </div>
          </div>
        </Modal>
      )}

      {showEditModal && selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setShowEditModal(false)}
          title="✏️ Modifier le rôle"
          description={selectedUser.full_name || 'Utilisateur inconnu'}
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
                {roleOptions.filter(o => o.value !== 'all').map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-xl text-center text-xs" style={{ background: colors.primary + '05' }}>
              ⚠️ Changer le rôle d'un utilisateur affecte ses permissions sur la plateforme.
            </div>
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

export default UsersPage;
