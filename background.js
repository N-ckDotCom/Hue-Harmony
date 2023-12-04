// Color Utils

/**
 * Converts an RGB color string to an RGB array
 * @param {string} rgbString - The RGB color string, e.g. '255,255,255' 
 * @returns {number[]} The RGB values as an array, e.g. [255, 255, 255]
 */
function rgbStringToRgbArray(rgbString) {
  // Extract the values from the RGB string
  const [r, g, b] = rgbString
    .match(/\d+/g) // Extract numeric values
    .map(Number);  // Convert strings to numbers

  return [r, g, b];
}

/**
 * Converts RGB values to a hex color string 
 * @param {number} r - The red value 0-255
 * @param {number} g - The green value 0-255
 * @param {number} b - The blue value 0-255
 * @returns {string} The hex color string, e.g. '#ffffff'
 */
function rgbToHex(r, g, b) {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Gets the opposite color for a given RGB color string
 * @param {string} rgbString - The RGB color string 
 * @returns {string} The opposite RGB color as a hex string
 */
function getOppositeColor(rgbString) {
  const rgbArray = rgbStringToRgbArray(rgbString);

  const oppositeR = 255 - rgbArray[0];
  const oppositeG = 255 - rgbArray[1];
  const oppositeB = 255 - rgbArray[2];

  // Convert the opposite RGB components to hex
  return rgbToHex(oppositeR, oppositeG, oppositeB);
}

/** 
 * Gets a contrasting color for a given RGB color string
 * @param {string} rgbString - The RGB color string
 * @param {number} contrastFactor - Contrast adjustment value 
 * @returns {string} An adjusted contrasting color as a hex string
*/
function getContrastColor(rgbString, contrastFactor) {
  const rgbArray = rgbStringToRgbArray(rgbString);

  const adjustedR = Math.min(255, Math.max(0, rgbArray[0] + contrastFactor));
  const adjustedG = Math.min(255, Math.max(0, rgbArray[1] + contrastFactor));
  const adjustedB = Math.min(255, Math.max(0, rgbArray[2] + contrastFactor));

  return rgbToHex(adjustedR, adjustedG, adjustedB);
}


/**
 * Sets the browser theme colors
 * @param {string} color - The color to use for the theme
 */
function setColor(color) {

  let colors = {
    toolbar: color,
    toolbar_bottom_separator: color,
    toolbar_field_border: getContrastColor(color, -10),
    toolbar_field: color,
    toolbar_field_text: getOppositeColor(color),
    tab_selected: color,
    tab_background_text: getOppositeColor(color),
    frame: color
  }

  // Access Firefox API
  browser.theme.update({ colors: colors });
}


/**
 * Fetches color theme data from a JSON file
 * @returns {Object[]} The color theme data
 */
async function fetchData() {

  try {
    const response = await fetch(browser.runtime.getURL('urls.json'));

    if (!response) {
      throw new Error("No response");
    }

    const jsonData = await response.json();

    return jsonData;

  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }

}

/**
 * Handles logic when a browser tab is updated
 * @param {number} tabId - The tab ID  
 * @param {Object} tabInfo - Information about the updated tab 
 */
async function handleTab(tabId, tabInfo) {

  try {

    const theme = await matchUrl(tabInfo.url);

    if (!theme) {

      browser.tabs.executeScript(tabId, { code: 'window.getComputedStyle(document.body).backgroundColor' })
        .then(result => {

          const bodyBackgroundColor = result[0];

          if (bodyBackgroundColor && bodyBackgroundColor !== 'rgba(0, 0, 0, 0)') {
            setColor(bodyBackgroundColor);
          }

        })
        .catch(error => {
          console.error('Error executing content script:', error);
        });

    }
    else {
      console.log(theme);

      // Access Firefox API
      browser.theme.update(theme);
    }

  } catch (error) {
    // Handle error
  }

}

/**
 * Attempts to match tab URL to color theme data
 * @param {string} url - The tab URL 
 * @returns {Object|boolean} The matched theme data object or false if no match
*/
async function matchUrl(url) {
  const setting = await browser.browserSettings.overrideContentColorScheme.get({})
  const theme = setting.value === "dark";
  const data = await fetchData();
  for (let i = 0; i < data.length; i++) {
    const element = data[i];
    if (url.includes(element.url)) {
      if (element.darkMode === null || element.darkMode === undefined) {
        return element.theme;
      }
      if (element.darkMode == theme) {
        return element.theme;

      }

    }

  }
  return false;
}

/**
 * Updates toolbar color when a tab is activated
 * @param {number} tabId - The ID of the activated tab
*/
function updateToolbarColor(tabId) {
  browser.tabs.get(tabId)
    .then(tabInfo => handleTab(tabId, tabInfo))
    .catch(error => {
      console.error('Error getting tab information:', error);
    });
}





// Listen for tab switch events
browser.tabs.onActivated.addListener(activeInfo => {
  updateToolbarColor(activeInfo.tabId);
});

// Listen for tab update events
browser.tabs.onUpdated.addListener(
  (tabId, changeInfo, tabInfo) => {
    if ((changeInfo.url === null || changeInfo.url === undefined)) return;
    updateToolbarColor(tabId);
  });

// Listen for initial tab load
browser.tabs.query({ active: true, currentWindow: true }, tabs => {
  if (tabs && tabs.length > 0) {
    updateToolbarColor(tabs[0].id);
  }
});

// Listen for 
browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'setToolbarColor') {
    setColor(request.color)
  }
});