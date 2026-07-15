import {
  validateRequired,
  validateEmail,
  validateUrl,
  validateSlug,
  validateLength,
  validateUUID,
  validateNumber,
  validateAll,
} from '../validation';

describe('validateRequired', () => {
  it('null değer için hata döner', () => {
    expect(validateRequired(null, 'İsim').valid).toBe(false);
  });
  it('undefined değer için hata döner', () => {
    expect(validateRequired(undefined, 'İsim').valid).toBe(false);
  });
  it('boş string için hata döner', () => {
    expect(validateRequired('   ', 'İsim').valid).toBe(false);
  });
  it('geçerli değer için başarılı döner', () => {
    expect(validateRequired('test', 'İsim').valid).toBe(true);
  });
  it('0 sayısı geçerlidir', () => {
    expect(validateRequired(0, 'Sayı').valid).toBe(true);
  });
});

describe('validateEmail', () => {
  it('geçerli e-posta kabul eder', () => {
    const result = validateEmail('user@example.com');
    expect(result.valid).toBe(true);
    expect(result.value).toBe('user@example.com');
  });
  it('büyük harfleri küçültür', () => {
    const result = validateEmail('User@Example.COM');
    expect(result.value).toBe('user@example.com');
  });
  it('@ işareti eksikse reddeder', () => {
    expect(validateEmail('userexample.com').valid).toBe(false);
  });
  it('boş string reddeder', () => {
    expect(validateEmail('').valid).toBe(false);
  });
  it('null reddeder', () => {
    expect(validateEmail(null).valid).toBe(false);
  });
});

describe('validateUrl', () => {
  it('geçerli https URL kabul eder', () => {
    const result = validateUrl('https://example.com');
    expect(result.valid).toBe(true);
    expect(result.value).toBe('https://example.com/');
  });
  it('geçerli http URL kabul eder', () => {
    expect(validateUrl('http://example.com').valid).toBe(true);
  });
  it('ftp protokolünü reddeder', () => {
    expect(validateUrl('ftp://example.com').valid).toBe(false);
  });
  it('geçersiz URL reddeder', () => {
    expect(validateUrl('not-a-url').valid).toBe(false);
  });
  it('required=false ile boş URL kabul eder', () => {
    const result = validateUrl('', { required: false });
    expect(result.valid).toBe(true);
  });
  it('required=true ile boş URL reddeder', () => {
    expect(validateUrl('').valid).toBe(false);
  });
});

describe('validateSlug', () => {
  it('geçerli slug kabul eder', () => {
    const result = validateSlug('yapay-zeka-araci');
    expect(result.valid).toBe(true);
    expect(result.value).toBe('yapay-zeka-araci');
  });
  it('büyük harfleri küçültür', () => {
    expect(validateSlug('ChatGPT').value).toBe('chatgpt');
  });
  it('boşluklu slug reddeder', () => {
    expect(validateSlug('my tool').valid).toBe(false);
  });
  it('özel karakterli slug reddeder', () => {
    expect(validateSlug('my_tool!').valid).toBe(false);
  });
  it('tek karakterli slug reddeder', () => {
    expect(validateSlug('a').valid).toBe(false);
  });
  it('null reddeder', () => {
    expect(validateSlug(null).valid).toBe(false);
  });
});

describe('validateLength', () => {
  it('normal uzunluktaki metni kabul eder', () => {
    const result = validateLength('Merhaba dünya', { fieldName: 'Açıklama', min: 3, max: 100 });
    expect(result.valid).toBe(true);
  });
  it('çok kısa metni reddeder', () => {
    const result = validateLength('ab', { fieldName: 'Açıklama', min: 3 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('en az 3');
  });
  it('çok uzun metni reddeder', () => {
    const longText = 'a'.repeat(101);
    const result = validateLength(longText, { fieldName: 'Başlık', max: 100 });
    expect(result.valid).toBe(false);
  });
  it('min=0 ile boş metin kabul eder', () => {
    expect(validateLength('', { min: 0 }).valid).toBe(true);
  });
});

describe('validateUUID', () => {
  it('geçerli UUID kabul eder', () => {
    const result = validateUUID('550e8400-e29b-41d4-a716-446655440000');
    expect(result.valid).toBe(true);
  });
  it('geçersiz UUID reddeder', () => {
    expect(validateUUID('not-a-uuid').valid).toBe(false);
  });
  it('null reddeder', () => {
    expect(validateUUID(null).valid).toBe(false);
  });
});

describe('validateNumber', () => {
  it('geçerli sayıyı kabul eder', () => {
    expect(validateNumber(42).valid).toBe(true);
  });
  it('string olarak verilen sayıyı kabul eder', () => {
    const result = validateNumber('3.14');
    expect(result.valid).toBe(true);
    expect(result.value).toBe(3.14);
  });
  it('sayısal olmayan değeri reddeder', () => {
    expect(validateNumber('abc').valid).toBe(false);
  });
  it('minimum kontrolü çalışır', () => {
    expect(validateNumber(0, { min: 1 }).valid).toBe(false);
  });
  it('maksimum kontrolü çalışır', () => {
    expect(validateNumber(101, { max: 100 }).valid).toBe(false);
  });
  it('integer kontrolü çalışır', () => {
    expect(validateNumber(3.14, { integer: true }).valid).toBe(false);
    expect(validateNumber(3, { integer: true }).valid).toBe(true);
  });
});

describe('validateAll', () => {
  it('tüm doğrulamalar geçerse başarılı döner', () => {
    const result = validateAll(
      validateRequired('test', 'İsim'),
      validateEmail('user@test.com'),
      validateUrl('https://example.com')
    );
    expect(result.valid).toBe(true);
  });
  it('ilk hatada durur', () => {
    const result = validateAll(
      validateRequired('test', 'İsim'),
      validateEmail('geçersiz'),
      validateUrl('https://example.com')
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('e-posta');
  });
});
