// 📁 src/types/assignment.ts

export type TargetType = 'patient' | 'personal_account' | 'family';
export type AssignmentType = 'primary' | 'secondary' | 'temporary';
export type AssignmentStatus = 'active' | 'inactive' | 'expired';

export const TARGET_TYPES = {
  PATIENT: 'patient',
  PERSONAL_ACCOUNT: 'personal_account',
  FAMILY: 'family',
} as const;

export const ASSIGNMENT_TYPES = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  TEMPORARY: 'temporary',
} as const;

export const ASSIGNMENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
} as const;

export interface AidantAssignment {
  id: string;
  aidant_user_id: string;
  target_type: TargetType;
  target_id: string;
  priority: 1 | 2 | 3;
  assignment_type: AssignmentType;
  status: AssignmentStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  reason: string | null;
  aidant?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  };
  target_patient?: {
    id: string;
    first_name: string;
    last_name: string;
    address: string;
    category: string;
  };
  target_profile?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
}

export interface AssignmentFilters {
  targetType?: TargetType;
  targetId?: string;
  status?: AssignmentStatus;
  aidantUserId?: string;
}

export interface AssignAidantRequest {
  aidantUserId: string;
  targetType: TargetType;
  targetId: string;
  familyId?: string | null;
  assignmentType?: AssignmentType;
  reason?: string | null;
  expiresAt?: string | null;
}

export interface AssignAidantResponse {
  success: boolean;
  message: string;
  data: {
    assignment: AidantAssignment;
    target_type: TargetType;
    target_name: string;
  };
}

export interface GetActiveAidantResponse {
  success: boolean;
  data: {
    aidant_id: string | null;
    aidant: {
      id: string;
      full_name: string;
      email: string;
      phone: string | null;
      avatar_url: string | null;
    } | null;
    target_type: TargetType;
    target_id: string;
  };
}

export interface GetAllAidantsResponse {
  success: boolean;
  data: {
    aidant_user_id: string;
    assignment_type: AssignmentType;
    priority: number;
    target_type: TargetType;
    profile?: {
      id: string;
      full_name: string;
      email: string;
      phone: string | null;
      avatar_url: string | null;
    };
  }[];
  count: number;
}

export interface AssignmentState {
  assignments: AidantAssignment[];
  activeAidant: {
    aidant_id: string | null;
    aidant: {
      id: string;
      full_name: string;
      email: string;
      phone: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
  allAidants: {
    aidant_user_id: string;
    assignment_type: AssignmentType;
    priority: number;
    target_type: TargetType;
    profile?: {
      id: string;
      full_name: string;
      email: string;
      phone: string | null;
      avatar_url: string | null;
    };
  }[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  fetchAssignments: (filters?: AssignmentFilters) => Promise<void>;
  fetchActiveAidant: (targetType: TargetType, targetId: string, familyId?: string) => Promise<void>;
  fetchAllAidants: (targetType: TargetType, targetId: string, familyId?: string) => Promise<void>;
  assignAidant: (data: AssignAidantRequest) => Promise<AssignAidantResponse>;
  revokeAssignment: (assignmentId: string, reason?: string) => Promise<void>;
  checkAssignment: (aidantUserId: string, targetType: TargetType, targetId: string) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}
