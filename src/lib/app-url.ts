function toOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.origin;
  } catch {
    return null;
  }
}

/** Returns a stable public origin for drop and QR links. */
export function getAppOrigin(requestOrigin: string): string {
  const isVercelDeployment = Boolean(
    process.env.VERCEL_URL ||
      process.env.VERCEL_ENV ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL
  );

  if (isVercelDeployment) {
    const vercelHost =
      process.env.VERCEL_ENV === "production"
        ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
        : process.env.VERCEL_URL;

    return toOrigin(vercelHost) || requestOrigin;
  }

  return (
    toOrigin(process.env.NEXT_PUBLIC_APP_URL) ||
    requestOrigin ||
    "http://localhost:3000"
  );
}
