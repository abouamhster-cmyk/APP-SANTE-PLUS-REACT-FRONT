// 📁 src/features/auth/components/CGUContent.tsx
 
import React from "react";
import { useBranding } from '@/hooks/useBranding';

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

const Section = ({ title, children }: SectionProps) => {
  const brand = useBranding();
  const colors = brand.colors;

  return (
    /* Fond beige/crème constant #FCFAF6 harmonisé avec la barre d'outils mobile [24] */
    <div className="p-5 rounded-2xl border shadow-sm bg-[#FCFAF6] dark:bg-[#1a231f] transition hover:shadow-md" style={{ borderColor: colors.primary + '15' }}>
      <h4 className="font-bold text-sm sm:text-base mb-2" style={{ color: colors.text }}>
        {title}
      </h4>
      <div className="text-xs sm:text-sm leading-relaxed font-semibold text-gray-600 dark:text-gray-300">
        {children}
      </div>
    </div>
  );
};

const WarningBox = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="border-l-4 p-4 rounded-r-xl my-3 bg-amber-50/50 border-amber-500">
      <p className="text-xs sm:text-sm font-semibold text-amber-800 leading-relaxed">{children}</p>
    </div>
  );
};

export const CGUContent = () => {
  const brand = useBranding();
  const colors = brand.colors;

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 text-sm animate-fadeIn" style={{ color: colors.text }}>

      {/* ============================================================
          HEADER (DÉDOUBLONNÉ)
          ============================================================ */}
      <div className="text-center space-y-1 border-b pb-3.5" style={{ borderColor: colors.primary + '15' }}>
        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
          Version officielle 1.0.0 — Dernière mise à jour : {today}
        </p>
      </div>

      {/* ============================================================
          CONTENU DES SECTIONS OFFICIELLES [1]
          ============================================================ */}
      <div className="space-y-4">

        {/* 1. RÉSUMÉ EXÉCUTIF */}
        <Section title="1. Résumé exécutif">
          <p>
            L’application Santé Plus accessible via <strong>https://app.mysanteplus.com</strong> permet la gestion opérationnelle de prestations d’accompagnement et de suivi à domicile. Selon les cas, elle est utilisée par des familles, des proches installés dans la diaspora, des aidants, des coordonnateurs, des managers et des responsables administratifs.
          </p>
          <p className="mt-2 text-xs text-amber-600 leading-normal">
            ⚠️ L’achat d’un forfait n’ouvre pas un droit général à tous les services de Santé Plus. Il ouvre uniquement l’accès aux prestations expressément comprises dans le forfait sélectionné, payées et activées.
          </p>
        </Section>

        {/* 2. RESPONSABLE DU TRAITEMENT */}
        <Section title="2. Responsable du traitement">
          <p>
            Le responsable du traitement des données mises en œuvre dans le cadre de l’application Santé Plus est <strong>Santé Plus Service SARL</strong>, agissant en qualité d’opérateur de la plateforme et d’organisateur des prestations associées. La société détermine les finalités principales de collecte, d’utilisation, de conservation et de communication des données.
          </p>
        </Section>

        {/* 3. CATÉGORIES DE DONNÉES COLLECTÉES */}
        <Section title="3. Catégories de données collectées">
          <p>Selon le rôle de l'utilisateur, l'application peut collecter :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Données d’identification</strong> : nom, prénom, sexe, date de naissance, lien familial.</li>
            <li><strong>Données de contact</strong> : numéro de téléphone, adresse e-mail, adresse physique (Bénin / Diaspora), contact d’urgence.</li>
            <li><strong>Dossier du bénéficiaire</strong> : informations de confort, niveau de dépendance, observations non diagnostiques.</li>
            <li><strong>Suivi de maternité</strong> : stade de grossesse déclaré, observations postpartum, éléments de suivi non médical du nouveau-né.</li>
            <li><strong>Données de géolocalisation</strong> : position enregistrée des aidants lors du début et de la fin de l'accompagnement pour le contrôle de la présence sur le terrain.</li>
          </ul>
        </Section>

        {/* 4. FINALITÉS DU TRAITEMENT */}
        <Section title="4. Finalités du traitement">
          <p>Les données sont collectées pour :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>L'administration et la sécurisation des comptes utilisateurs.</li>
            <li>La coordination, la traçabilité et le suivi des visites à domicile.</li>
            <li>La transmission d'informations en temps réel à la famille et à la diaspora.</li>
            <li>La facturation, la confirmation de paiement des provisions d'achats et l'émission des reçus.</li>
            <li>Le respect des obligations légales, comptables et réglementaires.</li>
          </ul>
        </Section>

        {/* 5. DESTINATAIRES DES DONNÉES ET ACCÈS PAR RÔLE */}
        <Section title="5. Destinataires des données et accès par rôle">
          <p>L'accès aux informations est strictement limité selon le profil de l'utilisateur :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Admin & Coordination</strong> : Gestion technique, planification des visites, validation des rapports d'interventions.</li>
            <li><strong>Aidant / Intervenant</strong> : Accès limité aux seules informations de confort nécessaires à l'accomplissement de sa mission terrain.</li>
            <li><strong>Famille / Payeur</strong> : Accès aux rapports de visites, cahier de liaison et historiques de paiement de son foyer.</li>
          </ul>
        </Section>

        {/* 6. GÉOLOCALISATION ET SUIVI DES INTERVENTIONS */}
        <Section title="6. Géolocalisation et suivi des interventions">
          <p>
            L’application enregistre la position géographique des intervenants lors du démarrage et de la clôture des visites. Ce suivi a pour but exclusif de contrôler la réalité de la présence à domicile, d'assurer la sécurité des équipes de terrain, d'évaluer les retards et de garantir la continuité de service pour les familles abonnées.
          </p>
        </Section>

        {/* 7. PHOTOS, VIDÉOS ET COMPTES RENDUS */}
        <Section title="7. Photos, vidéos et comptes rendus">
          <p>
            Les photos, mémos vocaux et rapports transmis par l'aidant ne sont partagés que dans le cadre exclusif du dossier familial autorisé. Tout usage promotionnel, publicitaire ou externe à la réalisation de la mission d'accompagnement de Santé Plus Service SARL est strictement interdit sans un accord écrit et signé séparément.
          </p>
        </Section>

        {/* 8. DURÉE DE CONSERVATION DES DONNÉES */}
        <Section title="8. Durée de conservation des données">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Données de compte</strong> : Conservées pendant toute la durée d'activité du compte utilisateur.</li>
            <li><strong>Données de facturation et de paiement</strong> : Conservées selon les durées légales de conservation comptables applicables.</li>
            <li><strong>Rapports et historiques d'interventions</strong> : Conservés pendant la durée nécessaire à la continuité des soins et au suivi qualité.</li>
          </ul>
        </Section>

        {/* 9. EXACTITUDE DES INFORMATIONS ET RESPONSABILITÉ CLIENT */}
        <Section title="9. Sincérité des informations et responsabilité du client">
          <p>
            Le client s’engage à fournir des informations rigoureusement sincères concernant le bénéficiaire, son état général, son adresse, sa disponibilité et son contact d'urgence. Toute omission, dissimulation ou erreur relative à l’état de santé ou de dépendance du proche peut limiter la responsabilité de Santé Plus Service SARL et compromettre la bonne exécution des prestations à domicile.
          </p>
        </Section>

        {/* 10. CONDITIONS FINANCIÈRES, PAIEMENT ET ABSENCE DE REMBOURSEMENT */}
        <Section title="10. Conditions financières, forfaits et politique de paiement">
          <p>
            Les abonnements mensuels, forfaits de maternité ou prestations à l'acte sont payables d'avance par Mobile Money (MTN, Moov, Celtiis), transfert de fonds international ou carte bancaire. Sauf cas de force majeure ou faute lourde imputable à l'entreprise :
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Absence de remboursement</strong> : Les forfaits déjà activés, engagés ou commencés restent entièrement dus et ne font l'objet d'aucun remboursement automatique.</li>
            <li><strong>Défaut de paiement</strong> : Entraîne la suspension immédiate de l'accès à l'application et l'arrêt des visites d'accompagnement planifiées.</li>
          </ul>
        </Section>

        {/* 11. FACULTÉ DE REFUS, DE SUSPENSION OU DE RÉORIENTATION */}
        <Section title="11. Faculté de refus ou de réorientation de l'entreprise">
          <p>
            Santé Plus Service SARL se réserve le droit de refuser, suspendre ou réorienter une prestation si le niveau de dépendance ou le besoin médical réel du bénéficiaire dépasse le cadre non médical du forfait souscrit, ou s'il présente un risque grave pour la sécurité de l'intervenant à domicile.
          </p>
        </Section>

        {/* 12. AVERTISSEMENT MÉDICAL D'URGENCE IMPORTANT */}
        <div className="p-5 rounded-2xl border-2 bg-red-50/50 border-red-200">
          <h4 className="font-bold text-xs sm:text-sm mb-2 text-red-800 uppercase">
            🚨 AVERTISSEMENT MÉDICAL D'URGENCE IMPORTANT
          </h4>
          <div className="text-xs sm:text-sm leading-relaxed font-semibold text-red-700 space-y-2">
            <p>
              <strong>La plateforme Santé Plus et ses intervenants (aidants) ne sont pas un établissement médical, un service d'ambulance, ou un outil de diagnostic.</strong> Ils n'effectuent aucun acte médical, injection, pansement complexe ou prescription de traitement.
            </p>
            <p className="font-bold">
              En cas de douleur aiguë brutale, malaise, convulsion, perte de connaissance, saignement important ou détresse respiratoire chez votre proche, ne planifiez pas de visite ! Vous devez contacter immédiatement les services de secours ou orienter sans délai le malade vers la clinique ou l'hôpital le plus proche.
            </p>
          </div>
        </div>

        {/* 13. CONTACT ET SUPPORT */}
        <Section title="12. Coordonnées de contact officiel">
          <p>Pour toute question relative aux présentes conditions, à l'exercice de vos droits ou à la facturation :</p>
          <div className="mt-3 space-y-1 text-xs">
            <p><strong>📧 Email :</strong> contact@santeplus.bj</p>
            <p><strong>📞 Téléphone :</strong> +229 01 91 34 34 58</p>
            <p><strong>📍 Adresse administrative :</strong> Cotonou, République du Bénin</p>
          </div>
        </Section>

      </div>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <div className="text-center text-xs pt-4 border-t" style={{ borderColor: colors.primary + '15', color: colors.textLight }}>
        © {new Date().getFullYear()} Santé Plus Service SARL — Tous droits réservés.
      </div>

    </div>
  );
};
