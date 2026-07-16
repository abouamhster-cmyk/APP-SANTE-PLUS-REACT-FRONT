// 📁 src/features/journal/components/RatingModalContent.tsx
 
import { useState } from 'react';
import { Star, Calendar, User, MessageCircle, Send, CheckCircle, X } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { Illustration } from '@/components/ui/Illustration';
import toast from 'react-hot-toast';

interface RatingModalContentProps {
  visit: any;
  onSuccess: (visitId: string, rating: number, feedback: string) => Promise<void>;
  onCancel: () => void;
  colors: any;
}

// ✅ Messages de feedback par note
const RATING_MESSAGES = [
  { value: 1, label: 'À améliorer', icon: '😞' },
  { value: 2, label: 'Moyen', icon: '🙁' },
  { value: 3, label: 'Bien', icon: '🙂' },
  { value: 4, label: 'Très bien', icon: '😊' },
  { value: 5, label: 'Excellent !', icon: '⭐' },
];

export const RatingModalContent = ({
  visit,
  onSuccess,
  onCancel,
  colors: propColors,
}: RatingModalContentProps) => {
  const brand = useBranding();
  const colors = propColors || brand.colors;
  
  const {
    singular,
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
      await onSuccess(visit.visit_id, rating, feedback);
      toast.success('Merci pour votre évaluation !');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPatientLabel = () => {
    if (isFamily) return 'proche';
    if (isAidant) return 'personne accompagnée';
    if (isAdminOrCoordinator) return 'bénéficiaire';
    return 'patient';
  };

  const getRatingMessage = () => {
    if (isFamily) return `Évaluez la visite de votre ${getPatientLabel()}`;
    if (isAidant) return `Évaluez la visite de la ${getPatientLabel()}`;
    return `Évaluez la visite du ${getPatientLabel()}`;
  };

  const getRatingLabel = () => {
    if (rating === 0) return 'Sélectionnez une note';
    const found = RATING_MESSAGES.find(r => r.value === rating);
    return found ? found.label : '';
  };

  const getRatingIcon = () => {
    if (rating === 0) return null;
    const found = RATING_MESSAGES.find(r => r.value === rating);
    return found ? found.icon : null;
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Infos de la visite */}
      <div className="text-center p-4 rounded-2xl" style={{ background: colors.primary + '04' }}>
        <p className="text-sm" style={{ color: colors.textLight }}>
          {getRatingMessage()}
        </p>
        <div className="flex items-center justify-center gap-4 mt-2 text-xs" style={{ color: colors.textLight }}>
          <span className="flex items-center gap-1">
            <Calendar size={13} />
            {new Date(visit.date).toLocaleDateString('fr-FR')}
          </span>
          <span className="flex items-center gap-1">
            <User size={13} />
            {visit.patient?.first_name} {visit.patient?.last_name}
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: colors.textLight }}>
          avec {visit.aidant?.user?.full_name || 'un aidant'}
        </p>
      </div>

      {/* Étoiles */}
      <div className="flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= (hoveredRating || rating);
          return (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition-transform hover:scale-110 focus:outline-none"
              aria-label={`Noter ${star} étoiles`}
            >
              <Star
                size={36}
                className={`transition-colors ${
                  isActive
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-200'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Message de la note */}
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: rating > 0 ? colors.primary : colors.textLight }}>
          {rating > 0 ? (
            <span className="flex items-center justify-center gap-2">
              <span>{getRatingIcon()}</span>
              <span>{getRatingLabel()}</span>
            </span>
          ) : (
            'Sélectionnez une note'
          )}
        </p>
      </div>

      {/* Commentaire */}
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>
          Votre retour
          <span className="text-xs ml-1" style={{ color: colors.textLight }}>
            (optionnel)
          </span>
        </label>
        <div className="relative">
          <MessageCircle size={16} className="absolute left-3.5 top-3.5" style={{ color: colors.textLight }} />
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder="Partagez votre expérience..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl border outline-none text-sm resize-none transition focus:ring-2"
            style={{
              borderColor: colors.primary + '20',
              background: colors.background,
              color: colors.text,
            }}
          />
        </div>
        <p className="text-[10px] mt-1 text-right" style={{ color: colors.textLight }}>
          {feedback.length}/500
        </p>
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.primary + '15' }}>
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 py-3 rounded-2xl font-medium border transition hover:bg-gray-50 disabled:opacity-50"
          style={{ borderColor: colors.primary + '20', color: colors.text }}
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting}
          className="flex-1 py-3 rounded-2xl text-white font-bold transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: rating > 0 ? colors.primary : '#9CA3AF' }}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Envoi...
            </>
          ) : (
            <>
              <Send size={16} />
              Envoyer
            </>
          )}
        </button>
      </div>

      <p className="text-[10px] text-center" style={{ color: colors.textLight }}>
        Votre évaluation aide à améliorer la qualité du service
      </p>
    </div>
  );
};

export default RatingModalContent;
