// 📁 src/components/visits/VisitInfo.tsx
// ✅ COMPOSANT RÉUTILISABLE POUR AFFICHER LES INFOS D'UNE VISITE

import { Visit } from '@/types';

interface VisitInfoProps {
  visit: Visit;
}

export const getVisitDisplayName = (visit: Visit): string => {
  if (visit.patient) {
    return `${visit.patient.first_name} ${visit.patient.last_name}`;
  }
  if (visit.target_name) {
    return visit.target_name;
  }
  return 'Personnel';
};

export const getVisitDisplayAddress = (visit: Visit): string => {
  if (visit.patient?.address) {
    return visit.patient.address;
  }
  if (visit.target_type === 'personal') {
    return 'Adresse personnelle';
  }
  return 'Adresse non renseignée';
};

export const getVisitDisplayCategory = (visit: Visit): string => {
  if (visit.patient?.category === 'maman_bebe') {
    return '👶 Maman & Bébé';
  }
  if (visit.patient?.category === 'senior') {
    return '👴 Senior';
  }
  if (visit.target_type === 'personal') {
    return '👤 Personnel';
  }
  return 'Non spécifié';
};

export const getVisitDisplayType = (visit: Visit): string => {
  if (visit.patient) {
    return 'Proche';
  }
  if (visit.target_type === 'personal') {
    return '👤 Personnel';
  }
  return 'Visite';
};
