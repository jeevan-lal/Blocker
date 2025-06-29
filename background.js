// Store settings and request logs
let settings = {
  enabled: false,
  blockAllJs: false,
  blockTabJs: false,
  blockedTabIds: [], // Array of tab IDs where JS should be blocked
  blockList: [], // Array of {pattern: string, addedDate: string}
  whiteList: [], // Array of {pattern: string, addedDate: string}
  contentOverrides: []
};

let requestLogs = [];
const MAX_LOGS = 1000;
let nextRuleId = 1;
let isMonitoring = false;
let monitoredRequests = []; // Store monitored requests even when popup is closed

// Load settings from storage
chrome.storage.local.get(['settings', 'nextRuleId', 'isMonitoring'], (result) => {
  if (result.settings) {
    settings = result.settings;
    // Migrate old settings format if needed
    if (settings.currentTabId !== undefined) {
      if (settings.currentTabId !== null) {
        settings.blockedTabIds = [settings.currentTabId];
      } else {
        settings.blockedTabIds = [];
      }
      delete settings.currentTabId;
      saveSettings();
    }
    applyAllRules();
  }
  if (result.nextRuleId) {
    nextRuleId = result.nextRuleId;
  }
  if (result.isMonitoring !== undefined) {
    isMonitoring = result.isMonitoring;
  }
});

// Save settings to storage
function saveSettings() {
  chrome.storage.local.set({
    settings,
    nextRuleId,
    isMonitoring
  });
}

// Apply all rules based on current settings
async function applyAllRules() {
  try {
    if (!settings.enabled) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: await getCurrentRuleIds()
      });
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: await getCurrentSessionRuleIds()
      });
      return;
    }

    const dynamicRules = [];
    const sessionRules = [];
    let dynamicRuleId = 1;
    let sessionRuleId = 1;

    // Block all JavaScript if enabled (highest priority)
    if (settings.blockAllJs) {
      dynamicRules.push({
        id: dynamicRuleId++,
        priority: 3,
        action: { type: 'block' },
        condition: {
          resourceTypes: ['script']
        }
      });
    }

    // Block JavaScript for specific tabs if enabled (medium priority)
    if (settings.blockTabJs && settings.blockedTabIds.length > 0) {
      // Clean up invalid tab IDs first
      try {
        const tabPromises = settings.blockedTabIds.map(tabId => chrome.tabs.get(tabId));
        const tabs = await Promise.allSettled(tabPromises);
        
        // Keep only valid tab IDs
        settings.blockedTabIds = tabs
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value.id);

        if (settings.blockedTabIds.length > 0) {
          sessionRules.push({
            id: sessionRuleId++,
            priority: 2,
            action: { type: 'block' },
            condition: {
              urlFilter: '*',
              resourceTypes: ['script'],
              tabIds: settings.blockedTabIds
            }
          });
        }
        
        saveSettings();
      } catch (error) {
        console.error('Error handling blocked tabs:', error);
      }
    }

    // Add block list rules (lower priority)
    if (settings.blockList && settings.blockList.length > 0) {
      settings.blockList.forEach(item => {
        // Create a rule that matches the URL pattern with a wildcard
        const urlPattern = item.pattern.includes('*') ? item.pattern : `*${item.pattern}*`;
        dynamicRules.push({
          id: dynamicRuleId++,
          priority: 1,
          action: { type: 'block' },
          condition: {
            urlFilter: urlPattern,
            resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'media', 'websocket', 'other']
          }
        });
      });
    }

    // Add whitelist rules (highest priority to override blocks)
    if (settings.whiteList && settings.whiteList.length > 0) {
      settings.whiteList.forEach(item => {
        dynamicRules.push({
          id: dynamicRuleId++,
          priority: 100,
          action: { type: 'allow' },
          condition: {
            urlFilter: item.pattern,
            resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'media', 'websocket', 'other']
          }
        });
      });
    }

    // Add content override rules (highest priority)
    settings.contentOverrides.forEach(override => {
      if (override && override.enabled) {
        dynamicRules.push(createContentOverrideRule(override));
      }
    });

    // Update dynamic rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: await getCurrentRuleIds(),
      addRules: dynamicRules
    });

    // Update session rules for tab-specific blocking
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: await getCurrentSessionRuleIds(),
      addRules: sessionRules
    });

    // Calculate next rule ID excluding content override rules
    nextRuleId = Math.max(
      dynamicRuleId,
      ...settings.contentOverrides.map(o => parseInt(o.id) + 1),
      1
    );
    saveSettings();

  } catch (error) {
    console.error('Error applying rules:', error);
  }
}

// Get current dynamic rule IDs
async function getCurrentRuleIds() {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  return rules.map(rule => rule.id);
}

// Get current session rule IDs
async function getCurrentSessionRuleIds() {
  const rules = await chrome.declarativeNetRequest.getSessionRules();
  return rules.map(rule => rule.id);
}

