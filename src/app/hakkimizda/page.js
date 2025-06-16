import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, Rocket } from 'lucide-react';

// Metadata (sayfa başlığı)
export const metadata = {
  title: 'Hakkımızda | AI Keşif Platformu',
  description: 'AI Keşif Platformu\'nun misyonu, vizyonu ve hikayesi.',
};

const FeatureCard = ({ icon, title, children }) => (
    <div className="flex flex-col items-center text-center">
        <div className="p-4 bg-primary/10 rounded-full mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">
            {children}
        </p>
    </div>
);

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      
      {/* Üst Başlık Bölümü */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Hakkımızda
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Yapay zekanın sonsuz potansiyelini herkes için erişilebilir kılma yolculuğumuz.
        </p>
      </div>

      {/* Misyon & Vizyon Bölümü */}
      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Rocket className="w-8 h-8 text-primary" />
            Misyonumuz
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            AI Keşif Platformu olarak misyonumuz, geliştiricilerden pazarlamacılara, öğrencilerden sanatçılara kadar herkesin, kendi ihtiyaçlarına en uygun yapay zeka aracını kolayca bulabileceği merkezi ve güvenilir bir kaynak oluşturmaktır. Karmaşık ve hızla büyüyen bu dünyada, doğru araçları keşfetme sürecini basitleştirmeyi hedefliyoruz.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            Vizyonumuz
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Vizyonumuz, sadece bir araç listesi olmanın ötesine geçerek, kullanıcıların birbirlerinin deneyimlerinden öğrendiği, en iyi araçların topluluk tarafından belirlendiği ve yapay zeka ekosisteminin nabzının attığı canlı bir topluluk platformu haline gelmektir. İnsan potansiyelini yapay zeka ile birleştirerek yeni olasılıkların kapısını aralamak istiyoruz.
          </p>
        </div>
      </div>

      {/* Ekip veya Değerler Bölümü */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="text-center text-3xl">Değerlerimiz</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-8">
            <FeatureCard icon={<Users className="w-8 h-8 text-primary" />} title="Topluluk Odaklı">
                Platformumuzun en büyük gücü kullanıcılarımızdır. Her yorum, puan ve öneri bizim için değerlidir.
            </FeatureCard>
            <FeatureCard icon={<Rocket className="w-8 h-8 text-primary" />} title="Sürekli Keşif">
                AI dünyası durmuyor, biz de durmuyoruz. Sürekli olarak yeni ve etkili araçları araştırıp platforma ekliyoruz.
            </FeatureCard>
            <FeatureCard icon={<Target className="w-8 h-8 text-primary" />} title="Erişilebilirlik">
                Teknik bilgi seviyesi ne olursa olsun, herkesin yapay zekanın gücünden faydalanabilmesi gerektiğine inanıyoruz.
            </FeatureCard>
        </CardContent>
      </Card>

    </div>
  )
}
