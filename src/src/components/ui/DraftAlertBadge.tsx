// 📁 src/components/ui/DraftAlertBadge.tsx

import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useVisitStore } from '@/stores/visitStore';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';

export const DraftAlertBadge = () => {
  const { visits } = useVisitStore();
  const { hasActiveSubscription, remainingVisits } = useSubscriptionGuard();
  
  const drafts = visits?.filter(v => v.status === 'brouillon') || [];
  
  if (drafts.length === 0) return null;
  if (!hasActiveSubscription || remainingVisits <= 0) return null;

  return (
    <Link 
      to="/app/visits"
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold hover:bg-yellow-200 transition"
    >
      <AlertCircle size={14} />
      {drafts.length} visite{drafts.length > 1 ? 's' : ''} en attente
    </Link>
  );
};
