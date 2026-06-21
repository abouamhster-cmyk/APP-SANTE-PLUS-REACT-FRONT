// 📁 src/components/reminders/ReminderBanner.tsx
// 📌 Bannière de rappel pour les aidants

import { useState, useEffect } from 'react';
import { Bell, Clock, Calendar, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { getThemeColors } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime } from '@/utils/helpers';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface PendingVisit {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  patient: {
    first_name: string;
    last_name: string;
    address: string;
  };
}

export const ReminderBanner = () => {
  const { user, profile } = useAuthStore();
  
  // ✅ Jargon dynamique selon le rôle
  const {
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    getCategoryLabel,
    isAidant,
  } = useTerminology();

  const [pendingVisits, setPendingVisits] = useState<PendingVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const colors = getThemeColors('senior');

  useEffect(() => {
    if (profile?.role === 'aidant' && user) {
      fetchPendingVisits();
    }
  }, [user, profile]);

  const fetchPendingVisits = async () => {
    try {
      setIsLoading(true);
      
      // Récupérer l'aidant
      const { data: aidant } = await supabase
        .from('aidants')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!aidant) return;

      const now = new Date();
      const inTwoHours = new Date(now);
      inTwoHours.setHours(inTwoHours.getHours() + 2);
      const timeLimit = inTwoHours.toTimeString().slice(0, 5);
      const today = now.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('visites')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          patient:patients (
            first_name,
            last_name,
            address
          )
        `)
        .eq('aidant_id', aidant.id)
        .eq('status', 'planifiee')
        .eq('scheduled_date', today)
        .gte('scheduled_time', now.toTimeString().slice(0, 5))
        .lt('scheduled_time', timeLimit);

      if (error) throw error;

      const formattedVisits: PendingVisit[] = (data || []).map((visit: any) => ({
        id: visit.id,
        scheduled_date: visit.scheduled_date,
        scheduled_time: visit.scheduled_time,
        patient: Array.isArray(visit.patient) && visit.patient.length > 0
          ? {
              first_name: visit.patient[0]?.first_name || 'Patient',
              last_name: visit.patient[0]?.last_name || '',
              address: visit.patient[0]?.address || 'Adresse non précisée',
            }
          : {
              first_name: 'Patient',
              last_name: '',
              address: 'Adresse non précisée',
            }
      }));

      setPendingVisits(formattedVisits);
    } catch (error) {
      console.error('Fetch pending visits error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Libellé dynamique pour les visites à venir
  const getBannerTitle = () => {
    if (isAidant) return '⏰ Visites à venir';
    return '⏰ Rappels';
  };

  const getVisitLabel = (count: number) => {
    if (isAidant) {
      return `${count} visite${count > 1 ? 's' : ''} dans les 2 prochaines heures`;
    }
    return `${count} rappel${count > 1 ? 's' : ''}`;
  };

  if (isLoading || pendingVisits.length === 0 || !isVisible || profile?.role !== 'aidant') {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 mb-4" style={{ borderLeftColor: colors.primary }}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: colors.primary + '15', color: colors.primary }}>
            <Bell size={20} />
          </div>
          <div>
            <h4 className="font-semibold" style={{ color: colors.text }}>
              {getBannerTitle()}
            </h4>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {getVisitLabel(pendingVisits.length)}
            </p>
            <div className="mt-2 space-y-1">
              {pendingVisits.map((visit) => (
                <Link
                  key={visit.id}
                  to={`/app/visits/${visit.id}`}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition"
                  style={{ color: colors.text }}
                >
                  <Clock size={16} style={{ color: colors.primary }} />
                  <span className="text-sm font-medium">
                    {visit.patient?.first_name} {visit.patient?.last_name}
                  </span>
                  <span className="text-xs" style={{ color: colors.text + '40' }}>
                    {formatTime(visit.scheduled_time)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-gray-100 rounded-lg transition"
        >
          <X size={18} style={{ color: colors.text + '40' }} />
        </button>
      </div>
    </div>
  );
};