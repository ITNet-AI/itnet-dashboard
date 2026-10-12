import { Logo } from "@/components/ui/logo";

/** Bare and centred: nothing on the consent screen but the question being asked. */
export default function ConsentLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh bg-bg px-4 sm:px-10">
      <div className="mx-auto flex min-h-dvh max-w-[1120px] flex-col">
        <div className="pt-8">
          <Logo height={34} />
        </div>
        <main className="flex flex-1 flex-col justify-center pb-[18vh]">
          <div className="w-full max-w-[440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
