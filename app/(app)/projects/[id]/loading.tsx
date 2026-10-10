import { Skeleton } from "@/components/ui/skeleton";

/** Moving between projects changes only this segment, so the shared skeleton above it never shows; this one does. */
export default function Loading() {
  return <Skeleton rows={5} />;
}
