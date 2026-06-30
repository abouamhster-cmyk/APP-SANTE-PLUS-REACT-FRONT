// 📁 frontend/src/types/aidant.ts

// ============================================================
// TYPES DE BASE (CENTRALISÉS)
// ============================================================

export type AidantSpecialty = 'senior' | 'maman_bebe' | 'accompagnement' | 'autre';
export type AidantAvailabilityStatus = 'available' | 'full' | 'unavailable';
export type AssignmentType = 'permanente' | 'temporaire' | 'ponctuelle';
export type AssignmentStatus = 'pending' | 'active' | 'completed' | 'cancelled';

// ============================================================
// INTERFACES PRINCIPALES
// ============================================================

export interface AidantUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
}

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

export interface AidantAssignment {
  id: string;
  patient_id: string;
  family_id: string;
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

export interface AidantProfileCompact {
  id: string;
  user_id: string;
  specialties: AidantSpecialty[];
  available: boolean;
  rating: number;
  user: AidantUser;
}

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
// FILTRES ET REQUÊTES
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
// ASSIGNATION
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
