import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Obtener parámetros de URL
  const url = new URL(request.url);
  const jwtFromUrl = url.searchParams.get('jwt');
  
  // Si estamos en la página de error, permitir acceso
  if (url.pathname === '/error-access') {
    return NextResponse.next();
  }
  
  // Solo verificar JWT en la primera carga (cuando viene en URL)
  // El cliente guardará el JWT en localStorage y lo enviará en las peticiones
  if (!jwtFromUrl) {
    // Si no hay JWT en URL, asumimos que ya está en localStorage del cliente
    // o es una navegación subsecuente
    return NextResponse.next();
  }
  
  // Si hay JWT en URL, permitir el acceso (el cliente lo guardará en localStorage)
  console.log('🎫 JWT encontrado en URL, permitiendo acceso');
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - widget.js (widget script)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|widget.js).*)',
  ],
};
