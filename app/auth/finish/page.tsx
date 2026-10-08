import { Suspense } from "react";
import { FinishSignIn } from "./finish";

export default function FinishPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 text-ui text-ink-2">
      <Suspense>
        <FinishSignIn />
      </Suspense>
    </div>
  );
}
