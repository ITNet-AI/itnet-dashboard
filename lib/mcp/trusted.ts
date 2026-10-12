/** The consent page only lets these redirect hosts through, so a look-alike client can't be approved by mistake. */
export const TRUSTED_REDIRECT_HOSTS = ["claude.ai", "claude.com"];

/** Whether Supabase will send the person back to Claude, and not to something that only calls itself Claude. */
export function trustedRedirect(uri: string) {
  try {
    const host = new URL(uri).hostname;
    return TRUSTED_REDIRECT_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
