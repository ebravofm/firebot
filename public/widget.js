(function (config = {}) {
  const DEFAULT_CONFIG = {
    baseUrl: 'http://localhost:3000/?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJfaWQiOjEsImlkIjoxLCJlbWFpbCI6ImVtby5icmF2b0BnbWFpbC5jb20iLCJ3b3Jrc3BhY2VfaWQiOjEsInJvbGVfaWQiOjIsImNoYXRib3RfaWQiOjEsInR5cGUiOiJ3aWRnZXQiLCJpYXQiOjE3NTczOTA5MDd9.7DbgZJybNT4sChyF8KkaNsFD9GGLnmvx_XaWR-idr08',
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
    welcomeMessage: '¡Bienvenid@!'
  };

  const initializeWidget = () => {
    const widgetConfig = { 
      ...DEFAULT_CONFIG, 
      ...config 
    };

    // Continuar con la inicialización del widget usando widgetConfig
    createWidget(widgetConfig);
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
    const allowedOrigins = [widgetConfig.baseUrl];
    return allowedOrigins.includes(origin);
  };

  const chatButtonContainer = document.createElement('div');
  chatButtonContainer.className = "aui-root aui-modal-anchor";
  Object.assign(chatButtonContainer.style, {
    position: 'fixed',
    bottom: widgetConfig.position.bottom,
    right: widgetConfig.position.right,
    width: '3rem',
    height: '3rem',
    zIndex: '9999'
  });

  const chatButton = document.createElement('button');
  chatButton.className = "aui-button aui-button-primary aui-button-icon aui-modal-button";
  chatButton.setAttribute('data-state', 'closed');
  chatButton.setAttribute('type', 'button');
  chatButton.setAttribute('aria-haspopup', 'dialog');
  chatButton.setAttribute('aria-expanded', 'false');
  const closedIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  closedIcon.setAttribute('width', '20');
  closedIcon.setAttribute('height', '20');
  closedIcon.setAttribute('viewBox', '0 0 24 24');
  closedIcon.setAttribute('fill', 'none');
  closedIcon.setAttribute('stroke', 'currentColor');
  closedIcon.setAttribute('stroke-width', '2');
  closedIcon.setAttribute('stroke-linecap', 'round');
  closedIcon.setAttribute('stroke-linejoin', 'round');
  closedIcon.setAttribute('data-state', 'closed');
  closedIcon.className.baseVal = "lucide lucide-bot aui-modal-button-closed-icon";

  const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path1.setAttribute('d', 'M12 8V4H8');
  closedIcon.appendChild(path1);

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute('width', '16');
  rect.setAttribute('height', '12');
  rect.setAttribute('x', '4');
  rect.setAttribute('y', '8');
  rect.setAttribute('rx', '2');
  closedIcon.appendChild(rect);

  const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path2.setAttribute('d', 'M2 14h2');
  closedIcon.appendChild(path2);

  const path3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path3.setAttribute('d', 'M20 14h2');
  closedIcon.appendChild(path3);

  const path4 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path4.setAttribute('d', 'M15 13v2');
  closedIcon.appendChild(path4);

  const path5 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path5.setAttribute('d', 'M9 13v2');
  closedIcon.appendChild(path5);

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

  chatButton.append(closedIcon, openIcon, srOnlySpan);
  chatButtonContainer.appendChild(chatButton);
  const tooltipWrapper = document.createElement('div');
  tooltipWrapper.setAttribute('data-radix-popper-content-wrapper', '');
  tooltipWrapper.style.cssText = `
    position: fixed;
    left: 0px;
    top: 0px;
    transform: translate(0px, 0px);
    min-width: max-content;
    will-change: transform;
    z-index: 50;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
  `;

  const tooltipContent = document.createElement('div');
  tooltipContent.className = 'aui-tooltip-content';
  tooltipContent.setAttribute('data-side', 'left');
  tooltipContent.setAttribute('data-align', 'center');
  tooltipContent.setAttribute('data-state', 'delayed-open');
  tooltipContent.textContent = widgetConfig.labels.open;

  tooltipWrapper.appendChild(tooltipContent);
  document.body.appendChild(tooltipWrapper);

  let tooltipTimeout;
  chatButton.addEventListener('mouseenter', (e) => {
    const rect = chatButton.getBoundingClientRect();
    clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(() => {
      tooltipWrapper.style.opacity = '0';
      tooltipWrapper.style.display = 'block';
      requestAnimationFrame(() => {
        const tooltipWidth = tooltipContent.offsetWidth;
        tooltipWrapper.style.left = `${rect.left - tooltipWidth - 8}px`;
        tooltipWrapper.style.top = `${rect.top + rect.height / 2 - tooltipContent.offsetHeight / 2}px`;
        tooltipWrapper.style.opacity = '1';
      });
    }, widgetConfig.theme.tooltipDelay);
  });

  chatButton.addEventListener('mouseleave', () => {
    clearTimeout(tooltipTimeout);
    tooltipWrapper.style.opacity = '0';
  });

  const chatContainer = document.createElement('div');
  chatContainer.id = 'servel-chat-widget-container';
  Object.assign(chatContainer.style, {
    position: 'fixed',
    bottom: '100px',
    right: '32px',
    width: 'var(--widget-size-width)',
    height: 'var(--widget-size-height)',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
    zIndex: '9999',
    overflow: 'hidden',
    opacity: '0',
    transform: 'translateY(20px)',
    transition: 'opacity 300ms ease, transform 300ms ease',
    pointerEvents: 'none'
  });

  let chatIframe = null;

  const createIframe = () => {
    if (chatIframe) return; // Si ya existe, no crear otro
    
    chatIframe = document.createElement('iframe');
    chatIframe.src = widgetConfig.baseUrl;
    Object.assign(chatIframe.style, {
      width: '100%',
      height: '100%',
      border: 'none'
    });
    chatIframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
    chatIframe.setAttribute('loading', 'lazy');
    chatIframe.title = 'Asistente SERVEL';

    chatIframe.onerror = () => {
      console.error('Error al cargar el chat widget');
      chatContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: ${widgetConfig.theme.primaryColor};">Error al cargar el chat. Por favor, intente más tarde.</div>`;
    };

    chatContainer.appendChild(chatIframe);
  };
  document.body.append(chatButtonContainer, chatContainer);

  let isChatOpen = false;
  const toggleChat = (open = !isChatOpen) => {
    isChatOpen = open;
    chatContainer.style.opacity = isChatOpen ? '1' : '0';
    chatContainer.style.transform = isChatOpen ? 'translateY(0)' : 'translateY(20px)';
    chatContainer.style.pointerEvents = isChatOpen ? 'auto' : 'none';
    tooltipWrapper.style.opacity = '0';
    tooltipContent.textContent = isChatOpen ? widgetConfig.labels.close : widgetConfig.labels.open;
    chatButton.setAttribute('data-state', isChatOpen ? 'open' : 'closed');
    chatButton.setAttribute('aria-expanded', isChatOpen);
    closedIcon.setAttribute('data-state', isChatOpen ? 'open' : 'closed');
    openIcon.setAttribute('data-state', isChatOpen ? 'open' : 'closed');

    if (isChatOpen) {
      // Crear el iframe solo cuando se abre el chat por primera vez
      createIframe();
      
      // Enviar mensaje solo si el iframe ya existe
      if (chatIframe && chatIframe.contentWindow) {
        chatIframe.contentWindow.postMessage({
          type: 'WIDGET_OPENED',
          origin: window.location.origin
        }, widgetConfig.baseUrl);
      }
    }
  };

  chatButton.addEventListener('click', () => toggleChat());

  window.addEventListener('message', function (event) {
    if (!isValidOrigin(event.origin)) return;
    switch (event.data.type) {
      case 'CLOSE_WIDGET':
        toggleChat(false);
        break;
      case 'WIDGET_READY':
        chatIframe.classList.add('ready');
        break;
    }
  });

  const mediaQuery = window.matchMedia('(max-width: 480px)');
  const handleResponsive = (e) => {
    if (e.matches) {
      Object.assign(chatContainer.style, {
        width: '100%',
        height: '100%',
        bottom: '0',
        right: '0',
        borderRadius: '0'
      });
    } else {
      Object.assign(chatContainer.style, {
        width: 'var(--widget-size-width)',
        height: 'var(--widget-size-height)',
        bottom: '100px',
        right: '32px',
        borderRadius: '12px'
      });
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

.aui-modal-button[data-state="closed"] {
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

.aui-tooltip-content {
  background: #2f2f2f;
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-family: system-ui, -apple-system, sans-serif;
}
`;
  document.head.appendChild(style);

  return function cleanup() {
    mediaQuery.removeListener(handleResponsive);
    chatButtonContainer.remove();
    chatContainer.remove();
    style.remove();
  };
  };

  initializeWidget();
})(); 