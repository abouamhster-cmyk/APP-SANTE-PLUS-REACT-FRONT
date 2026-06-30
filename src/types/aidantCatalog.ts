// 📁 frontend/src/types/aidantCatalog.ts

export interface AidantProfile {
  id: string;
  user_id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    avatar_url: string | null;
  };
  specialties: string[];
  available: boolean;
  rating: number;
  total_missions: number;
  completed_missions: number;
  cancelled_missions: number;
  bio: string;
  address: string;
  zones: string[];
  experience_years: number;
  is_verified: boolean;
  active_assignments: number;
  max_assignments: number;
  avg_rating: number;
  total_reviews: number;
  is_available: boolean;
  availability_status: 'available' | 'full' | 'unavailable';
  hourly_rate?: number;
  average_response_time?: number;
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
  relationship: string;
  created_at: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    address: string;
    category: string;
    status: string;
  };
  aidant?: {
    id: string;
    user_id: string;
    specialties: string[];
    available: boolean;
    rating: number;
    user: {
      full_name: string;
      email: string;
      phone: string;
      avatar_url: string | null;
    };
  };
}

export interface AidantReview {
  id: string;
  aidant_id: string;
  family_id: string;
  rating: number;
  comment: string;
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

export interface AidantFilters {
  zone?: string;
  specialty?: string;
  minRating?: number;
  onlyAvailable?: boolean;
  minExperience?: number;
  sortBy?: 'rating' | 'experience_years' | 'total_missions' | 'active_assignments';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
