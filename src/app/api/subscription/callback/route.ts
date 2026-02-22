import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/subscription/callback
 * Razorpay redirects here after hosted checkout completes (success or failure).
 * Query params: razorpay_payment_id, razorpay_payment_link_id,
 *               razorpay_payment_link_reference_id, razorpay_payment_link_status,
 *               razorpay_signature
 * The webhook handles the actual plan upgrade — this just redirects the user.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("razorpay_payment_link_status");

  if (status === "paid") {
    return NextResponse.redirect(
      new URL("/account?payment=success", request.url)
    );
  }

  return NextResponse.redirect(
    new URL("/pricing?payment=cancelled", request.url)
  );
}
