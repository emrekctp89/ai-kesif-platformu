"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const COMMON_SECOND_LEVEL_LABELS = new Set([
  "ac",
  "co",
  "com",
  "edu",
  "gov",
  "net",
  "org",
]);

function extractHostname(rawLink) {
  if (!rawLink) return null;

  const parsedLink = String(rawLink).trim();
  if (!parsedLink) return null;

  try {
    return new URL(parsedLink).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    try {
      return new URL(`https://${parsedLink}`).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return null;
    }
  }
}

function getRegistrableDomain(hostname) {
  if (!hostname) return null;

  const parts = hostname.split(".").filter(Boolean);
  if (parts.length <= 2) return hostname;

  const secondLevel = parts[parts.length - 2];
  if (COMMON_SECOND_LEVEL_LABELS.has(secondLevel) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
}

function buildIconCandidates(link) {
  const hostname = extractHostname(link);
  if (!hostname) return [];

  const domainCandidates = [...new Set([getRegistrableDomain(hostname), hostname].filter(Boolean))];
  const providers = [
    (domain) => `https://logo.clearbit.com/${domain}`,
    (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    (domain) => `https://icon.horse/icon/${domain}`,
    (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
  ];

  return domainCandidates.flatMap((domain) => providers.map((provider) => provider(domain)));
}

export default function ToolIcon({ name, link, className }) {
  const fallbackLetter = String(name || "?").trim().slice(0, 1).toUpperCase() || "?";
  const iconCandidates = React.useMemo(() => buildIconCandidates(link), [link]);
  const [candidateIndex, setCandidateIndex] = React.useState(0);

  React.useEffect(() => {
    setCandidateIndex(0);
  }, [link]);

  const currentIcon = iconCandidates[candidateIndex];

  return (
    <Avatar className={cn("h-7 w-7 shrink-0 rounded-md border bg-background", className)}>
      {currentIcon ? (
        <AvatarImage
          key={currentIcon}
          src={currentIcon}
          alt={`${name || "Araç"} ikonu`}
          onError={() => {
            setCandidateIndex((prev) =>
              prev + 1 < iconCandidates.length ? prev + 1 : prev
            );
          }}
        />
      ) : null}
      <AvatarFallback className="rounded-md text-[10px] font-semibold">
        {fallbackLetter}
      </AvatarFallback>
    </Avatar>
  );
}
