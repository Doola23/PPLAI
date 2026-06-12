import Logo from '../../components/ui/Logo';
import { useState, forwardRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { CheckCircle } from '@phosphor-icons/react';
import { useAuth } from '../../hooks/useAuth';

const signupSchema = z
  .object({
    name:            z.string().min(2, 'At least 2 characters'),
    email:           z.string().min(1, 'Required').email('Enter a valid email'),
    password:        z.string().min(8, 'Min 8 characters').regex(/[A-Z]/, 'Add an uppercase letter').regex(/[0-9]/, 'Add a number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    terms:           z.literal(true, { error: 'Required' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupInputs = z.infer<typeof signupSchema>;

const ease = [0.22, 1, 0.36, 1] as const;
const stagger = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.5, ease },
});

const gridStyle: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
  backgroundSize: '48px 48px',
};

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ chars',  ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Number',    ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  if (!password) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex flex-col gap-2 pt-1"
    >
      <div className="flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[2px] flex-1 rounded-full transition-all duration-300"
            style={{
              background:
                i < score
                  ? score === 3 ? '#1A65D3' : score === 2 ? 'rgba(26,101,211,0.6)' : '#1A65D3'
                  : '#939A9E',
            }}
          />
        ))}
        <span className="text-[10px] ml-2 font-medium" style={{ color: score === 3 ? '#1A65D3' : score === 2 ? 'rgba(26,101,211,0.7)' : '#1A65D3' }}>
          {['', 'Weak', 'Fair', 'Strong'][score]}
        </span>
      </div>
      <div className="flex gap-4">
        {checks.map((c) => (
          <span key={c.label} className="flex items-center gap-1.5 text-[10px]" style={{ color: c.ok ? '#1A65D3' : '#939A9E' }}>
            <CheckCircle size={9} weight={c.ok ? 'fill' : 'regular'} />
            {c.label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-medium text-white/35 tracking-[0.12em] uppercase">{label}</label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-[11px] leading-snug" style={{ color: '#ef4444' }}>
          <AlertCircle size={10} />
          {error}
        </p>
      )}
    </div>
  );
}

const LineInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: string; isPassword?: boolean }>(function LineInput(
  { error, isPassword, ...props }, ref
) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        type={isPassword ? (show ? 'text' : 'password') : props.type}
        className={[
          'w-full h-11 px-0 text-sm text-text-white bg-transparent',
          'border-0 border-b transition-all duration-200 outline-none',
          'placeholder:text-white/18',
          isPassword ? 'pr-7' : '',
          error
            ? 'border-b-red-500/60 focus:border-b-red-500'
            : 'border-b-white/10 focus:border-b-[#1A65D3]',
        ].join(' ')}
      />
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-0 top-1/2 -translate-y-1/2 text-white/22 hover:text-white/55 transition-colors"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
    </div>
  );
});

