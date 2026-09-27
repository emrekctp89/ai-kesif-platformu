import { isKasifEnabled } from '@/lib/kasif/config';
import { isKasifSiteEnabled } from '@/lib/kasif/activation';

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

  it('site aktivasyonu için explicit true bekler', () => {
    expect(isKasifSiteEnabled({})).toBe(false);
    expect(isKasifSiteEnabled({ KASIF_ENABLED: 'true' })).toBe(true);
  });
});
