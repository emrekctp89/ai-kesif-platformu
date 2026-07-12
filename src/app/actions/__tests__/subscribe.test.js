import { subscribeToNewsletter } from '../subscribe';
import { createAdminClient } from '@/utils/supabase/admin';

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

function createFormData(email) {
  const formData = new FormData();
  formData.set('email', email);
  return formData;
}

function createNewsletterTable({
  existingSubscriber = null,
  insertError = null,
  updateError = null,
} = {}) {
  const table = {
    select: jest.fn(() => table),
    eq: jest.fn(() => table),
    maybeSingle: jest.fn(async () => ({ data: existingSubscriber, error: null })),
    update: jest.fn(() => table),
    insert: jest.fn(async () => ({ error: insertError })),
  };

  table.eq.mockImplementation(() => {
    if (table.update.mock.calls.length > 0) {
      return Promise.resolve({ error: updateError });
    }

    return table;
  });

  return table;
}

function mockAdminTable(table) {
  createAdminClient.mockReturnValue({
    from: jest.fn((name) => {
      expect(name).toBe('newsletter_subscribers');
      return table;
    }),
  });
}

describe('subscribeToNewsletter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes and inserts a new newsletter subscriber', async () => {
    const table = createNewsletterTable();
    mockAdminTable(table);

    const result = await subscribeToNewsletter(createFormData('  USER@Example.COM  '));

    expect(result.success).toBe(true);
    expect(table.eq).toHaveBeenCalledWith('email', 'user@example.com');
    expect(table.insert).toHaveBeenCalledWith([{ email: 'user@example.com', source: 'website' }]);
  });

  it('returns the already subscribed message without inserting a duplicate', async () => {
    const table = createNewsletterTable({
      existingSubscriber: { id: 'subscriber-1', status: 'active' },
    });
    mockAdminTable(table);

    const result = await subscribeToNewsletter(createFormData('user@example.com'));

    expect(result.success).toBe(true);
    expect(result.message).toContain('zaten');
    expect(table.insert).not.toHaveBeenCalled();
  });

  it('reactivates an unsubscribed newsletter subscriber', async () => {
    const table = createNewsletterTable({
      existingSubscriber: { id: 'subscriber-1', status: 'unsubscribed' },
    });
    mockAdminTable(table);

    const result = await subscribeToNewsletter(createFormData('user@example.com'));

    expect(result.success).toBe(true);
    expect(result.message).toContain('yeniden');
    expect(table.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        updated_at: expect.any(String),
      })
    );
    expect(table.eq).toHaveBeenLastCalledWith('id', 'subscriber-1');
    expect(table.insert).not.toHaveBeenCalled();
  });
});
