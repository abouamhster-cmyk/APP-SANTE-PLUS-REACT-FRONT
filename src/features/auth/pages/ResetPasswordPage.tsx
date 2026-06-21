// 📁 src/features/auth/pages/ResetPasswordPage.tsx
// 📌 Réinitialisation du mot de passe

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/ui/Logo';
import toast from 'react-hot-toast';

const ResetPasswordPage = () => {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // ✅ Récupérer le thème sauvegardé
  const [savedTheme, setSavedTheme] = useState<'senior' | 'maman' | null>(null);

  useEffect(() => {
    const theme = localStorage.getItem('sante_plus_theme') as 'senior' | 'maman' | null;
    setSavedTheme(theme);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      toast.success('Mot de passe réinitialisé avec succès');
      setIsDone(true);

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch (error: any) {
      console.error('❌ Reset password error:', error);
      toast.error(error?.message || 'Erreur lors de la réinitialisation');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Déterminer le rôle pour le logo
  const logoRole = savedTheme === 'maman' ? 'maman' : 'general';

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: 'var(--color-background, #f5f0e8)' }}
    >
      <div className="w-full max-w-md">
        <div
          className="bg-white rounded-3xl p-8 shadow-lg border relative"
          style={{ borderColor: 'var(--color-border, #e5e0d8)' }}
        >
          {/* ✅ Logo dynamique */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2">
            <div
              className="w-24 h-24 rounded-full bg-white shadow-lg border-4 flex items-center justify-center"
              style={{ 
                borderColor: savedTheme === 'maman' 
                  ? '#e8436a' 
                  : 'var(--color-primary, #1a4a3a)' 
              }}
            >
              <Logo
                size="md"
                showText={false}
                whiteBg={false}
                className="justify-center"
                role={logoRole}
              />
            </div>
          </div>

          <div className="h-8" />

          {isDone ? (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4"
                style={{
                  background: savedTheme === 'maman' 
                    ? '#e8436a12' 
                    : 'var(--color-primary, #1a4a3a)12',
                  color: savedTheme === 'maman' 
                    ? '#e8436a' 
                    : 'var(--color-primary, #1a4a3a)',
                }}
              >
                <CheckCircle size={34} />
              </div>

              <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--color-text, #2d2d2d)' }}
              >
                Mot de passe changé
              </h1>

              <p
                className="text-sm mt-2 leading-relaxed"
                style={{ color: 'var(--color-text-light, #6b7280)' }}
              >
                Votre mot de passe a été mis à jour. Vous allez être redirigé
                vers la connexion.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1
                  className="text-2xl font-bold"
                  style={{ color: 'var(--color-text, #2d2d2d)' }}
                >
                  Nouveau mot de passe
                </h1>

                <p
                  className="text-sm mt-1"
                  style={{ color: 'var(--color-text-light, #6b7280)' }}
                >
                  Choisissez un nouveau mot de passe sécurisé.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--color-text, #2d2d2d)' }}
                  >
                    Nouveau mot de passe
                  </label>

                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5"
                      style={{ color: 'var(--color-text-light, #6b7280)' }}
                    />

                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3.5 rounded-xl border outline-none transition-all duration-300 focus:ring-2 focus:ring-[var(--color-primary)]/20"
                      style={{
                        borderColor: 'var(--color-border, #e5e0d8)',
                        background: 'var(--color-background, #f5f0e8)',
                        color: 'var(--color-text, #2d2d2d)',
                      }}
                      placeholder="Minimum 6 caractères"
                      disabled={isLoading}
                      autoComplete="new-password"
                      required
                      minLength={6}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--color-text-light, #6b7280)' }}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--color-text, #2d2d2d)' }}
                  >
                    Confirmer le mot de passe
                  </label>

                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5"
                      style={{ color: 'var(--color-text-light, #6b7280)' }}
                    />

                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border outline-none transition-all duration-300 focus:ring-2 focus:ring-[var(--color-primary)]/20"
                      style={{
                        borderColor: 'var(--color-border, #e5e0d8)',
                        background: 'var(--color-background, #f5f0e8)',
                        color: 'var(--color-text, #2d2d2d)',
                      }}
                      placeholder="Confirmez le mot de passe"
                      disabled={isLoading}
                      autoComplete="new-password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl text-white font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:opacity-90 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ 
                    background: savedTheme === 'maman' 
                      ? '#e8436a' 
                      : 'var(--color-primary, #1a4a3a)' 
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Réinitialisation...
                    </>
                  ) : (
                    <>
                      Réinitialiser
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm hover:underline inline-flex items-center gap-1"
                    style={{ 
                      color: savedTheme === 'maman' 
                        ? '#e8436a' 
                        : 'var(--color-primary, #1a4a3a)' 
                    }}
                  >
                    <ArrowLeft size={14} />
                    Retour à la connexion
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>

        <div
          className="mt-6 text-center text-xs"
          style={{ color: 'var(--color-text-light, #6b7280)' }}
        >
          <p>Santé Plus Services — Un service d'accompagnement non médical</p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;