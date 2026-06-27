// 📁 src/features/auth/pages/LoginPage.tsx
// 📌 Connexion

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/ui/Logo';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();

  // IMPORTANT : on ne prend plus initialize ici
  const { setUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Récupérer le thème sauvegardé
  const [savedTheme, setSavedTheme] = useState<'senior' | 'maman' | null>(null);

  useEffect(() => {
    const theme = localStorage.getItem('sante_plus_theme') as 'senior' | 'maman' | null;
    setSavedTheme(theme);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔐 Tentative de connexion pour:', cleanEmail);

      // 1. Connexion avec Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        console.error('❌ Erreur de connexion:', error);
        toast.error(error.message || 'Email ou mot de passe incorrect');
        return;
      }

      if (!data?.user) {
        console.error('❌ Aucun utilisateur retourné');
        toast.error('Utilisateur non trouvé');
        return;
      }

      console.log('✅ Utilisateur connecté:', data.user.id);

      // 2. Récupérer le profil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Erreur récupération profil:', profileError);
        toast.error('Erreur lors de la récupération du profil');
        return;
      }

      // ✅ 3. Vérifier si c'est un aidant non validé
      if (profile?.role === 'aidant' && !profile?.is_active) {
        toast.error('⏳ Votre compte aidant est en attente de validation. Vous recevrez un email lorsque votre compte sera activé.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // 4. Si le profil n'existe pas, le créer
      if (!profile) {
        console.log('📝 Création du profil...');

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: data.user.user_metadata?.full_name || 'Utilisateur',
            email: data.user.email,
            phone: data.user.user_metadata?.phone || null,
            role: 'family',
            is_active: true,
          })
          .select('*')
          .single();

        if (createError) {
          console.error('❌ Erreur création profil:', createError);
          toast.error('Erreur lors de la création du profil');
          return;
        }

        console.log('✅ Profil créé:', newProfile);

        setUser(data.user, newProfile);

        toast.success('Bienvenue !');
        navigate('/app', { replace: true });
        return;
      }

      // ✅ 5. Vérification supplémentaire pour les aidants (profil inactif)
      if (profile.role === 'aidant' && !profile.is_active) {
        toast.error('⏳ Votre compte aidant est en attente de validation.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      console.log('✅ Profil récupéré:', profile);

      // 6. Mettre à jour le store
      setUser(data.user, profile);

      toast.success('Bienvenue !');
      navigate('/app', { replace: true });

    } catch (error: any) {
      console.error('❌ Erreur inattendue:', error);
      toast.error(error.message || 'Une erreur est survenue');
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
          {/* ✅ Logo dynamique dans un cercle */}
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

          <div className="text-center mb-6">
            <h1
              className="text-2xl font-bold"
              style={{ color: 'var(--color-text, #2d2d2d)' }}
            >
              Santé Plus Services
            </h1>

            <p
              className="text-sm mt-1"
              style={{ color: 'var(--color-text-light, #6b7280)' }}
            >
              Accompagnement humain et coordination à domicile
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
                />
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text, #2d2d2d)' }}
              >
                Mot de passe
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
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="current-password"
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

            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm hover:underline transition-colors"
                style={{ color: 'var(--color-primary, #1a4a3a)' }}
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl text-white font-medium transition-all duration-300 flex items-center justify-center space-x-2 hover:opacity-90 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ 
                background: savedTheme === 'maman' 
                  ? '#e8436a' 
                  : 'var(--color-primary, #1a4a3a)' 
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight size={18} className="inline ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-light, #6b7280)' }}
            >
              Pas encore de compte ?{' '}
              <Link
                to="/register"
                className="font-medium hover:underline transition-colors"
                style={{ 
                  color: savedTheme === 'maman' 
                    ? '#e8436a' 
                    : 'var(--color-primary, #1a4a3a)' 
                }}
              >
                S'inscrire
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
