// 📁 frontend/src/types/index.ts

// ============================================================
// EXPORTER TOUS LES TYPES AIDANTS
// ============================================================
export * from './aidant';
export * from './assignment';

// ============================================================
// TOUS LES AUTRES TYPES EXISTANTS
// ============================================================
export type UserRole = 'family' | 'aidant' | 'coordinator' | 'admin';
export type ProcheCategory = 'senior' | 'maman_bebe';
export type PatientCategory = 'senior' | 'maman_bebe';

// ✅ VISITE STATUS - AVEC NOUVEAUX STATUTS
export type VisitStatus = 
  | 'planifiee' 
  | 'en_attente' 
  | 'acceptee'        
  | 'en_cours' 
  | 'terminee' 
  | 'validee' 
  | 'annulee' 
  | 'replanifiee' 
  | 'no_show'
  | 'refusee'
  | 'expire'          
  | 'attente_paiement'
  | 'brouillon'
   | 'en_attente_aidant';  // Visite planifiée SANS aidant assigné

// ✅ ORDER STATUS - AVEC NOUVEAUX STATUTS
export type OrderStatus = 
  | 'creee'        
  | 'en_attente'    
  | 'disponible'    
  | 'en_cours'     
  | 'livree'       
  | 'validee'      
  | 'annulee'
  | 'attente_paiement';  

// ✅ AIDANT STATUS
export type AidantStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';

// ✅ PAYMENT STATUS
export type PaymentStatus = 'en_attente' | 'valide' | 'echoue' | 'rembourse' | 'annule' | 'en_attente_de_confirmation';

// ✅ SUBSCRIPTION STATUS
export type SubscriptionStatus = 'en_attente' | 'actif' | 'expire' | 'annule' | 'suspendu' | 'en_cours_de_renouvellement';

// ✅ NOTIFICATION TYPE
export type NotificationType = 'visite' | 'message' | 'commande' | 'paiement' | 'system' | 'alert' | 'reminder' | 'promotion';

// ✅ ORDER TYPE
export type OrderType = 'subscription' | 'ponctual';

// ✅ TARGET TYPE
export type TargetType = 'personal' | 'patient' | 'personal_account';

// ✅ ASSIGNMENT TYPES (réexporté depuis assignment.ts)
export type { 
  TargetType as AssignmentTargetType,
  AssignmentType,
  AssignmentStatus,
  AidantAssignment,
  AssignmentFilters,
  AssignAidantRequest,
  AssignAidantResponse,
  GetActiveAidantResponse,
  GetAllAidantsResponse,
  AssignmentState,
} from './assignment';

// =============================================
// OFFER TYPE
// =============================================

export type OfferCategory = 'senior' | 'maman_bebe' | 'pack_confort' | 'ponctuelle';

