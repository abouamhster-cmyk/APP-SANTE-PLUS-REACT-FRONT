// 📁 src/features/admin/pages/OffersPage.tsx

import { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Users,
  Baby,
  Star,
  Zap,
  DollarSign,
  Calendar,
  Hash,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatCurrency } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface Offer {
  id: string;
  name: string;
  category: 'senior' | 'maman_bebe' | 'pack_confort';
  type: 'ponctuelle' | 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle' | 'sur_devis';
  description: string | null;
  price: number | null;
  features: string[];
  visits_per_week: number | null;
  duration_days: number | null;
  is_active: boolean;
  is_public: boolean;
  display_order: number;
  badge: string | null;
  created_at: string;
  updated_at: string;
}

// ✅ Fonctions en dehors du composant
const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    senior: '👴 Senior',
    maman_bebe: '👶 Maman & Bébé',
    pack_confort: '⭐ Pack Confort',
  };
  return labels[category] || category;
};

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    senior: '#4CAF50',
    maman_bebe: '#E8B4B8',
    pack_confort: '#C9A84C',
  };
  return colors[category] || '#9E9E9E';
};

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    ponctuelle: '⚡ Ponctuelle',
    mensuelle: '📅 Mensuelle',
    trimestrielle: '📅 Trimestrielle',
    semestrielle: '📅 Semestrielle',
    annuelle: '📅 Annuelle',
    sur_devis: '📝 Sur devis',
  };
  return labels[type] || type;
};

const getStatusLabel = (isActive: boolean): string => {
  return isActive ? '🟢 Actif' : '🔴 Inactif';
};

const getStatusColor = (isActive: boolean): string => {
  return isActive ? '#4CAF50' : '#F44336';
};

