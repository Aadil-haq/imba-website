export function checkAdminAuth(request: Request): boolean {
  const cookie = request.headers.get('cookie') || ''
  return cookie.includes('imba_admin=true')
}

export function getAdminCookie(): string {
  return `imba_admin=true; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
}
