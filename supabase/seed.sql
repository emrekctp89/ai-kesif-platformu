SET session_replication_role = replica;

-- Bu, yerel veritabanı her başladığında çalışacak olan başlangıç verileridir.
-- 'badges' tablosunu başlangıç rozetleriyle doldurur.
--INSERT INTO public.badges (name, description, icon_name, tier)
--VALUES
 --   ('Hoş Geldin!', 'AI Keşif Platformu''na katıldı.', 'Handshake', 'bronze'),
 --   ('İlk Yorum', 'Platforma ilk yorumunu yaptı.', 'MessageSquare', 'bronze'),
---    ('Meraklı Kaşif', 'İlk aracını favorilerine ekledi.', 'Heart', 'bronze'),
--    ('Katılımcı', 'İlk prompt''unu paylaştı.', 'Star', 'bronze'),
--    ('Sanatçı', 'İlk eserini paylaştı.', 'Image', 'silver'),
 --   ('Küratör', 'İlk koleksiyonunu oluşturdu.', 'Library', 'silver'),
 --   ('Fenomen', 'Paylaştığı bir içerik 50 oy aldı.', 'Flame', 'gold'),
 --   ('Süper Katılımcı', '1000 itibar puanını aştı.', 'Trophy', 'gold'),
 --   ('Acemi Katılımcı', '100 itibar puanına ulaştı.', 'Award', 'bronze'),
 --   ('Deneyimli Katılımcı', '500 itibar puanına ulaştı.', 'Medal', 'silver'),
 --   ('Usta', '2500 itibar puanına ulaştı.', 'Gem', 'gold'),
 --   ('Mentor', '5000 itibar puanını aştı.', 'Crown', 'gold')
--ON CONFLICT (name) DO NOTHING;
