import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/graphql/context';
import { stripe } from '@/lib/stripe';

// Debug endpoint to check subscription status
export async function GET(request: NextRequest) {
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

    // Check database
    const { data: dbSubscription, error: dbError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_subscribed')
      .eq('id', userId)
      .single();

    // Check Stripe
    let stripeSubscriptions: any[] = [];
    try {
      if (session.user.email) {
        const customers = await stripe.customers.list({
          email: session.user.email,
          limit: 1,
        });
        
        if (customers.data.length > 0) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customers.data[0].id,
            limit: 10,
          });
          stripeSubscriptions = subscriptions.data;
        }
      }
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
    }

    return NextResponse.json({
      userId,
      email: session.user.email,
      database: {
        subscription: dbSubscription,
        user: userData,
        errors: {
          subscription: dbError?.message,
          user: userError?.message,
        },
      },
      stripe: {
        subscriptions: stripeSubscriptions.map((sub) => ({
          id: sub.id,
          status: sub.status,
          customer: sub.customer,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
