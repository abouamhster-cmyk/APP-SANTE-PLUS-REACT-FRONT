// 📁 src/components/subscriptions/VisitDaysPicker.tsx

import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { getThemeColors } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface VisitDaysPickerProps {
  subscriptionId: string;
  patientId: string;
  totalVisits: number;
  remainingVisits: number;
  startDate: string;
  endDate: string;
  preferredDays?: string[];
  onSave?: (preferences: { days: string[]; time: string }) => void;
  onClose?: () => void;
  colors?: any;
}

const DAYS = [
  { id: 'monday', label: 'Lundi', short: 'Lun' },
  { id: 'tuesday', label: 'Mardi', short: 'Mar' },
  { id: 'wednesday', label: 'Mercredi', short: 'Mer' },
  { id: 'thursday', label: 'Jeudi', short: 'Jeu' },
  { id: 'friday', label: 'Vendredi', short: 'Ven' },
  { id: 'saturday', label: 'Samedi', short: 'Sam' },
  { id: 'sunday', label: 'Dimanche', short: 'Dim' },
];

const DEFAULT_DAYS = ['monday', 'wednesday', 'friday'];
const DEFAULT_TIME = '09:00';

export const VisitDaysPicker = ({
  subscriptionId,
  patientId,
  totalVisits,
  remainingVisits,
  startDate,
  endDate,
  preferredDays = [],
  onSave,
  onClose,
  colors: propColors,
}: VisitDaysPickerProps) => {
  // ✅ Jargon dynamique selon le rôle
  const {
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const colors = propColors || getThemeColors('senior');
  const [selectedDays, setSelectedDays] = useState<string[]>(
    preferredDays.length > 0 ? preferredDays : DEFAULT_DAYS
  );
  const [preferredTime, setPreferredTime] = useState(DEFAULT_TIME);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'days' | 'preview'>('days');

  // ✅ Libellé dynamique pour le patient
  const getPatientLabel = () => {
    if (isFamily) return 'Proche';
    if (isAidant) return 'Personne accompagnée';
    if (isAdminOrCoordinator) return 'Bénéficiaire';
    return 'Patient';
  };

  const toggleDay = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter(d => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      toast.error('Veuillez sélectionner au moins un jour');
      return;
    }

    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/subscriptions/${subscriptionId}/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({
          preferred_days: selectedDays,
          preferred_time: preferredTime,
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de l\'enregistrement');

      toast.success('✅ Préférences enregistrées');
      if (onSave) {
        onSave({ days: selectedDays, time: preferredTime });
      }
    } catch (error) {
      console.error('Save preferences error:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Générer un aperçu du planning
  const generatePreview = () => {
    const preview: Date[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    let current = new Date(start);
    let count = 0;
    const maxVisits = Math.min(totalVisits, 10);

    while (current <= end && count < maxVisits) {
      const dayName = current.toLocaleDateString('en-US', { 
        weekday: 'long' 
      }).toLowerCase();
      
      if (selectedDays.includes(dayName)) {
        preview.push(new Date(current));
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return preview;
  };

  const previewDates = generatePreview();

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border max-w-2xl w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold" style={{ color: colors.text }}>
            📅 Choisir les jours de visite
          </h3>
          <p className="text-sm" style={{ color: colors.text + '60' }}>
            {remainingVisits} visites restantes sur {totalVisits} au total
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <XCircle size={24} style={{ color: colors.text }} />
        </button>
      </div>

      {/* Période */}
      <div className="p-4 rounded-xl mb-4" style={{ background: colors.primary + '05' }}>
        <p className="text-sm" style={{ color: colors.text + '60' }}>
          📅 Période : {formatDate(startDate)} → {formatDate(endDate)}
        </p>
        <p className="text-sm" style={{ color: colors.text + '60' }}>
          ⏱️ {totalVisits} visite{totalVisits > 1 ? 's' : ''} à planifier
        </p>
      </div>

      {/* Sélection des jours */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3" style={{ color: colors.text }}>
          Choisissez vos jours préférés
        </label>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day) => (
            <button
              key={day.id}
              onClick={() => toggleDay(day.id)}
              className={`p-3 rounded-xl text-center transition-all duration-200 ${
                selectedDays.includes(day.id)
                  ? 'text-white shadow-md scale-105'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
              }`}
              style={{
                background: selectedDays.includes(day.id) ? colors.primary : '#f9fafb',
              }}
            >
              <div className="text-xs font-medium">{day.short}</div>
              <div className="text-lg">{selectedDays.includes(day.id) ? '✅' : '○'}</div>
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: colors.text + '40' }}>
          {selectedDays.length} jour{selectedDays.length > 1 ? 's' : ''} sélectionné{selectedDays.length > 1 ? 's' : ''}
          {selectedDays.length === 0 && ' (sélectionnez au moins un jour)'}
        </p>
      </div>

      {/* Heure préférée */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
          Heure préférée
        </label>
        <div className="flex items-center gap-3">
          <Clock size={20} style={{ color: colors.primary }} />
          <input
            type="time"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className="px-4 py-2.5 rounded-xl border outline-none text-sm"
            style={{
              borderColor: colors.border,
              color: colors.text,
            }}
          />
          <span className="text-sm" style={{ color: colors.text + '40' }}>
            (heure approximative)
          </span>
        </div>
      </div>

      {/* Aperçu */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium" style={{ color: colors.text }}>
            Aperçu du planning
          </label>
          <button
            onClick={() => setViewMode(viewMode === 'days' ? 'preview' : 'days')}
            className="text-xs font-medium hover:underline"
            style={{ color: colors.primary }}
          >
            {viewMode === 'days' ? 'Voir l\'aperçu' : 'Voir les jours'}
          </button>
        </div>

        {viewMode === 'preview' ? (
          <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
            {previewDates.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {previewDates.map((date, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-white"
                  >
                    <span className="text-sm font-medium" style={{ color: colors.text }}>
                      {formatDate(date)}
                    </span>
                    <span className="text-sm" style={{ color: colors.text + '40' }}>
                      {preferredTime} • Visite #{index + 1}
                    </span>
                  </div>
                ))}
                {previewDates.length < totalVisits && (
                  <p className="text-xs text-center" style={{ color: colors.text + '40' }}>
                    + {totalVisits - previewDates.length} autres visites à planifier
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-center" style={{ color: colors.text + '40' }}>
                Aucune visite à planifier dans la période
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedDays.map((dayId) => {
              const day = DAYS.find(d => d.id === dayId);
              return (
                <span
                  key={dayId}
                  className="px-3 py-1.5 rounded-full text-sm"
                  style={{ background: colors.primary + '15', color: colors.primary }}
                >
                  {day?.label || dayId}
                </span>
              );
            })}
            {selectedDays.length === 0 && (
              <span className="text-sm" style={{ color: colors.text + '40' }}>
                Aucun jour sélectionné
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl font-medium border transition hover:bg-gray-50"
          style={{ borderColor: colors.border, color: colors.text }}
          disabled={isLoading}
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading || selectedDays.length === 0}
          className="flex-1 py-3 rounded-xl text-white font-medium transition hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: colors.primary }}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle size={18} />
              Enregistrer
            </>
          )}
        </button>
      </div>
    </div>
  );
};