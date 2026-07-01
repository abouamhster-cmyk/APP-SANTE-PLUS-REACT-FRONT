// 📁 src/hooks/useRefreshableData.ts

import { useState, useCallback, useEffect } from 'react';
import { usePatientStore } from '@/stores/patientStore';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { usePaymentStore } from '@/stores/paymentStore';
import { useNotificationStore } from '@/stores/notificationStore';

type StoreKey = 'patients' | 'visits' | 'orders' | 'payments' | 'notifications';

interface RefreshableDataOptions {
  onRefresh?: () => void;
  onError?: (error: any) => void;
  showToast?: boolean;
}

export const useRefreshableData = (options: RefreshableDataOptions = {}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const patientStore = usePatientStore();
  const visitStore = useVisitStore();
  const orderStore = useOrderStore();
  const paymentStore = usePaymentStore();
  const notificationStore = useNotificationStore();

  // ✅ Fonction de rafraîchissement global
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Rafraîchissement global des données...');

      // ✅ Invalider tous les caches
      patientStore.invalidateCache();
      
      // ✅ Recharger toutes les données
      await Promise.all([
        patientStore.fetchPatients(true),
        visitStore.fetchVisits(),
        orderStore.fetchOrders(),
        paymentStore.fetchSubscriptions(),
        paymentStore.fetchPayments(),
        notificationStore.fetchNotifications(),
      ]);

      setLastRefresh(new Date());
      console.log('✅ Rafraîchissement global terminé');
      
      if (options.onRefresh) {
        options.onRefresh();
      }
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement:', error);
      if (options.onError) {
        options.onError(error);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [patientStore, visitStore, orderStore, paymentStore, notificationStore, options]);

  // ✅ Rafraîchir un store spécifique
  const refreshStore = useCallback(async (storeKey: StoreKey) => {
    setIsRefreshing(true);
    try {
      console.log(`🔄 Rafraîchissement du store: ${storeKey}`);

      switch (storeKey) {
        case 'patients':
          patientStore.invalidateCache();
          await patientStore.fetchPatients(true);
          break;
        case 'visits':
          await visitStore.fetchVisits();
          break;
        case 'orders':
          await orderStore.fetchOrders();
          break;
        case 'payments':
          await paymentStore.fetchSubscriptions();
          await paymentStore.fetchPayments();
          break;
        case 'notifications':
          await notificationStore.fetchNotifications();
          break;
        default:
          console.warn(`Store inconnu: ${storeKey}`);
      }

      setLastRefresh(new Date());
      console.log(`✅ Rafraîchissement du store ${storeKey} terminé`);
      
      if (options.onRefresh) {
        options.onRefresh();
      }
    } catch (error) {
      console.error(`❌ Erreur lors du rafraîchissement de ${storeKey}:`, error);
      if (options.onError) {
        options.onError(error);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [patientStore, visitStore, orderStore, paymentStore, notificationStore, options]);

  // ✅ Rafraîchissement automatique après une action modificative
  const refreshAfterAction = useCallback(async (storeKey: StoreKey) => {
    // Petit délai pour laisser le temps à la base de données de se mettre à jour
    await new Promise(resolve => setTimeout(resolve, 300));
    await refreshStore(storeKey);
  }, [refreshStore]);

  return {
    isRefreshing,
    lastRefresh,
    refreshAll,
    refreshStore,
    refreshAfterAction,
    refreshPatients: () => refreshStore('patients'),
    refreshVisits: () => refreshStore('visits'),
    refreshOrders: () => refreshStore('orders'),
    refreshPayments: () => refreshStore('payments'),
    refreshNotifications: () => refreshStore('notifications'),
  };
};

export default useRefreshableData;
