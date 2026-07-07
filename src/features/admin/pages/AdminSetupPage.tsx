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
  Loader2,
  Key,
  Send,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import toast from 'react-hot-toast';

// ✅ toast CONSERVÉ - C'est une page, c'est ici qu'on affiche les toasts

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

type SetupStep = 'pin' | 'email' | 'otp' | 'create';
type TimerType = ReturnType<typeof setInterval> | null;

const AdminSetupPage = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<SetupStep>('pin');
  const [isLoading, setIsLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [timer, setTimer] = useState<TimerType>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'admin' as 'admin' | 'coordinator',
  });

  // ✅ handleVerifyPin - UN SEUL TOAST PAR ACTION
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 8) {
      toast.error('Le PIN doit contenir 8 chiffres');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin-setup/verify-pin`, {
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

  // ✅ handleSendOTP - UN SEUL TOAST PAR ACTION
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email requis');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin-setup/send-otp`, {
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

  // ✅ handleVerifyOTP - UN SEUL TOAST PAR ACTION
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = typeof otp === 'string' ? otp : String(otp);
    if (otpCode.length !== 6) {
      toast.error('Le code doit contenir 6 chiffres');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin-setup/verify-otp`, {
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

  // ✅ handleCreateAccount - UN SEUL TOAST PAR ACTION
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
      const otpCode = typeof otp === 'string' ? otp.trim() : String(otp).trim();
      const response = await fetch(`${API_BASE_URL}/admin-setup/create`, {
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
        setTimeout(() => navigate('/login'), 1500);
      } else {
        toast.error(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ startTimer - UN SEUL TOAST D'EXPIRATION
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

  useEffect(() => {
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-0 sm:p-6"
      style={{ background: 'var(--color-background, #faf9f6)' }}
    >
      <div className="w-full max-w-md my-0 sm:my-8">
        <div 
          className="bg-white rounded-none sm:rounded-2xl p-6 sm:p-8 shadow-none sm:shadow-sm border-0 sm:border overflow-hidden min-h-screen sm:min-h-0 flex flex-col justify-between sm:block"
          style={{ borderColor: 'var(--color-border, #e5e7eb)' }}
        >
          <div>
            {/* Logo épuré */}
            <div className="flex justify-center mb-6 mt-4 sm:mt-0">
              <div 
                className="w-16 h-16 rounded-2xl border flex items-center justify-center"
                style={{ borderColor: 'var(--color-primary, #113f30)', background: 'var(--color-background)' }}
              >
                <Logo size="sm" showText={false} whiteBg={false} className="justify-center" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--color-text, #1f2937)' }}>
                Configuration Admin
              </h1>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-light, #4b5563)' }}>
                {step === 'pin' && 'Entrez le code d\'accès sécurisé'}
                {step === 'email' && 'Entrez votre email de travail'}
                {step === 'otp' && 'Entrez le code reçu par email'}
                {step === 'create' && 'Créez votre accès administrateur'}
              </p>
            </div>

            {/* Stepper épuré */}
            <div className="flex items-center gap-2 mb-6">
              {['pin', 'email', 'otp', 'create'].map((s, index) => {
                const isActive = step === s;
                const isDone = ['pin', 'email', 'otp', 'create'].indexOf(step) > index;
                return (
                  <div key={s} className="flex-1">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        isActive ? 'bg-[--color-primary, #113f30]' :
                        isDone ? 'bg-green-500' : 'bg-gray-100'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* ÉTAPE 1 : PIN */}
            {step === 'pin' && (
              <form onSubmit={handleVerifyPin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Code d'accès</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="8 chiffres"
                      maxLength={8}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border outline-none text-sm focus:ring-1 focus:ring-[var(--color-primary)] transition"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Code temporaire d'installation requis.</p>
                </div>
                <button
                  type="submit"
                  disabled={pin.length !== 8 || isLoading}
                  className="w-full py-3 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95"
                  style={{ background: 'var(--color-primary, #113f30)' }}
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <>Continuer <ArrowRight size={14} /></>}
                </button>
              </form>
            )}

            {/* ÉTAPE 2 : EMAIL */}
            {step === 'email' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>E-mail professionnel</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@santeplus.bj"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border outline-none text-xs focus:ring-1 focus:ring-[var(--color-primary)] transition"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('pin')}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border hover:bg-gray-50 flex items-center justify-center gap-1"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <ArrowLeft size={14} /> Retour
                  </button>
                  <button
                    type="submit"
                    disabled={!email || isLoading}
                    className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm hover:opacity-95"
                    style={{ background: 'var(--color-primary, #113f30)' }}
                  >
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : <>Envoyer <Send size={14} /></>}
                  </button>
                </div>
              </form>
            )}

            {/* ÉTAPE 3 : OTP */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Code de validation</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6 chiffres"
                      maxLength={6}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border outline-none text-xs font-bold tracking-widest focus:ring-1 focus:ring-[var(--color-primary)] transition"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400">
                    <span>Code envoyé à : {email}</span>
                    <span className="font-bold">⏱️ {formatTime(otpExpiresIn)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border hover:bg-gray-50 flex items-center justify-center gap-1"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <ArrowLeft size={14} /> Retour
                  </button>
                  <button
                    type="submit"
                    disabled={otp.length !== 6 || isLoading}
                    className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm hover:opacity-95"
                    style={{ background: 'var(--color-primary, #113f30)' }}
                  >
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : <>Vérifier <CheckCircle size={14} /></>}
                  </button>
                </div>
              </form>
            )}

            {/* ÉTAPE 4 : CRÉATION DU COMPTE */}
            {step === 'create' && (
              <form onSubmit={handleCreateAccount} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Nom complet *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Prénom Nom"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border outline-none text-xs"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+229 90 00 00 00"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border outline-none text-xs"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Rôle *</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'coordinator' })}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border outline-none text-xs appearance-none"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                    >
                      <option value="admin">👑 Administrateur</option>
                      <option value="coordinator">👔 Coordinateur</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Mot de passe *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Minimum 6 caractères"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border outline-none text-xs"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Confirmer le mot de passe *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Confirmez"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border outline-none text-xs"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('otp')}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border hover:bg-gray-50 flex items-center justify-center gap-1"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <ArrowLeft size={14} /> Retour
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.full_name || !formData.password || isLoading}
                    className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm hover:opacity-95"
                    style={{ background: 'var(--color-primary, #113f30)' }}
                  >
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : <>Créer mon compte <CheckCircle size={14} /></>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSetupPage;
