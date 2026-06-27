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

export const CGUContent = () => {
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 text-sm text-[var(--color-text,#2d2d2d)]">

      {/* HEADER */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">
          Conditions Générales d’Utilisation
        </h2>
        <p className="text-xs text-gray-500">
          Santé Plus Services
        </p>
      </div>

      {/* CONTENT */}
      <div className="space-y-4">

        <Section title="1. Présentation du service">
          <p>
            Santé Plus Services est un service d'accompagnement non médical à domicile.
            Notre mission est de faciliter le quotidien des familles en mettant à disposition
            des aidants qualifiés.
          </p>
          <p className="mt-2">
            Les présentes Conditions Générales d'Utilisation (CGU) régissent
            l'utilisation de la plateforme et des services proposés.
          </p>
        </Section>

        <Section title="2. Acceptation des conditions">
          <p>
            En créant un compte et en utilisant les services de Santé Plus Services,
            l'utilisateur accepte sans réserve l'intégralité des présentes CGU.
          </p>
          <p className="mt-2 font-medium">
            Toute utilisation non conforme est strictement interdite.
          </p>
        </Section>

        <Section title="3. Engagement des utilisateurs">
          <ul className="list-disc pl-5 space-y-1">
            <li>Fournir des informations exactes, complètes et à jour</li>
            <li>Respecter les engagements pris (horaires, missions, rendez-vous)</li>
            <li>Informer Santé Plus Services de tout changement de situation</li>
            <li>Respecter les lois en vigueur</li>
            <li>Ne pas partager ses identifiants de connexion</li>
          </ul>
        </Section>

        <Section title="4. Non-responsabilité médicale">
          <p>
            Santé Plus Services <strong>n'est pas un service médical</strong>.
          </p>
          <p className="mt-2">
            Les aidants n'effectuent <strong>aucun acte médical</strong> :
            injections, soins infirmiers, prescriptions ou diagnostic.
          </p>
          <p className="mt-2 font-medium">
            En cas d'urgence, contactez immédiatement les services compétents
            (SAMU, pompiers, médecin).
          </p>
        </Section>

        <Section title="5. Confidentialité et données personnelles">
          <p>
            Toutes les informations échangées sont strictement confidentielles.
          </p>
          <p className="mt-2">
            Nous nous engageons à protéger vos données personnelles conformément
            à la réglementation en vigueur.
          </p>
          <p className="mt-2">
            Les données sont utilisées uniquement dans le cadre du service.
          </p>
        </Section>

        <Section title="6. Résiliation">
          <p>
            L'utilisateur peut résilier son abonnement à tout moment avec un
            préavis de 7 jours.
          </p>
          <p className="mt-2">
            La demande peut être faite depuis l’espace client ou par email :
            <br />
            <strong>contact@santeplus.bj</strong>
          </p>
        </Section>

        <Section title="7. Responsabilité">
          <p>
            La responsabilité de Santé Plus Services est limitée aux obligations
            définies dans le présent contrat.
          </p>
          <p className="mt-2">
            L’utilisateur reste responsable de l’usage qu’il fait du service.
          </p>
        </Section>

        <Section title="8. Modification des CGU">
          <p>
            Nous nous réservons le droit de modifier les présentes conditions
            à tout moment.
          </p>
          <p className="mt-2">
            Les utilisateurs seront informés via la plateforme ou par email.
          </p>
        </Section>

        <Section title="9. Force majeure">
          <p>
            Santé Plus Services ne peut être tenu responsable en cas
            d'événements imprévisibles : catastrophe, grève, pandémie, etc.
          </p>
        </Section>

        <Section title="10. Loi applicable">
          <p>
            Les présentes CGU sont régies par le droit béninois.
          </p>
          <p className="mt-2">
            Tout litige relève des tribunaux compétents de Cotonou.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Pour toute question :
          </p>
          <div className="mt-2 space-y-1">
            <p><strong>Email :</strong> info@santeplus.bj</p>
            <p><strong>Téléphone :</strong> +229 01 91 34 34 58</p>
            <p><strong>Adresse :</strong> Cotonou, Bénin</p>
          </div>
        </Section>

      </div>

      {/* FOOTER */}
      <div className="text-center text-xs text-gray-400 pt-4 border-t">
        Version 1.0.0 — Dernière mise à jour : {today}
      </div>

    </div>
  );
};
