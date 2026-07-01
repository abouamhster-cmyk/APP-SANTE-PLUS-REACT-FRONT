// 📁 src/components/ui/InfoModal.tsx
// 📌 Wrapper pour compatibilité

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
  maxWidth = 'lg',
  className,
}: InfoModalProps) => {
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
        title={title}
        children={children}
        icon={icon}
        onClose={onClose}
        colors={colors}
      />
    </ModalFullScreen>
  );
};

export default InfoModal;
