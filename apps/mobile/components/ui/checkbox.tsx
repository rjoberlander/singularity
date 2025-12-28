import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Simple checkbox component with dark mode support
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onCheckedChange,
  className = '',
  disabled = false
}) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={`
        inline-flex items-center justify-center
        h-4 w-4 rounded border
        ${checked
          ? 'bg-primary border-primary text-primary-foreground'
          : 'bg-background border-input hover:bg-accent hover:border-accent-foreground'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        ${className}
      `}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  );
};

export default Checkbox;
