import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Firebot Assistant",
  description: "Asistente Virtual de Firebot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <TooltipProvider>
          {/* 
            JWTHandler fue eliminado. La lógica ahora está en app/page.tsx.
            Mantenemos Suspense por si alguna otra página/componente necesita 
            leer parámetros de la URL de forma segura en el cliente.
          */}
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </TooltipProvider>
      </body>
    </html>
  );
}
