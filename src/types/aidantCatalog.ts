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
  assignments?: AidantAssignment[];
  reviews?: AidantReview[];
}

export interface AidantAssignment {
  id: string;
  aidant_id: string;
  family_id: string;
  patient_id: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  assigned_at: string;
  expires_at: string | null;
  is_primary: boolean;
  notes: string | null;
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
