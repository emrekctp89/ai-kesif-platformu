import { parsePositiveIntegerParam } from '../route';

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

describe('api/v1/tools route helpers', () => {
  it('falls back when a pagination parameter is missing or invalid', () => {
    expect(parsePositiveIntegerParam(null, 50)).toBe(50);
    expect(parsePositiveIntegerParam('abc', 50)).toBe(50);
    expect(parsePositiveIntegerParam('', 50)).toBe(50);
  });

  it('clamps pagination parameters to the allowed range', () => {
    expect(parsePositiveIntegerParam('-5', 1)).toBe(1);
    expect(parsePositiveIntegerParam('500', 50, { max: 100 })).toBe(100);
    expect(parsePositiveIntegerParam('25', 50, { max: 100 })).toBe(25);
  });
});
