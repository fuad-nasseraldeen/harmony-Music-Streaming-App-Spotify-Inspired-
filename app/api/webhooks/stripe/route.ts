import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  // Use admin client to bypass RLS for webhook operations
  const supabase = supabaseAdmin;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;

        console.log('Checkout session completed:', {
          sessionId: session.id,
          userId,
          subscriptionId: session.subscription,
        });

        if (!userId) {
          console.error('No userId in checkout session', session);
          break;
        }

        if (!session.subscription) {
          console.error('No subscription ID in checkout session', session);
          break;
        }

        try {
          // Get subscription from session
          const subscriptionId = session.subscription as string;
          const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId) as any;

          console.log('Retrieved subscription:', {
            id: stripeSubscription.id,
            status: stripeSubscription.status,
            userId,
          });

          // Upsert subscription in database (using admin client to bypass RLS)
          const { error: upsertError } = await supabaseAdmin.from('subscriptions').upsert({
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
            throw upsertError;
          }

          console.log('Subscription upserted successfully');

          // Update user's is_subscribed status (using admin client to bypass RLS)
          const isSubscribed = stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing';
          const { error: updateError } = await (supabaseAdmin.from('users') as any)
            .update({ is_subscribed: isSubscribed })
            .eq('id', userId);

          if (updateError) {
            console.error('Error updating user is_subscribed:', updateError);
          } else {
            console.log('User is_subscribed updated to:', isSubscribed);
          }
        } catch (error: any) {
          console.error('Error processing checkout.session.completed:', error);
          throw error;
        }

        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;

        if (!userId) {
          // Try to find by subscription ID
          const { data } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('id', subscription.id)
            .single();

          if (!data) break;
        }

        let finalUserId = userId;
        if (!finalUserId) {
          const { data } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('id', subscription.id)
            .single();
          finalUserId = (data as any)?.user_id;
        }

        if (event.type === 'customer.subscription.deleted') {
          // Delete subscription (using admin client to bypass RLS)
          await supabaseAdmin.from('subscriptions').delete().eq('id', subscription.id);
          
          // Update user's is_subscribed status to false
          if (finalUserId) {
            await (supabaseAdmin.from('users') as any)
              .update({ is_subscribed: false })
              .eq('id', finalUserId);
          }
        } else {
          // Update subscription (using admin client to bypass RLS)
          await supabaseAdmin.from('subscriptions').upsert({
            id: subscription.id,
            user_id: finalUserId,
            status: subscription.status,
            metadata: subscription.metadata,
            price_id: subscription.items.data[0].price.id,
            quantity: subscription.items.data[0].quantity || 1,
            cancel_at_period_end: subscription.cancel_at_period_end,
            created: new Date(subscription.created * 1000).toISOString(),
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
            cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          } as any);

          // Update user's is_subscribed status (using admin client to bypass RLS)
          if (finalUserId) {
            const isSubscribed = subscription.status === 'active' || subscription.status === 'trialing';
            await (supabaseAdmin.from('users') as any)
              .update({ is_subscribed: isSubscribed })
              .eq('id', finalUserId);
          }
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
