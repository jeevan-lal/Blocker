// DOM Elements
const clearLogsBtn = document.getElementById('clearLogs');
const openOptionsBtn = document.getElementById('openOptions');
const reloadTabBtn = document.getElementById('reloadTab');
const blockJsBtn = document.getElementById('blockJs');
const blockTabJsBtn = document.getElementById('blockTabJs');
const toggleMonitoringBtn = document.getElementById('toggleMonitoring');
const searchInput = document.getElementById('searchRequest');
const filterType = document.getElementById('filterType');
const filterStatus = document.getElementById('filterStatus');
const requestsBody = document.getElementById('requestsBody');
const requestModal = document.getElementById('requestModal');
const closeModalBtn = document.querySelector('.close-modal');
const enableToggle = document.getElementById('enableToggle');
const blockAllJsToggle = document.getElementById('blockAllJsToggle');
const blockTabJsToggle = document.getElementById('blockTabJsToggle');

let isMonitoring = false;
let currentTabId = null;
let settings = null;
let requests = [];
let currentTab = null;
let isFirstLoad = true;

// Check if a URL is blocked
function isUrlBlocked(url) {
    return settings?.blockList?.some(item => 
        url.includes(item.pattern) || url === item.pattern
    ) || false;
}

// Initialize popup
async function initPopup() {
    try {
        // Load and display version number
        const manifest = chrome.runtime.getManifest();
        const versionElement = document.querySelector('.version');
        versionElement.textContent = `v${manifest.version}`;

        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTab = tab;
        currentTabId = tab.id;

        // Get settings
        const response = await sendMessage({ action: 'getSettings' });
        if (response && response.settings) {
            settings = response.settings;
            isMonitoring = response.isMonitoring;
            
            // Load monitored requests from background script and update their status
            if (response.monitoredRequests) {
                requests = response.monitoredRequests.map(request => ({
                    ...request,
                    status: isUrlBlocked(request.url) ? 'blocked' : 'allowed'
                }));
            }
            
            // Update UI based on settings
            blockJsBtn.classList.toggle('active', settings.blockAllJs);
            
            // Check if current tab is in blocked tabs list
            if (settings.blockedTabIds && settings.blockedTabIds.includes(currentTab.id)) {
                blockTabJsBtn.classList.add('active');
            } else {
                blockTabJsBtn.classList.remove('active');
            }
            
            updateButtonStates();
            // Apply filters instead of just updating the table
            filterRequests();
        }

        // Setup event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing popup:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    clearLogsBtn.addEventListener('click', clearLogs);
    openOptionsBtn.addEventListener('click', openOptions);
    reloadTabBtn.addEventListener('click', reloadTab);
    blockJsBtn.addEventListener('click', toggleBlockJs);
    blockTabJsBtn.addEventListener('click', toggleBlockTabJs);
    toggleMonitoringBtn.addEventListener('click', toggleMonitoring);
    searchInput.addEventListener('input', filterRequests);
    filterType.addEventListener('change', filterRequests);
    filterStatus.addEventListener('change', filterRequests);
    closeModalBtn.addEventListener('click', closeModal);

    // Listen for new requests from background script
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'newRequest' && isMonitoring) {
            requests.unshift(message.request);
            // Apply current filters when new requests come in
            filterRequests();
        }
    });
}

// Clear logs
async function clearLogs() {
    await sendMessage({ action: 'clearLogs' });
    requests = [];
    filterRequests(); // Use filterRequests to maintain filter state
}

// Open options page
function openOptions() {
    chrome.runtime.openOptionsPage();
}

// Reload current tab
function reloadTab() {
    // Clear existing requests
    requests = [];
    // Reload the tab
    chrome.tabs.reload(currentTabId);
    // Update the table with current filters
    filterRequests();
}

// Toggle global JavaScript blocking
async function toggleBlockJs() {
    const enabled = !blockJsBtn.classList.contains('active');
    const response = await sendMessage({
        action: 'toggleBlockAllJs',
        enabled: enabled
    });
    
    if (response && response.settings) {
        settings = response.settings;
        updateButtonStates();
    }
}

