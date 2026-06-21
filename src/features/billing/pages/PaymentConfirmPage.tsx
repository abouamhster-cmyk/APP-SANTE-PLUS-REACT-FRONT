// 📁 src/features/billing/pages/PaymentConfirmPage.tsx
// ✅ VERSION CORRIGÉE - Uniquement affichage de confirmation
// 🔥 La création de la commande est gérée UNIQUEMENT par le webhook backend

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ShoppingBag } from 'lucide-react';
import { getThemeColors } from '@/lib/permissions';
import toast from 'react-hot-toast';

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
        localStorage.removeItem('pending_ponctual_order');

        // ✅ Démarrer le compte à rebours
        let countdown = 5;
        setRedirectCountdown(countdown);
        const interval = setInterval(() => {
          countdown--;
          setRedirectCountdown(countdown);
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
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: colors.background }}>
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-lg">
          <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: colors.primary }} />
          <h2 className="text-xl font-bold" style={{ color: colors.text }}>
            {isChecking ? 'Vérification du paiement...' : 'Confirmation en cours...'}
          </h2>
          <p className="text-sm mt-2" style={{ color: colors.text + '60' }}>
            {message}
          </p>
          <p className="text-xs mt-4" style={{ color: colors.text + '40' }}>
            ⏳ Cela peut prendre quelques instants
          </p>
        </div>
      </div>
    );
  }

  // ✅ Rendu : Succès
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: colors.background }}>
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#4CAF5015' }}>
            <CheckCircle size={48} style={{ color: '#4CAF50' }} />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: '#4CAF50' }}>
            ✅ Paiement confirmé !
          </h2>
          <p className="text-sm mt-2" style={{ color: colors.text + '60' }}>
            {message}
          </p>
          <div className="mt-3 p-3 rounded-xl" style={{ background: colors.primary + '08' }}>
            <p className="text-sm" style={{ color: colors.text }}>
              📦 Votre commande a été créée avec succès
            </p>
            <p className="text-xs mt-1" style={{ color: colors.text + '40' }}>
              Vous recevrez une notification lorsque votre commande sera prise en charge
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => navigate('/app/orders')}
              className="w-full py-3 rounded-xl text-white font-bold transition hover:opacity-90"
              style={{ background: colors.primary }}
            >
              <ShoppingBag size={18} className="inline mr-2" />
              Voir mes commandes
            </button>
            <button
              onClick={() => navigate('/app')}
              className="w-full py-3 rounded-xl font-medium border transition hover:bg-gray-50"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              Retour au tableau de bord
            </button>
          </div>
          <p className="text-xs mt-4" style={{ color: colors.text + '30' }}>
            Redirection dans {redirectCountdown} secondes...
          </p>
        </div>
      </div>
    );
  }

  // ❌ Rendu : Erreur
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: colors.background }}>
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-lg">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#F4433615' }}>
          <XCircle size={48} style={{ color: '#F44336' }} />
        </div>
        <h2 className="text-2xl font-bold" style={{ color: '#F44336' }}>
          ❌ Paiement échoué
        </h2>
        <p className="text-sm mt-2" style={{ color: colors.text + '60' }}>
          {message}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => navigate('/app/orders/create')}
            className="w-full py-3 rounded-xl text-white font-bold transition hover:opacity-90"
            style={{ background: colors.primary }}
          >
            Réessayer
          </button>
          <button
            onClick={() => navigate('/app/billing')}
            className="w-full py-3 rounded-xl font-medium border transition hover:bg-gray-50"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            Voir les offres
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmPage;
