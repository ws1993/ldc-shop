'use client'

import { useEffect, useMemo, useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BuyButton } from "@/components/buy-button"
import { StarRating } from "@/components/star-rating"
import { ReviewForm } from "@/components/review-form"
import { ReviewList } from "@/components/review-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import ReactMarkdown from 'react-markdown'
import { Loader2, Minus, Plus, Share2 } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { INFINITE_STOCK } from "@/lib/constants"
import { getBuyPageMeta } from "@/actions/buy"

interface Product {
    id: string
    name: string
    description: string | null
    price: string
    compareAtPrice?: string | null
    image: string | null
    category: string | null
    purchaseLimit?: number | null
    purchaseWarning?: string | null
    isHot?: boolean | null
}

interface Review {
    id: number
    username: string
    userId?: string | null
    rating: number
    comment: string | null
    createdAt: Date | string | null
}

interface BuyContentProps {
    product: Product
    stockCount: number
    lockedStockCount?: number
    isLoggedIn: boolean
    reviews?: Review[]
    averageRating?: number
    reviewCount?: number
    canReview?: boolean
    reviewOrderId?: string
    emailConfigured?: boolean
}

export function BuyContent({
    product,
    stockCount,
    lockedStockCount = 0,
    isLoggedIn,
    reviews = [],
    averageRating = 0,
    reviewCount = 0,
    canReview = false,
    reviewOrderId,
    emailConfigured = false
}: BuyContentProps) {
    const { t } = useI18n()
    const [shareUrl, setShareUrl] = useState('')
    const [quantity, setQuantity] = useState(1)
    const [showWarningDialog, setShowWarningDialog] = useState(false)
    const [warningConfirmed, setWarningConfirmed] = useState(false)
    const [reviewsState, setReviewsState] = useState<Review[]>(reviews)
    const [averageRatingState, setAverageRatingState] = useState(averageRating)
    const [reviewCountState, setReviewCountState] = useState(reviewCount)
    const [canReviewState, setCanReviewState] = useState(canReview)
    const [reviewOrderIdState, setReviewOrderIdState] = useState<string | undefined>(reviewOrderId)
    const [emailConfiguredState, setEmailConfiguredState] = useState(emailConfigured)
    const [metaLoading, setMetaLoading] = useState(true)
    const [metaRefreshSeq, setMetaRefreshSeq] = useState(0)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setShareUrl(window.location.href)
        }
    }, [product.id])

    useEffect(() => {
        let cancelled = false

        const loadMeta = async () => {
            setMetaLoading(true)
            try {
                const meta = await getBuyPageMeta(product.id)
                if (cancelled) return

                setReviewsState(meta.reviews)
                setAverageRatingState(meta.averageRating)
                setReviewCountState(meta.reviewCount)
                setCanReviewState(meta.canReview)
                setReviewOrderIdState(meta.reviewOrderId)
                setEmailConfiguredState(meta.emailConfigured)
            } catch {
                // Keep initial values when lazy fetch fails.
            } finally {
                if (!cancelled) {
                    setMetaLoading(false)
                }
            }
        }

        void loadMeta()
        return () => {
            cancelled = true
        }
    }, [product.id, metaRefreshSeq])

    const shareLinks = useMemo(() => {
        if (!shareUrl) return null
        const encodedUrl = encodeURIComponent(shareUrl)
        const shareText = product.name
        const encodedText = encodeURIComponent(shareText)
        return {
            x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
            line: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`
        }
    }, [shareUrl, product.name])

    const handleCopyLink = async () => {
        if (!shareUrl) return
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(shareUrl)
                toast.success(t('buy.shareCopied'))
            } catch {
                toast.error(t('buy.shareFailed'))
            }
            return
        }
        toast.error(t('buy.shareFailed'))
    }

    const hasUnlimitedStock = stockCount >= INFINITE_STOCK
    const hasStock = stockCount > 0 || hasUnlimitedStock
    const maxStock = hasUnlimitedStock ? INFINITE_STOCK : (stockCount - lockedStockCount)
    const maxSelectableQuantity = product.purchaseLimit && product.purchaseLimit > 0
        ? Math.min(maxStock, product.purchaseLimit)
        : maxStock
    const priceValue = Number(product.price)
    const compareAtPriceValue = product.compareAtPrice ? Number(product.compareAtPrice) : null
    const stockLabel = hasUnlimitedStock
        ? `${t('common.stock')}: ${t('common.unlimited')}`
        : (stockCount > 0 ? `${t('common.stock')}: ${stockCount}` : t('common.outOfStock'))
    const showReviewSummary = !metaLoading && reviewCountState > 0
    const descriptionPreview = (product.description || t('buy.noDescription'))
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[#>*_`~-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    return (
        <main className="container relative py-8 md:py-16">
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute left-1/2 top-[-16rem] h-[28rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.12),_transparent_62%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(96,165,250,0.18),_transparent_65%)]" />
                <div className="absolute left-[10%] top-20 h-48 w-72 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute right-[5%] top-24 h-64 w-64 rounded-full bg-cyan-200/16 blur-3xl dark:bg-cyan-400/10" />
                <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(to_right,rgba(15,23,42,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.1)_1px,transparent_1px)] [background-size:72px_72px] dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)]" />
            </div>

            <div className="mx-auto max-w-6xl space-y-8 md:space-y-10">
                <section className="grid gap-8 lg:grid-cols-[minmax(0,1.06fr)_24rem] xl:grid-cols-[minmax(0,1.06fr)_27rem]">
                    <div className="space-y-6">
                        <div className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-gradient-to-br from-card via-card/96 to-primary/5 shadow-[0_30px_90px_-48px_rgba(15,23,42,0.32)]">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.78),_transparent_32%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_36%)]" />
                            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                            <div className="relative grid gap-0 lg:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)]">
                                <div className="relative border-b border-border/20 p-5 md:p-6 lg:border-b-0 lg:border-r">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.1),_transparent_60%)] dark:bg-[radial-gradient(circle_at_center,_rgba(96,165,250,0.14),_transparent_66%)]" />
                                    <div className="relative flex h-full min-h-[20rem] items-center justify-center overflow-hidden rounded-[1.65rem] border border-border/30 bg-gradient-to-br from-primary/8 via-background to-secondary/30 p-5 md:min-h-[26rem] md:p-8">
                                        <div className="pointer-events-none absolute left-6 top-6 h-16 w-16 rounded-full bg-primary/15 blur-2xl" />
                                        <div className="pointer-events-none absolute bottom-6 right-6 h-20 w-20 rounded-full bg-cyan-400/10 blur-2xl" />
                                        <div className="relative aspect-[4/3] w-full max-w-[32rem]">
                                            <Image
                                                src={product.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${product.id}`}
                                                alt={product.name}
                                                fill
                                                sizes="(max-width: 1024px) 100vw, 56vw"
                                                className="object-contain"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="relative p-6 md:p-8">
                                    <div className="mb-5 flex flex-wrap items-center gap-2">
                                        {product.category && product.category !== 'general' && (
                                            <Badge variant="secondary" className="rounded-full border border-border/45 bg-background/70 px-3 py-1 capitalize">
                                                {product.category}
                                            </Badge>
                                        )}
                                        {product.isHot && (
                                            <Badge className="rounded-full border-0 bg-orange-500 px-3 py-1 text-white shadow-lg shadow-orange-500/20">
                                                {t('buy.hot')}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-foreground md:text-4xl xl:text-[3.35rem] xl:leading-[1.02]">
                                                {product.name}
                                            </h1>

                                            {metaLoading ? (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span>{t('common.loading')}</span>
                                                </div>
                                            ) : showReviewSummary ? (
                                                <div className="flex w-fit flex-wrap items-center gap-3 rounded-full border border-border/45 bg-background/72 px-4 py-2 text-sm text-muted-foreground">
                                                    <StarRating rating={Math.round(averageRatingState)} size="sm" />
                                                    <span className="font-medium text-foreground">{averageRatingState.toFixed(1)}</span>
                                                    <span>{reviewCountState} {t('review.title')}</span>
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="rounded-[1.5rem] border border-border/30 bg-background/65 p-5 backdrop-blur-sm">
                                            <div className="flex flex-wrap items-end gap-3">
                                                <div className="text-4xl font-semibold tracking-tight text-foreground tabular-nums md:text-5xl">
                                                    {priceValue}
                                                </div>
                                                <div className="pb-1 text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                    {t('common.credits')}
                                                </div>
                                                {compareAtPriceValue && compareAtPriceValue > priceValue && (
                                                    <div className="pb-1 text-sm text-muted-foreground line-through">
                                                        {compareAtPriceValue}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <Badge
                                                    variant={stockCount > 0 ? "outline" : "destructive"}
                                                    className={stockCount > 0 ? "rounded-full border-primary/30 bg-primary/5 px-3 text-primary" : "rounded-full px-3"}
                                                >
                                                    {stockLabel}
                                                </Badge>
                                                {typeof product.purchaseLimit === 'number' && product.purchaseLimit > 0 && (
                                                    <Badge variant="secondary" className="rounded-full border border-border/45 bg-background/70 px-3">
                                                        {t('buy.purchaseLimit', { limit: product.purchaseLimit })}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-[1.5rem] border border-border/24 bg-gradient-to-br from-background/88 to-muted/30 p-5">
                                            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                                {t('buy.description')}
                                            </div>
                                            <p className="line-clamp-4 text-sm leading-7 text-foreground/75">
                                                {descriptionPreview}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Card className="tech-card overflow-hidden border-border/35">
                            <div className="grid gap-0 lg:grid-cols-[14rem_minmax(0,1fr)]">
                                <div className="border-b border-border/20 bg-muted/18 p-6 lg:border-b-0 lg:border-r">
                                    <div className="space-y-3">
                                        <div className="inline-flex items-center rounded-full border border-border/45 bg-background/78 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                            {t('buy.description')}
                                        </div>
                                        <div className="space-y-2 text-sm leading-6 text-muted-foreground">
                                            <p>{stockLabel}</p>
                                            {typeof product.purchaseLimit === 'number' && product.purchaseLimit > 0 && (
                                                <p>{t('buy.purchaseLimit', { limit: product.purchaseLimit })}</p>
                                            )}
                                            {showReviewSummary && (
                                                <p>{averageRatingState.toFixed(1)} / {reviewCountState} {t('review.title')}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 md:p-8">
                                    <div className="prose prose-sm max-w-none break-words text-foreground/88 dark:prose-invert md:prose-base">
                                        <ReactMarkdown>
                                            {product.description || t('buy.noDescription')}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-4 lg:sticky lg:top-24">
                        <Card className="tech-card overflow-hidden border-border/35">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_36%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.14),_transparent_40%)]" />
                            <CardContent className="relative space-y-6 p-6">
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                            {t('buy.title')}
                                        </div>
                                        <div className="flex items-end justify-between gap-4">
                                            <div className="min-w-0">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                                                        {priceValue}
                                                    </span>
                                                    <span className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                        {t('common.credits')}
                                                    </span>
                                                </div>
                                                {compareAtPriceValue && compareAtPriceValue > priceValue && (
                                                    <div className="mt-2 text-sm text-muted-foreground line-through">
                                                        {compareAtPriceValue}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Badge
                                            variant={stockCount > 0 ? "outline" : "destructive"}
                                            className={stockCount > 0 ? "rounded-full border-primary/30 bg-primary/5 px-3 text-primary" : "rounded-full px-3"}
                                        >
                                            {stockLabel}
                                        </Badge>
                                        {typeof product.purchaseLimit === 'number' && product.purchaseLimit > 0 && (
                                            <Badge variant="secondary" className="rounded-full border border-border/45 bg-background/70 px-3">
                                                {t('buy.purchaseLimit', { limit: product.purchaseLimit })}
                                            </Badge>
                                        )}
                                        {showReviewSummary && (
                                            <Badge variant="secondary" className="rounded-full border border-border/45 bg-background/70 px-3">
                                                {averageRatingState.toFixed(1)} / {reviewCountState} {t('review.title')}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {isLoggedIn && hasStock && (
                                    <div className="rounded-[1.4rem] border border-border/35 bg-background/72 p-4">
                                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                            {t('buy.modal.total')}
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center rounded-2xl border border-border bg-background/95">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-11 w-11 rounded-none border-r border-border"
                                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                    disabled={quantity <= 1}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <Input
                                                    type="number"
                                                    value={quantity}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 1

                                                        if (val >= 1 && val <= maxSelectableQuantity) {
                                                            setQuantity(val)
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        let val = parseInt(e.target.value)
                                                        if (isNaN(val) || val < 1) val = 1

                                                        if (val > maxSelectableQuantity) {
                                                            val = maxSelectableQuantity
                                                            toast.error(t('buy.limitExceeded'))
                                                        }

                                                        setQuantity(val)
                                                    }}
                                                    className="h-11 flex-1 rounded-none border-x-0 text-center text-base shadow-none focus-visible:ring-0"
                                                    min={1}
                                                    max={maxSelectableQuantity}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-11 w-11 rounded-none border-l border-border"
                                                    onClick={() => {
                                                        if (quantity < maxSelectableQuantity) {
                                                            setQuantity(quantity + 1)
                                                        }
                                                    }}
                                                    disabled={quantity >= maxSelectableQuantity}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="rounded-2xl border border-border/25 bg-muted/25 px-4 py-3 text-sm font-medium text-muted-foreground">
                                                {t('buy.modal.total')}: <span className="font-semibold text-foreground">{(priceValue * quantity).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {isLoggedIn ? (
                                        hasStock ? (
                                            product.purchaseWarning && !warningConfirmed ? (
                                                <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
                                                    <DialogTrigger asChild>
                                                        <Button size="lg" className="h-12 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">
                                                            {t('common.buyNow')}
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle className="flex items-center gap-2 text-amber-600">
                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                </svg>
                                                                {t('buy.warningTitle')}
                                                            </DialogTitle>
                                                        </DialogHeader>
                                                        <div className="py-4 whitespace-pre-wrap text-sm">
                                                            {product.purchaseWarning}
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="outline" onClick={() => setShowWarningDialog(false)}>
                                                                {t('common.cancel')}
                                                            </Button>
                                                            <Button
                                                                onClick={() => {
                                                                    setWarningConfirmed(true)
                                                                    setShowWarningDialog(false)
                                                                }}
                                                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                                                            >
                                                                {t('buy.confirmWarning')}
                                                            </Button>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            ) : (
                                                <BuyButton
                                                    productId={product.id}
                                                    price={product.price}
                                                    productName={product.name}
                                                    quantity={quantity}
                                                    autoOpen={warningConfirmed && !!product.purchaseWarning}
                                                    emailConfigured={emailConfiguredState}
                                                />
                                            )
                                        ) : lockedStockCount > 0 ? (
                                            <div className="rounded-[1.4rem] border border-yellow-500/20 bg-yellow-500/8 px-4 py-4 text-yellow-700 dark:text-yellow-300">
                                                <div className="flex items-start gap-3">
                                                    <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <p className="text-sm font-medium">
                                                        {t('buy.stockLockedMessage')}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="rounded-[1.4rem] border border-destructive/20 bg-destructive/6 px-4 py-4 text-destructive">
                                                <div className="flex items-center gap-3">
                                                    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                    <p className="font-medium">{t('buy.outOfStockMessage')}</p>
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        <div className="rounded-[1.4rem] border border-border/35 bg-muted/35 px-4 py-4 text-muted-foreground">
                                            <div className="flex items-center gap-3">
                                                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <p>{t('buy.loginToBuy')}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[1.4rem] border border-border/30 bg-background/66 p-3">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-11 w-full rounded-2xl border-border/55 bg-background/82"
                                            >
                                                <Share2 className="mr-2 h-4 w-4" />
                                                {t('buy.share')}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>{t('buy.shareTitle')}</DialogTitle>
                                                <DialogDescription>{t('buy.shareDescription')}</DialogDescription>
                                            </DialogHeader>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                {shareLinks?.x ? (
                                                    <Button asChild variant="outline">
                                                        <a href={shareLinks.x} target="_blank" rel="noopener noreferrer">X (Twitter)</a>
                                                    </Button>
                                                ) : (
                                                    <Button variant="outline" disabled>X (Twitter)</Button>
                                                )}
                                                {shareLinks?.facebook ? (
                                                    <Button asChild variant="outline">
                                                        <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
                                                    </Button>
                                                ) : (
                                                    <Button variant="outline" disabled>Facebook</Button>
                                                )}
                                                {shareLinks?.telegram ? (
                                                    <Button asChild variant="outline">
                                                        <a href={shareLinks.telegram} target="_blank" rel="noopener noreferrer">Telegram</a>
                                                    </Button>
                                                ) : (
                                                    <Button variant="outline" disabled>Telegram</Button>
                                                )}
                                                {shareLinks?.whatsapp ? (
                                                    <Button asChild variant="outline">
                                                        <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                                                    </Button>
                                                ) : (
                                                    <Button variant="outline" disabled>WhatsApp</Button>
                                                )}
                                                {shareLinks?.line ? (
                                                    <Button asChild variant="outline">
                                                        <a href={shareLinks.line} target="_blank" rel="noopener noreferrer">Line</a>
                                                    </Button>
                                                ) : (
                                                    <Button variant="outline" disabled>Line</Button>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={handleCopyLink}
                                                disabled={!shareUrl}
                                            >
                                                {t('buy.shareCopy')}
                                            </Button>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                <div className="rounded-[1.3rem] border border-border/20 bg-muted/16 px-4 py-3 text-xs leading-6 text-muted-foreground">
                                    {t('buy.paymentTimeoutNotice')}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <Card id="reviews" className="tech-card scroll-mt-20 overflow-hidden border-border/35">
                    <CardHeader className="border-b border-border/20 pb-5">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <CardTitle className="text-2xl tracking-tight">
                                {t('review.title')}
                            </CardTitle>
                            {showReviewSummary && (
                                <div className="flex items-center gap-3 rounded-full border border-border/40 bg-background/72 px-4 py-2 text-sm text-muted-foreground">
                                    <StarRating rating={Math.round(averageRatingState)} size="sm" />
                                    <span className="font-medium text-foreground">{averageRatingState.toFixed(1)}</span>
                                    <span>{reviewCountState}</span>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {canReviewState && reviewOrderIdState && (
                            <div className="rounded-[1.4rem] border border-border/35 bg-muted/20 p-4">
                                <h3 className="mb-3 text-sm font-medium">{t('review.leaveReview')}</h3>
                                <ReviewForm
                                    productId={product.id}
                                    orderId={reviewOrderIdState}
                                    onSuccess={() => setMetaRefreshSeq((prev) => prev + 1)}
                                />
                            </div>
                        )}
                        {metaLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{t('common.loading')}</span>
                            </div>
                        ) : (
                            <ReviewList
                                reviews={reviewsState}
                                averageRating={averageRatingState}
                                totalCount={reviewCountState}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}
