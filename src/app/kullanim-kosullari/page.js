import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gavel, UserCheck, Copy, ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Kullanım Koşulları | AI Keşif Platformu',
  description: 'AI Keşif Platformu\'nu kullanarak kabul ettiğiniz şartlar ve koşullar.',
};

const TermsSection = ({ title, children }) => (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground leading-relaxed">
        {children}
      </p>
    </div>
);

export default function TermsOfUsePage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Kullanım Koşulları
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Lütfen platformumuzu kullanmadan önce bu koşulları dikkatlice okuyun.
        </p>
      </div>

      <Card>
        <CardContent className="p-8 space-y-8">
            <TermsSection title="1. Koşulların Kabulü">
                Bu web sitesini kullanarak, burada belirtilen kullanım koşullarını tam olarak kabul etmiş sayılırsınız. Eğer bu koşullardan herhangi birini kabul etmiyorsanız, platformu kullanmamanız gerekmektedir.
            </TermsSection>

            <TermsSection title="2. Kullanıcı Sorumlulukları">
                Platforma kayıt olurken veya içerik gönderirken sağladığınız bilgilerin doğruluğundan siz sorumlusunuz. Diğer kullanıcılara saygısızlık içeren, yasa dışı veya spam niteliğinde yorumlar yapmak yasaktır. Bu tür davranışlar hesabınızın askıya alınmasına veya silinmesine neden olabilir.
            </TermsSection>
            
            <TermsSection title="3. İçerik ve Fikri Mülkiyet">
                Sitede listelenen yapay zeka araçlarının tüm hakları kendi geliştiricilerine aittir. Kullanıcılar tarafından oluşturulan yorumlar gibi içerikler, platformun bir parçası olarak kabul edilir. Kendi gönderdiğiniz içeriklerden siz sorumlusunuz.
            </TermsSection>

            <TermsSection title="4. Sorumluluğun Sınırlandırılması">
                AI Keşif Platformu, listelenen araçların kullanımı veya performansından kaynaklanabilecek herhangi bir zarardan sorumlu tutulamaz. Platform "olduğu gibi" sunulmaktadır ve doğruluğu veya kesintisiz çalışacağı garanti edilmez.
            </TermsSection>
        </CardContent>
      </Card>
    </div>
  )
}
