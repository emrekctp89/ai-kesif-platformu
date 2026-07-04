'use client';

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
import { trackEvent } from '@/utils/analytics';

export function ShareButtons({ url, title }) {
  const iconSize = 32;

  return (
    <div className="flex flex-wrap items-center gap-3" aria-label="Paylaşım seçenekleri">
      <p className="text-sm font-medium text-muted-foreground">Bu aracı paylaş:</p>

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
    </div>
  );
}
