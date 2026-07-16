// 📁 src/features/help/pages/PlanningPage.tsx

import { useEffect, useState, useRef } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime, cn } from '@/utils/helpers';
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
    color: '#F59E0B', 
    bg: '#F59E0B15', 
    label: 'En cours',
    icon: <Play size={10} />,
  },
  terminee: { 
    color: '#3B82F6', 
    bg: '#3B82F615', 
    label: 'Terminée',
    icon: <CheckCircle size={10} />,
  },
  validee: { 
    color: '#8B5CF6', 
    bg: '#8B5CF615', 
    label: 'Validée',
    icon: <CheckCircle size={10} />,
  },
  annulee: { 
    color: '#EF4444', 
    bg: '#EF444415', 
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
    color: '#F59E0B', 
    bg: '#F59E0B15', 
    label: 'Replanifiée',
    icon: <CalendarIcon size={10} />,
  },
};

const PlanningPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
  const { visits, fetchVisits, isLoading } = useVisitStore();

  const {
    singular,
    getCategoryLabel,
    isAidant,
  } = useTerminology();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('day');

  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startTouchY = useRef(0);

  useEffect(() => {
    fetchVisits();
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startTouchY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - startTouchY.current;

    if (diffY > 0 && window.scrollY === 0) {
      const resistance = Math.min(diffY * 0.38, 72);
      setPullY(resistance);
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    setIsPulling(false);
    if (pullY >= 50) {
      toast.promise(
        fetchVisits(),
        {
          loading: 'Actualisation de l\'agenda...',
          success: 'Planning à jour !',
          error: 'Échec de synchronisation.',
        }
      );
    }
    setPullY(0);
  };

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
    if (isAidant) return 'Mon planning d\'accompagnement';
    return 'Planning des visites';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((item) => (
            <div key={item} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2].map((item) => (
            <div key={item} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="space-y-6 pb-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      
      <div 
        className="w-full flex justify-center overflow-hidden transition-all duration-300 ease-out"
        style={{ 
          height: pullY > 0 ? `${pullY}px` : '0px',
          opacity: pullY > 0 ? Math.min(pullY / 45, 1) : 0
        }}
      >
        <div className="flex items-center gap-1.5 py-1 text-emerald-600">
          <RefreshCw 
            size={13} 
            className={cn("transition-all", pullY >= 50 ? "rotate-180 animate-spin" : "")} 
            style={{ transform: pullY < 50 ? `rotate(${pullY * 3.6}deg)` : undefined }}
          />
          <span className="text-[10px] font-black uppercase tracking-wider">
            {pullY >= 50 ? 'Relâcher pour actualiser' : 'Tirer pour rafraîchir'}
          </span>
        </div>
      </div>

      <section className="relative overflow-hidden bg-white/60 border rounded-2xl p-5 sm:p-6 shadow-sm backdrop-blur-md flex flex-col items-center gap-4" style={{ borderColor: colors.primary + '15' }}>
        
        <div className="w-full flex items-center justify-between gap-2 border-b pb-3" style={{ borderColor: colors.primary + '10' }}>
          <div className="p-0.5 bg-gray-100/85 rounded-xl border gap-0.5 flex" style={{ borderColor: colors.primary + '10' }}>
            <button
              onClick={() => setView('day')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all select-none",
                view === 'day'
                  ? "bg-white shadow-sm font-extrabold"
                  : "hover:opacity-80"
              )}
              style={{
                color: view === 'day' ? colors.primary : colors.textLight,
                backgroundColor: view === 'day' ? '#ffffff' : 'transparent',
              }}
            >
              Jour
            </button>
            <button
              onClick={() => setView('week')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all select-none",
                view === 'week'
                  ? "bg-white shadow-sm font-extrabold"
                  : "hover:opacity-80"
              )}
              style={{
                color: view === 'week' ? colors.primary : colors.textLight,
                backgroundColor: view === 'week' ? '#ffffff' : 'transparent',
              }}
            >
              Semaine
            </button>
          </div>

          <button
            onClick={async () => {
              toast.promise(
                fetchVisits(),
                {
                  loading: 'Mise à jour...',
                  success: 'Planning actualisé !',
                  error: 'Échec de la mise à jour',
                }
              );
            }}
            disabled={isLoading}
            className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition shadow-inner shrink-0"
            title="Rafraîchir"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="space-y-1 mt-1">
          <h1 className="text-base sm:text-lg font-black tracking-tight" style={{ color: colors.text }}>
            {getPageTitle()}
          </h1>
          <p className="text-xs max-w-sm mx-auto leading-relaxed" style={{ color: colors.textLight }}>
            Consultez et organisez vos interventions d'aide et d'assistance à la journée ou à la semaine.
          </p>
        </div>
      </section>

      <section className="bg-white/80 rounded-2xl p-3 border shadow-sm flex items-center justify-between gap-3" style={{ borderColor: colors.primary + '15' }}>
        <button
          onClick={() => changeDate(view === 'day' ? -1 : -7)}
          className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 transition"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          onClick={() => {
            setCurrentDate(new Date());
            setSelectedDate(new Date());
          }}
          className="px-4 h-9 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          style={{ background: colors.primary + '12', color: colors.primary }}
        >
          <CalendarIcon size={13} />
          {view === 'day'
            ? selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
            : `${daysInWeek[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${daysInWeek[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
          }
        </button>

        <button
          onClick={() => changeDate(view === 'day' ? 1 : 7)}
          className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 transition"
        >
          <ChevronRight size={16} />
        </button>
      </section>

      {view === 'week' && (
        <section className="bg-white rounded-2xl shadow-sm border p-2.5" style={{ borderColor: colors.primary + '15' }}>
          <div className="grid grid-cols-7 gap-1">
            {daysInWeek.map((day, index) => {
              const isSelected = selectedDate.toISOString().split('T')[0] === day.toISOString().split('T')[0];
              const isToday_ = isToday(day);
              const count = getVisitsForDate(day).length;

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "p-2.5 rounded-xl text-center transition flex flex-col items-center justify-between min-h-[70px]",
                    isSelected ? "text-white shadow-sm" : "hover:bg-gray-50"
                  )}
                  style={{
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                  }}
                >
                  <p 
                    className="text-[10px] font-bold uppercase tracking-wider" 
                    style={{ color: isSelected ? '#ffffff' : (isToday_ ? colors.primary : colors.textLight) }}
                  >
                    {day.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3)}
                  </p>
                  <p 
                    className="text-sm font-extrabold mt-1" 
                    style={{ color: isSelected ? '#ffffff' : (isToday_ ? colors.primary : colors.text) }}
                  >
                    {day.getDate()}
                  </p>
                  {count > 0 ? (
                    <span 
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full flex items-center justify-center gap-0.5 mt-1",
                        isSelected ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      )}
                    >
                      {count}
                    </span>
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-transparent mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="bg-white rounded-2xl p-5 shadow-sm border space-y-4" style={{ borderColor: colors.primary + '15' }}>
        
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: colors.primary + '10' }}>
          <p className="text-xs sm:text-sm font-extrabold flex items-center gap-2" style={{ color: colors.text }}>
            <CalendarIcon size={16} style={{ color: colors.primary }} />
            <span>{selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </p>
          <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: colors.textLight }}>
            <List size={13} />
            <span>{dayVisits.length} visite{dayVisits.length > 1 ? 's' : ''}</span>
          </span>
        </div>

        {dayVisits.length > 0 ? (
          <div className="space-y-3 relative pl-3.5 border-l" style={{ borderColor: colors.primary + '10' }}>
            {dayVisits
              .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))
              .map((visit) => {
                const statusConfig = getStatusConfig(visit.status);
                return (
                  <div
                    key={visit.id}
                    onClick={() => navigate(`/app/visits/${visit.id}`)}
                    className="relative group p-4 rounded-xl hover:bg-gray-50 border shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all duration-200"
                    style={{ borderColor: colors.primary + '10' }}
                  >
                    <div 
                      className="absolute -left-[19px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 animate-pulse"
                      style={{ background: statusConfig.color }}
                    />

                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex items-center gap-1 text-xs font-black bg-gray-100/60 px-2.5 py-1 rounded-lg shrink-0" style={{ color: colors.text }}>
                        <Clock size={11} className="text-gray-400" />
                        <span>{visit.scheduled_time}</span>
                      </div>

                      <div className="min-w-0">
                        <p className="font-extrabold text-xs sm:text-sm truncate" style={{ color: colors.text }}>
                          {visit.patient?.first_name} {visit.patient?.last_name}
                        </p>
                        <p className="text-[11px] truncate flex items-center gap-1 mt-0.5" style={{ color: colors.textLight }}>
                          <MapPin size={10} className="shrink-0 text-gray-400" />
                          <span>{visit.patient?.address || 'Adresse non renseignée'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                        style={{
                          background: statusConfig.bg,
                          color: statusConfig.color,
                        }}
                      >
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                      
                      {visit.is_urgent && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-100/35">
                          ⚠️ Urgent
                        </span>
                      )}

                      <div className="p-1 text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-10 flex flex-col items-center justify-center gap-3">
            <Illustration type="calendar" size="md" className="mx-auto opacity-35" />
            <div className="space-y-0.5">
              <p className="text-sm font-bold" style={{ color: colors.text }}>Aucune visite ce jour</p>
              <p className="text-xs" style={{ color: colors.textLight }}>Profitez de cette journée pour vous ressourcer.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default PlanningPage;
