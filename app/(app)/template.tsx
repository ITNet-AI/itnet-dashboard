/** Remounts on every navigation, so the page content rises in once the server has it. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="rise-in">{children}</div>;
}
