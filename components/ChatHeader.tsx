"use client";

import { useState, useRef, useEffect } from "react";
import { useChatbotConfig } from "@/lib/chatbot-config-context";
import { Menu, X, Minus, Plus, RotateCcw } from "lucide-react";
import { storage } from "@/lib/storage";

interface ChatHeaderProps {
  onClose?: () => void;
  onReset?: () => void;
}

export function ChatHeader({ onClose, onReset }: ChatHeaderProps) {
  const { ui } = useChatbotConfig();
  const wa = ui.widget_appearance;

  const bgColor = wa?.primary_color ?? "#5B4FFF";
  const textColor = wa?.text_color ?? "#ffffff";
  const iconUrl = ui.assistant_icon_url;
  const enableFontZoom = wa?.enable_font_zoom ?? false;
  const enableHighContrast = wa?.enable_high_contrast_toggle ?? false;
  const showAccessibility = enableFontZoom || enableHighContrast;

  // Resolve builtin icon types
  const isBuiltinDefault = !iconUrl || iconUrl === "builtin:default";
  const isBuiltinSparkles = iconUrl === "builtin:sparkles";

  // Accessibility menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [zoomOn, setZoomOn] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close menu on outside click (excluding toggle button)
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        toggleRef.current && !toggleRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Apply font scale
  useEffect(() => {
    if (typeof document !== "undefined") {
      const size = Math.round(16 * fontScale);
      document.body.style.fontSize = `${size}px`;
      storage.setFontSize(size);
    }
  }, [fontScale]);

  // Apply high contrast
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", highContrast);
    }
  }, [highContrast]);

  const clamp = (v: number) => Math.max(0.8, Math.min(1.5, Math.round(v * 20) / 20));

  return (
    <header
      className="flex items-center justify-between px-4 py-3 shrink-0 relative"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="flex items-center gap-2.5">
        {/* Icon */}
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20 overflow-hidden">
          {isBuiltinDefault ? (
            <DefaultChatIcon color={textColor} />
          ) : isBuiltinSparkles ? (
            <SparklesIcon color={textColor} />
          ) : iconUrl ? (
            <img src={iconUrl} alt="" className="size-full object-cover" />
          ) : (
            <DefaultChatIcon color={textColor} />
          )}
        </div>

        {/* Title & Subtitle */}
        <div className="leading-tight">
          <div className="text-sm font-semibold" style={{ color: textColor }}>
            {ui.header_title}
          </div>
          {ui.header_subtitle && (
            <div className="text-xs opacity-90" style={{ color: textColor }}>
              {ui.header_subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-md p-1.5 hover:bg-white/10 transition-colors"
            style={{ color: textColor }}
            aria-label="Reiniciar conversación"
          >
            <RotateCcw className="size-4" />
          </button>
        )}
        {showAccessibility && (
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-1.5 hover:bg-white/10 transition-colors"
            style={{ color: textColor }}
            aria-label="Opciones de accesibilidad"
          >
            <Menu className="size-4" />
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="hover:opacity-80 transition-opacity"
            style={{ color: textColor }}
            aria-label="Cerrar chat"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Accessibility Panel (inline popover style) */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-full right-2 mt-1 z-50 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3"
          style={{ color: "#1f2937", maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Accesibilidad</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Cerrar"
            >
              <X className="size-4 text-gray-500" />
            </button>
          </div>

          {enableFontZoom && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Zoom</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={zoomOn}
                    onChange={(e) => {
                      setZoomOn(e.target.checked);
                      if (!e.target.checked) setFontScale(1);
                      if (e.target.checked && fontScale === 1) setFontScale(1.1);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500" />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFontScale(clamp(fontScale - 0.1))}
                  disabled={!zoomOn}
                  className="h-7 w-7 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-40"
                >
                  <Minus className="size-3" />
                </button>
                <input
                  type="range"
                  min={0.8}
                  max={1.5}
                  step={0.05}
                  value={fontScale}
                  onChange={(e) => setFontScale(Number(e.target.value))}
                  disabled={!zoomOn}
                  className="flex-1"
                  aria-label="Zoom de fuente"
                />
                <button
                  type="button"
                  onClick={() => setFontScale(clamp(fontScale + 0.1))}
                  disabled={!zoomOn}
                  className="h-7 w-7 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-40"
                >
                  <Plus className="size-3" />
                </button>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>80%</span>
                <span className="font-medium text-gray-600 dark:text-gray-300">{Math.round(fontScale * 100)}%</span>
                <span>150%</span>
              </div>
            </div>
          )}

          {enableHighContrast && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-gray-700 dark:text-gray-300">Alto contraste</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500" />
              </label>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

function DefaultChatIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SparklesIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
    </svg>
  );
}
