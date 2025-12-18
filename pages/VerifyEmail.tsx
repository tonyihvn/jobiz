import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('No verification token provided. Please check your email link.');
        return;
      }

      try {
        const response = await fetch('/api/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        if (response.ok) {
          setStatus('success');
          setMessage('Email verified successfully! Redirecting to payment form...');
          setTimeout(() => {
            navigate('/payment-registration');
          }, 2000);
        } else {
          const data = await response.json();
          setStatus('error');
          setMessage(data.error || 'Failed to verify email. Link may be expired.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          {status === 'verifying' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Email</h1>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="text-5xl mb-4">✓</div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">Email Verified</h1>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="text-5xl mb-4">✗</div>
              <h1 className="text-2xl font-bold text-red-600 mb-2">Verification Failed</h1>
            </>
          )}
          <p className="text-gray-600 mt-4">{message}</p>
          
          {status === 'error' && (
            <button
              onClick={() => navigate('/register')}
              className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Back to Registration
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
