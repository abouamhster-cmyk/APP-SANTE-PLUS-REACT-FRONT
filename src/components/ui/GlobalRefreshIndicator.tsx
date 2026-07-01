// 📁 src/components/ui/GlobalRefreshIndicator.tsx

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRefreshableData } from '@/hooks/useRefreshableData';
import { cn } from '@/utils/helpers';

export const GlobalRefreshIndicator = () => {
  const { isRefreshing } = useRefreshableData();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isRefreshing) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isRefreshing]);

  if (!visible) return null;

  return (
    <div className="fixed top-16 right-4 z-50 bg-white rounded-2xl shadow-lg border border-black/5 px-4 py-2 flex items-center gap-3 animate-slideIn">
      <RefreshCw size={16} className="animate-spin text-[var(--color-primary)]" />
      <span className="text-xs font-medium text-gray-600">Actualisation...</span>
    </div>
  );
};

// Ajouter le style
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-slideIn {
    animation: slideIn 0.3s ease-out forwards;
  }
`;
document.head.appendChild(style);

export default GlobalRefreshIndicator;
