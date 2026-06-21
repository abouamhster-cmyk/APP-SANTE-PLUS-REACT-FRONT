// 📁 src/features/auth/components/FAQContent.tsx
// 📌 Foire aux questions

export const FAQContent = () => {
  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="p-4 rounded-xl" style={{ background: 'var(--color-primary, #1a4a3a)05' }}>
          <h4 className="font-bold" style={{ color: 'var(--color-text, #2d2d2d)' }}>
            Qu'est-ce que Santé Plus Services ?
          </h4>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-light, #6b7280)' }}>
            Santé Plus Services est un service d'accompagnement non médical à domicile. 
            Nous mettons en relation des familles avec des aidants qualifiés pour un 
            accompagnement personnalisé.
          </p>
        </div>

        <div className="p-4 rounded-xl" style={{ background: 'var(--color-primary, #1a4a3a)05' }}>
          <h4 className="font-bold" style={{ color: 'var(--color-text, #2d2d2d)' }}>
            Qui sont les aidants ?
          </h4>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-light, #6b7280)' }}>
            Les aidants sont des personnes formées et sélectionnées par Santé Plus Services. 
            Ils apportent un soutien au quotidien : présence, aide à l'organisation, 
            coordination, mais n'effectuent aucun acte médical.
          </p>
        </div>

        <div className="p-4 rounded-xl" style={{ background: 'var(--color-primary, #1a4a3a)05' }}>
          <h4 className="font-bold" style={{ color: 'var(--color-text, #2d2d2d)' }}>
            Comment se passe l'inscription ?
          </h4>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-light, #6b7280)' }}>
            L'inscription est simple et rapide. Vous choisissez votre profil (famille ou aidant), 
            remplissez vos informations, et notre équipe valide votre compte sous 48h.
          </p>
        </div>

        <div className="p-4 rounded-xl" style={{ background: 'var(--color-primary, #1a4a3a)05' }}>
          <h4 className="font-bold" style={{ color: 'var(--color-text, #2d2d2d)' }}>
            Quels sont les tarifs ?
          </h4>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-light, #6b7280)' }}>
            Nos offres sont disponibles sur notre page des abonnements. Nous proposons 
            des formules adaptées à chaque besoin : intervention ponctuelle, suivi régulier, 
            ou accompagnement complet.
          </p>
        </div>

        <div className="p-4 rounded-xl" style={{ background: 'var(--color-primary, #1a4a3a)05' }}>
          <h4 className="font-bold" style={{ color: 'var(--color-text, #2d2d2d)' }}>
            Puis-je annuler mon abonnement ?
          </h4>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-light, #6b7280)' }}>
            Oui, vous pouvez annuler votre abonnement à tout moment avec un préavis de 7 jours. 
            L'annulation se fait depuis votre espace client.
          </p>
        </div>

        <div className="p-4 rounded-xl" style={{ background: 'var(--color-primary, #1a4a3a)05' }}>
          <h4 className="font-bold" style={{ color: 'var(--color-text, #2d2d2d)' }}>
            Mes données sont-elles sécurisées ?
          </h4>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-light, #6b7280)' }}>
            Oui, toutes vos données sont protégées et confidentielles. Nous respectons 
            les normes de sécurité et de confidentialité les plus strictes.
          </p>
        </div>

        <div className="p-4 rounded-xl" style={{ background: 'var(--color-primary, #1a4a3a)05' }}>
          <h4 className="font-bold" style={{ color: 'var(--color-text, #2d2d2d)' }}>
            Comment contacter l'équipe ?
          </h4>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-light, #6b7280)' }}>
            Vous pouvez nous contacter par email à <strong>contact@santeplus.bj</strong> 
            ou par téléphone au <strong>+229 01 91 34 34 58</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};