import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/graphql/context';

// API endpoint to manually sync subscription status after checkout
// This is called when user returns from Stripe checkout
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

    // First, check if there's a subscription in the database
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    let isSubscribed = false;
    let subscriptionSynced = false;

    // If subscription exists in DB, use it
    if (existingSubscription) {
      const subData = existingSubscription as any;
      isSubscribed = subData.status === 'active' || subData.status === 'trialing';
      subscriptionSynced = true;
    } else {
      // Try to find subscription in Stripe and sync it
      // Check if there's a subscription in Stripe by looking for customer
      // This is a fallback - webhook should handle this normally
      try {
        // First try to find customer by email
        let customerId: string | null = null;
        
        if (session.user.email) {
          const customers = await stripe.customers.list({
            email: session.user.email,
            limit: 1,
          });
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
          }
        }

        // If no customer found by email, try to find by metadata
        if (!customerId) {
          const allCustomers = await stripe.customers.list({ limit: 100 });
          const customerWithUserId = allCustomers.data.find(
            (c) => c.metadata?.userId === userId
          );
          if (customerWithUserId) {
            customerId = customerWithUserId.id;
          }
        }

        if (customerId) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 10, // Get more to find active ones
          });

          // Find the most recent active or trialing subscription
          const activeSub = subscriptions.data.find(
            (sub) => sub.status === 'active' || sub.status === 'trialing'
          );

          if (activeSub) {
            const stripeSub = activeSub as any;
            console.log('Syncing subscription from Stripe:', stripeSub.id);
            
            // Sync subscription to database
            const { error: upsertError } = await supabase.from('subscriptions').upsert({
              id: stripeSub.id,
              user_id: userId,
              status: stripeSub.status,
              metadata: stripeSub.metadata || {},
              price_id: stripeSub.items.data[0]?.price?.id || null,
              quantity: stripeSub.items.data[0]?.quantity || 1,
              cancel_at_period_end: stripeSub.cancel_at_period_end || false,
              created: new Date(stripeSub.created * 1000).toISOString(),
              current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
              ended_at: stripeSub.ended_at ? new Date(stripeSub.ended_at * 1000).toISOString() : null,
              cancel_at: stripeSub.cancel_at ? new Date(stripeSub.cancel_at * 1000).toISOString() : null,
              canceled_at: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000).toISOString() : null,
              trial_start: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000).toISOString() : null,
              trial_end: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
            } as any);

            if (upsertError) {
              console.error('Error upserting subscription:', upsertError);
            } else {
              subscriptionSynced = true;
            }

            // Update user status
            isSubscribed = stripeSub.status === 'active' || stripeSub.status === 'trialing';
            const { error: updateError } = await (supabase.from('users') as any)
              .update({ is_subscribed: isSubscribed })
              .eq('id', userId);

            if (updateError) {
              console.error('Error updating user is_subscribed:', updateError);
            } else {
              console.log('Updated user is_subscribed to:', isSubscribed);
            }
          } else {
            console.log('No active subscription found in Stripe for user:', userId);
          }
        } else {
          console.log('No customer found in Stripe for user:', userId);
        }
      } catch (stripeError) {
        console.error('Stripe sync error:', stripeError);
        // Continue anyway - webhook will handle it
      }
    }

    // Always update user's is_subscribed status based on what we found
    if (subscriptionSynced) {
      await (supabase.from('users') as any)
        .update({ is_subscribed: isSubscribed })
        .eq('id', userId);
    }

    return NextResponse.json({ 
      isSubscribed,
      synced: subscriptionSynced,
      subscriptionFound: !!existingSubscription,
      message: subscriptionSynced 
        ? 'Subscription synced successfully' 
        : 'No subscription found in Stripe or database'
    });
  } catch (error: any) {
    console.error('Sync subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync subscription' },
      { status: 500 }
    );
  }
}
