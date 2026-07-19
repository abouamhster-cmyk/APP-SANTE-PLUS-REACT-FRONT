// 📁 src/features/billing/pages/PaymentConfirmPage.tsx

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Calendar, ShoppingBag, ArrowRight } from 'lucide-react';
import { getThemeColors } from '@/lib/permissions';
import { useVisitStore } from '@/stores/visitStore';
import { usePatientStore } from '@/stores/patientStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { supabase } from '@/lib/supabase';

const PaymentConfirmPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [isVisit, setIsVisit] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);

  const colors = getThemeColors('senior');

  const refreshData = async () => {
    try {
      await Promise.all([
        useVisitStore.getState().fetchVisits(true),
        usePatientStore.getState().fetchPatients(true),
        useNotificationStore.getState().fetchNotifications(true),
      ]);
      console.log('✅ Données rafraîchies après paiement');
    } catch (error) {
      console.error('❌ Erreur rafraîchissement données:', error);
    }
  };

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const paymentStatus = searchParams.get('status');
      // ✅ Fallback : FedaPay utilise 'id' comme clé de référence de transaction
      const transactionId = searchParams.get('transaction_id') || searchParams.get('id');
      const reference = searchParams.get('reference');
      const visitIdParam = searchParams.get('visit_id');
      const orderIdParam = searchParams.get('order_id');
      const type = searchParams.get('type');

      console.log('🔍 ===== PAYMENT CONFIRM =====');
      console.log('🔍 status:', paymentStatus);
      console.log('🔍 transactionId:', transactionId);
      console.log('🔍 reference:', reference);
      console.log('🔍 visit_id:', visitIdParam);
      console.log('🔍 order_id:', orderIdParam);
      console.log('🔍 type:', type);
      console.log('🔍 searchParams:', searchParams.toString());
      console.log('🔍 ===========================');

      const isVisitPayment = type === 'visit' || !!visitIdParam;
      if (visitIdParam) {
        setVisitId(visitIdParam);
        setIsVisit(true);
      }

      // ✅ CAS 1 : PAIEMENT EXPLICITEMENT APPROUVÉ OU VALIDÉ
      if (paymentStatus === 'approved' || paymentStatus === 'success' || paymentStatus === 'paid') {
        console.log('✅ Paiement approuvé !');
        setStatus('success');
        
        let redirectUrl = '/app';

        if (isVisitPayment && visitIdParam) {
          setMessage('✅ Votre paiement a été confirmé avec succès ! Votre visite est planifiée.');
          redirectUrl = `/app/visits/${visitIdParam}`;
        } else {
          let orderId = orderIdParam;
          
          if (!orderId && transactionId) {
            const { data: orderData } = await supabase
              .from('commandes')
              .select('id')
              .eq('metadata->>transaction_id', transactionId)
              .maybeSingle();

            if (orderData) {
              orderId = orderData.id;
            }
          }

          if (orderId) {
            setMessage('✅ Votre paiement a été confirmé avec succès ! Votre commande est validée.');
            redirectUrl = `/app/orders/${orderId}`;
            setTargetId(orderId);
          } else {
            setMessage('✅ Votre paiement a été confirmé avec succès ! Votre commande est validée.');
            redirectUrl = '/app/orders';
          }
        }

        sessionStorage.removeItem('pending_ponctual_order');
        sessionStorage.removeItem('pending_visit_payment');
        localStorage.removeItem('pending_ponctual_order');
        
        await refreshData();

        let countdown = 5;
        const interval = setInterval(() => {
          countdown -= 1;
          setRedirectCountdown(countdown);
          if (countdown <= 0) {
            clearInterval(interval);
            navigate(redirectUrl);
          }
        }, 1000);

        return () => clearInterval(interval);
      }

      // ❌ CAS 2 : PAIEMENT ÉCHOUÉ OU ANNULÉ
      if (paymentStatus === 'cancel' || paymentStatus === 'cancelled' || paymentStatus === 'failed') {
        console.log('❌ Paiement annulé ou échoué');
        setStatus('error');
        setMessage('❌ Le paiement a été annulé ou a échoué. Veuillez réessayer.');
        
        sessionStorage.removeItem('pending_ponctual_order');
        sessionStorage.removeItem('pending_visit_payment');
        localStorage.removeItem('pending_ponctual_order');
        return;
      }

      // ⏳ CAS 3 : PAIEMENT EN TRAITEMENT
      if (paymentStatus === 'pending') {
        console.log('⏳ Paiement en attente...');
        setStatus('loading');
        setMessage('⏳ Votre paiement est en cours de traitement...');
        setIsChecking(true);

        setTimeout(async () => {
          try {
            const checkId = transactionId || reference;
            if (checkId) {
              const response = await fetch(`/api/billing/verify-payment?transaction_id=${transactionId || ''}&reference=${reference || ''}`);
              const data = await response.json();
              
              if (data.success) {
                console.log('✅ Paiement vérifié avec succès !');
                setStatus('success');
                
                let redirectUrl = '/app';
                if (isVisitPayment) {
                  setMessage('✅ Votre paiement a été confirmé avec succès ! Votre visite est planifiée.');
                  redirectUrl = visitIdParam ? `/app/visits/${visitIdParam}` : '/app/visits';
                } else {
                  let orderId = orderIdParam;
                  if (!orderId && transactionId) {
                    const { data: orderData } = await supabase
                      .from('commandes')
                      .select('id')
                      .eq('metadata->>transaction_id', transactionId)
                      .maybeSingle();

                    if (orderData) {
                      orderId = orderData.id;
                    }
                  }

                  if (orderId) {
                    setMessage('✅ Votre paiement a été confirmé avec succès ! Votre commande est validée.');
                    redirectUrl = `/app/orders/${orderId}`;
                    setTargetId(orderId);
                  } else {
                    setMessage('✅ Votre paiement a été confirmé avec succès !');
                    redirectUrl = '/app/orders';
                  }
                }
                
                sessionStorage.removeItem('pending_ponctual_order');
                sessionStorage.removeItem('pending_visit_payment');
                localStorage.removeItem('pending_ponctual_order');
                setIsChecking(false);
                
                await refreshData();
                
                setTimeout(() => {
                  navigate(redirectUrl);
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

      // ⚠️ CAS 4 : AUCUN PARAMÈTRE MAIS OBJETS EN ATTENTE
      const savedVisit = sessionStorage.getItem('pending_visit_payment');
      const savedOrder = sessionStorage.getItem('pending_ponctual_order') || localStorage.getItem('pending_ponctual_order');
      
      if (savedVisit) {
        console.log('📦 Données de visite en attente trouvées...');
        try {
          const visitData = JSON.parse(savedVisit);
          const vId = visitData.visit_id || visitData.id;
          if (vId) {
            setVisitId(vId);
            setIsVisit(true);
            
            await useVisitStore.getState().fetchVisitById(vId);
            const currentVisit = useVisitStore.getState().currentVisit;
            
            if (currentVisit && currentVisit.status !== 'brouillon') {
              setStatus('success');
              setMessage('✅ Votre visite a été planifiée avec succès !');
              sessionStorage.removeItem('pending_visit_payment');
              await refreshData();
              
              setTimeout(() => {
                navigate(`/app/visits/${vId}`);
              }, 3000);
              return;
            }
          }
        } catch (error) {
          console.error('❌ Erreur vérification visite en attente:', error);
        }
      }
      
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
              
              let orderId = null;
              const { data: ord } = await supabase
                .from('commandes')
                .select('id')
                .eq('metadata->>transaction_id', txnId)
                .maybeSingle();
              if (ord) orderId = ord.id;

              if (orderId) {
                setMessage('✅ Votre paiement a été confirmé avec succès ! Votre commande est validée.');
                sessionStorage.removeItem('pending_ponctual_order');
                localStorage.removeItem('pending_ponctual_order');
                setIsChecking(false);
                await refreshData();
                setTimeout(() => {
                  navigate(`/app/orders/${orderId}`);
                }, 3000);
                return;
              }
            }
          }
        } catch (error) {
          console.error('❌ Erreur vérification des données en attente:', error);
        }
        
        setStatus('loading');
        setMessage('⏳ Votre paiement est en cours de traitement par notre système...');
        
        setTimeout(() => {
          sessionStorage.removeItem('pending_ponctual_order');
          localStorage.removeItem('pending_ponctual_order');
          setStatus('success');
          setMessage('✅ Votre commande a été créée avec succès !');
          setIsChecking(false);
          refreshData();
          
          setTimeout(() => {
            navigate('/app/orders');
          }, 2000);
        }, 10000);
        return;
      }

      console.log('⚠️ Aucune information de paiement trouvée');
      setStatus('error');
      setMessage('❌ Aucune information de paiement trouvée. Veuillez contacter le support.');
    };

    checkPaymentStatus();
  }, [searchParams, navigate]);

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
              {isVisit ? (
                <span>📅 Votre visite est planifiée</span>
              ) : (
                <span>📦 Votre commande est validée</span>
              )}
            </p>
            <p className="text-[10px] leading-relaxed text-gray-400 font-medium">
              {isVisit 
                ? 'Vous recevrez une notification dès que l\'aidant aura approuvé la visite.'
                : 'Notre équipe s\'occupe de la mise en place de votre prestation. Vous recevrez une alerte dès qu\'un aidant sera assigné.'}
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <button
              onClick={() => {
                if (isVisit && visitId) {
                  navigate(`/app/visits/${visitId}`);
                } else if (!isVisit && targetId) {
                  navigate(`/app/orders/${targetId}`);
                } else {
                  navigate('/app/orders');
                }
              }}
              className="w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-95 shadow-sm flex items-center justify-center gap-1.5"
              style={{ background: colors.primary }}
            >
              {isVisit ? (
                <>
                  <Calendar size={14} />
                  Voir ma visite
                  <ArrowRight size={14} />
                </>
              ) : (
                <>
                  <ShoppingBag size={14} />
                  Voir ma commande
                  <ArrowRight size={14} />
                </>
              )}
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
            onClick={() => {
              if (isVisit && visitId) {
                navigate(`/app/visits/${visitId}`);
              } else {
                navigate('/app/orders/create');
              }
            }}
            className="w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-95 shadow-sm"
            style={{ background: colors.primary }}
          >
            {isVisit ? 'Réessayer le paiement' : 'Réessayer la commande'}
          </button>
          <button
            onClick={() => navigate('/app/billing')}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-gray-50 hover:bg-gray-100 transition-colors"
            style={{ color: colors.text }}
          >
            Consulter les formules d'abonnements
          </button>
          <button
            onClick={() => navigate('/app')}
            className="w-full py-2.5 rounded-xl text-xs font-bold border hover:bg-gray-50 transition-colors"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmPage;
