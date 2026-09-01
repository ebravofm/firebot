/**
 * Red de seguridad para las peticiones de atención humana.
 *
 * El camino normal es que el modelo entienda la intención y llame a 'request_human'. Pero un
 * modelo puede fallar en llamar una herramienta, y perder a alguien que pidió ayuda de verdad
 * cuesta mucho más que mandar un aviso de más: por eso, además, se revisa el mensaje contra
 * unas frases explícitas y se avisa igual. El backend ignora el segundo aviso del mismo hilo,
 * así que disparar por los dos caminos no duplica nada.
 *
 * Solo cubre lo explícito. Los casos sutiles —frustración, un problema que no se resuelve—
 * quedan para el criterio del modelo, que es lo que sabe hacer.
 */

/** Quita tildes y baja a minúsculas, para que "atención" y "atencion" valgan lo mismo. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const PATRONES: RegExp[] = [
  // "quiero hablar con una persona", "puedo comunicarme con un asesor", "chatear con alguien"
  /\b(hablar|conversar|chatear|comunicar(me|nos)?|contactar(me|nos)?|hablarle|atender)\b[^.?!\n]{0,25}\bcon\b[^.?!\n]{0,25}\b(human[oa]|persona|alguien|asesor|ejecutiv|agente|operador|representante|encargad|soporte|vendedor)/,
  // "necesito un humano", "quiero un ejecutivo", "me pueden atender un asesor"
  /\b(quiero|necesito|deseo|puedo|podria|podrias|pueden|quisiera|dame|busco)\b[^.?!\n]{0,35}\b(human[oa]|asesor|ejecutiv|operador|representante|persona real|persona de verdad)/,
  // Imperativos directos
  /\b(pasame|pasenme|derivame|derivenme|transfiereme|transfierame|comunicame|comuniquenme|conectame|contactenme)\b/,
  // "atención humana", "soporte humano", "agente humano", "atención real"
  /\b(atencion|soporte|servicio|ayuda|asistencia|agente|chat)\s+(human[oa]|real|de verdad|personalizad[oa] por una persona)\b/,
  /\b(persona real|persona de verdad|ser humano|alguien real|gente real)\b/,
  // Rechazo explícito del bot
  /\bno\b[^.?!\n]{0,30}\b(bot|robot|maquina|inteligencia artificial|ia|respuestas? automatica)/,
  /\b(basta|deja|dejen|cansad[oa]|harto|harta)\b[^.?!\n]{0,25}\b(bot|robot|automatic)/,
  // "hablar con un humano" en inglés, por si el widget está en otro idioma
  /\b(talk|speak|chat)\b[^.?!\n]{0,20}\b(to|with)\b[^.?!\n]{0,20}\b(human|person|agent|representative|someone)/,
  /\b(human|live)\s+(agent|support|person|help)\b/,
];

/**
 * ¿Este mensaje pide explícitamente hablar con una persona?
 *
 * Se aplica solo al último mensaje del visitante: revisar la conversación entera haría que una
 * petición ya atendida volviera a dispararse en cada turno.
 */
export function pideAtencionHumana(texto: string): boolean {
  if (!texto) return false;
  const limpio = normalizar(texto);
  // Un mensaje muy largo (un pegado de texto, un correo reenviado) tiene demasiadas
  // posibilidades de contener una de estas frases sin pedir nada. Ahí manda el modelo.
  if (limpio.length > 600) return false;
  return PATRONES.some((patron) => patron.test(limpio));
}

/** Saca el texto plano del último mensaje del visitante en el formato de UIMessage. */
export function textoDelUltimoMensajeDelUsuario(
  messages: Array<{ role?: string; parts?: Array<{ type?: string; text?: string }> }>,
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const mensaje = messages[i];
    if (mensaje?.role !== "user") continue;
    return (mensaje.parts ?? [])
      .filter((parte) => parte?.type === "text" && typeof parte.text === "string")
      .map((parte) => parte.text as string)
      .join(" ")
      .trim();
  }
  return "";
}