// Toggle JavaScript blocking for current tab
async function toggleBlockTabJs() {
    const isActive = blockTabJsBtn.classList.contains('active');
    let blockedTabIds = settings.blockedTabIds || [];
    
    if (!isActive) {
        // Add current tab to blocked tabs if not already present
        if (!blockedTabIds.includes(currentTab.id)) {
            blockedTabIds.push(currentTab.id);
        }
    } else {
        // Remove current tab from blocked tabs
        blockedTabIds = blockedTabIds.filter(id => id !== currentTab.id);
    }
    
    const response = await sendMessage({
        action: 'toggleBlockTabJs',
        enabled: !isActive,
        tabIds: blockedTabIds
    });
    
    if (response && response.settings) {
        settings = response.settings;
        updateButtonStates();
    }
}

// Toggle request monitoring
async function toggleMonitoring() {
    isMonitoring = !isMonitoring;
    const response = await sendMessage({
        action: 'toggleMonitoring',
        enabled: isMonitoring
    });

    if (response && response.success) {
        updateButtonStates();
    }
}

// Send message to background script
function sendMessage(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
            resolve(response);
        });
    });
}

// Update button states based on settings
function updateButtonStates() {
    // Update Block All JS button
    blockJsBtn.classList.toggle('active', settings.blockAllJs);
    
    // Update Block Tab JS button
    if (settings.blockedTabIds && settings.blockedTabIds.includes(currentTab.id)) {
        blockTabJsBtn.classList.add('active');
    } else {
        blockTabJsBtn.classList.remove('active');
    }
    
    // Disable Block All JS button if any tab-specific blocking is enabled
    if (settings.blockTabJs && settings.blockedTabIds && settings.blockedTabIds.length > 0) {
        blockJsBtn.disabled = true;
        blockJsBtn.classList.remove('active');
    } else {
        blockJsBtn.disabled = false;
    }
    
    // Update monitoring button
    toggleMonitoringBtn.classList.toggle('active', isMonitoring);
    toggleMonitoringBtn.classList.toggle('inactive', !isMonitoring);
    toggleMonitoringBtn.innerHTML = isMonitoring ? '<i class="fas fa-stop"></i> Stop Monitor' : '<i class="fas fa-play"></i> Start Monitor';
}

// Filter requests based on search and filters
function filterRequests() {
    const searchTerm = searchInput.value.toLowerCase();
    const typeFilter = filterType.value;
    const statusFilter = filterStatus.value;

    const filteredRequests = requests.filter(request => {
        const matchesSearch = request.url.toLowerCase().includes(searchTerm);
        const matchesType = typeFilter === 'all' || request.type.toLowerCase() === typeFilter.toLowerCase();
        const matchesStatus = statusFilter === 'all' || request.status.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesType && matchesStatus;
    });

    updateRequestsTable(filteredRequests);
}

