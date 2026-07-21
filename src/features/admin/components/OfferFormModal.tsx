// 📁 src/features/admin/components/OfferFormModal.tsx
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
    };

    try {
      if (mode === 'edit' && offer) {
        await supabase.from('offres').update(payload).eq('id', offer.id);
        toast.success('Mis à jour');
      } else {
        await supabase.from('offres').insert(payload);
        toast.success('Créé');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Erreur enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalWithForm isOpen={true} onClose={onClose} onSubmit={handleSubmit} title={mode === 'edit' ? 'Modifier' : 'Créer'} icon={<Package/>} isLoading={isLoading}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input className="w-full h-10 px-3 rounded-lg border bg-gray-50" placeholder="Nom" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
        <input className="w-full h-10 px-3 rounded-lg border bg-gray-50" placeholder="Prix" type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
        <textarea className="col-span-full w-full p-3 rounded-lg border bg-gray-50 h-20" placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        <textarea className="col-span-full w-full p-3 rounded-lg border bg-gray-50 h-20" placeholder="Fonctionnalités (une par ligne)" value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} />
      </div>
    </ModalWithForm>
  );
};
