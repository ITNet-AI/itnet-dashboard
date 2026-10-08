import Image from "next/image";
import logo from "@/public/logo.png";

/** The ITNET AI logo from itnetai.com. Height drives size; width follows the 1600×437 artwork. */
export function Logo({ height = 24 }: { height?: number }) {
  return <Image src={logo} alt="ITNET AI" height={height} width={Math.round((height * 1600) / 437)} priority />;
}
