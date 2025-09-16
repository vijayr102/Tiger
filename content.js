let isInspectorActive = false;
let selectedElements = [];
let highlightOverlay = null;
let currentHighlightedElement = null;

// Create highlight overlay style
const style = document.createElement('style');
style.textContent = `
  .inspector-highlight {
    position: absolute;
    background: rgba(130, 200, 255, 0.3);
    border: 2px solid #4CAF50;
    pointer-events: none;
    z-index: 10000;
    transition: all 0.2s ease;
  }
  .inspector-selected {
    position: absolute;
    background: rgba(76, 175, 80, 0.2);
    border: 2px solid #4CAF50;
    pointer-events: none;
    z-index: 9999;
  }
`;
document.head.appendChild(style);

// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startInspector') {
    isInspectorActive = true;
    enableElementInspector();
    sendResponse({ status: 'Inspector started' });
  } else if (request.action === 'stopInspector') {
    isInspectorActive = false;
    disableElementInspector();
    sendResponse({ status: 'Inspector stopped' });
  }
  return true;
});

function createHighlightOverlay() {
  highlightOverlay = document.createElement('div');
  highlightOverlay.className = 'inspector-highlight';
  document.body.appendChild(highlightOverlay);
}

function updateHighlightPosition(element) {
  if (!highlightOverlay) return;
  
  const rect = element.getBoundingClientRect();
  highlightOverlay.style.top = rect.top + window.scrollY + 'px';
  highlightOverlay.style.left = rect.left + window.scrollX + 'px';
  highlightOverlay.style.width = rect.width + 'px';
  highlightOverlay.style.height = rect.height + 'px';
}

function createSelectedOverlay(element) {
  const selectedOverlay = document.createElement('div');
  selectedOverlay.className = 'inspector-selected';
  const rect = element.getBoundingClientRect();
  selectedOverlay.style.top = rect.top + window.scrollY + 'px';
  selectedOverlay.style.left = rect.left + window.scrollX + 'px';
  selectedOverlay.style.width = rect.width + 'px';
  selectedOverlay.style.height = rect.height + 'px';
  document.body.appendChild(selectedOverlay);
  return selectedOverlay;
}

function enableElementInspector() {
  createHighlightOverlay();
  document.addEventListener('mouseover', highlightElement, true);
  document.addEventListener('mouseout', removeHighlight, true);
  document.addEventListener('click', selectElement, true);
  document.addEventListener('keydown', handleKeyPress, true);
  document.body.style.cursor = 'crosshair';
}

function disableElementInspector() {
  document.removeEventListener('mouseover', highlightElement, true);
  document.removeEventListener('mouseout', removeHighlight, true);
  document.removeEventListener('click', selectElement, true);
  document.removeEventListener('keydown', handleKeyPress, true);
  document.body.style.cursor = 'default';
  if (highlightOverlay) {
    highlightOverlay.remove();
    highlightOverlay = null;
  }
  currentHighlightedElement = null;
}

function handleKeyPress(e) {
  if (e.key === 'Escape' && isInspectorActive) {
    chrome.runtime.sendMessage({ action: 'stopInspector' });
  }
}

function highlightElement(e) {
  if (!isInspectorActive) return;
  e.preventDefault();
  e.stopPropagation();
  
  currentHighlightedElement = e.target;
  updateHighlightPosition(currentHighlightedElement);
  highlightOverlay.style.display = 'block';
}

function removeHighlight(e) {
  if (!isInspectorActive || !highlightOverlay) return;
  highlightOverlay.style.display = 'none';
  currentHighlightedElement = null;
}

function selectElement(e) {
  if (!isInspectorActive) return;
  e.preventDefault();
  e.stopPropagation();
  
  const element = e.target;
  const elementHtml = element.outerHTML;
  
  // Don't select the highlight overlay itself
  if (element === highlightOverlay) return;
  
  const elementInfo = {
    tag: element.tagName.toLowerCase(),
    id: element.id,
    classes: Array.from(element.classList).filter(c => !c.startsWith('inspector-')).join(' '),
    type: element.type || '',
    name: element.name || '',
    text: element.textContent.trim(),
    xpath: getXPath(element),
    cssSelector: getCssSelector(element),
    outerHTML: elementHtml  // Add outerHTML to the element info
  };
  
  // Create a persistent highlight for the selected element
  const selectedOverlay = createSelectedOverlay(element);
  
  selectedElements.push({
    ...elementInfo,
    overlay: selectedOverlay
  });
  
  chrome.runtime.sendMessage({
    action: 'elementSelected',
    element: elementInfo  // This now includes outerHTML
  });
  
  // Play a small animation to show the element was selected
  selectedOverlay.style.transition = 'background-color 0.3s ease';
  selectedOverlay.style.backgroundColor = 'rgba(76, 175, 80, 0.4)';
  setTimeout(() => {
    selectedOverlay.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
  }, 300);
}

function getXPath(element) {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  if (element === document.body) {
    return '/html/body';
  }
  
  let ix = 0;
  let siblings = element.parentNode.childNodes;
  
  for (let i = 0; i < siblings.length; i++) {
    let sibling = siblings[i];
    if (sibling === element) {
      let path = getXPath(element.parentNode);
      let tag = element.tagName.toLowerCase();
      return `${path}/${tag}[${ix + 1}]`;
    }
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      ix++;
    }
  }
}

function getCssSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }
  
  let path = [];
  while (element.nodeType === Node.ELEMENT_NODE) {
    let selector = element.nodeName.toLowerCase();
    if (element.id) {
      selector = `#${element.id}`;
      path.unshift(selector);
      break;
    } else {
      let sibling = element;
      let nth = 1;
      while (sibling = sibling.previousElementSibling) {
        if (sibling.nodeName.toLowerCase() === selector) nth++;
      }
      if (nth !== 1) selector += `:nth-of-type(${nth})`;
    }
    path.unshift(selector);
    element = element.parentNode;
  }
  return path.join(' > ');
}