export interface Offer {
  id: string;
  name: string;
  category: OfferCategory;
  type?: 'ponctuelle' | 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle' | 'sur_devis';
  description?: string | null;
  price: number;
  period: string;
  features: string[];
  visitsPerWeek: number | null;
  durationDays: number | null;
  badge: string | null;
  publicCible?: string | null;
  is_active?: boolean;
  is_public?: boolean;
  display_order?: number;
  visits_per_month?: number | null;
  total_visits?: number | null;
  total_orders?: number | null;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// PROFIL
// =============================================

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  proche_category: ProcheCategory | null;
  patient_category: ProcheCategory | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_update: string | null;
  is_active: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// =============================================
// PROCHE (ex-PATIENT)
// =============================================

export interface Proche {
  id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  emergency_contact: string | null;
  emergency_contact_name: string | null;
  category: ProcheCategory;
  status: 'active' | 'inactive' | 'archived';
  notes: string | null;
  allergies: string | null;
  treatments: string | null;
  conditions: string | null;
  medical_history: string | null;
  preferred_language: string;
  special_requirements: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  families?: ProcheFamilyLink[];
}

export type Patient = Proche;

// =============================================
// PROCHE FAMILY LINK - AVEC TARGET_TYPE
// =============================================

export interface ProcheFamilyLink {
  id: string;
  proche_id: string;
  patient_id: string | null;
  family_id: string;
  relationship: string | null;
  is_primary: boolean;
  can_manage_visits: boolean;
  can_manage_orders: boolean;
  can_receive_notifications: boolean;
  target_type: TargetType;
  created_at: string;
}

export type PatientFamilyLink = ProcheFamilyLink;

// =============================================
// AIDANT (version existante)
// =============================================

export interface Aidant {
  id: string;
  user_id: string;
  user?: Profile;
  specialties: string[];
  available: boolean;
  rating: number;
  total_missions: number;
  completed_missions: number;
  cancelled_missions: number;
  average_response_time: number | null;
  bio: string | null;
  hourly_rate: number | null;
  is_verified: boolean;
  background_check_date: string | null;
  languages: string[];
  availability_hours: Record<string, any>;
  current_assignments?: number;
  max_assignments?: number;
  current_orders?: number;
  max_orders?: number;
  created_at: string;
  updated_at: string;
}

// =============================================
// VISITE - AVEC TARGET_TYPE ET TARGET_NAME
// =============================================

export interface Visit {
  id: string;
  reference: string;
  proche_id: string;
  patient_id: string | null;
  user_id: string;
  target_type: TargetType;
  target_name: string | null;
  proche?: Proche;
  patient?: Proche;
  aidant_id: string | null;
  aidant?: Aidant;
  coordinator_id: string | null;
  coordinator?: Profile;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: VisitStatus;
  start_time: string | null;
  end_time: string | null;
  actual_duration_minutes: number | null;
  actions: string[];
  notes: string | null;
  report: string | null;
  location_start: { lat: number; lng: number } | null;
  location_end: { lat: number; lng: number } | null;
  location_track: { lat: number; lng: number; timestamp: string }[];
  check_in_time: string | null;
  check_out_time: string | null;
  family_feedback: string | null;
  family_rating: number | null;
  family_rated_at: string | null;
  coordinator_notes: string | null;
  is_urgent: boolean;
  created_at: string;
  updated_at: string;
  photos?: VisitPhoto[];
  metadata?: any;
  visit_type?: 'ponctuelle' | 'permanente' | 'intervalle';
  assignment_type?: 'ponctuelle' | 'permanente' | 'intervalle';
  recurrence_days?: string[] | null;
  recurrence_time?: string | null;
  intervalle_start?: string | null;
  intervalle_end?: string | null;
  is_recurring?: boolean;
  requested_by?: string | null;
  assigned_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  refused_by?: string | null;
  refused_at?: string | null;
  refusal_reason?: string | null;
  reminded_at?: string | null;
  reminder_count?: number;
  notified_at?: string | null;
  is_ponctual?: boolean;
  is_draft?: boolean;
  requires_payment?: boolean;
  payment_amount?: number;
  draft_expires_at?: string | null;
  auto_assigned_aidant?: boolean;
  // 🆕 NOUVEAUX CHAMPS
  is_permanent?: boolean;
  assigned_by_admin?: boolean;
  admin_assigned_at?: string | null;
  waiting_for_aidant_since?: string | null;
  subscription_id?: string | null;
}

export type VisitWithPatient = Visit;

// =============================================
// VISITE PHOTO
// =============================================

export interface VisitPhoto {
  id: string;
  visite_id: string;
  photo_url: string;
  caption: string | null;
  photo_type: 'before' | 'during' | 'after' | 'proof' | 'other' | null;
  uploaded_by: string | null;
  created_at: string;
}

// =============================================
// COMMANDE - AVEC TARGET_TYPE ET TARGET_NAME
// =============================================

export interface Order {
  id: string;
  proche_id: string | null;
  patient_id: string | null;
  user_id: string;
  target_type: TargetType;
  target_name: string | null;
  proche?: Proche;
  patient?: Proche;
  family_id: string;
  family?: Profile;
  aidant_id: string | null;
  aidant?: Aidant;
  type: 'medicaments' | 'produits_bebe' | 'produits_hygiene' | 'courses' | 'repas' | 'autre';
  description: string;
  prescription_url: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: OrderStatus;
  estimated_amount: number | null;
  final_amount: number | null;
  delivery_fee: number | null;
  tip_amount: number | null;
  proof_url: string | null;
  delivery_notes: string | null;
  delivery_time: string | null;
  items: OrderItem[];
  order_type?: OrderType;
  is_paid?: boolean;
  created_at: string;
  updated_at: string;
  is_ponctual?: boolean;
  auto_assigned_aidant?: boolean;
  // 🆕 NOUVEAUX CHAMPS
  current_aidant_id?: string | null;
  taken_at?: string | null;
  taken_by?: string | null;
  auto_validation_at?: string | null;
  is_auto_validated?: boolean;
  subscription_id?: string | null;
}

export interface OrderItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

// =============================================
// MESSAGE & CONVERSATION
// =============================================

export interface Conversation {
  id: string;
  participant_ids: string[];
  participants?: Profile[];
  type: 'direct' | 'group';
  name: string | null;
  avatar_url: string | null;
  last_message_at: string;
  last_message?: Message;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: Profile;
  content: string | null;
  attachment_url: string | null;
  attachment_type: 'image' | 'document' | 'voice' | 'video' | null;
  is_read: boolean;
  read_at: string | null;
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  reply_to_message_id: string | null;
  reply_to?: Message;
  created_at: string;
}

// =============================================
// OFFRE & ABONNEMENT
// =============================================

export interface OfferDB {
  id: string;
  name: string;
  category: 'senior' | 'maman_bebe' | 'pack_confort' | 'ponctuelle';
  type: 'ponctuelle' | 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle' | 'sur_devis';
  description: string | null;
  price: number | null;
  features: string[];
  visits_per_week: number | null;
  duration_days: number | null;
  is_active: boolean;
  is_public: boolean;
  display_order: number;
  badge: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  user?: Profile;
  proche_id: string | null;
  patient_id: string | null;
  proche?: Proche;
  patient?: Proche;
  offre_id: string | null;
  offre?: Offer;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  renewal_count: number;
  last_renewal_date: string | null;
  cancellation_reason: string | null;
  cancellation_date: string | null;
  payment_method: string | null;
  total_visits: number;
  used_visits: number;
  remaining_visits: number;
  total_orders: number;
  used_orders: number;
  remaining_orders: number;
  created_at: string;
  updated_at: string;
}

// =============================================
// PAIEMENT
// =============================================

export interface Payment {
  id: string;
  abonnement_id: string | null;
  commande_id: string | null;
  user_id: string;
  user?: Profile;
  amount: number;
  currency: string;
  method: 'mobile_money' | 'card' | 'bank_transfer' | 'cash' | 'wallet' | null;
  reference: string | null;
  provider_reference: string | null;
  status: PaymentStatus;
  metadata: Record<string, any>;
  paid_at: string | null;
  refunded_at: string | null;
  refund_reason: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// NOTIFICATION
// =============================================

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  data: Record<string, any>;
  image_url: string | null;
  is_read: boolean;
  read_at: string | null;
  is_sent: boolean;
  sent_at: string | null;
  is_delivered: boolean;
  delivered_at: string | null;
  created_at: string;
}

// =============================================
// INSCRIPTION
// =============================================

export interface Inscription {
  id: string;
  user_id: string | null;
  user?: Profile;
  proche_data: Record<string, any>;
  patient_data: Record<string, any>;
  offre_id: string | null;
  offre?: OfferDB;
  status: 'en_attente' | 'validee' | 'refusee' | 'info_requise' | 'en_cours_de_traitement';
  comments: string | null;
  processed_by: string | null;
  processed_at: string | null;
  source: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// RATING
// =============================================

export interface Rating {
  id: string;
  visite_id: string;
  visite?: Visit;
  rated_by: string;
  rated_by_user?: Profile;
  rated_user_id: string;
  rated_user?: Profile;
  rating: number;
  comment: string | null;
  categories: Record<string, any>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================
// EMERGENCY CONTACT
// =============================================

export interface EmergencyContact {
  id: string;
  proche_id: string;
  patient_id: string;
  proche?: Proche;
  patient?: Proche;
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  is_primary: boolean;
  can_make_decisions: boolean;
  created_at: string;
  updated_at: string;
}

export type EmergencyContactWithPatient = EmergencyContact;

// =============================================
// STATISTIQUES
// =============================================

export interface DashboardStats {
  proches: number;
  patients: number;
  families: number;
  aidants: number;
  visitsToday: number;
  visitsInProgress: number;
  pendingRegistrations: number;
  revenue: number;
  // 🆕 NOUVEAUX STATS
  visitsWaitingAidant?: number;
  ordersAvailable?: number;
  totalBeneficiaires?: number;
  assignedCount?: number;
  unassignedCount?: number;
}

export interface DailyStats {
  date: string;
  total_visits: number;
  planned: number;
  in_progress: number;
  completed: number;
  validated: number;
  cancelled: number;
  active_aidants: number;
  active_proches: number;
  active_patients: number;
}

// =============================================
// VISITE FORMULAIRE (AIDANT)
// =============================================

export interface VisitFormData {
  actions: string[];
  notes: string;
  audio_url?: string;
  photos: string[];
  signature?: string;
  duration_minutes?: number;
}

export interface VisitReport {
  id: string;
  visit_id: string;
  aidant_id: string;
  actions: string[];
  notes: string | null;
  audio_url: string | null;
  photos: string[];
  signature_url: string | null;
  duration_minutes: number | null;
  submitted_at: string;
  validated_by: string | null;
  validated_at: string | null;
  status: 'en_attente' | 'valide' | 'refuse';
  admin_comment: string | null;
}

// =============================================
// JOURNAL DE BORD
// =============================================

export interface JournalEntry {
  id: string;
  visit_id: string;
  visit?: Visit;
  proche_id: string;
  patient_id: string;
  proche?: Proche;
  patient?: Proche;
  aidant_id: string | null;
  aidant?: Aidant;
  date: string;
  time: string;
  actions: string[];
  notes: string | null;
  photos: string[];
  audio_url: string | null;
  status: VisitStatus;
  rating: number | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalStats {
  total_visits: number;
  validated_visits: number;
  pending_visits: number;
  average_rating: number;
  total_aidants: number;
  visits_by_week: {
    week: string;
    count: number;
  }[];
  actions_frequency: {
    action: string;
    count: number;
  }[];
}

// =============================================
// SORTIE D'HÔPITAL
// =============================================

export type DischargeStatus = 
  | 'pending'
  | 'assessing'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface HospitalDischarge {
  id: string;
  proche_id: string;
  patient_id: string;
  proche?: Proche;
  patient?: Proche;
  family_id: string;
  family?: Profile;
  coordinator_id: string | null;
  coordinator?: Profile;
  hospital_name: string;
  hospital_service: string;
  doctor_name: string | null;
  discharge_date: string;
  discharge_time: string;
  status: DischargeStatus;
  
  assessment: {
    mobility: 'autonome' | 'aide_partielle' | 'dependante';
    medication_count: number;
    has_medication_schedule: boolean;
    home_access: 'rdc' | 'etage_ascenseur' | 'etage_escalier';
    needs_help_with: string[];
    family_support: 'fort' | 'modere' | 'faible';
  } | null;
  
  aidant_id: string | null;
  aidant?: Aidant;
  planned_visits: {
    date: string;
    time: string;
    duration: number;
  }[];
  
  actual_discharge_date: string | null;
  actual_discharge_time: string | null;
  installation_notes: string | null;
  family_notes: string | null;
  coordinator_notes: string | null;
  
  completed_at: string | null;
  satisfaction_rating: number | null;
  satisfaction_comment: string | null;
  recommendations: string[] | null;
  
  created_at: string;
  updated_at: string;
}

// =============================================
// CONTRATS / CGU
// =============================================

export type ContractRole = 'family' | 'aidant' | 'coordinator' | 'admin';

export interface Contract {
  id: string;
  version: string;
  role: ContractRole;
  title: string;
  content: string;
  summary: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserContractAcceptance {
  id: string;
  user_id: string;
  contract_id: string;
  contract?: Contract;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface ContractStatus {
  needs_acceptance: boolean;
  contract: Contract | null;
  has_accepted: boolean;
  latest_acceptance: UserContractAcceptance | null;
}

// =============================================
// 🆕 WIZARD OPTIONS
// =============================================

export interface WizardOption {
  type: 'ponctuelle' | 'permanente' | 'without_aidant' | 'force' | 'auto';
  label: string;
  description: string;
  quota: number | string;
  icon?: React.ReactNode;
}

export interface WizardAidant {
  id: string;
  user_id: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  specialties: string[];
  available: boolean;
  rating: number;
  total_missions: number;
  is_verified: boolean;
  current_assignments: number;
  max_assignments: number;
  available_slots: number;
  is_available: boolean;
  zones: string[];
  experience_years: number;
}

export interface WizardData {
  hasAidant: boolean;
  hasAvailableAidants: boolean;
  aidants: WizardAidant[];
  options: WizardOption[];
  canProceed: boolean;
  allFull: boolean;
  message?: string;
  error?: string;
  isAdmin?: boolean;
}

// =============================================
// 🆕 QUOTA INFO
// =============================================

export interface QuotaInfo {
  current: number;
  max: number;
  available: number;
  canTake: boolean;
}
