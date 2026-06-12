import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isPassword?: boolean;
  variant?: 'box' | 'line';
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, isPassword, variant = 'line', className, ...props }, ref) => {
    const [showPw, setShowPw] = useState(false);

    const baseInput =
      variant === 'line'
        ? [
            'w-full h-12 px-0 text-sm text-text-white bg-transparent',
            'border-0 border-b transition-all duration-200 outline-none',
            'placeholder:text-white/20',
            isPassword ? 'pr-8' : '',
            error
              ? 'border-b-[#1A65D3]/70 focus:border-b-[#1A65D3]'
              : 'border-b-white/12 focus:border-b-[#1A65D3]',
            className ?? '',
          ].join(' ')
        : [
            'w-full h-12 px-4 rounded-xl text-sm text-text-white bg-bg-darker',
            'border transition-all duration-200 outline-none',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
            'placeholder:text-text-dark-gray',
            error
              ? 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
              : 'border-border-dark focus:border-[#1A65D3] focus:shadow-[0_0_0_3px_rgba(26,101,211,0.12)]',
            isPassword ? 'pr-11' : '',
            className ?? '',
          ].join(' ');

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label className="text-[10px] font-medium tracking-[0.12em] text-white/35 uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={isPassword ? (showPw ? 'text' : 'password') : props.type}
            className={baseInput}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
              tabIndex={-1}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
        </div>
        {error && (
          <p className="text-[11px] leading-snug" style={{ color: '#1A65D3' }}>{error}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';
export default FormInput;
