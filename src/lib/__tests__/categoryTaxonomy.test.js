import {
  classifyToolText,
  nameMatchesKnownTool,
  haystackHasKeyword,
  normalizeProductKey,
} from '../categoryTaxonomy';

describe('categoryTaxonomy matching', () => {
  it('normalizes AI without Turkish locale ı', () => {
    expect(normalizeProductKey('LimeWire AI Studio')).toBe('limewire ai studio');
    expect(normalizeProductKey('AILipSync.studio')).toBe('ailipsync.studio');
  });

  it('does not match udio inside Studio', () => {
    expect(nameMatchesKnownTool('visual studio code', 'udio')).toBe(false);
    expect(nameMatchesKnownTool('recast studio', 'udio')).toBe(false);
    expect(nameMatchesKnownTool('udio', 'udio')).toBe(true);
    expect(nameMatchesKnownTool('udio ai music', 'udio')).toBe(true);
  });

  it('classifies Visual Studio Code as kod-yazilim', () => {
    const result = classifyToolText(
      'Visual Studio Code',
      'Popular source code editor with support for multiple programming languages',
      'https://code.visualstudio.com/'
    );
    expect(result.slug).toBe('kod-yazilim');
    expect(
      result.matched.some((m) => m.includes('visual studio code') || m.includes('known'))
    ).toBe(true);
  });

  it('classifies Copymatic as metin-yazarligi', () => {
    const result = classifyToolText(
      'Copymatic',
      'AI copywriting assistant for marketing content',
      'https://copymatic.ai/'
    );
    expect(result.slug).toBe('metin-yazarligi');
  });

  it('uses word boundaries for short audio keywords', () => {
    expect(haystackHasKeyword('visual studio code editor', 'udio')).toBe(false);
    expect(haystackHasKeyword('listen on udio now', 'udio')).toBe(true);
    expect(haystackHasKeyword('music generation with suno', 'suno')).toBe(true);
  });

  it('still matches multi-word known tools', () => {
    expect(nameMatchesKnownTool('github copilot business', 'github copilot')).toBe(true);
    const result = classifyToolText('GitHub Copilot', 'AI pair programmer', 'https://github.com');
    expect(result.slug).toBe('kod-yazilim');
  });

  it('classifies LimeWire AI Studio as gorsel-uretim not ses-muzik', () => {
    const result = classifyToolText(
      'LimeWire AI Studio',
      'An AI image generation platform designed to empower creators',
      'https://limewire.com'
    );
    expect(result.slug).toBe('gorsel-uretim');
  });

  it('classifies Creative Reality Studio as video-uretim', () => {
    const result = classifyToolText(
      'Creative Reality Studio',
      'D-ID talking video platform',
      'https://www.d-id.com'
    );
    expect(result.slug).toBe('video-uretim');
  });
});
