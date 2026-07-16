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
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime, cn } from '@/utils/helpers';
import { Illustration } from '@/components/ui/Illustration';
import { RatingModal } from '@/features/journal/components/RatingModal';
import { VisitDetailsModal } from '@/features/journal/components/VisitDetailsModal';
import toast from 'react-hot-toast';

const JournalPage = () => {
  const { profile, role } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;

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
      <section className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
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

            <p className="text-xs mt-0.5" style={{ color: colors.textLight }}>
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
                  ? "bg-white shadow-sm font-extrabold" 
                  : "hover:opacity-80"
              )}
              style={{
                color: viewMode === 'timeline' ? colors.primary : colors.textLight,
                backgroundColor: viewMode === 'timeline' ? '#ffffff' : 'transparent',
              }}
            >
              <List size={12} />
              <span>Liste</span>
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={cn(
                "flex-1 md:flex-initial px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none",
                viewMode === 'weekly' 
                  ? "bg-white shadow-sm font-extrabold" 
                  : "hover:opacity-80"
              )}
              style={{
                color: viewMode === 'weekly' ? colors.primary : colors.textLight,
                backgroundColor: viewMode === 'weekly' ? '#ffffff' : 'transparent',
              }}
            >
              <LayoutGrid size={12} />
              <span>Semaine</span>
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={cn(
                "flex-1 md:flex-initial px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none",
                viewMode === 'stats' 
                  ? "bg-white shadow-sm font-extrabold" 
                  : "hover:opacity-80"
              )}
              style={{
                color: viewMode === 'stats' ? colors.primary : colors.textLight,
                backgroundColor: viewMode === 'stats' ? '#ffffff' : 'transparent',
              }}
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
            color="#F59E0B"
          />
          <StatCard
            icon={<Star size={14} />}
            label={statLabels.average}
            value={stats.average_rating.toFixed(1)}
            color={colors.gold || '#c9a84c'}
          />
          <StatCard
            icon={<User size={14} />}
            label={statLabels.aidants}
            value={stats.total_aidants}
            color={colors.secondary || '#c9a84c'}
          />
        </section>
      )}

      {/* VUE PAR SEMAINE */}
      {viewMode === 'weekly' && (
        <section className="space-y-3">
          {weeklyEntries.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
              <Illustration type="calendar" size="lg" className="mx-auto mb-3 opacity-30" />
              <h3 className="text-sm font-bold" style={{ color: colors.text }}>
                Aucune visite
              </h3>
              <p className="text-xs mt-1" style={{ color: colors.textLight }}>Aucune visite enregistrée pour le moment</p>
            </div>
          ) : (
            weeklyEntries.map(({ week, entries: weekEntries }) => (
              <div key={week} className="bg-white rounded-2xl p-3 shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
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
                            background: entry.status === 'validee' ? '#4CAF50' : '#F59E0B',
                          }}
                        />
                        <p className="text-xs font-medium truncate" style={{ color: colors.text }}>
                          {getPatientName(entry)}
                        </p>
                        <p className="text-[9px] shrink-0" style={{ color: colors.textLight }}>
                          {formatDate(entry.date)} {entry.time}
                        </p>
                      </div>
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[8px] font-bold shrink-0"
                        style={{
                          background: entry.status === 'validee' ? '#4CAF5015' : '#F59E0B15',
                          color: entry.status === 'validee' ? '#4CAF50' : '#F59E0B',
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
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
              <Illustration type="calendar" size="lg" className="mx-auto mb-3 opacity-30" />
              <h3 className="text-sm font-bold" style={{ color: colors.text }}>
                Aucune visite
              </h3>
              <p className="text-xs mt-1" style={{ color: colors.textLight }}>Aucune visite enregistrée pour le moment</p>
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
  const brand = useBranding();
  const colors = brand.colors;

  return (
    <div className="bg-white rounded-xl p-2.5 shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '15', color }}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-base font-black" style={{ color }}>{value}</p>
          <p className="text-[8px] uppercase tracking-wider" style={{ color: colors.textLight }}>{label}</p>
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
    <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border hover:shadow-md transition" style={{ borderColor: colors.primary + '15' }}>
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
              <p className="font-bold text-sm truncate" style={{ color: colors.text }}>
                {getPatientName(entry)}
              </p>
              <p className="text-[10px] font-bold flex items-center gap-1 uppercase tracking-wide mt-0.5" style={{ color: colors.textLight }}>
                <Calendar size={11} className="shrink-0 text-gray-400" /> 
                <span>{formatDate(entry.date)} à {entry.time}</span>
              </p>
            </div>
          </div>

          {/* Affichage de l'aidant */}
          {entry.aidant && (
            <div className="flex items-center gap-1.5 pl-0.5">
              <User size={11} className="shrink-0 text-gray-400" />
              <span className="text-[11px] font-semibold" style={{ color: colors.textLight }}>
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
                <span className="text-[9px] font-bold" style={{ color: colors.textLight }}>+{entry.actions.length - 3}</span>
              )}
            </div>
          )}

          {/* Médias */}
          {(hasPhotos || hasAudio) && (
            <div className="flex items-center gap-2 pt-1">
              {hasPhotos && (
                <span className="text-[10px] font-bold flex items-center gap-0.5" style={{ color: colors.textLight }}>
                  <Image size={11} /> {entry.photos.length} photo{entry.photos.length > 1 ? 's' : ''}
                </span>
              )}
              {hasAudio && (
                <span className="text-[10px] font-bold flex items-center gap-0.5" style={{ color: colors.textLight }}>
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
              background: entry.status === 'validee' ? '#4CAF5015' : '#F59E0B15',
              color: entry.status === 'validee' ? '#4CAF50' : '#F59E0B',
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
                <span className="text-xs font-black" style={{ color: colors.text }}>{entry.rating}</span>
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
