import { NextResponse } from "next/server"
import { getRequestBaseUrl } from "@/lib/url"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const baseUrl = getRequestBaseUrl(request)
  const orderId = (id || "").trim()

  if (orderId) {
    return NextResponse.redirect(new URL(`/order/${orderId}`, baseUrl))
  }

  return NextResponse.redirect(new URL("/", baseUrl))
}
