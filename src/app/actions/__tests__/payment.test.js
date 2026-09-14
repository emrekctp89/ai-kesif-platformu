import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/actions';
import { createCheckoutSession, createPromotionCheckout } from '../payment';

jest.mock('stripe', () => jest.fn());
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('@/utils/supabase/actions', () => ({ createClient: jest.fn() }));
jest.mock('@/utils/serverLogger', () => ({ logServerError: jest.fn() }));

describe('paused purchases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  it.each([
    ['membership', () => createCheckoutSession(new FormData())],
    ['promotion', () => createPromotionCheckout('tool-id', 'tool-slug')],
  ])('blocks direct %s actions before any database or Stripe access', async (_, action) => {
    await expect(action()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/uyelik');
    expect(createClient).not.toHaveBeenCalled();
    expect(Stripe).not.toHaveBeenCalled();
  });
});
