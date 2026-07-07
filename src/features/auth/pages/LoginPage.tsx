// 📁 src/features/auth/pages/LoginPage.tsx
 
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        console.error('❌ Erreur de connexion:', error);
        // ✅ UN SEUL TOAST D'ERREUR
        toast.error(error.message || 'Email ou mot de passe incorrect');
        setIsLoading(false);
        return;
      }

      if (!data?.user) {
        console.error('❌ Aucun utilisateur retourné');
        // ✅ UN SEUL TOAST D'ERREUR (fusionné avec le cas précédent)
        toast.error('Email ou mot de passe incorrect');
        setIsLoading(false);
        return;
      }

      console.log('✅ Utilisateur connecté:', data.user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Erreur récupération profil:', profileError);
        toast.error('Erreur lors de la récupération du profil');
        setIsLoading(false);
        return;
      }

      // ✅ Vérification du compte aidant en attente
      if (profile?.role === 'aidant' && !profile?.is_active) {
        toast.error('⏳ Votre compte aidant est en attente de validation.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // ✅ Création du profil si inexistant
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
          setIsLoading(false);
          return;
        }

        console.log('✅ Profil créé:', newProfile);

        setUser(data.user, newProfile);

        // ✅ UN SEUL TOAST DE SUCCÈS
        toast.success('Bienvenue !');
        navigate('/app', { replace: true });
        return;
      }

      // ✅ Vérification supplémentaire du compte aidant
      if (profile.role === 'aidant' && !profile.is_active) {
        toast.error('⏳ Votre compte aidant est en attente de validation.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      console.log('✅ Profil récupéré:', profile);

      setUser(data.user, profile);

      // ✅ UN SEUL TOAST DE SUCCÈS
      toast.success('Bienvenue !');
      navigate('/app', { replace: true });

    } catch (error: any) {
      console.error('❌ Erreur inattendue:', error);
      // ✅ UN SEUL TOAST D'ERREUR
      toast.error(error.message || 'Une erreur est survenue');
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
          className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border relative"
          style={{ borderColor: 'var(--color-border, #e5e7eb)' }}
        >
          {/* Logo plus petit */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2">
            <div
              className="w-14 h-14 rounded-xl bg-white shadow-sm border flex items-center justify-center"
              style={{ borderColor: primaryBrandColor }}
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

          <div className="h-8" />

          {/* En-tête */}
          <div className="text-center mb-4">
            <h1
              className="text-lg font-extrabold"
              style={{ color: textBrandColor }}
            >
              Santé Plus Services
            </h1>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: 'var(--color-text-light, #4b5563)' }}
            >
              Accompagnement de confiance & coordination à domicile
            </p>
          </div>

          {/* Formulaire compact */}
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
                />
              </div>
            </div>

            <div>
              <label
                className="block text-[11px] font-semibold mb-0.5"
                style={{ color: textBrandColor }}
              >
                Mot de passe
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5"
                  style={{ color: 'var(--color-text-light, #4b5563)' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 rounded-xl border outline-none text-xs"
                  style={{
                    borderColor: 'var(--color-border, #e5e7eb)',
                    background: '#ffffff',
                    color: 'var(--color-text)',
                  }}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-light, #4b5563)' }}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-[11px] font-medium hover:underline"
                style={{ color: primaryBrandColor }}
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 disabled:opacity-75"
              style={{ background: primaryBrandColor }}
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

          {/* Lien d'inscription compact */}
          <div className="mt-4 text-center text-[11px]">
            <p style={{ color: 'var(--color-text-light, #4b5563)' }}>
              Nouveau ?{' '}
              <Link
                to="/register"
                className="font-bold hover:underline"
                style={{ color: primaryBrandColor }}
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
