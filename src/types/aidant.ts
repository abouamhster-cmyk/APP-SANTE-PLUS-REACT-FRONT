// 📁 frontend/src/types/aidant.ts
// ============================================================
// TYPES UNIFIÉS - TOUS LES TYPES POUR LA GESTION DES AIDANTS
// ============================================================

export type AidantSpecialty = 'senior' | 'maman_bebe' | 'accompagnement' | 'autre';
export type AidantAvailabilityStatus = 'available' | 'full' | 'unavailable';
export type AssignmentType = 'permanente' | 'temporaire' | 'ponctuelle';
export type AssignmentStatus = 'pending' | 'active' | 'completed' | 'cancelled';

// ============================================================
// INTERFACE UTILISATEUR AIDANT
// ============================================================

export interface AidantUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
}

// ============================================================
// PROFIL AIDANT - VERSION COMPLÈTE
// ============================================================

export interface AidantProfile {
  id: string;
  user_id: string;
  user: AidantUser;
  specialties: AidantSpecialty[];
  available: boolean;
  rating: number;
  total_missions: number;
  completed_missions: number;
  cancelled_missions: number;
  bio: string | null;
  address: string | null;
  zones: string[];
  experience_years: number;
  is_verified: boolean;
  active_assignments: number;
  max_assignments: number;
  avg_rating: number;
  total_reviews: number;
  is_available: boolean;
  availability_status: AidantAvailabilityStatus;
  hourly_rate: number | null;
  average_response_time: number | null;
  patients?: PatientAssignment[];
  reviews?: AidantReview[];
}

// ============================================================
// PATIENT ASSIGNÉ À UN AIDANT
// ============================================================

export interface PatientAssignment {
  patient_id: string;
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    address: string;
    category: string;
  };
  is_primary: boolean;
  created_at: string;
}

// ============================================================
// ASSIGNATION AIDANT → PATIENT
// ============================================================

export interface AidantAssignment {
  id: string;
  patient_id: string;
  family_id: string;          // ← L'aidant est stocké dans family_id
  is_primary: boolean;
  relationship: AssignmentType;
  created_at: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    address: string;
    category: string;
    status: string;
  };
  aidant?: AidantProfileCompact;
}

// ============================================================
// PROFIL AIDANT - VERSION COMPACTE (pour les listes)
// ============================================================

export interface AidantProfileCompact {
  id: string;
  user_id: string;
  specialties: AidantSpecialty[];
  available: boolean;
  rating: number;
  user: AidantUser;
}

// ============================================================
// AVIS SUR UN AIDANT
// ============================================================

export interface AidantReview {
  id: string;
  aidant_id: string;
  family_id: string;
  rating: number;
  comment: string | null;
  categories: {
    professionalism?: number;
    communication?: number;
    punctuality?: number;
    kindness?: number;
  };
  created_at: string;
  family?: {
    full_name: string;
  };
}

// ============================================================
// FILTRES POUR LE CATALOGUE
// ============================================================

export interface AidantFilters {
  zone?: string;
  specialty?: AidantSpecialty;
  minRating?: number;
  onlyAvailable?: boolean;
  minExperience?: number;
  sortBy: 'rating' | 'experience_years' | 'total_missions' | 'active_assignments';
  sortOrder: 'asc' | 'desc';
  limit: number;
  offset: number;
}

export const DEFAULT_FILTERS: AidantFilters = {
  onlyAvailable: true,
  sortBy: 'rating',
  sortOrder: 'desc',
  limit: 20,
  offset: 0,
};

// ============================================================
// REQUÊTES D'ASSIGNATION
// ============================================================

export interface AssignAidantRequest {
  aidantId: string;
  patientId: string;
  assignmentType?: AssignmentType;
}

export interface AssignAidantResponse {
  success: boolean;
  message: string;
  data: {
    assignment: AidantAssignment;
    aidant: AidantProfile;
  };
}
