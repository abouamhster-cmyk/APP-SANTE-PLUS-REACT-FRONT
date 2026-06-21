// 📁 src/features/admin/pages/AdminSetupPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Key,
  Send,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import toast from 'react-hot-toast';

type SetupStep = 'pin' | 'email' | 'otp' | 'create';

// ✅ Définir le type pour le timer
type TimerType = ReturnType<typeof setInterval> | null;

const AdminSetupPage = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<SetupStep>('pin');
  const [isLoading, setIsLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [timer, setTimer] = useState<TimerType>(null); // ✅ Utiliser le type défini

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'admin' as 'admin' | 'coordinator',
  });

  // ✅ Vérifier le PIN
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 8) {
      toast.error('Le PIN doit contenir 8 chiffres');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin-setup/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('PIN valide');
        setStep('email');
      } else {
        toast.error(data.error || 'PIN incorrect');
        setPin('');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Envoyer l'OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email requis');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin-setup/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Code envoyé par email');
        setStep('otp');
        setOtpExpiresIn(data.expires_in || 10);
        startTimer(data.expires_in || 10);
      } else {
        toast.error(data.error || 'Erreur lors de l\'envoi');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Vérifier l'OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ S'assurer que otp est une chaîne
    const otpCode = typeof otp === 'string' ? otp : String(otp);
    
    if (otpCode.length !== 6) {
      toast.error('Le code doit contenir 6 chiffres');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin-setup/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          otp: otpCode.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Code validé');
        setStep('create');
        if (timer) clearInterval(timer);
      } else {
        toast.error(data.error || 'Code invalide');
        setOtp('');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Créer le compte
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      toast.error('Mot de passe minimum 6 caractères');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    try {
      // ✅ S'assurer que l'OTP est une chaîne propre
      const otpCode = typeof otp === 'string' ? otp.trim() : String(otp).trim();

      const response = await fetch('/api/admin-setup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          email: email.trim(),
          phone: formData.phone.trim(),
          password: formData.password,
          role: formData.role,
          otp: otpCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('🎉 Compte créé avec succès !');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        toast.error(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Timer pour l'OTP
  const startTimer = (minutes: number) => {
    let timeLeft = minutes * 60;
    setOtpExpiresIn(timeLeft);

    if (timer) clearInterval(timer);

    const newTimer = setInterval(() => {
      timeLeft--;
      setOtpExpiresIn(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(newTimer);
        toast.error('Le code a expiré, veuillez en demander un nouveau');
        setStep('email');
      }
    }, 1000);

    setTimer(newTimer);
  };

  // ✅ Nettoyer le timer
  useEffect(() => {
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timer]);

  // ✅ Format du timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-8"
      style={{ background: 'var(--color-background, #f5f0e8)' }}
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border p-8" style={{ borderColor: 'var(--color-border, #e5e0d8)' }}>
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl bg-white shadow-md border-4 flex items-center justify-center" style={{ borderColor: 'var(--color-primary, #1a4a3a)' }}>
                <Logo size="md" showText={false} whiteBg={false} className="justify-center" />
              </div>
            </div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--color-text, #2d2d2d)' }}>
              Configuration Admin
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-light, #6b7280)' }}>
              {step === 'pin' && 'Entrez le code d\'accès sécurisé'}
              {step === 'email' && 'Entrez votre email pour recevoir un code'}
              {step === 'otp' && 'Entrez le code reçu par email'}
              {step === 'create' && 'Créez votre compte administrateur'}
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {['pin', 'email', 'otp', 'create'].map((s, index) => {
              const isActive = step === s;
              const isDone = ['pin', 'email', 'otp', 'create'].indexOf(step) > index;
              return (
                <div key={s} className="flex-1">
                  <div
                    className={`h-2 rounded-full transition ${
                      isActive ? 'bg-[--color-primary]' :
                      isDone ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* ============================================ */}
          {/* ÉTAPE 1 : PIN */}
          {/* ============================================ */}
          {step === 'pin' && (
            <form onSubmit={handleVerifyPin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--color-text, #2d2d2d)' }}>
                  Code d'accès
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: 'var(--color-text-light, #6b7280)' }} />
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="8 chiffres"
                    maxLength={8}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border outline-none text-lg font-bold tracking-widest"
                    style={{
                      borderColor: 'var(--color-border, #e5e0d8)',
                      background: 'var(--color-background, #f5f0e8)',
                      color: 'var(--color-text, #2d2d2d)',
                    }}
                    autoFocus
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-light, #6b7280)' }}>
                  Code par défaut : <strong>40024002</strong>
                </p>
              </div>

              <button
                type="submit"
                disabled={pin.length !== 8 || isLoading}
                className="w-full py-3.5 rounded-2xl text-white font-bold transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'var(--color-primary, #1a4a3a)' }}
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    Vérifier
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ============================================ */}
          {/* ÉTAPE 2 : EMAIL */}
          {/* ============================================ */}
          {step === 'email' && (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--color-text, #2d2d2d)' }}>
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: 'var(--color-text-light, #6b7280)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@santeplus.bj"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border outline-none"
                    style={{
                      borderColor: 'var(--color-border, #e5e0d8)',
                      background: 'var(--color-background, #f5f0e8)',
                      color: 'var(--color-text, #2d2d2d)',
                    }}
                    required
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-light, #6b7280)' }}>
                  Vous recevrez un code de vérification par email
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('pin')}
                  className="flex-1 py-3.5 rounded-2xl font-bold border transition hover:bg-gray-50 flex items-center justify-center gap-2"
                  style={{ borderColor: 'var(--color-border, #e5e0d8)', color: 'var(--color-text, #2d2d2d)' }}
                >
                  <ArrowLeft size={18} />
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={!email || isLoading}
                  className="flex-1 py-3.5 rounded-2xl text-white font-bold transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'var(--color-primary, #1a4a3a)' }}
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      Envoyer
                      <Send size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ============================================ */}
          {/* ÉTAPE 3 : OTP */}
          {/* ============================================ */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--color-text, #2d2d2d)' }}>
                  Code de vérification
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: 'var(--color-text-light, #6b7280)' }} />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6 chiffres"
                    maxLength={6}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border outline-none text-lg font-bold tracking-widest"
                    style={{
                      borderColor: 'var(--color-border, #e5e0d8)',
                      background: 'var(--color-background, #f5f0e8)',
                      color: 'var(--color-text, #2d2d2d)',
                    }}
                    autoFocus
                  />
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs" style={{ color: 'var(--color-text-light, #6b7280)' }}>
                    Code envoyé à <strong>{email}</strong>
                  </p>
                  <p className="text-xs font-bold" style={{ color: otpExpiresIn < 60 ? '#F44336' : 'var(--color-text-light, #6b7280)' }}>
                    ⏱️ {formatTime(otpExpiresIn)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="flex-1 py-3.5 rounded-2xl font-bold border transition hover:bg-gray-50 flex items-center justify-center gap-2"
                  style={{ borderColor: 'var(--color-border, #e5e0d8)', color: 'var(--color-text, #2d2d2d)' }}
                >
                  <ArrowLeft size={18} />
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={otp.length !== 6 || isLoading}
                  className="flex-1 py-3.5 rounded-2xl text-white font-bold transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'var(--color-primary, #1a4a3a)' }}
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      Vérifier
                      <CheckCircle size={18} />
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSendOTP}
                className="w-full text-sm font-medium hover:underline"
                style={{ color: 'var(--color-primary, #1a4a3a)' }}
                disabled={isLoading}
              >
                Renvoyer le code
              </button>
            </form>
          )}

          {/* ============================================ */}
          {/* ÉTAPE 4 : CRÉATION */}
          {/* ============================================ */}
          {step === 'create' && (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text, #2d2d2d)' }}>
                  Nom complet *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: 'var(--color-text-light, #6b7280)' }} />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border outline-none"
                    style={{
                      borderColor: 'var(--color-border, #e5e0d8)',
                      background: 'var(--color-background, #f5f0e8)',
                      color: 'var(--color-text, #2d2d2d)',
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text, #2d2d2d)' }}>
                  Téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: 'var(--color-text-light, #6b7280)' }} />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+229 90 00 00 00"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border outline-none"
                    style={{
                      borderColor: 'var(--color-border, #e5e0d8)',
                      background: 'var(--color-background, #f5f0e8)',
                      color: 'var(--color-text, #2d2d2d)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text, #2d2d2d)' }}>
                  Rôle *
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: 'var(--color-text-light, #6b7280)' }} />
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'coordinator' })}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border outline-none appearance-none"
                    style={{
                      borderColor: 'var(--color-border, #e5e0d8)',
                      background: 'var(--color-background, #f5f0e8)',
                      color: 'var(--color-text, #2d2d2d)',
                    }}
                  >
                    <option value="admin">👑 Administrateur</option>
                    <option value="coordinator">👔 Coordinateur</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text, #2d2d2d)' }}>
                  Mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: 'var(--color-text-light, #6b7280)' }} />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 6 caractères"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border outline-none"
                    style={{
                      borderColor: 'var(--color-border, #e5e0d8)',
                      background: 'var(--color-background, #f5f0e8)',
                      color: 'var(--color-text, #2d2d2d)',
                    }}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text, #2d2d2d)' }}>
                  Confirmer le mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: 'var(--color-text-light, #6b7280)' }} />
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirmez votre mot de passe"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border outline-none"
                    style={{
                      borderColor: 'var(--color-border, #e5e0d8)',
                      background: 'var(--color-background, #f5f0e8)',
                      color: 'var(--color-text, #2d2d2d)',
                    }}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('otp')}
                  className="flex-1 py-3.5 rounded-2xl font-bold border transition hover:bg-gray-50 flex items-center justify-center gap-2"
                  style={{ borderColor: 'var(--color-border, #e5e0d8)', color: 'var(--color-text, #2d2d2d)' }}
                >
                  <ArrowLeft size={18} />
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={!formData.full_name || !formData.password || isLoading}
                  className="flex-1 py-3.5 rounded-2xl text-white font-bold transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'var(--color-primary, #1a4a3a)' }}
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      Créer le compte
                      <CheckCircle size={18} />
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-center" style={{ color: 'var(--color-text-light, #6b7280)' }}>
                🔒 Ce compte aura les droits {formData.role === 'admin' ? 'administrateur' : 'coordinateur'} complets
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSetupPage;