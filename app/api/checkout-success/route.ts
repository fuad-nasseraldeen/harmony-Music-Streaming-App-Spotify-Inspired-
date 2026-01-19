import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/graphql/context';
import { supabaseAdmin } from '@/lib/supabase';

// This endpoint is called when user returns from successful checkout
// It directly saves the subscription to the database
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('Processing checkout success for session:', sessionId);

    // Get checkout session from Stripe
    let checkoutSession;
    try {
      checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
      console.log('Checkout session retrieved:', {
        id: checkoutSession.id,
        subscription: checkoutSession.subscription,
        status: checkoutSession.status,
      });
    } catch (error: any) {
      console.error('Error retrieving checkout session:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve checkout session', details: error.message },
        { status: 500 }
      );
    }

    if (!checkoutSession.subscription) {
      console.error('No subscription in checkout session:', checkoutSession);
      return NextResponse.json(
        { error: 'No subscription found in checkout session', sessionStatus: checkoutSession.status },
        { status: 404 }
      );
    }

    const userId = session.user.id;

    // Get full subscription details
    const subscriptionId = checkoutSession.subscription as string;
    
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      console.error('Invalid subscription ID:', subscriptionId);
      return NextResponse.json(
        { error: 'Invalid subscription ID in checkout session', subscriptionId },
        { status: 400 }
      );
    }

    let stripeSubscription;
    // Retry logic - sometimes Stripe needs a moment
    let retries = 3;
    let lastError;
    
    while (retries > 0) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        console.log('Subscription retrieved:', {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          userId,
        });
        break; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;
        console.error(`Error retrieving subscription (${retries} retries left):`, error.message);
        retries--;
        
        if (retries > 0) {
          // Wait 1 second before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!stripeSubscription) {
      console.error('Failed to retrieve subscription after retries:', lastError);
      return NextResponse.json(
        { 
          error: 'Failed to retrieve subscription', 
          details: lastError?.message || 'Unknown error',
          subscriptionId,
        },
        { status: 500 }
      );
    }

    // Get price ID and ensure it exists in database
    const priceId = stripeSubscription.items.data[0]?.price?.id;
    
    if (priceId) {
      // Check if price exists, if not create it
      // Use admin client to bypass RLS
      const { data: existingPrice } = await supabaseAdmin
        .from('prices')
        .select('id')
        .eq('id', priceId)
        .single();

      if (!existingPrice) {
        console.log('Price not found in DB, syncing from Stripe...');
        try {
          const stripePrice = await stripe.prices.retrieve(priceId);
          const productId = stripePrice.product as string;
          
          // Check if product exists
          const { data: existingProduct } = await supabaseAdmin
            .from('products')
            .select('id')
            .eq('id', productId)
            .single();

          if (!existingProduct) {
            const stripeProduct = await stripe.products.retrieve(productId);
            await supabaseAdmin.from('products').upsert({
              id: stripeProduct.id,
              active: stripeProduct.active,
              name: stripeProduct.name,
              description: stripeProduct.description,
              image: stripeProduct.images?.[0] || null,
              metadata: stripeProduct.metadata || {},
            } as any);
          }

          // Save price
          await supabaseAdmin.from('prices').upsert({
            id: stripePrice.id,
            product_id: productId,
            active: stripePrice.active,
            description: stripePrice.nickname || null,
            unit_amount: stripePrice.unit_amount,
            currency: stripePrice.currency,
            type: stripePrice.type,
            interval: stripePrice.recurring?.interval || null,
            interval_count: stripePrice.recurring?.interval_count || null,
            trial_period_days: stripePrice.recurring?.trial_period_days || null,
            metadata: stripePrice.metadata || {},
          } as any);
        } catch (priceError: any) {
          console.error('Error syncing price:', priceError);
        }
      }
    }

    // Helper function to safely convert Unix timestamp to ISO string
    const toISOString = (timestamp: number | null | undefined): string | null => {
      if (!timestamp || typeof timestamp !== 'number' || isNaN(timestamp)) {
        return null;
      }
      try {
        const date = new Date(timestamp * 1000);
        if (isNaN(date.getTime())) {
          return null;
        }
        return date.toISOString();
      } catch (error) {
        console.error('Error converting timestamp:', timestamp, error);
        return null;
      }
    };

    // Save subscription to database
    const subscriptionData = {
      id: stripeSubscription.id,
      user_id: userId,
      status: stripeSubscription.status,
      metadata: stripeSubscription.metadata || {},
      price_id: priceId || null,
      quantity: stripeSubscription.items.data[0]?.quantity || 1,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
      created: toISOString(stripeSubscription.created) || new Date().toISOString(),
      current_period_start: toISOString(stripeSubscription.current_period_start) || new Date().toISOString(),
      current_period_end: toISOString(stripeSubscription.current_period_end) || new Date().toISOString(),
      ended_at: toISOString(stripeSubscription.ended_at),
      cancel_at: toISOString(stripeSubscription.cancel_at),
      canceled_at: toISOString(stripeSubscription.canceled_at),
      trial_start: toISOString(stripeSubscription.trial_start),
      trial_end: toISOString(stripeSubscription.trial_end),
    };

    console.log('Saving subscription with data:', {
      id: subscriptionData.id,
      status: subscriptionData.status,
      created: subscriptionData.created,
    });

    // Use admin client to bypass RLS for subscriptions and users tables
    const { error: upsertError } = await supabaseAdmin.from('subscriptions').upsert(subscriptionData as any);

    if (upsertError) {
      console.error('Error saving subscription:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save subscription', details: upsertError.message },
        { status: 500 }
      );
    }

    // Update user's is_subscribed status
    const isSubscribed = stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing';
    const { error: updateError } = await (supabaseAdmin.from('users') as any)
      .update({ is_subscribed: isSubscribed })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user:', updateError);
    }

    return NextResponse.json({
      success: true,
      subscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      isSubscribed,
    });
  } catch (error: any) {
    console.error('Checkout success error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process checkout success' },
      { status: 500 }
    );
  }
}
