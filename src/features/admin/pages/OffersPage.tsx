// 📁 src/features/admin/pages/OffersPage.tsx
// ✅ PAGE CATALOGUE DES OFFRES : SOUISSION DU FORMULAIRE CORRIGÉE ET GARANTIE

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, Plus, Search, RefreshCw, X } from 'lucide-react';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/utils/helpers';
import { Modal } from '@/components/ui/Modal';
import { Offer } from '@/types';
import toast from 'react-hot-toast';

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    senior: '👴 Senior',
    maman_bebe: '👶 Maman',
    pack_confort: '⭐ Pack Confort',
  };
  return labels[category] || category;
};

const getCategoryColor = (category: string) => {
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

  useEffect(() => { fetchOffers(); }, []);

  const fetchOffers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('offres').select('*').order('display_order', { ascending: true });
      if (error) throw error;
      setOffers(data || []);
    } catch (err: any) {
      console.error('Fetch offers error:', err);
      toast.error('Erreur lors du chargement des offres');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          offer.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || offer.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette offre ?')) return;
    try {
      const { error } = await supabase.from('offres').delete().eq('id', id);
      if (error) throw error;
      toast.success('Offre supprimée avec succès');
      fetchOffers();
    } catch (err: any) {
      toast.error('Erreur lors de la suppression : ' + err.message);
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
      {/* En-tête */}
      <section className="relative overflow-hidden rounded-3xl p-6 border border-black/5" style={{ background: `${colors.primary}08` }}>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-black" style={{ color: colors.text }}>📦 Catalogue des formules</h1>
            <p className="text-xs font-semibold text-gray-500">Gestion des offres Santé Plus proposées aux clients</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={fetchOffers} className="h-11 px-4 rounded-xl text-xs font-bold border bg-white flex items-center justify-center gap-1.5 hover:bg-gray-50">
              <RefreshCw size={14} /> Actualiser
            </button>
            <button onClick={() => setShowCreateModal(true)} className="h-11 px-5 rounded-xl text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-opacity hover:opacity-90" style={{ background: colors.primary }}>
              <Plus size={16} /> Nouvelle offre
            </button>
          </div>
        </div>
      </section>

      {/* Barre de recherche */}
      <section className="bg-white rounded-2xl p-3 border shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full h-11 pl-11 pr-4 rounded-xl border bg-white text-xs font-bold outline-none" placeholder="Rechercher une offre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="h-11 px-4 rounded-xl border bg-white text-xs font-bold outline-none sm:w-56 cursor-pointer" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="all">Toutes les catégories</option>
          <option value="senior">👴 Senior</option>
          <option value="maman_bebe">👶 Maman</option>
        </select>
      </section>

      {/* Liste des offres */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOffers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 text-xs font-medium">Aucune formule trouvée</div>
        ) : (
          filteredOffers.map((offer) => (
            <div key={offer.id} className="bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full" style={{ background: getCategoryColor(offer.category) + '15', color: getCategoryColor(offer.category) }}>
                    {getCategoryLabel(offer.category)}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">#{offer.display_order}</span>
                </div>
                <h3 className="font-black text-sm text-gray-800">{offer.name}</h3>
                {offer.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{offer.description}</p>
                )}
                <p className="text-lg font-black mt-2" style={{ color: colors.primary }}>
                  {offer.price ? formatCurrency(offer.price) : 'Sur devis'}
                </p>
              </div>

              <div className="flex gap-2 mt-5 pt-3 border-t">
                <button onClick={() => { setSelectedOffer(offer); setShowEditModal(true); }} className="flex-1 py-2 rounded-xl border text-xs font-bold hover:bg-gray-50 transition-colors">
                  Modifier
                </button>
                <button onClick={() => handleDelete(offer.id)} className="px-3.5 rounded-xl border border-red-100 text-red-500 text-xs font-bold hover:bg-red-50 transition-colors">
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Modal Création */}
      {showCreateModal && (
        <OfferFormModal mode="create" colors={colors} onClose={() => setShowCreateModal(false)} onSuccess={fetchOffers} />
      )}

      {/* Modal Édition */}
      {showEditModal && selectedOffer && (
        <OfferFormModal mode="edit" offer={selectedOffer} colors={colors} onClose={() => { setShowEditModal(false); setSelectedOffer(null); }} onSuccess={fetchOffers} />
      )}
    </div>
  );
};

// =============================================
// MODAL FORMULAIRE AUTONOME ET GARANTI
// =============================================
const OfferFormModal = ({ mode, offer, onClose, onSuccess, colors }: any) => {
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: offer?.name || '',
    category: offer?.category || 'senior',
    type: offer?.type || 'mensuelle',
    description: offer?.description || '',
    price: offer?.price ? String(offer.price) : '',
    features: offer?.features?.join('\n') || '',
    total_visits: offer?.total_visits ? String(offer.total_visits) : '',
    duration_days: offer?.duration_days ? String(offer.duration_days) : '30',
    display_order: offer?.display_order ? String(offer.display_order) : '0',
    badge: offer?.badge || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 Soumission du formulaire déclenchée !', formData);
    setIsLoading(true);

    const payload = {
      name: formData.name,
      category: formData.category,
      type: formData.type,
      description: formData.description.trim() || null,
      price: parseFloat(formData.price) || 0,
      features: formData.features.split('\n').map(f => f.trim()).filter(Boolean),
      total_visits: parseInt(formData.total_visits) || 0,
      duration_days: parseInt(formData.duration_days) || 30,
      display_order: parseInt(formData.display_order) || 0,
      badge: formData.badge.trim() || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    try {
      if (mode === 'edit' && offer) {
        console.log('📤 Envoi UPDATE vers Supabase:', payload);
        const { error } = await supabase.from('offres').update(payload).eq('id', offer.id);
        if (error) throw error;
        toast.success('Offre mise à jour avec succès');
      } else {
        console.log('📤 Envoi INSERT vers Supabase:', payload);
        const { error } = await supabase.from('offres').insert(payload);
        if (error) throw error;
        toast.success('Nouvelle offre créée avec succès');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('❌ Erreur Supabase:', err);
      toast.error('Erreur enregistrement : ' + (err.message || 'Problème de connexion'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={mode === 'edit' ? '✏️ Modifier l\'offre' : '➕ Nouvelle offre'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Nom de l'offre *</label>
          <input
            type="text"
            className="w-full h-11 px-4 rounded-xl border bg-gray-50 text-xs font-bold outline-none focus:border-emerald-500"
            placeholder="Ex: Formule Confort Seniors"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Catégorie *</label>
            <select
              className="w-full h-11 px-3 rounded-xl border bg-gray-50 text-xs font-bold outline-none cursor-pointer"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="senior">👴 Senior</option>
              <option value="maman_bebe">👶 Maman & Bébé</option>
              <option value="pack_confort">⭐ Pack Confort</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Périodicité</label>
            <select
              className="w-full h-11 px-3 rounded-xl border bg-gray-50 text-xs font-bold outline-none cursor-pointer"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="mensuelle">Mensuelle 📅</option>
              <option value="ponctuelle">Ponctuelle ⚡</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Tarif (FCFA) *</label>
            <input
              type="number"
              className="w-full h-11 px-4 rounded-xl border bg-gray-50 text-xs font-bold outline-none"
              placeholder="Ex: 45000"
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Nombre de visites</label>
            <input
              type="number"
              className="w-full h-11 px-4 rounded-xl border bg-gray-50 text-xs font-bold outline-none"
              placeholder="Ex: 4"
              value={formData.total_visits}
              onChange={e => setFormData({ ...formData, total_visits: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Durée (jours)</label>
            <input
              type="number"
              className="w-full h-11 px-4 rounded-xl border bg-gray-50 text-xs font-bold outline-none"
              placeholder="30"
              value={formData.duration_days}
              onChange={e => setFormData({ ...formData, duration_days: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Ordre affichage</label>
            <input
              type="number"
              className="w-full h-11 px-4 rounded-xl border bg-gray-50 text-xs font-bold outline-none"
              placeholder="0"
              value={formData.display_order}
              onChange={e => setFormData({ ...formData, display_order: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
          <textarea
            className="w-full p-3 rounded-xl border bg-gray-50 text-xs font-semibold outline-none h-20 resize-none"
            placeholder="Description détaillée de l'offre..."
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Points forts (1 par ligne)</label>
          <textarea
            className="w-full p-3 rounded-xl border bg-gray-50 text-xs font-semibold outline-none h-24 resize-none"
            placeholder="Visite médicale hebdomadaire&#10;Assistance téléphonique 24/7&#10;Rapport quotidien"
            value={formData.features}
            onChange={e => setFormData({ ...formData, features: e.target.value })}
          />
        </div>

        {/* BOUTONS DE VALIDATION DIRECTS */}
        <div className="flex gap-3 pt-4 border-t mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 h-11 rounded-xl border text-xs font-bold bg-white hover:bg-gray-50 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 h-11 rounded-xl text-white text-xs font-black transition-opacity hover:opacity-90 flex items-center justify-center gap-2 shadow-sm"
            style={{ background: colors.primary }}
          >
            {isLoading ? 'Enregistrement...' : 'Confirmer'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default OffersPage;
