// 📁 src/features/admin/pages/OffersPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
} from 'lucide-react';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/utils/helpers';
import { ModalWithForm } from '@/components/ui/Modal';
import { Offer } from '@/types';
import toast from 'react-hot-toast';

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
    senior: '#10b981',
    maman_bebe: '#db4a6d',
    pack_confort: '#d4af37',
  };
  return colors[category] || '#94a3b8';
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

  const handleDeleteOffer = async (id: string) => {
    if (!window.confirm('Supprimer cette formule d\'offre ?')) return;
    try {
      const { error } = await supabase.from('offres').delete().eq('id', id);
      if (error) throw error;
      toast.success('Formule supprimée');
      fetchOffers();
    } catch (error) {
      console.error('Delete offer error:', error);
      toast.error('Erreur lors de la suppression');
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: colors.text }}>
              📦 Catalogue des formules
            </h1>
            <p className="text-xs font-semibold" style={{ color: colors.textLight }}>
              Gestion des offres d'accompagnement proposées au public
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0 self-start sm:self-center">
            <button
              onClick={fetchOffers}
              className="flex-1 sm:flex-initial h-11 px-4 rounded-xl text-xs font-bold border bg-white hover:bg-gray-50 flex items-center justify-center gap-1.5"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              <RefreshCw size={14} />
              Actualiser
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-[2] sm:flex-initial h-11 px-5 rounded-xl text-white font-extrabold text-xs transition-opacity hover:opacity-95 flex items-center justify-center gap-1.5 shadow-sm"
              style={{ background: colors.primary }}
            >
              <Plus size={15} strokeWidth={2.5} /> Nouvelle offre
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une offre par son nom..."
            className="w-full h-11 pl-11 pr-4 rounded-xl border outline-none bg-white border-gray-100 dark:border-gray-800/60 text-xs font-semibold focus:border-emerald-500/50 transition-all shadow-sm"
            style={{ color: colors.text }}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-11 px-4 rounded-xl border outline-none text-xs font-semibold bg-white border-gray-100 dark:border-gray-800/60 shrink-0 sm:w-56 shadow-sm cursor-pointer focus:border-emerald-500/50 transition-all"
          style={{ borderColor: colors.border, color: colors.text }}
        >
          <option value="all">Toutes les catégories</option>
          <option value="senior">👴 Senior</option>
          <option value="maman_bebe">👶 Maman</option>
          <option value="pack_confort">⭐ Pack Confort</option>
        </select>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOffers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 text-xs font-medium">Aucune formule trouvée</div>
        ) : (
          filteredOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              colors={colors}
              onDelete={handleDeleteOffer}
              onEdit={() => {
                setSelectedOffer(offer);
                setShowEditModal(true);
              }}
            />
          ))
        )}
      </section>

      {showCreateModal && <OfferFormModal mode="create" onClose={() => setShowCreateModal(false)} onSuccess={fetchOffers} colors={colors} />}
      {showEditModal && selectedOffer && <OfferFormModal mode="edit" offer={selectedOffer} onClose={() => { setShowEditModal(false); setSelectedOffer(null); }} onSuccess={fetchOffers} colors={colors} />}
    </div>
  );
};

const OfferCard = ({ offer, colors, onDelete, onEdit }: { offer: Offer, colors: any, onDelete: (id: string) => void, onEdit: () => void }) => {
  const categoryColor = getCategoryColor(offer.category);
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between border" style={{ borderColor: colors.border }}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: categoryColor + '10', color: categoryColor }}>
            {getCategoryLabel(offer.category)}
          </span>
          <span className="text-[10px] text-gray-400 font-bold">#{offer.display_order}</span>
        </div>
        <h3 className="font-bold text-xs sm:text-sm text-gray-800">{offer.name}</h3>
        <p className="text-lg font-black" style={{ color: colors.primary }}>{offer.price ? formatCurrency(offer.price) : 'Sur devis'}</p>
      </div>

      <div className="flex gap-2 mt-5 pt-3 border-t" style={{ borderColor: colors.border }}>
        <button onClick={onEdit} className="flex-1 py-2 rounded-xl text-xs font-bold border hover:bg-gray-50 transition-colors" style={{ borderColor: colors.border, color: colors.text }}>Modifier</button>
        <button onClick={() => onDelete(offer.id)} className="px-3 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors text-xs font-bold">Supprimer</button>
      </div>
    </div>
  );
};

