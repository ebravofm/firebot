import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Obtener parámetros de URL
  const url = new URL(request.url);
  const jwtFromUrl = url.searchParams.get('jwt');
  const chatbotIdFromUrl = url.searchParams.get('chatbot_id');
  
  // Determinar si estamos en producción
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Guardar JWT en cookie si existe en URL
  if (jwtFromUrl) {
    response.cookies.set('jwt', jwtFromUrl, {
      path: '/',
      maxAge: 86400, // 24 horas
      httpOnly: false, // Permitir acceso desde JavaScript si es necesario
      secure: isProduction, // HTTPS en producción
      sameSite: 'lax'
    });
  }
  
  // Guardar chatbot_id en cookie si existe en URL
  if (chatbotIdFromUrl) {
    response.cookies.set('chatbot_id', chatbotIdFromUrl, {
      path: '/',
      maxAge: 86400, // 24 horas
      httpOnly: false, // Permitir acceso desde JavaScript si es necesario
      secure: isProduction, // HTTPS en producción
      sameSite: 'lax'
    });
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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
