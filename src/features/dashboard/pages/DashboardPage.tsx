// 📁 src/features/dashboard/pages/DashboardPage.tsx
// 📌 Page d'accueil - Tableau de bord

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

  // ✅ Jargon dynamique selon le rôle
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

  const {
    patients,
    fetchPatients,
    isLoading: patientsLoading,
  } = usePatientStore();

  const {
    visits,
    fetchVisits,
    isLoading: visitsLoading,
  } = useVisitStore();

  const {
    orders,
    fetchOrders,
    isLoading: ordersLoading,
  } = useOrderStore();

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

  // Vérifier si un proche est de type Maman & Bébé
  useEffect(() => {
    const hasMamanPatient = patients.some((p) => p.category === 'maman_bebe');
    setIsMaman(hasMamanPatient);
  }, [patients]);

  // 📌 Statistiques du tableau de bord - Statuts simplifiés
  const stats = {
    proches: patients.length,
    upcomingVisits: visits.filter((v) => v.status === 'planifiee').length,
    // ✅ creee ou en_cours = commande en attente
    pendingOrders: orders.filter(
      (o) => o.status === 'creee' || o.status === 'en_cours'
    ).length,
    // ✅ terminee ou validee = visite terminée
    completedVisits: visits.filter(
      (v) => v.status === 'terminee' || v.status === 'validee'
    ).length,
  };

  // Dernières visites
  const recentVisits = visits
    .filter((v) => v.status === 'planifiee' || v.status === 'en_cours')
    .sort(
      (a, b) =>
        new Date(a.scheduled_date).getTime() -
        new Date(b.scheduled_date).getTime()
    )
    .slice(0, 3);

  // Dernières commandes
  const recentOrders = orders
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 3);

  const isLoading = patientsLoading || visitsLoading || ordersLoading;

  const heroImage = isMaman
    ? '/assets/images/banners/maman-banner.png'
    : '/assets/images/banners/senior-banner.png';

  // ✅ Libellés dynamiques pour les actions rapides
  const getQuickActions = () => {
    const actions = [
      {
        icon: <Users size={20} />,
        label: isFamily ? 'Proches' : isAidant ? 'Personnes accompagnées' : 'Bénéficiaires',
        description: isFamily ? 'Voir les personnes suivies' : isAidant ? 'Voir les personnes accompagnées' : 'Voir les bénéficiaires',
        color: colors.primary,
        action: () => navigate('/app/patients'),
      },
      {
        icon: <Calendar size={20} />,
        label: 'Visites',
        description: 'Suivre les passages',
        color: colors.accent,
        action: () => navigate('/app/visits'),
      },
      {
        icon: <ShoppingBag size={20} />,
        label: 'Commande',
        description: 'Créer une demande',
        color: colors.secondary,
        action: () => navigate('/app/orders/create'),
      },
      {
        icon: <MessageCircle size={20} />,
        label: 'Messages',
        description: 'Contacter l’équipe',
        color: colors.primary,
        action: () => navigate('/app/messages'),
      },
    ];

    // Pour les administrateurs, ajouter un accès rapide à l'admin
    if (isAdminOrCoordinator) {
      actions.push({
        icon: <Users size={20} />,
        label: 'Admin',
        description: 'Tableau de bord admin',
        color: '#9C27B0',
        action: () => navigate('/app/admin'),
      });
    }

    return actions;
  };

  const quickActions = getQuickActions();

  // ✅ Libellés dynamiques pour le hero
  const getHeroTitle = () => {
    if (isMaman) return 'Votre espace maman & bébé.';
    if (isFamily) return 'Un suivi clair pour votre proche.';
    if (isAidant) return 'Vos missions en un coup d\'œil.';
    if (isAdminOrCoordinator) return 'Vue d\'ensemble de la plateforme.';
    return 'Bienvenue sur Santé Plus Services.';
  };

  const getHeroDescription = () => {
    if (isMaman) {
      return 'Visites, messages et commandes réunis dans un espace simple.';
    }
    if (isFamily) {
      return 'Gardez une vue rapide sur les visites, commandes et messages importants.';
    }
    if (isAidant) {
      return 'Retrouvez vos missions, livraisons et communications en un seul endroit.';
    }
    if (isAdminOrCoordinator) {
      return 'Supervisez l\'ensemble des activités de la plateforme.';
    }
    return 'Gérez vos accompagnements en toute simplicité.';
  };

  // ✅ Libellés dynamiques pour les sections
  const getProchesTitle = () => {
    if (isFamily) return 'Mes proches';
    if (isAidant) return 'Mes personnes accompagnées';
    if (isAdminOrCoordinator) return 'Bénéficiaires suivis';
    return 'Personnes suivies';
  };

  const getProchesSubtitle = () => {
    if (isFamily) return 'Les personnes actuellement accompagnées';
    if (isAidant) return 'Les personnes que vous accompagnez';
    if (isAdminOrCoordinator) return 'Tous les bénéficiaires de la plateforme';
    return 'Personnes accompagnées';
  };

  const getEmptyMessage = () => {
    if (isFamily) {
      return 'Ajoutez une personne à accompagner pour commencer le suivi.';
    }
    if (isAidant) {
      return 'Les personnes à accompagner vous seront assignées prochainement.';
    }
    if (isAdminOrCoordinator) {
      return 'Aucun bénéficiaire enregistré pour le moment.';
    }
    return 'Commencez à suivre des personnes.';
  };

  if (isLoading) {
    return (
      <div className="space-y-5 pb-8">
        <div className="h-40 rounded-[1.75rem] bg-white/70 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white rounded-3xl shadow-sm animate-pulse" />
          ))}
        </div>
        <div className="h-40 bg-white rounded-3xl shadow-sm animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* HERO - Bannière avec image dynamique */}
      <section
        className="relative overflow-hidden rounded-[1.75rem] min-h-[170px] md:min-h-[185px] shadow-sm border border-black/5"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.62) 42%, rgba(0,0,0,0.18) 100%),
            url('${heroImage}')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/10" />

        <div
          className="absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl opacity-30"
          style={{ background: colors.secondary }}
        />

        <div className="relative z-10 min-h-[170px] md:min-h-[185px] p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/18 border border-white/25 backdrop-blur-md px-3 py-1.5 text-white text-xs font-semibold">
              <Sparkles size={14} />
              Santé Plus Services
            </div>
          </div>

          <div className="max-w-xl">
            <p className="text-white text-sm mb-1.5 font-medium drop-shadow">
              {greeting}, {profile?.full_name || 'Bienvenue'} 👋
            </p>

            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight drop-shadow">
              {getHeroTitle()}
            </h1>

            <p className="text-white mt-2 text-sm max-w-lg leading-relaxed drop-shadow-sm">
              {getHeroDescription()}
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => navigate('/app/visits')}
                className="inline-flex items-center gap-2 bg-white text-sm font-bold px-4 py-2.5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition"
                style={{ color: colors.primary }}
              >
                Voir les visites
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => navigate('/app/messages')}
                className="inline-flex items-center gap-2 bg-white/18 text-white border border-white/25 backdrop-blur-md text-sm font-bold px-4 py-2.5 rounded-2xl hover:bg-white/25 transition"
              >
                Messages
                <MessageCircle size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MESSAGE - Compte sans proche / personne accompagnée */}
      {(isFamily || isAidant) && patients.length === 0 && (
        <section
          className="bg-white rounded-[1.5rem] p-5 border shadow-sm"
          style={{ borderColor: colors.primary + '18' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <User size={24} />
            </div>

            <div className="flex-1 min-w-0">
              <h3
                className="font-black text-lg"
                style={{ color: colors.text }}
              >
                Bienvenue {profile?.full_name || ''} 👋
              </h3>

              <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
                {isFamily 
                  ? 'Vous avez créé un compte sans proche. Ajoutez une personne à accompagner ou consultez les offres disponibles pour commencer.'
                  : 'Vous avez créé un compte aidant. Les personnes à accompagner vous seront assignées prochainement.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            {isFamily && (
              <button
                onClick={() => navigate('/app/patients')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90"
                style={{ background: colors.primary }}
              >
                <Plus size={16} />
                {add}
              </button>
            )}

            <button
              onClick={() => navigate('/app/billing')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition hover:bg-gray-50"
              style={{
                borderColor: colors.border || '#e5e0d8',
                color: colors.text,
              }}
            >
              Voir les offres
            </button>
          </div>
        </section>
      )}

      {/* STATISTIQUES */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ModernStatCard
          title={isFamily ? 'Proches' : isAidant ? 'Personnes accompagnées' : 'Bénéficiaires'}
          value={stats.proches}
          icon={<Users size={20} />}
          color={colors.primary}
          onClick={() => navigate('/app/patients')}
        />

        <ModernStatCard
          title="Visites à venir"
          value={stats.upcomingVisits}
          icon={<Calendar size={20} />}
          color={colors.accent}
          onClick={() => navigate('/app/visits')}
        />

        <ModernStatCard
          title="Commandes"
          value={stats.pendingOrders}
          icon={<ShoppingBag size={20} />}
          color={colors.secondary}
          onClick={() => navigate('/app/orders')}
        />

        <ModernStatCard
          title="Terminées"
          value={stats.completedVisits}
          icon={<CheckCircle size={20} />}
          color={colors.primary}
          onClick={() => navigate('/app/visits')}
        />
      </section>

      {/* ACTIONS RAPIDES */}
      <section className="bg-white rounded-[1.75rem] p-5 shadow-sm border border-black/5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2
              className="text-lg font-black tracking-tight"
              style={{ color: colors.text }}
            >
              Actions rapides
            </h2>

            <p className="text-sm" style={{ color: colors.text + '70' }}>
              Les raccourcis utiles de votre espace.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="group text-left rounded-3xl p-4 border border-black/5 hover:shadow-md hover:-translate-y-0.5 transition-all"
              style={{ background: action.color + '06' }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform"
                style={{
                  background: action.color + '16',
                  color: action.color,
                }}
              >
                {action.icon}
              </div>

              <h3
                className="font-black text-sm md:text-base"
                style={{ color: colors.text }}
              >
                {action.label}
              </h3>

              <p className="text-xs mt-1 leading-snug text-gray-500">
                {action.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* PROCHES / PERSONNES ACCOMPAGNÉES */}
      {patients.length > 0 && (
        <ModernSection
          title={getProchesTitle()}
          subtitle={getProchesSubtitle()}
          actionLabel="Voir tout"
          onAction={() => navigate('/app/patients')}
          color={colors.primary}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patients.slice(0, 2).map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onClick={() => navigate(`/app/patients/${patient.id}`)}
              />
            ))}
          </div>
        </ModernSection>
      )}

      {/* VISITES */}
      <ModernSection
        title="Prochaines visites"
        subtitle="Les passages prévus ou en cours"
        actionLabel="Voir tout"
        onAction={() => navigate('/app/visits')}
        color={colors.primary}
      >
        {recentVisits.length > 0 ? (
          <div className="space-y-3">
            {recentVisits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                compact
                onClick={() => navigate(`/app/visits/${visit.id}`)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Calendar size={38} />}
            title="Aucune visite planifiée"
            text="Consultez ou planifiez une visite depuis l’espace visites."
            button="Planifier une visite"
            onClick={() => navigate('/app/visits')}
            color={colors.primary}
          />
        )}
      </ModernSection>

      {/* COMMANDES */}
      <ModernSection
        title="Commandes récentes"
        subtitle="Les dernières demandes enregistrées"
        actionLabel="Voir tout"
        onAction={() => navigate('/app/orders')}
        color={colors.primary}
      >
        {recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                compact
                onClick={() => navigate(`/app/orders/${order.id}`)}
                onView={() => navigate(`/app/orders/${order.id}`)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ShoppingBag size={38} />}
            title="Aucune commande récente"
            text="Créez une commande pour médicaments, produits ou besoins à domicile."
            button="Faire une commande"
            onClick={() => navigate('/app/orders/create')}
            color={colors.primary}
          />
        )}
      </ModernSection>

      {/* MESSAGE FINAL */}
      <section
        className="relative overflow-hidden rounded-[1.75rem] p-6 text-center border"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}10, ${colors.secondary}18)`,
          borderColor: colors.primary + '14',
        }}
      >
        <div
          className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3"
          style={{ background: colors.primary + '12', color: colors.primary }}
        >
          {isMaman ? <Heart size={26} /> : <Home size={26} />}
        </div>

        <h3
          className="text-lg font-black"
          style={{ color: colors.text }}
        >
          {isMaman
            ? 'Un espace doux pour suivre maman et bébé'
            : isAidant
              ? 'Un espace pour accompagner en toute confiance'
              : isAdminOrCoordinator
                ? 'Une vue complète pour une gestion optimale'
                : 'Un espace pour rester proche, même à distance'}
        </h3>

        <p
          className="text-sm mt-2 max-w-xl mx-auto leading-relaxed"
          style={{ color: colors.text + '80' }}
        >
          {isMaman
            ? 'Santé Plus vous aide à garder une vision claire de votre accompagnement.'
            : isAidant
              ? 'Santé Plus vous donne les outils pour accompagner au mieux les personnes que vous suivez.'
              : isAdminOrCoordinator
                ? 'Santé Plus vous offre une vision complète de l\'activité de la plateforme.'
                : 'Santé Plus rend le suivi plus humain, plus clair et plus rassurant.'}
        </p>
      </section>
    </div>
  );
};

// =============================================
// COMPOSANTS
// =============================================

interface ModernStatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

const ModernStatCard = ({
  title,
  value,
  icon,
  color,
  onClick,
}: ModernStatCardProps) => {
  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-[1.5rem] p-4 text-left shadow-sm border border-black/5 hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs md:text-sm font-semibold text-gray-500">
            {title}
          </p>
          <p className="text-2xl md:text-3xl font-black mt-2" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform"
          style={{ background: color + '14', color }}
        >
          {icon}
        </div>
      </div>
    </button>
  );
};

interface ModernSectionProps {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  color: string;
  children: React.ReactNode;
}

const ModernSection = ({
  title,
  subtitle,
  actionLabel,
  onAction,
  color,
  children,
}: ModernSectionProps) => {
  return (
    <section className="bg-white rounded-[1.75rem] p-5 md:p-6 shadow-sm border border-black/5">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg md:text-xl font-black tracking-tight text-gray-900">
            {title}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <button
          onClick={onAction}
          className="shrink-0 inline-flex items-center gap-1 text-sm font-bold hover:gap-2 transition-all"
          style={{ color }}
        >
          {actionLabel}
          <ArrowRight size={16} />
        </button>
      </div>
      {children}
    </section>
  );
};

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  text: string;
  button: string;
  onClick: () => void;
  color: string;
}

const EmptyState = ({
  icon,
  title,
  text,
  button,
  onClick,
  color,
}: EmptyStateProps) => {
  return (
    <div className="text-center py-8 px-4 rounded-[1.5rem] bg-gray-50">
      <div
        className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
        style={{ background: color + '12', color }}
      >
        {icon}
      </div>

      <h3 className="font-black text-gray-900">{title}</h3>

      <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
        {text}
      </p>

      <button
        onClick={onClick}
        className="mt-4 inline-flex items-center gap-2 text-white px-4 py-2.5 rounded-2xl text-sm font-bold hover:opacity-90 transition"
        style={{ background: color }}
      >
        {button}
        <ArrowRight size={16} />
      </button>
    </div>
  );
};

export default DashboardPage;