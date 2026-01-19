import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get customer ID from subscription
    const { data: subscriptionData, error: subError } = await supabase
      .from('subscriptions')
      .select('id, metadata')
      .eq('user_id', session.user.id)
      .in('status', ['active', 'trialing'])
      .single();

    if (subError || !subscriptionData) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const subscriptionId = (subscriptionData as any).id as string;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get customer ID from subscription metadata or Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = stripeSubscription.customer as string;

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${request.headers.get('origin')}/subscription`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Portal session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
