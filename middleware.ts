import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const jwtFromUrl = url.searchParams.get('jwt');

  // Si estamos en la página de error, permitir acceso
  if (url.pathname === '/error-access') {
    return NextResponse.next();
  }

  // En el modo iframe, el JWT *debe* venir en la URL en la primera carga.
  // No se usan cookies para evitar problemas de bloqueo de terceros.
  // Las cargas/navegaciones posteriores dentro del iframe usarán el JWT 
  // guardado en localStorage por el cliente.
  if (!jwtFromUrl && url.pathname !== '/chat') {
     // Permitimos el acceso a /chat sin JWT en la URL para que pueda crear un nuevo chat
     // luego de un reset, por ejemplo. La protección real estará en las páginas
     // que intenten cargar datos.
  }
  
  // El middleware ya no necesita establecer cookies. El cliente se encargará
  // de leer el JWT de la URL y guardarlo en localStorage.
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
