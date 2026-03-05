export interface ClientUpdateCheckResult {
    hasUpdate: boolean
    currentVersion: string
    latestVersion: string | null
    releaseUrl: string | null
    error?: string
}

const UPSTREAM_REPO = "chatgptuk/ldc-shop"

function compareVersions(a: string, b: string): number {
    const partsA = a.split("-")[0].split(".").map(Number)
    const partsB = b.split("-")[0].split(".").map(Number)

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const partA = partsA[i] || 0
        const partB = partsB[i] || 0
        if (partA > partB) return 1
        if (partA < partB) return -1
    }

    return 0
}

export async function checkForUpdatesClient(currentVersion: string): Promise<ClientUpdateCheckResult> {
    try {
        const releaseResponse = await fetch(
            `https://api.github.com/repos/${UPSTREAM_REPO}/releases/latest`,
            {
                headers: {
                    Accept: "application/vnd.github.v3+json",
                },
                cache: "no-store",
            }
        )

        if (releaseResponse.ok) {
            const release = await releaseResponse.json()
            const latestVersion = String(release?.tag_name || "").replace(/^v/, "")
            return {
                hasUpdate: !!latestVersion && compareVersions(latestVersion, currentVersion) > 0,
                currentVersion,
                latestVersion: latestVersion || null,
                releaseUrl: release?.html_url || `https://github.com/${UPSTREAM_REPO}/releases`,
            }
        }

        // No release: fallback to tags.
        if (releaseResponse.status === 404) {
            const tagsResponse = await fetch(
                `https://api.github.com/repos/${UPSTREAM_REPO}/tags`,
                {
                    headers: {
                        Accept: "application/vnd.github.v3+json",
                    },
                    cache: "no-store",
                }
            )

            if (tagsResponse.ok) {
                const tags = await tagsResponse.json()
                const latestTag = String(tags?.[0]?.name || "").replace(/^v/, "")
                if (!latestTag) {
                    return {
                        hasUpdate: false,
                        currentVersion,
                        latestVersion: null,
                        releaseUrl: `https://github.com/${UPSTREAM_REPO}`,
                    }
                }

                return {
                    hasUpdate: compareVersions(latestTag, currentVersion) > 0,
                    currentVersion,
                    latestVersion: latestTag,
                    releaseUrl: `https://github.com/${UPSTREAM_REPO}`,
                }
            }
        }

        throw new Error(`GitHub API error: ${releaseResponse.status}`)
    } catch (error: any) {
        return {
            hasUpdate: false,
            currentVersion,
            latestVersion: null,
            releaseUrl: null,
            error: error?.message || "update_check_failed",
        }
    }
}
