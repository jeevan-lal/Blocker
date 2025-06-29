// DOM Elements
const enableBlocker = document.getElementById('enableBlocker');
const blockAllJs = document.getElementById('blockAllJs');
const clearLogs = document.getElementById('clearLogs');
const blockUrlInput = document.getElementById('blockUrlInput');
const addBlockUrl = document.getElementById('addBlockUrl');
const blockList = document.getElementById('blockList');
const whiteUrlInput = document.getElementById('whiteUrlInput');
const addWhiteUrl = document.getElementById('addWhiteUrl');
const whiteList = document.getElementById('whiteList');
const overrideType = document.getElementById('overrideType');
const overrideUrl = document.getElementById('overrideUrl');
const overrideContent = document.getElementById('overrideContent');
const addOverride = document.getElementById('addOverride');
const overrideList = document.getElementById('overrideList');
const exportSettings = document.getElementById('exportSettings');
const importFile = document.getElementById('importFile');
const importSettings = document.getElementById('importSettings');
const extensionVersion = document.getElementById('extensionVersion');
const rateButton = document.getElementById('rateButton');

// DOM Elements for Content Override
const sourceType = document.getElementById('sourceType');
const uploadFileSection = document.getElementById('uploadFileSection');
const sourceUrlSection = document.getElementById('sourceUrlSection');
const fileInput = document.getElementById('fileInput');
const fileName = document.querySelector('.file-name');
const sourceUrl = document.getElementById('sourceUrl');
const overrideStatus = document.getElementById('overrideStatus');
const clearOverrideList = document.getElementById('clearOverrideList');
const blockLocations = document.getElementById('blockLocations');
const overridePriority = document.getElementById('overridePriority');

// DOM Elements
const viewOverrideModal = document.getElementById('viewOverrideModal');
const closeModalBtn = document.querySelector('.close-modal');

// Rules Management
const refreshRulesBtn = document.getElementById('refreshRules');
const createRuleBtn = document.getElementById('createRule');
const clearAllRulesBtn = document.getElementById('clearAllRules');
const rulesList = document.getElementById('rulesList');
const viewRuleModal = document.getElementById('viewRuleModal');
const ruleJsonContent = document.getElementById('ruleJsonContent');
const ruleModalStatusBadge = document.getElementById('ruleModalStatusBadge');

const refreshBlockList = document.getElementById('refreshBlockList');
const refreshWhiteList = document.getElementById('refreshWhiteList');

let settings = null;

// Create Rule Modal Elements
const createRuleModal = document.getElementById('createRuleModal');
const createRuleForm = document.getElementById('createRuleForm');
const actionType = document.getElementById('actionType');
const redirectOptions = document.getElementById('redirectOptions');
const headerOptions = document.getElementById('headerOptions');
const addRequestHeader = document.getElementById('addRequestHeader');
const addResponseHeader = document.getElementById('addResponseHeader');
const cancelCreateRule = document.getElementById('cancelCreateRule');

// Arrays to store dynamic parameters
let requestHeaders = [];
let responseHeaders = [];
let currentRules = []; // Store current rules for ID generation

// Initialize options page
async function initOptions() {
    try {
        // Get settings
        const response = await sendMessage({ action: 'getSettings' });
        
        // Initialize settings with default empty arrays if needed
        settings = {
            blockList: [],
            whiteList: [],
            contentOverrides: [],
            ...response.settings
        };

        // Ensure arrays exist
        if (!settings.blockList) settings.blockList = [];
        if (!settings.whiteList) settings.whiteList = [];
        if (!settings.contentOverrides) settings.contentOverrides = [];
        
        // Update UI with current settings
        updateUI();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize source type display
        handleSourceTypeChange();

        // Display extension version in both places
        const manifest = chrome.runtime.getManifest();
        extensionVersion.textContent = manifest.version;
        document.querySelector('.version').textContent = `v${manifest.version}`;

        // Setup rate button URL based on browser
        setupRateButton();

        // Apply rules to ensure they're created
        await sendMessage({ action: 'applyAllRules' });
    } catch (error) {
        console.error('Error initializing options:', error);
        showNotification('Error initializing options', true);
    }
}

// Setup event listeners
function setupEventListeners() {
    enableBlocker.addEventListener('change', toggleEnable);
    blockAllJs.addEventListener('change', toggleBlockAllJs);
    clearLogs.addEventListener('click', clearRequestLogs);
    addBlockUrl.addEventListener('click', addToBlockList);
    addWhiteUrl.addEventListener('click', addToWhiteList);
    addOverride.addEventListener('click', addContentOverride);
    exportSettings.addEventListener('click', exportSettingsToFile);
    importSettings.addEventListener('click', importSettingsFromFile);
    document.getElementById('clearBlockList').addEventListener('click', clearBlockList);
    document.getElementById('clearWhiteList').addEventListener('click', clearWhiteList);
    clearOverrideList.addEventListener('click', clearAllOverrides);
    refreshBlockList.addEventListener('click', refreshBlockListItems);
    refreshWhiteList.addEventListener('click', refreshWhiteListItems);
    
    // Content Override event listeners
    sourceType.addEventListener('change', handleSourceTypeChange);
    fileInput.addEventListener('change', handleFileSelection);
    setupTabNavigation();

    // Rules Management event listeners
    refreshRulesBtn.addEventListener('click', loadRules);
    createRuleBtn.addEventListener('click', showCreateRuleModal);
    clearAllRulesBtn.addEventListener('click', clearAllRules);
    viewRuleModal.querySelector('.close-modal').addEventListener('click', () => {
        viewRuleModal.style.display = 'none';
    });

    // Rate button click handler
    rateButton.addEventListener('click', handleRateButtonClick);
}

