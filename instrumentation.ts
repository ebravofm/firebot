/**
 * OpenTelemetry + Langfuse: solo en runtime Node (no Edge).
 * Requiere: npm install en /firebot (incluye @langfuse/otel y @opentelemetry/sdk-trace-node).
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const langfuse = await import("@langfuse/otel");
  const trace = await import("@opentelemetry/sdk-trace-node");

  const shouldExportSpan = (span: any) => {
    return span.otelSpan.instrumentationScope.name !== "next.js";
  };

  const langfuseSpanProcessor = new langfuse.LangfuseSpanProcessor({
    shouldExportSpan,
  });

  const tracerProvider = new trace.NodeTracerProvider({
    spanProcessors: [langfuseSpanProcessor],
  });

  tracerProvider.register();
}
