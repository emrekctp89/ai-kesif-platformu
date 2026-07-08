'use server';

import { createClient } from '@/utils/supabase/actions';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { logServerError } from '@/utils/serverLogger';
import { getPromoCode, toStripeCouponId } from '@/lib/promoCodes';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY ortam değişkeni tanımlı değil.');
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10',
  });
}

async function getOrCreateStripeCoupon(stripe, promo) {
  const couponId = toStripeCouponId(promo.code);

  try {
    await stripe.coupons.retrieve(couponId);
    return couponId;
  } catch (error) {
    if (error?.code !== 'resource_missing') {
      throw error;
    }
  }

  const coupon = await stripe.coupons.create({
    id: couponId,
    percent_off: promo.percentOff,
    duration: promo.duration,
    name: `${promo.label} (${promo.code})`,
  });

  return coupon.id;
}

export async function createCheckoutSession(formData) {
  'use server';
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  let checkoutUrl;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const priceId = formData.get('priceId');
    const promoCodeRaw = formData.get('promoCode');
    const promo = getPromoCode(promoCodeRaw);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');

    if (!priceId || !siteUrl) {
      throw new Error('Stripe fiyatı veya site adresi yapılandırılmamış.');
    }

    const { data: activePrice, error: priceError } = await supabase
      .from('prices')
      .select('id')
      .eq('id', priceId)
      .eq('active', true)
      .maybeSingle();

    if (priceError || !activePrice) {
      throw new Error('Geçersiz veya aktif olmayan Stripe fiyatı.');
    }

    const stripe = getStripe();
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabaseUUID: user.id },
      });
      customerId = customer.id;

      const { error: customerUpdateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);

      if (customerUpdateError) {
        throw new Error('Stripe müşteri kaydı profile yazılamadı.');
      }
    }

    const discounts = promo
      ? [{ coupon: await getOrCreateStripeCoupon(stripe, promo) }]
      : undefined;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      ...(discounts ? { discounts } : {}),
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
        ...(promo ? { promo_code: promo.code } : {}),
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          ...(promo ? { promo_code: promo.code } : {}),
        },
      },
      success_url: `${siteUrl}/profile?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/uyelik`,
    });
    checkoutUrl = session.url;
  } catch (error) {
    logServerError('checkout.create-session', error);
    const errorMessage = 'Ödeme sayfasına yönlendirilirken bir hata oluştu.';
    return redirect(`/uyelik?message=${encodeURIComponent(errorMessage)}`);
  }

  if (checkoutUrl) {
    redirect(checkoutUrl);
  }
}

export async function createPromotionCheckout(toolId, toolSlug) {
  'use server';
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  let checkoutUrl;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    // Use an environment variable for the one-time promotion price ID.
    // If not set, you must create a price in Stripe for "1 Month Promotion" and set NEXT_PUBLIC_STRIPE_PROMOTION_PRICE_ID
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PROMOTION_PRICE_ID;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');

    if (!priceId || !siteUrl) {
      throw new Error(
        'Sponsorluk fiyatı (NEXT_PUBLIC_STRIPE_PROMOTION_PRICE_ID) veya site adresi yapılandırılmamış.'
      );
    }

    const stripe = getStripe();
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabaseUUID: user.id },
      });
      customerId = customer.id;

      const { error: customerUpdateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);

      if (customerUpdateError) {
        throw new Error('Stripe müşteri kaydı profile yazılamadı.');
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment', // One-time payment for promotion
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
        promotion_tool_id: toolId, // Critical: this tells the webhook which tool to promote
      },
      success_url: `${siteUrl}/tool/${toolSlug}?promoted=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/tool/${toolSlug}`,
    });

    checkoutUrl = session.url;
  } catch (error) {
    logServerError('checkout.create-promotion-session', error);
    const errorMessage = 'Ödeme sayfasına yönlendirilirken bir hata oluştu: ' + error.message;
    return redirect(`/tool/${toolSlug}?message=${encodeURIComponent(errorMessage)}`);
  }

  if (checkoutUrl) {
    redirect(checkoutUrl);
  }
}
