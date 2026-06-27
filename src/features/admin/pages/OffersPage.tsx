// 📁 src/features/admin/pages/OffersPage.tsx
 
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  Baby,
  Star,
} from 'lucide-react';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/utils/helpers';
import { Modal, ModalActions } from '@/components/ui/Modal';
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

// ✅ Fonctions
const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    senior: '👴 Senior',
    maman_bebe: '👶 Maman',
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

const categoryOptions = [
  { value: 'all', label: 'Toutes' },
  { value: 'senior', label: '👴 Senior' },
  { value: 'maman_bebe', label: '👶 Maman' },
  { value: 'pack_confort', label: '⭐ Pack Confort' },
];

const typeOptions: { value: Offer['type']; label: string }[] = [
  { value: 'ponctuelle', label: '⚡ Ponctuelle' },
  { value: 'mensuelle', label: '📅 Mensuelle' },
  { value: 'trimestrielle', label: '📅 Trimestrielle' },
  { value: 'semestrielle', label: '📅 Semestrielle' },
  { value: 'annuelle', label: '📅 Annuelle' },
  { value: 'sur_devis', label: '📝 Sur devis' },
];

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-40 bg-white rounded-xl animate-pulse" />
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
              <Package size={12} />
              Offres
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              📦 Offres
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {stats.total} offre{stats.total > 1 ? 's' : ''} au total
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchOffers}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5"
              style={{ background: colors.primary + '12', color: colors.primary }}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-2 rounded-xl text-white font-bold text-sm flex items-center gap-1.5"
              style={{ background: colors.primary }}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nouvelle</span>
            </button>
          </div>
        </div>
      </section>

      {/* STATS COMPACTES */}
      <section className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        <CompactStat label="Total" value={stats.total} color={colors.primary} icon={<Package size={14} />} />
        <CompactStat label="Actives" value={stats.active} color="#4CAF50" icon={<CheckCircle size={14} />} />
        <CompactStat label="Inactives" value={stats.inactive} color="#F44336" icon={<XCircle size={14} />} />
        <CompactStat label="Senior" value={stats.senior} color="#4CAF50" icon={<Users size={14} />} />
        <CompactStat label="Maman" value={stats.maman} color="#E8B4B8" icon={<Baby size={14} />} />
        <CompactStat label="Pack" value={stats.pack} color="#C9A84C" icon={<Star size={14} />} />
      </section>

      {/* RECHERCHE + FILTRE */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher une offre..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-gray-50 outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
            />
          </div>

          <div className="relative min-w-[120px]">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-gray-50 outline-none appearance-none"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* LISTE */}
      {filteredOffers.length > 0 ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredOffers.map((offer) => (
            <OfferCardCompact
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
          ))}
        </section>
      ) : (
        <section className="bg-white rounded-2xl p-6 text-center shadow-sm border border-black/5">
          <Package size={32} className="mx-auto mb-3 opacity-30" />
          <h3 className="text-sm font-bold" style={{ color: colors.text }}>
            {searchTerm || categoryFilter !== 'all' ? 'Aucune offre trouvée' : 'Aucune offre'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {searchTerm || categoryFilter !== 'all'
              ? 'Aucune offre ne correspond à vos critères.'
              : 'Créez votre première offre.'}
          </p>
        </section>
      )}

      {/* MODALS */}
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
// COMPACT STAT
// =============================================

