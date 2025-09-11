// Redirigir al endpoint dinámico que usa variables de entorno
(function() {
  const currentScript = document.currentScript || 
    (function() {
      const scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();
  
  const currentUrl = new URL(currentScript.src);
  const baseUrl = currentUrl.origin;
  const jwt = currentUrl.searchParams.get('jwt');
  
  // Crear nuevo script con el endpoint dinámico
  const newScript = document.createElement('script');
  newScript.src = `${baseUrl}/api/widget${jwt ? `?jwt=${jwt}` : ''}`;
  newScript.async = true;
  
  // Reemplazar el script actual
  currentScript.parentNode.replaceChild(newScript, currentScript);
})();