// Helper function to send messages to background script
function sendMessage(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
            resolve(response);
        });
    });
}

// Update UI with current settings
function updateUI() {
    enableBlocker.checked = settings.enabled;
    blockAllJs.checked = settings.blockAllJs;
    
    // Update block list
    updateBlockList();
    
    // Update white list
    updateWhiteList();
    
    // Update override list
    updateOverrideList();
}

// Toggle blocker enable/disable
async function toggleEnable() {
    try {
        const response = await sendMessage({
            action: 'toggleEnable',
            enabled: enableBlocker.checked
        });
        
        if (response && response.settings) {
            settings = response.settings;
            showNotification(`Blocker ${settings.enabled ? 'enabled' : 'disabled'}`);
        } else {
            // If the response is not successful, revert the checkbox state
            enableBlocker.checked = !enableBlocker.checked;
            showNotification('Failed to update settings', true);
        }
    } catch (error) {
        console.error('Error toggling blocker:', error);
        // Revert the checkbox state on error
        enableBlocker.checked = !enableBlocker.checked;
        showNotification('Error toggling blocker', true);
    }
}

// Toggle block all JavaScript
async function toggleBlockAllJs() {
    settings.blockAllJs = blockAllJs.checked;
    await sendMessage({
        action: 'toggleBlockAllJs',
        enabled: settings.blockAllJs
    });
}

// Clear request logs
async function clearRequestLogs() {
    await sendMessage({ action: 'clearLogs' });
    showNotification('Request logs cleared');
}

// Add URLs to block list
async function addToBlockList() {
    try {
        const urlsText = blockUrlInput.value.trim();
        if (!urlsText) return;

        // Ensure blockList exists
        if (!settings.blockList) {
            settings.blockList = [];
        }

        const urls = urlsText.split(',').map(url => url.trim()).filter(url => url);
        if (urls.length === 0) return;

        let addedCount = 0;
        let duplicateUrls = [];

        for (const url of urls) {
            // Check if URL already exists in block list
            if (settings.blockList.some(item => item.pattern === url)) {
                duplicateUrls.push(url);
                continue;
            }

            const response = await sendMessage({
                action: 'addToBlockList',
                url
            });
            
            if (response && response.success) {
                settings.blockList.push({
                    pattern: url,
                    addedDate: new Date().toISOString()
                });
                addedCount++;
            }
        }

        // Ensure rules are created
        await sendMessage({ action: 'applyAllRules' });

        updateBlockList();
        
        if (duplicateUrls.length > 0) {
            const duplicateList = duplicateUrls.join(', ');
            showNotification(`The following URLs are already in the block list`, true);
        } else if (addedCount > 0) {
            showNotification(`Added ${addedCount} URL${addedCount > 1 ? 's' : ''} to block list`);
            blockUrlInput.value = '';
        }
    } catch (error) {
        console.error('Error adding to block list:', error);
        showNotification('Error adding to block list', true);
    }
}

// Add URLs to white list
async function addToWhiteList() {
    try {
        const urlsText = whiteUrlInput.value.trim();
        if (!urlsText) return;

        // Ensure whiteList exists
        if (!settings.whiteList) {
            settings.whiteList = [];
        }

        const urls = urlsText.split(',').map(url => url.trim()).filter(url => url);
        if (urls.length === 0) return;

        let addedCount = 0;
        let duplicateUrls = [];

        for (const url of urls) {
            // Check if URL already exists in white list
            if (settings.whiteList.some(item => item.pattern === url)) {
                duplicateUrls.push(url);
                continue;
            }

            const response = await sendMessage({
                action: 'addToWhiteList',
                url
            });
            
            if (response && response.success) {
                settings.whiteList.push({
                    pattern: url,
                    addedDate: new Date().toISOString()
                });
                addedCount++;
            }
        }

        // Ensure rules are created
        await sendMessage({ action: 'applyAllRules' });

        updateWhiteList();
        
        if (duplicateUrls.length > 0) {
            showNotification(`The following URLs are already in the white list`, true);
        } else if (addedCount > 0) {
            showNotification(`Added ${addedCount} URL${addedCount > 1 ? 's' : ''} to white list`);
            whiteUrlInput.value = '';
        }
    } catch (error) {
        console.error('Error adding to white list:', error);
        showNotification('Error adding to white list', true);
    }
}

// Helper function to get content type
function getContentType(type) {
    switch (type) {
        case 'script':
            return 'text/javascript';
        case 'stylesheet':
            return 'text/css';
        case 'image':
            return 'image/*';
        case 'font':
            return 'application/font-woff';
        case 'media':
            return 'video/*';
        case 'websocket':
            return 'application/octet-stream';
        case 'other':
            return 'application/octet-stream';
        default:
            return 'text/plain';
    }
}

