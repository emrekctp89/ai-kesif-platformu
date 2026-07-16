import {
  Image as ImageIcon,
  Code2,
  Megaphone,
  PenTool,
  Music,
  Zap,
  Palette,
  GraduationCap,
  Box,
  Search,
  MessageSquare,
  Briefcase,
  Bot,
  Video,
  Database,
  LayoutTemplate,
} from 'lucide-react';

export const categoryConfig = {
  'gorsel-video': {
    icon: ImageIcon,
    color: 'purple',
    gradient: 'from-purple-500/20 to-fuchsia-500/20',
    border: 'border-purple-500/30',
    text: 'text-purple-500',
    description:
      'Görsel üretimi, video düzenleme ve tasarım için en yenilikçi yapay zeka araçları.',
  },
  'kod-yazilim': {
    icon: Code2,
    color: 'blue',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-500',
    description: 'Yazılımcılar için kod asistanları, hata ayıklama ve mimari AI araçları.',
  },
  pazarlama: {
    icon: Megaphone,
    color: 'orange',
    gradient: 'from-orange-500/20 to-amber-500/20',
    border: 'border-orange-500/30',
    text: 'text-orange-500',
    description: 'SEO, içerik stratejisi ve pazarlama kampanyaları için yapay zeka çözümleri.',
  },
  'metin-yazarligi': {
    icon: PenTool,
    color: 'green',
    gradient: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30',
    text: 'text-green-500',
    description:
      'Blog yazıları, makaleler ve yaratıcı metinler üretmek için gelişmiş dil modelleri.',
  },
  'ses-muzik': {
    icon: Music,
    color: 'rose',
    gradient: 'from-rose-500/20 to-pink-500/20',
    border: 'border-rose-500/30',
    text: 'text-rose-500',
    description: 'Seslendirme, müzik üretimi ve ses düzenleme için AI tabanlı stüdyo araçları.',
  },
  uretkenlik: {
    icon: Zap,
    color: 'yellow',
    gradient: 'from-yellow-500/20 to-amber-400/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-500',
    description: 'Günlük iş akışınızı hızlandıracak ve verimliliğinizi artıracak asistanlar.',
  },
  tasarim: {
    icon: Palette,
    color: 'pink',
    gradient: 'from-pink-500/20 to-rose-400/20',
    border: 'border-pink-500/30',
    text: 'text-pink-500',
    description: 'UI/UX, illüstrasyon ve grafik tasarım süreçlerinizi otomatikleştiren araçlar.',
  },
  egitim: {
    icon: GraduationCap,
    color: 'indigo',
    gradient: 'from-indigo-500/20 to-blue-500/20',
    border: 'border-indigo-500/30',
    text: 'text-indigo-500',
    description:
      'Öğrenme sürecinizi hızlandıran, özet çıkaran ve araştırma yapan eğitim asistanları.',
  },
  '3d-modelleme': {
    icon: Box,
    color: 'teal',
    gradient: 'from-teal-500/20 to-emerald-400/20',
    border: 'border-teal-500/30',
    text: 'text-teal-500',
    description: 'Metinden veya görselden 3 boyutlu modeller ve ortamlar üreten AI motorları.',
  },
  'arama-motoru': {
    icon: Search,
    color: 'cyan',
    gradient: 'from-cyan-500/20 to-blue-400/20',
    border: 'border-cyan-500/30',
    text: 'text-cyan-500',
    description:
      'Geleneksel aramayı yapay zeka destekli diyalog ve analiz yeteneğiyle birleştiren motorlar.',
  },
  chatbotlar: {
    icon: MessageSquare,
    color: 'violet',
    gradient: 'from-violet-500/20 to-purple-500/20',
    border: 'border-violet-500/30',
    text: 'text-violet-500',
    description: 'Kullanıcılarla doğal dilde iletişim kurabilen sohbet robotları ve asistanlar.',
  },
  'is-dunyasi': {
    icon: Briefcase,
    color: 'slate',
    gradient: 'from-slate-500/20 to-gray-400/20',
    border: 'border-slate-500/30',
    text: 'text-slate-500',
    description: 'Şirket yönetimi, finans ve iş planlaması için profesyonel yapay zeka araçları.',
  },
};

export const defaultCategoryConfig = {
  icon: LayoutTemplate,
  color: 'primary',
  gradient: 'from-primary/20 to-primary/10',
  border: 'border-primary/30',
  text: 'text-primary',
  description: 'Bu kategori altındaki en yenilikçi ve popüler yapay zeka araçlarını keşfedin.',
};

export function getCategoryConfig(slug) {
  return categoryConfig[slug] || defaultCategoryConfig;
}
