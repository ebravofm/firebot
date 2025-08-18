"use client";

import React from "react";
import { Info, X, Zap } from "lucide-react";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Información del Chat</h2>
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Cerrar"
            type="button"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-gray-700 leading-relaxed">
            Este chat es una herramienta de asistencia virtual diseñada para ayudarte con tus consultas y proporcionarte información relevante.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Este Asistente Virtual es un sistema automatizado de IA. Verifica la información en fuentes oficiales si lo necesitas.
            </p>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Puedes hacer zoom con los controles del menú</p>
            <p>• Usa “Reiniciar chat” para comenzar una nueva conversación</p>
            <p>• El chat mantiene el contexto de tu conversación</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="text-center">
            <a
              href="https://datapulse.cl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-1"
            >
              <span>Desarrollado por</span>
              <span className="font-semibold text-blue-600">DataPulse</span>
              <Zap className="w-4 h-4 text-blue-500" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            type="button"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}


