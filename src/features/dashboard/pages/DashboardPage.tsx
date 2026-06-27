// 📁 src/features/dashboard/pages/DashboardPage.tsx
 
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  ShoppingBag,
  MessageCircle,
  CheckCircle,
  Heart,
  Home,
  User,
  ArrowRight,
  Sparkles,
  Plus,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { getGreeting } from '@/utils/helpers';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';

import { VisitCard } from '@/components/visits/VisitCard';
import { OrderCard } from '@/components/orders/OrderCard';
import { PatientCard } from '@/components/patients/PatientCard';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();

  const {
    singular,
    plural,
    list,
    add,
    emoji,
    getCountLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const { patients, fetchPatients, isLoading: patientsLoading } = usePatientStore();
  const { visits, fetchVisits, isLoading: visitsLoading } = useVisitStore();
  const { orders, fetchOrders, isLoading: ordersLoading } = useOrderStore();

  const [greeting, setGreeting] = useState('');
  const [isMaman, setIsMaman] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchPatients();
    fetchVisits();
    fetchOrders();
    setGreeting(getGreeting());
  }, []);

  useEffect(() => {
    const hasMamanPatient = patients.some((p) => p.category === 'maman_bebe');
    setIsMaman(hasMamanPatient);
  }, [patients]);

  const stats = {
    proches: patients.length,
    upcomingVisits: visits.filter((v) => v.status === 'planifiee').length,
    pendingOrders: orders.filter((o) => o.status === 'creee' || o.status === 'en_cours').length,
    completedVisits: visits.filter((v) => v.status === 'terminee' || v.status === 'validee').length,
  };

  const recentVisits = visits
    .filter((v) => v.status === 'planifiee' || v.status === 'en_cours')
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .slice(0, 3);

  const recentOrders = orders
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  const isLoading = patientsLoading || visitsLoading || ordersLoading;

  const heroImage = isMaman
    ? '/assets/images/banners/maman-banner.png'
    : '/assets/images/banners/senior-banner.png';

  const getQuickActions = () => {
    const actions = [
      {
        icon: <Users size={18} />,
        label: isFamily ? 'Proches' : isAidant ? 'Personnes' : 'Bénéficiaires',
        color: colors.primary,
        action: () => navigate('/app/patients'),
      },
      {
        icon: <Calendar size={18} />,
        label: 'Visites',
        color: colors.accent,
        action: () => navigate('/app/visits'),
      },
      {
        icon: <ShoppingBag size={18} />,
        label: 'Commande',
        color: colors.secondary,
        action: () => navigate('/app/orders/create'),
      },
      {
        icon: <MessageCircle size={18} />,
        label: 'Messages',
        color: colors.primary,
        action: () => navigate('/app/messages'),
      },
    ];

    if (isAdminOrCoordinator) {
      actions.push({
        icon: <Users size={18} />,
        label: 'Admin',
        color: '#9C27B0',
        action: () => navigate('/app/admin'),
      });
    }

    return actions;
  };

  const quickActions = getQuickActions();

  const getHeroTitle = () => {
    if (isMaman) return 'Votre espace maman & bébé.';
    if (isFamily) return 'Un suivi clair pour votre proche.';
    if (isAidant) return 'Vos missions en un coup d\'œil.';
    if (isAdminOrCoordinator) return 'Vue d\'ensemble de la plateforme.';
    return 'Bienvenue sur Santé Plus Services.';
  };

  const getHeroDescription = () => {
    if (isMaman) return 'Visites, messages et commandes réunis.';
    if (isFamily) return 'Gardez une vue rapide sur les visites et commandes.';
    if (isAidant) return 'Retrouvez vos missions et livraisons.';
    if (isAdminOrCoordinator) return 'Supervisez l\'ensemble des activités.';
    return 'Gérez vos accompagnements en toute simplicité.';
  };

  const getProchesTitle = () => {
    if (isFamily) return 'Mes proches';
    if (isAidant) return 'Mes personnes accompagnées';
    if (isAdminOrCoordinator) return 'Bénéficiaires suivis';
    return 'Personnes suivies';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-white/70 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-32 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 sm:pb-10">
      {/* HERO */}
      <section
        className="relative overflow-hidden rounded-2xl min-h-[140px] shadow-sm border border-black/5"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.55) 42%, rgba(0,0,0,0.15) 100%),
            url('${heroImage}')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative z-10 min-h-[140px] p-4 flex flex-col justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/18 border border-white/25 backdrop-blur-md px-3 py-1 text-white text-xs font-semibold w-fit">
            <Sparkles size={12} />
            Santé Plus Services
          </div>

          <div>
            <p className="text-white text-xs font-medium drop-shadow">
              {greeting}, {profile?.full_name || 'Bienvenue'} 👋
            </p>
            <h1 className="text-xl font-black text-white tracking-tight drop-shadow">
              {getHeroTitle()}
            </h1>
            <p className="text-white text-xs mt-1 drop-shadow-sm">
              {getHeroDescription()}
            </p>
          </div>
        </div>
      </section>

      {/* STATS COMPACTES */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <CompactDashCard
          title={isFamily ? 'Proches' : isAidant ? 'Personnes' : 'Bénéficiaires'}
          value={stats.proches}
          icon={<Users size={16} />}
          color={colors.primary}
          onClick={() => navigate('/app/patients')}
        />
        <CompactDashCard
          title="Visites à venir"
          value={stats.upcomingVisits}
          icon={<Calendar size={16} />}
          color={colors.accent}
          onClick={() => navigate('/app/visits')}
        />
        <CompactDashCard
          title="Commandes"
          value={stats.pendingOrders}
          icon={<ShoppingBag size={16} />}
          color={colors.secondary}
          onClick={() => navigate('/app/orders')}
        />
        <CompactDashCard
          title="Terminées"
          value={stats.completedVisits}
          icon={<CheckCircle size={16} />}
          color={colors.primary}
          onClick={() => navigate('/app/visits')}
        />
      </section>

      {/* ACTIONS RAPIDES */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
        <div className="grid grid-cols-4 gap-2">
          {quickActions.slice(0, 4).map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-gray-50 transition"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: action.color + '15', color: action.color }}
              >
                {action.icon}
              </div>
              <span className="text-[10px] font-medium mt-1 text-center" style={{ color: colors.text }}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* PROCHES */}
      {patients.length > 0 && (
        <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold" style={{ color: colors.text }}>
              {getProchesTitle()}
            </h2>
            <button
              onClick={() => navigate('/app/patients')}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: colors.primary }}
            >
              Voir tout <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {patients.slice(0, 2).map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                compact
                onClick={() => navigate(`/app/patients/${patient.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* VISITES */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold" style={{ color: colors.text }}>
            Prochaines visites
          </h2>
          <button
            onClick={() => navigate('/app/visits')}
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: colors.primary }}
          >
            Voir tout <ArrowRight size={12} />
          </button>
        </div>
        {recentVisits.length > 0 ? (
          <div className="space-y-2">
            {recentVisits.map((visit) => (
              <VisitCard key={visit.id} visit={visit} compact onClick={() => navigate(`/app/visits/${visit.id}`)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <Calendar size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs text-gray-400">Aucune visite planifiée</p>
          </div>
        )}
      </section>

      {/* COMMANDES */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold" style={{ color: colors.text }}>
            Commandes récentes
          </h2>
          <button
            onClick={() => navigate('/app/orders')}
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: colors.primary }}
          >
            Voir tout <ArrowRight size={12} />
          </button>
        </div>
        {recentOrders.length > 0 ? (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <OrderCard key={order.id} order={order} compact onClick={() => navigate(`/app/orders/${order.id}`)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <ShoppingBag size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs text-gray-400">Aucune commande récente</p>
          </div>
        )}
      </section>

      {/* BANNER FINAL */}
      <section
        className="rounded-2xl p-4 text-center border"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}10, ${colors.secondary}18)`,
          borderColor: colors.primary + '14',
        }}
      >
        <div
          className="w-10 h-10 rounded-2xl mx-auto flex items-center justify-center mb-2"
          style={{ background: colors.primary + '12', color: colors.primary }}
        >
          {isMaman ? <Heart size={22} /> : <Home size={22} />}
        </div>
        <h3 className="text-sm font-bold" style={{ color: colors.text }}>
          {isMaman
            ? 'Un espace doux pour suivre maman et bébé'
            : isAidant
              ? 'Un espace pour accompagner en toute confiance'
              : 'Un espace pour rester proche, même à distance'}
        </h3>
        <p className="text-xs mt-1" style={{ color: colors.text + '70' }}>
          Santé Plus rend le suivi plus humain, plus clair et plus rassurant.
        </p>
      </section>
    </div>
  );
};

// =============================================
// COMPACT DASH CARD
// =============================================

interface CompactDashCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

const CompactDashCard = ({ title, value, icon, color, onClick }: CompactDashCardProps) => {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl p-2.5 shadow-sm border border-black/5 hover:shadow-md transition text-left w-full"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-gray-400">
            {title}
          </p>
          <p className="text-lg font-bold mt-0.5" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: color + '14', color }}
        >
          {icon}
        </div>
      </div>
    </button>
  );
};

export default DashboardPage;
