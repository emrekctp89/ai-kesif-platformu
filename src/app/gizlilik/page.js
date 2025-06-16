import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Database, Cookie, UserCog } from 'lucide-react';

export const metadata = {
  title: 'Gizlilik Politikası | AI Keşif Platformu',
  description: 'AI Keşif Platformu olarak gizliliğinize nasıl saygı duyduğumuzu ve verilerinizi nasıl koruduğumuzu öğrenin.',
};

const PolicySection = ({ icon, title, children }) => (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold flex items-center gap-3">
        {icon}
        {title}
      </h2>
      <p className="text-muted-foreground leading-relaxed">
        {children}
      </p>
    </div>
);

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Gizlilik Politikası
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Son Güncelleme: 13 Haziran 2025
        </p>
      </div>

      <Card>
        <CardContent className="p-8 space-y-8">
            <PolicySection icon={<ShieldCheck className="w-6 h-6 text-primary" />} title="Veri Güvenliği Taahhüdümüz">
                AI Keşif Platformu olarak, kullanıcılarımızın gizliliğine ve veri güvenliğine en üst düzeyde önem veriyoruz. Bu politika, hangi verileri topladığımızı, bu verileri nasıl kullandığımızı ve haklarınızı nasıl koruduğumuzu açıklar.
            </PolicySection>

            <PolicySection icon={<Database className="w-6 h-6 text-primary" />} title="Topladığımız Bilgiler">
                Kayıt sırasında sağladığınız e-posta adresi, yaptığınız yorumlar, verdiğiniz puanlar ve favori olarak işaretlediğiniz araçlar gibi etkileşim verilerini saklamaktayız. Misafir olarak araç önerdiğinizde, yalnızca bu işlem için sağladığınız e-posta adresi geçici olarak kaydedilir.
            </PolicySection>
            
            <PolicySection icon={<UserCog className="w-6 h-6 text-primary" />} title="Bilgilerin Kullanımı">
                Toplanan veriler, yalnızca platform deneyiminizi kişiselleştirmek (örneğin, profil sayfanızı oluşturmak) ve size hizmetle ilgili (onay, şifre sıfırlama vb.) e-postaları göndermek amacıyla kullanılır. E-posta adresleriniz asla üçüncü partilerle paylaşılmaz veya pazarlama amacıyla kullanılmaz.
            </PolicySection>

            <PolicySection icon={<Cookie className="w-6 h-6 text-primary" />} title="Çerezler (Cookies)">
                Sitemiz, kullanıcı oturumlarını yönetmek ve tema tercihlerinizi hatırlamak gibi temel işlevler için gerekli olan çerezleri kullanır. Bu çerezler, kişisel veri toplamaz.
            </PolicySection>
        </CardContent>
      </Card>
    </div>
  )
}
