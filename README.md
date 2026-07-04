# 🚀 AI Keşif Platformu (AI Discovery Platform)

Yapay zeka araçlarını keşfet, karşılaştır, test et ve toplulukla paylaş.

[🌐 Live Demo](https://ai-kesif-platformu.vercel.app) | [📖 Documentation](#documentation) | [🤝 Contributing](#contributing)

---

## ✨ Ana Özellikler

### 🔍 **Araç Keşfi**
- 1000+ AI aracının kapsamlı kütüphanesi
- Gelişmiş filtreleme ve arama
- Kategori ve etiket tabanlı keşif
- Günlük öne çıkan araçlar

### 🔄 **Karşılaştırma**
- 2+ aracı yan yana karşılaştır
- Özellik, fiyatlandırma ve platform karşılaştırması
- Benzer araçların önerileri
- Kullanıcı puanları ve yorumları

### 🤖 **AI Tavsiyelendirme**
- Yapay zeka destekli araç önerileri
- İhtiyacınıza göre kişiselleştirilmiş sonuçlar
- Proje stratejisi analizi
- İçerik oluşturmada yardım

### 📚 **Koleksiyonlar & Projeler**
- Araçları kişisel koleksiyonlarda saklayın
- Proje şablonları oluşturun
- Koleksiyonları toplulukla paylaşın
- Araç önerileri alın

### 🎨 **Stüdyo Özellikleri** (Pro)
- AI ile metin oluşturma
- AI ile görsel oluşturma (Imagen)
- İçerik mentorluğu
- Prompt kütüphanesi

### 🏆 **Topluluk**
- Araçlara yorum yapın ve puanlayın
- Haftalık zorluklar ve yarışmalar
- Kullanıcı profileri ve ün sistemi
- Eser gösterisi (Showcase)

### 👨‍💼 **Admin Panel**
- Araç onayı ve yönetimi
- Kullanıcı yönetimi
- İçerik yönetimi
- Platform istatistikleri

---

## 🛠️ **Tech Stack**

| Kategori | Teknoloji |
|----------|-----------|
| **Frontend** | Next.js 15.5, React 19, TailwindCSS |
| **UI Components** | Radix UI, Shadcn/ui |
| **Backend** | Next.js Server Actions, Node.js |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **AI** | Google Gemini API, Imagen |
| **Hosting** | Vercel |
| **Analytics** | Vercel Analytics, Speed Insights |
| **Email** | Resend |
| **Payments** | Stripe |

---

## 📖 **Dokümantasyon (Documentation)**

Projeye katkıda bulunmak veya mimariyi anlamak için aşağıdaki belgeleri inceleyin:
- [Geliştirici Kılavuzu (Developer Guide)](./DEVELOPER_GUIDE.md) - Mimari, UI ve Test stratejileri
- [API Dokümantasyonu](./API_DOCS.md) - Server Actions ve API yapılandırmaları
- [Bileşen (Component) Kılavuzu](./COMPONENTS_GUIDE.md) - İstemci/Sunucu bileşeni kuralları ve Tailwind UI rehberi
- [Veritabanı Şeması](./DATABASE_SCHEMA.md) - Supabase tablo yapıları ve ilişkileri

---

## 🚀 **Hızlı Başlangıç**

### Gereksinimler
- Node.js 18+
- npm/yarn/pnpm
- Git

### Kurulum

1. **Repository'yi clone et**
```bash
git clone https://github.com/emrekctp89/ai-kesif-platformu.git
cd ai-kesif-platformu
```

2. **Dependencies yükle**
```bash
npm install
# veya
yarn install
```

3. **Environment variables ayarla**
```bash
cp .env.example .env.local
```

`.env.local` dosyasını kendi values'larınızla doldurun (aşağıdaki bölümü gör)

4. **Development sunucusunu başlat**
```bash
npm run dev
```

5. **Tarayıcıda aç**
```
http://localhost:3005
```

---

## ⚙️ **Environment Variables**

`.env.local` dosyasına aşağıdaki değişkenleri ekleyin:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Vercel Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_analytics_id

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
ADMIN_NOTIF_EMAIL_FROM=your_admin_email

# Payments (Stripe)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Admin
ADMIN_EMAIL=admin@example.com
```

Daha fazla bilgi için [.env.example](./.env.example) dosyasını kontrol edin.

---

## 📁 **Proje Yapısı**

```
src/
├── app/                    # Next.js app directory
│   ├── actions/           # Server actions (API logic)
│   ├── (routes)/          # Route pages
│   │   ├── page.js        # Ana sayfa
│   │   ├── tool/          # Araç detay sayfaları
│   │   ├── admin/         # Admin panel
│   │   ├── profile/       # Kullanıcı profili
│   │   └── ...
│   └── layout.js          # Root layout
├── components/            # React components
│   ├── ToolCard.js       # Araç kartı
│   ├── AdminPanel.js     # Admin arayüzü
│   └── ...
├── lib/                  # Utilities & helpers
├── utils/                # Configuration & setup
│   ├── supabase/        # Supabase clients
│   └── ...
└── styles/              # Global styles

public/                   # Static assets
```

---

## 📖 **Documentation**

### Kullanıcı Rehberi
- [Araç Keşfi Rehberi](./docs/user-guide.md)
- [Koleksiyonlar Oluşturma](./docs/collections.md)
- [Karşılaştırma Rehberi](./docs/comparison.md)
- [AI Stüdyosu](./docs/studio.md)

### Geliştirici Rehberi
- [API Documentation](./docs/api.md)
- [Veritabanı Schema](./docs/database.md)
- [Component Library](./docs/components.md)
- [Deployment Guide](./docs/deployment.md)

### Admin Rehberi
- [Admin Panel](./docs/admin.md)
- [Content Management](./docs/content-management.md)
- [User Management](./docs/user-management.md)

---

## 🧪 **Testing**

```bash
# Kod kalitesi + production build doğrulaması
npm run verify

# Alternatif: adım adım çalıştır
npm run lint
npm run build

# Link doğrulama dry-run (DB'ye yazmaz)
npm run tools:audit-links:dry-run

# Link doğrulama + metadata yazımı
npm run tools:audit-links

# Kesin kırık linkleri pasife alma (soft cleanup)
npm run tools:audit-links:deactivate
```

---

## 📊 **Build & Deployment**

### Production Build
```bash
npm run build
npm start
```

### Deploy to Vercel
```bash
vercel deploy --prod
```

Daha fazla bilgi: [Vercel Deployment Docs](./docs/deployment.md)

---

## 🤝 **Katkıda Bulunma**

Katkılarınızı bekliyoruz! Lütfen şu adımları izleyin:

1. **Fork et** - Repository'i fork'la
2. **Branch oluştur** - `git checkout -b feature/AmazingFeature`
3. **Değişiklikleri commit et** - `git commit -m 'Add some AmazingFeature'`
4. **Push et** - `git push origin feature/AmazingFeature`
5. **Pull Request aç** - Açıklamalarıyla birlikte

### Contribution Rehberi
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Development Roadmap](./DEVELOPMENT_ROADMAP.md)

---

## 🐛 **Hata Bildirimi**

Bug buldum? Lütfen [issue aç](https://github.com/emrekctp89/ai-kesif-platformu/issues)!

Detaylı bilgi gönderin:
- Hata açıklaması
- Adımlar (replikasyon)
- Beklenen davranış
- Gerçek davranış
- Tarayıcı/Sistem bilgisi

---

## 📝 **Lisans**

Bu proje [MIT License](./LICENSE) altında lisanslanmıştır.

---

## 📞 **İletişim**

- 🌐 Website: [ai-kesif-platformu.vercel.app](https://ai-kesif-platformu.vercel.app)
- 📧 Email: [support@ai-kesif-platformu.com](mailto:support@ai-kesif-platformu.com)
- 🐦 Twitter: [@AIKesifPlatformu](https://twitter.com)
- 💬 Discord: [Join Community](https://discord.gg)

---

## 🙏 **Teşekkürler**

- [Next.js](https://nextjs.org) - React framework
- [Supabase](https://supabase.io) - Backend & Database
- [TailwindCSS](https://tailwindcss.com) - Styling
- [Radix UI](https://radix-ui.com) - Accessible components
- [Google AI](https://ai.google.dev) - AI capabilities

---

## 📈 **Proje Durumu**

- ✅ Alpha (Private Beta)
- 🔄 Aktif geliştirme
- 📊 Bakım: Haftalık
- 🐛 Bug fixes: Acil
- ✨ Yeni özellikler: Regular

Bkz: [Development Roadmap](./DEVELOPMENT_ROADMAP.md)

---

**Made with ❤️ by [emrekctp89](https://github.com/emrekctp89)**
