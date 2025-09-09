'use client';

export default function ErrorAccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        {/* Icono de error */}
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg 
            className="w-8 h-8 text-red-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          Chat no disponible
        </h1>

        {/* Mensaje simple */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          El enlace que utilizaste no es válido o ha expirado.
        </p>

        <p className="text-sm text-gray-500">
          Por favor, contacta con quien te proporcionó este enlace.
        </p>

        {/* Botón de recarga (opcional) */}
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
