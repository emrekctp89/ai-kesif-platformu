//import Stripe from "stripe";
//import { NextResponse } from "next/server";
// Bu, admin yetkileriyle Supabase'i kullanmamızı sağlayan özel istemcimizdir.
//import { createAdminClient } from "@/utils/supabase/admin.js";
//import { supabaseAdmin } from "../../../utils/supabase/admin.js";


// Gerekli ortam değişkenlerini alıyoruz
//const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
//const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Gelen istekleri yönetecek olan POST fonksiyonu
//export async function POST(req) {
 // const sig = req.headers.get("stripe-signature");
//  const body = await req.text();
 // const supabase = createAdminClient();

 // let event;

 // try {
    // Güvenlik için, isteğin gerçekten Stripe'dan geldiğini doğruluyoruz
  //  event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
 // } catch (err) {
  //  console.error(`Stripe webhook imza doğrulama hatası: ${err.message}`);
  //  return NextResponse.json(
   //   { error: `Webhook Error: ${err.message}` },
  //    { status: 400 }
   // );
 // }

  // Farklı Stripe olaylarına göre işlem yapıyoruz
 // switch (event.type) {
  //  case "checkout.session.completed": {
  //    const session = event.data.object;
      // Abonelik bilgilerini alıp veritabanını güncelle
  //    const subscription = await stripe.subscriptions.retrieve(
   //     session.subscription
   //   );

   //   await supabase
    //    .from("profiles")
    //    .update({
     //     stripe_subscription_id: subscription.id,
       //   stripe_price_id: subscription.items.data[0].price.id,
      //    stripe_current_period_end: new Date(
      //      subscription.current_period_end * 1000
      //    ),
     //  })
    //    .eq("stripe_customer_id", subscription.customer);
     // break;
   // }
   // case "customer.subscription.updated": {
  //    const subscription = event.data.object;
      // Abonelik güncellendiğinde (örn: iptal edildiğinde) veritabanını güncelle
    //  await supabase
    //    .from("profiles")
    //    .update({
    //      stripe_price_id: subscription.items.data[0].price.id,
    //      stripe_current_period_end: new Date(
    //        subscription.current_period_end * 1000
    //      ),
    //    })
   //     .eq("stripe_subscription_id", subscription.id);
   //   break;
   // }
  //  case "customer.subscription.deleted": {
   //   const subscription = event.data.object;
      // Abonelik silindiğinde veritabanını temizle
    //  await supabase
    //    .from("profiles")
   //    .update({
    //      stripe_subscription_id: null,
   //       stripe_price_id: null,
   //       stripe_current_period_end: null,
   //     })
   //     .eq("stripe_subscription_id", subscription.id);
    //  break;
  //  }
// }

//  return NextResponse.json({ received: true });
//}
