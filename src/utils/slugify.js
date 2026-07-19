// Türkçe ve Latin genişletilmiş karakterleri URL uyumlu hale getirir.
const CHAR_MAP = {
  à: 'a',
  á: 'a',
  â: 'a',
  ä: 'a',
  æ: 'ae',
  ã: 'a',
  å: 'a',
  ā: 'a',
  ă: 'a',
  ą: 'a',
  ç: 'c',
  ć: 'c',
  č: 'c',
  đ: 'd',
  ď: 'd',
  è: 'e',
  é: 'e',
  ê: 'e',
  ë: 'e',
  ē: 'e',
  ė: 'e',
  ę: 'e',
  ě: 'e',
  ğ: 'g',
  ǵ: 'g',
  ḧ: 'h',
  î: 'i',
  ï: 'i',
  í: 'i',
  ī: 'i',
  į: 'i',
  ì: 'i',
  ı: 'i',
  ł: 'l',
  ḿ: 'm',
  ñ: 'n',
  ń: 'n',
  ǹ: 'n',
  ň: 'n',
  ô: 'o',
  ö: 'o',
  ò: 'o',
  ó: 'o',
  œ: 'oe',
  ø: 'o',
  ō: 'o',
  õ: 'o',
  ő: 'o',
  ṕ: 'p',
  ŕ: 'r',
  ř: 'r',
  ß: 'ss',
  ś: 's',
  š: 's',
  ş: 's',
  ș: 's',
  ť: 't',
  ț: 't',
  û: 'u',
  ü: 'u',
  ù: 'u',
  ú: 'u',
  ū: 'u',
  ǘ: 'u',
  ů: 'u',
  ű: 'u',
  ų: 'u',
  ẃ: 'w',
  ẍ: 'x',
  ÿ: 'y',
  ý: 'y',
  ž: 'z',
  ź: 'z',
  ż: 'z',
};

export function slugify(text) {
  if (text == null) return '';

  return String(text)
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[^\u0000-\u007E]/g, (char) => CHAR_MAP[char] || char)
    .replace(/\s+/g, '-')
    .replace(/&/g, '-and-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
