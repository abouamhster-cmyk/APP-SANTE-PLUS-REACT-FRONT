// 📁 src/hooks/useTerminology.ts

import { useAuthStore } from '@/stores/authStore';

export const useTerminology = () => {
  const { role, profile } = useAuthStore();

  // Déterminer la catégorie
  const category = profile?.patient_category || 'senior';

  const getTerms = () => {
    // 👨‍👩‍👦 FAMILLE
    if (role === 'family') {
      return {
        // Noms
        plural: 'proches',
        singular: 'proche',
        // Actions
        add: 'Ajouter un proche',
        addAction: 'Ajouter',
        edit: 'Modifier le proche',
        delete: 'Supprimer ce proche',
        // Listes
        list: 'Mes proches',
        listTitle: 'Liste des proches',
        empty: 'Aucun proche',
        emptyAction: 'Ajoutez une personne à accompagner',
        // Messages
        created: 'Proche ajouté avec succès',
        updated: 'Informations du proche mises à jour',
        deleted: 'Proche supprimé',
        confirmDelete: 'Voulez-vous vraiment supprimer ce proche ?',
        // Détails
        detail: 'Détails du proche',
        noVisits: 'Aucune visite pour ce proche',
        noNotes: 'Aucune note pour ce proche',
        // Catégories
        senior: '👴 Senior',
        maman: '👶 Maman & Bébé',
        // Emoji
        emoji: '👨‍👩‍👦',
        icon: 'Users',
        // Stats
        statsLabel: 'proche',
        statsLabelPlural: 'proches',
      };
    }

    // 🦸 AIDANT
    if (role === 'aidant') {
      return {
        plural: 'personnes accompagnées',
        singular: 'personne accompagnée',
        add: 'Ajouter une personne',
        addAction: 'Ajouter',
        edit: 'Modifier la personne',
        delete: 'Supprimer cette personne',
        list: 'Mes personnes accompagnées',
        listTitle: 'Liste des personnes accompagnées',
        empty: 'Aucune personne accompagnée',
        emptyAction: 'Ajoutez une personne à accompagner',
        created: 'Personne ajoutée avec succès',
        updated: 'Informations de la personne mises à jour',
        deleted: 'Personne supprimée',
        confirmDelete: 'Voulez-vous vraiment supprimer cette personne ?',
        detail: 'Détails de la personne',
        noVisits: 'Aucune visite pour cette personne',
        noNotes: 'Aucune note pour cette personne',
        senior: '👴 Senior',
        maman: '👶 Maman & Bébé',
        emoji: '🤝',
        icon: 'Users',
        statsLabel: 'personne accompagnée',
        statsLabelPlural: 'personnes accompagnées',
      };
    }

    // 👔 COORDINATEUR / 👑 ADMIN
    if (role === 'coordinator' || role === 'admin') {
      return {
        plural: 'bénéficiaires',
        singular: 'bénéficiaire',
        add: 'Ajouter un bénéficiaire',
        addAction: 'Ajouter',
        edit: 'Modifier le bénéficiaire',
        delete: 'Supprimer ce bénéficiaire',
        list: 'Bénéficiaires',
        listTitle: 'Liste des bénéficiaires',
        empty: 'Aucun bénéficiaire',
        emptyAction: 'Ajoutez un bénéficiaire',
        created: 'Bénéficiaire ajouté avec succès',
        updated: 'Informations du bénéficiaire mises à jour',
        deleted: 'Bénéficiaire supprimé',
        confirmDelete: 'Voulez-vous vraiment supprimer ce bénéficiaire ?',
        detail: 'Détails du bénéficiaire',
        noVisits: 'Aucune visite pour ce bénéficiaire',
        noNotes: 'Aucune note pour ce bénéficiaire',
        senior: '👴 Senior',
        maman: '👶 Maman & Bébé',
        emoji: '👤',
        icon: 'Users',
        statsLabel: 'bénéficiaire',
        statsLabelPlural: 'bénéficiaires',
      };
    }

    // Fallback (ne devrait jamais arriver)
    return {
      plural: 'patients',
      singular: 'patient',
      add: 'Ajouter un patient',
      addAction: 'Ajouter',
      edit: 'Modifier le patient',
      delete: 'Supprimer ce patient',
      list: 'Patients',
      listTitle: 'Liste des patients',
      empty: 'Aucun patient',
      emptyAction: 'Ajoutez un patient',
      created: 'Patient ajouté avec succès',
      updated: 'Informations du patient mises à jour',
      deleted: 'Patient supprimé',
      confirmDelete: 'Voulez-vous vraiment supprimer ce patient ?',
      detail: 'Détails du patient',
      noVisits: 'Aucune visite pour ce patient',
      noNotes: 'Aucune note pour ce patient',
      senior: '👴 Senior',
      maman: '👶 Maman & Bébé',
      emoji: '👤',
      icon: 'Users',
      statsLabel: 'patient',
      statsLabelPlural: 'patients',
    };
  };

  const terms = getTerms();

  return {
    ...terms,
    role,
    category,
    isFamily: role === 'family',
    isAidant: role === 'aidant',
    isCoordinator: role === 'coordinator',
    isAdmin: role === 'admin',
    isAdminOrCoordinator: role === 'admin' || role === 'coordinator',
    isFamilyOrAidant: role === 'family' || role === 'aidant',
    
    // Helper pour les catégories
    getCategoryLabel: (cat: string) => {
      return cat === 'maman_bebe' ? terms.maman : terms.senior;
    },
    
    // Helper pour le nombre
    getCountLabel: (count: number) => {
      return `${count} ${terms.singular}${count > 1 ? 's' : ''}`;
    },
    
    // Helper pour les stats
    getStatsLabel: (count: number) => {
      return `${count} ${count > 1 ? terms.statsLabelPlural : terms.statsLabel}`;
    },
  };
};