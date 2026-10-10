"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * next/link that prefetches on intent (hover, focus, touch) instead of on sight.
 * Every page here is rendered per request, so a prefetch only fetches the loading skeleton, yet each one is a
 * full server call (auth check plus the layout's queries); landing on Home used to fire about twenty.
 * Prefetching just before the click keeps the instant skeleton for one call per link actually used.
 */
export default function Link({ onMouseEnter, onFocus, onTouchStart, ...props }: ComponentProps<typeof NextLink>) {
  const router = useRouter();
  const warm = () => {
    if (typeof props.href === "string") router.prefetch(props.href);
  };
  return (
    <NextLink
      prefetch={false}
      onMouseEnter={(e) => {
        warm();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        warm();
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        warm();
        onTouchStart?.(e);
      }}
      {...props}
    />
  );
}