// Create a rule for content override
function createContentOverrideRule(override) {

  // Get the resource type based on override type
  const resourceType = override.type === 'script' ? 'script' :
    override.type === 'stylesheet' ? 'stylesheet' :
      override.type === 'image' ? 'image' :
        override.type === 'font' ? 'font' :
          override.type === 'media' ? 'media' :
            override.type === 'websocket' ? 'websocket' : 'other';

  // Combine blockLocations and resource type
  const resourceTypes = [...new Set([...override.blockLocations, resourceType])];

  // Ensure ID is a valid integer
  const id = parseInt(override.id);
  if (isNaN(id) || !Number.isInteger(id)) {
    throw new Error(`Invalid rule ID: ${override.id}`);
  }

  return {
    id,
    priority: override.priority || 0,
    action: {
      type: 'redirect',
      redirect: {
        url: override.content
      }
    },
    condition: {
      urlFilter: override.urlPattern,
      resourceTypes
    }
  };
}

// Use for monitoring requests
chrome.webRequest.onBeforeRequest.addListener(async (details) => {
  try {
    if (!isMonitoring) return;

    // Skip monitoring the extension's own requests
    if (details.url.startsWith(chrome.runtime.getURL(''))) {
      return;
    }

    // Check if URL is in block list
    const isBlocked = settings.blockList && settings.blockList.some(item => 
      details.url.includes(item.pattern) || details.url === item.pattern
    );

    const log = {
      url: details.url,
      type: details.type,
      status: isBlocked ? 'blocked' : 'allowed',
      timestamp: new Date().toISOString(),
      tabId: details.tabId
    };

    // Add to monitored requests
    monitoredRequests.unshift(log);
    if (monitoredRequests.length > MAX_LOGS) {
      monitoredRequests.pop();
    }

    // Try to notify popup if it's open
    try {
      await chrome.runtime.sendMessage({
        action: 'newRequest',
        request: log
      });
    } catch (error) {
      // Popup is closed, which is fine
    }

  } catch (error) {
    console.error('Error monitoring request:', error);
  }
}, { urls: ['<all_urls>'] });

