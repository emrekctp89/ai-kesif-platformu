import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { CircleHelp } from 'lucide-react';

/**
 * FAQ built from live tool fields — no CMS needed.
 * Returns both the UI and FAQ items for JSON-LD (via getToolFaqItems).
 */
export function buildToolFaqItems({
  tool,
  t,
  tPricing,
  formatPricing,
  formatDate,
  locale,
  platforms,
  pricingLabel,
  linkHealthBadge,
}) {
  const name = tool.displayName || tool.name;
  const updated =
    formatDate(tool.updated_at, locale) || formatDate(tool.created_at, locale) || t('recently');

  return [
    {
      id: 'what-is',
      question: t('faqWhatIsQ', { name }),
      answer: tool.displayDescription || t('faqWhatIsFallback', { name }),
    },
    {
      id: 'pricing',
      question: t('faqPricingQ', { name }),
      answer: t('faqPricingA', {
        pricing:
          pricingLabel || formatPricing?.(tool.pricing_model, tPricing) || t('pricingUnknown'),
      }),
    },
    {
      id: 'platforms',
      question: t('faqPlatformsQ', { name }),
      answer: t('faqPlatformsA', {
        platforms: (platforms || []).join(', ') || 'Web',
      }),
    },
    {
      id: 'link',
      question: t('faqLinkQ'),
      answer: t('faqLinkA', {
        status: linkHealthBadge || t('linkPendingBadge'),
        name,
      }),
    },
    {
      id: 'updated',
      question: t('faqUpdatedQ', { name }),
      answer: t('faqUpdatedA', { date: updated }),
    },
    {
      id: 'compare',
      question: t('faqCompareQ', { name }),
      answer: t('faqCompareA', { name }),
    },
  ];
}

export function ToolFaq({ items, heading, subheading }) {
  if (!items?.length) return null;

  return (
    <section
      id="tool-faq"
      className="scroll-mt-36 sm:scroll-mt-40"
      aria-labelledby="tool-faq-heading"
    >
      <div className="mb-4 sm:mb-5">
        <h2
          id="tool-faq-heading"
          className="flex items-center gap-2 text-2xl font-bold tracking-tight"
        >
          <CircleHelp className="h-6 w-6 text-primary" aria-hidden="true" />
          {heading}
        </h2>
        {subheading ? <p className="mt-1 text-sm text-muted-foreground">{subheading}</p> : null}
      </div>

      <Card className="glass-panel border-border/50">
        <CardContent className="p-2 sm:p-4">
          <Accordion type="single" collapsible className="w-full">
            {items.map((item) => (
              <AccordionItem key={item.id} value={item.id} className="border-border/60 px-2">
                <AccordionTrigger className="text-left text-sm font-semibold sm:text-base">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </section>
  );
}
