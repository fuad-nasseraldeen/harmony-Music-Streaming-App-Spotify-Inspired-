'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { graphqlRequest, queries } from '@/lib/graphql';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { HiStar } from 'react-icons/hi';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  description?: string;
  image?: string;
  prices: Price[];
}

interface Price {
  id: string;
  active: boolean;
  unitAmount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  trialPeriodDays?: number;
}

interface SubscriptionLite {
  id: string;
  status?: string | null;
  currentPeriodEnd?: string | null;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const setOptimisticSubscribed = useSubscriptionStore((s) => s.setOptimisticSubscribed);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionLite | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptionData = useCallback(async () => {
    try {
      const [productsData, subscriptionData, userData] = await Promise.all([
        graphqlRequest<{ activeProductsWithPrices: Product[] }>(queries.getProducts),
        user
          ? graphqlRequest<{ subscription: SubscriptionLite | null }>(
              `query { subscription { id status currentPeriodEnd } }`
            ).catch(() => ({ subscription: null }))
          : Promise.resolve({ subscription: null }),
        user
          ? graphqlRequest<{ user: { isSubscribed: boolean } | null }>(`query { user { isSubscribed } }`).catch(
              () => ({ user: null })
            )
          : Promise.resolve({ user: null }),
      ]);
      
      setProducts(productsData.activeProductsWithPrices || []);
      setSubscription(subscriptionData.subscription);
      
      // If user has isSubscribed but no subscription record, sync it
      if (user && userData.user?.isSubscribed && !subscriptionData.subscription) {
        // Sync subscription status
        try {
          await fetch('/api/sync-subscription', { method: 'POST' });
          // Refetch subscription after sync
          const refreshed = await graphqlRequest<{ subscription: SubscriptionLite | null }>(
            `query { subscription { id status currentPeriodEnd } }`
          ).catch(() => ({ subscription: null }));
          setSubscription(refreshed.subscription);
        } catch (syncError) {
          console.error('Sync error:', syncError);
        }
      }
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Allow viewing plans without login, but require login for checkout
    fetchSubscriptionData();
  }, [fetchSubscriptionData, userLoading]);

  // Refresh subscription when returning from Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'subscription' && user) {
      // Sync subscription status immediately
      const syncAndRefresh = async () => {
        try {
          console.log('Syncing subscription after checkout...');
          // First sync with Stripe
          const syncResponse = await fetch('/api/sync-subscription', { method: 'POST' });
          const syncData = await syncResponse.json();
          console.log('Sync response:', syncData);
          
          // Optimistically unlock playback immediately
          setOptimisticSubscribed(true);

          // Trigger subscription refresh event
          window.dispatchEvent(new Event('subscription-refresh'));
          
          // Wait a bit for database to update
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Then refresh data
          await fetchSubscriptionData();
          
          // Trigger refresh again after data fetch
          window.dispatchEvent(new Event('subscription-refresh'));
          
          if (syncData.isSubscribed) {
            toast.success('Subscription activated! Welcome to Premium!');
          } else {
            toast.success('Subscription processing... Please refresh in a moment.');
          }
        } catch (error) {
          console.error('Sync error:', error);
          toast.error('Failed to sync subscription. Please refresh the page.');
          // Still refresh in case webhook already processed it
          setTimeout(() => {
            fetchSubscriptionData();
            window.dispatchEvent(new Event('subscription-refresh'));
          }, 3000);
        }
      };
      
      syncAndRefresh();
      // Remove query param
      window.history.replaceState({}, '', '/subscription');
    }
  }, [user, fetchSubscriptionData, setOptimisticSubscribed]);

  const handleCheckout = async (priceId?: string) => {
    if (!user) {
      toast.error('Please login first to subscribe');
      router.push('/auth');
      return;
    }

    try {
      let finalPriceId = priceId;

      // If no priceId provided (fallback plan), create product/price first
      if (!finalPriceId || finalPriceId === 'price_premium_10') {
        toast.loading('Setting up subscription plan...', { id: 'setup' });
        
        try {
          const setupResponse = await fetch('/api/create-product-price', {
            method: 'POST',
          });
          
          const setupData = await setupResponse.json();
          
          if (!setupResponse.ok) {
            throw new Error(setupData.error || 'Failed to create plan');
          }
          
          if (setupData.priceId) {
            finalPriceId = setupData.priceId;
            toast.dismiss('setup');
            console.log('Created price ID:', finalPriceId);
          } else {
            console.error('No priceId in response:', setupData);
            throw new Error('Failed to create plan. No price ID returned.');
          }
        } catch (setupError: unknown) {
          const message =
            setupError instanceof Error ? setupError.message : 'Failed to create subscription plan';
          console.error('Setup error:', setupError);
          toast.error(message, { id: 'setup' });
          return;
        }
      }

      if (!finalPriceId) {
        console.error('No price ID available after setup');
        throw new Error('Price ID is required. Failed to set up subscription plan.');
      }

      console.log('Creating checkout with price ID:', finalPriceId);
      toast.loading('Redirecting to checkout...', { id: 'checkout' });

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: finalPriceId }),
      });

      const { sessionId, url, error } = await response.json();

      if (error || (!sessionId && !url)) {
        throw new Error(error || 'Failed to create checkout session');
      }

      toast.dismiss('checkout');
      
      // Redirect directly to checkout URL (new Stripe.js approach)
      if (url) {
        window.location.href = url;
      } else {
        // Fallback: redirect to Stripe checkout with sessionId
        window.location.href = `https://checkout.stripe.com/pay/${sessionId}`;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start checkout';
      console.error('Checkout error:', error);
      toast.error(message);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
      });

      const { url, error } = await response.json();

      if (error || !url) {
        throw new Error(error || 'Failed to create portal session');
      }

      window.location.href = url;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to open customer portal';
      console.error('Portal error:', error);
      toast.error(message);
    }
  };

  const formatPrice = (price: Price) => {
    const amount = price.unitAmount / 100;
    const currency = price.currency.toUpperCase();
    const interval = price.interval;

    const symbol = currency === 'USD' ? '$' : `${currency} `;
    return `${symbol}${amount}/${interval === 'month' ? 'mo' : interval}`;
  };

  // Check subscription status from both subscription table and user table
  const [userIsSubscribed, setUserIsSubscribed] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUserSubscription = async () => {
      if (!user) {
        setUserIsSubscribed(false);
        return;
      }

      try {
        const userData = await graphqlRequest<{ user: { isSubscribed: boolean } }>(
          `query { user { isSubscribed } }`
        );
        setUserIsSubscribed(userData.user?.isSubscribed ?? false);
      } catch (error) {
        console.error('Error checking user subscription:', error);
        setUserIsSubscribed(false);
      }
    };

    checkUserSubscription();
  }, [user]);

  const storeIsSubscribed = useSubscriptionStore((s) => s.isSubscribed);
  const isSubscribed =
    subscription?.status === 'active' ||
    subscription?.status === 'trialing' ||
    userIsSubscribed === true ||
    storeIsSubscribed === true;

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-purple-900 to-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // If subscribed, show premium member view
  if (isSubscribed && user) {
    const periodEnd = subscription?.currentPeriodEnd 
      ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
      : null;

    return (
      <div className="bg-gradient-to-b from-purple-900 to-black min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-8 mb-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <HiStar size={48} className="text-white mr-3" />
              <h1 className="text-white text-5xl font-bold">Premium Member</h1>
            </div>
            <p className="text-white/90 text-xl mb-2">You&apos;re enjoying all Premium features!</p>
            <p className="text-white/70 text-sm">
              {subscription?.status === 'trialing' 
                ? 'Currently on free trial' 
                : periodEnd 
                  ? `Subscription active until ${periodEnd}`
                  : 'Active subscription'}
            </p>
          </div>

          <div className="bg-neutral-800 rounded-lg p-6 mb-6">
            <h2 className="text-white text-2xl font-bold mb-4">Premium Benefits</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <span className="text-green-500 text-2xl">✓</span>
                <div>
                  <h3 className="text-white font-semibold">Unlimited Streaming</h3>
                  <p className="text-neutral-400 text-sm">Stream all your favorite music without limits</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-500 text-2xl">✓</span>
                <div>
                  <h3 className="text-white font-semibold">Ad-Free Experience</h3>
                  <p className="text-neutral-400 text-sm">Enjoy music without interruptions</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-500 text-2xl">✓</span>
                <div>
                  <h3 className="text-white font-semibold">High Quality Audio</h3>
                  <p className="text-neutral-400 text-sm">Premium sound quality for the best experience</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-500 text-2xl">✓</span>
                <div>
                  <h3 className="text-white font-semibold">Download for Offline</h3>
                  <p className="text-neutral-400 text-sm">Take your music anywhere, even offline</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleManageSubscription}
              className="bg-white text-black px-8 py-3 rounded-md font-semibold hover:bg-neutral-200 transition text-lg"
            >
              Manage Subscription
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-purple-900 to-black min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-white text-4xl font-bold mb-2">Upgrade to Premium</h1>
        <p className="text-neutral-400 mb-8">Unlock unlimited music streaming</p>

        {/* Test Card Info Tooltip */}
        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-blue-400 text-xl">💳</div>
            <div>
              <h3 className="text-white font-semibold mb-1">Test Payment</h3>
              <p className="text-blue-200 text-sm">
                Use test card: <span className="font-mono font-bold text-white">4242 4242 4242 4242</span>
              </p>
              <p className="text-blue-300/80 text-xs mt-1">
                Any future expiry date, any CVC, any ZIP code
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-neutral-800 rounded-lg p-6 border border-neutral-700"
            >
              <h3 className="text-white text-2xl font-bold mb-2">{product.name}</h3>
              {product.description && (
                <p className="text-neutral-400 mb-4">{product.description}</p>
              )}

              <div className="mb-6">
                {product.prices && product.prices.length > 0 && (
                  <>
                    <div className="text-white text-3xl font-bold mb-2">
                      {formatPrice(product.prices[0])}
                    </div>
                    {product.prices[0].trialPeriodDays && (
                      <p className="text-green-400 text-sm">
                        {product.prices[0].trialPeriodDays} day free trial
                      </p>
                    )}
                  </>
                )}
              </div>

              <ul className="space-y-2 mb-6">
                <li className="text-neutral-300 flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Unlimited streaming
                </li>
                <li className="text-neutral-300 flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Ad-free experience
                </li>
                <li className="text-neutral-300 flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  High quality audio
                </li>
                <li className="text-neutral-300 flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Download for offline
                </li>
              </ul>

              {product.prices && product.prices.length > 0 && (
                <button
                  onClick={() => handleCheckout(product.prices[0].id)}
                  disabled={isSubscribed}
                  className={`w-full py-3 rounded-md font-semibold transition ${
                    isSubscribed
                      ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                >
                  {isSubscribed ? 'Current Plan' : 'Subscribe'}
                </button>
              )}
            </div>
          ))}
        </div>

        {products.length === 0 && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6 max-w-md mx-auto">
            <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
              <h3 className="text-white text-2xl font-bold mb-2">Premium Plan</h3>
              <p className="text-neutral-400 mb-4">Unlock unlimited music streaming</p>

              <div className="mb-6">
                <div className="text-white text-3xl font-bold mb-2">$10/mo</div>
              </div>

              <ul className="space-y-2 mb-6">
                <li className="text-neutral-300 flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Unlimited streaming
                </li>
                <li className="text-neutral-300 flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Ad-free experience
                </li>
                <li className="text-neutral-300 flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  High quality audio
                </li>
                <li className="text-neutral-300 flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Download for offline
                </li>
              </ul>

              <button
                onClick={() => handleCheckout()}
                disabled={isSubscribed}
                className={`w-full py-3 rounded-md font-semibold transition ${
                  isSubscribed
                    ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                {isSubscribed ? 'Current Plan' : 'Subscribe - $10/month'}
              </button>
              
              <p className="text-neutral-500 text-xs mt-4 text-center">
                Note: You need to create a $10/month price in Stripe first
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