// Read file content
function readFileContent(file, type) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        
        // Use readAsDataURL for binary files
        if (['image', 'font', 'media', 'websocket', 'other'].includes(type)) {
            reader.readAsDataURL(file);
        } else {
            // For text-based files (script, stylesheet), use readAsText
            reader.readAsText(file);
        }
    });
}

// Handle source type change
function handleSourceTypeChange() {
    const isUpload = sourceType.value === 'upload';
    uploadFileSection.style.display = isUpload ? 'block' : 'none';
    if (isUpload) {
        sourceUrlSection.classList.remove('visible');
    } else {
        sourceUrlSection.classList.add('visible');
    }
    
    // Reset values
    if (isUpload) {
        sourceUrl.value = '';
        sourceUrl.removeAttribute('data-content');
    } else {
        fileInput.value = '';
        fileName.textContent = 'No file chosen';
    }
}

// Handle file selection
function handleFileSelection(e) {
    const file = e.target.files[0];
    if (file) {
        fileName.textContent = file.name;
        const type = overrideType.value;
        readFileContent(file, type).then(content => {
            // For binary files, content is already in data URL format
            // For text files, we need to encode it properly
            if (['script', 'stylesheet'].includes(type)) {
                const mimeType = getContentType(type);
                const encodedContent = btoa(content);
                content = `data:${mimeType};base64,${encodedContent}`;
            }
            fileInput.setAttribute('data-content', content);
        }).catch(error => {
            showNotification('Error reading file', true);
            console.error('File read error:', error);
        });
    } else {
        fileName.textContent = 'No file chosen';
    }
}

// Add content override
async function addContentOverride() {
    const type = overrideType.value;
    const urlPattern = overrideUrl.value.trim();
    const enabled = overrideStatus.checked;
    const priority = parseInt(overridePriority.value) || 0;
    
    if (!urlPattern) {
        showNotification('Please fill in the URL pattern', true);
        return;
    }

    // Get selected block locations
    const selectedLocations = Array.from(blockLocations.selectedOptions).map(option => option.value);
    if (selectedLocations.length === 0) {
        showNotification('Please select at least one location to block from', true);
        return;
    }

    let content, source;
    if (sourceType.value === 'upload') {
        if (!fileInput.files[0]) {
            showNotification('Please select a file to upload', true);
            return;
        }
        source = fileInput.files[0].name;
        content = fileInput.getAttribute('data-content');
    } else {
        source = sourceUrl.value.trim();
        if (!source) {
            showNotification('Please enter the source URL', true);
            return;
        }
        content = source;
    }

    const override = {
        id: 5000 + (settings.contentOverrides?.length || 0),
        type,
        urlPattern,
        source,
        content,
        enabled,
        blockLocations: selectedLocations,
        priority,
        addedDate: new Date().toISOString(),
        sourceType: sourceType.value
    };

    await sendMessage({
        action: 'addContentOverride',
        override
    });

    if (!settings.contentOverrides) {
        settings.contentOverrides = [];
    }
    settings.contentOverrides.push(override);
    
    updateOverrideList();
    resetOverrideForm();
    showNotification('Content override added');
}

// Reset override form
function resetOverrideForm() {
    fileInput.value = '';
    fileName.textContent = 'No file chosen';
    handleSourceTypeChange();
}

// Update block list UI
function updateBlockList() {
    blockList.innerHTML = '';
    if (!settings.blockList || settings.blockList.length === 0) {
        const noDataMessage = document.createElement('tr');
        noDataMessage.innerHTML = `
            <td colspan="3" class="no-data-message">
                <i class="fas fa-ban"></i>
                <p>No URLs have been blocked yet.</p>
            </td>
        `;
        blockList.appendChild(noDataMessage);
        document.getElementById('blockListCount').textContent = '0 items';
        return;
    }

    settings.blockList.forEach(item => {
        const row = document.createElement('tr');
        const date = new Date(item.addedDate).toLocaleDateString();
        row.innerHTML = `
            <td class="actions">
                <button class="delete-btn" data-url="${item.pattern}">Delete</button>
            </td>
            <td class="url-pattern">${item.pattern}</td>
            <td class="date">${date}</td>
        `;
        
        // Add event listener to delete button
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => removeFromBlockList(item.pattern));
        
        blockList.appendChild(row);
    });
    
    // Update counter
    document.getElementById('blockListCount').textContent = `${settings.blockList.length} items`;
}

// Update white list UI
function updateWhiteList() {
    whiteList.innerHTML = '';
    if (!settings.whiteList || settings.whiteList.length === 0) {
        const noDataMessage = document.createElement('tr');
        noDataMessage.innerHTML = `
            <td colspan="3" class="no-data-message">
                <i class="fas fa-check-circle"></i>
                <p>No URLs have been whitelisted yet.</p>
            </td>
        `;
        whiteList.appendChild(noDataMessage);
        document.getElementById('whiteListCount').textContent = '0 items';
        return;
    }

    settings.whiteList.forEach(item => {
        const row = document.createElement('tr');
        const date = new Date(item.addedDate).toLocaleDateString();
        row.innerHTML = `
            <td class="actions">
                <button class="delete-btn" data-url="${item.pattern}">Delete</button>
            </td>
            <td class="url-pattern">${item.pattern}</td>
            <td class="date">${date}</td>
        `;
        
        // Add event listener to delete button
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => removeFromWhiteList(item.pattern));
        
        whiteList.appendChild(row);
    });
    
    // Update counter
    document.getElementById('whiteListCount').textContent = `${settings.whiteList.length} items`;
}

