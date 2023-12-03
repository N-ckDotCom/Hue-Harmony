function rgbStringToRgbArray(rgbString) {
  // Extract the values from the RGB string
  const [r, g, b] = rgbString
    .match(/\d+/g) // Extract numeric values
    .map(Number);  // Convert strings to numbers

  return [r, g, b];
}

function rgbToHex(r, g, b) {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getOppositeColor(rgbString) {
  const rgbArray = rgbStringToRgbArray(rgbString);

  // Get the opposite RGB components
  const oppositeR = 255 - rgbArray[0];
  const oppositeG = 255 - rgbArray[1];
  const oppositeB = 255 - rgbArray[2];

  // Convert the opposite RGB components to hex
  return rgbToHex(oppositeR, oppositeG, oppositeB);
}

function getContrastColor(rgbString, contrastFactor) {
  const rgbArray = rgbStringToRgbArray(rgbString);

  // Adjust the RGB components based on the contrast factor
  const adjustedR = Math.min(255, Math.max(0, rgbArray[0] + contrastFactor));
  const adjustedG = Math.min(255, Math.max(0, rgbArray[1] + contrastFactor));
  const adjustedB = Math.min(255, Math.max(0, rgbArray[2] + contrastFactor));

  // Convert the adjusted RGB components to hex
  return rgbToHex(adjustedR, adjustedG, adjustedB);
}


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

  browser.theme.update({ colors: colors });
}



async function fetchData() {
  try {
    const response = await fetch(browser.runtime.getURL('urls.json'));
    const jsonData = await response.json();

    return jsonData;

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}


async function handleTab(tabId, tabInfo) {
  // Check if the tab has a URL
  if (!tabInfo.url || tabInfo.url === 'about:blank' || tabInfo.url === 'about:newtab') {
    // Tab is a new tab (no URL)
    return; // Exit the method for new tabs
  }
  // Tab has a URL
  // You can add your logic for tabs with URLs here
  const theme = await matchUrl(tabInfo.url);
  if (theme === false) {
    // Execute a content script to get the background color of the document body
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
    browser.theme.update(theme);
  }

  // Rest of your logic for tabs with URLs
}

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

// Background Script (background.js)
function updateToolbarColor(tabId) {
  // Execute a content script to get the background color of the document body
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

browser.tabs.onUpdated.addListener(
  (tabId, changeInfo, tabInfo) => {
    if((changeInfo.url === null || changeInfo.url === undefined)) return;
    updateToolbarColor(tabId);
  });

// Listen for initial tab load
browser.tabs.query({ active: true, currentWindow: true }, tabs => {
  if (tabs && tabs.length > 0) {
    updateToolbarColor(tabs[0].id);
  }
});


browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'setToolbarColor') {
    // Set the toolbar background color
    setColor(request.color)
  }
});