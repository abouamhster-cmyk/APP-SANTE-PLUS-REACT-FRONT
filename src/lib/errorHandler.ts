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

export class NetworkError extends AppError {
  constructor(message: string = 'Erreur de connexion réseau') {
    super(message, 'NETWORK_ERROR', 0);
  }
}

export class TimeoutError extends AppError {
  constructor(message: string = 'La requête a expiré') {
    super(message, 'TIMEOUT_ERROR', 408);
  }
}

export const handleApiError = (error: any): AppError => {
  // ✅ Erreur de timeout
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return new TimeoutError();
  }

  // ✅ Erreur réseau
  if (!error.response && error.request) {
    return new NetworkError();
  }

  // ✅ Erreur Axios/Supabase
  if (error.response) {
    const { data, status } = error.response;
    const message = data?.message || data?.error || 'Erreur serveur';
    const code = data?.code || 'SERVER_ERROR';
    return new AppError(message, code, status, data?.details);
  }

  // ✅ Erreur déjà formatée
  if (error instanceof AppError) {
    return error;
  }

  // ✅ Erreur inconnue
  return new AppError(
    error.message || 'Une erreur inattendue est survenue',
    'UNKNOWN_ERROR',
    500
  );
};

export const showErrorToast = (error: any): AppError => {
  const appError = handleApiError(error);
  
  // ✅ Message personnalisé selon le type d'erreur
  let message = appError.message;
  
  if (appError instanceof NetworkError) {
    message = '📶 Problème de connexion. Vérifiez votre réseau.';
  } else if (appError instanceof TimeoutError) {
    message = '⏳ La requête a pris trop de temps. Réessayez.';
  } else if (appError instanceof AuthenticationError) {
    message = '🔒 Session expirée. Veuillez vous reconnecter.';
  }

  toast.error(message);
  return appError;
};

export const showSuccessToast = (message: string) => {
  toast.success(message);
};

export const showWarningToast = (message: string) => {
  toast(message, { icon: '⚠️' });
};

export const showInfoToast = (message: string) => {
  toast(message, { icon: 'ℹ️' });
};

// ✅ Wrapper pour les fonctions asynchrones avec gestion d'erreur
export const withErrorHandler = async <T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> => {
  try {
    return await fn();
  } catch (error) {
    const appError = handleApiError(error);
    showErrorToast(appError);
    
    if (errorMessage) {
      toast.error(errorMessage);
    }
    
    return null;
  }
};

// ✅ Wrapper pour les fonctions asynchrones avec fallback
export const withFallback = async <T>(
  fn: () => Promise<T>,
  fallback: T,
  errorMessage?: string
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (errorMessage) {
      showErrorToast(error);
    }
    return fallback;
  }
};

// ✅ Wrapper pour les fonctions asynchrones qui doivent toujours réussir
export const withSilentError = async <T>(
  fn: () => Promise<T>
): Promise<T | null> => {
  try {
    return await fn();
  } catch (error) {
    console.error('❌ Silent error:', error);
    return null;
  }
};