// Format date for display
function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
}

// Show content preview based on type
function showContentPreview(content, type) {
    const previewElement = document.getElementById('modalContentPreview');
    previewElement.innerHTML = '';
    
    if (type === 'Image') {
        if (content.startsWith('data:image')) {
            const img = document.createElement('img');
            img.src = content;
            img.alt = 'Image preview';
            previewElement.appendChild(img);
        } else {
            previewElement.textContent = 'Image data not in correct format';
        }
    } else {
        // For text-based content, show the first 2000 characters
        const truncatedContent = content.length > 2000 ? content.substring(0, 2000) + '...' : content;
        const pre = document.createElement('pre');
        pre.textContent = truncatedContent;
        previewElement.appendChild(pre);
    }
}

// Helper function to get resource type display name
function getResourceTypeDisplay(value) {
    const option = document.querySelector(`#overrideType option[value="${value}"]`);
    return option ? option.textContent : value;
}

// View override details
function viewOverrideDetails(override) {
    document.getElementById('modalUrlPattern').textContent = override.urlPattern;
    document.getElementById('modalResourceType').textContent = getResourceTypeDisplay(override.type);
    document.getElementById('modalSource').textContent = override.source;
    document.getElementById('modalSource').title = `Source Type: ${override.sourceType === 'upload' ? 'File Upload' : 'URL'}`;
    document.getElementById('modalPriority').textContent = override.priority || '0';
    
    const statusBadge = document.getElementById('modalStatusBadge');
    statusBadge.textContent = override.enabled ? 'Enabled' : 'Disabled';
    statusBadge.className = `status-badge ${override.enabled ? 'enabled' : 'disabled'}`;
    
    document.getElementById('modalAddedDate').textContent = formatDate(override.addedDate);

    // Display block locations
    const blockLocationsText = override.blockLocations ? 
        override.blockLocations.map(loc => {
            switch(loc) {
                case 'main_frame': return 'Top-Level Pages';
                case 'sub_frame': return '3rd-Party Embeds';
                case 'xmlhttprequest': return 'Data Requests';
                default: return loc;
            }
        }).join(', ') : 'Not specified';

    document.getElementById('modalBlockLocations').textContent = blockLocationsText;
    
    showContentPreview(override.content, override.type);
    viewOverrideModal.style.display = 'block';
}

// Close modal when clicking the close button or outside the modal
closeModalBtn.addEventListener('click', () => {
    viewOverrideModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === viewOverrideModal) {
        viewOverrideModal.style.display = 'none';
    }
});

