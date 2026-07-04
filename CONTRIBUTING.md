# Katkıda Bulunma Rehberi (Contributing Guide)

AI Keşif Platformu projesine hoş geldiniz! Katkı sağlamak isteyen geliştiriciler için temel iş akışı (workflow) ve kuralları bu belgede topladık.

## 1. Başlarken

- Projeyi forklayın veya yeni bir branch oluşturun. (Örn: `git checkout -b feature/awesome-new-feature` veya `bugfix/fix-header`)
- Temel bağımlılıkları `npm install` ile kurun.
- `.env.example` dosyasını kopyalayarak `.env.local` oluşturun ve Supabase dahil ilgili anahtarları yerleştirin.
- Projeyi `npm run dev` ile başlatın.

## 2. Geliştirme Süreci

- Kod yazarken projedeki mevcut standartları ve mimariyi (örneğin App Router, Server Actions, shadcn/ui) koruyun.
- Açıklama eklerken veya değişken tanımlarken Türkçe ve İngilizce kullanım dengesine dikkat edin. Standart API cevapları için `src/utils/api-response.js` dosyasını kullanın.

## 3. Kod Kalitesi ve Testler

- Push yapmadan önce muhakkak `npm run lint` komutunu çalıştırarak uyarı/hataları giderin.
- Mümkünse değişikliklerinizi test etmek için `npm test` ile birim testlerinizi yazın ve çalıştırın.
- ESLint ve Prettier ayarları projede otomatiktir; kural ihlallerinde CI/CD süreçleri başarısız olabilir.

## 4. Pull Request (PR) Açma

- PR başlığınız kısa ve anlaşılır olmalı.
- PR açıklamasında yaptığınız değişikliğin nedenini, neyi düzelttiğini ve nasıl test edildiğini belirtin.
- Birden fazla commit yaptıysanız, PR aşamasında anlamlı bir şekilde birleştirin (squash).

Teşekkürler! 🎉
