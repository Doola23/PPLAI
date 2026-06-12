import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { loginSchema, type LoginFormInputs } from '../../utils/validators';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import FormInput from './FormInput';

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error: authError, setError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await login(data.email, data.password);
      const from = (location.state as { from?: string } | null)?.from;
      if (!user.onboardingComplete) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate(from && from !== '/login' ? from : '/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <AnimatePresence>
        {authError && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-2.5 rounded-lg border border-[#1A65D3]/30 bg-[#1A65D3]/10 px-4 py-3"
          >
            <AlertCircle size={15} className="mt-px shrink-0 text-[#1A65D3]" />
            <p className="text-xs text-[#1A65D3] leading-snug">{authError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <FormInput
        label="Email"
        type="email"
        placeholder="you@club.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <FormInput
        label="Password"
        isPassword
        placeholder="••••••••"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 select-none">
          <CheckboxField registerProps={register('rememberMe')} checked={!!watch('rememberMe')} />
          <span className="text-xs text-text-gray">Remember me</span>
        </label>
        <button
          type="button"
          className="text-xs transition-colors" style={{ color: '#1A65D3' }}
        >
          Forgot password?
        </button>
      </div>

      <motion.button
        type="submit"
        disabled={isLoading}
        whileTap={!isLoading ? { scale: 0.98 } : {}}
        className={[
          'relative h-[52px] w-full rounded-full text-sm font-bold overflow-hidden',
          'bg-white text-[#000000]',
          'hover:bg-white/90 transition-colors duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        ].join(' ')}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
            Signing in…
          </span>
        ) : (
          'Sign In'
        )}
      </motion.button>
    </form>
  );
}

function CheckboxField({ registerProps, checked }: { registerProps: object; checked: boolean }) {
  return (
    <div style={{ position: 'relative', width: 16, height: 16, flexShrink: 0 }}>
      <input
        type="checkbox"
        {...registerProps}
        style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', margin: 0 }}
      />
      <div style={{
        width: 16, height: 16, borderRadius: 4, pointerEvents: 'none',
        border: `1.5px solid ${checked ? '#1A65D3' : 'rgba(255,255,255,0.2)'}`,
        background: checked ? '#1A65D3' : 'transparent',
        transition: 'all 150ms',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && (
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
}
