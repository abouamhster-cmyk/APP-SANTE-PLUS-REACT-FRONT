// 📁 src/features/admin/components/OfferFormModal.tsx
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, X } from 'lucide-react';
import { Offer } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  mode: 'create' | 'edit';
  offer?: Offer;
  onClose: () => void;
  onSuccess: () => void;
  colors: any;
}

export const OfferFormModal = ({ mode, offer, onClose, onSuccess, colors }: Props) => {
  const [isLoading, setIsLoading] = useState(false);

  // Initialisation du formulaire
  const [formData, setFormData] = useState({
    name: offer?.name || '',
    category: offer?.category || 'senior',
    type: offer?.type || 'mensuelle',
    description: offer?.description || '', 
    price: offer?.price ? String(offer.price) : '',
    features: offer?.features?.join('\n') || '', 
    visits_per_week: offer?.visitsPerWeek ? String(offer.visitsPerWeek) : '',
    duration_days: offer?.durationDays ? String(offer.durationDays) : '',
    total_visits: offer?.total_visits ? String(offer.total_visits) : '',
    total_orders: offer?.total_orders ? String(offer.total_orders) : '0',
    badge: offer?.badge || '',
    is_active: offer?.is_active ?? true,
    display_order: offer?.display_order ? String(offer.display_order) : '0',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        type: formData.type,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        features: formData.features.split('\n').filter(f => f.trim() !== ''),
        visits_per_week: formData.visits_per_week ? parseInt(formData.visits_per_week) : null,
        duration_days: formData.duration_days ? parseInt(formData.duration_days) : null,
        total_visits: formData.total_visits ? parseInt(formData.total_visits) : null,
        total_orders: formData.total_orders ? parseInt(formData.total_orders) : 0,
        badge: formData.badge,
        is_active: formData.is_active,
        display_order: parseInt(formData.display_order) || 0,
      };

      if (mode === 'edit' && offer) {
        const { error } = await supabase.from('offres').update(payload).eq('id', offer.id);
        if (error) throw error;
        toast.success('Formule mise à jour');
      } else {
        const { error } = await supabase.from('offres').insert(payload);
        if (error) throw error;
        toast.success('Nouvelle formule créée');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Erreur : ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black">{mode === 'edit' ? '✏️ Modifier l\'offre' : '➕ Nouvelle offre'}</h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-full">
              <label className="block text-xs font-bold mb-1.5">Nom de l'offre *</label>
              <input className="w-full h-11 px-4 rounded-xl border bg-gray-50 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">Prix (FCFA)</label>
              <input type="number" className="w-full h-11 px-4 rounded-xl border bg-gray-50 outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
            </div>
            
            <div>
              <label className="block text-xs font-bold mb-1.5">Badge</label>
              <input className="w-full h-11 px-4 rounded-xl border bg-gray-50 outline-none" value={formData.badge} onChange={e => setFormData({...formData, badge: e.target.value})} />
            </div>

            <div className="col-span-full">
              <label className="block text-xs font-bold mb-1.5">Description (multi-lignes)</label>
              <textarea className="w-full p-4 rounded-xl border bg-gray-50 outline-none h-24" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <div className="col-span-full">
              <label className="block text-xs font-bold mb-1.5">Fonctionnalités (une par ligne)</label>
              <textarea className="w-full p-4 rounded-xl border bg-gray-50 outline-none h-24" placeholder="Ex: Assistance 24/7&#10;Livraison gratuite" value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 rounded-xl text-white font-bold"
            style={{ background: colors.primary }}
          >
            {isLoading ? 'Enregistrement...' : (mode === 'edit' ? 'Sauvegarder' : 'Créer')}
          </button>
        </form>
      </div>
    </div>
  );
};
