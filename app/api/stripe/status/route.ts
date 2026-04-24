import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY || ''
  const configured = key.length > 0 && key !== 'sk_test_placeholder' && !key.includes('placeholder')
  return NextResponse.json({ configured })
}
