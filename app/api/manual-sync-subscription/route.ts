import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/graphql/context';

// Manual sync endpoint - can be called with sessionId or subscriptionId
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

    const userId = session.user.id;
    const body = await request.json();
    const { sessionId, subscriptionId } = body;

    let stripeSubscription: any = null;

    // If sessionId provided, get subscription from session
    if (sessionId) {
      try {
        const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
        if (checkoutSession.subscription) {
          stripeSubscription = await stripe.subscriptions.retrieve(
            checkoutSession.subscription as string
          );
        }
      } catch (error) {
        console.error('Error retrieving session:', error);
      }
    }

    // If subscriptionId provided, get subscription directly
    if (!stripeSubscription && subscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      } catch (error) {
        console.error('Error retrieving subscription:', error);
      }
    }

    // If no subscription found, try to find by customer
    if (!stripeSubscription) {
      try {
        if (session.user.email) {
          const customers = await stripe.customers.list({
            email: session.user.email,
            limit: 1,
          });

          if (customers.data.length > 0) {
            const subscriptions = await stripe.subscriptions.list({
              customer: customers.data[0].id,
              status: 'all',
              limit: 10,
            });

            const activeSub = subscriptions.data.find(
              (sub) => sub.status === 'active' || sub.status === 'trialing'
            );

            if (activeSub) {
              stripeSubscription = activeSub;
            }
          }
        }
      } catch (error) {
        console.error('Error finding subscription by customer:', error);
      }
    }

    if (!stripeSubscription) {
      return NextResponse.json({
        error: 'No subscription found',
        userId,
        email: session.user.email,
      }, { status: 404 });
    }

    // Sync subscription to database
    const { error: upsertError } = await supabase.from('subscriptions').upsert({
      id: stripeSubscription.id,
      user_id: userId,
      status: stripeSubscription.status,
      metadata: stripeSubscription.metadata || {},
      price_id: stripeSubscription.items.data[0]?.price?.id || null,
      quantity: stripeSubscription.items.data[0]?.quantity || 1,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
      created: new Date(stripeSubscription.created * 1000).toISOString(),
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      ended_at: stripeSubscription.ended_at ? new Date(stripeSubscription.ended_at * 1000).toISOString() : null,
      cancel_at: stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000).toISOString() : null,
      canceled_at: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000).toISOString() : null,
      trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000).toISOString() : null,
      trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
    } as any);

    if (upsertError) {
      console.error('Error upserting subscription:', upsertError);
      return NextResponse.json(
        { error: 'Failed to sync subscription', details: upsertError.message },
        { status: 500 }
      );
    }

    // Update user's is_subscribed status
    const isSubscribed = stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing';
    const { error: updateError } = await (supabase.from('users') as any)
      .update({ is_subscribed: isSubscribed })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user is_subscribed:', updateError);
    }

    return NextResponse.json({
      success: true,
      subscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      isSubscribed,
      message: 'Subscription synced successfully',
    });
  } catch (error: any) {
    console.error('Manual sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync subscription' },
      { status: 500 }
    );
  }
}
