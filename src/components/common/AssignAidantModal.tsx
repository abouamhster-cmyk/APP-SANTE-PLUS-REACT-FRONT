// 📁 src/components/common/AssignAidantModal.tsx
 
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';  
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { useBranding } from '@/hooks/useBranding';
import { UserPlus, Loader2, CheckCircle, XCircle, User, Star } from 'lucide-react';
import toast from 'react-hot-toast';

interface AssignAidantModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'order' | 'visit';
  targetId: string;
  targetName: string;
  onSuccess: () => void;
  currentAidantId?: string | null;
}

interface Aidant {
  id: string;
  user_id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  available: boolean;
  is_verified: boolean;
  status: string;
  rating: number;
  specialties: string[];
  total_missions: number;
  max_assignments: number;
  current_assignments: number;
}

// ✅ SÉLECTION SIMPLIFIÉE À DEUX ÉLÉMENTS (Temporaire retiré) [23]
const ASSIGNMENT_TYPES = [
  { value: 'secondary', label: '⚡ Ponctuelle', color: '#3B82F6' },
  { value: 'primary', label: '📌 Permanente', color: '#10B981' },
];

export const AssignAidantModal = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  onSuccess,
  currentAidantId,
}: AssignAidantModalProps) => {
  const brand = useBranding();
  const colors = brand.colors;
  
  const [aidants, setAidants] = useState<Aidant[]>([]);
  const [selectedAidant, setSelectedAidant] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignmentType, setAssignmentType] = useState('secondary'); // Ponctuel par défaut pour les courses [23]
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAvailableAidants();
    }
  }, [isOpen]);

  const fetchAvailableAidants = async () => {
    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Token manquant');

      const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';
      
      // ✅ CHARGEMENT COHÉRENT : Appel à l'API unifiée pour récupérer les aidants avec quotas réels [30]
      const response = await fetch(`${API_URL}/visits/available-aidants`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erreur lors du chargement des aidants');
      const result = await response.json();
      setAidants(result.data || []);
    } catch (error) {
      console.error('❌ Fetch aidants error:', error);
      toast.error('Erreur lors du chargement des aidants');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAidants = aidants.filter(aidant => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      aidant.user?.full_name?.toLowerCase().includes(term) ||
      aidant.specialties?.some(s => s.toLowerCase().includes(term))
    );
  });

  const handleAssign = async () => {
    if (!selectedAidant) {
      toast.error('Veuillez sélectionner un aidant');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Token de session manquant');

      const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

      // ✅ APPEL APIS ADMINISTRATIVES SÉCURISÉES (Fini les écritures Supabase directes et incomplètes !) [30]
      if (targetType === 'visit') {
        const response = await fetch(`${API_URL}/assignments/admin/assign-to-visit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            visitId: targetId,
            aidantId: selectedAidant, // ID de l'utilisateur de l'aidant
            assignmentType: assignmentType === 'primary' ? 'permanente' : 'ponctuelle',
            force: true, // Forcer l'assignation si l'admin le souhaite
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erreur lors de l’assignation');

      } else if (targetType === 'order') {
        // Pour les commandes, appel à notre routeur d'ordre dédié
        const response = await fetch(`${API_URL}/orders/${targetId}/assign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            aidantUserId: selectedAidant,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erreur lors de l’assignation');
      }

      toast.success(`Aidant assigné avec succès à ${targetName}`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ Assign error:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // ✅ TÉLÉPORTATION PORTAIL : Rendu direct sur document.body pour supprimer tout décalage d'en-tête [23]
  return createPortal(
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`👤 Assigner un aidant - ${targetName}`}
      maxWidth="md"
      description={`Assigner un aidant à cette ${targetType === 'order' ? 'commande' : 'visite'}`}
      actions={
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold border hover:bg-gray-50 transition"
            style={{ borderColor: colors.primary + '25', color: colors.text }}
          >
            Annuler
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedAidant || isSubmitting}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: colors.primary }}
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <UserPlus size={18} />
                Assigner
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Recherche */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un aidant par nom ou spécialité..."
            className="w-full h-11 px-3.5 border rounded-xl outline-none text-xs font-bold bg-gray-50/50"
            style={{ borderColor: colors.primary + '25', color: colors.text }}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={24} className="animate-spin" style={{ color: colors.textLight }} />
          </div>
        ) : filteredAidants.length === 0 ? (
          <div className="text-center py-6" style={{ color: colors.textLight }}>
            <User size={32} className="mx-auto mb-2 opacity-30" />
            <p>Aucun aidant disponible</p>
            <p className="text-xs mt-1">Vérifiez qu'il y a des aidants approuvés et disponibles</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Sélection de l'aidant */}
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {filteredAidants.map((aidant) => {
                const isSelected = selectedAidant === aidant.user_id;
                const isCurrent = currentAidantId === aidant.id;

                const currentLoad = aidant.current_assignments || 0;
                const maxLoad = aidant.max_assignments || 4;

                return (
                  <button
                    key={aidant.id}
                    onClick={() => setSelectedAidant(aidant.user_id)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-[--color-primary] bg-[--color-primary]05 shadow-sm font-bold'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${isCurrent ? 'opacity-50' : ''}`}
                    style={{
                      borderColor: isSelected ? colors.primary : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                          style={{ background: colors.primary }}
                        >
                          {aidant.user?.full_name?.charAt(0) || 'A'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-sm truncate" style={{ color: colors.text }}>
                            {aidant.user?.full_name || 'Aidant'}
                            {isCurrent && (
                              <span className="ml-2 text-xs" style={{ color: colors.textLight }}>(actuel)</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 text-xs" style={{ color: colors.textLight }}>
                            <span className="flex items-center gap-0.5"><Star size={11} className="text-yellow-400 fill-yellow-400" /> {aidant.rating || 0}</span>
                            <span>•</span>
                            <span>📋 {aidant.total_missions || 0} missions</span>
                            <span>•</span>
                            <span className="font-bold">Charge ({currentLoad}/{maxLoad})</span> {/* ✅ Cohérence d'IHM de Charge [30] */}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Type d'assignation SIMPLIFIÉ À DEUX OPTIONS */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
                Type d'assignation
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ASSIGNMENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setAssignmentType(type.value)}
                    className={`px-3 h-10 rounded-xl text-xs font-bold transition ${
                      assignmentType === type.value
                        ? 'text-white shadow-sm font-extrabold'
                        : 'border text-gray-600 hover:bg-gray-50'
                    }`}
                    style={{
                      background: assignmentType === type.value ? colors.primary : 'transparent',
                      borderColor: assignmentType === type.value ? colors.primary : colors.primary + '25',
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>,
    document.body
  );
};

export default AssignAidantModal;
