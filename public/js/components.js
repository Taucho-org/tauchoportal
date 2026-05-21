/**
 * Reusable UI Components for TauchoPortal
 * Load components into pages without repeating HTML
 */

/**
 * Load and inject a component into the page
 * @param {string} componentName - Component to load ('header', 'footer', 'navbar', etc.)
 * @param {string} targetSelector - Element to inject into (default: 'body' prepend)
 */
async function loadComponent(componentName, targetSelector = null) {
  try {
    // Load component HTML
    const response = await fetch(`/components/${componentName}.html`);
    if (!response.ok) {
      console.error(`Failed to load component: ${componentName}`);
      return;
    }

    const html = await response.text();
    
    // Create container and inject HTML
    const container = document.querySelector(targetSelector) || document.body;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // If targeting body and no selector, prepend to body
    if (!targetSelector) {
      while (tempDiv.firstChild) {
        document.body.insertBefore(tempDiv.firstChild, document.body.firstChild);
      }
    } else {
      while (tempDiv.firstChild) {
        container.appendChild(tempDiv.firstChild);
      }
    }

    // After component is loaded, trigger any necessary initialization
    window.dispatchEvent(new CustomEvent('componentLoaded', { detail: { component: componentName } }));
  } catch (error) {
    console.error(`Error loading component ${componentName}:`, error);
  }
}

/**
 * Load multiple components at once
 * @param {Array} components - Array of component names
 */
async function loadComponents(components) {
  await Promise.all(components.map(comp => loadComponent(comp)));
}
