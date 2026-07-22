// 📁 src/features/admin/pages/OffersPage.tsx
// ✅ PAGE CATALOGUE DES OFFRES : GESTION DYNAMIQUE COMPLÈTE

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, Plus, Search, RefreshCw } from 'lucide-react';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/utils/helpers';
import { ModalWithForm } from '@/components/ui/Modal';
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

  const colors = getThemeColors(getThemeByRole(role, profile?.patient_category as any));

  useEffect(() => { fetchOffers(); }, []);

  const fetchOffers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('offres').select('*').order('display_order');
    if (error) toast.error('Erreur de chargement');
    setOffers(data || []);
    setIsLoading(false);
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || offer.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette offre ?')) return;
    await supabase.from('offres').delete().eq('id', id);
    toast.success('Offre supprimée');
    fetchOffers();
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12 px-4 sm:px-0">
      <section className="relative overflow-hidden rounded-3xl p-6 border border-black/5" style={{ background: `${colors.primary}08` }}>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-black">📦 Catalogue des formules</h1>
            <p className="text-xs font-semibold text-gray-500">Gestion des offres Santé Plus</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="h-11 px-5 rounded-xl text-white font-black text-xs flex items-center gap-2" style={{ background: colors.primary }}>
            <Plus size={16} /> Nouvelle offre
          </button>
        </div>
      </section>

      {/* Barre de recherche */}
      <section className="bg-white rounded-2xl p-3 border shadow-sm flex flex-col sm:flex-row gap-3">
        <input className="flex-1 h-11 px-4 rounded-xl border bg-gray-50 text-xs font-bold" placeholder="Rechercher..." onChange={e => setSearchTerm(e.target.value)} />
        <select className="h-11 px-4 rounded-xl border bg-gray-50 text-xs font-bold" onChange={e => setCategoryFilter(e.target.value)}>
          <option value="all">Toutes catégories</option>
          <option value="senior">👴 Senior</option>
          <option value="maman_bebe">👶 Maman</option>
        </select>
      </section>

      {/* Grille */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOffers.map((offer) => (
          <div key={offer.id} className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col">
            <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full w-fit" style={{ background: getCategoryColor(offer.category) + '10', color: getCategoryColor(offer.category) }}>{getCategoryLabel(offer.category)}</span>
            <h3 className="font-black text-sm mt-3">{offer.name}</h3>
            <p className="text-xl font-black mt-2" style={{ color: colors.primary }}>{formatCurrency(offer.price || 0)}</p>
            <div className="flex gap-2 mt-auto pt-4">
              <button onClick={() => { setSelectedOffer(offer); setShowEditModal(true); }} className="flex-1 py-2 rounded-xl border font-bold text-xs">Modifier</button>
              <button onClick={() => handleDelete(offer.id)} className="px-3 rounded-xl border border-red-100 text-red-500 text-xs font-bold">X</button>
            </div>
          </div>
        ))}
      </section>

      {showCreateModal && <OfferFormModal mode="create" colors={colors} onClose={() => setShowCreateModal(false)} onSuccess={fetchOffers} />}
      {showEditModal && selectedOffer && <OfferFormModal mode="edit" offer={selectedOffer} colors={colors} onClose={() => { setShowEditModal(false); setSelectedOffer(null); }} onSuccess={fetchOffers} />}
    </div>
  );
};

// =============================================
// MODAL FORMULAIRE
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
    total_orders: offer?.total_orders ? String(offer.total_orders) : '0',
    display_order: offer?.display_order ? String(offer.display_order) : '0',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const payload = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      features: formData.features.split('\n').filter(Boolean),
      total_visits: parseInt(formData.total_visits) || 0,
      total_orders: parseInt(formData.total_orders) || 0,
      display_order: parseInt(formData.display_order) || 0,
      updated_at: new Date().toISOString()
    };

    try {
      if (mode === 'edit') await supabase.from('offres').update(payload).eq('id', offer.id);
      else await supabase.from('offres').insert(payload);
      
      toast.success('Enregistré avec succès');
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error('Erreur : ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalWithForm isOpen={true} onClose={onClose} onSubmit={handleSubmit} title={mode === 'edit' ? 'Modifier' : 'Créer'} isLoading={isLoading}>
      <div className="grid grid-cols-1 gap-4">
        <input className="w-full h-11 px-4 rounded-xl border" placeholder="Nom" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
        <div className="grid grid-cols-2 gap-4">
          <input type="number" className="h-11 px-4 rounded-xl border" placeholder="Prix" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
          <input type="number" className="h-11 px-4 rounded-xl border" placeholder="Visites" value={formData.total_visits} onChange={e => setFormData({...formData, total_visits: e.target.value})} />
        </div>
        <textarea className="w-full p-4 rounded-xl border h-24" placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        <textarea className="w-full p-4 rounded-xl border h-24" placeholder="Fonctionnalités (une par ligne)" value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} />
      </div>
    </ModalWithForm>
  );
};

export default OffersPage;
