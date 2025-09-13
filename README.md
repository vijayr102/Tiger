# Tiger

POM, Gherkin and stepdef generator — a Chrome extension that helps generate Cucumber Gherkin scenarios, Java step definitions and Page Object Model (POM) classes from elements selected on a web page.

## Project Files
- [manifest.json](manifest.json)
- [sidepanel.html](sidepanel.html)
- [sidepanel.js](sidepanel.js)
- [popup.html](popup.html)
- [popup.js](popup.js)
- [content.js](content.js)
- [background.js](background.js)
- [styles.css](styles.css)
- [prism.css](prism.css)

## Overview
Tiger injects an element inspector into the active tab. Use the side panel or popup to:
- Inspect and select DOM elements on any page.
- Request generated Gherkin scenarios, Java step definitions and POM classes using an LLM provider (OpenAI or Groq).
- Copy the generated code to clipboard with syntax highlighting (via Prism).

Key extension logic:
- The inspector logic lives in [content.js](content.js) — see functions like [`enableElementInspector`](content.js), [`selectElement`](content.js), [`getCssSelector`](content.js) and [`getXPath`](content.js).
- Side panel UI and code generation are implemented in [sidepanel.js](sidepanel.js) — see [`generateCode`](sidepanel.js).
- Popup UI also supports generation via [`generateCode`](popup.js) in [popup.js](popup.js).
- Background routing and sidePanel open action are in [background.js](background.js).

## Install / Load for Development
1. Open Chrome and go to chrome://extensions/.
2. Enable "Developer mode".
3. Click "Load unpacked" and select the project folder containing this manifest.
4. Open the side panel via the extension action or open the popup.

## Usage
1. Open the extension side panel (default path: [sidepanel.html](sidepanel.html)).
2. Enter your API key and provider in Settings and save.
3. Click "Start Element Inspector" to inject and enable inspection on the active tab.
4. Click page elements to select them — selections are persisted as overlays.
5. Choose which outputs you want (Gherkin, Step Definitions, Page Object Model).
6. Click "Generate Code" to call the configured LLM and produce code.
7. Review output with syntax highlighting and click "Copy to Clipboard" if desired.

## Example Feature (RedBus Search)
Below is an example Gherkin feature that can be produced by the generator:

Feature: RedBus Search Functionality
  As a user, I want to be able to search for buses on the RedBus website.

Scenario Outline: Search for buses with different source and destination
  Given I am on the RedBus website
  When I enter "<source>" as the source
  And I enter "<destination>" as the destination
  And I select "<date>" as the onward date
  And I select "<return_date>" as the return date
  And I click the "SEARCH BUSES" button
  Then I should see the search results

Examples:
  | source     | destination   | date        | return_date |
  | Singapore  | Kuala Lumpur  | 2025-09-15  | 2025-09-20  |
  | Johor      | Malacca       | 2025-09-18  | 2025-09-22  |
  | Penang     | Ipoh          | 2025-09-25  |             |

Scenario: Search for buses without return date
  Given I am on the RedBus website
  When I enter "Singapore" as the source
  And I enter "Kuala Lumpur" as the destination
  And I select "2025-09-15" as the onward date
  And I do not select a return date
  And I click the "SEARCH BUSES" button
  Then I should see the search results

Scenario: Search for buses with invalid source
  Given I am on the RedBus website
  When I enter "Invalid Source" as the source
  And I enter "Kuala Lumpur" as the destination
  And I select "2025-09-15" as the onward date
  And I select "2025-09-20" as the return date
  And I click the "SEARCH BUSES" button
  Then I should see an error message

// -------------------- JAVA STEP DEFINITIONS --------------------
// (Example snippet — generator will return full classes)

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.FindBy;
import org.openqa.selenium.support.PageFactory;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;

public class RedBusSearchPage {

    private WebDriver driver;
    private WebDriverWait wait;

    @FindBy(css = "#src")
    private WebElement sourceInput;

    @FindBy(css = "#dest")
    private WebElement destinationInput;

    @FindBy(css = "#onward_cal")
    private WebElement onwardDateInput;

    @FindBy(css = "#return_cal")
    private WebElement returnDateInput;

    @FindBy(css = "#search_button")
    private WebElement searchBusesButton;

    @FindBy(css = ".error-message")
    private WebElement errorMessage;

    public RedBusSearchPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, 10);
        PageFactory.initElements(driver, this);
    }

    public void enterSource(String source) {
        wait.until(ExpectedConditions.visibilityOf(sourceInput));
        sourceInput.sendKeys(source);
    }

    public void enterDestination(String destination) {
        wait.until(ExpectedConditions.visibilityOf(destinationInput));
        destinationInput.sendKeys(destination);
    }

    public void selectOnwardDate(String date) {
        wait.until(ExpectedConditions.visibilityOf(onwardDateInput));
        onwardDateInput.click();
        WebElement dateElement = driver.findElement(By.xpath("//div[@id='onward_cal']//td[@data-date='" + date + "']"));
        wait.until(ExpectedConditions.elementToBeClickable(dateElement));
        dateElement.click();
    }

    public void selectReturnDate(String date) {
        wait.until(ExpectedConditions.visibilityOf(returnDateInput));
        returnDateInput.click();
        WebElement dateElement = driver.findElement(By.xpath("//div[@id='return_cal']//td[@data-date='" + date + "']"));
        wait.until(ExpectedConditions.elementToBeClickable(dateElement));
        dateElement.click();
    }

    public void clickSearchBusesButton() {
        wait.until(ExpectedConditions.elementToBeClickable(searchBusesButton));
        searchBusesButton.click();
    }

    public void verifySearchResults() {
        wait.until(ExpectedConditions.titleContains("Bus Tickets"));
        Assert.assertTrue(driver.getTitle().contains("Bus Tickets"));
    }

    public void verifyErrorMessage() {
        wait.until(ExpectedConditions.visibilityOf(errorMessage));
        Assert.assertTrue(errorMessage.isDisplayed());
    }
}

## Notes & Troubleshooting
- If the inspector does not activate, try refreshing the page and re-trying the "Start Element Inspector" button.
- The side panel uses [PrismJS](prism.css/prism.js) for syntax highlighting — see [prism.css](prism.css).
- Generation requests are proxied to the selected provider endpoints in [`sidepanel.js`](sidepanel.js) and [`popup.js`](popup.js) (`generateCode`).
- The content inspector overlays and selection are implemented in [content.js](content.js).

## Contributing
Feel free to open issues or submit PRs. Keep LLM prompts and generated outputs deterministic where possible and validate selectors produced by the generator.

## License
MIT license.