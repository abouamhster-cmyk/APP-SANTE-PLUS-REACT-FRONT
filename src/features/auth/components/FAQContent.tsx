// 📁 src/features/auth/components/FAQContent.tsx

import React, { useState } from "react";

type FAQItemProps = {
  question: string;
  answer: React.ReactNode;
};

const FAQItem = ({ question, answer }: FAQItemProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-2xl overflow-hidden bg-white/60 backdrop-blur-sm shadow-sm transition hover:shadow-md">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-4 flex justify-between items-center"
      >
        <span className="font-medium text-[var(--color-text,#1f2937)]">
          {question}
        </span>
        <span className="text-xl">
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

      {/* HEADER */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">
          Foire aux questions
        </h2>
        <p className="text-xs text-gray-500">
          Tout ce que vous devez savoir
        </p>
      </div>

      {/* FAQ LIST */}
      <div className="space-y-4">

        <FAQItem
          question="Qu'est-ce que Santé Plus Services ?"
          answer={
            <>
              <p>
                Santé Plus Services est un service d'accompagnement non médical à domicile.
              </p>
              <p className="mt-2">
                Nous mettons en relation des familles avec des aidants qualifiés
                pour un accompagnement personnalisé.
              </p>
            </>
          }
        />

        <FAQItem
          question="Qui sont les aidants ?"
          answer={
            <>
              <p>
                Les aidants sont des personnes formées et sélectionnées par Santé Plus Services.
              </p>
              <p className="mt-2">
                Ils apportent un soutien quotidien : présence, organisation,
                coordination — sans actes médicaux.
              </p>
            </>
          }
        />

        <FAQItem
          question="Comment se passe l'inscription ?"
          answer={
            <>
              <p>
                L'inscription est simple et rapide.
              </p>
              <p className="mt-2">
                Vous choisissez votre profil (famille ou aidant),
                remplissez vos informations, puis votre compte est validé sous 48h.
              </p>
            </>
          }
        />

        <FAQItem
          question="Quels sont les tarifs ?"
          answer={
            <>
              <p>
                Nos offres sont disponibles sur la page abonnements.
              </p>
              <p className="mt-2">
                Plusieurs formules existent : ponctuelle, régulière
                ou accompagnement complet.
              </p>
            </>
          }
        />

        <FAQItem
          question="Puis-je annuler mon abonnement ?"
          answer={
            <>
              <p>
                Oui, vous pouvez annuler à tout moment avec un préavis de 7 jours.
              </p>
              <p className="mt-2">
                L'annulation se fait directement depuis votre espace client.
              </p>
            </>
          }
        />

        <FAQItem
          question="Mes données sont-elles sécurisées ?"
          answer={
            <>
              <p>
                Oui, toutes vos données sont strictement confidentielles.
              </p>
              <p className="mt-2">
                Nous respectons les normes de sécurité les plus strictes.
              </p>
            </>
          }
        />

        <FAQItem
          question="Comment contacter l'équipe ?"
          answer={
            <>
              <p>
                Vous pouvez nous contacter :
              </p>
              <div className="mt-2 space-y-1">
                <p><strong>Email :</strong> contact@santeplus.bj</p>
                <p><strong>Téléphone :</strong> +229 01 91 34 34 58</p>
              </div>
            </>
          }
        />

      </div>

    </div>
  );
};
