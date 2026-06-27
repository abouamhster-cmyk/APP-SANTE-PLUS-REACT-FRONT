// 📁 src/features/billing/pages/PaymentConfirmPage.tsx


import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ShoppingBag } from 'lucide-react';
import { getThemeColors } from '@/lib/permissions';

const PaymentConfirmPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  const colors = getThemeColors('senior');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      // ✅ Récupérer les paramètres de l'URL
      const paymentStatus = searchParams.get('status');
      const transactionId = searchParams.get('transaction_id');
      const reference = searchParams.get('reference');

      console.log('🔍 ===== PAYMENT CONFIRM =====');
      console.log('🔍 status:', paymentStatus);
      console.log('🔍 transactionId:', transactionId);
      console.log('🔍 reference:', reference);
      console.log('🔍 searchParams:', searchParams.toString());
      console.log('🔍 ===========================');

      // ✅ Si le paiement est approuvé
      if (paymentStatus === 'approved' || paymentStatus === 'success' || paymentStatus === 'paid') {
        console.log('✅ Paiement approuvé !');
        setStatus('success');
        setMessage('✅ Votre paiement a été confirmé avec succès ! Votre commande est en cours de création.');

        // ✅ Nettoyer les données en attente (le webhook fait le travail)
        sessionStorage.removeItem('pending_ponctual_order');
        localStorage.setItem('pending_ponctual_order', JSON.stringify({})); // Clean safe fallback
        console.log('📦 Données de commande sauvegardées');

        let countdown = 5;
        const interval = setInterval(() => {
          countdown -= 1;
          if (countdown <= 0) {
            clearInterval(interval);
            navigate('/app/orders');
          }
        }, 1000);

        return () => clearInterval(interval);
      }

      // ❌ Si le paiement a échoué
      if (paymentStatus === 'cancel' || paymentStatus === 'cancelled' || paymentStatus === 'failed') {
        console.log('❌ Paiement annulé ou échoué');
        setStatus('error');
        setMessage('❌ Le paiement a été annulé ou a échoué. Veuillez réessayer.');
        
        sessionStorage.removeItem('pending_ponctual_order');
        localStorage.removeItem('pending_ponctual_order');
        return;
      }

      // ⏳ Si le statut est pending, attendre et vérifier
      if (paymentStatus === 'pending') {
        console.log('⏳ Paiement en attente...');
        setStatus('loading');
        setMessage('⏳ Votre paiement est en cours de traitement...');
        setIsChecking(true);

        // ✅ Vérifier après 5 secondes via l'API
        setTimeout(async () => {
          try {
            const checkId = transactionId || reference;
            if (checkId) {
              const response = await fetch(`/api/billing/verify-payment?transaction_id=${transactionId || ''}&reference=${reference || ''}`);
              const data = await response.json();
              
              if (data.success) {
                console.log('✅ Paiement vérifié avec succès !');
                setStatus('success');
                setMessage('✅ Votre paiement a été confirmé avec succès ! Votre commande est en cours de création.');
                sessionStorage.removeItem('pending_ponctual_order');
                localStorage.removeItem('pending_ponctual_order');
                setIsChecking(false);
                
                setTimeout(() => {
                  navigate('/app/orders');
                }, 3000);
              } else {
                console.log('⏳ Paiement toujours en attente...');
                setStatus('loading');
                setMessage('⏳ Votre paiement est toujours en cours de traitement. Veuillez patienter...');
                setIsChecking(true);
              }
            }
          } catch (error) {
            console.error('❌ Erreur vérification:', error);
            setStatus('error');
            setMessage('❌ Erreur lors de la vérification du paiement. Veuillez contacter le support.');
            setIsChecking(false);
          }
        }, 5000);
        return;
      }

      // ⚠️ Aucun paramètre, mais on vérifie si des données sont en attente
      const savedOrder = sessionStorage.getItem('pending_ponctual_order') || localStorage.getItem('pending_ponctual_order');
      
      if (savedOrder) {
        console.log('📦 Données en attente trouvées, vérification du paiement...');
        setStatus('loading');
        setMessage('⏳ Vérification de votre paiement...');
        setIsChecking(true);

        try {
          const orderData = JSON.parse(savedOrder);
          const txnId = orderData.transaction_id;
          
          if (txnId) {
            const response = await fetch(`/api/billing/verify-payment?transaction_id=${txnId}`);
            const data = await response.json();
            
            if (data.success) {
              console.log('✅ Paiement vérifié avec succès !');
              setStatus('success');
              setMessage('✅ Votre paiement a été confirmé avec succès ! Votre commande est en cours de création.');
              sessionStorage.removeItem('pending_ponctual_order');
              localStorage.removeItem('pending_ponctual_order');
              setIsChecking(false);
              
              setTimeout(() => {
                navigate('/app/orders');
              }, 3000);
              return;
            }
          }
        } catch (error) {
          console.error('❌ Erreur vérification des données en attente:', error);
        }
        
        // Si pas de transaction_id ou paiement non trouvé, attendre le webhook
        setStatus('loading');
        setMessage('⏳ Votre paiement est en cours de confirmation par notre système...');
        
        // Nettoyer après 10 secondes
        setTimeout(() => {
          sessionStorage.removeItem('pending_ponctual_order');
          localStorage.removeItem('pending_ponctual_order');
          setStatus('success');
          setMessage('✅ Votre commande a été créée avec succès !');
          setIsChecking(false);
          
          setTimeout(() => {
            navigate('/app/orders');
          }, 2000);
        }, 10000);
        return;
      }

      // ❌ Si on arrive sur la page sans aucune information
      console.log('⚠️ Aucune information de paiement trouvée');
      setStatus('error');
      setMessage('❌ Aucune information de paiement trouvée. Veuillez contacter le support.');
      
      sessionStorage.removeItem('pending_ponctual_order');
      localStorage.removeItem('pending_ponctual_order');
    };

    checkPaymentStatus();
  }, [searchParams, navigate]);

  // ✅ Rendu : État de chargement
  if (status === 'loading' || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 animate-fadeIn" style={{ background: colors.background }}>
        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <Loader2 size={36} className="animate-spin mx-auto mb-4" style={{ color: colors.primary }} />
          <h2 className="text-lg font-extrabold tracking-tight" style={{ color: colors.text }}>
            {isChecking ? 'Vérification du paiement...' : 'Confirmation en cours...'}
          </h2>
          <p className="text-xs mt-1.5 leading-relaxed text-gray-500">
            {message}
          </p>
          <p className="text-[10px] mt-4 font-semibold text-gray-400">
            ⏳ Cette opération peut prendre quelques instants
          </p>
        </div>
      </div>
    );
  }

  // ✅ Rendu : Succès (Paiement Validé)
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 animate-fadeIn" style={{ background: colors.background }}>
        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-5">
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: '#10b9810f' }}>
              <CheckCircle size={36} style={{ color: '#10b981' }} />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight" style={{ color: '#10b981' }}>
              Paiement confirmé !
            </h2>
            <p className="text-xs leading-relaxed text-gray-500">
              {message}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl text-left space-y-1" style={{ background: colors.primary + '04' }}>
            <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: colors.text }}>
              <span>📦 Votre commande est validée</span>
            </p>
            <p className="text-[10px] leading-relaxed text-gray-400 font-medium">
              Notre équipe s'occupe de la mise en place de votre prestation. Vous recevrez une alerte dès qu'un aidant sera assigné.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <button
              onClick={() => navigate('/app/orders')}
              className="w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-95 shadow-sm flex items-center justify-center gap-1.5"
              style={{ background: colors.primary }}
            >
              <ShoppingBag size={14} />
              Voir mes commandes
            </button>
            <button
              onClick={() => navigate('/app')}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-gray-50 hover:bg-gray-100 transition-colors"
              style={{ color: colors.text }}
            >
              Retour au tableau de bord
            </button>
          </div>

          <p className="text-[10px] font-semibold text-gray-400">
            Redirection automatique dans {redirectCountdown} secondes...
          </p>
        </div>
      </div>
    );
  }

  // ❌ Rendu : Échec du Paiement
  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fadeIn" style={{ background: colors.background }}>
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-5">
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: '#ef44440f' }}>
            <XCircle size={36} style={{ color: '#ef4444' }} />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight" style={{ color: '#ef4444' }}>
            Paiement échoué
          </h2>
          <p className="text-xs leading-relaxed text-gray-500">
            {message}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          <button
            onClick={() => navigate('/app/orders/create')}
            className="w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-95 shadow-sm"
            style={{ background: colors.primary }}
          >
            Réessayer la commande
          </button>
          <button
            onClick={() => navigate('/app/billing')}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-gray-50 hover:bg-gray-100 transition-colors"
            style={{ color: colors.text }}
          >
            Consulter les formules d'abonnements
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmPage;
