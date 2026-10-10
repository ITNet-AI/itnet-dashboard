import Link from "@/components/ui/link";

export default function NotFound() {
  return (
    <div className="flex flex-col gap-3 py-10">
      <h1 className="display">Not here</h1>
      <p className="text-body text-ink-2">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/" className="text-ui font-medium text-accent hover:underline">
        Go home
      </Link>
    </div>
  );
}
