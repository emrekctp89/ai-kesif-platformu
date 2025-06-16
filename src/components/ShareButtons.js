'use client'

import {
  TwitterShareButton,
  LinkedinShareButton,
  WhatsappShareButton,
  FacebookShareButton,
} from "react-share";

import {
  TwitterIcon,
  LinkedinIcon,
  WhatsappIcon,
  FacebookIcon,
} from "react-share";

export function ShareButtons({ url, title }) {
  const iconSize = 32; // İkonların boyutu

  return (
    <div className="flex items-center gap-3">
        <p className="text-sm font-medium text-muted-foreground">Bu aracı paylaş:</p>
        
        {/* Twitter Paylaşım Butonu */}
        <TwitterShareButton
            url={url}
            title={title}
            hashtags={["AIKeşif", "YapayZeka"]} // Paylaşıma eklenecek etiketler
        >
            <TwitterIcon size={iconSize} round />
        </TwitterShareButton>

        {/* LinkedIn Paylaşım Butonu */}
        <LinkedinShareButton url={url} title={title}>
            <LinkedinIcon size={iconSize} round />
        </LinkedinShareButton>
        
        {/* WhatsApp Paylaşım Butonu */}
        <WhatsappShareButton url={url} title={title} separator=":: ">
            <WhatsappIcon size={iconSize} round />
        </WhatsappShareButton>

        {/* Facebook Paylaşım Butonu */}
        <FacebookShareButton url={url} quote={title}>
            <FacebookIcon size={iconSize} round />
        </FacebookShareButton>
    </div>
  );
}
