import type { ComponentProps, ReactNode } from "react";

const control =
  "w-full rounded-ctl border border-line-2 bg-surface px-2.5 text-body text-ink placeholder:text-ink-3 hover:border-ink-3 focus:border-accent focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-accent-soft disabled:bg-sunk";

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-ui font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint ? <p className="text-meta text-ink-3">{hint}</p> : null}
    </div>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${control} h-9 ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${control} min-h-20 resize-y py-2 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${control} h-9 pr-8 ${className}`} {...props} />;
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-ctl bg-crit-soft px-3 py-2 text-ui text-crit">
      {message}
    </p>
  );
}
