// 📁 src/features/education/pages/EducationPage.tsx
// 📌 Espace éducatif - Contenu informatif selon le rôle

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Heart, Baby, Brain, Moon, Apple, 
  Activity, Shield, Smile, Sparkles, ChevronRight,
  Clock, Users, Home, Coffee
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const EducationPage = () => {
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();
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

  const [isValidated, setIsValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'maman' | 'senior' | 'general'>('general');

  useEffect(() => {
    checkValidation();
  }, [user]);

  const checkValidation = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('inscriptions')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Check validation error:', error);
      }

      if (data?.status === 'validee' || isAdminOrCoordinator) {
        setIsValidated(true);
      } else {
        const { data: subscription } = await supabase
          .from('abonnements')
          .select('status')
          .eq('user_id', user.id)
          .eq('status', 'actif')
          .limit(1)
          .single();

        if (subscription) {
          setIsValidated(true);
        }
      }
    } catch (error) {
      console.error('Check validation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRestrictedMessage = () => {
    if (isFamily) {
      return 'L\'accès à la bibliothèque éducative est disponible après validation de votre inscription.';
    }
    if (isAidant) {
      return 'L\'accès à la bibliothèque éducative est disponible après validation de votre compte aidant.';
    }
    return 'L\'accès à la bibliothèque éducative est disponible après validation de votre inscription.';
  };

  const getPageTitle = () => {
    if (isFamily) return '📚 Espace éducatif - Proches';
    if (isAidant) return '📚 Espace éducatif - Aidant';
    if (isAdminOrCoordinator) return '📚 Espace éducatif - Administration';
    return '📚 Espace éducatif';
  };

  const getPageDescription = () => {
    if (isFamily) {
      return 'Des conseils et informations pour mieux accompagner vos proches au quotidien.';
    }
    if (isAidant) {
      return 'Des conseils et informations pour mieux accompagner les personnes que vous suivez.';
    }
    if (isAdminOrCoordinator) {
      return 'Des conseils et informations pour mieux comprendre les besoins des bénéficiaires.';
    }
    return 'Des conseils et informations pour vous accompagner au quotidien.';
  };

  // Contenu éducatif par catégorie
  const content = {
    maman: {
      title: 'Accompagnement Maman & Bébé',
      icon: <Baby size={28} />,
      articles: [
        {
          title: 'Le retour à la maison après l\'accouchement',
          description: 'Conseils pour une transition en douceur',
          icon: <Home size={24} />,
          readTime: '5 min',
          category: 'post-partum',
        },
        {
          title: 'Le sommeil du nouveau-né',
          description: 'Comprendre et accompagner le sommeil de bébé',
          icon: <Moon size={24} />,
          readTime: '4 min',
          category: 'sommeil',
        },
        {
          title: 'L\'allaitement maternel',
          description: 'Conseils pratiques pour bien débuter',
          icon: <Heart size={24} />,
          readTime: '6 min',
          category: 'allaitement',
        },
        {
          title: 'La fatigue post-partum',
          description: 'Reconnaître et gérer la fatigue',
          icon: <Coffee size={24} />,
          readTime: '3 min',
          category: 'bien-etre',
        },
        {
          title: 'Les signes à surveiller chez bébé',
          description: 'Savoir reconnaître les signes d\'alerte',
          icon: <Shield size={24} />,
          readTime: '5 min',
          category: 'sante',
        },
        {
          title: 'Le développement du bébé mois par mois',
          description: 'Les étapes clés des premiers mois',
          icon: <Activity size={24} />,
          readTime: '7 min',
          category: 'developpement',
        },
      ],
    },
    senior: {
      title: 'Accompagnement Senior',
      icon: <Heart size={28} />,
      articles: [
        {
          title: 'Le bien-être au quotidien',
          description: 'Conseils pour une vie saine et équilibrée',
          icon: <Smile size={24} />,
          readTime: '4 min',
          category: 'bien-etre',
        },
        {
          title: 'L\'importance de la socialisation',
          description: 'Rester connecté et actif',
          icon: <Users size={24} />,
          readTime: '3 min',
          category: 'social',
        },
        {
          title: 'La gestion des médicaments',
          description: 'Conseils pour un suivi efficace',
          icon: <Activity size={24} />,
          readTime: '5 min',
          category: 'sante',
        },
        {
          title: 'L\'alimentation équilibrée',
          description: 'Les bons réflexes au quotidien',
          icon: <Apple size={24} />,
          readTime: '4 min',
          category: 'alimentation',
        },
        {
          title: 'Le sommeil chez la personne âgée',
          description: 'Comprendre et améliorer le sommeil',
          icon: <Moon size={24} />,
          readTime: '3 min',
          category: 'sommeil',
        },
        {
          title: 'La prévention des chutes',
          description: 'Conseils pour éviter les chutes',
          icon: <Shield size={24} />,
          readTime: '5 min',
          category: 'securite',
        },
      ],
    },
    general: {
      title: 'Conseils généraux',
      icon: <BookOpen size={28} />,
      articles: [
        {
          title: 'Santé Plus Services : Notre philosophie',
          description: 'Comprendre notre approche de l\'accompagnement',
          icon: <Sparkles size={24} />,
          readTime: '3 min',
          category: 'general',
        },
        {
          title: 'Comment bien utiliser l\'application',
          description: 'Tous les conseils pour bien démarrer',
          icon: <BookOpen size={24} />,
          readTime: '4 min',
          category: 'general',
        },
        {
          title: 'La coordination familiale',
          description: 'Impliquer la famille dans le suivi',
          icon: <Users size={24} />,
          readTime: '3 min',
          category: 'general',
        },
        {
          title: 'Les signes d\'alerte à connaître',
          description: 'Savoir quand contacter un professionnel',
          icon: <Shield size={24} />,
          readTime: '5 min',
          category: 'general',
        },
        {
          title: 'Le bien-être au quotidien',
          description: 'Les petits gestes qui font la différence',
          icon: <Smile size={24} />,
          readTime: '3 min',
          category: 'general',
        },
        {
          title: 'Notre engagement qualité',
          description: 'Ce qui fait la différence chez Santé Plus',
          icon: <Heart size={24} />,
          readTime: '2 min',
          category: 'general',
        },
      ],
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: colors.primary, borderTopColor: 'transparent' }} />
          <p style={{ color: colors.text }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isValidated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white rounded-2xl p-12 text-center max-w-md shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: colors.primary + '15' }}>
            <BookOpen size={40} style={{ color: colors.primary }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: colors.text }}>
            Contenu éducatif restreint
          </h2>
          <p className="text-sm" style={{ color: colors.textLight }}>
            {getRestrictedMessage()}
          </p>
          <p className="text-sm mt-2" style={{ color: colors.textLight }}>
            Notre équipe traite votre demande dans les plus brefs délais.
          </p>
          <button
            onClick={() => navigate('/app')}
            className="mt-4 px-6 py-2 rounded-xl text-white font-medium transition hover:opacity-80"
            style={{ background: colors.primary }}
          >
            Retourner au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  const currentContent = content[selectedCategory as keyof typeof content] || content.general;

  const getAvailableCategories = () => {
    const categories = [
      { id: 'general', label: '📖 Général' },
    ];

    if (isFamily && profile?.patient_category === 'maman_bebe') {
      categories.push({ id: 'maman', label: '👶 Maman & Bébé' });
    } else if (isFamily && profile?.patient_category === 'senior') {
      categories.push({ id: 'senior', label: '👴 Senior' });
    } else if (isAidant) {
      categories.push({ id: 'maman', label: '👶 Maman & Bébé' });
      categories.push({ id: 'senior', label: '👴 Senior' });
    } else if (isAdminOrCoordinator) {
      categories.push({ id: 'maman', label: '👶 Maman & Bébé' });
      categories.push({ id: 'senior', label: '👴 Senior' });
    } else {
      categories.push({ id: 'maman', label: '👶 Maman & Bébé' });
      categories.push({ id: 'senior', label: '👴 Senior' });
    }

    return categories;
  };

  const availableCategories = getAvailableCategories();

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
          {getPageTitle()}
        </h1>
        <p className="mt-1" style={{ color: colors.textLight }}>
          {getPageDescription()}
        </p>
      </div>

      {/* Catégories */}
      <div className="flex flex-wrap gap-3">
        {availableCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id as 'maman' | 'senior' | 'general')}
            className={`px-4 py-2 rounded-xl font-medium transition ${
              selectedCategory === cat.id ? 'text-white' : ''
            }`}
            style={{
              background: selectedCategory === cat.id ? colors.primary : colors.primary + '20',
              color: selectedCategory === cat.id ? 'white' : colors.text,
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Titre de la catégorie */}
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-xl" style={{ background: colors.primary + '15', color: colors.primary }}>
          {currentContent.icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
            {currentContent.title}
          </h2>
        </div>
      </div>

      {/* Articles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentContent.articles.map((article, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group border"
            style={{ borderColor: colors.primary + '15' }}
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl flex-shrink-0" style={{ background: colors.primary + '10', color: colors.primary }}>
                {article.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm" style={{ color: colors.text }}>
                  {article.title}
                </h3>
                <p className="text-xs mt-1" style={{ color: colors.textLight }}>
                  {article.description}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs" style={{ color: colors.textLight }}>
                    <Clock size={12} className="inline mr-1" />
                    {article.readTime}
                  </span>
                  <span className="text-xs font-medium" style={{ color: colors.primary }}>
                    Lire <ChevronRight size={14} className="inline" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: colors.primary + '15' }}>
        <p className="text-xs" style={{ color: colors.textLight }}>
          📋 Ces informations sont fournies à titre éducatif et informatif. 
          Elles ne remplacent pas un avis médical professionnel. 
          En cas de doute, consultez votre médecin.
        </p>
      </div>
    </div>
  );
};

export default EducationPage;
