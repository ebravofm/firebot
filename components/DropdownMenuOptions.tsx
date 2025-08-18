"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Menu, Info, RefreshCcw, Search, Plus, Minus } from "lucide-react";
import React from "react";

interface DropdownMenuOptionsProps {
  onReset: () => Promise<void>;
  onInfo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function DropdownMenuOptions({ onReset, onInfo, onZoomIn, onZoomOut }: DropdownMenuOptionsProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors focus:outline-none"
          aria-label="Opciones"
          type="button"
        >
          <Menu className="w-4 h-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[153px] bg-white rounded-md shadow-lg p-0.5 border border-gray-200 z-50 text-[0.85em]"
          sideOffset={8}
          align="end"
        >
          <DropdownMenu.Item
            className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            onSelect={onReset}
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Reiniciar chat</span>
          </DropdownMenu.Item>
          <div className="flex items-center justify-between px-2 py-1.5 gap-2">
            <span className="flex items-center gap-2 text-gray-700">
              <Search className="w-3.5 h-3.5" />
              Zoom
            </span>
            <div className="flex items-center gap-1">
              <button
                className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Disminuir zoom"
                onClick={onZoomOut}
                type="button"
                style={{ lineHeight: 1 }}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Aumentar zoom"
                onClick={onZoomIn}
                type="button"
                style={{ lineHeight: 1 }}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <DropdownMenu.Separator className="my-0.5 h-px bg-gray-200" />
          <DropdownMenu.Item
            className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            onSelect={onInfo}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Información</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}


