// 📁 src/features/auth/pages/ForgotPasswordPage.tsx
// 📌 Mot de passe oublié

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/ui/Logo';
import toast from 'react-hot-toast';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // ✅ Récupérer le thème sauvegardé
  const [savedTheme, setSavedTheme] = useState<'senior' | 'maman' | null>(null);

  useEffect(() => {
    const theme = localStorage.getItem('sante_plus_theme') as 'senior' | 'maman' | null;
    setSavedTheme(theme);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      toast.error('Veuillez saisir votre email');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setIsSent(true);
      toast.success('Email de réinitialisation envoyé');
    } catch (error: any) {
      console.error('❌ Forgot password error:', error);
      toast.error(error?.message || "Erreur lors de l'envoi");
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

          {isSent ? (
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
                Email envoyé
              </h1>

              <p
                className="text-sm mt-2 leading-relaxed"
                style={{ color: 'var(--color-text-light, #6b7280)' }}
              >
                Un lien de réinitialisation a été envoyé à :
                <br />
                <span
                  className="font-semibold"
                  style={{ color: 'var(--color-text, #2d2d2d)' }}
                >
                  {email}
                </span>
              </p>

              <p
                className="text-xs mt-4 leading-relaxed"
                style={{ color: 'var(--color-text-light, #6b7280)' }}
              >
                Vérifiez aussi vos spams si vous ne voyez pas le message dans
                votre boîte principale.
              </p>

              <Link
                to="/login"
                className="mt-6 w-full py-3.5 rounded-xl text-white font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:opacity-90 hover:shadow-lg"
                style={{ 
                  background: savedTheme === 'maman' 
                    ? '#e8436a' 
                    : 'var(--color-primary, #1a4a3a)' 
                }}
              >
                Retour à la connexion
                <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1
                  className="text-2xl font-bold"
                  style={{ color: 'var(--color-text, #2d2d2d)' }}
                >
                  Mot de passe oublié
                </h1>

                <p
                  className="text-sm mt-1"
                  style={{ color: 'var(--color-text-light, #6b7280)' }}
                >
                  Entrez votre email pour recevoir un lien sécurisé.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--color-text, #2d2d2d)' }}
                  >
                    Email
                  </label>

                  <div className="relative">
                    <Mail
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5"
                      style={{ color: 'var(--color-text-light, #6b7280)' }}
                    />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border outline-none transition-all duration-300 focus:ring-2 focus:ring-[var(--color-primary)]/20"
                      style={{
                        borderColor: 'var(--color-border, #e5e0d8)',
                        background: 'var(--color-background, #f5f0e8)',
                        color: 'var(--color-text, #2d2d2d)',
                      }}
                      placeholder="exemple@email.com"
                      disabled={isLoading}
                      autoComplete="email"
                      required
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
                      Envoi...
                    </>
                  ) : (
                    <>
                      Envoyer le lien
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
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
