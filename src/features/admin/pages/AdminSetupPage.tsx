// 📁 src/features/admin/pages/SettingsPage.tsx
// ✅ PAGE PARAMÈTRES ADMIN : MODIFICATION ET PERSISTANCE RÉELLE SUR TABLE 'SETTINGS'

import { useEffect, useState } from 'react';
import { Settings, Save, RefreshCw, Shield, Bell, Lock, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface SettingItem {
  id: string;
  key: string;
  value: any;
  category: string;
  description: string;
  is_public: boolean;
}

const SettingsPage = () => {
  const { profile, role } = useAuthStore();
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const colors = getThemeColors(getThemeByRole(role, profile?.patient_category as any));

  useEffect(() => {
    fetchSettings();
  }, []);

  // ✅ RECUPERATION DES PARAMETRES EN BD
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;

      // Si la table est vide, nous insérons quelques paramètres par défaut
      if (!data || data.length === 0) {
        const defaultSettings = [
          { key: 'maintenance_mode', value: false, category: 'general', description: 'Activer le mode maintenance du site', type: 'boolean', is_public: true },
          { key: 'allow_new_registrations', value: true, category: 'general', description: 'Autoriser les nouvelles inscriptions', type: 'boolean', is_public: true },
          { key: 'auto_assign_aidants', value: true, category: 'general', description: 'Assignation automatique des aidants', type: 'boolean', is_public: false },
          { key: 'visit_reminder_hours', value: 24, category: 'notifications', description: 'Délai des rappels de visites (heures)', type: 'number', is_public: false },
        ];

        const { data: inserted } = await supabase.from('settings').insert(defaultSettings).select();
        setSettings(inserted || []);
      } else {
        setSettings(data);
      }
    } catch (error: any) {
      console.error('Fetch settings error:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ MODIFICATION DE VALEUR DANS L'ETAT LOCAL
  const handleToggleSetting = (key: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value: !s.value } : s))
    );
  };

  const handleTextSettingChange = (key: string, newValue: any) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value: newValue } : s))
    );
  };

  // ✅ SAUVEGARDE GLOBALE EN BD SUPABASE
  const handleSaveAllSettings = async () => {
    setIsSaving(true);
    try {
      for (const item of settings) {
        const { error } = await supabase
          .from('settings')
          .update({
            value: item.value,
            updated_at: new Date().toISOString(),
          })
          .eq('key', item.key);

        if (error) throw error;
      }

      toast.success('Paramètres sauvegardés avec succès');
      fetchSettings();
    } catch (error: any) {
      console.error('Save settings error:', error);
      toast.error('Erreur lors de la sauvegarde : ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12 px-4 sm:px-0">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl p-6 border border-black/5" style={{ background: `${colors.primary}08` }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-black tracking-tight" style={{ color: colors.text }}>⚙️ Configuration Système</h1>
            <p className="text-xs font-semibold text-gray-500 mt-1">Gestion des paramètres de la plateforme Santé Plus</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchSettings} className="px-3.5 py-2 rounded-xl text-xs font-bold border bg-white flex items-center gap-1.5 hover:bg-gray-50">
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Actualiser
            </button>
            <button onClick={handleSaveAllSettings} disabled={isSaving} className="px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-sm" style={{ background: colors.primary }}>
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
            </button>
          </div>
        </div>
      </section>

      {/* Liste des paramètres */}
      <section className="bg-white rounded-3xl p-6 border shadow-sm space-y-4">
        {isLoading ? (
          <div className="p-10 text-center"><Loader2 size={24} className="animate-spin mx-auto text-gray-300" /></div>
        ) : (
          <div className="space-y-4 divide-y">
            {settings.map((item) => (
              <div key={item.key} className="pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-extrabold text-xs text-gray-800 uppercase tracking-wider">{item.key.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>

                <div className="shrink-0">
                  {typeof item.value === 'boolean' ? (
                    <button
                      onClick={() => handleToggleSetting(item.key)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        item.value ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-gray-100 text-gray-600 border'
                      }`}
                    >
                      {item.value ? 'RÉGLAGE ACTIF 🟢' : 'DÉSACTIVÉ ⚪'}
                    </button>
                  ) : (
                    <input
                      type={typeof item.value === 'number' ? 'number' : 'text'}
                      value={item.value}
                      onChange={(e) => handleTextSettingChange(item.key, typeof item.value === 'number' ? Number(e.target.value) : e.target.value)}
                      className="h-10 px-3.5 rounded-xl border text-xs font-bold bg-gray-50 outline-none w-36"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SettingsPage;
