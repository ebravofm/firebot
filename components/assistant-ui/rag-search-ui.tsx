import { ToolCallContentPartComponent } from "@assistant-ui/react";

export const RagSearchToolUI: ToolCallContentPartComponent = ({ result }) => {
  const isRunning = result === undefined;
  return (
    <div className="mb-3 flex items-center gap-2 text-sm">
      {isRunning ? (
        <div className="inline-flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse" />
          <span className="text-muted-foreground">Buscando información…</span>
          <div className="h-2 w-20 rounded bg-muted/60 animate-pulse" />
        </div>
      ) : (
        <div className="inline-flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Listo</span>
        </div>
      )}
    </div>
  );
};
