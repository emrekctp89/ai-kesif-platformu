import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { logServerError } from '@/utils/serverLogger';

export const runtime = 'nodejs';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY ortam değişkeni tanımlı değil.');
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10',
  });
}

function getCustomerId(customer) {
  return typeof customer === 'string' ? customer : customer?.id;
}

function getSubscriptionData(subscription) {
  const keepsAccess = !['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status);

  return {
    stripe_subscription_id: keepsAccess ? subscription.id : null,
    stripe_price_id: keepsAccess ? subscription.items.data[0]?.price?.id || null : null,
    stripe_current_period_end:
      keepsAccess && subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
  };
}

async function updateProfile(subscription) {
  const customerId = getCustomerId(subscription.customer);

  if (!customerId) {
    throw new Error(`Abonelik için müşteri bulunamadı: ${subscription.id}`);
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('profiles')
    .update(getSubscriptionData(subscription))
    .eq('stripe_customer_id', customerId);

  if (error) {
    throw new Error(`Profil güncellenemedi: ${error.message}`);
  }
}

async function clearSubscription(subscription) {
  const supabase = createAdminClient();
  const customerId = getCustomerId(subscription.customer);

  let query = supabase.from('profiles').update({
    stripe_subscription_id: null,
    stripe_price_id: null,
    stripe_current_period_end: null,
  });

  query = customerId
    ? query.eq('stripe_customer_id', customerId)
    : query.eq('stripe_subscription_id', subscription.id);

  const { error } = await query;

  if (error) {
    throw new Error(`Abonelik profilden temizlenemedi: ${error.message}`);
  }
}

export async function POST(request) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook yapılandırması eksik.' }, { status: 400 });
  }

  const stripe = getStripe();
  const body = await request.text();

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    logServerError('stripe.webhook.signature', error);
    return NextResponse.json({ error: 'Geçersiz webhook imzası.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await updateProfile(subscription);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await updateProfile(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await clearSubscription(event.data.object);
        break;

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logServerError('stripe.webhook.process', error, {
      eventType: event.type,
      eventId: event.id,
    });
    return NextResponse.json({ error: 'Webhook olayı işlenemedi.' }, { status: 500 });
  }
}
