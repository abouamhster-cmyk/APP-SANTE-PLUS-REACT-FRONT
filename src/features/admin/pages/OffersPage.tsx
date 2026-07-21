// 📁 src/features/admin/pages/OffersPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, Plus, RefreshCw, Pencil, Trash } from 'lucide-react';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/utils/helpers';
import { OfferFormModal } from '../components/OfferFormModal';
import { Offer } from '@/types';
import toast from 'react-hot-toast';

const OffersPage = () => {
  const { profile, role } = useAuthStore();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const colors = getThemeColors(getThemeByRole(role, profile?.patient_category as any));

  const fetchOffers = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('offres').select('*').order('display_order');
    setOffers(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchOffers(); }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette offre ?')) return;
    await supabase.from('offres').delete().eq('id', id);
    toast.success('Offre supprimée');
    fetchOffers();
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <header className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border">
        <h1 className="text-xl font-black">Catalogue des formules</h1>
        <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-black text-white rounded-xl text-sm font-bold flex items-center gap-2">
          <Plus size={16} /> Ajouter
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {offers.map((offer) => (
          <div key={offer.id} className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-black">{offer.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{offer.description}</p>
              <p className="text-xl font-black mt-3">{formatCurrency(offer.price || 0)}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setSelectedOffer(offer); setShowEditModal(true); }} className="p-2 bg-gray-100 rounded-lg"><Pencil size={16}/></button>
              <button onClick={() => handleDelete(offer.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash size={16}/></button>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && <OfferFormModal mode="create" colors={colors} onClose={() => setShowCreateModal(false)} onSuccess={fetchOffers} />}
      {showEditModal && selectedOffer && <OfferFormModal mode="edit" offer={selectedOffer} colors={colors} onClose={() => setShowEditModal(false)} onSuccess={fetchOffers} />}
    </div>
  );
};
export default OffersPage;
