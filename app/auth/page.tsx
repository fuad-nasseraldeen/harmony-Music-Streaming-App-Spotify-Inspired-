'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorDetails('');

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const errorMsg = 'Supabase configuration is missing. Please check your .env.local file.';
      console.error(errorMsg);
      toast.error(errorMsg);
      setErrorDetails('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
      setLoading(false);
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) {
          console.error('Login error details:', {
            message: error.message,
            status: error.status,
            name: error.name,
          });
          
          let errorMessage = error.message || 'Login failed';
          
          // Provide more helpful error messages
          if (error.message.includes('Invalid login credentials') || error.status === 400) {
            errorMessage = 'Account not found. Click "Sign Up" below to create an account first.';
            toast.error(errorMessage, { duration: 5000 });
            setErrorDetails(`Login failed: ${error.message}\n\n💡 Solution: Click "Sign Up" below to create your account first!\n\nPossible reasons:\n- Account doesn't exist (most likely - sign up first!)\n- Email or password is incorrect\n- Email not confirmed (check your inbox)`);
          } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please confirm your email address before logging in. Check your inbox for the confirmation link.';
            toast.error(errorMessage);
            setErrorDetails(`Email confirmation required: ${error.message}`);
          } else {
            toast.error(errorMessage);
            setErrorDetails(`Error: ${error.message} (Status: ${error.status})`);
          }
          
          setLoading(false);
          return;
        }
        toast.success('Logged in successfully!');
        router.push('/');
      } else {
        // Validate email format before sending to Supabase
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          toast.error('Please enter a valid email address');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        console.log('Attempting signup with:', { email: trimmedEmail, passwordLength: password.length });
        
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: typeof window !== 'undefined' 
              ? `${window.location.origin}/auth/callback`
              : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
          },
        });
        
        console.log('Signup response:', { 
          user: data?.user?.id, 
          session: !!data?.session,
          error: error?.message 
        });
        
        if (error) {
          console.error('Signup error details:', {
            message: error.message,
            status: error.status,
            name: error.name,
            cause: error.cause,
          });
          
          let errorMessage = error.message || 'Failed to create account';
          
          // Provide more helpful error messages
          if (error.message.includes('already registered') || error.message.includes('already exists')) {
            errorMessage = 'This email is already registered. Please login instead.';
            toast.error(errorMessage);
            setTimeout(() => setIsLogin(true), 2000);
          } else if (error.message.includes('invalid') || error.message.includes('Invalid')) {
            errorMessage = `Email validation failed: ${error.message}. This might be a Supabase configuration issue.`;
            toast.error(errorMessage);
          } else if (error.message.includes('rate limit')) {
            errorMessage = 'Too many signup attempts. Please wait a moment and try again.';
            toast.error(errorMessage);
          } else {
            toast.error(errorMessage);
          }
          
          setErrorDetails(`Error: ${error.message} (Status: ${error.status || 'N/A'})`);
          setLoading(false);
          return;
        }
        
        // Check if email confirmation is required
        if (data.user && !data.session) {
          toast.success('Account created! Please check your email to confirm your account before logging in.');
          setErrorDetails('Email confirmation required. Check your inbox.');
        } else if (data.session) {
          toast.success('Account created successfully!');
          router.push('/');
        } else {
          toast.success('Signup completed!');
          router.push('/');
        }
      }
    } catch (error: any) {
      console.error('Unexpected auth error:', error);
      const errorMsg = error?.message || 'An unexpected error occurred';
      toast.error(errorMsg);
      setErrorDetails(`Unexpected error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 to-black">
      <div className="bg-neutral-800 p-8 rounded-lg w-full max-w-md">
        <h1 className="text-white text-3xl font-bold mb-6 text-center">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-neutral-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-white mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-neutral-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        <p className="text-white text-center mt-4">
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setIsLogin(false);
                  setErrorDetails('');
                }}
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setIsLogin(true);
                  setErrorDetails('');
                }}
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Login
              </button>
            </>
          )}
        </p>
        {errorDetails && (
          <div className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm">
            <p className="font-semibold mb-2">⚠️ Error Details:</p>
            <p className="text-xs mt-1 whitespace-pre-line">{errorDetails}</p>
            {errorDetails.includes('Account doesn\'t exist') && !isLogin && (
              <button
                onClick={() => {
                  setIsLogin(false);
                  setErrorDetails('');
                }}
                className="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition"
              >
                Go to Sign Up
              </button>
            )}
            <p className="text-xs mt-3 opacity-75">
              💡 Tip: Check browser console (F12) for more details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