// Log matched rules
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  const { request, rule } = info;

  // const log = {
  //   url: request.url,
  //   type: request.type,
  //   status: rule.action.type === 'block' ? 'blocked' :
  //     rule.action.type === 'redirect' ? 'modified' : 'allowed',
  //   timestamp: new Date().toISOString(),
  //   tabId: request.tabId
  // };
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // For async operations
  let asyncOperation = false;
  switch (message.action) {
    case 'getSettings':
      sendResponse({
        settings,
        isMonitoring,
        monitoredRequests // Send monitored requests with settings
      });
      break;

    case 'updateSettings':
      try {
        // Update settings while preserving any undefined values
        settings = {
          ...settings,
          ...message.settings
        };
        // Save settings
        saveSettings();
        // Apply rules and send response
        applyAllRules()
          .then(() => {
            sendResponse({ success: true, settings });
          })
          .catch(error => {
            console.error('Error applying rules:', error);
            sendResponse({ success: false, error: error.message });
          });
        asyncOperation = true;
      } catch (error) {
        console.error('Error updating settings:', error);
        sendResponse({ success: false, error: error.message });
      }
      break;

    case 'toggleEnable':
      settings.enabled = message.enabled;
      applyAllRules();
      saveSettings();
      sendResponse({ settings });
      break;

    case 'toggleBlockAllJs':
      settings.blockAllJs = message.enabled;
      if (settings.blockAllJs) {
        settings.blockTabJs = false;
        settings.blockedTabIds = [];
      }
      applyAllRules();
      saveSettings();
      sendResponse({ settings });
      break;

    case 'toggleBlockTabJs':
      settings.blockTabJs = message.enabled;
      settings.blockedTabIds = message.tabIds;
      if (settings.blockTabJs && settings.blockedTabIds.length > 0) {
        settings.blockAllJs = false;
      }
      applyAllRules();
      saveSettings();
      sendResponse({ settings });
      break;

    case 'toggleMonitoring':
      isMonitoring = message.enabled;
      saveSettings();
      sendResponse({ success: true });
      break;

    case 'clearLogs':
      monitoredRequests = [];
      saveSettings();
      sendResponse({ success: true });
      break;

    case 'getLogs':
      sendResponse(monitoredRequests);
      break;

    case 'addToBlockList':
      if (!settings.blockList) {
        settings.blockList = [];
      }
      if (!settings.blockList.some(item => item.pattern === message.url)) {
        settings.blockList.push({
          pattern: message.url,
          addedDate: new Date().toISOString()
        });
        saveSettings();
        applyAllRules().then(() => {
          sendResponse({ success: true });
        }).catch(error => {
          console.error('Error adding to block list:', error);
          sendResponse({ success: false, error: error.message });
        });
        asyncOperation = true;
      } else {
        sendResponse({ success: true });
      }
      break;

    case 'addToWhiteList':
      if (!settings.whiteList) {
        settings.whiteList = [];
      }
      if (!settings.whiteList.some(item => item.pattern === message.url)) {
        settings.whiteList.push({
          pattern: message.url,
          addedDate: new Date().toISOString()
        });
        applyAllRules();
        saveSettings();
      }
      sendResponse({ success: true });
      break;

    case 'removeFromBlockList':
      if (settings.blockList) {
        settings.blockList = settings.blockList.filter(item => item.pattern !== message.url);
        applyAllRules();
        saveSettings();
      }
      sendResponse({ success: true });
      break;

    case 'removeFromWhiteList':
      if (settings.whiteList) {
        settings.whiteList = settings.whiteList.filter(item => item.pattern !== message.url);
        applyAllRules();
        saveSettings();
      }
      sendResponse({ success: true });
      break;

    case 'addContentOverride':
      settings.contentOverrides.push(message.override);
      applyAllRules();
      sendResponse({ success: true });
      break;

    case 'removeContentOverride':
      settings.contentOverrides = settings.contentOverrides.filter(
        o => o.id !== message.ruleId
      );
      applyAllRules();
      sendResponse({ success: true });
      break;

    case 'getDynamicRules':
      chrome.declarativeNetRequest.getDynamicRules().then(rules => {
        const rulesWithMetadata = rules.map(rule => ({
          id: rule.id,
          active: true,
          priority: rule.priority,
          type: rule.condition.resourceTypes?.[0] || 'other',
          lastModified: new Date().toISOString(),
          details: rule // Store the full rule object for viewing
        }));
        sendResponse({ success: true, rules: rulesWithMetadata });
      });
      return true;

    case 'getSessionRules':
      chrome.declarativeNetRequest.getSessionRules().then(rules => {
        const rulesWithMetadata = rules.map(rule => ({
          id: rule.id,
          active: true,
          priority: rule.priority,
          type: rule.condition.resourceTypes?.[0] || 'other',
          lastModified: new Date().toISOString(),
          details: rule // Store the full rule object for viewing
        }));
        sendResponse({ success: true, rules: rulesWithMetadata });
      });
      return true;

    case 'deleteRule':
      // Try to delete from both dynamic and session rules
      Promise.all([
        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [message.ruleId]
        }).catch(() => {}),  // Ignore error if rule doesn't exist in dynamic rules
        chrome.declarativeNetRequest.updateSessionRules({
          removeRuleIds: [message.ruleId]
        }).catch(() => {})   // Ignore error if rule doesn't exist in session rules
      ]).then(() => {
        // Also remove from content overrides if it exists there
        settings.contentOverrides = settings.contentOverrides.filter(
          o => o.id !== message.ruleId
        );
        saveSettings();
        sendResponse({ success: true });
      });
      return true;

    case 'clearAllRules':
      try {
        // Get all current rules first
        Promise.all([
          chrome.declarativeNetRequest.getDynamicRules(),
          chrome.declarativeNetRequest.getSessionRules()
        ]).then(([dynamicRules, sessionRules]) => {
          const dynamicRuleIds = dynamicRules.map(rule => rule.id);
          const sessionRuleIds = sessionRules.map(rule => rule.id);
          
          // Remove all rules
          return Promise.all([
            chrome.declarativeNetRequest.updateDynamicRules({
              removeRuleIds: dynamicRuleIds
            }),
            chrome.declarativeNetRequest.updateSessionRules({
              removeRuleIds: sessionRuleIds
            })
          ]);
        }).then(() => {
          sendResponse({ success: true });
        }).catch(error => {
          console.error('Error clearing rules:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true;
      } catch (error) {
        console.error('Error clearing rules:', error);
        sendResponse({ success: false, error: error.message });
      }

    case 'createRule':
      try {
        // Create rule based on the rule type
        const updateFunction = message.ruleType === 'session' 
          ? chrome.declarativeNetRequest.updateSessionRules
          : chrome.declarativeNetRequest.updateDynamicRules;

        // Ensure the rule has the correct action type
        const rule = {
          ...message.rule,
          action: {
            type: message.rule.action.type // Keep the original action type
          }
        };

        // Add any additional action properties if they exist
        if (message.rule.action.redirect) {
          rule.action.redirect = message.rule.action.redirect;
        }
        if (message.rule.action.requestHeaders) {
          rule.action.requestHeaders = message.rule.action.requestHeaders;
        }
        if (message.rule.action.responseHeaders) {
          rule.action.responseHeaders = message.rule.action.responseHeaders;
        }

        console.log('Creating rule:', rule);
        
        updateFunction({
          addRules: [rule]
        }).then(() => {
          sendResponse({ success: true });
        }).catch(error => {
          console.error('Error creating rule:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true;
      } catch (error) {
        console.error('Error creating rule:', error);
        sendResponse({ success: false, error: error.message });
      }
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }
  return asyncOperation || true; // Keep the message channel open for async response
}); 