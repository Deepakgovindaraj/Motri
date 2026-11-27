import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuthLayout } from '../layouts/AuthLayout';
import { getApiErrorMessage } from '../utils/formatters';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      toast.success('Signed in to your Vehixa workspace.', 'Welcome Back');
      navigate(from, { replace: true });
    } catch (error) {
      const msg = getApiErrorMessage(error, 'Unable to sign in. Check your credentials.');
      setServerError(msg);
      toast.error(msg, 'Sign In Failed');
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your vehicles, financial ledger, and trip telemetry."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {serverError && (
          <div className="rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318] dark:border-[#5C2320] dark:bg-[#2B1514] dark:text-[#FCA5A5]">
            {serverError}
          </div>
        )}

        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Sign in
        </Button>

        <p className="text-center text-sm text-[#5C615A] dark:text-[#B0B4AD]">
          New to Vehixa?{' '}
          <Link to="/register" className="font-semibold text-[#171A18] underline decoration-[#C5F467] decoration-2 underline-offset-4 dark:text-[#F4F3ED]">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
