(function () {
  // Prevent duplicate execution
  if (window.__NectarWidgetInitialized) return;
  window.__NectarWidgetInitialized = true;

  // Get current script parameters
  const currentScript = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const tenantId = currentScript.getAttribute('data-tenant-id');
  if (!tenantId) {
    console.error('Nectar Labs Widget: Missing data-tenant-id attribute.');
    return;
  }

  // Determine origin based on script src URL (allows widget to work on localhost, staging, and prod)
  const scriptUrl = new URL(currentScript.src);
  const widgetOrigin = scriptUrl.origin;

  // Create container element for the widget
  const container = document.createElement('div');
  container.id = 'nectar-chat-widget-container';
  
  // Base container styles (fixed positioning, hidden overflow, rounded)
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '90px',
    height: '90px',
    zIndex: '999999',
    transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    borderRadius: '50%'
  });

  // Create iframe element
  const iframe = document.createElement('iframe');
  iframe.src = `${widgetOrigin}/embed/chat?tenant_id=${tenantId}`;
  iframe.id = 'nectar-chat-widget-iframe';
  
  // Style iframe to fill container
  Object.assign(iframe.style, {
    border: 'none',
    width: '100%',
    height: '100%',
    margin: '0',
    padding: '0',
    background: 'transparent',
    colorScheme: 'light dark'
  });

  container.appendChild(iframe);
  document.body.appendChild(container);

  // Listen for resize messages from the iframe
  window.addEventListener('message', function (event) {
    // Only accept messages from Nectar widget origin
    if (event.origin !== widgetOrigin) return;

    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'nectar-widget-action') {
      if (data.action === 'expand') {
        // Expanded chat state
        Object.assign(container.style, {
          width: '400px',
          height: '640px',
          borderRadius: '2rem',
          boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.25)'
        });
        
        // Handle mobile responsiveness (fill screen if mobile)
        if (window.innerWidth < 480) {
          Object.assign(container.style, {
            width: '100%',
            height: '100%',
            bottom: '0',
            right: '0',
            borderRadius: '0'
          });
        }
      } else if (data.action === 'collapse') {
        // Collapsed bubble state
        Object.assign(container.style, {
          width: '90px',
          height: '90px',
          bottom: '20px',
          right: '20px',
          borderRadius: '50%',
          boxShadow: 'none'
        });
      }
    }
  });

  // Handle window resizing on parent page to adjust mobile view
  window.addEventListener('resize', function () {
    if (container.style.width === '100%') {
      if (window.innerWidth >= 480) {
        Object.assign(container.style, {
          width: '400px',
          height: '640px',
          borderRadius: '2rem',
          bottom: '20px',
          right: '20px'
        });
      }
    }
  });
})();
