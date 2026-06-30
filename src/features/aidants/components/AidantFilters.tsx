// 📁 frontend/src/features/aidants/components/AidantFilters.tsx

import { useState } from 'react';
import { X, Filter, Star, MapPin, Briefcase } from 'lucide-react';
import { AidantFilters as FiltersType, DEFAULT_FILTERS, AidantSpecialty } from '@/types';  

const SPECIALTIES = [
  { value: 'senior', label: '👴 Senior' },
  { value: 'maman_bebe', label: '👶 Maman & Bébé' },
  { value: 'accompagnement', label: '🤝 Accompagnement' },
  { value: 'autre', label: '📝 Autre' },
];

const ZONES = [
  'Cotonou',
  'Abomey-Calavi',
  'Porto-Novo',
  'Ouidah',
  'Bohicon',
  'Parakou',
  'Autre',
];

interface AidantFiltersProps {
  filters: FiltersType;
  onFilterChange: (filters: Partial<FiltersType>) => void;
  onClose: () => void;
  colors: any;
}

export const AidantFilters = ({
  filters,
  onFilterChange,
  onClose,
  colors,
}: AidantFiltersProps) => {
  const [localFilters, setLocalFilters] = useState<FiltersType>(filters);

  const handleChange = (key: keyof FiltersType, value: any) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onFilterChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const defaultFilters = { ...DEFAULT_FILTERS };
    setLocalFilters(defaultFilters);
    onFilterChange(defaultFilters);
    onClose();
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2" style={{ color: colors.text }}>
          <Filter size={18} style={{ color: colors.primary }} />
          Filtres
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Spécialité */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
            <Briefcase size={14} className="inline mr-1" />
            Spécialité
          </label>
          <select
            value={localFilters.specialty || ''}
            onChange={(e) => handleChange('specialty', e.target.value as AidantSpecialty || undefined)}
            className="w-full px-3 py-2 rounded-xl border outline-none text-sm"
            style={{ borderColor: colors.border, background: 'var(--color-background)' }}
          >
            <option value="">Toutes</option>
            {SPECIALTIES.map((spec) => (
              <option key={spec.value} value={spec.value}>
                {spec.label}
              </option>
            ))}
          </select>
        </div>

        {/* Zone */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
            <MapPin size={14} className="inline mr-1" />
            Zone
          </label>
          <select
            value={localFilters.zone || ''}
            onChange={(e) => handleChange('zone', e.target.value || undefined)}
            className="w-full px-3 py-2 rounded-xl border outline-none text-sm"
            style={{ borderColor: colors.border, background: 'var(--color-background)' }}
          >
            <option value="">Toutes</option>
            {ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>

        {/* Note minimale */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
            <Star size={14} className="inline mr-1" />
            Note minimale
          </label>
          <select
            value={localFilters.minRating || ''}
            onChange={(e) => handleChange('minRating', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full px-3 py-2 rounded-xl border outline-none text-sm"
            style={{ borderColor: colors.border, background: 'var(--color-background)' }}
          >
            <option value="">Toutes</option>
            <option value="4.5">⭐ 4.5+</option>
            <option value="4">⭐ 4.0+</option>
            <option value="3.5">⭐ 3.5+</option>
            <option value="3">⭐ 3.0+</option>
          </select>
        </div>

        {/* Expérience minimale */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
            <Briefcase size={14} className="inline mr-1" />
            Expérience minimum
          </label>
          <select
            value={localFilters.minExperience || ''}
            onChange={(e) => handleChange('minExperience', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 rounded-xl border outline-none text-sm"
            style={{ borderColor: colors.border, background: 'var(--color-background)' }}
          >
            <option value="">Aucune</option>
            <option value="1">1+ an</option>
            <option value="2">2+ ans</option>
            <option value="3">3+ ans</option>
            <option value="5">5+ ans</option>
          </select>
        </div>

        {/* Tri */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
            Trier par
          </label>
          <select
            value={localFilters.sortBy}
            onChange={(e) => handleChange('sortBy', e.target.value as 'rating' | 'experience_years' | 'total_missions' | 'active_assignments')}
            className="w-full px-3 py-2 rounded-xl border outline-none text-sm"
            style={{ borderColor: colors.border, background: 'var(--color-background)' }}
          >
            <option value="rating">⭐ Note</option>
            <option value="experience_years">📅 Expérience</option>
            <option value="total_missions">📋 Missions</option>
            <option value="active_assignments">👥 Assignations</option>
          </select>
        </div>

        {/* Ordre */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
            Ordre
          </label>
          <select
            value={localFilters.sortOrder}
            onChange={(e) => handleChange('sortOrder', e.target.value as 'asc' | 'desc')}
            className="w-full px-3 py-2 rounded-xl border outline-none text-sm"
            style={{ borderColor: colors.border, background: 'var(--color-background)' }}
          >
            <option value="desc">⬇️ Décroissant</option>
            <option value="asc">⬆️ Croissant</option>
          </select>
        </div>

        {/* Disponibilité */}
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localFilters.onlyAvailable !== false}
              onChange={(e) => handleChange('onlyAvailable', e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: colors.primary }}
            />
            <span className="text-sm font-medium" style={{ color: colors.text }}>
              🔍 Afficher uniquement les aidants disponibles
            </span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
        <button
          onClick={handleReset}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium border hover:bg-gray-50 transition"
          style={{ borderColor: colors.border, color: colors.text }}
        >
          Réinitialiser
        </button>
        <button
          onClick={handleApply}
          className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition hover:opacity-90"
          style={{ background: colors.primary }}
        >
          Appliquer les filtres
        </button>
      </div>
    </div>
  );
};