export default function SignupPage() {
  const navigate  = useNavigate();
  const { signup } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading]     = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignupInputs>({
    resolver: zodResolver(signupSchema),
    defaultValues: { terms: undefined as unknown as true },
  });

  const passwordValue = watch('password', '');
  const termsChecked  = watch('terms');

  const onSubmit = async (data: SignupInputs) => {
    setIsLoading(true);
    setServerError(null);
    try {
      await signup(data.name, data.email, data.password);
      navigate('/onboarding', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setServerError(msg ?? 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex overflow-hidden bg-bg-black" style={gridStyle}>

      <section className="w-full md:w-[52%] lg:w-[48%] flex flex-col justify-between px-10 py-8 md:px-14 lg:px-20 overflow-y-auto">

        <motion.div {...stagger(0)} className="flex items-center justify-between shrink-0">
          <Logo height={20} />
          <span className="text-[10px] tracking-[0.14em] text-white/20 uppercase font-medium">
            Analytics
          </span>
        </motion.div>

        <div className="flex flex-col gap-6 my-auto py-6">

          <motion.div {...stagger(1)} className="flex flex-col gap-3">

            <h1
              className="font-heading font-black tracking-tight leading-[1.02] text-text-white"
              style={{ fontSize: 'clamp(2.2rem, 3.6vw, 3rem)' }}
            >
              Start winning<br />with data.
            </h1>
          </motion.div>

          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2.5 rounded-lg border border-[#1A65D3]/25 bg-[#1A65D3]/8 px-4 py-3"
              >
                <AlertCircle size={13} style={{ color: '#1A65D3' }} className="shrink-0" />
                <p className="text-xs leading-snug" style={{ color: '#1A65D3' }}>{serverError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-6"
            {...stagger(2)}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
              <Field label="Full name" error={errors.name?.message}>
                <LineInput
                  placeholder="Mo Salah"
                  autoComplete="name"
                  error={errors.name?.message}
                  {...register('name')}
                />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <LineInput
                  type="email"
                  placeholder="you@club.com"
                  autoComplete="email"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </Field>
            </div>

            <Field label="Password" error={errors.password?.message}>
              <LineInput
                isPassword
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />
              <AnimatePresence>
                {passwordValue && <PasswordStrength password={passwordValue} />}
              </AnimatePresence>
            </Field>

            <Field label="Confirm password" error={errors.confirmPassword?.message}>
              <LineInput
                isPassword
                placeholder="Repeat password"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </Field>

            <div className="flex flex-col gap-1.5">
              <label className="flex cursor-pointer items-start gap-3 select-none group">
                <div className="relative mt-0.5 shrink-0">
                  <div
                    style={{
                      position: 'relative', width: 16, height: 16, flexShrink: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      {...register('terms')}
                      style={{
                        position: 'absolute', inset: 0, opacity: 0,
                        width: '100%', height: '100%', cursor: 'pointer', margin: 0,
                      }}
                    />
                    <div
                      style={{
                        width: 16, height: 16, borderRadius: 4, pointerEvents: 'none',
                        border: `1.5px solid ${termsChecked ? '#1A65D3' : 'rgba(255,255,255,0.2)'}`,
                        background: termsChecked ? '#1A65D3' : 'transparent',
                        transition: 'all 150ms',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {termsChecked && (
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-white/35 leading-relaxed group-hover:text-white/50 transition-colors">
                  I agree to the{' '}
                  <span className="text-white/55 hover:text-white cursor-pointer transition-colors">Terms of Service</span>
                  {' '}and{' '}
                  <span className="text-white/55 hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
                </span>
              </label>
              {errors.terms && (
                <p className="flex items-center gap-1.5 text-[11px]" style={{ color: '#ef4444' }}>
                  <AlertCircle size={10} />
                  {errors.terms.message}
                </p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={!isLoading ? { scale: 0.985 } : {}}
              className="relative h-[52px] w-full rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              style={{ background: '#1A65D3', color: '#F2F2F2' }}
              onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLElement).style.background = '#1453B0'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#1A65D3'; }}
            >
              {isLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-70" />
                  </svg>
                  Creating account…
                </>
              ) : (
                <>
                  Create Account
                </>
              )}
            </motion.button>
          </motion.form>

          <motion.div {...stagger(3)} className="flex items-center gap-4">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] text-white/20">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </motion.div>

          <motion.button
            {...stagger(4)}
            type="button"
            className="w-full h-11 flex items-center justify-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.14] transition-all duration-200 text-sm text-white/50 font-medium"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign up with Google
          </motion.button>

        </div>

        <motion.div {...stagger(5)} className="flex items-center justify-between shrink-0">
          <p className="text-[11px] text-white/25">
            Already have an account?{' '}
            <Link to="/login" className="text-white/50 hover:text-white transition-colors">
              Sign in
            </Link>
          </p>
          <p className="text-[11px] text-white/20">
            <span className="hover:text-white/40 cursor-pointer transition-colors">Terms</span>
            {' · '}
            <span className="hover:text-white/40 cursor-pointer transition-colors">Privacy</span>
          </p>
        </motion.div>

      </section>

      <section className="hidden md:block flex-1 relative m-3 ml-0">
        <div className="absolute inset-0 rounded-[20px] overflow-hidden bg-black">

          <video
            autoPlay muted loop playsInline
            src="/ball.mp4"
            className="absolute inset-0 w-full h-full object-cover scale-[0.6] -translate-y-16"
          />

          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.25)' }} />

          <div className="absolute top-6 left-6">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium tracking-[0.12em] uppercase"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#F2F2F2', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#F2F2F2', animation: 'pulse 2s infinite' }} />
              Live Platform
            </div>
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="w-full h-px bg-white/[0.1] mb-5" />
            <div className="grid grid-cols-3 gap-1">
              {[
                { value: '94%',  label: 'Match prediction accuracy' },
                { value: '500+', label: 'Players tracked' },
                { value: '20',   label: 'Premier League clubs' },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="font-heading font-black text-white leading-none tracking-tight text-[1.6rem]">{value}</span>
                  <span className="text-[11px] text-white/35 leading-snug">{label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
