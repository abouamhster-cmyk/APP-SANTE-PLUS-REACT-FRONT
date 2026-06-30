// 📁 frontend/src/lib/errorHandler.ts

import toast from 'react-hot-toast';

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Non authentifié') {
    super(message, 'AUTH_ERROR', 401);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} non trouvé`, 'NOT_FOUND', 404);
  }
}

export const handleApiError = (error: any): AppError => {
  // Erreur Axios/Supabase
  if (error.response) {
    const { data, status } = error.response;
    return new AppError(
      data.message || data.error || 'Erreur serveur',
      data.code || 'SERVER_ERROR',
      status,
      data.details
    );
  }

  // Erreur réseau
  if (error.request) {
    return new AppError(
      'Erreur de connexion au serveur',
      'NETWORK_ERROR',
      0
    );
  }

  // Erreur déjà formatée
  if (error instanceof AppError) {
    return error;
  }

  // Erreur inconnue
  return new AppError(
    error.message || 'Une erreur inattendue est survenue',
    'UNKNOWN_ERROR',
    500
  );
};

export const showErrorToast = (error: any) => {
  const appError = handleApiError(error);
  toast.error(appError.message);
  return appError;
};

export const showSuccessToast = (message: string) => {
  toast.success(message);
};

export const showWarningToast = (message: string) => {
  toast(message, { icon: '⚠️' });
};