// =============================================
// MODAL AMÉLIORÉ (GESTION RÉELLE DES DONNÉES)
// =============================================
interface OfferFormModalProps {
  mode: 'create' | 'edit';
  offer?: Offer;
  onClose: () => void;
  onSuccess: () => void;
  colors: any;
}

const OfferFormModal = ({ mode, offer, onClose, onSuccess, colors }: OfferFormModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: offer?.name || '',
    category: (offer?.category || 'senior') as any,
    type: (offer?.type || 'mensuelle') as any,
    description: offer?.description || '',
    price: offer?.price ? String(offer.price) : '',
    features: offer?.features?.join('\n') || '', // Utilisation de \n pour le textarea
    visits_per_week: offer?.visitsPerWeek ? String(offer.visitsPerWeek) : '',
    duration_days: offer?.durationDays ? String(offer.durationDays) : '',
    badge: offer?.badge || '',
    is_active: offer?.is_active ?? true,
    display_order: offer?.display_order ? String(offer.display_order) : '0',
    total_visits: offer?.total_visits ? String(offer.total_visits) : '',
    total_orders: offer?.total_orders ? String(offer.total_orders) : '0',
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
        price: parseFloat(formData.price) || 0,
        features: formData.features.split('\n').filter(Boolean),
        visits_per_week: formData.visits_per_week ? parseInt(formData.visits_per_week) : null,
        duration_days: formData.duration_days ? parseInt(formData.duration_days) : null,
        total_visits: formData.total_visits ? parseInt(formData.total_visits) : null,
        total_orders: formData.total_orders ? parseInt(formData.total_orders) : 0,
        badge: formData.badge || null,
        is_active: formData.is_active,
        display_order: parseInt(formData.display_order) || 0,
      };

      if (mode === 'edit' && offer) {
        const { error } = await supabase.from('offres').update(data).eq('id', offer.id);
        if (error) throw error;
        toast.success('Mise à jour réussie');
      } else {
        const { error } = await supabase.from('offres').insert(data);
        if (error) throw error;
        toast.success('Création réussie');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalWithForm
      isOpen={true}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={mode === 'edit' ? 'Modifier l\'offre' : 'Nouvelle offre'}
      icon={<Package size={20} />}
      maxWidth="2xl"
      confirmLabel="Enregistrer"
      isLoading={isLoading}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1">Nom</label>
            <input className="w-full h-11 px-4 rounded-xl border bg-gray-50 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Prix (FCFA)</label>
            <input type="number" className="w-full h-11 px-4 rounded-xl border bg-gray-50 text-sm" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Total Visites</label>
            <input type="number" className="w-full h-11 px-4 rounded-xl border bg-gray-50 text-sm" value={formData.total_visits} onChange={e => setFormData({...formData, total_visits: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Total Commandes</label>
            <input type="number" className="w-full h-11 px-4 rounded-xl border bg-gray-50 text-sm" value={formData.total_orders} onChange={e => setFormData({...formData, total_orders: e.target.value})} />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-bold mb-1">Description</label>
          <textarea className="w-full p-4 rounded-xl border bg-gray-50 text-sm h-20" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">Fonctionnalités (une par ligne)</label>
          <textarea className="w-full p-4 rounded-xl border bg-gray-50 text-sm h-24" value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} />
        </div>
      </div>
    </ModalWithForm>
  );
};

export default OffersPage;
