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

  // Couleurs unifiées basées sur le nouveau système de marque
  const primaryBrandColor = savedTheme === 'maman' ? '#db4a6d' : '#113f30';
  const textBrandColor = savedTheme === 'maman' ? '#371e24' : '#1f2937';

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-0 sm:p-6"
      style={{ background: 'var(--color-background, #faf9f6)' }}
    >
      <div className="w-full max-w-md my-0 sm:my-8">
        {/* Intégration plein écran mobile & carte desktop */}
        <div
          className="bg-white rounded-none sm:rounded-2xl p-6 sm:p-8 shadow-none sm:shadow-sm border-0 sm:border overflow-hidden min-h-screen sm:min-h-0 flex flex-col justify-between sm:block"
          style={{ borderColor: 'var(--color-border, #e5e7eb)' }}
        >
          <div>
            {/* ✅ Logo intégré et centré proprement */}
            <div className="flex justify-center mb-6 mt-4 sm:mt-0">
              <div
                className="w-16 h-16 rounded-2xl border flex items-center justify-center transition-all"
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
              <div className="text-center animate-fadeIn space-y-4">
                <div
                  className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                  style={{
                    background: `${primaryBrandColor}12`,
                    color: primaryBrandColor,
                  }}
                >
                  <CheckCircle size={28} />
                </div>

                <h1
                  className="text-xl font-extrabold tracking-tight"
                  style={{ color: 'var(--color-text)', 'color': textBrandColor } as React.CSSProperties}
                >
                  Email envoyé
                </h1>

                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--color-text-light, #4b5563)' }}
                >
                  Un lien de réinitialisation sécurisé a été transmis à l'adresse :
                  <br />
                  <span
                    className="font-bold text-xs inline-block mt-1 break-all"
                    style={{ color: 'var(--color-text)', 'color': textBrandColor } as React.CSSProperties}
                  >
                    {email}
                  </span>
                </p>

                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: 'var(--color-text-light, #4b5563)' }}
                >
                  Si vous ne le recevez pas d'ici quelques minutes, n'hésitez pas à vérifier votre dossier de courriers indésirables (spams).
                </p>

                <Link
                  to="/login"
                  className="w-full py-3 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95"
                  style={{ 
                    background: primaryBrandColor 
                  }}
                >
                  Retour à la connexion
                  <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="animate-fadeIn">
                <div className="text-center mb-6">
                  <h1
                    className="text-xl font-extrabold tracking-tight"
                    style={{ color: 'var(--color-text)', 'color': textBrandColor } as React.CSSProperties}
                  >
                    Mot de passe oublié
                  </h1>

                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--color-text-light, #4b5563)' }}
                  >
                    Saisissez votre e-mail pour recevoir les instructions de récupération.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      className="block text-xs font-semibold mb-1"
                      style={{ color: 'var(--color-text)', 'color': textBrandColor } as React.CSSProperties}
                    >
                      Adresse e-mail
                    </label>

                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
                        style={{ color: 'var(--color-text-light, #4b5563)' }}
                      />

                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border outline-none text-xs transition-all focus:ring-1 focus:ring-[var(--color-primary)]"
                        style={{
                          borderColor: 'var(--color-border, #e5e7eb)',
                          background: 'var(--color-background, #faf9f6)',
                          color: 'var(--color-text)',
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
                    className="w-full py-3 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 disabled:opacity-75 disabled:cursor-not-allowed"
                    style={{ 
                      background: primaryBrandColor 
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Envoi en cours...</span>
                      </>
                    ) : (
                      <>
                        <span>Envoyer le lien</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Lien retour en bas */}
          {!isSent && (
            <div className="text-center mt-6 pb-4 sm:pb-0">
              <Link
                to="/login"
                className="text-xs font-semibold hover:underline inline-flex items-center gap-1"
                style={{ color: primaryBrandColor }}
              >
                <ArrowLeft size={12} />
                Retour à la connexion
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
