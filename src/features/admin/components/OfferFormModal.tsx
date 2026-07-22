import { useState } from 'react';
import { Package } from 'lucide-react';
import { ModalWithForm } from '@/components/ui/Modal';
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
    total_orders: offer?.total_orders ? String(offer.total_orders) : '0',
    display_order: offer?.display_order ? String(offer.display_order) : '0',
    duration_days: offer?.durationDays ? String(offer.durationDays) : '30',
  });

  // ✅ Cette fonction sera appelée par le composant ModalWithForm via la prop onSubmit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Empêche le rafraîchissement de page
    setIsLoading(true);
    
    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        type: formData.type,
        description: formData.description || null,
        price: parseFloat(formData.price) || 0,
        features: formData.features.split('\n').filter(Boolean),
        total_visits: parseInt(formData.total_visits) || 0,
        total_orders: parseInt(formData.total_orders) || 0,
        display_order: parseInt(formData.display_order) || 0,
        duration_days: parseInt(formData.duration_days) || 30,
        updated_at: new Date().toISOString()
      };

      if (mode === 'edit' && offer) {
        const { error } = await supabase.from('offres').update(payload).eq('id', offer.id);
        if (error) throw error;
        toast.success('Offre mise à jour');
      } else {
        const { error } = await supabase.from('offres').insert(payload);
        if (error) throw error;
        toast.success('Nouvelle offre créée');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Erreur : ' + err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalWithForm
      isOpen={true}
      onClose={onClose}
      onSubmit={handleSubmit} // ✅ Le Modal gère l'événement du formulaire
      title={mode === 'edit' ? 'Modifier l\'offre' : 'Nouvelle offre'}
      icon={<Package size={20} />}
      maxWidth="2xl"
      confirmLabel="Enregistrer"
      isLoading={isLoading}
    >
      {/* ✅ PLUS DE BALISE <form> ICI, juste les champs ! */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1">Nom *</label>
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
