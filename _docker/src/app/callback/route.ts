import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getRequestBaseUrl } from "@/lib/url"

function normalizeOrderId(input: string | null): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  if (trimmed.includes("?")) {
    return trimmed.split("?")[0] || null
  }
  return trimmed
}

export async function GET(request: Request) {
  const baseUrl = getRequestBaseUrl(request)
  const url = new URL(request.url)
  const queryOrder =
    normalizeOrderId(url.searchParams.get("out_trade_no")) ||
    normalizeOrderId(url.searchParams.get("order_no")) ||
    normalizeOrderId(url.searchParams.get("orderId"))

  let orderId = queryOrder
  if (!orderId) {
    const cookieStore = await cookies()
    orderId = normalizeOrderId(cookieStore.get("ldc_pending_order")?.value ?? null)
  }

  const destination = orderId ? `/order/${orderId}` : "/orders"
  return NextResponse.redirect(new URL(destination, baseUrl))
}
