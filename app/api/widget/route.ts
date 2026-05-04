import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ENV_CONFIG } from '@/lib/env';

// Decode JWT payload without verification (just to extract chatbot_id for config lookup)
function decodeJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jwt = searchParams.get('jwt');

    // Leer el template del widget
    const templatePath = path.join(process.cwd(), 'public', 'widget-template.js');
    let widgetContent = fs.readFileSync(templatePath, 'utf8');

    const widgetUrl = ENV_CONFIG.WIDGET_URL;
    widgetContent = widgetContent.replace('{{WIDGET_BASE_URL}}', widgetUrl);

    // Fetch widget config from backend if JWT is available
    let widgetConfigJson = '{}';
    if (jwt) {
      try {
        const payload = decodeJWTPayload(jwt);
        const chatbotId = payload?.chatbot_id;
        if (chatbotId) {
          const backendUrl = ENV_CONFIG.BACKEND_URL;

          // Pasar el Referer del browser como X-Embedding-Origin para que el backend
          // pueda validar que el dominio solicitante está autorizado para este chatbot.
          const browserReferer = request.headers.get('referer') || request.headers.get('origin') || '';
          const embeddingHeaders: Record<string, string> = {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          };
          if (browserReferer) {
            embeddingHeaders['X-Embedding-Origin'] = browserReferer;
          }

          const res = await fetch(`${backendUrl}/chatbot-config/${chatbotId}`, {
            headers: embeddingHeaders,
          });
          if (res.ok) {
            const config = await res.json();
            const wa = config.widget_appearance;
            const wm = config.widget_messages;
            // Build config object for widget-template.js
            const widgetCfg: Record<string, unknown> = {};
            if (config.widget_enabled === false) {
              widgetCfg.enabled = false;
            }

            // Fetch widget_behavior for auto-open settings
            if (config.workspace_id) {
              try {
                const behaviorRes = await fetch(`${backendUrl}/widget-behavior/workspace/${config.workspace_id}`, {
                  headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
                });
                if (behaviorRes.ok) {
                  const behavior = await behaviorRes.json();
                  if (behavior?.auto_open) {
                    widgetCfg.autoOpen = true;
                    widgetCfg.autoOpenDelay = typeof behavior.auto_open_delay === 'number' ? behavior.auto_open_delay : 3;
                  }
                  // Display options
                  if (behavior?.show_on_mobile === false) {
                    widgetCfg.showOnMobile = false;
                  }
                  if (behavior?.display_mode && behavior.display_mode !== 'estandar') {
                    widgetCfg.displayMode = behavior.display_mode;
                  }
                  if (behavior?.show_reset_button === true) {
                    widgetCfg.showResetButton = true;
                  }
                }
              } catch {
                // Ignore - auto-open is optional
              }
            }

            if (wa) {
              widgetCfg.theme = {
                primaryColor: wa.primary_color ?? '#5B4FFF',
                textColor: wa.text_color ?? '#ffffff',
                buttonColor: wa.primary_color ?? '#5B4FFF',
                borderRadius: wa.border_radius ?? 12,        // FAB icon radius (full value)
                chatRadius: Math.min(wa.border_radius ?? 12, 12), // Chat window radius (capped at 12px)
              };
              if (wa.position) {
                const posMap: Record<string, { bottom: string; right: string; left?: string }> = {
                  'inferior_derecha': { bottom: '2rem', right: '2rem' },
                  'inferior_izquierda': { bottom: '2rem', right: 'auto', left: '2rem' },
                };
                widgetCfg.position = posMap[wa.position] ?? { bottom: '2rem', right: '2rem' };
              }
              if (wa.widget_size) {
                const sizeMap: Record<string, { width: string; height: string }> = {
                  'pequeño': { width: '360px', height: '500px' },
                  'mediano': { width: '450px', height: '600px' },
                  'grande': { width: '550px', height: '700px' },
                };
                widgetCfg.size = sizeMap[wa.widget_size] ?? { width: '450px', height: '600px' };
              }
              if (wa.icon_url) {
                widgetCfg.avatar = wa.icon_url;
              }
              if (wa.animate_bubble_chatbot != null) {
                widgetCfg.animateBubble = wa.animate_bubble_chatbot;
              }
              if (wa.custom_icon_preserve_original != null) {
                widgetCfg.customIconPreserveOriginal = wa.custom_icon_preserve_original;
              }
            }
            // Fetch widget_rating_config for rating settings
            if (config.workspace_id) {
              try {
                const ratingRes = await fetch(`${backendUrl}/widget-rating-config/workspace/${config.workspace_id}`, {
                  headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
                });
                if (ratingRes.ok) {
                  const ratingConfig = await ratingRes.json();
                  if (ratingConfig?.is_enabled) {
                    widgetCfg.rating = {
                      enabled: true,
                      autoCloseTime: parseFloat(ratingConfig.auto_close_time || '1'),
                    };
                  }
                }
              } catch {
                // Ignore - rating config is optional
              }
            }

            if (wm) {
              widgetCfg.labels = {
                open: 'Abrir chat',
                close: 'Cerrar chat',
              };
              if (wm.banner_text != null) {
                widgetCfg.bannerText = wm.banner_text;
              }
              if (wm.banner_text_enable != null) {
                widgetCfg.bannerEnabled = !!wm.banner_text_enable;
              }
            }
            widgetConfigJson = JSON.stringify(widgetCfg);
          }
        }
      } catch (e) {
        console.error('Error fetching widget config for template:', e);
      }
    }

    // Inject the config into the IIFE call
    widgetContent = widgetContent.replace(
      '(function (config = {}) {',
      `(function (config = ${widgetConfigJson}) {`
    );

    return new NextResponse(widgetContent, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error serving widget:', error);
    return new NextResponse('Error loading widget', { status: 500 });
  }
}
