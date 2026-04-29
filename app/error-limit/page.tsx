'use client';

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorLimitContent() {
  const searchParams = useSearchParams();
  const used = searchParams.get("used");
  const limit = searchParams.get("limit");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        {/* Icono */}
        <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-3">
          Límite de conversaciones alcanzado
        </h1>

        <p className="text-gray-600 mb-4 leading-relaxed">
          Este chat ha alcanzado el límite de{" "}
          <strong>{limit ?? "30"} conversaciones por mes</strong> del plan gratuito.
          {used ? ` Se han utilizado ${used} conversaciones este mes.` : ""}
        </p>

        <p className="text-sm text-gray-500 mb-6">
          Para continuar usando el chatbot sin límites, el administrador del sitio
          puede activar el plan Pro desde la plataforma Scrivot.
        </p>

        <p className="text-xs text-gray-400">
          El límite se reinicia automáticamente el primer día de cada mes.
        </p>
      </div>
    </div>
  );
}

export default function ErrorLimitPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ErrorLimitContent />
    </Suspense>
  );
}