const OffersPage = () => {
  const { profile, role } = useAuthStore();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('offres')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      setOffers(data || []);
    } catch (error: any) {
      console.error('Fetch offers error:', error);
      toast.error('Erreur lors du chargement des offres');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch =
      offer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || offer.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: offers.length,
    active: offers.filter(o => o.is_active).length,
    inactive: offers.filter(o => !o.is_active).length,
    senior: offers.filter(o => o.category === 'senior').length,
    maman: offers.filter(o => o.category === 'maman_bebe').length,
    pack: offers.filter(o => o.category === 'pack_confort').length,
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('offres')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Offre ${!currentStatus ? 'activée' : 'désactivée'}`);
      fetchOffers();
    } catch (error) {
      console.error('Toggle offer status error:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) return;

    try {
      const { error } = await supabase
        .from('offres')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Offre supprimée');
      fetchOffers();
    } catch (error) {
      console.error('Delete offer error:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black" style={{ color: colors.text }}>
              📦 Gestion des offres
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
              Gérez les offres et abonnements de la plateforme
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchOffers}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl font-medium transition hover:opacity-80 flex items-center gap-2"
              style={{ background: colors.primary + '12', color: colors.primary }}
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              Actualiser
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl text-white font-bold transition hover:opacity-80 flex items-center gap-2"
              style={{ background: colors.primary }}
            >
              <Plus size={18} />
              Nouvelle offre
            </button>
          </div>
        </div>
      </section>

      {/* Statistiques */}
      <section className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          color={colors.primary}
          icon={<Package size={20} />}
        />
        <StatCard
          label="Actives"
          value={stats.active}
          color="#4CAF50"
          icon={<CheckCircle size={20} />}
        />
        <StatCard
          label="Inactives"
          value={stats.inactive}
          color="#F44336"
          icon={<XCircle size={20} />}
        />
        <StatCard
          label="Senior"
          value={stats.senior}
          color="#4CAF50"
          icon={<Users size={20} />}
        />
        <StatCard
          label="Maman & Bébé"
          value={stats.maman}
          color="#E8B4B8"
          icon={<Baby size={20} />}
        />
        <StatCard
          label="Pack Confort"
          value={stats.pack}
          color="#C9A84C"
          icon={<Star size={20} />}
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
              placeholder="Rechercher une offre..."
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
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border outline-none text-sm appearance-none"
              style={{
                borderColor: colors.border,
                background: 'var(--color-background)',
                color: colors.text,
              }}
            >
              <option value="all">Toutes les catégories</option>
              <option value="senior">👴 Senior</option>
              <option value="maman_bebe">👶 Maman & Bébé</option>
              <option value="pack_confort">⭐ Pack Confort</option>
            </select>
          </div>
        </div>
      </section>

      {/* Liste des offres */}
      <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-t-transparent" style={{ borderColor: colors.primary }} />
            <p className="mt-2 text-sm" style={{ color: colors.text + '60' }}>Chargement des offres...</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center shadow-sm border border-black/5">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-bold" style={{ color: colors.text }}>
              Aucune offre trouvée
            </h3>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {searchTerm || categoryFilter !== 'all'
                ? 'Aucune offre ne correspond à vos critères'
                : 'Aucune offre n\'a encore été créée'}
            </p>
          </div>
        ) : (
          filteredOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              colors={colors}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDeleteOffer}
              onEdit={() => {
                setSelectedOffer(offer);
                setShowEditModal(true);
              }}
            />
          ))
        )}
      </section>

      {/* Modals */}
      {showCreateModal && (
        <OfferFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchOffers}
          colors={colors}
        />
      )}

      {showEditModal && selectedOffer && (
        <OfferFormModal
          offer={selectedOffer}
          onClose={() => {
            setShowEditModal(false);
            setSelectedOffer(null);
          }}
          onSuccess={fetchOffers}
          colors={colors}
        />
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

// =============================================
// OFFER CARD
// =============================================

interface OfferCardProps {
  offer: Offer;
  colors: any;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
}

const OfferCard = ({ offer, colors, onToggleStatus, onDelete, onEdit }: OfferCardProps) => {
  const categoryColor = getCategoryColor(offer.category);
  const isActive = offer.is_active;

  return (
    <div
      className="bg-white rounded-2xl p-5 border transition hover:shadow-md"
      style={{ borderColor: isActive ? colors.primary + '30' : colors.border }}
    >
      {/* Badge */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ background: categoryColor + '15', color: categoryColor }}
          >
            {getCategoryLabel(offer.category)}
          </span>
          {offer.badge && (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: '#FFD70015', color: '#FFD700' }}
            >
              {offer.badge}
            </span>
          )}
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: isActive ? '#4CAF5015' : '#F4433615',
              color: isActive ? '#4CAF50' : '#F44336',
            }}
          >
            {getStatusLabel(isActive)}
          </span>
        </div>
        <span className="text-xs" style={{ color: colors.text + '40' }}>
          #{offer.display_order}
        </span>
      </div>

      {/* Nom et prix */}
      <h3 className="text-lg font-bold mt-3" style={{ color: colors.text }}>
        {offer.name}
      </h3>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-2xl font-black" style={{ color: colors.primary }}>
          {offer.price ? formatCurrency(offer.price) : 'Sur devis'}
        </span>
        <span className="text-sm" style={{ color: colors.text + '50' }}>
          {getTypeLabel(offer.type)}
        </span>
      </div>

      {/* Description */}
      {offer.description && (
        <p className="text-sm mt-2 line-clamp-2" style={{ color: colors.text + '60' }}>
          {offer.description}
        </p>
      )}

      {/* Features */}
      {offer.features && offer.features.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {offer.features.slice(0, 3).map((feature, index) => (
            <span
              key={index}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: colors.primary + '08', color: colors.text + '60' }}
            >
              {feature}
            </span>
          ))}
          {offer.features.length > 3 && (
            <span className="text-[10px] text-gray-400">
              +{offer.features.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Infos supplémentaires */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs" style={{ color: colors.text + '40' }}>
        {offer.visits_per_week && (
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {offer.visits_per_week * 4} visites/mois
          </span>
        )}
        {offer.duration_days && (
          <span className="flex items-center gap-1">
            <Hash size={12} />
            {offer.duration_days} jours
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatDate(offer.created_at)}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: colors.border }}>
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-gray-100 transition"
          style={{ color: '#2196F3' }}
        >
          <Edit size={16} />
        </button>
        <button
          onClick={() => onToggleStatus(offer.id, isActive)}
          className="p-2 rounded-lg hover:bg-gray-100 transition"
          style={{ color: isActive ? '#F44336' : '#4CAF50' }}
        >
          {isActive ? <XCircle size={16} /> : <CheckCircle size={16} />}
        </button>
        <button
          onClick={() => onDelete(offer.id)}
          className="p-2 rounded-lg hover:bg-red-50 transition"
          style={{ color: '#F44336' }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// =============================================
// OFFER FORM MODAL
// =============================================

interface OfferFormModalProps {
  offer?: Offer;
  onClose: () => void;
  onSuccess: () => void;
  colors: any;
}

const OfferFormModal = ({ offer, onClose, onSuccess, colors }: OfferFormModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: offer?.name || '',
    category: offer?.category || 'senior',
    type: offer?.type || 'mensuelle',
    description: offer?.description || '',
    price: offer?.price !== null && offer?.price !== undefined ? String(offer.price) : '',
    features: offer?.features?.join(', ') || '',
    visits_per_week: offer?.visits_per_week !== null && offer?.visits_per_week !== undefined ? String(offer.visits_per_week) : '',
    duration_days: offer?.duration_days !== null && offer?.duration_days !== undefined ? String(offer.duration_days) : '',
    badge: offer?.badge || '',
    is_active: offer?.is_active ?? true,
    is_public: offer?.is_public ?? true,
    display_order: offer?.display_order !== undefined ? String(offer.display_order) : '0',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = {
        name: formData.name,
        category: formData.category,
        type: formData.type,
        description: formData.description || null,
        price: formData.price ? parseFloat(String(formData.price)) : null,
        visits_per_week: formData.visits_per_week ? parseInt(String(formData.visits_per_week)) : null,
        duration_days: formData.duration_days ? parseInt(String(formData.duration_days)) : null,
        features: formData.features ? formData.features.split(',').map((f: string) => f.trim()) : [],
        badge: formData.badge || null,
        is_active: formData.is_active,
        is_public: formData.is_public,
        display_order: parseInt(String(formData.display_order)) || 0,
      };

      if (offer) {
        const { error } = await supabase
          .from('offres')
          .update(data)
          .eq('id', offer.id);

        if (error) throw error;
        toast.success('Offre mise à jour');
      } else {
        const { error } = await supabase
          .from('offres')
          .insert(data);

        if (error) throw error;
        toast.success('Offre créée');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Save offer error:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b" style={{ borderColor: colors.border }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>
              {offer ? '✏️ Modifier l\'offre' : '➕ Nouvelle offre'}
            </h2>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {offer ? 'Modifiez les informations de l\'offre' : 'Créez une nouvelle offre'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Nom de l'offre *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <InputField
              label="Badge (optionnel)"
              value={formData.badge}
              onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
              placeholder="⭐ Populaire"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              label="Catégorie *"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { value: 'senior', label: '👴 Senior' },
                { value: 'maman_bebe', label: '👶 Maman & Bébé' },
                { value: 'pack_confort', label: '⭐ Pack Confort' },
              ]}
            />
            <SelectField
              label="Type *"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              options={[
                { value: 'ponctuelle', label: '⚡ Ponctuelle' },
                { value: 'mensuelle', label: '📅 Mensuelle' },
                { value: 'trimestrielle', label: '📅 Trimestrielle' },
                { value: 'semestrielle', label: '📅 Semestrielle' },
                { value: 'annuelle', label: '📅 Annuelle' },
                { value: 'sur_devis', label: '📝 Sur devis' },
              ]}
            />
          </div>

          <InputField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            as="textarea"
            rows={2}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              label="Prix (FCFA)"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0"
            />
            <InputField
              label="Visites/semaine"
              type="number"
              value={formData.visits_per_week}
              onChange={(e) => setFormData({ ...formData, visits_per_week: e.target.value })}
              placeholder="0"
            />
            <InputField
              label="Durée (jours)"
              type="number"
              value={formData.duration_days}
              onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
              placeholder="0"
            />
          </div>

          <InputField
            label="Caractéristiques (séparées par des virgules)"
            value={formData.features}
            onChange={(e) => setFormData({ ...formData, features: e.target.value })}
            placeholder="Suivi personnalisé, Accompagnement, Coordination"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Ordre d'affichage"
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
              placeholder="0"
            />
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: colors.primary }}
                />
                <span className="text-sm" style={{ color: colors.text }}>Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: colors.primary }}
                />
                <span className="text-sm" style={{ color: colors.text }}>Publique</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-medium border transition hover:bg-gray-50"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name}
              className="flex-1 py-3 rounded-xl text-white font-bold transition hover:opacity-80 flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: colors.primary }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle size={18} />
                  {offer ? 'Mettre à jour' : 'Créer l\'offre'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================
// INPUT FIELD
// =============================================

interface InputFieldProps {
  label: string;
  value: any;
  onChange: (e: any) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  as?: 'input' | 'textarea';
  rows?: number;
}

const InputField = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  as = 'input',
  rows = 3,
}: InputFieldProps) => {
  const colors = getThemeColors('senior');

  if (as === 'textarea') {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-bold" style={{ color: colors.text }}>
          {label}
        </label>
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className="w-full px-4 py-3 rounded-2xl border outline-none text-sm resize-none"
          style={{
            borderColor: colors.border,
            background: 'var(--color-background)',
            color: colors.text,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold" style={{ color: colors.text }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 rounded-2xl border outline-none text-sm"
        style={{
          borderColor: colors.border,
          background: 'var(--color-background)',
          color: colors.text,
        }}
      />
    </div>
  );
};

// =============================================
// SELECT FIELD
// =============================================

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (e: any) => void;
  options: { value: string; label: string }[];
}

const SelectField = ({ label, value, onChange, options }: SelectFieldProps) => {
  const colors = getThemeColors('senior');

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold" style={{ color: colors.text }}>
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 rounded-2xl border outline-none text-sm appearance-none"
        style={{
          borderColor: colors.border,
          background: 'var(--color-background)',
          color: colors.text,
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default OffersPage;