// Toggle override status
async function toggleOverrideStatus(ruleId, enabled) {
    const override = settings.contentOverrides.find(
        o => o.id === ruleId
    );
    
    if (override) {
        override.enabled = enabled;
        await sendMessage({
            action: 'updateSettings',
            settings
        });
        showNotification(`Override ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Update override list UI
function updateOverrideList() {
    overrideList.innerHTML = '';
    if (!settings.contentOverrides || settings.contentOverrides.length === 0) {
        const noDataMessage = document.createElement('tr');
        noDataMessage.innerHTML = `
            <td colspan="7" class="no-data-message">
                <i class="fas fa-code"></i>
                <p>No content overrides have been created yet.</p>
            </td>
        `;
        overrideList.appendChild(noDataMessage);
        document.getElementById('overrideListCount').textContent = '0 items';
        return;
    }

    // Sort overrides by priority (highest first)
    const sortedOverrides = [...settings.contentOverrides].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    sortedOverrides.forEach(override => {
        const row = document.createElement('tr');
        const blockLocationsText = override.blockLocations ? 
            override.blockLocations.map(loc => {
                switch(loc) {
                    case 'main_frame': return 'Top-Level Pages';
                    case 'sub_frame': return '3rd-Party Embeds';
                    case 'xmlhttprequest': return 'Data Requests';
                    default: return loc;
                }
            }).join(', ') : 'Not specified';

        row.innerHTML = `
            <td class="status-cell">
                <label class="toggle-switch">
                    <input type="checkbox" class="status-toggle" 
                           ${override.enabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </td>
            <td class="actions">
                <div class="table-actions">
                    <button class="view-btn" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="delete-btn" title="Delete Override">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
            <td class="url-pattern" title="${override.urlPattern}">${override.urlPattern}</td>
            <td class="resource-type">${getResourceTypeDisplay(override.type)}</td>
            <td class="source" title="${override.source}">${override.source}</td>
            <td class="block-locations" title="${blockLocationsText}">${blockLocationsText}</td>
            <td class="priority">${override.priority || '0'}</td>
        `;

        // Add event listeners...
        const statusToggle = row.querySelector('.status-toggle');
        statusToggle.addEventListener('change', (e) => {
            toggleOverrideStatus(override.id, e.target.checked);
        });

        const viewBtn = row.querySelector('.view-btn');
        viewBtn.addEventListener('click', () => {
            viewOverrideDetails(override);
        });

        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this override?')) {
                removeContentOverride(override.id);
            }
        });

        overrideList.appendChild(row);
    });
    
    // Update counter
    document.getElementById('overrideListCount').textContent = 
        `${settings.contentOverrides ? settings.contentOverrides.length : 0} items`;
}

// Edit content override
function editContentOverride(ruleId) {
    const override = settings.contentOverrides.find(o => o.id === ruleId);
    if (!override) return;

    overrideUrl.value = override.urlPattern;
    overrideType.value = override.type;
    sourceUrl.value = override.source;
    overrideStatus.checked = override.enabled;
    overridePriority.value = override.priority || '0';
    
    // Set block locations
    if (override.blockLocations) {
        Array.from(blockLocations.options).forEach(option => {
            option.selected = override.blockLocations.includes(option.value);
        });
    }
    
    if (override.content) {
        sourceUrl.setAttribute('data-content', override.content);
    }
    
    // Remove the old override
    removeContentOverride(ruleId, false);
    
    // Scroll to form
    document.querySelector('.override-container').scrollIntoView({ behavior: 'smooth' });
}

// Clear all overrides
async function clearAllOverrides() {
    if (!confirm('Are you sure you want to delete all content overrides?')) return;
    
    await sendMessage({
        action: 'clearContentOverrides'
    });
    
    if (!settings.contentOverrides) {
        settings.contentOverrides = [];
    }
    settings.contentOverrides = [];
    await sendMessage({
        action: 'updateSettings',
        settings
    });
    
    updateOverrideList();
    showNotification('All content overrides have been removed');
}

// Remove content override
async function removeContentOverride(ruleId, showMessage = true) {
    await sendMessage({
        action: 'removeContentOverride',
        ruleId
    });
    
    if (!settings.contentOverrides) {
        settings.contentOverrides = [];
        return;
    }
    
    settings.contentOverrides = settings.contentOverrides.filter(
        o => o.id !== ruleId
    );
    
    await sendMessage({
        action: 'updateSettings',
        settings
    });
    
    updateOverrideList();
    if (showMessage) {
        showNotification('Content override removed');
    }
}

// Remove URL from block list
async function removeFromBlockList(pattern) {
    try {
        const response = await sendMessage({
            action: 'removeFromBlockList',
            url: pattern
        });

        if (response && response.success) {
            settings.blockList = settings.blockList.filter(item => item.pattern !== pattern);
            
            // Ensure rules are updated
            await sendMessage({ action: 'applyAllRules' });
            
            updateBlockList();
            showNotification('URL removed from block list');
        } else {
            showNotification('Failed to remove URL from block list', true);
        }
    } catch (error) {
        console.error('Error removing from block list:', error);
        showNotification('Error removing from block list', true);
    }
}

// Remove URL from white list
async function removeFromWhiteList(pattern) {
    await sendMessage({
        action: 'removeFromWhiteList',
        url: pattern
    });
    settings.whiteList = settings.whiteList.filter(item => item.pattern !== pattern);
    updateWhiteList();
    showNotification('URL removed from white list');
}

// Export settings to file
function exportSettingsToFile() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blocker-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Settings exported');
}

// Import settings from file
function importSettingsFromFile() {
    const file = importFile.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const newSettings = JSON.parse(e.target.result);
            await sendMessage({
                action: 'updateSettings',
                settings: newSettings
            });
            settings = newSettings;
            updateUI();
            showNotification('Settings imported successfully');
        } catch (error) {
            showNotification('Error importing settings', true);
        }
    };
    reader.readAsText(file);
}

// Helper function to truncate content
function truncateContent(content) {
    const maxLength = 50;
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
}

// Show notification
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Initialize options when DOM is loaded
document.addEventListener('DOMContentLoaded', initOptions);

// Make functions available globally for onclick handlers
window.removeFromBlockList = removeFromBlockList;
window.removeFromWhiteList = removeFromWhiteList;
window.removeContentOverride = removeContentOverride;
window.clearAllOverrides = clearAllOverrides;

// Setup tab navigation
function setupTabNavigation() {
    const navButtons = document.querySelectorAll('.nav-button');
    const sections = document.querySelectorAll('.section-content');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSection = button.getAttribute('data-section');

            // Update active states
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetSection) {
                    section.classList.add('active');
                    // Initialize section if needed
                    if (targetSection === 'rules') {
                        loadRules();
                    }
                }
            });
        });
    });
}

// Clear all block list items
async function clearBlockList() {
    if (confirm('Are you sure you want to delete all blocked URLs?')) {
        try {
            // Create a copy of settings with an empty block list
            const updatedSettings = {
                ...settings,
                blockList: []
            };
            
            // Update settings in background script
            const response = await sendMessage({
                action: 'updateSettings',
                settings: updatedSettings
            });

            if (response && response.success) {
                settings = response.settings;
                updateBlockList();
                showNotification('All blocked URLs have been removed');
            } else {
                throw new Error(response.error || 'Failed to update settings');
            }
        } catch (error) {
            console.error('Error clearing block list:', error);
            showNotification('Error clearing block list: ' + error.message, true);
        }
    }
}

// Clear all white list items
async function clearWhiteList() {
    if (confirm('Are you sure you want to delete all whitelisted URLs?')) {
        try {
            // Create a copy of settings with an empty white list
            const updatedSettings = {
                ...settings,
                whiteList: []
            };
            
            // Update settings in background script
            const response = await sendMessage({
                action: 'updateSettings',
                settings: updatedSettings
            });

            if (response && response.success) {
                settings = response.settings;
                updateWhiteList();
                showNotification('All whitelisted URLs have been removed');
            } else {
                throw new Error(response.error || 'Failed to update settings');
            }
        } catch (error) {
            console.error('Error clearing white list:', error);
            showNotification('Error clearing white list: ' + error.message, true);
        }
    }
}

// Load and display rules
async function loadRules() {
    try {
        // Get both dynamic and session rules
        const [dynamicResponse, sessionResponse] = await Promise.all([
            sendMessage({ action: 'getDynamicRules' }),
            sendMessage({ action: 'getSessionRules' })
        ]);

        let allRules = [];
        
        if (dynamicResponse && dynamicResponse.success) {
            allRules = allRules.concat(dynamicResponse.rules.map(rule => ({
                ...rule,
                ruleType: 'Dynamic'
            })));
        }
        
        if (sessionResponse && sessionResponse.success) {
            allRules = allRules.concat(sessionResponse.rules.map(rule => ({
                ...rule,
                ruleType: 'Session'
            })));
        }

        displayRules(allRules);
    } catch (error) {
        console.error('Error loading rules:', error);
        // Show error message in the table
        const tableContainer = document.querySelector('.rules-table-container');
        tableContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                Failed to load rules. Please try again.
            </div>
        `;
    }
}

// Helper function to get action type icon and class
function getActionTypeDetails(actionType) {
    switch (actionType) {
        case 'block':
            return { icon: 'fa-ban', class: 'block' };
        case 'allow':
            return { icon: 'fa-check-circle', class: 'allow' };
        case 'redirect':
            return { icon: 'fa-exchange-alt', class: 'redirect' };
        case 'upgradeScheme':
            return { icon: 'fa-lock', class: 'upgradeScheme' };
        case 'modifyHeaders':
            return { icon: 'fa-edit', class: 'modifyHeaders' };
        default:
            return { icon: 'fa-question-circle', class: '' };
    }
}

// Display rules in the table
function displayRules(rules) {
    const tableContainer = document.querySelector('.rules-table-container');
    
    if (!rules || rules.length === 0) {
        const noRulesMessage = document.createElement('div');
        noRulesMessage.className = 'no-rules-message';
        noRulesMessage.innerHTML = `
            <i class="fas fa-shield-alt"></i>
            <p>No rules have been created yet.</p>
        `;
        tableContainer.innerHTML = '';
        tableContainer.appendChild(noRulesMessage);
        return;
    }

    // Show table and populate data
    tableContainer.innerHTML = `
        <table class="url-table">
            <thead>
                <tr>
                    <th>Actions</th>
                    <th>Rule ID</th>
                    <th>Priority</th>
                    <th>Rule Type</th>
                    <th>Resource Type</th>
                    <th>Action Type</th>
                    <th>URL Filter</th>
                    <th>Last Modified</th>
                </tr>
            </thead>
            <tbody id="rulesList"></tbody>
        </table>
    `;

    const rulesList = document.getElementById('rulesList');
    rulesList.innerHTML = '';
    
    rules.forEach(rule => {
        const actionType = rule.details?.action?.type || rule.action?.type || 'N/A';
        const actionDetails = getActionTypeDetails(actionType);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="rule-actions">
                    <button class="view-rule" title="View Rule Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="danger-btn" title="Delete Rule">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
            <td>${rule.id}</td>
            <td>${rule.priority || 1}</td>
            <td class="rule-type ${rule.ruleType?.toLowerCase() || 'dynamic'}">${rule.ruleType || 'Dynamic'}</td>
            <td>${rule.type || 'N/A'}</td>
            <td>
                <span class="action-type-tag ${actionDetails.class}">
                    <i class="fas ${actionDetails.icon}"></i>
                    ${actionType}
                </span>
            </td>
            <td class="url-filter">${rule.details?.condition?.urlFilter || rule.condition?.urlFilter || 'All URLs'}</td>
            <td>${new Date(rule.lastModified || Date.now()).toLocaleString()}</td>
        `;

        // Add event listeners for rule actions
        row.querySelector('.view-rule').addEventListener('click', () => showRuleDetails(rule));
        row.querySelector('.danger-btn').addEventListener('click', () => deleteRule(rule.id));

        rulesList.appendChild(row);
    });
}

// Show rule details in modal
function showRuleDetails(rule) {
    ruleJsonContent.textContent = JSON.stringify(rule, null, 2);
    ruleModalStatusBadge.textContent = rule.active ? 'Active' : 'Inactive';
    ruleModalStatusBadge.className = `status-badge ${rule.active ? 'active' : 'inactive'}`;
    viewRuleModal.style.display = 'block';
}

// Delete a rule
async function deleteRule(ruleId) {
    if (confirm('Are you sure you want to delete this rule?')) {
        try {
            await sendMessage({
                action: 'deleteRule',
                ruleId: ruleId
            });
            loadRules(); // Refresh the rules list
        } catch (error) {
            console.error('Error deleting rule:', error);
        }
    }
}

// Show Create Rule Modal
async function showCreateRuleModal() {
    createRuleModal.style.display = 'block';
    
    // Get current rules for ID generation
    try {
        const [dynamicResponse, sessionResponse] = await Promise.all([
            sendMessage({ action: 'getDynamicRules' }),
            sendMessage({ action: 'getSessionRules' })
        ]);

        // Combine both dynamic and session rules
        currentRules = [
            ...(dynamicResponse?.rules || []),
            ...(sessionResponse?.rules || [])
        ];
    } catch (error) {
        console.error('Error getting rules:', error);
        currentRules = [];
    }
    
    resetCreateRuleForm();
}

// Reset Create Rule Form
function resetCreateRuleForm() {
    // Helper function to safely set value/checked state
    const safeSetValue = (elementId, value, property = 'value') => {
        const element = document.getElementById(elementId);
        if (element) {
            element[property] = value;
        }
    };

    // Helper function to safely set selectedIndex
    const safeSetSelectedIndex = (elementId, value) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.selectedIndex = value;
        }
    };

    // Reset main form fields
    safeSetValue('ruleType', 'dynamic'); // Set default rule type to dynamic
    if (actionType) actionType.value = 'block';
    safeSetValue('rulePriority', '1');
    safeSetValue('urlFilter', '');
    safeSetValue('regexFilter', '');
    safeSetValue('isUrlFilterCaseSensitive', false, 'checked');
    safeSetSelectedIndex('resourceTypes', -1);
    safeSetSelectedIndex('excludedResourceTypes', -1);
    safeSetValue('domains', '');
    safeSetValue('excludedDomains', '');
    safeSetValue('initiatorDomains', '');
    safeSetValue('excludedInitiatorDomains', '');
    safeSetValue('domainType', '');
    
    // Reset dynamic fields
    requestHeaders = [];
    responseHeaders = [];
    
    // Only call these functions if they exist
    if (typeof handleActionTypeChange === 'function') {
        handleActionTypeChange();
    }
}

// Generate new rule ID
function generateRuleId() {
    // Start with base ID
    let baseId = 7000;
    
    // Get all existing IDs
    const existingIds = new Set(currentRules.map(rule => rule.id));
    
    // Find the next available ID
    while (existingIds.has(baseId)) {
        baseId++;
    }
    
    return baseId;
}

// Handle Action Type Change
function handleActionTypeChange() {
    const selectedAction = actionType.value;
    redirectOptions.style.display = selectedAction === 'redirect' ? 'block' : 'none';
    headerOptions.style.display = selectedAction === 'modifyHeaders' ? 'block' : 'none';
}

// Add Request Header
function handleAddRequestHeader() {
    const name = document.getElementById('requestHeaderName').value.trim();
    const operation = document.getElementById('requestHeaderOperation').value;
    const value = document.getElementById('requestHeaderValue').value.trim();
    
    if (name && (operation === 'remove' || value)) {
        requestHeaders.push({ header: name, operation, value });
        document.getElementById('requestHeaderName').value = '';
        document.getElementById('requestHeaderValue').value = '';
    }
}

// Add Response Header
function handleAddResponseHeader() {
    const name = document.getElementById('responseHeaderName').value.trim();
    const operation = document.getElementById('responseHeaderOperation').value;
    const value = document.getElementById('responseHeaderValue').value.trim();
    
    if (name && (operation === 'remove' || value)) {
        responseHeaders.push({ header: name, operation, value });
        document.getElementById('responseHeaderName').value = '';
        document.getElementById('responseHeaderValue').value = '';
    }
}

// Handle Form Submit
async function handleCreateRuleSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(createRuleForm);
    
    // Debug form data
    console.log('Form Data:');
    for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
    }

    // Helper function to safely get and split form values
    const getSplitFormValue = (key) => {
        const value = formData.get(key);
        return value ? value.split('\n').map(d => d.trim()).filter(Boolean) : [];
    };

    // Helper function to safely get form value
    const getFormValue = (key, defaultValue = '') => {
        const value = formData.get(key);
        console.log(`Getting form value for ${key}:`, value); // Debug each form value
        return value !== null ? value : defaultValue;
    };

    // Helper function to get array field only if it has values
    const getArrayFieldIfNotEmpty = (array) => {
        return array.length > 0 ? array : undefined;
    };

    // Get URL filter value directly from the input element as backup
    const urlFilterValue = formData.get('urlFilter') || document.getElementById('urlFilter')?.value || '';

    const rule = {
        id: generateRuleId(),
        priority: parseInt(getFormValue('rulePriority', '1')) || 1,
        action: {
            type: getFormValue('actionType')
        },
        condition: {
            urlFilter: urlFilterValue,
            regexFilter: getFormValue('regexFilter') || undefined,
            isUrlFilterCaseSensitive: getFormValue('isUrlFilterCaseSensitive') === 'on',
            resourceTypes: Array.from(document.getElementById('resourceTypes')?.selectedOptions || []).map(opt => opt.value),
            excludedResourceTypes: getArrayFieldIfNotEmpty(Array.from(document.getElementById('excludedResourceTypes')?.selectedOptions || []).map(opt => opt.value))
        }
    };

    // Remove undefined values from condition, but keep urlFilter
    Object.keys(rule.condition).forEach(key => {
        if (key !== 'urlFilter' && (rule.condition[key] === undefined || rule.condition[key] === '')) {
            delete rule.condition[key];
        }
    });

    // Add redirect options if action type is redirect
    if (rule.action.type === 'redirect') {
        rule.action.redirect = {
            url: getFormValue('redirectUrl') || undefined,
            extensionPath: getFormValue('redirectExtensionPath') || undefined
        };
    }

    // Add header modifications if action type is modifyHeaders
    if (rule.action.type === 'modifyHeaders') {
        if (requestHeaders.length > 0) {
            rule.action.requestHeaders = requestHeaders;
        }
        if (responseHeaders.length > 0) {
            rule.action.responseHeaders = responseHeaders;
        }
    }

    console.log('Created rule:', rule); // Debug the final rule object

    try {
        const ruleType = getFormValue('ruleType', 'dynamic');
        console.log('Creating rule with action type:', rule.action.type); // Add logging
        const response = await sendMessage({
            action: 'createRule',
            rule,
            ruleType
        });

        if (response && response.success) {
            showNotification(`${ruleType === 'dynamic' ? 'Dynamic' : 'Session'} rule created successfully`);
            createRuleModal.style.display = 'none';
            loadRules(); // Refresh the rules list
        } else {
            showNotification('Failed to create rule: ' + (response?.error || 'Unknown error'), true);
        }
    } catch (error) {
        console.error('Error creating rule:', error);
        showNotification('Error creating rule: ' + error.message, true);
    }
}

// Event Listeners for Create Rule Modal
actionType.addEventListener('change', handleActionTypeChange);
addRequestHeader.addEventListener('click', handleAddRequestHeader);
addResponseHeader.addEventListener('click', handleAddResponseHeader);
createRuleForm.addEventListener('submit', handleCreateRuleSubmit);

// Add event listeners for all close buttons
document.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', (event) => {
        // Find the closest parent modal
        const modal = event.target.closest('.modal');
        if (modal) {
            modal.style.display = 'none';
        }
    });
});

cancelCreateRule.addEventListener('click', closeCreateRuleModal);

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

// Refresh block list items
async function refreshBlockListItems() {
    try {
        // Add spinning animation to the refresh icon
        const refreshIcon = refreshBlockList.querySelector('i');
        refreshIcon.classList.add('spinning');
        refreshBlockList.disabled = true;

        // Get fresh settings
        const response = await sendMessage({ action: 'getSettings' });
        if (response && response.settings) {
            settings = response.settings;
            
            // Ensure arrays exist
            if (!settings.blockList) settings.blockList = [];
            
            // Update UI
            updateBlockList();
            showNotification('Block list refreshed');
        } else {
            showNotification('Failed to refresh block list', true);
        }
    } catch (error) {
        console.error('Error refreshing block list:', error);
        showNotification('Error refreshing block list', true);
    } finally {
        // Remove spinning animation
        const refreshIcon = refreshBlockList.querySelector('i');
        refreshIcon.classList.remove('spinning');
        refreshBlockList.disabled = false;
    }
}

// Refresh white list items
async function refreshWhiteListItems() {
    try {
        // Add spinning animation to the refresh icon
        const refreshIcon = refreshWhiteList.querySelector('i');
        refreshIcon.classList.add('spinning');
        refreshWhiteList.disabled = true;

        // Get fresh settings
        const response = await sendMessage({ action: 'getSettings' });
        if (response && response.settings) {
            settings = response.settings;
            
            // Ensure arrays exist
            if (!settings.whiteList) settings.whiteList = [];
            
            // Update UI
            updateWhiteList();
            showNotification('White list refreshed');
        } else {
            showNotification('Failed to refresh white list', true);
        }
    } catch (error) {
        console.error('Error refreshing white list:', error);
        showNotification('Error refreshing white list', true);
    } finally {
        // Remove spinning animation
        const refreshIcon = refreshWhiteList.querySelector('i');
        refreshIcon.classList.remove('spinning');
        refreshWhiteList.disabled = false;
    }
}

// Setup rate button based on browser
function setupRateButton() {
    // Detect browser and set appropriate store URL
    const isFirefox = navigator.userAgent.includes('Firefox');
    const isEdge = navigator.userAgent.includes('Edg');
    
    if (isFirefox) {
        rateButton.setAttribute('data-store-url', 'https://addons.mozilla.org/firefox/addon/blocker/');
    } else if (isEdge) {
        rateButton.setAttribute('data-store-url', 'https://microsoftedge.microsoft.com/addons/detail/blocker/');
    } else {
        // Default to Chrome Web Store
        rateButton.setAttribute('data-store-url', 'https://chrome.google.com/webstore/detail/blocker/');
    }
}

// Handle rate button click
function handleRateButtonClick() {
    const storeUrl = rateButton.getAttribute('data-store-url');
    if (storeUrl) {
        window.open(storeUrl, '_blank');
    }
}

// Function to close the create rule modal
function closeCreateRuleModal() {
    createRuleModal.style.display = 'none';
    resetCreateRuleForm();
}

// Clear all rules
async function clearAllRules() {
    if (confirm('Are you sure you want to delete all rules? This cannot be undone.')) {
        try {
            console.log('Attempting to clear all rules...');
            const response = await sendMessage({
                action: 'clearAllRules'
            });
            console.log('Clear all rules response:', response);

            if (response && response.success) {
                showNotification('All rules deleted successfully');
                currentRules = []; // Clear the local rules array
                loadRules(); // Refresh the rules list
            } else {
                showNotification('Failed to delete all rules: ' + (response?.error || 'Unknown error'), true);
            }
        } catch (error) {
            console.error('Error clearing rules:', error);
            showNotification('Error clearing rules: ' + error.message, true);
        }
    }
} 