'use client';

import { useEffect, useState } from 'react';
import { ENV_CONFIG } from '@/lib/env';

export default function TestWidgetPage() {
  const [jwt, setJwt] = useState<string>('');
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  useEffect(() => {
    // Obtener JWT de los query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const jwtParam = urlParams.get('jwt');
    
    if (jwtParam) {
      setJwt(jwtParam);
      loadWidget(jwtParam);
    }
  }, []);

  const loadWidget = (jwtToken: string) => {
    // Crear script del widget con el JWT usando WIDGET_URL
    const script = document.createElement('script');
    script.src = `${ENV_CONFIG.WIDGET_URL}/widget.js?jwt=${jwtToken}`;
    script.async = true;
    script.onload = () => setWidgetLoaded(true);
    script.onerror = () => console.error('Error al cargar el widget');
    
    // Agregar al body
    document.body.appendChild(script);
  };

  const handleJwtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jwt.trim()) {
      // Recargar la página con el nuevo JWT
      window.location.href = `/test-widget?jwt=${encodeURIComponent(jwt)}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Test Widget Page
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Configuración del Widget</h2>
          
          <form onSubmit={handleJwtSubmit} className="space-y-4">
            <div>
              <label htmlFor="jwt" className="block text-sm font-medium text-gray-700 mb-2">
                JWT Token:
              </label>
              <input
                type="text"
                id="jwt"
                value={jwt}
                onChange={(e) => setJwt(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cargar Widget con JWT
            </button>
          </form>
          
          {jwt && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                <strong>JWT actual:</strong> {jwt.substring(0, 50)}...
              </p>
              <p className="text-sm text-green-600">
                Widget {widgetLoaded ? 'cargado' : 'cargando'} correctamente
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Instrucciones de Uso</h2>
          <div className="space-y-2 text-gray-600">
            <p>1. Ingresa un JWT válido en el campo de arriba</p>
            <p>2. Haz clic en &quot;Cargar Widget con JWT&quot;</p>
            <p>3. El widget aparecerá como un botón flotante en la esquina inferior derecha</p>
            <p>4. También puedes acceder directamente con: <code className="bg-gray-100 px-2 py-1 rounded">/test-widget?jwt=TU_JWT_AQUI</code></p>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">JWT de Prueba:</h3>
          <code className="text-sm text-blue-700 break-all">
            eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJfaWQiOjEsImlkIjoxLCJlbWFpbCI6ImVtby5icmF2b0BnbWFpbC5jb20iLCJ3b3Jrc3BhY2VfaWQiOjEsInJvbGVfaWQiOjIsImNoYXRib3RfaWQiOjEsInR5cGUiOiJ3aWRnZXQiLCJpYXQiOjE3NTczOTMzMDV9.pliKgLVKKKiTI1dExPXjSULh29pWCqapo7uLIikjQ5g
          </code>
        </div>
      </div>
    </div>
  );
}
