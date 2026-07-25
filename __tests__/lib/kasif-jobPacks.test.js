const {
  buildPackWorkmindUrl,
  getJobPackById,
  listJobPacks,
  matchJobPack,
} = require('../../src/lib/kasif/jobPacks');

describe('jobPacks', () => {
  it('en az 5 paket listeler', () => {
    const packs = listJobPacks('tr');
    expect(packs.length).toBeGreaterThanOrEqual(5);
    expect(packs[0].title).toBeTruthy();
    expect(packs[0].starterQuestion).toBeTruthy();
  });

  it('id ile paket bulur', () => {
    const pack = getJobPackById('content-studio', 'en');
    expect(pack.id).toBe('content-studio');
    expect(pack.title).toMatch(/content/i);
    expect(pack.goals).toContain('content-writing');
  });

  it('goal örtüşmesine göre paket eşleştirir', () => {
    const pack = matchJobPack(['content-writing', 'image-generation'], 'tr');
    expect(pack).toBeTruthy();
    expect(['content-studio', 'social-launch', 'pitch-deck']).toContain(pack.id);
  });

  it('Workmind pack URL üretir', () => {
    const pack = getJobPackById('sales-outreach', 'tr');
    const url = buildPackWorkmindUrl(pack, { locale: 'tr' });
    expect(url.startsWith('/workmind?')).toBe(true);
    expect(url).toContain('from=pack');
    expect(url).toContain('pack=sales-outreach');
    expect(url).toContain('auto=1');
  });
});
