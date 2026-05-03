export function checkAdminAuth(request: Request): boolean {
  const cookie = request.headers.get('cookie') || ''
  if (cookie.includes('imba_admin=true')) return true
  const auth = request.headers.get('authorization') || ''
  return auth === 'Bearer imba-admin-2025'
}

export function getAdminCookie(): string {
  return `imba_admin=true; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
}
