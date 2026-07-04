// 📁 src/features/journal/pages/JournalPage.tsx

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
import { formatDate, formatTime } from '@/utils/helpers';
import { Illustration } from '@/components/ui/Illustration';
// ✅ Importer les modals transformés en pages
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

  // ✅ Fonction pour obtenir le nom de l'aidant
  const getAidantName = (entry: any) => {
    if (entry.aidant?.user?.full_name) {
      return entry.aidant.user.full_name;
    }
    if (entry.aidant?.full_name) {
      return entry.aidant.full_name;
    }
    return 'Non assigné';
  };

  // ✅ Fonction pour obtenir le nom du patient
  const getPatientName = (entry: any) => {
    if (entry.patient) {
      return `${entry.patient.first_name} ${entry.patient.last_name}`;
    }
    return 'Patient';
  };

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
              <FileText size={12} />
              Journal
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              {getPageTitle()}
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {entries.length} visite(s) enregistrée(s)
            </p>
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewMode === 'timeline' ? 'text-white' : 'text-gray-600'
              }`}
              style={{
                background: viewMode === 'timeline' ? colors.primary : 'transparent',
              }}
            >
              <List size={12} />
              Liste
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewMode === 'weekly' ? 'text-white' : 'text-gray-600'
              }`}
              style={{
                background: viewMode === 'weekly' ? colors.primary : 'transparent',
              }}
            >
              <LayoutGrid size={12} />
              Semaine
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewMode === 'stats' ? 'text-white' : 'text-gray-600'
              }`}
              style={{
                background: viewMode === 'stats' ? colors.primary : 'transparent',
              }}
            >
              <BarChart3 size={12} />
              Stats
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

      {/* ✅ MODALS - Maintenant en plein écran via les wrappers */}
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
// JOURNAL ENTRY COMPACT
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
  onViewDetails 
}: JournalEntryCompactProps) => {
  const hasPhotos = entry.photos && entry.photos.length > 0;
  const hasAudio = entry.audio_url;
  const isRated = entry.rating !== null;

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-black/5 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              style={{ background: colors.primary }}
            >
              {entry.patient?.first_name?.[0] || 'P'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: colors.text }}>
                {getPatientName(entry)}
              </p>
              <p className="text-[9px] text-gray-400 flex items-center gap-1">
                <Calendar size={10} /> {formatDate(entry.date)} {entry.time}
              </p>
            </div>
          </div>

          {/* ✅ Affichage de l'aidant */}
          {entry.aidant && (
            <div className="mt-0.5 flex items-center gap-1">
              <User size={10} style={{ color: colors.text + '50' }} />
              <span className="text-[9px] text-gray-500">
                Aidant: <span className="font-medium">{getAidantName(entry)}</span>
              </span>
            </div>
          )}

          {entry.actions && entry.actions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-0.5">
              {entry.actions.slice(0, 3).map((action: string, index: number) => (
                <span
                  key={index}
                  className="px-1.5 py-0.5 rounded-full text-[8px] font-medium"
                  style={{ background: colors.primary + '12', color: colors.primary }}
                >
                  {action}
                </span>
              ))}
              {entry.actions.length > 3 && (
                <span className="text-[8px] text-gray-400">+{entry.actions.length - 3}</span>
              )}
            </div>
          )}

          <div className="mt-1 flex items-center gap-2">
            {hasPhotos && (
              <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                <Image size={10} /> {entry.photos.length}
              </span>
            )}
            {hasAudio && (
              <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                <Music size={10} /> Audio
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className="px-1.5 py-0.5 rounded-full text-[8px] font-bold flex items-center gap-0.5"
            style={{
              background: entry.status === 'validee' ? '#4CAF5015' : '#FF980015',
              color: entry.status === 'validee' ? '#4CAF50' : '#FF9800',
            }}
          >
            {entry.status === 'validee' ? (
              <>
                <CheckCircle size={8} />
                Validée
              </>
            ) : (
              <>
                <Clock size={8} />
                En attente
              </>
            )}
          </span>

          {isRated ? (
            <div className="flex items-center gap-0.5">
              <Star size={10} className="fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-bold">{entry.rating}</span>
            </div>
          ) : (
            entry.status === 'validee' && (
              <button
                onClick={onRate}
                className="text-[9px] font-medium hover:underline"
                style={{ color: colors.primary }}
              >
                Noter
              </button>
            )
          )}

          <button
            onClick={onViewDetails}
            className="text-[9px] font-medium hover:underline flex items-center gap-0.5"
            style={{ color: colors.primary }}
          >
            Détails
            <ChevronRight size={10} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default JournalPage;
