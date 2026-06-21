// 📁 src/features/help/pages/PlanningPage.tsx
// 📌 Planning des missions pour les aidants

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, User, CheckCircle, XCircle } from 'lucide-react';
import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime } from '@/utils/helpers';
import toast from 'react-hot-toast';

const PlanningPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const { visits, fetchVisits, isLoading } = useVisitStore();

  // ✅ Jargon dynamique selon le rôle
  const {
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planifiee': return '#4CAF50';
      case 'en_cours': return '#FF9800';
      case 'terminee': return '#2196F3';
      case 'validee': return '#9C27B0';
      case 'annulee': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planifiee': return 'Planifiée';
      case 'en_cours': return 'En cours';
      case 'terminee': return 'Terminée';
      case 'validee': return 'Validée';
      case 'annulee': return 'Annulée';
      default: return status;
    }
  };

  // ✅ Libellé dynamique pour le titre
  const getPageTitle = () => {
    if (isAidant) return 'Mon planning';
    return 'Planning des visites';
  };

  // ✅ Libellé dynamique pour le nombre de missions
  const getMissionsCount = () => {
    const count = visits.filter(v => v.status === 'planifiee' || v.status === 'en_cours').length;
    if (isAidant) {
      return `${count} mission${count > 1 ? 's' : ''} à venir`;
    }
    return `${count} visite${count > 1 ? 's' : ''} à venir`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: colors.text }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
          {getPageTitle()}
        </h1>
        <p className="mt-1" style={{ color: colors.text + '99' }}>
          {getMissionsCount()}
        </p>
      </div>

      {/* Contrôles */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft size={24} style={{ color: colors.text }} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 rounded-xl font-medium transition hover:opacity-80"
            style={{ background: colors.primary + '15', color: colors.primary }}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronRight size={24} style={{ color: colors.text }} />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setView('day')}
            className={`px-4 py-2 rounded-xl font-medium transition ${view === 'day' ? 'text-white' : ''}`}
            style={{
              background: view === 'day' ? colors.primary : 'transparent',
              color: view === 'day' ? 'white' : colors.text,
            }}
          >
            Jour
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-4 py-2 rounded-xl font-medium transition ${view === 'week' ? 'text-white' : ''}`}
            style={{
              background: view === 'week' ? colors.primary : 'transparent',
              color: view === 'week' ? 'white' : colors.text,
            }}
          >
            Semaine
          </button>
        </div>
      </div>

      {/* Vue Semaine */}
      {view === 'week' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b" style={{ borderColor: colors.border }}>
            {daysInWeek.map((day, index) => (
              <button
                key={index}
                onClick={() => setSelectedDate(day)}
                className={`p-4 text-center transition ${
                  isToday(day) ? 'border-b-2' : ''
                } ${selectedDate.toISOString().split('T')[0] === day.toISOString().split('T')[0] ? 'bg-[var(--color-primary)]/5' : ''}`}
                style={{ borderColor: isToday(day) ? colors.primary : 'transparent' }}
              >
                <p className="text-xs font-medium" style={{ color: colors.text + '60' }}>
                  {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </p>
                <p className={`text-lg font-bold ${isToday(day) ? 'text-[var(--color-primary)]' : ''}`} style={{ color: isToday(day) ? colors.primary : colors.text }}>
                  {day.getDate()}
                </p>
                <p className="text-xs" style={{ color: colors.text + '40' }}>
                  {getVisitsForDate(day).length} visite(s)
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Visites du jour sélectionné */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
            <CalendarIcon size={20} className="inline mr-2" />
            {selectedDate.toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </h2>
          <span className="text-sm" style={{ color: colors.text + '60' }}>
            {dayVisits.length} visite(s)
          </span>
        </div>

        {dayVisits.length > 0 ? (
          <div className="space-y-3">
            {dayVisits.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)).map((visit) => (
              <div
                key={visit.id}
                onClick={() => navigate(`/app/visits/${visit.id}`)}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4"
                style={{ borderLeftColor: getStatusColor(visit.status) }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium" style={{ color: colors.text }}>
                        {visit.scheduled_time}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: getStatusColor(visit.status) + '20',
                          color: getStatusColor(visit.status),
                        }}
                      >
                        {getStatusLabel(visit.status)}
                      </span>
                    </div>
                    <p className="font-semibold mt-1" style={{ color: colors.text }}>
                      {visit.patient?.first_name} {visit.patient?.last_name}
                    </p>
                    <div className="flex items-center space-x-4 mt-1 text-sm" style={{ color: colors.text + '60' }}>
                      <span className="flex items-center space-x-1">
                        <MapPin size={14} />
                        <span>{visit.patient?.address}</span>
                      </span>
                      {visit.aidant && (
                        <span className="flex items-center space-x-1">
                          <User size={14} />
                          <span>{visit.aidant?.user?.full_name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {visit.status === 'planifiee' && (
                      <span className="text-sm" style={{ color: '#4CAF50' }}>✅ À venir</span>
                    )}
                    {visit.status === 'en_cours' && (
                      <span className="text-sm" style={{ color: '#FF9800' }}>🔄 En cours</span>
                    )}
                    {visit.status === 'terminee' && (
                      <span className="text-sm" style={{ color: '#2196F3' }}>✅ Terminée</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <CalendarIcon size={64} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium" style={{ color: colors.text }}>
              Aucune visite ce jour
            </h3>
            <p className="mt-1" style={{ color: colors.text + '80' }}>
              {isAidant ? 'Profitez de cette journée !' : 'Aucune mission planifiée pour cette journée.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanningPage;