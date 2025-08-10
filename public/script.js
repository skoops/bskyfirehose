// Socket.IO connection
const socket = io();

// DOM elements
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const stopBtn = document.getElementById('stopBtn');
const clearLogBtn = document.getElementById('clearLogBtn');
const autoScrollBtn = document.getElementById('autoScrollBtn');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const filterInput = document.getElementById('filterInput');
const logDisplay = document.getElementById('logDisplay');
const statusText = document.getElementById('statusText');
const eventsPerSec = document.getElementById('eventsPerSec');
const bytesPerSec = document.getElementById('bytesPerSec');
const timestamp = document.getElementById('timestamp');
const languageSelector = document.getElementById('languageSelector');

// State variables
let autoScroll = true;
let currentFilter = '';
let logEntries = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize internationalization
    await i18n.init();
    
    // Add language selector to the page
    languageSelector.appendChild(i18n.createLanguageSelector());
    
    // Update all texts
    i18n.updateAllTexts();
    
    // Update placeholders
    updatePlaceholders();
    
    updateTimestamp();
    setInterval(updateTimestamp, 1000);
});

// Update input placeholders
function updatePlaceholders() {
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = i18n.t(key);
    });
}

// Button event listeners
startBtn.addEventListener('click', () => {
    socket.emit('start');
    updateButtonStates(true, false, false, true);
});

pauseBtn.addEventListener('click', () => {
    socket.emit('pause');
    updateButtonStates(false, false, true, true);
});

resumeBtn.addEventListener('click', () => {
    socket.emit('resume');
    updateButtonStates(false, true, false, true);
});

stopBtn.addEventListener('click', () => {
    socket.emit('stop');
    updateButtonStates(true, false, false, false);
});

clearLogBtn.addEventListener('click', () => {
    logDisplay.innerHTML = '';
    logEntries = [];
});

autoScrollBtn.addEventListener('click', () => {
    autoScroll = !autoScroll;
    autoScrollBtn.classList.toggle('active', autoScroll);
    
    // Update button text based on state
    const autoScrollText = autoScrollBtn.querySelector('[data-i18n="controls.autoScroll"]');
    if (autoScrollText) {
        autoScrollText.textContent = i18n.t('controls.autoScroll');
    }
    
    if (autoScroll) {
        scrollToBottom();
    }
});

clearFilterBtn.addEventListener('click', () => {
    filterInput.value = '';
    currentFilter = '';
    applyFilter();
});

filterInput.addEventListener('input', (e) => {
    currentFilter = e.target.value;
    applyFilter();
});

// Socket event listeners
socket.on('status', (data) => {
    // Translate status messages
    let translatedMessage = data.message;
    
    // Map server messages to translation keys
    const messageMap = {
        'Connected to JetStream': 'status.connectedToJetStream',
        'Connected to Bluesky Firehose': 'status.connectedToFirehose',
        'Disconnected from JetStream': 'status.disconnectedFromJetStream',
        'Disconnected from Bluesky Firehose': 'status.disconnectedFromFirehose',
        'Connection error': 'status.connectionError',
        'All endpoints failed': 'status.allEndpointsFailed',
        'Failed to connect to Bluesky Firehose': 'status.failedToConnect'
    };
    
    if (messageMap[data.message]) {
        translatedMessage = i18n.t(messageMap[data.message]);
    }
    
    statusText.textContent = translatedMessage;
    statusText.className = data.connected ? 'connected' : 'disconnected';
});

socket.on('stats', (data) => {
    eventsPerSec.textContent = data.eventsPerSecond;
    bytesPerSec.textContent = Math.round(data.bytesPerSecond / 1024);
});

socket.on('firehose-event', (data) => {
    addLogEntry(data);
});

// Helper functions
function updateButtonStates(startEnabled, pauseEnabled, resumeEnabled, stopEnabled) {
    startBtn.disabled = !startEnabled;
    pauseBtn.disabled = !pauseEnabled;
    resumeBtn.disabled = !resumeEnabled;
    stopBtn.disabled = !stopEnabled;
}

function updateTimestamp() {
    const now = new Date();
    timestamp.textContent = now.toLocaleTimeString('de-DE');
}

function addLogEntry(data) {
    const entry = {
        timestamp: data.timestamp,
        event: data.event,
        raw: data.raw,
        element: null
    };
    
    logEntries.push(entry);
    
    // Create DOM element
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'log-timestamp';
    timestampDiv.textContent = new Date(data.timestamp).toLocaleTimeString('de-DE');
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'log-content';
    
    // Format the event data
    let formattedContent = '';
    if (data.event && typeof data.event === 'object') {
        formattedContent = formatEventData(data.event);
    } else {
        formattedContent = data.raw || JSON.stringify(data.event, null, 2);
    }
    
    contentDiv.innerHTML = formattedContent;
    
    logEntry.appendChild(timestampDiv);
    logEntry.appendChild(contentDiv);
    
    entry.element = logEntry;
    
    // Apply filter
    if (shouldShowEntry(entry)) {
        logDisplay.appendChild(logEntry);
        
        if (autoScroll) {
            scrollToBottom();
        }
    }
    
    // Limit log entries to prevent memory issues
    if (logEntries.length > 1000) {
        const removedEntry = logEntries.shift();
        if (removedEntry.element && removedEntry.element.parentNode) {
            removedEntry.element.remove();
        }
    }
}

