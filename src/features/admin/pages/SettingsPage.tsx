// 📁 src/features/admin/pages/SettingsPage.tsx
// ✅ PAGE PARAMÈTRES : ALIGNEMENT DES CONTRÔLES H-11 ET SÉCURISATION RESPONSIVE SANS CHEVAUCHEMENT

import { useEffect, useState } from 'react';
import {
  Settings,
  Shield,
  Bell,
  Save,
  X,
  Eye,
  EyeOff,
  CreditCard,
  RefreshCw,
  Loader2,
  Palette,
  AlertTriangle,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { NotificationSoundSelector } from '@/components/settings';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface Setting {
  id: string;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  description: string | null;
  category: string;
  is_public: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface SettingField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'toggle' | 'select' | 'textarea' | 'color';
  value: any;
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  category: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

const SettingsPage = () => {
  const { profile, role } = useAuthStore();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [fields, setFields] = useState<SettingField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalValues, setOriginalValues] = useState<Record<string, any>>({});

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token manquant');
      }

      const response = await fetch(`${API_BASE_URL}/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
        buildFields(result.data);
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
    } catch (error: any) {
      console.error('❌ Fetch settings error:', error);
      toast.error(error.message || 'Erreur lors du chargement des paramètres');
      loadDefaultSettings();
    } finally {
      setIsLoading(false);
    }
  };

  const loadDefaultSettings = () => {
    const defaultSettings: Setting[] = [
      { id: '1', key: 'site_name', value: 'Santé Plus Services', type: 'string', description: 'Nom du site', category: 'general', is_public: true, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '2', key: 'site_description', value: 'Accompagnement humain et coordination à domicile', type: 'string', description: 'Description du site pour SEO', category: 'general', is_public: true, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '3', key: 'maintenance_mode', value: false, type: 'boolean', description: 'Mode maintenance', category: 'general', is_public: false, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '4', key: 'allow_registration', value: true, type: 'boolean', description: 'Permettre les inscriptions', category: 'security', is_public: true, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '5', key: 'session_timeout', value: 60, type: 'number', description: 'Expiration de session (minutes)', category: 'security', is_public: false, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '6', key: 'email_notifications', value: true, type: 'boolean', description: 'Notifications par email', category: 'notifications', is_public: true, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '7', key: 'push_notifications', value: true, type: 'boolean', description: 'Notifications push', category: 'notifications', is_public: true, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '8', key: 'notification_delay', value: 15, type: 'number', description: 'Délai notification (minutes)', category: 'notifications', is_public: false, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '9', key: 'currency', value: 'XOF', type: 'string', description: 'Devise par défaut', category: 'payments', is_public: true, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '10', key: 'vat_rate', value: 0, type: 'number', description: 'Taux de TVA (%)', category: 'payments', is_public: false, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '11', key: 'primary_color', value: '#1a4a3a', type: 'string', description: 'Couleur principale', category: 'appearance', is_public: true, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '12', key: 'dark_mode', value: false, type: 'boolean', description: 'Mode sombre par défaut', category: 'appearance', is_public: true, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    setSettings(defaultSettings);
    buildFields(defaultSettings);
  };

  const buildFields = (settingsData: Setting[]) => {
    const fieldMap: Record<string, SettingField[]> = {
      general: [],
      security: [],
      notifications: [],
      payments: [],
      appearance: [],
    };

    const fieldConfigs: Record<string, Partial<SettingField>> = {
      site_name: { label: 'Nom du site', type: 'text', placeholder: 'Nom du site' },
      site_description: { label: 'Description du site', type: 'textarea', placeholder: 'Description du site', help: 'Utilisé pour le SEO et le partage social' },
      maintenance_mode: { label: 'Mode maintenance', type: 'toggle', help: 'Activer le mode maintenance pour les travaux' },
      allow_registration: { label: 'Inscriptions ouvertes', type: 'toggle', help: 'Permettre aux nouveaux utilisateurs de s\'inscrire' },
      session_timeout: { label: 'Expiration de session (minutes)', type: 'number', placeholder: '60', help: 'Délai avant déconnexion automatique' },
      email_notifications: { label: 'Notifications par email', type: 'toggle', help: 'Envoyer des notifications par email' },
      push_notifications: { label: 'Notifications push', type: 'toggle', help: 'Envoyer des notifications push' },
      notification_delay: { label: 'Délai notification (minutes)', type: 'number', placeholder: '15', help: 'Délai avant l\'envoi des rappels' },
      currency: { label: 'Devise', type: 'select', options: [
        { value: 'XOF', label: 'FCFA (XOF)' },
        { value: 'EUR', label: 'Euro (EUR)' },
        { value: 'USD', label: 'Dollar (USD)' },
      ], help: 'Devise utilisée pour les paiements' },
      vat_rate: { label: 'Taux de TVA (%)', type: 'number', placeholder: '0', help: 'Taxe appliquée sur les paiements' },
      primary_color: { label: 'Couleur principale', type: 'color', help: 'Couleur principale de l\'application' },
      dark_mode: { label: 'Mode sombre par défaut', type: 'toggle', help: 'Activer le mode sombre par défaut' },
    };

    settingsData.forEach(setting => {
      const config = fieldConfigs[setting.key] || {};
      const field: SettingField = {
        key: setting.key,
        label: config.label || setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: config.type as any || setting.type as any || 'text',
        value: setting.value,
        placeholder: config.placeholder || '',
        help: config.help || setting.description || '',
        category: setting.category,
        options: config.options || [],
      };
      fieldMap[setting.category as keyof typeof fieldMap]?.push(field);
    });

    setFields(Object.values(fieldMap).flat());

    const originals: Record<string, any> = {};
    settingsData.forEach(s => {
      originals[s.key] = s.value;
    });
    setOriginalValues(originals);
  };

  const handleFieldChange = (key: string, value: any) => {
    setFields(prev => prev.map(f => 
      f.key === key ? { ...f, value } : f
    ));
    
    setSettings(prev => prev.map(s => 
      s.key === key ? { ...s, value } : s
    ));
    
    if (originalValues[key] !== value) {
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Record<string, any> = {};
      settings.forEach(s => {
        if (originalValues[s.key] !== s.value) {
          updates[s.key] = s.value;
        }
      });

      if (Object.keys(updates).length === 0) {
        toast('Aucun changement à sauvegarder', { icon: 'ℹ️' });
        setIsSaving(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: updates }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la sauvegarde');
      }

      const result = await response.json();

      if (result.success) {
        toast.success('Paramètres sauvegardés avec succès');
        setHasChanges(false);
        settings.forEach(s => {
          originalValues[s.key] = s.value;
        });
        setOriginalValues({ ...originalValues });
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
    } catch (error: any) {
      console.error('❌ Save settings error:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Voulez-vous vraiment réinitialiser tous les paramètres ?')) return;
    
    try {
      await fetchSettings();
      setHasChanges(false);
      toast.success('Paramètres réinitialisés');
    } catch (error) {
      toast.error('Erreur lors de la réinitialisation');
    }
  };

  const getFieldsByCategory = (category: string) => {
    return fields.filter(f => f.category === category);
  };

  const tabs = [
    { id: 'general', label: 'Général', icon: <Settings size={18} /> },
    { id: 'security', label: 'Sécurité', icon: <Shield size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'payments', label: 'Paiements', icon: <CreditCard size={18} /> },
    { id: 'appearance', label: 'Apparence', icon: <Palette size={18} /> },
  ];

  const currentCategory = tabs.find(t => t.id === activeTab)?.label || 'Général';

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="bg-white rounded-2xl p-8 text-center">
          <Loader2 size={40} className="animate-spin mx-auto" style={{ color: colors.primary }} />
          <p className="mt-4 text-sm" style={{ color: colors.text + '60' }}>Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 px-4 sm:px-0">
      {/* Header */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-black/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black" style={{ color: colors.text }}>
              ⚙️ Paramètres
            </h1>
            <p className="text-xs text-gray-400 font-semibold">
              Gérez les paramètres de la plateforme
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="flex-1 sm:flex-initial h-11 px-4 rounded-xl text-xs font-bold border bg-white hover:bg-gray-50 flex items-center justify-center gap-1.5"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Réinitialiser
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex-1 sm:flex-initial h-11 px-5 rounded-xl text-white font-extrabold text-xs transition hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              style={{ 
                background: hasChanges && !isSaving ? colors.primary : '#9CA3AF' 
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Sauvegarder
                </>
              )}
            </button>
          </div>
        </div>
        {hasChanges && (
          <div className="mt-4 p-3.5 rounded-xl" style={{ background: '#FF980015', border: '1px solid #FF980030' }}>
            <p className="text-xs font-bold flex items-center gap-2 text-amber-600">
              <AlertTriangle size={15} />
              Des modifications n'ont pas été sauvegardées
            </p>
          </div>
        )}
      </section>

      {/* Navigation des onglets (Défilement horizontal fluide sur mobile) */}
      <section className="bg-white rounded-3xl p-2 shadow-sm border border-black/5 overflow-x-auto scrollbar-none">
        <div className="flex gap-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
              style={{
                background: activeTab === tab.id ? colors.primary : 'transparent',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Contenu */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-black/5">
        <div className="mb-6 border-b border-gray-100/50 pb-4">
          <h2 className="text-base sm:text-lg font-black" style={{ color: colors.text }}>
            {currentCategory}
          </h2>
          <p className="text-xs text-gray-400 font-semibold mt-1">
            Configuration {currentCategory.toLowerCase()} de la plateforme
          </p>
        </div>

        <div className="space-y-6">
          {getFieldsByCategory(activeTab).map((field) => (
            <SettingFieldComponent
              key={field.key}
              field={field}
              value={field.value}
              onChange={(value) => handleFieldChange(field.key, value)}
              colors={colors}
            />
          ))}

          {/* AJOUT DU SÉLECTEUR DE SON */}
          {activeTab === 'notifications' && (
            <div className="pt-4 border-t border-gray-100">
              <NotificationSoundSelector />
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

// =============================================
// SETTING FIELD COMPONENT
// =============================================

interface SettingFieldComponentProps {
  field: SettingField;
  value: any;
  onChange: (value: any) => void;
  colors: any;
}

const SettingFieldComponent = ({
  field,
  value,
  onChange,
  colors,
}: SettingFieldComponentProps) => {
  const [showPassword, setShowPassword] = useState(false);

  switch (field.type) {
    case 'toggle':
      return (
        <div className="flex items-center justify-between py-3.5 border-b last:border-b-0 gap-4" style={{ borderColor: colors.border }}>
          <div className="min-w-0 flex-1 pr-1">
            <p className="font-bold text-xs sm:text-sm text-gray-800" style={{ color: colors.text }}>
              {field.label}
            </p>
            {field.help && (
              <p className="text-[11px] text-gray-400 font-medium leading-relaxed mt-0.5">
                {field.help}
              </p>
            )}
          </div>
          <button
            onClick={() => onChange(!value)}
            className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
              value ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                value ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      );

    case 'select':
      return (
        <div className="py-3.5 border-b last:border-b-0" style={{ borderColor: colors.border }}>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            {field.label}
          </label>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border outline-none text-xs font-bold bg-gray-50/50 cursor-pointer"
            style={{
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {field.help && (
            <p className="text-[10px] text-gray-400 font-semibold mt-1">
              {field.help}
            </p>
          )}
        </div>
      );

    case 'color':
      return (
        <div className="py-3.5 border-b last:border-b-0" style={{ borderColor: colors.border }}>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            {field.label}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={value || '#1a4a3a'}
              onChange={(e) => onChange(e.target.value)}
              className="w-11 h-11 rounded-xl border cursor-pointer shrink-0"
              style={{ borderColor: colors.border }}
            />
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className="flex-1 h-11 px-4 rounded-xl border outline-none text-xs font-bold bg-gray-50/50"
              style={{
                borderColor: colors.border,
                color: colors.text,
              }}
            />
          </div>
          {field.help && (
            <p className="text-[10px] text-gray-400 font-semibold mt-1">
              {field.help}
            </p>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div className="py-3.5 border-b last:border-b-0" style={{ borderColor: colors.border }}>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            {field.label}
          </label>
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border outline-none text-xs font-bold bg-gray-50/50 resize-none"
            style={{
              borderColor: colors.border,
              color: colors.text,
            }}
          />
          {field.help && (
            <p className="text-[10px] text-gray-400 font-semibold mt-1">
              {field.help}
            </p>
          )}
        </div>
      );

    case 'password':
      return (
        <div className="py-3.5 border-b last:border-b-0" style={{ borderColor: colors.border }}>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            {field.label}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              className="w-full h-11 px-4 rounded-xl border outline-none text-xs font-bold bg-gray-50/50 pr-11"
              style={{
                borderColor: colors.border,
                color: colors.text,
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: colors.text + '40' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {field.help && (
            <p className="text-[10px] text-gray-400 font-semibold mt-1">
              {field.help}
            </p>
          )}
        </div>
      );

    default:
      return (
        <div className="py-3.5 border-b last:border-b-0" style={{ borderColor: colors.border }}>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            {field.label}
          </label>
          <input
            type={field.type === 'number' ? 'number' : 'text'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full h-11 px-4 rounded-xl border outline-none text-xs font-bold bg-gray-50/50"
            style={{
              borderColor: colors.border,
              color: colors.text,
            }}
          />
          {field.help && (
            <p className="text-[10px] text-gray-400 font-semibold mt-1">
              {field.help}
            </p>
          )}
        </div>
      );
  }
};

export default SettingsPage;
