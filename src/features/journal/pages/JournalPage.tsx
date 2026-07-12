// 📁 src/features/journal/pages/JournalPage.tsx
// ✅ PAGE JOURNAL DE BORD : OPTIMISATION DU DESIGN RESPONSIVE SANS CHEVAUCHEMENTS

import { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  Star,
  User,
  Image,
  Music,
  FileText,
  TrendingUp,
  Award,
  List,
  LayoutGrid,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { useJournalStore } from '@/stores/journalStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime, cn } from '@/utils/helpers'; // 🟢 Importation de 'cn' ajoutée
import { Illustration } from '@/components/ui/Illustration';
import { RatingModal } from '@/features/journal/components/RatingModal';
import { VisitDetailsModal } from '@/features/journal/components/VisitDetailsModal';
import toast from 'react-hot-toast';

const JournalPage = () => {
  const { profile, role } = useAuthStore();

  const {
    singular,
    plural,
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const {
    entries,
    stats,
    isLoading,
    fetchEntries,
    fetchStats,
    addRating,
    getEntriesByWeek,
  } = useJournalStore();

  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'weekly' | 'stats'>('timeline');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchEntries();
    fetchStats();
  }, []);

  const handleRateVisit = async (visitId: string, rating: number, feedback: string) => {
    try {
      await addRating(visitId, rating, feedback);
      toast.success('Merci pour votre évaluation !');
      setShowRatingModal(false);
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const weeklyEntries = getEntriesByWeek();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-12 bg-white rounded-xl animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-20 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const getPageTitle = () => {
    if (isFamily) return 'Journal de bord - Proches';
    if (isAidant) return 'Journal de bord - Personnes accompagnées';
    if (isAdminOrCoordinator) return 'Journal de bord - Bénéficiaires';
    return 'Journal de bord';
  };

  const statLabels = {
    validated: 'Validées',
    pending: 'En attente',
    average: 'Note moyenne',
    aidants: 'Aidants',
  };

  const getAidantName = (entry: any) => {
    if (entry.aidant?.user?.full_name) {
      return entry.aidant.user.full_name;
    }
    if (entry.aidant?.full_name) {
      return entry.aidant.full_name;
    }
    if (entry.visit?.aidant?.user?.full_name) {
      return entry.visit.aidant.user.full_name;
    }
    if (entry.visit?.aidant?.full_name) {
      return entry.visit.aidant.full_name;
    }
    return 'Non assigné';
  };

  const getPatientName = (entry: any) => {
    if (entry.patient) {
      return `${entry.patient.first_name} ${entry.patient.last_name}`;
    }
    return 'Patient';
  };

  return (
    <div className="space-y-4 pb-24 sm:pb-10">
      {/* HEADER AVEC SEGMENT MOBILE ADAPTATIF */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-1.5"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <FileText size={12} />
              Journal
            </div>

            <h1 className="text-base sm:text-lg font-black tracking-tight" style={{ color: colors.text }}>
              {getPageTitle()}
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {entries.length} visite(s) enregistrée(s)
            </p>
          </div>

          {/* ✅ Sélecteur segmenté pour écrans tactiles mobiles */}
          <div className="flex w-full md:w-auto bg-gray-100/80 p-1 rounded-xl gap-1 shrink-0">
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                "flex-1 md:flex-initial px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none",
                viewMode === 'timeline' 
                  ? "bg-white text-gray-900 shadow-sm font-extrabold" 
                  : "text-gray-500 hover:text-gray-700"
              )}
              style={viewMode === 'timeline' ? { color: colors.primary } : undefined}
            >
              <List size={12} />
              <span>Liste</span>
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={cn(
                "flex-1 md:flex-initial px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none",
                viewMode === 'weekly' 
                  ? "bg-white text-gray-900 shadow-sm font-extrabold" 
                  : "text-gray-500 hover:text-gray-700"
              )}
              style={viewMode === 'weekly' ? { color: colors.primary } : undefined}
            >
              <LayoutGrid size={12} />
              <span>Semaine</span>
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={cn(
                "flex-1 md:flex-initial px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none",
                viewMode === 'stats' 
                  ? "bg-white text-gray-900 shadow-sm font-extrabold" 
                  : "text-gray-500 hover:text-gray-700"
              )}
              style={viewMode === 'stats' ? { color: colors.primary } : undefined}
            >
              <BarChart3 size={12} />
              <span>Stats</span>
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      {stats && viewMode === 'stats' && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatCard
            icon={<CheckCircle size={14} />}
            label={statLabels.validated}
            value={stats.validated_visits}
            color={colors.primary}
          />
          <StatCard
            icon={<Clock size={14} />}
            label={statLabels.pending}
            value={stats.pending_visits}
            color="#FF9800"
          />
          <StatCard
            icon={<Star size={14} />}
            label={statLabels.average}
            value={stats.average_rating.toFixed(1)}
            color="#FFD700"
          />
          <StatCard
            icon={<User size={14} />}
            label={statLabels.aidants}
            value={stats.total_aidants}
            color="#2196F3"
          />
        </section>
      )}

      {/* VUE PAR SEMAINE */}
      {viewMode === 'weekly' && (
        <section className="space-y-3">
          {weeklyEntries.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-black/5">
              <Illustration type="calendar" size="lg" className="mx-auto mb-3 opacity-30" />
              <h3 className="text-sm font-bold" style={{ color: colors.text }}>
                Aucune visite
              </h3>
              <p className="text-xs text-gray-400 mt-1">Aucune visite enregistrée pour le moment</p>
            </div>
          ) : (
            weeklyEntries.map(({ week, entries: weekEntries }) => (
              <div key={week} className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} style={{ color: colors.primary }} />
                  <p className="text-xs font-bold" style={{ color: colors.text }}>
                    Semaine {week.split('-W')[1]} — {weekEntries.length} visite{weekEntries.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {weekEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => {
                        setSelectedVisit(entry);
                        setShowDetailsModal(true);
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{
                            background: entry.status === 'validee' ? '#4CAF50' : '#FF9800',
                          }}
                        />
                        <p className="text-xs font-medium truncate" style={{ color: colors.text }}>
                          {getPatientName(entry)}
                        </p>
                        <p className="text-[9px] text-gray-400 shrink-0">
                          {formatDate(entry.date)} {entry.time}
                        </p>
                      </div>
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[8px] font-bold shrink-0"
                        style={{
                          background: entry.status === 'validee' ? '#4CAF5015' : '#FF980015',
                          color: entry.status === 'validee' ? '#4CAF50' : '#FF9800',
                        }}
                      >
                        {entry.status === 'validee' ? (
                          <CheckCircle size={8} />
                        ) : (
                          <Clock size={8} />
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* TIMELINE */}
      {viewMode === 'timeline' && (
        <section className="space-y-2">
          {entries.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-black/5">
              <Illustration type="calendar" size="lg" className="mx-auto mb-3 opacity-30" />
              <h3 className="text-sm font-bold" style={{ color: colors.text }}>
                Aucune visite
              </h3>
              <p className="text-xs text-gray-400 mt-1">Aucune visite enregistrée pour le moment</p>
            </div>
          ) : (
            entries.map((entry) => (
              <JournalEntryCompact
                key={entry.id}
                entry={entry}
                colors={colors}
                getAidantName={getAidantName}
                getPatientName={getPatientName}
                onRate={() => {
                  setSelectedVisit(entry);
                  setShowRatingModal(true);
                }}
                onViewDetails={() => {
                  setSelectedVisit(entry);
                  setShowDetailsModal(true);
                }}
              />
            ))
          )}
        </section>
      )}

      {/* MODALS */}
      {showRatingModal && selectedVisit && (
        <RatingModal
          visit={selectedVisit}
          onClose={() => setShowRatingModal(false)}
          onSubmit={handleRateVisit}
          colors={colors}
        />
      )}

      {showDetailsModal && selectedVisit && (
        <VisitDetailsModal
          visit={selectedVisit}
          onClose={() => setShowDetailsModal(false)}
          colors={colors}
        />
      )}
    </div>
  );
};

// =============================================
// STAT CARD
// =============================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

const StatCard = ({ icon, label, value, color }: StatCardProps) => {
  return (
    <div className="bg-white rounded-xl p-2.5 shadow-sm border border-black/5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '15', color }}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-base font-black" style={{ color }}>{value}</p>
          <p className="text-[8px] text-gray-400 uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </div>
  );
};

// =============================================
// JOURNAL ENTRY COMPACT ADAPTATIVE SANS CHEVAUCHEMENTS
// =============================================

interface JournalEntryCompactProps {
  entry: any;
  colors: any;
  getAidantName: (entry: any) => string;
  getPatientName: (entry: any) => string;
  onRate: () => void;
  onViewDetails: () => void;
}

const JournalEntryCompact = ({
  entry,
  colors,
  getAidantName,
  getPatientName,
  onRate,
  onViewDetails,
}: JournalEntryCompactProps) => {
  const hasPhotos = entry.photos && entry.photos.length > 0;
  const hasAudio = entry.audio_url;
  const isRated = entry.rating !== null;

  return (
    <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-black/5 hover:shadow-md transition">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-inner"
              style={{ background: colors.primary }}
            >
              {entry.patient?.first_name?.[0] || 'P'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">
                {getPatientName(entry)}
              </p>
              <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1 uppercase tracking-wide mt-0.5">
                <Calendar size={11} className="shrink-0 text-gray-400" /> 
                <span>{formatDate(entry.date)} à {entry.time}</span>
              </p>
            </div>
          </div>

          {/* Affichage de l'aidant */}
          {entry.aidant && (
            <div className="flex items-center gap-1.5 pl-0.5">
              <User size={11} className="shrink-0 text-gray-400" />
              <span className="text-[11px] font-semibold text-gray-500">
                Auxiliaire : <span className="font-bold" style={{ color: colors.text }}>{getAidantName(entry)}</span>
              </span>
            </div>
          )}

          {/* Actions réalisés */}
          {entry.actions && entry.actions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.actions.slice(0, 3).map((action: string, index: number) => (
                <span
                  key={index}
                  className="px-2.5 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: colors.primary + '12', color: colors.primary }}
                >
                  {action}
                </span>
              ))}
              {entry.actions.length > 3 && (
                <span className="text-[9px] text-gray-400 font-bold">+{entry.actions.length - 3}</span>
              )}
            </div>
          )}

          {/* Médias */}
          {(hasPhotos || hasAudio) && (
            <div className="flex items-center gap-2 pt-1">
              {hasPhotos && (
                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-0.5">
                  <Image size={11} /> {entry.photos.length} photo{entry.photos.length > 1 ? 's' : ''}
                </span>
              )}
              {hasAudio && (
                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-0.5">
                  <Music size={11} /> Note vocale
                </span>
              )}
            </div>
          )}
        </div>

        {/* Section Actions & Notes adaptatives */}
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1"
            style={{
              background: entry.status === 'validee' ? '#4CAF5015' : '#FF980015',
              color: entry.status === 'validee' ? '#4CAF50' : '#FF9800',
            }}
          >
            {entry.status === 'validee' ? (
              <>
                <CheckCircle size={10} />
                Validée
              </>
            ) : (
              <>
                <Clock size={10} />
                En attente
              </>
            )}
          </span>

          <div className="flex items-center gap-3">
            {isRated ? (
              <div className="flex items-center gap-1">
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-black">{entry.rating}</span>
              </div>
            ) : (
              entry.status === 'validee' && (
                <button
                  onClick={onRate}
                  className="text-xs font-extrabold hover:underline"
                  style={{ color: colors.primary }}
                >
                  Noter
                </button>
              )
            )}

            <button
              onClick={onViewDetails}
              className="text-xs font-extrabold hover:underline flex items-center gap-0.5"
              style={{ color: colors.primary }}
            >
              Détails
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalPage;
