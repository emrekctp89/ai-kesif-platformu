/** @jest-environment node */

jest.mock('server-only', () => ({}));
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { warn: jest.fn() },
}));
jest.mock('@/utils/supabase/admin', () => ({ createAdminClient: jest.fn() }));

import { createAdminClient } from '@/utils/supabase/admin';
import {
  __resetKasifDeepseekModeCacheForTests,
  getKasifDeepseekMode,
  setKasifDeepseekMode,
} from '@/lib/kasif/deepseekMode';

describe('Kâşif DeepSeek admin mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetKasifDeepseekModeCacheForTests();
  });

  it('ayar satırı yoksa güvenli biçimde varsayılan kapalıdır', async () => {
    const query = {
      select: jest.fn(),
      eq: jest.fn(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    createAdminClient.mockReturnValue({ from: jest.fn().mockReturnValue(query) });
    await expect(getKasifDeepseekMode()).resolves.toMatchObject({
      enabled: false,
      source: 'default',
    });
  });

  it('admin seçimini app_settings upsert ile kaydeder', async () => {
    const row = {
      key: 'kasif_deepseek_superpower',
      value: { enabled: true },
      updated_at: '2026-08-01T10:00:00.000Z',
      updated_by: 'admin-id',
    };
    const query = {
      upsert: jest.fn(),
      select: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: row, error: null }),
    };
    query.upsert.mockReturnValue(query);
    query.select.mockReturnValue(query);
    createAdminClient.mockReturnValue({ from: jest.fn().mockReturnValue(query) });
    await expect(setKasifDeepseekMode(true, { userId: 'admin-id' })).resolves.toMatchObject({
      enabled: true,
      updatedBy: 'admin-id',
    });
    expect(query.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'kasif_deepseek_superpower',
        value: expect.objectContaining({ enabled: true }),
        updated_by: 'admin-id',
      }),
      { onConflict: 'key' }
    );
  });
});
