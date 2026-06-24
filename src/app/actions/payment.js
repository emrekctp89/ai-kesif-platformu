"use server";

import { createClient } from "@/utils/supabase/actions";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { logServerError } from "@/utils/serverLogger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});

export async function createCheckoutSession(formData) {
  "use server";
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  let checkoutUrl;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const priceId = formData.get("priceId");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

    if (!priceId || !siteUrl) {
      throw new Error("Stripe fiyatı veya site adresi yapılandırılmamış.");
    }

    const { data: activePrice, error: priceError } = await supabase
      .from("prices")
      .select("id")
      .eq("id", priceId)
      .eq("active", true)
      .maybeSingle();

    if (priceError || !activePrice) {
      throw new Error("Geçersiz veya aktif olmayan Stripe fiyatı.");
    }

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabaseUUID: user.id },
      });
      customerId = customer.id;

      const { error: customerUpdateError } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);

      if (customerUpdateError) {
        throw new Error("Stripe müşteri kaydı profile yazılamadı.");
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
      success_url: `${siteUrl}/profile?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/uyelik`,
    });
    checkoutUrl = session.url;
  } catch (error) {
    logServerError("checkout.create-session", error);
    const errorMessage = "Ödeme sayfasına yönlendirilirken bir hata oluştu.";
    return redirect(`/uyelik?message=${encodeURIComponent(errorMessage)}`);
  }

  return redirect(checkoutUrl);
}
