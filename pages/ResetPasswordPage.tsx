
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { DefaultLogoIcon } from '../components/icons/DefaultLogoIcon';
import ThemeToggle from '../components/ThemeToggle';

const ResetPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();
  const { settings } = useSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError("Please enter your username or email.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setMessage('If an account with that email exists, a password reset link has been sent.');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg dark:bg-gray-800">
        <div className="text-center">
            {settings.appLogo ? (
                <img src={settings.appLogo} alt="Logo Aplikasi" className="w-20 h-20 mx-auto object-contain" />
            ) : (
                <DefaultLogoIcon className="w-16 h-16 mx-auto text-primary-600 dark:text-primary-500" />
            )}
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Reset your password
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Enter your username/email to receive a reset link.
            </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {message ? (
             <div className="p-4 text-center text-green-800 bg-green-100 border-l-4 border-green-500 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600 rounded-md">
                <p>{message}</p>
            </div>
          ) : (
            <>
                <div>
                  <label htmlFor="email-address" className="sr-only">Email address or Username</label>
                  <input
                    id="email-address"
                    name="email"
                    type="text"
                    autoComplete="email"
                    required
                    className="relative block w-full px-3 py-3 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    placeholder="Username or Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-center text-red-500">{error}</p>}
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md group hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 dark:disabled:bg-primary-800 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
            </>
          )}

          <div className="text-sm text-center">
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
              Back to Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
