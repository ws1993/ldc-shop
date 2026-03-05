import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { BuyContent } from "@/components/buy-content"
import { BuyRestricted } from "@/components/buy-restricted"
import { getProduct, getProductVisibility, getLiveCardStats } from "@/lib/db/queries"
import { INFINITE_STOCK } from "@/lib/constants"

interface BuyPageProps {
    params: Promise<{ id: string }>
}

export default async function BuyPage({ params }: BuyPageProps) {
    const { id } = await params
    const session = await auth()
    const isLoggedIn = !!session?.user
    const trustLevel = Number.isFinite(Number(session?.user?.trustLevel)) ? Number(session?.user?.trustLevel) : 0

    // Keep first render lean: load only critical product data.
    const product = await getProduct(id, { isLoggedIn, trustLevel }).catch(() => null)

    // Return 404 if product doesn't exist or is inactive
    if (!product) {
        const visibility = await getProductVisibility(id).catch(() => null)
        if (!visibility || visibility.isActive === false) {
            notFound()
        }
        const requiredLevel = Number.isFinite(Number(visibility.visibilityLevel))
            ? Number(visibility.visibilityLevel)
            : -1
        if (requiredLevel < 0) {
            notFound()
        }
        return <BuyRestricted requiredLevel={requiredLevel} isLoggedIn={isLoggedIn} />
    }

    const liveStats = product ? await getLiveCardStats([product.id]).catch(() => new Map()) : new Map()
    const stat = product ? (liveStats.get(product.id) || { unused: 0, available: 0, locked: 0 }) : { unused: 0, available: 0, locked: 0 }
    const liveAvailable = product
        ? (product.isShared
            ? (stat.unused > 0 ? INFINITE_STOCK : 0)
            : stat.available)
        : 0
    const liveLocked = product ? stat.locked : 0

    return (
        <BuyContent
            product={product}
            stockCount={liveAvailable}
            lockedStockCount={liveLocked}
            isLoggedIn={!!session?.user}
            reviews={[]}
            averageRating={Number(product.rating || 0)}
            reviewCount={Number(product.reviewCount || 0)}
            canReview={false}
            reviewOrderId={undefined}
            emailConfigured={false}
        />
    )
}
