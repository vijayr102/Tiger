document.addEventListener('DOMContentLoaded', function() {
  const inspectButton = document.getElementById('inspectButton');
  const generateButton = document.getElementById('generateButton');
  const apiKeyInput = document.getElementById('apiKey');
  const apiProviderSelect = document.getElementById('apiProvider');
  const saveSettingsButton = document.getElementById('saveSettings');
  const elementsList = document.getElementById('elementsList');
  const copyButton = document.getElementById('copyButton');
  const tabButtons = document.querySelectorAll('.tab-button');
  
  let selectedElements = [];
  let isInspecting = false;

  // Load saved settings
  chrome.storage.sync.get(['apiKey', 'apiProvider'], function(result) {
    if (result.apiKey) apiKeyInput.value = result.apiKey;
    if (result.apiProvider) apiProviderSelect.value = result.apiProvider;
  });

  // Save settings
  saveSettingsButton.addEventListener('click', function() {
    chrome.storage.sync.set({
      apiKey: apiKeyInput.value,
      apiProvider: apiProviderSelect.value
    }, function() {
      alert('Settings saved!');
    });
  });

  // Toggle inspector
  inspectButton.addEventListener('click', function() {
    isInspecting = !isInspecting;
    if (isInspecting) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'startInspector'});
      });
      inspectButton.textContent = 'Stop Inspector';
    } else {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'stopInspector'});
      });
      inspectButton.textContent = 'Start Element Inspector';
    }
  });

  // Handle selected elements
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'elementSelected') {
      selectedElements.push(request.element);
      updateElementsList();
      generateButton.disabled = false;
    }
  });

  function updateElementsList() {
    elementsList.innerHTML = '';
    selectedElements.forEach((element, index) => {
      const elementDiv = document.createElement('div');
      elementDiv.className = 'element-item';
      elementDiv.innerHTML = `
        <span>${element.tag}${element.id ? ' #' + element.id : ''}${element.classes ? ' .' + element.classes.replace(' ', '.') : ''}</span>
        <button onclick="removeElement(${index})">×</button>
      `;
      elementsList.appendChild(elementDiv);
    });
  }

  // Generate code
  generateButton.addEventListener('click', async function() {
    const apiKey = apiKeyInput.value;
    const apiProvider = apiProviderSelect.value;
    
    if (!apiKey) {
      alert('Please enter an API key first!');
      return;
    }

    try {
      const response = await generateCode(selectedElements, apiKey, apiProvider);
      document.getElementById('gherkinOutput').textContent = response.gherkin;
      document.getElementById('stepdefOutput').textContent = response.stepDefinitions;
    } catch (error) {
      alert('Error generating code: ' + error.message);
    }
  });

  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      const tabName = button.getAttribute('data-tab');
      document.querySelectorAll('.code-output').forEach(output => {
        output.classList.remove('active');
      });
      document.getElementById(tabName + 'Output').classList.add('active');
    });
  });

  // Copy to clipboard
  copyButton.addEventListener('click', function() {
    const activeTab = document.querySelector('.tab-button.active').getAttribute('data-tab');
    const textToCopy = document.getElementById(activeTab + 'Output').textContent;
    
    navigator.clipboard.writeText(textToCopy).then(function() {
      alert('Copied to clipboard!');
    }).catch(function(err) {
      alert('Error copying text: ' + err);
    });
  });
});

async function generateCode(elements, apiKey, apiProvider) {
  const prompt = `Generate Gherkin scenarios and Java step definitions for Selenium framework based on these elements:
${JSON.stringify(elements, null, 2)}
Include both locator strategies (ID, CSS, XPath) and appropriate assertions.`;

  const apiEndpoint = apiProvider === 'openai' 
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://api.groq.com/v1/chat/completions';

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: apiProvider === 'openai' ? 'gpt-4' : 'mixtral-8x7b-32768',
      messages: [{
        role: 'user',
        content: prompt
      }],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  const generatedText = data.choices[0].message.content;

  // Split the response into Gherkin and Step Definitions
  const [gherkin, stepDefinitions] = generatedText.split('Step Definitions:');

  return {
    gherkin: gherkin.trim(),
    stepDefinitions: stepDefinitions ? stepDefinitions.trim() : ''
  };
}