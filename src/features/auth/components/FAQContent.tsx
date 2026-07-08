// 📁 src/features/auth/components/FAQContent.tsx

import React, { useState } from "react";

type FAQItemProps = {
  question: string;
  answer: React.ReactNode;
  icon?: string;
};

const FAQItem = ({ question, answer, icon = "❓" }: FAQItemProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-2xl overflow-hidden bg-white/60 backdrop-blur-sm shadow-sm transition hover:shadow-md">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-4 flex justify-between items-center gap-4"
      >
        <span className="flex items-center gap-2 font-medium text-[var(--color-text,#1f2937)]">
          <span className="text-lg">{icon}</span>
          <span>{question}</span>
        </span>
        <span className="text-xl font-bold text-gray-400 flex-shrink-0">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 text-sm text-[var(--color-text-light,#6b7280)] leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
};

export const FAQContent = () => {
  return (
    <div className="space-y-6">

      {/* ============================================================
      HEADER
      ============================================================ */}
      <div className="text-center space-y-2 border-b pb-4">
 
        <p className="text-xs text-gray-500">
          Tout ce que vous devez savoir sur Santé Plus Service
        </p>
        <p className="text-[10px] text-gray-400">
          Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* ============================================================
      FAQ LIST
      ============================================================ */}
      <div className="space-y-3">

        {/* 1. Qu'est-ce que Santé Plus Services ? */}
        <FAQItem
          icon="🏥"
          question="Qu'est-ce que Santé Plus Services ?"
          answer={
            <div className="space-y-2">
              <p>
                <strong>Santé Plus Services</strong> est une plateforme numérique d'accompagnement 
                non médical à domicile.
              </p>
              <p>
                Nous mettons en relation des familles avec des aidants qualifiés pour un 
                accompagnement personnalisé, et nous assurons la coordination des prestations.
              </p>
              <p className="text-xs text-amber-600">
                ⚠️ Santé Plus Services n'est pas un établissement médical et ne remplace 
                ni un médecin ni une structure hospitalière.
              </p>
            </div>
          }
        />

        {/* 2. Qui sont les aidants ? */}
        <FAQItem
          icon="🦸"
          question="Qui sont les aidants ?"
          answer={
            <div className="space-y-2">
              <p>
                Les aidants sont des personnes <strong>formées et sélectionnées</strong> par 
                Santé Plus Services.
              </p>
              <p>
                Ils apportent un soutien quotidien : présence, organisation, 
                coordination — <strong>sans actes médicaux</strong>.
              </p>
              <p className="text-xs text-gray-500">
                ✅ Tous les aidants sont vérifiés et approuvés par l'équipe Santé Plus.
              </p>
            </div>
          }
        />

        {/* 3. Comment se passe l'inscription ? */}
        <FAQItem
          icon="📝"
          question="Comment se passe l'inscription ?"
          answer={
            <div className="space-y-2">
              <p>
                L'inscription est <strong>simple et rapide</strong> en 5 étapes :
              </p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Choix du profil (famille ou aidant)</li>
                <li>Choix du service (Senior ou Maman & Bébé)</li>
                <li>Création des identifiants</li>
                <li>Renseignement des informations</li>
                <li>Validation et acceptation des CGU</li>
              </ol>
              <p className="mt-2 text-amber-600 text-xs">
                ⏳ Votre compte est validé sous <strong>48h</strong> par l'équipe Santé Plus.
              </p>
            </div>
          }
        />

        {/* 4. Quels sont les tarifs ? */}
        <FAQItem
          icon="💰"
          question="Quels sont les tarifs ?"
          answer={
            <div className="space-y-2">
              <p>
                Nos offres sont disponibles sur la page <strong>Abonnements</strong>.
              </p>
              <p>
                Plusieurs formules existent selon vos besoins :
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Essentiel</strong> — 55 000 FCFA / 2 semaines</li>
                <li><strong>Accompagnement</strong> — 120 000 FCFA / mois (sortie d'hospitalisation)</li>
                <li><strong>Sérénité Seniors</strong> — 160 000 FCFA / mois</li>
                <li><strong>Privilège Famille</strong> — 220 000 FCFA / mois</li>
              </ul>
              <p className="text-xs text-gray-500 mt-1">
                💳 Paiements acceptés : Mobile Money, Carte bancaire, WorldRemit, Wise, Sendwave.
              </p>
            </div>
          }
        />

        {/* 5. Forfaits Maman & Bébé */}
        <FAQItem
          icon="👶"
          question="Quels sont les forfaits Maman & Bébé ?"
          answer={
            <div className="space-y-2">
              <p>
                Des forfaits spécifiques pour l'accompagnement post-partum :
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Essentiel</strong> — 65 000 FCFA / 2 semaines</li>
                <li><strong>Confort</strong> — 95 000 FCFA / 2 semaines</li>
                <li><strong>Sérénité</strong> — 140 000 FCFA / mois</li>
                <li><strong>Privilège</strong> — 200 000 FCFA / mois</li>
              </ul>
              <p className="text-xs text-amber-600">
                ⚠️ Ces forfaits n'incluent aucun acte médical. Ils apportent un soutien 
                organisationnel et de confort à domicile.
              </p>
            </div>
          }
        />

        {/* 6. Puis-je annuler mon abonnement ? */}
        <FAQItem
          icon="🔄"
          question="Puis-je annuler mon abonnement ?"
          answer={
            <div className="space-y-2">
              <p>
                <strong>Oui</strong>, vous pouvez annuler à tout moment avec un préavis de 7 jours.
              </p>
              <p>
                L'annulation se fait directement depuis votre <strong>espace client</strong>.
              </p>
              <p className="text-xs text-gray-500">
                📧 Vous pouvez également nous contacter par email : contact@santeplus.bj
              </p>
            </div>
          }
        />

        {/* 7. Y a-t-il des remboursements ? */}
        <FAQItem
          icon="💳"
          question="Y a-t-il des remboursements ?"
          answer={
            <div className="space-y-2">
              <p>
                <strong>Sauf cas exceptionnel</strong>, aucun remboursement automatique n'est effectué.
              </p>
              <p>
                Toute contestation est étudiée au cas par cas par l'équipe Santé Plus.
              </p>
              <p className="text-xs text-amber-600">
                ⚠️ Les prestations déjà réservées, engagées ou commencées restent dues.
              </p>
            </div>
          }
        />

        {/* 8. Mes données sont-elles sécurisées ? */}
        <FAQItem
          icon="🔒"
          question="Mes données sont-elles sécurisées ?"
          answer={
            <div className="space-y-2">
              <p>
                <strong>Oui</strong>, toutes vos données sont strictement confidentielles.
              </p>
              <p>
                Nous respectons les normes de sécurité les plus strictes :
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Chiffrement des données</li>
                <li>Authentification sécurisée</li>
                <li>Contrôle d'accès par rôle</li>
              </ul>
              <p className="text-xs text-gray-500">
                📋 Consultez notre Politique de Confidentialité pour plus de détails.
              </p>
            </div>
          }
        />

        {/* 9. Quelles sont les zones couvertes ? */}
        <FAQItem
          icon="📍"
          question="Quelles sont les zones couvertes ?"
          answer={
            <div className="space-y-2">
              <p>
                Les prestations sont prioritairement organisées sur :
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Cotonou</strong></li>
                <li><strong>Abomey-Calavi</strong></li>
                <li><strong>Porto-Novo</strong></li>
              </ul>
              <p className="text-xs text-amber-600">
                ⚠️ Toute demande hors zone reste soumise à validation de faisabilité 
                et disponibilité des équipes.
              </p>
            </div>
          }
        />

        {/* 10. Comment contacter l'équipe ? */}
        <FAQItem
          icon="📧"
          question="Comment contacter l'équipe ?"
          answer={
            <div className="space-y-2">
              <p>
                Vous pouvez nous contacter via :
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <p><strong>📧 Email :</strong> contact@santeplus.bj</p>
                <p><strong>📞 Téléphone :</strong> +229 01 91 34 34 58</p>
                <p><strong>📍 Adresse :</strong> Cotonou, Bénin</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ⏰ Disponible du lundi au vendredi, de 8h à 18h.
              </p>
            </div>
          }
        />

        {/* 11. Qu'est-ce qui est inclus dans un forfait ? */}
        <FAQItem
          icon="📦"
          question="Qu'est-ce qui est inclus dans un forfait ?"
          answer={
            <div className="space-y-2">
              <p>
                Chaque forfait inclut uniquement les prestations <strong>expressément mentionnées</strong> 
                dans sa fiche détaillée.
              </p>
              <p>
                <strong>Ne sont pas inclus :</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-red-600">
                <li>Médicaments et produits pharmaceutiques</li>
                <li>Analyses et examens médicaux</li>
                <li>Hospitalisation et transport médicalisé</li>
                <li>Actes médicaux invasifs</li>
                <li>Urgences et disponibilité 24h/24</li>
              </ul>
              <p className="text-xs text-gray-500 mt-1">
                💡 Consultez la fiche détaillée du forfait avant tout paiement.
              </p>
            </div>
          }
        />

        {/* 12. Qui est responsable en cas de problème ? */}
        <FAQItem
          icon="⚖️"
          question="Qui est responsable en cas de problème ?"
          answer={
            <div className="space-y-2">
              <p>
                <strong>Santé Plus Service</strong> agit comme intermédiaire technique et organisationnel.
              </p>
              <p>
                La responsabilité est limitée aux prestations effectivement souscrites et payées.
              </p>
              <p className="text-xs text-gray-500">
                📋 Les CGU complètes détaillent les limites de responsabilité.
              </p>
            </div>
          }
        />

      </div>

      {/* ============================================================
      FOOTER
      ============================================================ */}
      <div className="text-center text-xs text-gray-400 pt-4 border-t">
        <p>
          Vous n'avez pas trouvé votre réponse ?
          <br />
          <a 
            href="mailto:contact@santeplus.bj" 
            className="font-medium hover:underline"
            style={{ color: 'var(--color-primary, #1a4a3a)' }}
          >
            📧 Contactez-nous directement
          </a>
        </p>
        <p className="mt-2 text-[10px]">
          © {new Date().getFullYear()} Santé Plus Service — Tous droits réservés.
        </p>
      </div>

    </div>
  );
};
