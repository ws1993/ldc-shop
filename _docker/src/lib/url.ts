/**
 * Get the correct base URL from request headers, falling back to APP_URL.
 *
 * In Docker, HOSTNAME=0.0.0.0 causes request.url to have the wrong origin.
 * This helper reads the reverse proxy headers to determine the real origin.
 */
export function getRequestBaseUrl(request: Request): string {
    const headers = new Headers(request.headers)

    const forwardedProto = headers.get("x-forwarded-proto") || "https"
    const forwardedHost = headers.get("x-forwarded-host") || headers.get("host")

    if (forwardedHost) {
        const proto = forwardedProto.split(",")[0].trim()
        return `${proto}://${forwardedHost}`
    }

    if (process.env.APP_URL) return process.env.APP_URL
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL

    return new URL(request.url).origin
}
