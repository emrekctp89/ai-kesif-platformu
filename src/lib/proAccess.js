import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/utils/supabase/server';

function withMessage(path, message) {
  return message ? `${path}?message=${encodeURIComponent(message)}` : path;
}

/**
 * Enforces Pro access from a Server Component. Admins retain Pro access.
 * This check intentionally runs server-side so a hidden link or direct URL
 * cannot bypass the subscription gate.
 */
export async function requireProAccess({ loginMessage, proMessage } = {}) {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(withMessage('/login', loginMessage));
  }

  if (user.email === process.env.ADMIN_EMAIL) {
    return user;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_price_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.stripe_price_id) {
    redirect(withMessage('/uyelik', proMessage));
  }

  return user;
}