function formatEventData(event) {
    try {
        // Handle different types of events
        if (event.ops && Array.isArray(event.ops)) {
            return formatOps(event.ops);
        } else if (event.tombstone) {
            return `<span style="color: #ff6b6b;">🗑️ Deleted Post</span>`;
        } else if (event.repo) {
            return `<span style="color: #4ecdc4;">📝 New Post</span><br><pre>${JSON.stringify(event, null, 2)}</pre>`;
        } else {
            return `<pre>${JSON.stringify(event, null, 2)}</pre>`;
        }
    } catch (error) {
        return `<pre>${JSON.stringify(event, null, 2)}</pre>`;
    }
}

function formatOps(ops) {
    let result = '';
    ops.forEach((op, index) => {
        if (op.action === 'create' && op.path.includes('app.bsky.feed.post')) {
            result += `<div style="margin-bottom: 10px; padding: 8px; background: rgba(0, 212, 255, 0.1); border-radius: 4px;">
                <span style="color: #00d4ff; font-weight: bold;">${i18n.t('log.newPost')} #${index + 1}</span><br>
                <span style="color: #888;">${i18n.t('log.path')}: ${op.path}</span>
            </div>`;
        } else if (op.action === 'delete') {
            result += `<div style="margin-bottom: 10px; padding: 8px; background: rgba(255, 107, 107, 0.1); border-radius: 4px;">
                <span style="color: #ff6b6b; font-weight: bold;">${i18n.t('log.deletedPost')}</span><br>
                <span style="color: #888;">${i18n.t('log.path')}: ${op.path}</span>
            </div>`;
        } else {
            result += `<div style="margin-bottom: 10px; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 4px;">
                <span style="color: #e0e0e0; font-weight: bold;">${op.action.toUpperCase()}</span><br>
                <span style="color: #888;">${i18n.t('log.path')}: ${op.path}</span>
            </div>`;
        }
    });
    return result;
}

function shouldShowEntry(entry) {
    if (!currentFilter.trim()) {
        return true;
    }
    
    const filterTerms = parseFilter(currentFilter);
    const content = JSON.stringify(entry.event).toLowerCase();
    
    return evaluateFilter(content, filterTerms);
}

function parseFilter(filterString) {
    const tokens = filterString.toLowerCase().split(/\s+/);
    const terms = [];
    let currentTerm = { operator: 'AND', words: [] };
    
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        
        if (token === 'and' || token === 'or' || token === 'not') {
            if (currentTerm.words.length > 0) {
                terms.push(currentTerm);
                currentTerm = { operator: token.toUpperCase(), words: [] };
            } else {
                currentTerm.operator = token.toUpperCase();
            }
        } else if (token.length > 0) {
            currentTerm.words.push(token);
        }
    }
    
    if (currentTerm.words.length > 0) {
        terms.push(currentTerm);
    }
    
    return terms;
}

function evaluateFilter(content, terms) {
    if (terms.length === 0) return true;
    
    let result = true;
    
    for (const term of terms) {
        const termResult = term.words.some(word => content.includes(word));
        
        switch (term.operator) {
            case 'AND':
                result = result && termResult;
                break;
            case 'OR':
                result = result || termResult;
                break;
            case 'NOT':
                result = result && !termResult;
                break;
        }
    }
    
    return result;
}

function applyFilter() {
    // Clear current display
    logDisplay.innerHTML = '';
    
    // Re-add filtered entries
    logEntries.forEach(entry => {
        if (shouldShowEntry(entry)) {
            logDisplay.appendChild(entry.element);
        }
    });
    
    if (autoScroll) {
        scrollToBottom();
    }
}

function scrollToBottom() {
    logDisplay.scrollTop = logDisplay.scrollHeight;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                if (!startBtn.disabled) {
                    startBtn.click();
                } else if (!stopBtn.disabled) {
                    stopBtn.click();
                }
                break;
            case ' ':
                e.preventDefault();
                if (!pauseBtn.disabled) {
                    pauseBtn.click();
                } else if (!resumeBtn.disabled) {
                    resumeBtn.click();
                }
                break;
            case 'k':
                e.preventDefault();
                clearLogBtn.click();
                break;
            case 'f':
                e.preventDefault();
                filterInput.focus();
                break;
        }
    }
});

// Auto-reconnect on connection loss
socket.on('disconnect', () => {
    statusText.textContent = i18n.t('status.connectionLost');
    statusText.className = 'disconnected';
});

socket.on('connect', () => {
    statusText.textContent = i18n.t('status.connected');
    statusText.className = 'connected';
});
