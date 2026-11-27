import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuthLayout } from '../layouts/AuthLayout';
import { getApiErrorMessage } from '../utils/formatters';

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
    email: z.string().trim().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Must include at least one letter')
      .regex(/[0-9]/, 'Must include at least one number'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerAccount(values.name, values.email, values.password);
      toast.success('Your Vehixa workspace is ready.', 'Account Created');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const msg = getApiErrorMessage(error, 'Registration failed. Please try again.');
      setServerError(msg);
      toast.error(msg, 'Registration Failed');
    }
  };

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Set up your personal vehicle finance and tracking workspace."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318] dark:border-[#5C2320] dark:bg-[#2B1514] dark:text-[#FCA5A5]">
            {serverError}
          </div>
        )}

        <Input
          label="Full name"
          type="text"
          autoComplete="name"
          placeholder="Aarav Mehta"
          error={errors.name?.message}
          {...register('name')}
        />

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
          autoComplete="new-password"
          placeholder="8+ chars with letters & numbers"
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Create account
        </Button>

        <p className="text-center text-sm text-[#5C615A] dark:text-[#B0B4AD]">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-[#171A18] underline decoration-[#C5F467] decoration-2 underline-offset-4 dark:text-[#F4F3ED]">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
