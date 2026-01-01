import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface LandingPlan {
  name: string;
  price: number | string;
  period: string;
  features: string[];
  recommended?: boolean;
}

interface PaymentPlan extends LandingPlan {
  id: string;
  description: string;
}

export default function PaymentRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'plan' | 'payment' | 'success'>('plan');
  const [paymentType, setPaymentType] = useState<'subscription' | 'one-time'>('subscription');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState(0);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Fetch plans from landing settings API
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/landing/settings');
      if (response.ok) {
        const data = await response.json();
        const landingContent = data.landing_content || data.landingContent;
        if (landingContent?.plans && Array.isArray(landingContent.plans)) {
          // Transform landing plans to payment plans format
          const transformedPlans = landingContent.plans.map((plan: LandingPlan, index: number) => ({
            id: plan.name.toLowerCase().replace(/\s+/g, '-'),
            name: plan.name,
            price: plan.price,
            period: plan.period || '/mo',
            features: plan.features || [],
            recommended: plan.recommended || false,
            description: plan.features?.[0] || 'Business plan'
          }));
          setPlans(transformedPlans);
        }
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      // Fallback to default plans if API fails
      setPlans([
        { id: 'starter', name: 'Starter', price: 29, period: '/mo', features: ['1 User Admin', 'Basic POS', 'Inventory Mgmt', '100 Products', 'Email Support'], description: 'Perfect for small businesses' },
        { id: 'professional', name: 'Professional', price: 79, period: '/mo', features: ['5 Users', 'Advanced POS & Returns', 'Finance Module', 'Unlimited Products', 'Priority Support', 'Membership System'], recommended: true, description: 'For growing businesses' },
        { id: 'enterprise', name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited Users', 'Multi-Branch Support', 'Dedicated Manager', 'API Access', 'White Labeling'], description: 'For large organizations' }
      ]);
    } finally {
      setPlansLoading(false);
    }
  };

  const handlePlanSelect = (plan: PaymentPlan) => {
    setSelectedPlan(plan.id);
    // Convert price to number, handle "Custom" price
    const planPrice = typeof plan.price === 'string' && plan.price.toLowerCase() === 'custom' 
      ? 0 
      : Number(plan.price);
    setAmount(planPrice);
    setStep('payment');
  };

  const handlePaymentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);
      const cardNumber = formData.get('cardNumber') as string;
      const cardLastFour = cardNumber.slice(-4);
      const cardBrand = detectCardBrand(cardNumber);

      const response = await fetch('/api/add-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentType,
          planId: selectedPlan,
          amount,
          cardLastFour,
          cardBrand,
          billingCycleStart: new Date(),
          billingCycleEnd: new Date(Date.now() + (paymentType === 'subscription' ? 30 * 24 * 60 * 60 * 1000 : 0))
        })
      });

      if (response.ok) {
        setStep('success');
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Payment submission failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const detectCardBrand = (cardNumber: string) => {
    const patterns = {
      visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
      mastercard: /^5[1-5][0-9]{14}$/,
      amex: /^3[47][0-9]{13}$/,
      discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/
    };

    for (const [brand, pattern] of Object.entries(patterns)) {
      if (pattern.test(cardNumber.replace(/\s+/g, ''))) return brand;
    }
    return 'unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Complete Your Registration</h1>
          <p className="text-gray-600">Select a plan and add payment details to activate your account</p>
        </div>

        {/* Plan Selection Step */}
        {step === 'plan' && (
          <div>
            {plansLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading plans...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => handlePlanSelect(plan)}
                    className={`p-6 rounded-lg transition transform hover:scale-105 ${
                      selectedPlan === plan.id
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-white text-gray-900 shadow-md hover:shadow-lg'
                    }`}
                  >
                    {plan.recommended && (
                      <div className="mb-2 inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                        RECOMMENDED
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-3xl font-bold mb-2">
                      {typeof plan.price === 'string' && plan.price.toLowerCase() === 'custom' 
                        ? 'Custom' 
                        : `₦${Number(plan.price).toFixed(2)}`}
                    </p>
                    {plan.period && <p className="text-sm text-gray-500 mb-2">{plan.period}</p>}
                    <p className={selectedPlan === plan.id ? 'text-indigo-100' : 'text-gray-600 text-sm'}>{plan.description}</p>
                    {plan.features && plan.features.length > 0 && (
                      <ul className="text-sm mt-4 space-y-1">
                        {plan.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx} className={selectedPlan === plan.id ? 'text-indigo-100' : 'text-gray-600'}>
                            • {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    <button className="mt-4 w-full py-2 rounded bg-opacity-20 hover:bg-opacity-30 transition">
                      Select
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payment Form Step */}
        {step === 'payment' && (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Complete Your Payment</h2>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {/* Selected Plan */}
            <div className="mb-8 p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-gray-600">Selected Plan</p>
              <p className="text-xl font-bold text-indigo-600">₦{amount.toFixed(2)}</p>
            </div>

            {/* Payment Link Option */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-3">💳 Online Payment Link</h3>
              <p className="text-gray-600 mb-4">Use the payment link below to complete your card payment securely:</p>
              <a
                href="https://sandbox.flutterwave.com/pay/shs2heoecs27"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center font-bold"
              >
                🔗 Complete Payment Here
              </a>
              <p className="text-xs text-gray-500 mt-2">You will be redirected to our secure payment portal</p>
            </div>

            <hr className="my-8" />

            <p className="text-2xl font-bold text-gray-900 mb-2">Bank Transfer</p>
            <p className="text-gray-600 mb-4">You can also send to our bank account and forward the evidence to: <strong>payments@jobiz.ng</strong></p>
            <p className="text-lg font-bold text-gray-900 mb-4">Gintec Global Services. FCMB. <b>466 511 6017</b></p>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => setStep('plan')}
                className="w-full px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Back to Plans
              </button>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="text-6xl mb-4">✓</div>
            <h2 className="text-3xl font-bold text-green-600 mb-2">Payment Submitted</h2>
            <p className="text-gray-600 mb-6">
              Your payment has been submitted for approval. Our admin team will review it shortly.
              You'll receive an email notification once your account is activated.
            </p>
            <p className="text-sm text-gray-500">Redirecting...</p>
          </div>
        )}
      </div>
    </div>
  );
}
