// 📁 src/features/auth/pages/ForgotPasswordPage.tsx
 
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

  const [savedTheme, setSavedTheme] = useState<'senior' | 'maman' | null>(null);

  useEffect(() => {
    const theme = localStorage.getItem('sante_plus_theme') as 'senior' | 'maman' | null;
    setSavedTheme(theme);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      // ✅ UN SEUL TOAST
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
      // ✅ UN SEUL TOAST DE SUCCÈS
      toast.success('Email de réinitialisation envoyé');
    } catch (error: any) {
      console.error('❌ Forgot password error:', error);
      // ✅ UN SEUL TOAST D'ERREUR
      toast.error(error?.message || "Erreur lors de l'envoi");
    } finally {
      setIsLoading(false);
    }
  };

  const logoRole = savedTheme === 'maman' ? 'maman' : 'general';
  const primaryBrandColor = savedTheme === 'maman' ? '#db4a6d' : '#113f30';
  const textBrandColor = savedTheme === 'maman' ? '#371e24' : '#1f2937';

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-3"
      style={{ background: 'var(--color-background, #faf9f6)' }}
    >
      <div className="w-full max-w-md">
        <div
          className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border"
          style={{ borderColor: 'var(--color-border, #e5e7eb)' }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div
              className="w-14 h-14 rounded-xl border flex items-center justify-center"
              style={{ 
                borderColor: primaryBrandColor,
                background: 'var(--color-background, #faf9f6)'
              }}
            >
              <Logo
                size="sm"
                showText={false}
                whiteBg={false}
                className="justify-center"
                role={logoRole}
              />
            </div>
          </div>

          {isSent ? (
            <div className="text-center space-y-3">
              <div
                className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
                style={{
                  background: `${primaryBrandColor}12`,
                  color: primaryBrandColor,
                }}
              >
                <CheckCircle size={24} />
              </div>

              <h1
                className="text-lg font-extrabold"
                style={{ color: textBrandColor }}
              >
                Email envoyé
              </h1>

              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--color-text-light, #4b5563)' }}
              >
                Un lien de réinitialisation a été envoyé à :
                <br />
                <span
                  className="font-bold text-xs inline-block mt-1 break-all"
                  style={{ color: textBrandColor }}
                >
                  {email}
                </span>
              </p>

              <Link
                to="/login"
                className="w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95"
                style={{ background: primaryBrandColor }}
              >
                Retour à la connexion
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div>
              <div className="text-center mb-4">
                <h1
                  className="text-lg font-extrabold"
                  style={{ color: textBrandColor }}
                >
                  Mot de passe oublié
                </h1>

                <p
                  className="text-[11px] mt-0.5"
                  style={{ color: 'var(--color-text-light, #4b5563)' }}
                >
                  Saisissez votre e-mail pour recevoir les instructions.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-0.5"
                    style={{ color: textBrandColor }}
                  >
                    Adresse e-mail
                  </label>

                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5"
                      style={{ color: 'var(--color-text-light, #4b5563)' }}
                    />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border outline-none text-xs"
                      style={{
                        borderColor: 'var(--color-border, #e5e7eb)',
                        background: '#ffffff',
                        color: 'var(--color-text)',
                      }}
                      placeholder="exemple@email.com"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 disabled:opacity-75"
                  style={{ background: primaryBrandColor }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Envoi...</span>
                    </>
                  ) : (
                    <>
                      <span>Envoyer le lien</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center mt-4">
                <Link
                  to="/login"
                  className="text-[11px] font-semibold hover:underline inline-flex items-center gap-1"
                  style={{ color: primaryBrandColor }}
                >
                  <ArrowLeft size={12} />
                  Retour à la connexion
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
