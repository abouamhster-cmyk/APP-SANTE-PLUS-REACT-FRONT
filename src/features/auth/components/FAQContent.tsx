// 📁 src/features/auth/components/FAQContent.tsx
// ✅ CONTENU FAQ : ALIGNEMENT COMPLET AVEC LA CHARTE OPÉRATIONNELLE ET LES TARIFS DE L'ENTREPRISE

import React, { useState } from "react";

type FAQItemProps = {
  question: string;
  answer: React.ReactNode;
  icon?: string;
};

const FAQItem = ({ question, answer, icon = "❓" }: FAQItemProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-2xl overflow-hidden bg-[#FCFAF6] dark:bg-[#1a231f] shadow-sm transition hover:shadow-md">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-4 flex justify-between items-center gap-4 outline-none"
      >
        <span className="flex items-center gap-2 font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-100">
          <span className="text-lg">{icon}</span>
          <span>{question}</span>
        </span>
        <span className="text-base font-black text-gray-400 shrink-0">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 text-xs sm:text-sm text-gray-500 dark:text-gray-300 leading-relaxed font-semibold animate-fadeIn">
          {answer}
        </div>
      )}
    </div>
  );
};

export const FAQContent = () => {
  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ============================================================
          HEADER (DÉDOUBLONNÉ)
          ============================================================ */}
      <div className="text-center space-y-1.5 border-b pb-3.5">
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
          Tout ce que vous devez savoir sur le fonctionnement de Santé Plus Service
        </p>
      </div>

      {/* ============================================================
          QUESTIONS / RÉPONSES [1]
          ============================================================ */}
      <div className="space-y-3">

        {/* 1. Qu'est-ce que Santé Plus Services ? */}
        <FAQItem
          icon="🏥"
          question="Qu'est-ce que Santé Plus Services ?"
          answer={
            <div className="space-y-2 font-medium">
              <p>
                <strong>Santé Plus Services</strong> est une plateforme d'intermédiation, de coordination et de suivi de prestations d'accompagnement à domicile non médicales (Seniors & Maternité) [1].
              </p>
              <p>
                Nous permettons aux familles d'organiser des visites de veille pour leurs proches âgés ou de planifier du soutien d'éveil et de confort pour les mamans et les nouveau-nés [1].
              </p>
              <p className="text-xs text-red-600 font-bold">
                ⚠️ Attention : la plateforme n'est pas un service d'urgence médicale ni un hôpital clinique.
              </p>
            </div>
          }
        />

        {/* 2. Qui sont les aidants ? */}
        <FAQItem
          icon="🦸"
          question="Qui sont les aidants et comment sont-ils recrutés ?"
          answer={
            <div className="space-y-2 font-medium">
              <p>
                Les aidants sont des intervenants à domicile (auxiliaires de vie sociale, gardes-malades ou puéricultrices) rigoureusement sélectionnés par notre direction [1].
              </p>
              <p>
                Chaque candidature fait l'objet d'une enquête d'antécédents, d'une vérification de diplômes ou d'expériences, et d'une formation interne continue avant d'obtenir son habilitation sur la plateforme [1].
              </p>
            </div>
          }
        />

        {/* 3. Comment s'organisent les visites ? */}
        <FAQItem
          icon="📅"
          question="Comment s'organisent les visites d'accompagnement ?"
          answer={
            <div className="space-y-2 font-medium">
              <p>
                L'administration planifie les visites d'accompagnement selon le rythme de votre forfait [30]. Un aidant d'appoint est affecté en priorité selon le besoin [30].
              </p>
              <p>
                Lors de l'intervention, l'aidant enregistre son heure d'arrivée et de départ par GPS [30]. À la clôture, il rédige un compte rendu détaillé avec photos et mémos vocaux consultables par la famille depuis l'application [23, 30].
              </p>
            </div>
          }
        />

        {/* 4. Quels sont les forfaits Seniors ? */}
        <FAQItem
          icon="👴"
          question="Quels sont les tarifs des forfaits Seniors ?"
          answer={
            <div className="space-y-2 font-medium">
              <p>Nous disposons de 4 offres contractuelles mensuelles adaptées au suivi des personnes âgées [1] :</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li><strong>Essentiel</strong> (45 000 FCFA/mois) : 4 visites mensuelles pour un suivi léger [1].</li>
                <li><strong>Accompagnement</strong> (80 000 FCFA/mois) : 8 visites mensuelles, idéal pour le retour d'hôpital ou la convalescence [1].</li>
                <li><strong>SérénitéSeniors</strong> (100 000 FCFA/mois) : 12 visites mensuelles pour un suivi régulier complet [1].</li>
                <li><strong>PrivilègeFamille</strong> (200 000 FCFA/mois) : Suivi illimité et coordination familiale totale pour les familles de la diaspora [1].</li>
              </ul>
            </div>
          }
        />

        {/* 5. Quels sont les forfaits Maman & Bébé ? */}
        <FAQItem
          icon="👶"
          question="Quels sont les tarifs des forfaits Maman & Bébé ?"
          answer={
            <div className="space-y-2 font-medium">
              <p>Des forfaits de soutien post-partum et d'éveil pour accompagner la maman et son nouveau-né [1] :</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li><strong>Essentiel</strong> (65 000 FCFA / 2 semaines) : Découverte post-partum de base [1].</li>
                <li><strong>Confort</strong> (100 000 FCFA / 3 semaines) : Accompagnement standard du postpartum [1].</li>
                <li><strong>Sérénité</strong> (140 000 FCFA / 4 semaines) : Suivi rapproché premium à domicile [1].</li>
                <li><strong>Privilège</strong> (200 000 FCFA / 5 semaines) : Coaching complet à long terme [1].</li>
              </ul>
            </div>
          }
        />

        {/* 6. Comment fonctionnent les courses (Commandes) ? */}
        <FAQItem
          icon="🛒"
          question="Comment fonctionnent les courses et livraisons ?"
          answer={
            <div className="space-y-2 font-medium">
              <p>
                Les livraisons et les courses ne sont pas intégrées dans les forfaits d'abonnements [1]. Elles fonctionnent exclusivement en mode ponctuel (à l'acte) [14].
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Avec provision d'achats</strong> : Vous versez le montant d'achat estimé + les frais de retrait Mobile Money d'avance en ligne. À la livraison, vous réglez les frais de transport (espèces ou Momo) [14].</li>
                <li><strong>Sans provision d'achats (récupération simple)</strong> : Commande gratuite à l'envoi. Vous réglez uniquement le transport à l'arrivée [14].</li>
              </ul>
            </div>
          }
        />

        {/* 7. Mes données médicales sont-elles sécurisées ? */}
        <FAQItem
          icon="🔒"
          question="Mes données cliniques sont-elles confidentielles ?"
          answer={
            <div className="space-y-2 font-medium">
              <p>
                <strong>Oui, de manière absolue.</strong> Santé Plus Service SARL met en œuvre des mesures de chiffrement SSL avancées. 
              </p>
              <p>
                L'accès aux notes de confort, antécédents et traitements est strictement limité par profil [30] : les aidants de terrain ne voient que ce qui est nécessaire à leur mission quotidienne [30].
              </p>
            </div>
          }
        />
      </div>

      {/* ============================================================
          FOOTER FAQ
          ============================================================ */}
      <div className="text-center text-xs text-gray-400 pt-4 border-t">
        <p>
          Besoin d'une assistance complémentaire ?
          <br />
          <a href="mailto:contact@santeplus.bj" className="font-bold hover:underline" style={{ color: 'var(--color-primary, #1a4a3a)' }}>
            📧 contact@santeplus.bj
          </a>
        </p>
        <p className="mt-2 text-[10px]">
          © {new Date().getFullYear()} Santé Plus Service SARL — Tous droits réservés.
        </p>
      </div>

    </div>
  );
};
