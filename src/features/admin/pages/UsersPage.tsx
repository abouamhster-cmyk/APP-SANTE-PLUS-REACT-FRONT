// 📁 src/features/admin/pages/UsersPage.tsx
 
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Shield,
  Award,
  X,
} from 'lucide-react';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/helpers';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { InfoRow } from '@/components/ui/InfoRow';
import toast from 'react-hot-toast';

 
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

// ✅ Fonctions
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

// ✅ Options de filtre
const roleOptions = [
  { value: 'all', label: 'Tous' },
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
      fetchUsers();
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
      fetchUsers();
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
    fetchUsers();
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
              Utilisateurs
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              👥 Utilisateurs
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {stats.total} utilisateur{stats.total > 1 ? 's' : ''} au total
            </p>
          </div>

          <button
            onClick={fetchUsers}
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
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-gray-50 outline-none appearance-none"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* LISTE */}
      {filteredUsers.length > 0 ? (
        <section className="space-y-2">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-xl p-3 shadow-sm border border-black/5 hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: colors.primary }}
                >
                  {user.full_name?.charAt(0) || 'U'}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: colors.text }}>
                    {user.full_name || 'Utilisateur inconnu'}
                  </p>
                  <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: colors.text + '50' }}>
                    <span>{user.email || 'Email inconnu'}</span>
                    <span>•</span>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
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

                <div className="flex items-center gap-1">
                  <button
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                    style={{ color: colors.primary }}
                    onClick={() => handleViewDetails(user)}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                    style={{ color: '#2196F3' }}
                    onClick={() => handleEditUser(user)}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                    style={{ color: user.is_active ? '#F44336' : '#4CAF50' }}
                    onClick={() => handleToggleStatus(user.id, user.is_active)}
                  >
                    {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-red-50 transition"
                    style={{ color: '#F44336' }}
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
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
            {searchTerm || roleFilter !== 'all'
              ? 'Aucun utilisateur trouvé'
              : 'Aucun utilisateur enregistré'}
          </h3>

          <p className="text-xs mt-1 text-gray-500">
            {searchTerm || roleFilter !== 'all'
              ? 'Aucun utilisateur ne correspond à vos critères.'
              : 'Aucun utilisateur n\'a encore été enregistré.'}
          </p>
        </section>
      )}

      {/* MODAL DÉTAILS */}
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

      {/* MODAL ÉDITION */}
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
