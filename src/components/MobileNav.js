'use client';

import * as React from 'react';
import {
  Menu,
  Bot,
  Lightbulb,
  PlusCircle,
  Info,
  Mail,
  Compass,
  GitCompareArrows,
  Newspaper,
  Images,
  Crown,
  LogIn,
  Rss,
  Users,
  LayoutGrid,
  Trophy,
  Dice5,
  GraduationCap,
  Rocket,
  Target,
  FlaskConical,
  MessageSquareHeart,
  WandSparkles,
  Code2,
  Shield,
  Scale,
  FolderOpen,
  BrainCircuit,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { FutureAiGlyph } from '@/components/FutureAiGlyph';

export function MobileNav({ user, isProUser }) {
  const t = useTranslations('Navigation');
  const tc = useTranslations('Common');
  const [open, setOpen] = React.useState(false);

  const sections = [
    {
      title: t('groupExplore'),
      links: [
        { href: '/', label: t('allTools'), icon: Bot },
        { href: '/kategori', label: t('categories'), icon: LayoutGrid },
        { href: '/kesfet', label: t('discover'), icon: Compass },
        { href: '/karsilastir', label: t('compare'), icon: GitCompareArrows },
        { href: '/tavsiye', label: t('aiRecommend'), icon: Lightbulb },
        { href: '/workmind', label: t('workmind'), icon: BrainCircuit },
        { href: '/random-tools', label: t('randomTools'), icon: Dice5 },
        { href: '/koleksiyonlar', label: t('collections'), icon: FolderOpen },
        { href: '/arastirma', label: t('research'), icon: FlaskConical },
      ],
    },
    {
      title: t('groupCommunity'),
      links: [
        ...(user ? [{ href: '/akis', label: t('feed'), icon: Rss }] : []),
        { href: '/topluluk', label: t('community'), icon: Users },
        { href: '/leaderboard', label: t('leaderboard'), icon: Trophy },
        { href: '/eserler', label: t('showcase'), icon: Images },
        { href: '/launchpad', label: t('launchpad'), icon: Rocket },
        { href: '/yarisma', label: t('challenge'), icon: Trophy },
        { href: '/odul-avciligi', label: t('bounties'), icon: Target },
      ],
    },
    {
      title: t('groupContent'),
      links: [
        { href: '/ogren', label: t('learn'), icon: GraduationCap },
        { href: '/blog', label: t('blog'), icon: Newspaper },
        { href: '/bulten', label: t('newsletter'), icon: Mail },
      ],
    },
    {
      title: t('groupPlatform'),
      links: [
        { href: '/submit', label: t('submitTool'), icon: PlusCircle },
        { href: '/developer', label: t('developer'), icon: Code2 },
        ...(user && isProUser ? [{ href: '/studyo', label: t('studio'), icon: WandSparkles }] : []),
        user && !isProUser
          ? { href: '/uyelik', label: t('upgradePro'), icon: Crown }
          : { href: '/uyelik', label: t('membership'), icon: Crown },
        { href: '/feedback', label: t('feedback'), icon: MessageSquareHeart },
        { href: '/hakkimizda', label: t('about'), icon: Info },
        { href: '/iletisim', label: t('contact'), icon: Mail },
        { href: '/gizlilik', label: t('privacy'), icon: Shield },
        { href: '/kullanim-kosullari', label: t('terms'), icon: Scale },
        ...(!user ? [{ href: '/login', label: tc('login'), icon: LogIn }] : []),
      ],
    },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('openMenu')}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">{t('openMenu')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-[320px] overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>{t('mobileNavTitle')}</SheetTitle>
          <SheetDescription>{t('mobileNavDescription')}</SheetDescription>
        </SheetHeader>
        <Link
          href="/"
          prefetch={false}
          className="mb-6 mr-6 flex items-center space-x-2"
          onClick={() => setOpen(false)}
        >
          <FutureAiGlyph className="h-7 w-7" />
          <span className="font-bold">AI Keşif</span>
        </Link>

        <div className="flex flex-col gap-6 pb-8">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              <div className="flex flex-col gap-1">
                {section.links.map(({ href, label, icon: Icon }) => {
                  const isAiTavsiye = href === '/tavsiye';
                  return (
                    <Link
                      key={`${href}-${label}`}
                      href={href}
                      prefetch={false}
                      onClick={() => setOpen(false)}
                      className={
                        isAiTavsiye
                          ? 'ai-tavsiye-gradient flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold shadow-md'
                          : 'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
                      }
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
