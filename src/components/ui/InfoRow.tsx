// 📁 src/components/ui/InfoRow.tsx

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
  const colors = {
    primary: 'var(--color-primary, #1a4a3a)',
    text: 'var(--color-text, #2d2d2d)',
    border: 'var(--color-border, #e5e0d8)',
    light: 'var(--color-text-light, #6b7280)',
  };

  return (
    <div className="flex justify-between py-2.5 border-b last:border-b-0" style={{ borderColor: colors.border }}>
      <span className="text-sm font-medium" style={{ color: colors.light }}>
        {label}
      </span>
      <span 
        className="text-sm break-all text-right max-w-[60%]" 
        style={{ 
          color: color || (highlight ? colors.primary : colors.text),
          fontWeight: highlight ? 700 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
};

export default InfoRow;