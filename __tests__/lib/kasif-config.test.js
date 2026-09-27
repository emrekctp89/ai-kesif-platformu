import { isKasifEnabled } from '@/lib/kasif/config';

describe('Kâşif activation config', () => {
  it('KASIF_ENABLED=false ise kapatır', () => {
    expect(isKasifEnabled({ KASIF_ENABLED: 'false' })).toBe(false);
  });

  it('env yoksa varsayılan açık kalır', () => {
    expect(isKasifEnabled({})).toBe(true);
  });

  it('LOCAL_KASIF_ENABLED=true ile global kapalıyken de açılır', () => {
    expect(isKasifEnabled({ KASIF_ENABLED: 'false', LOCAL_KASIF_ENABLED: 'true' })).toBe(true);
  });
});
