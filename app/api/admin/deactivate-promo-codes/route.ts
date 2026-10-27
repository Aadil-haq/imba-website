import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'

async function stripeGet(path: string, key: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${key}`, 'Stripe-Version': '2023-10-16' },
  })
  return res.json()
}

async function stripePost(path: string, params: Record<string, string>, key: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2023-10-16',
    },
    body: new URLSearchParams(params).toString(),
  })
  return res.json()
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey || stripeKey === 'sk_test_placeholder') {
    return NextResponse.json({ error: 'No Stripe key configured' }, { status: 400 })
  }

  // Fetch all active promotion codes (up to 100)
  const list = await stripeGet('/promotion_codes?active=true&limit=100', stripeKey)
  if (list.error) return NextResponse.json({ error: list.error.message }, { status: 500 })

  const codes = list.data ?? []
  const results: string[] = []

  for (const promo of codes) {
    const updated = await stripePost(`/promotion_codes/${promo.id}`, { active: 'false' }, stripeKey)
    if (updated.error) {
      results.push(`✗ ${promo.code}: ${updated.error.message}`)
    } else {
      results.push(`✓ ${promo.code} deactivated`)
    }
  }

  return NextResponse.json({ ok: true, deactivated: results.length, results })
}
