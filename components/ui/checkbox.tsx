import type { ComponentProps } from "react";
import { GLYPH, Icon } from "@/components/ui/icons";

/**
 * A checkbox that draws its tick. The real input is visually hidden but stays focusable and labelled;
 * `.check` styles in globals.css respond to its :checked and :focus-visible. `pop` fires the one-off ring.
 */
export function Checkbox({ pop = false, className = "", ...props }: ComponentProps<"input"> & { pop?: boolean }) {
  return (
    <span className={`relative inline-grid size-[18px] shrink-0 place-items-center ${className}`}>
      <input type="checkbox" className="peer absolute inset-0 m-0 size-full cursor-pointer appearance-none opacity-0" {...props} />
      <span aria-hidden="true" className={`check ${pop ? "check-pop" : ""}`}>
        <Icon size={12}>{GLYPH.check}</Icon>
      </span>
    </span>
  );
}
