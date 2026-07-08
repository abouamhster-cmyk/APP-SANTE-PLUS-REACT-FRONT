// 📁 src/features/auth/components/CGUContent.tsx

import React from "react";

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

const Section = ({ title, children }: SectionProps) => (
  <div className="p-5 rounded-2xl border shadow-sm bg-white/60 backdrop-blur-sm transition hover:shadow-md">
    <h4 className="font-semibold text-base mb-2 text-[var(--color-text,#1f2937)]">
      {title}
    </h4>
    <div className="text-sm leading-relaxed text-[var(--color-text-light,#6b7280)]">
      {children}
    </div>
  </div>
);

const WarningBox = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl my-3">
    <p className="text-sm text-amber-800">{children}</p>
  </div>
);

const MedicalAlert = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl my-3">
    <p className="text-sm text-red-800 font-medium">{children}</p>
  </div>
);

export const CGUContent = () => {
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 text-sm text-[var(--color-text,#2d2d2d)]">

      {/* ============================================================
      HEADER
      ============================================================ */}
      <div className="text-center space-y-2 border-b pb-4">
        <p className="text-xs text-gray-400">
          Version 1.0.0 — Dernière mise à jour : {today}
        </p>
      </div>

      {/* ============================================================
      CONTENU COMPLET
      ============================================================ */}
      <div className="space-y-4">

        {/* 1. IDENTIFICATION DE LA PLATEFORME */}
        <Section title="1. Identification de la plateforme">
          <p>
            L'application <strong>SANTÉ PLUS SERVICE</strong> est une plateforme numérique 
            permettant la mise en relation, la coordination et le suivi de services 
            d'assistance, de santé et de bien-être entre plusieurs types d'utilisateurs.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Accessible via : <strong>https://app.mysanteplus.com</strong>
          </p>
        </Section>

        {/* 2. OBJET DES CGU */}
        <Section title="2. Objet des CGU">
          <p>Les présentes CGU définissent :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>les conditions d'accès à la plateforme</li>
            <li>les règles d'utilisation des services</li>
            <li>les responsabilités des utilisateurs</li>
            <li>les conditions financières</li>
            <li>les règles de confidentialité</li>
          </ul>
          <p className="mt-2 font-medium">
            Toute utilisation de l'application implique une acceptation 
            <strong> expresse, libre et éclairée</strong> des présentes CGU.
          </p>
        </Section>

        {/* 3. ACCEPTATION ET OPPOSABILITÉ */}
        <Section title="3. Acceptation et opposabilité">
          <p>Lors de l'inscription, l'utilisateur :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>coche une case d'acceptation</li>
            <li>reconnaît avoir lu et compris les CGU</li>
            <li>accepte d'être juridiquement lié</li>
          </ul>
          <p className="mt-2 font-medium">
            Les CGU sont opposables dès la première utilisation.
          </p>
        </Section>

        {/* 4. CRÉATION DE COMPTE */}
        <Section title="4. Création de compte">
          <h5 className="font-semibold mt-2">4.1 Conditions</h5>
          <p>Pour créer un compte, l'utilisateur doit :</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>fournir des informations exactes, complètes et à jour</li>
            <li>être juridiquement capable (ou sous responsabilité légale)</li>
          </ul>

          <h5 className="font-semibold mt-3">4.2 Sécurité du compte</h5>
          <p>L'utilisateur est seul responsable :</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>de son mot de passe</li>
            <li>de l'accès à son compte</li>
            <li>des actions effectuées</li>
          </ul>
          <p className="mt-2 text-gray-500">
            Toute connexion est réputée effectuée par le titulaire du compte.
          </p>
        </Section>

        {/* 5. TYPOLOGIE DES UTILISATEURS */}
        <Section title="5. Typologie des utilisateurs et obligations spécifiques">
          
          <h5 className="font-semibold mt-2">🔹 5.1 Bénéficiaire / Patient / Famille</h5>
          <p>S'engage à :</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>fournir des informations médicales et personnelles exactes</li>
            <li>respecter les intervenants</li>
            <li>ne pas détourner les services</li>
          </ul>
          <p className="mt-1 text-amber-600 text-xs">
            ⚠️ Responsabilité : toute mauvaise information peut entraîner un risque et engage sa responsabilité.
          </p>

          <h5 className="font-semibold mt-3">🔹 5.2 Aidant / Intervenant</h5>
          <p>S'engage à :</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>fournir des prestations conformes aux standards professionnels</li>
            <li>respecter strictement la confidentialité</li>
            <li>signaler toute situation critique</li>
          </ul>
          <p className="mt-1 font-medium text-red-600 text-xs">
            🚫 Interdictions : abus de confiance, exploitation financière ou morale.
          </p>

          <h5 className="font-semibold mt-3">🔹 5.3 Coordinateur / Manager</h5>
          <p>Responsable de :</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>la supervision des services</li>
            <li>la qualité des prestations</li>
            <li>la coordination entre acteurs</li>
          </ul>
          <p className="mt-1 text-sm">
            Il agit comme <strong>intermédiaire opérationnel</strong>, sans être garant médical.
          </p>

          <h5 className="font-semibold mt-3">🔹 5.4 Administrateur</h5>
          <p>Responsable de :</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>la gestion technique</li>
            <li>la sécurité</li>
            <li>la régulation des accès</li>
          </ul>
          <p className="mt-1 text-sm">
            Peut : suspendre un compte, modifier les accès, contrôler les activités.
          </p>

          <h5 className="font-semibold mt-3">🔹 5.5 Payeur (Diaspora ou tiers)</h5>
          <p>S'engage à :</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>financer les services choisis</li>
            <li>vérifier les prestations</li>
            <li>effectuer les paiements dans les délais</li>
          </ul>
          <p className="mt-1 text-amber-600 text-xs">
            ⚠️ Le payeur n'est pas nécessairement bénéficiaire direct.
          </p>
        </Section>

        {/* 6. DESCRIPTION DES SERVICES */}
        <Section title="6. Description des services">
          <p>SANTÉ PLUS SERVICE propose notamment :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>coordination des soins et assistance</li>
            <li>suivi des bénéficiaires</li>
            <li>communication entre parties</li>
            <li>gestion des prestations</li>
            <li>système de paiement</li>
          </ul>
          <WarningBox>
            ⚠️ <strong>La plateforme n'est pas un établissement médical</strong>
            <br />
            Elle ne remplace ni un médecin ni une structure hospitalière.
          </WarningBox>
        </Section>

        {/* 7. CONDITIONS FINANCIÈRES */}
        <Section title="7. Conditions financières">
          <h5 className="font-semibold mt-2">7.1 Tarification</h5>
          <p>Les services peuvent être :</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>forfaitaires</li>
            <li>à l'acte</li>
            <li>par abonnement</li>
          </ul>
          <p className="mt-1">Les prix sont clairement indiqués avant validation.</p>

          <h5 className="font-semibold mt-3">7.2 Paiement</h5>
          <p>Les paiements peuvent être effectués via :</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>mobile money (MTN, Moov)</li>
            <li>carte bancaire</li>
            <li>WorldRemit, Wise, Sendwave</li>
            <li>autres solutions disponibles</li>
          </ul>

          <h5 className="font-semibold mt-3">7.3 Défaut de paiement</h5>
          <p>En cas de non-paiement :</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>suspension immédiate des services</li>
            <li>blocage du compte</li>
            <li>recouvrement possible</li>
          </ul>

          <h5 className="font-semibold mt-3">7.4 Absence de remboursement</h5>
          <p>Sauf cas exceptionnel :</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>aucun remboursement automatique</li>
            <li>toute contestation est étudiée au cas par cas</li>
          </ul>
        </Section>

        {/* 8. RESPONSABILITÉ */}
        <Section title="8. Responsabilité">
          <h5 className="font-semibold mt-2">8.1 Limitation de responsabilité</h5>
          <p>
            SANTÉ PLUS SERVICE agit comme <strong>intermédiaire technique et organisationnel</strong>.
            Elle ne peut être tenue responsable :
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>des actes médicaux</li>
            <li>des décisions des intervenants</li>
            <li>des dommages indirects</li>
          </ul>

          <h5 className="font-semibold mt-3">8.2 Responsabilité des utilisateurs</h5>
          <p>Chaque utilisateur est responsable :</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>de ses actions</li>
            <li>de ses décisions</li>
            <li>des informations fournies</li>
          </ul>

          <h5 className="font-semibold mt-3">8.3 Cas de force majeure</h5>
          <p>La responsabilité ne peut être engagée en cas de :</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>panne réseau</li>
            <li>catastrophe</li>
            <li>événement imprévisible</li>
          </ul>
        </Section>

        {/* 9. CONFIDENTIALITÉ */}
        <Section title="9. Confidentialité">
          <p>Les données sont :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>strictement confidentielles</li>
            <li>accessibles uniquement aux personnes autorisées</li>
          </ul>
          <p className="mt-2 font-medium text-red-600">
            Toute violation peut entraîner : suspension ou poursuites.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            📋 Une politique de confidentialité complète est disponible séparément.
          </p>
        </Section>

        {/* 10. SÉCURITÉ */}
        <Section title="10. Sécurité">
          <p>La plateforme met en œuvre :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>chiffrement des données</li>
            <li>systèmes d'authentification</li>
            <li>contrôle d'accès</li>
          </ul>
          <p className="mt-2 text-amber-600">
            ⚠️ L'utilisateur reste responsable de ses accès.
          </p>
        </Section>

        {/* 11. SUSPENSION / RÉSILIATION */}
        <Section title="11. Suspension / Résiliation">
          <p>Peut intervenir en cas de :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>violation des CGU</li>
            <li>fraude</li>
            <li>comportement abusif</li>
          </ul>
          <p className="mt-2 font-medium text-red-600">
            Sans préavis si nécessaire.
          </p>
        </Section>

        {/* 12. PROPRIÉTÉ INTELLECTUELLE */}
        <Section title="12. Propriété intellectuelle">
          <p>Tous les éléments de l'application sont protégés.</p>
          <p className="mt-2">
            Toute reproduction est interdite sans autorisation.
          </p>
        </Section>

        {/* 13. MODIFICATION DES CGU */}
        <Section title="13. Modification des CGU">
          <p>SANTÉ PLUS SERVICE peut modifier les CGU à tout moment.</p>
          <p className="mt-2">Les utilisateurs seront informés via :</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>notification</li>
            <li>email</li>
            <li>message dans l'app</li>
          </ul>
        </Section>

        {/* 14. DROIT APPLICABLE ET LITIGES */}
        <Section title="14. Droit applicable et litiges">
          <ul className="list-disc pl-5 space-y-1">
            <li>Droit applicable : pays d'exploitation</li>
            <li>Priorité à une résolution amiable</li>
            <li>À défaut : juridictions compétentes</li>
          </ul>
        </Section>

        {/* 15. AVERTISSEMENT MÉDICAL */}
        <div className="p-5 rounded-2xl border-2 border-red-200 bg-red-50/50">
          <h4 className="font-bold text-base mb-2 text-red-700">
            🚨 AVERTISSEMENT MÉDICAL IMPORTANT
          </h4>
          <div className="text-sm leading-relaxed text-red-800 space-y-2">
            <p>
              <strong>Les services Santé Plus sont des services d'accompagnement, 
              de coordination et de soutien à domicile.</strong> Ils ne remplacent ni un médecin, 
              ni une sage-femme, ni un service d'urgence, ni une hospitalisation.
            </p>
            <p className="font-medium">
              En cas de douleur intense, saignement, difficulté respiratoire, 
              baisse des mouvements fœtaux, fièvre importante, convulsions, 
              perte de connaissance, aggravation brutale de l'état général, 
              les proches doivent immédiatement contacter un service médical d'urgence.
            </p>
          </div>
        </div>

        {/* 16. CONTACT */}
        <Section title="15. Contact">
          <p>Pour toute question relative aux CGU :</p>
          <div className="mt-3 space-y-1 text-sm">
            <p><strong>📧 Email :</strong> contact@santeplus.bj</p>
            <p><strong>📞 Téléphone :</strong> +229 01 91 34 34 58</p>
            <p><strong>📍 Adresse :</strong> Cotonou, Bénin</p>
          </div>
        </Section>

      </div>

      {/* ============================================================
      FOOTER
      ============================================================ */}
      <div className="text-center text-xs text-gray-400 pt-4 border-t">
        Version 1.0.0 — Dernière mise à jour : {today}
        <br />
        <span className="text-[10px]">
          © {new Date().getFullYear()} Santé Plus Service — Tous droits réservés.
        </span>
      </div>

    </div>
  );
};
