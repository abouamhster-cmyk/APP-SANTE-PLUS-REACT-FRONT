// 📁 src/features/journal/pages/JournalPage.tsx
// 📌 Journal de bord - Historique des visites

import { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  Star,
  StarHalf,
  User,
  Phone,
  MapPin,
  Image,
  Music,
  FileText,
  TrendingUp,
  Award,
  Heart,
  MessageCircle,
  ThumbsUp,
} from 'lucide-react';
import { useJournalStore } from '@/stores/journalStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime } from '@/utils/helpers';
import { RatingModal } from '../components/RatingModal';
import { VisitDetailsModal } from '../components/VisitDetailsModal';
import toast from 'react-hot-toast';

const JournalPage = () => {
  const { profile, role } = useAuthStore();
  
  // ✅ Jargon dynamique selon le rôle
  const {
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    plural,          // "proches" / "personnes accompagnées" / "bénéficiaires"
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
        <div className="h-40 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-2xl animate-pulse" />
      </div>
    );
  }

  // ✅ Titre dynamique selon le rôle
  const getPageTitle = () => {
    if (isFamily) return 'Journal de bord de mes proches';
    if (isAidant) return 'Journal de bord des personnes accompagnées';
    if (isAdminOrCoordinator) return 'Journal de bord des bénéficiaires';
    return 'Journal de bord';
  };

  // ✅ Description dynamique selon le rôle
  const getPageDescription = () => {
    if (isFamily) return 'Suivez l\'historique des visites de vos proches';
    if (isAidant) return 'Suivez l\'historique des visites des personnes que vous accompagnez';
    if (isAdminOrCoordinator) return 'Suivez l\'historique des visites de tous les bénéficiaires';
    return 'Suivez l\'historique des visites';
  };

  // ✅ Libellé dynamique pour les stats
  const getStatLabels = () => {
    return {
      validated: 'Visites validées',
      pending: 'En attente',
      average: 'Note moyenne',
      aidants: 'Aidants différents',
    };
  };

  const statLabels = getStatLabels();

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black" style={{ color: colors.text }}>
              📋 {getPageTitle()}
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
              {getPageDescription()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                viewMode === 'timeline' ? 'text-white' : 'text-gray-600'
              }`}
              style={{
                background: viewMode === 'timeline' ? colors.primary : 'transparent',
              }}
            >
              📅 Chronologie
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                viewMode === 'weekly' ? 'text-white' : 'text-gray-600'
              }`}
              style={{
                background: viewMode === 'weekly' ? colors.primary : 'transparent',
              }}
            >
              📆 Par semaine
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                viewMode === 'stats' ? 'text-white' : 'text-gray-600'
              }`}
              style={{
                background: viewMode === 'stats' ? colors.primary : 'transparent',
              }}
            >
              📊 Statistiques
            </button>
          </div>
        </div>
      </section>

      {/* Statistiques */}
      {stats && viewMode === 'stats' && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<CheckCircle size={20} />}
            label={statLabels.validated}
            value={stats.validated_visits}
            color={colors.primary}
          />
          <StatCard
            icon={<Clock size={20} />}
            label={statLabels.pending}
            value={stats.pending_visits}
            color="#FF9800"
          />
          <StatCard
            icon={<Star size={20} />}
            label={statLabels.average}
            value={stats.average_rating.toFixed(1)}
            color="#FFD700"
          />
          <StatCard
            icon={<User size={20} />}
            label={statLabels.aidants}
            value={stats.total_aidants}
            color="#2196F3"
          />
        </section>
      )}

      {/* Graphique des actions (stats) */}
      {viewMode === 'stats' && stats && stats.actions_frequency.length > 0 && (
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
          <h3 className="font-bold mb-4" style={{ color: colors.text }}>
            📊 Actions les plus fréquentes
          </h3>
          <div className="space-y-2">
            {stats.actions_frequency.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-sm w-32 truncate" style={{ color: colors.text }}>
                  {item.action}
                </span>
                <div className="flex-1 h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(item.count / stats.actions_frequency[0].count) * 100}%`,
                      background: colors.primary,
                    }}
                  />
                </div>
                <span className="text-sm font-bold" style={{ color: colors.text }}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      {viewMode === 'timeline' && (
        <section className="space-y-4">
          {entries.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-black/5">
              <Calendar size={48} className="mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-bold" style={{ color: colors.text }}>
                Aucune visite pour le moment
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Les visites apparaîtront ici une fois validées.
              </p>
            </div>
          ) : (
            entries.map((entry) => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                colors={colors}
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

      {/* Vue par semaine */}
      {viewMode === 'weekly' && (
        <section className="space-y-6">
          {weeklyEntries.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-black/5">
              <Calendar size={48} className="mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-bold" style={{ color: colors.text }}>
                Aucune visite
              </h3>
            </div>
          ) : (
            weeklyEntries.map(({ week, entries: weekEntries }) => (
              <div key={week} className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
                <h3 className="font-bold mb-4" style={{ color: colors.text }}>
                  📅 Semaine {week.split('-W')[1]} - {weekEntries.length} visite{weekEntries.length > 1 ? 's' : ''}
                </h3>
                <div className="space-y-3">
                  {weekEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => {
                        setSelectedVisit(entry);
                        setShowDetailsModal(true);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: entry.status === 'validee' ? '#4CAF50' : '#FF9800',
                          }}
                        />
                        <div>
                          <p className="font-medium" style={{ color: colors.text }}>
                            {entry.patient?.first_name} {entry.patient?.last_name}
                          </p>
                          <p className="text-xs" style={{ color: colors.text + '50' }}>
                            {formatDate(entry.date)} à {entry.time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {entry.rating !== null && (
                          <div className="flex items-center gap-1">
                            <Star size={14} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-bold">{entry.rating}</span>
                          </div>
                        )}
                        <span
                          className="px-2 py-1 rounded-full text-xs font-bold"
                          style={{
                            background: entry.status === 'validee' ? '#4CAF5015' : '#FF980015',
                            color: entry.status === 'validee' ? '#4CAF50' : '#FF9800',
                          }}
                        >
                          {entry.status === 'validee' ? '✅ Validée' : '⏳ En attente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* Modals */}
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
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '15', color }}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-black" style={{ color }}>{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
};

// =============================================
// JOURNAL ENTRY CARD
// =============================================

interface JournalEntryCardProps {
  entry: any;
  colors: any;
  onRate: () => void;
  onViewDetails: () => void;
}

const JournalEntryCard = ({ entry, colors, onRate, onViewDetails }: JournalEntryCardProps) => {
  const hasPhotos = entry.photos && entry.photos.length > 0;
  const hasAudio = entry.audio_url;
  const isRated = entry.rating !== null;

  // ✅ Libellé dynamique pour le rôle de l'aidant
  const getAidantLabel = () => {
    return entry.aidant?.user?.full_name || 'Aidant';
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 hover:shadow-md transition">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
          {/* En-tête */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: colors.primary }}
            >
              {entry.patient?.first_name?.[0] || 'P'}
            </div>
            <div>
              <h3 className="font-bold" style={{ color: colors.text }}>
                {entry.patient?.first_name} {entry.patient?.last_name}
              </h3>
              <div className="flex items-center gap-2 text-xs" style={{ color: colors.text + '50' }}>
                <span>{formatDate(entry.date)}</span>
                <span>•</span>
                <span>{entry.time}</span>
                {entry.aidant && (
                  <>
                    <span>•</span>
                    <span>🧑‍⚕️ {getAidantLabel()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          {entry.actions && entry.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {entry.actions.map((action: string, index: number) => (
                <span
                  key={index}
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: colors.primary + '12', color: colors.primary }}
                >
                  {action}
                </span>
              ))}
            </div>
          )}

          {/* Notes */}
          {entry.notes && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: colors.primary + '05' }}>
              <p className="text-sm" style={{ color: colors.text + '80' }}>
                {entry.notes}
              </p>
            </div>
          )}

          {/* Médias */}
          <div className="mt-3 flex gap-3">
            {hasPhotos && (
              <div className="flex items-center gap-1 text-xs" style={{ color: colors.text + '50' }}>
                <Image size={14} />
                <span>{entry.photos.length} photo{entry.photos.length > 1 ? 's' : ''}</span>
              </div>
            )}
            {hasAudio && (
              <div className="flex items-center gap-1 text-xs" style={{ color: colors.text + '50' }}>
                <Music size={14} />
                <span>Audio</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2">
          {/* Statut */}
          <span
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{
              background: entry.status === 'validee' ? '#4CAF5015' : '#FF980015',
              color: entry.status === 'validee' ? '#4CAF50' : '#FF9800',
            }}
          >
            {entry.status === 'validee' ? '✅ Validée' : '⏳ En attente'}
          </span>

          {/* Rating */}
          {isRated ? (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  className={star <= entry.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                />
              ))}
              <span className="text-sm font-bold ml-1" style={{ color: colors.text }}>
                {entry.rating}/5
              </span>
            </div>
          ) : (
            entry.status === 'validee' && (
              <button
                onClick={onRate}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold transition hover:opacity-80"
                style={{ background: colors.primary + '15', color: colors.primary }}
              >
                <Star size={14} />
                Noter
              </button>
            )
          )}

          <button
            onClick={onViewDetails}
            className="text-sm font-medium hover:underline"
            style={{ color: colors.primary }}
          >
            Voir les détails
          </button>
        </div>
      </div>
    </div>
  );
};

export default JournalPage;