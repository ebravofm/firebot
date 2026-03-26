(function (config = {}) {
  // Parametros desde document.currentScript, compatibles con /api/widget y widget.js
  const getScriptParam = (paramName) => {
    const cur = document.currentScript;
    if (cur && cur.src) {
      try {
        const value = new URL(cur.src).searchParams.get(paramName);
        if (value) return value;
      } catch {
        /* ignore */
      }
    }
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
      if (!script.src) continue;
      try {
        const url = new URL(script.src);
        const value = url.searchParams.get(paramName);
        if (value && (url.pathname.includes('widget.js') || url.pathname.includes('/api/widget'))) {
          return value;
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  };

  const jwt = getScriptParam('jwt');
  const host = getScriptParam('host');
  const isDashboardHost = host === 'dashboard';
  const baseUrl = '{{WIDGET_BASE_URL}}';

  const DEFAULT_CONFIG = {
    baseUrl: baseUrl,
    position: { bottom: '2rem', right: '2rem' },
    size: { width: '450px', height: '600px' },
    theme: {
      primaryColor: '#dc2626',
      textColor: '#ffffff',
      tooltipDelay: 500,
      buttonColor: '#dc2626'
    },
    labels: {
      open: 'Abrir Asistente',
      close: 'Cerrar Asistente'
    },
    avatar: '',
    welcomeMessage: '¡Bienvenid@!',
    animateBubble: false
  };

  const initializeWidget = () => {
    const widgetConfig = { 
      ...DEFAULT_CONFIG, 
      ...config 
    };

    if (widgetConfig.enabled === false) {
      return () => {};
    }

    if (isDashboardHost) {
      const currentBottom = widgetConfig.position?.bottom || DEFAULT_CONFIG.position.bottom;
      widgetConfig.position = {
        ...widgetConfig.position,
        bottom: `calc(${currentBottom} - 20px)`,
      };
    }

    // Continuar con la inicialización del widget usando widgetConfig
    return createWidget(widgetConfig);
  };

  const createWidget = (widgetConfig) => {
    const setDynamicCSSVariables = () => {
      const root = document.documentElement;
      root.style.setProperty('--widget-primary-color', widgetConfig.theme.primaryColor);
      root.style.setProperty('--widget-text-color', widgetConfig.theme.textColor);
      root.style.setProperty('--widget-button-color', widgetConfig.theme.buttonColor);
      
      const primaryColor = widgetConfig.theme.primaryColor;
      const hoverColor = adjustColorBrightness(primaryColor, -20);
      root.style.setProperty('--widget-primary-color-hover', hoverColor);
      
      root.style.setProperty('--widget-position-bottom', widgetConfig.position.bottom);
      root.style.setProperty('--widget-position-right', widgetConfig.position.right);
      root.style.setProperty('--widget-size-width', widgetConfig.size.width);
      root.style.setProperty('--widget-size-height', widgetConfig.size.height);
    };

    const adjustColorBrightness = (hex, percent) => {
      const num = parseInt(hex.replace("#", ""), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = (num >> 8 & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    };

    setDynamicCSSVariables();

  const isValidOrigin = (origin) => {
    try {
      return origin === new URL(widgetConfig.baseUrl).origin;
    } catch {
      return false;
    }
  };

  const chatButtonContainer = document.createElement('div');
  chatButtonContainer.className = "aui-root aui-modal-anchor";
  const btnPos = {
    position: 'fixed',
    bottom: widgetConfig.position.bottom,
    width: '3rem',
    height: '3rem',
    zIndex: '9999'
  };
  if (widgetConfig.position.left) {
    btnPos.left = widgetConfig.position.left;
    btnPos.right = 'auto';
  } else {
    btnPos.right = widgetConfig.position.right;
  }
  Object.assign(chatButtonContainer.style, btnPos);

  // Compute FAB size based on widget_size config
  const fabSizeMap = { 'pequeño': '2.5rem', 'mediano': '3rem', 'grande': '3.5rem' };
  const fabSize = fabSizeMap[widgetConfig.size?.width === '360px' ? 'pequeño' : widgetConfig.size?.width === '550px' ? 'grande' : 'mediano'] || '3rem';
  chatButtonContainer.style.width = fabSize;
  chatButtonContainer.style.height = fabSize;

  const chatButton = document.createElement('button');
  chatButton.className = "aui-button aui-button-primary aui-button-icon aui-modal-button";
  chatButton.setAttribute('data-state', 'closed');
  chatButton.setAttribute('type', 'button');
  chatButton.setAttribute('aria-haspopup', 'dialog');
  chatButton.setAttribute('aria-expanded', 'false');
  chatButton.setAttribute('data-animate', widgetConfig.animateBubble === true ? 'true' : 'false');
  // FAB: radio completo (puede ser círculo/píldora). Ventana: máximo 12px.
  var fabRadius = (widgetConfig.theme && widgetConfig.theme.borderRadius != null) ? widgetConfig.theme.borderRadius : 9999;
  var chatRadius = (widgetConfig.theme && widgetConfig.theme.chatRadius != null) ? widgetConfig.theme.chatRadius : Math.min(fabRadius, 12);
  chatButton.style.borderRadius = fabRadius + 'px';
  // Helper to build an SVG element with paths
  function makeSvg(paths, extraAttrs) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('data-state', 'closed');
    svg.className.baseVal = "aui-modal-button-closed-icon";
    if (extraAttrs) Object.keys(extraAttrs).forEach(k => svg.setAttribute(k, extraAttrs[k]));
    paths.forEach(function(d) {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute('d', d);
      svg.appendChild(p);
    });
    return svg;
  }

  // Choose closed icon based on avatar config
  let closedIcon;
  const avatarType = widgetConfig.avatar || 'builtin:default';
  if (avatarType === 'builtin:sparkles') {
    closedIcon = makeSvg([
      'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
      'M20 3v4',
      'M22 5h-4',
    ]);
  } else {
    // builtin:default = MessageCircle (chat bubble)
    closedIcon = makeSvg([
      'M7.9 20A9 9 0 1 0 4 16.1L2 22Z',
    ]);
  }

  const openIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  openIcon.setAttribute('width', '15');
  openIcon.setAttribute('height', '15');
  openIcon.setAttribute('viewBox', '0 0 24 24');
  openIcon.setAttribute('fill', 'none');
  openIcon.setAttribute('stroke', 'currentColor');
  openIcon.setAttribute('stroke-width', '2');
  openIcon.setAttribute('stroke-linecap', 'round');
  openIcon.setAttribute('stroke-linejoin', 'round');
  openIcon.setAttribute('data-state', 'closed');
  openIcon.className.baseVal = "lucide lucide-x aui-modal-button-open-icon";

  const openPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  openPath.setAttribute('d', 'M18 6 6 18M6 6l12 12');
  openIcon.appendChild(openPath);

  const srOnlySpan = document.createElement('span');
  srOnlySpan.className = "aui-sr-only";
  srOnlySpan.textContent = widgetConfig.labels.open;

  // If avatar is a real URL (not builtin:*), replace closedIcon with the image
  if (widgetConfig.avatar && !widgetConfig.avatar.startsWith('builtin:')) {
    const avatarImg = document.createElement('img');
    avatarImg.src = widgetConfig.avatar;
    avatarImg.alt = '';
    avatarImg.className = 'aui-modal-button-closed-icon';
    avatarImg.setAttribute('data-state', 'closed');
    Object.assign(avatarImg.style, {
      width: '85%',
      height: '85%',
      objectFit: 'contain',
    });
    // Override closedIcon to point to the image so toggle updates it correctly
    closedIcon = avatarImg;
    chatButton.append(avatarImg, openIcon, srOnlySpan);
  } else {
    // Use the builtin SVG icon (default=chat bubble, sparkles=sparkles)
    chatButton.append(closedIcon, openIcon, srOnlySpan);
  }
  chatButtonContainer.appendChild(chatButton);

  // Persistent banner bubble (shown when bannerEnabled = true and chat is closed)
  let bannerBubble = null;
  if (widgetConfig.bannerEnabled && widgetConfig.bannerText) {
    bannerBubble = document.createElement('div');
    bannerBubble.className = 'aui-banner-bubble' + (widgetConfig.position.left ? ' aui-banner-left' : '');
    bannerBubble.textContent = widgetConfig.bannerText;
    // En dashboard evita bloquear clics sobre acciones del panel.
    if (isDashboardHost) {
      bannerBubble.style.pointerEvents = 'none';
    }
    document.body.appendChild(bannerBubble);

    // Position banner next to the chat button (opposite side of screen edge)
    const isLeftPosition = !!widgetConfig.position.left;
    const positionBanner = () => {
      const rect = chatButtonContainer.getBoundingClientRect();
      bannerBubble.style.top = `${rect.top + rect.height / 2 - bannerBubble.offsetHeight / 2}px`;
      if (isLeftPosition) {
        // Button on left → banner to the right
        bannerBubble.style.left = `${rect.right + 12}px`;
        bannerBubble.style.right = 'auto';
      } else {
        // Button on right → banner to the left
        bannerBubble.style.right = `${window.innerWidth - rect.left + 12}px`;
        bannerBubble.style.left = 'auto';
      }
    };
    requestAnimationFrame(positionBanner);
    window.addEventListener('resize', positionBanner);
  }

  // --- Display Mode: ajustar tamaño del chat según modo ---
  var displayMode = widgetConfig.displayMode || 'estandar';
  var chatWidth, chatHeight;
  if (displayMode === 'compacto') {
    // Compacto: más pequeño que el tamaño configurado
    chatWidth = '320px';
    chatHeight = '420px';
  } else {
    // Estándar y expandido usan el tamaño configurado en desktop
    chatWidth = 'var(--widget-size-width)';
    chatHeight = 'var(--widget-size-height)';
  }

  const chatContainer = document.createElement('div');
  chatContainer.id = 'chat-widget-container';
  const containerPos = {
    position: 'fixed',
    bottom: '100px',
    width: chatWidth,
    height: chatHeight,
    background: 'white',
    borderRadius: chatRadius + 'px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
    zIndex: '9999',
    overflow: 'hidden',
    opacity: '0',
    transform: 'translateY(20px)',
    transition: 'opacity 300ms ease, transform 300ms ease',
    pointerEvents: 'none'
  };
  if (widgetConfig.position.left) {
    containerPos.left = '32px';
    containerPos.right = 'auto';
  } else {
    containerPos.right = '32px';
  }
  Object.assign(chatContainer.style, containerPos);

  let chatIframe = null;

  const createIframe = () => {
    if (chatIframe) return; // Si ya existe, no crear otro
    
    chatIframe = document.createElement('iframe');

    // Añadimos el JWT a la URL del iframe si existe
    // Protección contra duplicación: no agregar jwt si baseUrl ya lo contiene
    let iframeSrc = widgetConfig.baseUrl;
    if (jwt) {
      const sep = iframeSrc.includes('?') ? '&' : '?';
      if (!iframeSrc.includes('jwt=')) {
        iframeSrc = `${iframeSrc}${sep}jwt=${encodeURIComponent(jwt)}`;
      }
    }
    // Marcar que viene del widget externo (no es preview de la plataforma)
    var srcSep = iframeSrc.includes('?') ? '&' : '?';
    iframeSrc = iframeSrc + srcSep + 'source=widget';
    chatIframe.src = iframeSrc;
    
    Object.assign(chatIframe.style, {
      width: '100%',
      height: '100%',
      border: 'none'
    });
    chatIframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
    chatIframe.setAttribute('loading', 'lazy');
    chatIframe.title = 'Asistente Virtual';

    chatIframe.onerror = () => {
      console.error('Error al cargar el chat widget');
      chatContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: ${widgetConfig.theme.primaryColor};">Error al cargar el chat. Por favor, intente más tarde.</div>`;
    };

    chatContainer.appendChild(chatIframe);
  };
  document.body.append(chatButtonContainer, chatContainer);

  // --- Show on Mobile: ocultar widget completo en pantallas móviles si está desactivado ---
  if (widgetConfig.showOnMobile === false) {
    var mobileHideQuery = window.matchMedia('(max-width: 768px)');
    var applyMobileVisibility = function(e) {
      var display = e.matches ? 'none' : '';
      chatButtonContainer.style.display = display;
      chatContainer.style.display = display;
      if (bannerBubble) bannerBubble.style.display = display;
    };
    mobileHideQuery.addListener(applyMobileVisibility);
    applyMobileVisibility(mobileHideQuery);
  }

  let isChatOpen = false;
  const toggleChat = (open = !isChatOpen) => {
    isChatOpen = open;
    chatContainer.style.opacity = isChatOpen ? '1' : '0';
    chatContainer.style.transform = isChatOpen ? 'translateY(0)' : 'translateY(20px)';
    chatContainer.style.pointerEvents = isChatOpen ? 'auto' : 'none';
    chatButton.setAttribute('data-state', isChatOpen ? 'open' : 'closed');
    chatButton.setAttribute('aria-expanded', isChatOpen);
    closedIcon.setAttribute('data-state', isChatOpen ? 'open' : 'closed');
    openIcon.setAttribute('data-state', isChatOpen ? 'open' : 'closed');

    // Hide banner when chat is open, show when closed
    if (bannerBubble) {
      bannerBubble.style.opacity = isChatOpen ? '0' : '1';
      bannerBubble.style.pointerEvents = isChatOpen ? 'none' : 'auto';
    }

    if (isChatOpen) {
      // Crear el iframe solo cuando se abre el chat por primera vez
      createIframe();
      
      // Enviar mensaje solo si el iframe ya existe
      if (chatIframe && chatIframe.contentWindow) {
        chatIframe.contentWindow.postMessage({
          type: 'WIDGET_OPENED',
          origin: window.location.origin,
          ratingConfig: widgetConfig.rating || null
        }, widgetConfig.baseUrl);
      }
    }
  };

  chatButton.addEventListener('click', () => toggleChat());

  // Permitir abrir el widget desde fuera (ej. botón "Probar Chatbot" en Scrivot)
  window.addEventListener('scrivot-open-widget', () => toggleChat(true));
  if (sessionStorage.getItem('scrivot-open-widget')) {
    sessionStorage.removeItem('scrivot-open-widget');
    setTimeout(function () { toggleChat(true); }, 150);
  }

  // Auto-open: abrir automáticamente después del delay configurado
  console.log('[Scrivot] autoOpen config:', widgetConfig.autoOpen, 'delay:', widgetConfig.autoOpenDelay);
  if (widgetConfig.autoOpen) {
    var autoOpenDelay = (typeof widgetConfig.autoOpenDelay === 'number' ? widgetConfig.autoOpenDelay : 3) * 1000;
    var autoOpenKey = 'scrivot-auto-opened';
    console.log('[Scrivot] Auto-open enabled, delay:', autoOpenDelay + 'ms, already opened:', !!sessionStorage.getItem(autoOpenKey));
    // Solo auto-abrir una vez por sesión para no molestar al usuario
    if (!sessionStorage.getItem(autoOpenKey)) {
      setTimeout(function () {
        if (!isChatOpen) {
          console.log('[Scrivot] Auto-opening chat now');
          toggleChat(true);
          sessionStorage.setItem(autoOpenKey, '1');
        }
      }, autoOpenDelay);
    }
  }

  const handleMessage = function (event) {
    if (!event.data) return;
    if (!isValidOrigin(event.origin)) return;
    switch (event.data.type) {
      case 'CLOSE_WIDGET':
        toggleChat(false);
        break;
      case 'WIDGET_READY':
        if (chatIframe) chatIframe.classList.add('ready');
        break;
    }
  };
  window.addEventListener('message', handleMessage);

  // Responsive: modo expandido usa fullscreen en móvil, estándar/compacto también fullscreen en pantallas muy pequeñas
  var expandedBreakpoint = displayMode === 'expandido' ? '(max-width: 768px)' : '(max-width: 480px)';
  const mediaQuery = window.matchMedia(expandedBreakpoint);
  const handleResponsive = (e) => {
    if (e.matches) {
      // Fullscreen en móvil
      Object.assign(chatContainer.style, {
        width: '100%',
        height: '100%',
        bottom: '0',
        right: '0',
        left: '0',
        borderRadius: '0'
      });
    } else {
      const restorePos = {
        width: chatWidth,
        height: chatHeight,
        bottom: '100px',
        borderRadius: chatRadius + 'px'
      };
      if (widgetConfig.position.left) {
        restorePos.left = '32px';
        restorePos.right = 'auto';
      } else {
        restorePos.right = '32px';
        restorePos.left = 'auto';
      }
      Object.assign(chatContainer.style, restorePos);
    }
  };
  mediaQuery.addListener(handleResponsive);
  handleResponsive(mediaQuery);

  const style = document.createElement('style');
  style.innerHTML = `
/* Animación de wiggle para el botón del asistente */
@keyframes skew-y-shaking {
  0% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(5px, 5px) rotate(5deg); }
  50% { transform: translate(0, 0) rotate(0deg); }
  75% { transform: translate(-5px, 5px) rotate(-5deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}

.aui-modal-anchor {
  position: fixed;
  bottom: var(--widget-position-bottom, 2rem);
  right: var(--widget-position-right, 2rem);
  width: 3rem;
  height: 3rem;
}
.aui-modal-button {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  padding: 0;
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
  border: 0;
}

.aui-modal-button[data-state="closed"][data-animate="true"] {
  animation: skew-y-shaking 2.25s infinite;
}

.aui-modal-button[data-state="open"] {
  animation: none;
}
.aui-modal-button:hover { 
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(230, 34, 24, 0.3);
}
.aui-modal-button:active { transform: scale(0.95); }

.aui-modal-button-closed-icon,
.aui-modal-button-open-icon {
  position: absolute;
  width: 1.75rem;
  height: 1.75rem;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.aui-modal-button-closed-icon[data-state="closed"] {
  transform: translate(-50%, -50%) rotate(0deg) scale(1);
}
.aui-modal-button-closed-icon[data-state="open"] {
  transform: translate(-50%, -50%) rotate(90deg) scale(0);
}
.aui-modal-button-open-icon[data-state="closed"] {
  transform: translate(-50%, -50%) rotate(-90deg) scale(0);
}
.aui-modal-button-open-icon[data-state="open"] {
  transform: translate(-50%, -50%) rotate(0deg) scale(1);
}

.aui-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.aui-button-primary {
  background-color: var(--widget-primary-color, #dc2626);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
.aui-button-primary:hover {
  background-color: var(--widget-primary-color-hover);
}

.aui-banner-bubble {
  position: fixed;
  background: white;
  color: #111827;
  padding: 0.6rem 0.9rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-family: system-ui, -apple-system, sans-serif;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 9998;
  transition: opacity 0.2s ease;
  pointer-events: auto;
  cursor: default;
}
.aui-banner-bubble::after {
  content: '';
  position: absolute;
  right: -8px;
  top: 50%;
  transform: translateY(-50%);
  border-width: 8px 0 8px 8px;
  border-style: solid;
  border-color: transparent transparent transparent white;
}
.aui-banner-left::after {
  right: auto;
  left: -8px;
  border-width: 8px 8px 8px 0;
  border-color: transparent white transparent transparent;
}
`;
  document.head.appendChild(style);

  return function cleanup() {
    mediaQuery.removeListener(handleResponsive);
    window.removeEventListener('message', handleMessage);
    chatButtonContainer.remove();
    chatContainer.remove();
    if (bannerBubble) bannerBubble.remove();
    style.remove();
  };
  };

  // Singleton guard: prevent double initialization
  if (window.__scrivotWidgetCleanup) {
    window.__scrivotWidgetCleanup();
  }

  let cleanup = initializeWidget();
  window.__scrivotWidgetCleanup = cleanup;

  // Recargar widget cuando se actualiza la configuración desde el dashboard
  const handleConfigUpdated = function() {
    if (typeof window.__scrivotWidgetCleanup === 'function') {
      window.__scrivotWidgetCleanup();
      window.__scrivotWidgetCleanup = null;
    }
    window.removeEventListener('scrivot:config-updated', handleConfigUpdated);
    // Cargar nuevo script con cache-bust → toma config actualizada desde backend
    var newScript = document.createElement('script');
    newScript.src = baseUrl + '/api/widget?_cb=' + Date.now() + (jwt ? '&jwt=' + encodeURIComponent(jwt) : '') + (host ? '&host=' + encodeURIComponent(host) : '');
    newScript.async = true;
    document.head.appendChild(newScript);
  };
  window.addEventListener('scrivot:config-updated', handleConfigUpdated);
})(); 