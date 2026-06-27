// 📁 src/features/auth/pages/LoginPage.tsx
// 📌 Connexion

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
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

  // ✅ Déterminer le rôle pour le logo et couleurs
  const logoRole = savedTheme === 'maman' ? 'maman' : 'general';
  
  // Couleurs unifiées basées sur le nouveau système de marque
  const primaryBrandColor = savedTheme === 'maman' ? '#db4a6d' : '#113f30';
  const textBrandColor = savedTheme === 'maman' ? '#371e24' : '#1f2937';

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'var(--color-background, #faf9f6)' }}
    >
      <div className="w-full max-w-md my-8">
        <div
          className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border relative transition-all"
          style={{ borderColor: 'var(--color-border, #e5e7eb)' }}
        >
          {/* ✅ Logo dynamique dans un cercle élégant */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2">
            <div
              className="w-20 h-20 rounded-xl bg-white shadow-sm border flex items-center justify-center transition-all"
              style={{ 
                borderColor: primaryBrandColor 
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

          <div className="h-10" />

          {/* En-tête de page */}
          <div className="text-center mb-6">
            <h1
              className="text-xl font-extrabold tracking-tight"
              style={{ color: 'var(--color-text)', 'color': textBrandColor } as React.CSSProperties}
            >
              Santé Plus Services
            </h1>

            <p
              className="text-xs mt-1"
              style={{ color: 'var(--color-text-light, #4b5563)' }}
            >
              Accompagnement de confiance & coordination à domicile
            </p>
          </div>

          {/* Formulaire de connexion */}
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
                    background: '#ffffff',
                    color: 'var(--color-text)',
                  }}
                  placeholder="exemple@email.com"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--color-text)', 'color': textBrandColor } as React.CSSProperties}
              >
                Mot de passe
              </label>

              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
                  style={{ color: 'var(--color-text-light, #4b5563)' }}
                />

                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border outline-none text-xs transition-all focus:ring-1 focus:ring-[var(--color-primary)]"
                  style={{
                    borderColor: 'var(--color-border, #e5e7eb)',
                    background: '#ffffff',
                    color: 'var(--color-text)',
                  }}
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-light, #4b5563)' }}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Lien mot de passe oublié */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-xs font-medium hover:underline transition-colors"
                style={{ color: primaryBrandColor }}
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Bouton de soumission */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 disabled:opacity-75 disabled:cursor-not-allowed"
              style={{ 
                background: primaryBrandColor 
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Lien d'inscription */}
          <div className="mt-6 text-center text-xs">
            <p style={{ color: 'var(--color-text-light, #4b5563)' }}>
              Nouveau sur Santé Plus ?{' '}
              <Link
                to="/register"
                className="font-bold hover:underline transition-colors"
                style={{ 
                  color: primaryBrandColor 
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
