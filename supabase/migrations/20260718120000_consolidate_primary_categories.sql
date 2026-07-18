-- Daraltılmış primary kategori seti (eksikleri ekler; mevcut slug'lara dokunmaz)
INSERT INTO public.categories (name, slug)
SELECT v.name, v.slug
FROM (
  VALUES
    ('Görsel Üretim', 'gorsel-uretim'),
    ('Video & Animasyon', 'video-uretim'),
    ('Ses & Müzik', 'ses-muzik'),
    ('3D & Avatar', '3d-modelleme'),
    ('Tasarım', 'tasarim'),
    ('Metin & Yazım', 'metin-yazarligi'),
    ('Pazarlama & SEO', 'pazarlama'),
    ('Kod & Geliştirici', 'kod-yazilim'),
    ('No-Code / Low-Code', 'no-code-low-code'),
    ('Veri & Analitik', 'veri-analiz'),
    ('Otomasyon & Ajanlar', 'otomasyon-ajan'),
    ('Chatbot & Asistan', 'chatbotlar'),
    ('Üretkenlik', 'uretkenlik'),
    ('Satış & CRM', 'satis-crm'),
    ('E-Ticaret', 'e-ticaret'),
    ('Müşteri Destek', 'musteri-destek'),
    ('İş & Finans', 'is-dunyasi'),
    ('İnsan Kaynakları', 'insan-kaynaklari'),
    ('Hukuk & Uyumluluk', 'hukuk-uyumluluk'),
    ('Güvenlik & Siber', 'guvenlik-siber'),
    ('Eğitim', 'egitim'),
    ('Araştırma & Akademik', 'arastirma-akademik'),
    ('Sağlık & Yaşam', 'saglik-yasam'),
    ('Oyun & Eğlence', 'oyun-eglence'),
    ('Diğer', 'diger')
) AS v(name, slug)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c WHERE c.slug = v.slug
);

-- Primary kategori isimlerini güncelle (slug sabit)
UPDATE public.categories AS c
SET name = v.name
FROM (
  VALUES
    ('gorsel-uretim', 'Görsel Üretim'),
    ('video-uretim', 'Video & Animasyon'),
    ('ses-muzik', 'Ses & Müzik'),
    ('3d-modelleme', '3D & Avatar'),
    ('tasarim', 'Tasarım'),
    ('metin-yazarligi', 'Metin & Yazım'),
    ('pazarlama', 'Pazarlama & SEO'),
    ('kod-yazilim', 'Kod & Geliştirici'),
    ('no-code-low-code', 'No-Code / Low-Code'),
    ('veri-analiz', 'Veri & Analitik'),
    ('otomasyon-ajan', 'Otomasyon & Ajanlar'),
    ('chatbotlar', 'Chatbot & Asistan'),
    ('uretkenlik', 'Üretkenlik'),
    ('satis-crm', 'Satış & CRM'),
    ('e-ticaret', 'E-Ticaret'),
    ('musteri-destek', 'Müşteri Destek'),
    ('is-dunyasi', 'İş & Finans'),
    ('insan-kaynaklari', 'İnsan Kaynakları'),
    ('hukuk-uyumluluk', 'Hukuk & Uyumluluk'),
    ('guvenlik-siber', 'Güvenlik & Siber'),
    ('egitim', 'Eğitim'),
    ('arastirma-akademik', 'Araştırma & Akademik'),
    ('saglik-yasam', 'Sağlık & Yaşam'),
    ('oyun-eglence', 'Oyun & Eğlence'),
    ('diger', 'Diğer')
) AS v(slug, name)
WHERE c.slug = v.slug AND c.name IS DISTINCT FROM v.name;
