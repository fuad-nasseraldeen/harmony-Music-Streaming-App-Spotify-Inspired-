import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

// Helper endpoint to create product and price in Stripe
// Call this once to set up the $10/month plan
export async function POST(request: NextRequest) {
  try {
    // Check if product already exists
    const products = await stripe.products.list({ limit: 10 });
    let product = products.data.find((p) => p.name === 'Premium Plan');

    if (!product) {
      // Create product
      product = await stripe.products.create({
        name: 'Premium Plan',
        description: 'Unlock unlimited music streaming',
        active: true,
      });
    }

    // Check if price already exists
    const prices = await stripe.prices.list({ product: product.id, limit: 10 });
    let price = prices.data.find(
      (p) => p.unit_amount === 1000 && p.currency === 'usd' && p.recurring?.interval === 'month'
    );

    if (!price) {
      // Create price
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: 1000, // $10.00
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
      });
    }

    return NextResponse.json({
      productId: product.id,
      priceId: price.id,
      message: 'Product and price created successfully. Use priceId for checkout.',
    });
  } catch (error: any) {
    console.error('Create product/price error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create product/price' },
      { status: 500 }
    );
  }
}
