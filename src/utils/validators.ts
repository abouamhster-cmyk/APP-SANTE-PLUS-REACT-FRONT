import { z } from 'zod';

// =============================================
// SCHEMAS DE VALIDATION
// =============================================

export const emailSchema = z.string().email('Email invalide');
export const phoneSchema = z.string().min(8, 'Téléphone invalide');
export const passwordSchema = z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères');

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  full_name: z.string().min(2, 'Le nom est requis'),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  hasPatient: z.boolean(),
  patientCategory: z.enum(['senior', 'maman_bebe']).optional(),
});

export const patientSchema = z.object({
  first_name: z.string().min(2, 'Le prénom est requis'),
  last_name: z.string().min(2, 'Le nom est requis'),
  age: z.number().min(0).max(130).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().min(5, "L'adresse est requise"),
  phone: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  category: z.enum(['senior', 'maman_bebe']),
  notes: z.string().optional(),
  allergies: z.string().optional(),
  treatments: z.string().optional(),
  conditions: z.string().optional(),
  medical_history: z.string().optional(),
  preferred_language: z.string().default('fr'),
  special_requirements: z.string().optional(),
});

export const visitSchema = z.object({
  patient_id: z.string().uuid('Patient requis'),
  aidant_id: z.string().uuid().optional(),
  scheduled_date: z.string().min(1, 'La date est requise'),
  scheduled_time: z.string().min(1, "L'heure est requise"),
  duration_minutes: z.number().min(15, 'La durée minimale est de 15 minutes').default(60),
  actions: z.array(z.string()).default([]),
  notes: z.string().optional(),
  is_urgent: z.boolean().default(false),
});

export const orderSchema = z.object({
  patient_id: z.string().uuid().optional(),
  type: z.enum(['medicaments', 'produits_bebe', 'produits_hygiene', 'courses', 'repas', 'autre']),
  description: z.string().min(3, 'La description est requise'),
  address: z.string().min(5, "L'adresse est requise"),
  prescription_url: z.string().url().optional(),
  estimated_amount: z.number().min(0).optional(),
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().min(1),
    price: z.number().min(0),
  })).default([]),
});

export const paymentSchema = z.object({
  amount: z.number().min(100, 'Le montant minimum est de 100 FCFA'),
  method: z.enum(['mobile_money', 'card', 'bank_transfer']),
  phone: phoneSchema,
  email: emailSchema,
  description: z.string().optional(),
});

// =============================================
// VALIDATION HELPERS
// =============================================
export const validateEmail = (email: string) => {
  return emailSchema.safeParse(email);
};

export const validatePhone = (phone: string) => {
  return phoneSchema.safeParse(phone);
};

export const validatePassword = (password: string) => {
  return passwordSchema.safeParse(password);
};

export const validateLogin = (data: unknown) => {
  return loginSchema.safeParse(data);
};

export const validateRegister = (data: unknown) => {
  return registerSchema.safeParse(data);
};