import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh bg-bg px-4 sm:px-10">
      <div className="mx-auto flex min-h-dvh max-w-[1120px] flex-col">
        <div className="pt-8">
          <Logo height={34} />
        </div>
        <main className="flex flex-1 flex-col justify-center pb-[18vh]">
          <div className="w-full max-w-[360px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
