// 📁 src/features/journal/components/RatingModal.tsx
// 📌 Modal d'évaluation d'une visite

import { useState } from 'react';
import { X, Star, StarHalf } from 'lucide-react';
import { useTerminology } from '@/hooks/useTerminology';
import toast from 'react-hot-toast';

interface RatingModalProps {
  visit: any;
  onClose: () => void;
  onSubmit: (visitId: string, rating: number, feedback: string) => Promise<void>;
  colors: any;
}

export const RatingModal = ({ visit, onClose, onSubmit, colors }: RatingModalProps) => {
  // ✅ Jargon dynamique selon le rôle
  const {
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Veuillez donner une note');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(visit.visit_id, rating, feedback);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Libellé dynamique pour le patient
  const getPatientLabel = () => {
    if (isFamily) return 'proche';
    if (isAidant) return 'personne accompagnée';
    if (isAdminOrCoordinator) return 'bénéficiaire';
    return 'patient';
  };

  // ✅ Message dynamique selon le rôle
  const getRatingMessage = () => {
    if (isFamily) {
      return `Évaluez la visite de votre ${getPatientLabel()}`;
    }
    if (isAidant) {
      return `Évaluez la visite de la ${getPatientLabel()}`;
    }
    return `Évaluez la visite du ${getPatientLabel()}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: colors.text }}>
            ⭐ Évaluer la visite
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        <div className="text-center mb-6">
          <p className="text-sm" style={{ color: colors.text + '60' }}>
            {getRatingMessage()}
          </p>
          <p className="text-sm mt-1" style={{ color: colors.text + '60' }}>
            Visite du {new Date(visit.date).toLocaleDateString('fr-FR')}
          </p>
          <p className="font-bold mt-2" style={{ color: colors.text }}>
            {visit.patient?.first_name} {visit.patient?.last_name}
          </p>
          <p className="text-sm" style={{ color: colors.text + '60' }}>
            avec {visit.aidant?.user?.full_name || 'un aidant'}
          </p>
        </div>

        {/* Étoiles */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                size={40}
                className={`${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                } transition-colors`}
              />
            </button>
          ))}
        </div>

        <p className="text-center text-sm font-medium mb-4" style={{ color: colors.text }}>
          {rating === 0 ? 'Sélectionnez une note' :
           rating === 1 ? '😞 À améliorer' :
           rating === 2 ? '🙁 Moyen' :
           rating === 3 ? '🙂 Bien' :
           rating === 4 ? '😊 Très bien' :
           '⭐ Excellent !'}
        </p>

        {/* Commentaire */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
            Votre retour (optionnel)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder="Partagez votre expérience..."
            className="w-full px-4 py-3 rounded-xl border outline-none text-sm resize-none"
            style={{
              borderColor: colors.border,
              background: 'var(--color-background)',
              color: colors.text,
            }}
          />
        </div>

        {/* Boutons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-medium border transition hover:bg-gray-50"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="flex-1 py-3 rounded-xl text-white font-bold transition hover:opacity-80 disabled:opacity-50"
            style={{ background: colors.primary }}
          >
            {isSubmitting ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
};