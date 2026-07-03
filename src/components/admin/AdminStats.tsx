// 📁 src/components/admin/AdminStats.tsx

import { useEffect, useState } from 'react';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { useRefreshableData } from '@/hooks/useRefreshableData';
import { supabase } from '@/lib/supabase';
import { Users, UserCheck, Calendar, ShoppingBag, CreditCard, TrendingUp, UserCircle } from 'lucide-react';
import { getThemeColors } from '@/lib/permissions';
import toast from 'react-hot-toast';

interface AdminStatsProps {
  colors?: any;
}

export const AdminStats = ({ colors: propColors }: AdminStatsProps) => {
  const [stats, setStats] = useState({
    patients: 0,
    personalAccounts: 0,
    totalBeneficiaires: 0,
    aidants: 0,
    visitsToday: 0,
    orders: 0,
    revenue: 0,
    registrations: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // ✅ DÉCLARER fetchStats AVANT de l'utiliser dans useRefreshableData
  const fetchStats = async () => {
    try {
      setIsLoading(true);

      const [
        { count: patients },
        { count: aidants },
        { count: visitsToday },
        { count: orders },
        { count: registrations },
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('aidants').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('scheduled_date', new Date().toISOString().split('T')[0]),
        supabase.from('commandes').select('*', { count: 'exact', head: true }),
        supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('status', 'en_attente'),
      ]);

      // ✅ Récupérer les comptes personnels (familles sans patient)
      const { data: familyLinks, error: linksError } = await supabase
        .from('patient_family_links')
        .select('family_id');

      if (linksError) {
        console.error('❌ Erreur récupération liens famille:', linksError);
      }

      const familyIdsWithPatients = new Set(familyLinks?.map(l => l.family_id) || []);

      const { data: personalAccountsData, error: personalError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'family')
        .not('id', 'in', Array.from(familyIdsWithPatients).map(id => `'${id}'`).join(','));

      if (personalError) {
        console.error('❌ Erreur récupération comptes personnels:', personalError);
      }

      const personalAccountsCount = personalAccountsData?.length || 0;
      const totalBeneficiaires = (patients || 0) + personalAccountsCount;

      const { data: payments } = await supabase
        .from('paiements')
        .select('amount')
        .eq('status', 'valide');

      const revenue = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

      setStats({
        patients: patients || 0,
        personalAccounts: personalAccountsCount,
        totalBeneficiaires: totalBeneficiaires,
        aidants: aidants || 0,
        visitsToday: visitsToday || 0,
        orders: orders || 0,
        revenue: revenue,
        registrations: registrations || 0,
      });
    } catch (error) {
      console.error('❌ Erreur fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ MAINTENANT on peut utiliser fetchStats dans le hook
  const { refreshAll, isRefreshing } = useRefreshableData({
    onRefresh: fetchStats,
    onError: (error) => toast.error('Erreur lors du rafraîchissement'),
  });

  const colors = propColors || getThemeColors('senior');

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const statItems = [
    { 
      label: 'Bénéficiaires', 
      value: stats.totalBeneficiaires, 
      icon: <Users size={18} />, 
      color: colors.primary,
      sub: `${stats.patients} patients • ${stats.personalAccounts} comptes personnels`
    },
    { label: 'Aidants', value: stats.aidants, icon: <UserCheck size={18} />, color: '#10b981' },
    { label: 'Visites aujourd\'hui', value: stats.visitsToday, icon: <Calendar size={18} />, color: '#3b82f6' },
    { label: 'Commandes', value: stats.orders, icon: <ShoppingBag size={18} />, color: '#f59e0b' },
    { label: 'Inscriptions', value: stats.registrations, icon: <Users size={18} />, color: '#ef4444' },
    { label: 'Revenus', value: `${stats.revenue.toLocaleString()} FCFA`, icon: <TrendingUp size={18} />, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Statistiques en temps réel</h3>
        <RefreshButton size="sm" showText={false} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statItems.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-black/5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
                <p className="text-lg font-extrabold mt-0.5" style={{ color: item.color }}>
                  {item.value}
                </p>
                {item.sub && (
                  <p className="text-[8px] text-gray-400 mt-0.5">{item.sub}</p>
                )}
              </div>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: item.color + '0d', color: item.color }}
              >
                {item.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
