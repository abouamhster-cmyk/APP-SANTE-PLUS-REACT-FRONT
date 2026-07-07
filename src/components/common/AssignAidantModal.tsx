// 📁 src/components/common/AssignAidantModal.tsx

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { assignmentAPI } from '@/lib/api';
import { getThemeColors } from '@/lib/permissions';
import { UserPlus, Loader2, CheckCircle, XCircle, User, Users, AlertCircle } from 'lucide-react';
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

const ASSIGNMENT_TYPES = [
  { value: 'primary', label: '📌 Permanente', color: '#10B981' },
  { value: 'temporary', label: '⏳ Temporaire', color: '#F59E0B' },
  { value: 'secondary', label: '⚡ Ponctuelle', color: '#3B82F6' },
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
  const [aidants, setAidants] = useState<Aidant[]>([]);
  const [selectedAidant, setSelectedAidant] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignmentType, setAssignmentType] = useState('primary');
  const [searchTerm, setSearchTerm] = useState('');

  const colors = getThemeColors('senior');

  useEffect(() => {
    if (isOpen) {
      fetchAvailableAidants();
    }
  }, [isOpen]);

  const fetchAvailableAidants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('aidants')
        .select(`
          *,
          user:profiles!aidants_user_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('available', true)
        .eq('is_verified', true)
        .eq('status', 'approved')
        .order('rating', { ascending: false });

      if (error) throw error;
      setAidants(data || []);
    } catch (error) {
      console.error('❌ Fetch aidants error:', error);
      // ✅ UN SEUL TOAST D'ERREUR
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
      // ✅ Trouver l'aidant dans la table aidants pour obtenir son ID
      const { data: aidantData, error: aidantError } = await supabase
        .from('aidants')
        .select('id')
        .eq('user_id', selectedAidant)
        .single();

      if (aidantError || !aidantData) {
        throw new Error('Aidant non trouvé');
      }

      // ✅ Mettre à jour la cible avec l'aidant
      const table = targetType === 'order' ? 'commandes' : 'visites';
      const updateData: any = {
        aidant_id: aidantData.id,
        updated_at: new Date().toISOString(),
      };

      // ✅ Si c'est une commande, passer en 'en_cours'
      if (targetType === 'order') {
        updateData.status = 'en_cours';
      }
      // ✅ Si c'est une visite, passer en 'planifiee' (si elle était expirée ou refusée)
      else if (targetType === 'visit') {
        const { data: visit } = await supabase
          .from('visites')
          .select('status')
          .eq('id', targetId)
          .single();

        if (visit && ['expire', 'refusee', 'annulee'].includes(visit.status)) {
          updateData.status = 'planifiee';
        }
      }

      const { error: updateError } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', targetId);

      if (updateError) throw updateError;

      // ✅ Créer une notification pour l'aidant
      await supabase.from('notifications').insert({
        user_id: selectedAidant,
        title: targetType === 'order' ? '📦 Nouvelle commande assignée' : '📅 Nouvelle visite assignée',
        body: `Vous avez été assigné à ${targetName} par l'administrateur.`,
        type: targetType === 'order' ? 'commande' : 'visite',
        data: {
          [targetType === 'order' ? 'order_id' : 'visit_id']: targetId,
          action: targetType === 'order' ? 'take' : 'approve',
          assigned_by: 'admin',
        },
      });

      // ✅ Notification à la famille
      if (targetType === 'visit') {
        const { data: visit } = await supabase
          .from('visites')
          .select('user_id')
          .eq('id', targetId)
          .single();

        if (visit?.user_id) {
          await supabase.from('notifications').insert({
            user_id: visit.user_id,
            title: '✅ Aidant assigné à la visite',
            body: `Un aidant a été assigné à votre visite pour ${targetName}.`,
            type: 'visite',
            data: { visit_id: targetId, action: 'info' },
          });
        }
      }

      // ✅ UN SEUL TOAST DE SUCCÈS
      toast.success(`Aidant assigné avec succès à ${targetName}`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ Assign error:', error);
      // ✅ UN SEUL TOAST D'ERREUR
      toast.error(error.message || 'Erreur lors de l\'assignation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
            style={{ borderColor: colors.border, color: colors.text }}
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
            className="w-full px-3.5 py-2 rounded-xl border outline-none text-sm focus:ring-1"
            style={{ borderColor: colors.border, color: colors.text }}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filteredAidants.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
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

                return (
                  <button
                    key={aidant.id}
                    onClick={() => setSelectedAidant(aidant.user_id)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-[--color-primary] bg-[--color-primary]05 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${isCurrent ? 'opacity-50' : ''}`}
                    style={{
                      borderColor: isSelected ? colors.primary : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: colors.primary }}
                        >
                          {aidant.user?.full_name?.charAt(0) || 'A'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate" style={{ color: colors.text }}>
                            {aidant.user?.full_name || 'Aidant'}
                            {isCurrent && (
                              <span className="ml-2 text-xs text-gray-400">(actuel)</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>⭐ {aidant.rating || 0}</span>
                            <span>•</span>
                            <span>📋 {aidant.total_missions || 0} missions</span>
                            <span>•</span>
                            <span>{aidant.current_assignments || 0}/{aidant.max_assignments || 4}</span>
                            {aidant.specialties?.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[100px]">
                                  {aidant.specialties.slice(0, 2).join(', ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle size={16} style={{ color: colors.primary }} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Type d'assignation */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
                Type d'assignation
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ASSIGNMENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setAssignmentType(type.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                      assignmentType === type.value
                        ? 'text-white shadow-sm'
                        : 'border text-gray-600 hover:bg-gray-50'
                    }`}
                    style={{
                      background: assignmentType === type.value ? colors.primary : 'transparent',
                      borderColor: assignmentType === type.value ? colors.primary : colors.border,
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Information */}
            {currentAidantId && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  ℹ️ Un aidant est déjà assigné. Le remplacer par un autre.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
