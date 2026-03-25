"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RatingOverlayProps {
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  primaryColor?: string;
}

const emojis = [
  { value: 1, emoji: "\u{1F61E}", label: "Muy mala" },
  { value: 2, emoji: "\u{1F615}", label: "Mala" },
  { value: 3, emoji: "\u{1F610}", label: "Regular" },
  { value: 4, emoji: "\u{1F60A}", label: "Buena" },
  { value: 5, emoji: "\u{1F60D}", label: "Excelente" },
];

const COMMENT_MAX_LENGTH = 100;

export function RatingOverlay({
  onClose,
  onSubmit,
  primaryColor = "#2563eb",
}: RatingOverlayProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === null || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, comment);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEmoji = rating !== null ? emojis.find((e) => e.value === rating) : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-50 flex items-center justify-center bg-white"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-sm mx-auto px-5 py-6 flex flex-col items-center"
        >
          {!submitted ? (
            <>
              {/* Title */}
              <h2 className="text-lg font-semibold text-gray-900 text-center mb-1">
                ¿Cómo calificarías tu experiencia?
              </h2>
              <p className="text-sm text-gray-500 text-center mb-5">
                Selecciona una opción del 1 al 5
              </p>

              {/* Emoji buttons */}
              <div className="flex gap-3 mb-5">
                {emojis.map((item) => {
                  const isSelected = rating === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRating(item.value)}
                      className="flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-2.5 transition-all duration-150 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1"
                      style={{
                        borderColor: isSelected ? primaryColor : "#e5e7eb",
                        backgroundColor: isSelected ? `${primaryColor}10` : "#fff",
                        boxShadow: isSelected
                          ? `0 0 0 1px ${primaryColor}`
                          : undefined,
                        // focus ring color
                        ...({"--tw-ring-color": primaryColor} as React.CSSProperties),
                      }}
                      aria-label={`${item.label} - ${item.value}`}
                    >
                      <span className="text-2xl leading-none">{item.emoji}</span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: isSelected ? primaryColor : "#6b7280" }}
                      >
                        {item.value}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Comment textarea */}
              <div className="w-full mb-5">
                <label
                  htmlFor="rating-comment"
                  className="block text-sm text-gray-600 mb-1.5"
                >
                  Añade un comentario (opcional)
                </label>
                <textarea
                  id="rating-comment"
                  value={comment}
                  onChange={(e) => {
                    if (e.target.value.length <= COMMENT_MAX_LENGTH) {
                      setComment(e.target.value);
                    }
                  }}
                  maxLength={COMMENT_MAX_LENGTH}
                  rows={3}
                  placeholder="Cuéntanos más sobre tu experiencia..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors"
                  style={
                    {
                      "--tw-ring-color": primaryColor,
                    } as React.CSSProperties
                  }
                />
                <p className="text-xs text-gray-400 text-right mt-1">
                  {comment.length}/{COMMENT_MAX_LENGTH}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={rating === null || submitting}
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor:
                      rating === null || submitting
                        ? "#9ca3af"
                        : primaryColor,
                    ...({"--tw-ring-color": primaryColor} as React.CSSProperties),
                  }}
                >
                  {submitting ? "Enviando..." : "Enviar Valoración"}
                </button>
              </div>
            </>
          ) : (
            /* Thank-you state */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col items-center text-center py-4"
            >
              <span className="text-5xl mb-4">{selectedEmoji?.emoji}</span>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                ¡Gracias por tu valoración!
              </h2>
              {comment && (
                <p className="text-sm text-gray-500 italic mb-4 max-w-[260px]">
                  &ldquo;{comment}&rdquo;
                </p>
              )}
              <button
                type="button"
                onClick={onClose}
                className="mt-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
                style={{
                  backgroundColor: primaryColor,
                  ...({"--tw-ring-color": primaryColor} as React.CSSProperties),
                }}
              >
                Cerrar
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
