'use client';

import * as React from 'react';
import {
  FacebookIcon,
  FacebookShareButton,
  LinkedinIcon,
  LinkedinShareButton,
  TwitterIcon,
  TwitterShareButton,
  WhatsappIcon,
  WhatsappShareButton,
} from 'react-share';
import { Check, Link2 } from 'lucide-react';
import { trackEvent } from '@/utils/analytics';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export function ShareButtons({ url, title, label = 'Bu aracı paylaş:' }) {
  const iconSize = 32;
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackEvent('tool_share', { channel: 'copy_link' });
      toast.success('Bağlantı kopyalandı');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Bağlantı kopyalanamadı');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3" aria-label="Paylaşım seçenekleri">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>

      <TwitterShareButton
        url={url}
        title={title}
        hashtags={['AIKeşif', 'YapayZeka']}
        aria-label="X üzerinde paylaş"
        onClick={() => trackEvent('tool_share', { channel: 'x' })}
      >
        <TwitterIcon size={iconSize} round aria-hidden="true" />
      </TwitterShareButton>

      <LinkedinShareButton
        url={url}
        title={title}
        aria-label="LinkedIn üzerinde paylaş"
        onClick={() => trackEvent('tool_share', { channel: 'linkedin' })}
      >
        <LinkedinIcon size={iconSize} round aria-hidden="true" />
      </LinkedinShareButton>

      <WhatsappShareButton
        url={url}
        title={title}
        separator=":: "
        aria-label="WhatsApp ile paylaş"
        onClick={() => trackEvent('tool_share', { channel: 'whatsapp' })}
      >
        <WhatsappIcon size={iconSize} round aria-hidden="true" />
      </WhatsappShareButton>

      <FacebookShareButton
        url={url}
        quote={title}
        aria-label="Facebook üzerinde paylaş"
        onClick={() => trackEvent('tool_share', { channel: 'facebook' })}
      >
        <FacebookIcon size={iconSize} round aria-hidden="true" />
      </FacebookShareButton>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="h-8 gap-1.5 rounded-full px-3"
        aria-label="Bağlantıyı kopyala"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
        ) : (
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span className="text-xs font-semibold">{copied ? 'Kopyalandı' : 'Kopyala'}</span>
      </Button>
    </div>
  );
}
