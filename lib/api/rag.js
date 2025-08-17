// Versión JavaScript de la función RAG para Node.js

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function searchRAG(params, authToken) {
  if (!BACKEND_URL) {
    throw new Error("BACKEND_URL no está definido");
  }
  if (!authToken) {
    throw new Error("authToken es requerido");
  }

  const body = {
    top_k: 5,
    similarity_threshold: 0,
    response_format: "minimal",
    ...params,
  };

  const response = await fetch(`${BACKEND_URL}/rag/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Error ${response.status}: ${text || response.statusText}`);
  }

  const data = await response.json();
  return data;
}
