// 📁 src/components/ui/InfoModal.tsx
// ✅ WRAPPER INFOMODAL : DÉDOUBLONNAGE ET HARMONISATION DES COMPOSANTS PAR RÔLE

import { ReactNode } from 'react';
import { ModalFullScreen } from './ModalFullScreen';
import { InfoModalContent } from './InfoModalContent';
import { getThemeColors } from '@/lib/permissions';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const InfoModal = ({
  isOpen,
  onClose,
  title,
  children,
  icon,
  className,
}: InfoModalProps) => {
  // Récupérer la couleur de thème standard (Seniors)
  const colors = getThemeColors('senior');

  return (
    <ModalFullScreen
      isOpen={isOpen}
      onClose={onClose}
      onBack={onClose}
      title={title} 
      className={className}
    >
      <InfoModalContent
        children={children}
        onClose={onClose}
        colors={colors}  
      />
    </ModalFullScreen>
  );
};

export default InfoModal;
