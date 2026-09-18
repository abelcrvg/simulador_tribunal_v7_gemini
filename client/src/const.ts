export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const APP_TITLE = "Simulador de Tribunal";

export const APP_LOGO = "/favicon.ico";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const localAuth =
    import.meta.env.VITE_LOCAL_AUTH === "true" ||
    (import.meta.env.DEV && !import.meta.env.VITE_OAUTH_PORTAL_URL);

  if (localAuth) {
    return "/api/auth/local/login";
  }

  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
