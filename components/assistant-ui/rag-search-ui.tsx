import { ToolCallContentPartComponent } from "@assistant-ui/react";
import { ENV_CONFIG } from "@/lib/env";
import { useState } from "react";
import { Button } from "../ui/button";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

export const RagSearchToolUI: ToolCallContentPartComponent = ({ 
  toolName, 
  argsText, 
  result 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const showResults = ENV_CONFIG.NEXT_PUBLIC_SHOW_RAG_RESULTS;
  
  // Si no se muestran resultados, solo texto simple
  if (!showResults) {
    return (
      <div className="mb-3 flex items-center gap-2 text-sm">
        {result === undefined ? (
          <div className="inline-flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse" />
            <span className="text-muted-foreground">Buscando información…</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Búsqueda completada</span>
          </div>
        )}
      </div>
    );
  }
  
  // Si se muestran resultados, cajita completa con collapsible
  return (
    <div className="mb-4 flex w-full flex-col gap-3 rounded-lg border py-3">
      <div className="flex items-center gap-2 px-4">
        <CheckIcon className="size-4" />
        <p className="">
          {result === undefined ? (
            <span className="inline-flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse" />
              Buscando información…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              Búsqueda completada
            </span>
          )}
        </p>
        <div className="flex-grow" />
        {result && (
          <Button onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>
        )}
      </div>
      
      {/* Resultados colapsables */}
      {result && !isCollapsed && (
        <div className="flex flex-col gap-2 border-t pt-2">
          <div className="px-4">
            <p className="font-semibold">Resultados de búsqueda:</p>
            <pre className="whitespace-pre-wrap text-sm mt-2">{result}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
