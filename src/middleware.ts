import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Supported locales
const locales = ['en', 'zh']
 
export function middleware(request: NextRequest) {
  // Get the pathname
  const { pathname } = request.nextUrl
  
  // Skip if the request is for an asset or API route
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if the pathname already has a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) return NextResponse.next()

  // Get locale from cookie or accept-language header
  let locale = request.cookies.get('NEXT_LOCALE')?.value
  if (!locale) {
    locale = request.headers.get('accept-language')?.split(',')[0].split('-')[0] ?? 'en'
    locale = locales.includes(locale) ? locale : 'en'
  }

  // Redirect to the same pathname with locale prefixed
  return NextResponse.redirect(
    new URL(
      `/${locale}${pathname === '/' ? '' : pathname}`,
      request.url
    )
  )
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, assets, api)
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 