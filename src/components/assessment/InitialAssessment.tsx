// 📁 frontend/src/components/assessment/InitialAssessment.tsx

import { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { getThemeColors } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';  
import toast from 'react-hot-toast';

interface AssessmentProps {
  category: 'senior' | 'maman_bebe';
  onComplete: (data: any) => void;
  onSkip: () => void;
}

const SENIOR_QUESTIONS = [
  {
    id: 'mobility',
    question: 'La personne peut-elle se déplacer seule ?',
    options: ['Oui, facilement', 'Avec difficulté', 'Non, besoin d\'aide'],
    icon: '🚶',
  },
  {
    id: 'medications',
    question: 'Combien de médicaments par jour ?',
    options: ['0-2', '3-5', '6 ou plus'],
    icon: '💊',
  },
  {
    id: 'family_support',
    question: 'La famille est-elle proche ?',
    options: ['Oui, très présente', 'Présence occasionnelle', 'Éloignée'],
    icon: '👨‍👩‍👦',
  },
  {
    id: 'appointments',
    question: 'Avez-vous besoin d\'aide pour les rendez-vous médicaux ?',
    options: ['Non', 'Parfois', 'Oui, souvent'],
    icon: '🏥',
  },
  {
    id: 'daily_tasks',
    question: 'A-t-elle des difficultés pour les tâches quotidiennes ?',
    options: ['Non', 'Parfois', 'Oui, souvent'],
    icon: '🧹',
  },
];

const MAMAN_QUESTIONS = [
  {
    id: 'first_baby',
    question: 'Est-ce le premier bébé ?',
    options: ['Oui', 'Non'],
    icon: '👶',
  },
  {
    id: 'breastfeeding',
    question: 'Type d\'allaitement ?',
    options: ['Allaitement maternel', 'Biberon', 'Mixte'],
    icon: '🍼',
  },
  {
    id: 'postpartum_support',
    question: 'Avez-vous du soutien pour le post-partum ?',
    options: ['Oui, beaucoup', 'Un peu', 'Pas de soutien'],
    icon: '🤗',
  },
  {
    id: 'sleep',
    question: 'Avez-vous des difficultés de sommeil ?',
    options: ['Non', 'Parfois', 'Souvent'],
    icon: '😴',
  },
  {
    id: 'baby_care',
    question: 'Vous sentez-vous à l\'aise avec les soins du bébé ?',
    options: ['Oui, totalement', 'Un peu stressée', 'Besoin d\'aide'],
    icon: '🧸',
  },
];

export const InitialAssessment = ({ category, onComplete, onSkip }: AssessmentProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const colors = getThemeColors('senior');
  const { user, profile } = useAuthStore();

  const questions = category === 'senior' ? SENIOR_QUESTIONS : MAMAN_QUESTIONS;
  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;
  const progress = ((currentStep + 1) / questions.length) * 100;

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
  };

  const handleNext = () => {
    if (!answers[currentQuestion.id]) {
      toast.error('Veuillez répondre à la question');
      return;
    }
    
    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Calculer un score simple
      const score = Object.keys(answers).length;
      
      // Préparer les données
      const assessmentData = {
        category,
        responses: answers,
        score,
        recommendations: generateRecommendations(answers, category),
        userId: user?.id,
        patientId: null, 
      };

      // Appel API pour sauvegarder l'évaluation
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(assessmentData),
      });

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde');

      const result = await response.json();
      toast.success('✅ Évaluation complétée !');
      onComplete(result);
    } catch (error) {
      console.error('Submit assessment error:', error);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateRecommendations = (answers: Record<string, string>, category: string) => {
    const recommendations: string[] = [];
    
    if (category === 'senior') {
      if (answers.mobility === 'Non, besoin d\'aide') {
        recommendations.push('🚶 Accompagnement aux déplacements recommandé');
      }
      if (answers.medications === '6 ou plus') {
        recommendations.push('💊 Suivi médicamenteux renforcé recommandé');
      }
      if (answers.family_support === 'Éloignée') {
        recommendations.push('👨‍👩‍👦 Coordination familiale à distance recommandée');
      }
      if (answers.daily_tasks === 'Oui, souvent') {
        recommendations.push('🧹 Aide aux tâches quotidiennes recommandée');
      }
    } else {
      if (answers.first_baby === 'Oui') {
        recommendations.push('👶 Accompagnement post-partum pour primo-parent');
      }
      if (answers.postpartum_support === 'Pas de soutien') {
        recommendations.push('🤗 Soutien moral et présence rassurante recommandée');
      }
      if (answers.baby_care === 'Besoin d\'aide') {
        recommendations.push('🧸 Aide aux soins du bébé recommandée');
      }
      if (answers.sleep === 'Souvent') {
        recommendations.push('😴 Soutien pour les difficultés de sommeil recommandé');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Suivi régulier recommandé');
    }

    return recommendations;
  };

  // ✅ Si l'utilisateur a déjà répondu, afficher un résumé
  const hasAnswers = Object.keys(answers).length > 0;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg max-w-2xl w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>
              📋 Évaluation initiale
            </h2>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {category === 'senior' ? '👴 Senior' : '👶 Maman & Bébé'}
            </p>
          </div>
          <button
            onClick={onSkip}
            className="text-sm hover:underline"
            style={{ color: colors.text + '60' }}
            disabled={isSubmitting}
          >
            Passer
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: colors.primary }}
            />
          </div>
          <span className="text-xs" style={{ color: colors.text + '40' }}>
            {currentStep + 1}/{questions.length}
          </span>
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{currentQuestion.icon}</span>
          <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
            {currentQuestion.question}
          </h3>
        </div>
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(option)}
              className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                answers[currentQuestion.id] === option
                  ? 'border-[--color-primary] shadow-md scale-[1.02]'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              style={{
                background: answers[currentQuestion.id] === option 
                  ? colors.primary + '10' 
                  : 'transparent',
              }}
            >
              <div className="flex items-center justify-between">
                <span style={{ color: colors.text }}>{option}</span>
                {answers[currentQuestion.id] === option && (
                  <CheckCircle size={20} style={{ color: colors.primary }} />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={handlePrevious}
          className={`flex-1 py-3 rounded-xl font-medium border transition ${
            currentStep === 0
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-gray-50'
          }`}
          style={{ borderColor: colors.border, color: colors.text }}
          disabled={currentStep === 0 || isSubmitting}
        >
          <div className="flex items-center justify-center gap-2">
            <ChevronLeft size={18} />
            Précédent
          </div>
        </button>
        <button
          onClick={handleNext}
          disabled={!answers[currentQuestion.id] || isSubmitting}
          className="flex-1 py-3 rounded-xl text-white font-medium transition hover:opacity-80 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: colors.primary }}
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Envoi...
            </>
          ) : isLastStep ? (
            <>
              <CheckCircle size={18} />
              Terminer
            </>
          ) : (
            <>
              Suivant
              <ChevronRight size={18} />
            </>
          )}
        </button>
      </div>

      {/* Note */}
      <p className="text-xs text-center mt-4" style={{ color: colors.text + '30' }}>
        Ces informations nous aident à mieux comprendre vos besoins
      </p>
    </div>
  );
};