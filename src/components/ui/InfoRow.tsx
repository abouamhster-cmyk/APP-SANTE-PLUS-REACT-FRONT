// 📁 src/components/ui/InfoRow.tsx

import { useBranding } from '@/hooks/useBranding';

interface InfoRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}

export const InfoRow = ({ 
  label, 
  value, 
  highlight = false, 
  color 
}: InfoRowProps) => {
  const brand = useBranding();
  const colors = brand.colors;

  const primaryColor = color || colors.primary;
  const textColor = colors.text;
  const borderColor = colors.primary + '15';
  const lightColor = colors.textLight;

  return (
    <div className="flex justify-between py-2.5 border-b last:border-b-0" style={{ borderColor }}>
      <span className="text-sm font-medium" style={{ color: lightColor }}>
        {label}
      </span>
      <span 
        className="text-sm break-all text-right max-w-[60%]" 
        style={{ 
          color: highlight ? primaryColor : textColor,
          fontWeight: highlight ? 700 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
};

export default InfoRow;
