// 📁 src/features/help/pages/PlanningPage.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle, 
  XCircle,
  CalendarDays,
  List,
  Eye,
  Users,
  Home,
  AlertCircle,
  Play,
  Circle,
} from 'lucide-react';
import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime } from '@/utils/helpers';
import { Illustration } from '@/components/ui/Illustration';
import toast from 'react-hot-toast';

// =============================================
// STATUS CONFIG
// =============================================

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  planifiee: { 
    color: '#4CAF50', 
    bg: '#4CAF5015', 
    label: 'Planifiée',
    icon: <CalendarIcon size={10} />,
  },
  en_cours: { 
    color: '#FF9800', 
    bg: '#FF980015', 
    label: 'En cours',
    icon: <Play size={10} />,
  },
  terminee: { 
    color: '#2196F3', 
    bg: '#2196F315', 
    label: 'Terminée',
    icon: <CheckCircle size={10} />,
  },
  validee: { 
    color: '#9C27B0', 
    bg: '#9C27B015', 
    label: 'Validée',
    icon: <CheckCircle size={10} />,
  },
  annulee: { 
    color: '#F44336', 
    bg: '#F4433615', 
    label: 'Annulée',
    icon: <XCircle size={10} />,
  },
  no_show: { 
    color: '#795548', 
    bg: '#79554815', 
    label: 'Absent',
    icon: <XCircle size={10} />,
  },
  replanifiee: { 
    color: '#FF5722', 
    bg: '#FF572215', 
    label: 'Replanifiée',
    icon: <CalendarIcon size={10} />,
  },
};

const PlanningPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const { visits, fetchVisits, isLoading } = useVisitStore();

  const {
    singular,
    getCategoryLabel,
    isAidant,
  } = useTerminology();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('day');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchVisits();
  }, []);

  const getDaysInWeek = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getVisitsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return visits.filter(v => v.scheduled_date === dateStr);
  };

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toISOString().split('T')[0] === today.toISOString().split('T')[0];
  };

  const daysInWeek = getDaysInWeek(currentDate);
  const dayVisits = getVisitsForDate(selectedDate);

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG['planifiee'];
  };

  const getPageTitle = () => {
    if (isAidant) return 'Mon planning';
    return 'Planning des visites';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-white rounded-2xl animate-pulse" />
        <div className="h-12 bg-white rounded-xl animate-pulse" />
        <div className="grid grid-cols-7 gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((item) => (
            <div key={item} className="h-16 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-16 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 sm:pb-10">
      {/* HEADER */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-1.5"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <CalendarDays size={12} />
              Planning
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              {getPageTitle()}
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {visits.filter(v => v.status === 'planifiee' || v.status === 'en_cours').length} mission(s) à venir
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setView('day')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                view === 'day' ? 'text-white' : 'text-gray-600'
              }`}
              style={{
                background: view === 'day' ? colors.primary : 'transparent',
              }}
            >
              <CalendarIcon size={12} />
              Jour
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                view === 'week' ? 'text-white' : 'text-gray-600'
              }`}
              style={{
                background: view === 'week' ? colors.primary : 'transparent',
              }}
            >
              <CalendarDays size={12} />
              Semaine
            </button>
          </div>
        </div>
      </section>

      {/* CONTROLS */}
      <section className="bg-white rounded-2xl p-2 shadow-sm border border-black/5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(view === 'day' ? -1 : -7)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft size={18} style={{ color: colors.text }} />
          </button>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            <CalendarIcon size={12} />
            {view === 'day'
              ? selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
              : `${daysInWeek[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${daysInWeek[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
            }
          </button>

          <button
            onClick={() => changeDate(view === 'day' ? 1 : 7)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronRight size={18} style={{ color: colors.text }} />
          </button>
        </div>
      </section>

      {/* VUE SEMAINE */}
      {view === 'week' && (
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="grid grid-cols-7">
            {daysInWeek.map((day, index) => {
              const isSelected = selectedDate.toISOString().split('T')[0] === day.toISOString().split('T')[0];
              const isToday_ = isToday(day);
              const count = getVisitsForDate(day).length;

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day)}
                  className={`p-2 text-center transition ${
                    isSelected ? 'border-b-2' : ''
                  } ${isToday_ ? 'bg-[var(--color-primary)]/5' : ''}`}
                  style={{
                    borderColor: isSelected ? colors.primary : 'transparent',
                  }}
                >
                  <p className="text-[8px] font-medium uppercase tracking-wider" style={{ color: colors.text + '50' }}>
                    {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </p>
                  <p className={`text-sm font-bold ${isToday_ ? 'text-[var(--color-primary)]' : ''}`} style={{ color: isToday_ ? colors.primary : colors.text }}>
                    {day.getDate()}
                  </p>
                  {count > 0 && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full flex items-center justify-center gap-0.5" style={{ background: colors.primary + '12', color: colors.primary }}>
                      <CalendarIcon size={8} />
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* VISITES DU JOUR */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold flex items-center gap-2" style={{ color: colors.text }}>
            <CalendarIcon size={16} style={{ color: colors.primary }} />
            {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <List size={12} />
            {dayVisits.length} visite{dayVisits.length > 1 ? 's' : ''}
          </span>
        </div>

        {dayVisits.length > 0 ? (
          <div className="space-y-2">
            {dayVisits
              .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))
              .map((visit) => {
                const statusConfig = getStatusConfig(visit.status);
                return (
                  <div
                    key={visit.id}
                    onClick={() => navigate(`/app/visits/${visit.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition cursor-pointer border-l-2 group"
                    style={{ borderLeftColor: statusConfig.color, background: statusConfig.bg }}
                  >
                    <div className="min-w-[55px]">
                      <p className="text-xs font-bold" style={{ color: colors.text }}>
                        {visit.scheduled_time}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: colors.text }}>
                          {visit.patient?.first_name} {visit.patient?.last_name}
                        </p>
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[8px] font-medium flex items-center gap-0.5 shrink-0"
                          style={{
                            background: statusConfig.bg,
                            color: statusConfig.color,
                          }}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                        {visit.is_urgent && (
                          <span className="px-1.5 py-0.5 rounded-full text-[8px] font-medium flex items-center gap-0.5 shrink-0" style={{ background: '#F4433615', color: '#F44336' }}>
                            <AlertCircle size={10} />
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                        <MapPin size={10} />
                        {visit.patient?.address || 'Adresse non précisée'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-medium" style={{ color: colors.primary }}>
                        <Eye size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Illustration type="calendar" size="lg" className="mx-auto mb-3 opacity-30" />
            <p className="text-sm text-gray-400">Aucune visite ce jour</p>
            <p className="text-xs text-gray-300 mt-1">Profitez de cette journée</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default PlanningPage;
