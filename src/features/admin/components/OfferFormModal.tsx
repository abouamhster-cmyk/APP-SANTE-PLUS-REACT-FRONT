// 📁 src/features/admin/components/OfferFormModal.tsx
import { useState } from 'react';
import { Package, X } from 'lucide-react';
import { Offer } from '@/types';
import { supabase } from '@/lib/supabase';
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

  const [formData, setFormData] = useState({
    name: offer?.name || '',
    category: (offer?.category || 'senior') as any,
    type: (offer?.type || 'mensuelle') as any,
    description: offer?.description || '',
    price: offer?.price ? String(offer.price) : '',
    features: offer?.features?.join('\n') || '',
    total_visits: offer?.total_visits ? String(offer.total_visits) : '',
    display_order: offer?.display_order ? String(offer.display_order) : '0',
    duration_days: offer?.durationDays ? String(offer.durationDays) : '30',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Le backend est dynamique, donc on prépare juste l'objet propre
    const payload = {
      name: formData.name,
      category: formData.category,
      type: formData.type,
      description: formData.description || null,
      price: parseFloat(formData.price) || 0,
      features: formData.features.split('\n').filter(Boolean),
      total_visits: parseInt(formData.total_visits) || 0,
      duration_days: parseInt(formData.duration_days) || 30,
      display_order: parseInt(formData.display_order) || 0,
      is_active: true
    };

    try {
      if (mode === 'edit' && offer) {
        const { error } = await supabase.from('offres').update(payload).eq('id', offer.id);
        if (error) throw error;
        toast.success('Offre mise à jour');
      } else {
        const { error } = await supabase.from('offres').insert(payload);
        if (error) throw error;
        toast.success('Offre créée');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Erreur: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-black text-lg">{mode === 'edit' ? 'Modifier l\'offre' : 'Nouvelle offre'}</h2>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full h-11 px-4 rounded-xl border bg-gray-50" placeholder="Nom de l'offre" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <input className="w-full h-11 px-4 rounded-xl border bg-gray-50" type="number" placeholder="Prix (FCFA)" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
          <textarea className="w-full p-4 rounded-xl border bg-gray-50 h-20" placeholder="Description courte" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          <textarea className="w-full p-4 rounded-xl border bg-gray-50 h-20" placeholder="Fonctionnalités (une par ligne)" value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} />
          
          <button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl text-white font-bold" style={{ backgroundColor: colors.primary }}>
            {isLoading ? 'Chargement...' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
};
