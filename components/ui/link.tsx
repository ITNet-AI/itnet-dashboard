import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * next/link with prefetching off. Every page here is rendered per request, so a prefetch only fetches the
 * loading skeleton, yet each one is a full server call (auth check plus the layout's queries). Landing on
 * Home used to fire about twenty of them.
 */
export default function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}
