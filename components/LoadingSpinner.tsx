"use client";

import { HashLoader } from "react-spinners";
import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  color?: string;
  speedMultiplier?: number;
}

export function LoadingSpinner({
  message = "Cargando conversación...",
  size = 50,
  color = "#f6c201",
  speedMultiplier = 1,
}: LoadingSpinnerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed inset-0 bg-white z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex flex-col items-center space-y-6"
      >
        <HashLoader
          color={color}
          size={size}
          speedMultiplier={speedMultiplier}
          loading={true}
        />
        <p className="text-gray-700 font-semibold text-lg tracking-wide animate-pulse">
          {message}
        </p>
      </motion.div>
    </motion.div>
  );
}