// Update requests table
function updateRequestsTable(displayRequests = requests) {
    const noRequestsMessage = document.getElementById('noRequestsMessage');
    const requestsTableContainer = document.getElementById('requestsTableContainer');
    
    if (displayRequests.length === 0) {
        noRequestsMessage.style.display = 'block';
        requestsTableContainer.style.display = 'none';
        return;
    }

    noRequestsMessage.style.display = 'none';
    requestsTableContainer.style.display = 'block';
    requestsBody.innerHTML = '';

    displayRequests.forEach(request => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="status status-${request.status.toLowerCase()}">
                    <i class="fas ${request.status.toLowerCase() === 'blocked' ? 'fa-ban' : 'fa-check'}"></i>
                    ${request.status}
                </div>
            </td>
            <td>${request.type}</td>
            <td class="url-cell">${truncateUrl(request.url)}</td>
        `;

        row.addEventListener('click', () => showRequestDetails(request));
        requestsBody.appendChild(row);
    });
}

// Show request details in modal
function showRequestDetails(request) {
    // Check current block status
    const isBlocked = isUrlBlocked(request.url);
    const currentStatus = isBlocked ? 'blocked' : 'allowed';

    const modalContent = document.querySelector('.modal-content');
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3>Request Details</h3>
            <button class="close-modal">&times;</button>
        </div>
        <div class="detail-item">
            <div class="status-actions">
                <div>
                    <label>Status:</label>
                    <div class="status status-${currentStatus}">${currentStatus}</div>
                </div>
                <button class="toggle-block-btn ${isBlocked ? 'unblock' : 'block'}" title="${isBlocked ? 'Unblock' : 'Block'} this URL">
                    <i class="fas ${isBlocked ? 'fa-unlock' : 'fa-ban'}"></i>
                    ${isBlocked ? 'Unblock' : 'Block'}
                </button>
            </div>
        </div>
        <div class="detail-item">
            <label>Type:</label>
            <div>${request.type}</div>
        </div>
        <div class="detail-item">
            <div class="label-with-copy">
                <label>URL:</label>
                <button class="copy-btn" title="Copy URL">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
            <div class="url-container">${request.url}</div>
        </div>
    `;

    requestModal.style.display = 'block';
    
    // Add event listener to new close button
    modalContent.querySelector('.close-modal').addEventListener('click', closeModal);

    // Add event listener to copy button
    modalContent.querySelector('.copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(request.url).then(() => {
            const copyBtn = modalContent.querySelector('.copy-btn');
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                copyBtn.classList.remove('copied');
            }, 1500);
        });
    });

    // Add event listener to block/unblock button
    modalContent.querySelector('.toggle-block-btn').addEventListener('click', async () => {
        const isCurrentlyBlocked = isUrlBlocked(request.url);
        const action = isCurrentlyBlocked ? 'removeFromBlockList' : 'addToBlockList';
        
        const response = await sendMessage({
            action: action,
            url: request.url
        });

        if (response && response.success) {
            // Get fresh settings to update block list
            const settingsResponse = await sendMessage({ action: 'getSettings' });
            if (settingsResponse && settingsResponse.settings) {
                settings = settingsResponse.settings;
                
                // Update all requests' status
                requests = requests.map(req => ({
                    ...req,
                    status: isUrlBlocked(req.url) ? 'blocked' : 'allowed'
                }));

                // Update current request status
                const newStatus = isUrlBlocked(request.url) ? 'blocked' : 'allowed';
                
                // Update modal button
                const btn = modalContent.querySelector('.toggle-block-btn');
                btn.className = `toggle-block-btn ${newStatus === 'blocked' ? 'unblock' : 'block'}`;
                btn.innerHTML = `
                    <i class="fas ${newStatus === 'blocked' ? 'fa-unlock' : 'fa-ban'}"></i>
                    ${newStatus === 'blocked' ? 'Unblock' : 'Block'}
                `;
                
                // Update status display
                const statusDiv = modalContent.querySelector('.status');
                statusDiv.className = `status status-${newStatus}`;
                statusDiv.textContent = newStatus;

                // Update table display
                filterRequests();
            }
        }
    });
}

// Close modal
function closeModal() {
    requestModal.style.display = 'none';
}

// Helper function to truncate URL
function truncateUrl(url) {
    const maxLength = 50;
    return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
}

// Update toggle states based on current settings
function updateToggleStates() {
    // Disable "Block All JS" toggle if any tab-specific blocking is enabled
    if (settings.blockTabJs && settings.blockedTabIds && settings.blockedTabIds.length > 0) {
        blockAllJsToggle.disabled = true;
        blockAllJsToggle.checked = false;
    } else {
        blockAllJsToggle.disabled = false;
    }
    
    // Update tab-specific toggle based on current tab
    if (settings.blockTabJs && settings.blockedTabIds && settings.blockedTabIds.includes(currentTab.id)) {
        blockTabJsToggle.checked = true;
    } else {
        blockTabJsToggle.checked = false;
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initPopup); 