interface CompactStatProps {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

const CompactStat = ({ label, value, color, icon }: CompactStatProps) => {
  return (
    <div className="bg-white rounded-xl p-2 shadow-sm border border-black/5">
      <div className="flex items-center justify-between gap-1">
        <p className="text-[9px] font-medium text-gray-400">{label}</p>
        <p className="text-base font-bold" style={{ color }}>{value}</p>
      </div>
    </div>
  );
};

// =============================================
// OFFER CARD COMPACT
// =============================================

interface OfferCardCompactProps {
  offer: Offer;
  colors: any;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
}

const OfferCardCompact = ({ offer, colors, onToggleStatus, onDelete, onEdit }: OfferCardCompactProps) => {
  const categoryColor = getCategoryColor(offer.category);
  const isActive = offer.is_active;

  return (
    <div
      className="bg-white rounded-xl p-3 shadow-sm border transition hover:shadow-md"
      style={{ borderColor: isActive ? colors.primary + '30' : colors.border }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
            style={{ background: categoryColor + '15', color: categoryColor }}
          >
            {getCategoryLabel(offer.category)}
          </span>
          {offer.badge && (
            <span
              className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
              style={{ background: '#FFD70015', color: '#FFD700' }}
            >
              {offer.badge}
            </span>
          )}
          <span
            className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
            style={{
              background: isActive ? '#4CAF5015' : '#F4433615',
              color: isActive ? '#4CAF50' : '#F44336',
            }}
          >
            {isActive ? '✅' : '❌'}
          </span>
        </div>
        <span className="text-[9px] text-gray-400">#{offer.display_order}</span>
      </div>

      <h3 className="text-sm font-bold mt-1" style={{ color: colors.text }}>
        {offer.name}
      </h3>

      <div className="flex items-center gap-1">
        <span className="text-base font-bold" style={{ color: colors.primary }}>
          {offer.price ? formatCurrency(offer.price) : 'Sur devis'}
        </span>
        <span className="text-[9px] text-gray-400">{getTypeLabel(offer.type)}</span>
      </div>

      {offer.features && offer.features.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          {offer.features.slice(0, 2).map((feature, index) => (
            <span
              key={index}
              className="text-[8px] px-1.5 py-0.5 rounded-full"
              style={{ background: colors.primary + '08', color: colors.text + '60' }}
            >
              {feature}
            </span>
          ))}
          {offer.features.length > 2 && (
            <span className="text-[8px] text-gray-400">+{offer.features.length - 2}</span>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center justify-end gap-1 pt-2 border-t" style={{ borderColor: colors.border }}>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition"
          style={{ color: '#2196F3' }}
        >
          <Edit size={14} />
        </button>
        <button
          onClick={() => onToggleStatus(offer.id, isActive)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition"
          style={{ color: isActive ? '#F44336' : '#4CAF50' }}
        >
          {isActive ? <XCircle size={14} /> : <CheckCircle size={14} />}
        </button>
        <button
          onClick={() => onDelete(offer.id)}
          className="p-1.5 rounded-lg hover:bg-red-50 transition"
          style={{ color: '#F44336' }}
        >
          <Trash2 size={14} />
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
        category: formData.category as Offer['category'],
        type: formData.type as Offer['type'],
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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={offer ? '✏️ Modifier l\'offre' : '➕ Nouvelle offre'}
      maxWidth="2xl"
      actions={
        <ModalActions
          onCancel={onClose}
          onConfirm={handleSubmit}
          confirmLabel={offer ? 'Mettre à jour' : 'Créer'}
          isLoading={isLoading}
        />
      }
    >
      <form id="offer-form" className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: colors.text }}>
              Nom *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: colors.text }}>
              Badge
            </label>
            <input
              type="text"
              value={formData.badge}
              onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
              placeholder="⭐ Populaire"
              className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: colors.text }}>
              Catégorie *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as Offer['category'] })}
              className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              {categoryOptions.filter(o => o.value !== 'all').map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: colors.text }}>
              Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as Offer['type'] })}
              className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1" style={{ color: colors.text }}>
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-xl border outline-none resize-none"
            style={{ borderColor: colors.border, color: colors.text }}
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: colors.text }}>
              Prix (FCFA)
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: colors.text }}>
              Visites/semaine
            </label>
            <input
              type="number"
              value={formData.visits_per_week}
              onChange={(e) => setFormData({ ...formData, visits_per_week: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: colors.text }}>
              Durée (jours)
            </label>
            <input
              type="number"
              value={formData.duration_days}
              onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1" style={{ color: colors.text }}>
            Caractéristiques (séparées par des virgules)
          </label>
          <input
            type="text"
            value={formData.features}
            onChange={(e) => setFormData({ ...formData, features: e.target.value })}
            placeholder="Suivi personnalisé, Accompagnement, Coordination"
            className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
            style={{ borderColor: colors.border, color: colors.text }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: colors.text }}>
              Ordre d'affichage
            </label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
            />
          </div>
          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded"
                style={{ accentColor: colors.primary }}
              />
              <span className="text-xs" style={{ color: colors.text }}>Active</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="w-4 h-4 rounded"
                style={{ accentColor: colors.primary }}
              />
              <span className="text-xs" style={{ color: colors.text }}>Publique</span>
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default OffersPage;
