// Initialize variables
// Global DOM context: store elements per page
let domContext = {};
let selectedElements = [];
let isInspecting = false;
let pomCode = '';

document.addEventListener('DOMContentLoaded', async function() {
  // Multi-page selection and ordering
  const pageMultiSelect = document.getElementById('pageMultiSelect');
  const pageOrderControls = document.getElementById('pageOrderControls');
  let selectedPageOrder = [];

  function renderPageMultiSelect() {
    pageMultiSelect.innerHTML = '';
    const urls = Object.keys(domContext);
    urls.forEach(url => {
      const wrapper = document.createElement('div');
      wrapper.className = 'page-multiselect-item';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = url;
      checkbox.checked = selectedPageOrder.includes(url);
      checkbox.addEventListener('change', function() {
        if (checkbox.checked) {
          if (!selectedPageOrder.includes(url)) selectedPageOrder.push(url);
        } else {
          selectedPageOrder = selectedPageOrder.filter(u => u !== url);
        }
        renderPageOrderControls();
      });
      const label = document.createElement('span');
      label.textContent = url;
      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      pageMultiSelect.appendChild(wrapper);
    });
    renderPageOrderControls();
  }

  function renderPageOrderControls() {
    pageOrderControls.innerHTML = '';
    selectedPageOrder.forEach((url, idx) => {
      const item = document.createElement('div');
      item.className = 'page-order-item';
      item.textContent = `${idx === 0 ? 'Start Page' : 'Next Page ' + idx}: ${url}`;
      // Up button
      if (idx > 0) {
        const upBtn = document.createElement('button');
        upBtn.textContent = '↑';
        upBtn.title = 'Move up';
        upBtn.onclick = () => {
          [selectedPageOrder[idx-1], selectedPageOrder[idx]] = [selectedPageOrder[idx], selectedPageOrder[idx-1]];
          renderPageOrderControls();
        };
        item.appendChild(upBtn);
      }
      // Down button
      if (idx < selectedPageOrder.length - 1) {
        const downBtn = document.createElement('button');
        downBtn.textContent = '↓';
        downBtn.title = 'Move down';
        downBtn.onclick = () => {
          [selectedPageOrder[idx+1], selectedPageOrder[idx]] = [selectedPageOrder[idx], selectedPageOrder[idx+1]];
          renderPageOrderControls();
        };
        item.appendChild(downBtn);
      }
      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✕';
      removeBtn.title = 'Remove page';
      removeBtn.onclick = () => {
        selectedPageOrder = selectedPageOrder.filter(u => u !== url);
        renderPageMultiSelect();
      };
      item.appendChild(removeBtn);
      pageOrderControls.appendChild(item);
    });
  }

  // Call this whenever domContext changes
  function updateMultiPageUI() {
    renderPageMultiSelect();
    renderPageOrderControls();
  }
  // Initialize UI elements
  const inspectButton = document.getElementById('inspectButton');
  const generateButton = document.getElementById('generateButton');
  const apiKeyInput = document.getElementById('apiKey');
  const apiProviderSelect = document.getElementById('apiProvider');
  const saveSettingsButton = document.getElementById('saveSettings');
  const tabButtons = document.querySelectorAll('.tab-button');
  const gherkinCheck = document.getElementById('gherkinCheck');
  const stepdefCheck = document.getElementById('stepdefCheck');
  const pomCheck = document.getElementById('pomCheck');
  const codeOutput = document.getElementById('codeOutput');
    const copyButton = document.getElementById('copyButton');
    // Ensure codeOutput is relatively positioned for absolute icon
    codeOutput.style.position = 'relative';

  // Verify all elements are found
  const requiredElements = {
    inspectButton,
    generateButton,
    apiKeyInput,
    apiProviderSelect,
    saveSettingsButton,
    copyButton,
    gherkinCheck,
    stepdefCheck,
    pomCheck,
    codeOutput
  };

  // Check if any required elements are missing
  const missingElements = Object.entries(requiredElements)
    .filter(([_, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length > 0) {
    console.error('Missing UI elements:', missingElements);
    alert('Error: Some UI elements are missing. Please check the console for details.');
    return;
  }

  // Load saved settings and domContext
  chrome.storage.sync.get(['apiKey', 'apiProvider'], function(result) {
    if (result.apiKey) apiKeyInput.value = result.apiKey;
    if (result.apiProvider) apiProviderSelect.value = result.apiProvider;
  });
  chrome.storage.local.get(['domContext'], function(result) {
    if (result.domContext) {
      domContext = result.domContext;
      updatePageDropdown();
      updateMultiPageUI();
    } else {
      updateMultiPageUI();
    }
  });

  window.addEventListener('beforeunload', function() {
    chrome.storage.local.set({ domContext });
  });

  // Save settings
  saveSettingsButton.addEventListener('click', async function() {
    try {
      if (!apiKeyInput.value.trim()) {
        alert('Please enter an API key');
        return;
      }

      await chrome.storage.sync.set({
        apiKey: apiKeyInput.value.trim(),
        apiProvider: apiProviderSelect.value
      });

      saveSettingsButton.textContent = 'Saved!';
      saveSettingsButton.style.backgroundColor = '#4CAF50';
      
      setTimeout(() => {
        saveSettingsButton.textContent = 'Save Settings';
        saveSettingsButton.style.backgroundColor = '';
      }, 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings: ' + error.message);
    }
  });

    // Copy to clipboard handler for icon
    copyButton.addEventListener('click', function() {
      const text = codeOutput.textContent || '';
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        copyButton.style.opacity = '1';
        setTimeout(() => { copyButton.style.opacity = '0.7'; }, 800);
      });
    });
  // Toggle inspector
  inspectButton.addEventListener('click', async function() {
    try {
      isInspecting = !isInspecting;
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      if (tabs.length > 0) {
        // Always attempt to inject the content script
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['src/content/content.js']
          });
        } catch (err) {
          // Script might already be injected, ignore
        }
        // Try sending the message and handle connection errors
        const action = isInspecting ? 'startInspector' : 'stopInspector';
        chrome.tabs.sendMessage(tabs[0].id, {action}, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Failed to toggle inspector:', chrome.runtime.lastError.message);
            alert('Could not connect to the page. Please refresh the tab and try again.');
            isInspecting = false;
            inspectButton.textContent = 'Start Element Inspector';
            inspectButton.style.backgroundColor = '#4CAF50';
            return;
          }
          if (isInspecting) {
            inspectButton.textContent = 'Stop Inspector';
            inspectButton.style.backgroundColor = '#ff4444';
          } else {
            inspectButton.textContent = 'Start Element Inspector';
            inspectButton.style.backgroundColor = '#4CAF50';
          }
        });
      }
    } catch (error) {
      console.error('Failed to toggle inspector:', error);
      alert('Unexpected error occurred. Please refresh the tab and try again.');
      isInspecting = false;
      inspectButton.textContent = 'Start Element Inspector';
      inspectButton.style.backgroundColor = '#4CAF50';
    }
  });

  // Handle visibility changes
  document.addEventListener('visibilitychange', function() {
    if (document.hidden && isInspecting) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {action: 'startInspector'});
        }
      });
    }
  });

  // Handle selected elements per page
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'elementSelected') {
      const pageUrl = request.pageUrl || 'unknown';
      if (!domContext[pageUrl]) domContext[pageUrl] = [];
      domContext[pageUrl].push(request.element);
      // If user is on this page, update selectedElements
      if (window.location.href === pageUrl) {
        selectedElements = domContext[pageUrl];
      }
      updatePageDropdown();
      updateGenerateButtonState();
      updateMultiPageUI();
    }
  });

  // UI: Add dropdown to select page context
  const pageDropdown = document.createElement('select');
  pageDropdown.id = 'pageDropdown';
  pageDropdown.style.margin = '8px 0';
  codeOutput.parentNode.insertBefore(pageDropdown, codeOutput);

  function updatePageDropdown() {
    const urls = Object.keys(domContext);
    pageDropdown.innerHTML = '';
    urls.forEach(url => {
      const option = document.createElement('option');
      option.value = url;
      option.textContent = url;
      pageDropdown.appendChild(option);
    });
    if (urls.length && !pageDropdown.value) {
      pageDropdown.value = urls[0];
    }
    // Update selectedElements for current dropdown
    selectedElements = domContext[pageDropdown.value] || [];
    updateGenerateButtonState();
  }

  pageDropdown.addEventListener('change', () => {
    selectedElements = domContext[pageDropdown.value] || [];
    updateGenerateButtonState();
  });

  // Update generate button state
  function updateGenerateButtonState() {
    generateButton.disabled = selectedElements.length === 0;
  }

  // Generate code
  generateButton.addEventListener('click', async function() {
    const apiKey = apiKeyInput.value.trim();
    const apiProvider = apiProviderSelect.value.toLowerCase();
    
    if (!apiKey) {
      alert('Please enter an API key first!');
      return;
    }

    if (selectedElements.length === 0) {
      alert('Please select at least one element for the selected page!');
      return;
    }

    // Gather all selected pages' DOM elements in order
    const multiPageContext = selectedPageOrder.map((url, idx) => ({
      url,
      elements: domContext[url] || []
    }));

    if (!['openai', 'groq'].includes(apiProvider)) {
      alert('Please select a valid API provider (OpenAI or Groq)');
      return;
    }

    generateButton.textContent = 'Generating...';
    generateButton.disabled = true;

    try {
  // Generate code for all selected pages in order
  const response = await generateCode(multiPageContext, apiKey, apiProvider);

      if (!codeOutput) {
        throw new Error('Output element not found');
      }

      codeOutput.dataset.gherkin = response.gherkin || '';
      codeOutput.dataset.stepdef = response.stepDefinitions || '';
      codeOutput.dataset.pom = response.pom || '';

      updateOutputContent();
      console.log('Code generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      console.log('Error generating code: ' + error.message);
    } finally {
      generateButton.textContent = 'Generate Code';
      generateButton.disabled = false;
    }
  });

  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      const tabName = button.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName + 'Tab');
      });
    });
  });

  // Handle checkbox changes
  [gherkinCheck, stepdefCheck, pomCheck].forEach(checkbox => {
    checkbox.addEventListener('change', updateOutputContent);
  });

  // Copy to clipboard
  copyButton.addEventListener('click', async function() {
    try {
      const parts = [];
      if (gherkinCheck.checked && codeOutput.dataset.gherkin) {
        parts.push(codeOutput.dataset.gherkin);
      }
      if (stepdefCheck.checked && codeOutput.dataset.stepdef) {
        if (parts.length) parts.push('\n\n// -------------------- JAVA STEP DEFINITIONS --------------------\n');
        parts.push(codeOutput.dataset.stepdef);
      }
      if (pomCheck.checked && codeOutput.dataset.pom) {
        if (parts.length) parts.push('\n\n// -------------------- PAGE OBJECT MODEL --------------------\n');
        parts.push(codeOutput.dataset.pom);
      }

      if (!parts.length) {
        throw new Error('No content selected to copy');
      }

      await navigator.clipboard.writeText(parts.join('\n'));
      
      copyButton.textContent = 'Copied!';
      copyButton.style.backgroundColor = '#4CAF50';
      
      setTimeout(() => {
        copyButton.textContent = 'Copy to Clipboard';
        copyButton.style.backgroundColor = '';
      }, 2000);
    } catch (error) {
      console.error('Copy error:', error);
      alert('Error copying to clipboard: ' + error.message);
    }
  });

  function updateOutputContent() {
    let content = '';
    
    if (gherkinCheck.checked && codeOutput.dataset.gherkin) {
      content += '<pre><code class="language-gherkin">' + 
        Prism.highlight(codeOutput.dataset.gherkin, Prism.languages.gherkin, 'gherkin') + 
        '</code></pre>';
    }
    
    if (stepdefCheck.checked && codeOutput.dataset.stepdef) {
      if (content) content += '<hr>';
      content += '<pre><code class="language-java">' + 
        Prism.highlight(codeOutput.dataset.stepdef, Prism.languages.java, 'java') + 
        '</code></pre>';
    }
    
    if (pomCheck.checked && codeOutput.dataset.pom) {
      if (content) content += '<hr>';
      content += '<pre><code class="language-java">' + 
        Prism.highlight(codeOutput.dataset.pom, Prism.languages.java, 'java') + 
        '</code></pre>';
    }
    
    codeOutput.innerHTML = content;
  }

  async function generateCode(elements, apiKey, apiProvider) {
    let pageUrl = '';
    try {
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      pageUrl = tabs[0].url;
    } catch (error) {
      console.error('Failed to get page URL:', error);
    }

    // Accept multi-page context: elements is now an array of {url, elements}
    // If elements is not an array, fallback to old behavior
    let multiPageContext = Array.isArray(elements) ? elements : [{ url: '', elements }];

    // Build a combined DOM context string for all selected pages
    let domContextString = multiPageContext.map((page, idx) => {
      return `Page ${idx+1} URL: ${page.url}\nDOM:\n${JSON.stringify(page.elements, null, 2)}`;
    }).join('\n\n');

    const apiConfig = {
      openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      },
      groq: {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    };

    const config = apiConfig[apiProvider];
    if (!config) {
      throw new Error('Invalid API provider selected');
    }

    try {
      let gherkin = '', stepDefinitions = '', pomCode = '';
      const generateGherkin = gherkinCheck.checked;
      const generateStepDefs = stepdefCheck.checked;
      const generatePOM = pomCheck.checked;

      // Generate Gherkin if requested
      if (generateGherkin && !generateStepDefs) {
        const gherkinPrompt = `
Instructions:
- Generate ONLY a Cucumber (.feature) file.
- Use Scenario Outline with Examples table.
- Make sure every step is relevant to the provided DOM(s).
- Do not combine multiple actions into one step.
- Use diversified realistic dataset (names, addresses, pin codes, mobile numbers).
- Use dropdown values only from provided DOM(s).
- Generate multiple scenarios if applicable.
- If multiple pages are provided, treat the first as the start page and subsequent as navigation steps.

Context:
${domContextString}
Example:
\`\`\`gherkin
Feature: Login to Gmail

Scenario Outline: Successful login with valid credentials
  Given I open the login page
  When I type "<username>" into the Username field
  And I type "<password>" into the Password field
  And I click the Login button
  Then I should be logged in successfully

Examples:
  | username   | password  |
  | "testuser" | "testpass"|
  | "admin"    | "admin123"|
\`\`\`

Persona:
- Audience: BDD testers who only need feature files.

Output Format:
- Only valid Gherkin in a \`\`\`gherkin\`\`\` block.

Tone:
- Clear, structured, executable.
`;

        const gherkinResponse = await fetch(config.url, {
          method: 'POST',
          headers: config.headers,
          body: JSON.stringify({
            model: config.model,
            messages: [{
              role: 'user',
              content: gherkinPrompt
            }],
            temperature: 0.2
          })
        });

        if (!gherkinResponse.ok) {
          throw new Error(`Gherkin API failed: ${gherkinResponse.status} ${gherkinResponse.statusText}`);
        }

        const gherkinData = await gherkinResponse.json();
        const gherkinMatch = gherkinData.choices[0].message.content.match(/```gherkin\n([\s\S]*?)```/);
        gherkin = gherkinMatch ? gherkinMatch[1].trim() : gherkinData.choices[0].message.content;
      }

      // Generate step definitions if requested
    if (generateStepDefs) {
    const stepdefPrompt = `Instructions:
Generate BOTH:
1. A Cucumber .feature file.
2. A Java step definition class for selenium.
- Do NOT include Page Object code.
- Step defs must include WebDriver setup, explicit waits, and actual Selenium code.
- Use Scenario Outline with Examples table (diversified realistic data).

Context:
${domContextString}
Page URLs (in order):
${multiPageContext.map((p, i) => `Page ${i+1}: ${p.url}`).join('\n')}

Example:
\`\`\`gherkin
Feature: Login to Gmail

Scenario Outline: Successful login with valid credentials
  Given I open the login page
  When I type "<username>" into the Username field
  And I type "<password>" into the Password field
  And I click the Login button
  Then I should be logged in successfully

Examples:
  | username   | password  |
  | "testuser" | "testpass"|
  | "admin"    | "admin123"|
\`\`\`

\`\`\`java
package com.gmail.stepdefs;

import io.cucumber.java.en.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.*;

public class LoginStepDefinitions {
    private WebDriver driver;
    private WebDriverWait wait;

    @io.cucumber.java.Before
    public void setUp() {
        driver = new ChromeDriver();
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        driver.manage().window().maximize();
    }

    @io.cucumber.java.After
    public void tearDown() {
        if (driver != null) driver.quit();
    }

    @Given("I open the login page")
    public void openLoginPage() {
        driver.get("${pageUrl}");
    }

    @When("I type {string} into the Username field")
    public void enterUsername(String username) {
        WebElement el = wait.until(ExpectedConditions.elementToBeClickable(By.id("username")));
        el.sendKeys(username);
    }

    @When("I type {string} into the Password field")
    public void enterPassword(String password) {
        WebElement el = wait.until(ExpectedConditions.elementToBeClickable(By.id("password")));
        el.sendKeys(password);
    }

    @When("I click the Login button")
    public void clickLogin() {
        driver.findElement(By.xpath("//button[contains(text(),'Login')]")).click();
    }

    @Then("I should be logged in successfully")
    public void verifyLogin() {
        WebElement success = wait.until(ExpectedConditions.visibilityOfElementLocated(By.className("success")));
        assert success.isDisplayed();
    }
}
\`\`\`

Persona:
- Audience: QA engineers working with Cucumber & Selenium.

Output Format:
- Gherkin in \`\`\`gherkin\`\`\` block + Java code in \`\`\`java\`\`\` block.

Tone:
- Professional, executable, structured.
`;

        const stepdefResponse = await fetch(config.url, {
          method: 'POST',
          headers: config.headers,
          body: JSON.stringify({
            model: config.model,
            messages: [{
              role: 'user',
              content: stepdefPrompt
            }],
            temperature: 0.2
          })
        });

        if (!stepdefResponse.ok) {
          throw new Error(`Step Definition API failed: ${stepdefResponse.status}`);
        }

        const stepdefData = await stepdefResponse.json();
        const javaMatch = stepdefData.choices[0].message.content.match(/```java\n([\s\S]*?)```/);
        const gherkinMatch = stepdefData.choices[0].message.content.match(/```gherkin\n([\s\S]*?)```/);
        gherkin = gherkinMatch ? gherkinMatch[1].trim() : '';
        stepDefinitions = javaMatch ? javaMatch[1].trim() : '';
      }

      // Generate POM if requested
      if (generatePOM) {
        const pomPrompt = `Instructions:
        Generate a Selenium Java Page Object Model class for each page in the flow.
        - Add proper JavaDoc
        - Use FindBy annotations
        - Include meaningful method names
        - Add proper waits
        - Handle errors gracefully
        - If multiple pages are provided, generate a separate Page Object class for each, named according to the page order (e.g., StartPage, NextPage1, etc.).

Context:
${domContextString}

Page URLs (in order):
${multiPageContext.map((p, i) => `Page ${i+1}: ${p.url}`).join('\n')}

Output Format: Only Java code in a \`\`\`java\`\`\` block, with each class separated by a comment line. Example: // --- Page 1 ---\n`;

        const pomResponse = await fetch(config.url, {
          method: 'POST',
          headers: config.headers,
          body: JSON.stringify({
            model: config.model,
            messages: [{
              role: 'user',
              content: pomPrompt
            }],
            temperature: 0.2
          })
        });

        if (!pomResponse.ok) {
          throw new Error(`POM API failed: ${pomResponse.status}`);
        }

        const pomData = await pomResponse.json();
        const pomMatch = pomData.choices[0].message.content.match(/```java\n([\s\S]*?)```/);
        pomCode = pomMatch ? pomMatch[1].trim() : '';
      }

      return {
        gherkin,
        stepDefinitions,
        pom: pomCode
      };
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  chrome.runtime.sendMessage({ action: "toggleInspector" }, function(response) { if (response.error) { console.error("Inspector error:", response.error); } else { console.log("Inspector response:", response.status); } });
});
