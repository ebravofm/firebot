import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Obtener parámetros de URL
  const url = new URL(request.url);
  const jwtFromUrl = url.searchParams.get('jwt');
  const existingJwtCookie = request.cookies.get('jwt')?.value;
  
  // Si estamos en la página de error, permitir acceso
  if (url.pathname === '/error-access') {
    return NextResponse.next();
  }
  
  // Verificar si tenemos JWT (en URL o en cookie)
  if (!jwtFromUrl && !existingJwtCookie) {
    console.log('❌ No JWT found - redirecting to error page');
    return NextResponse.redirect(new URL('/error-access', request.url));
  }
  
  const response = NextResponse.next();
  
  // Determinar si estamos en producción
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Guardar JWT en cookie si existe en URL
  // El JWT ahora contiene el chatbot_id embebido, no necesitamos parámetro separado
  if (jwtFromUrl) {
    response.cookies.set('jwt', jwtFromUrl, {
      path: '/',
      maxAge: 86400, // 24 horas
      httpOnly: false, // Permitir acceso desde JavaScript si es necesario
      secure: isProduction, // HTTPS en producción
      sameSite: 'lax'
    });
    
    console.log('🎫 JWT widget token guardado en cookie');
  }
  
  return response;
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
