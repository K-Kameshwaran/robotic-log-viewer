// --- Parser Logic ---
function parseLogLine(line) {
    if (!line || line.trim() === '') {
        return { raw: line, timestamp: '—', level: '—', node: '—', message: line, unparsed: false, isEmpty: true };
    }

    let remaining = line.trim();
    let timestamp = '—';
    let level = '—';
    let node = '—';
    let isParsed = false;

    // 1. Try to extract unbracketed ISO/SQL timestamp: YYYY-MM-DD HH:MM:SS.MMM
    const rawTsRegex = /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+/;
    let tsMatch = remaining.match(rawTsRegex);
    if (tsMatch) {
        timestamp = tsMatch[1];
        remaining = remaining.substring(tsMatch[0].length);
        isParsed = true;
    } else {
        // Try bracketed timestamp that starts with a digit: [2026...]
        const bracketTsRegex = /^\[(\d[^\]]*)\]\s+/;
        let bTsMatch = remaining.match(bracketTsRegex);
        if (bTsMatch) {
            timestamp = bTsMatch[1];
            remaining = remaining.substring(bTsMatch[0].length);
            isParsed = true;
        }
    }

    // 2. Extract up to two brackets for level and node
    const bracketRegex = /^\[([^\]]+)\]\s*/;
    let brackets = [];
    for (let i = 0; i < 2; i++) {
        let match = remaining.match(bracketRegex);
        if (match) {
            brackets.push(match[1]);
            remaining = remaining.substring(match[0].length);
            isParsed = true;
        } else {
            break;
        }
    }

    // 3. Assign level and node based on extracted brackets
    if (brackets.length === 2) {
        level = brackets[0].toUpperCase();
        node = brackets[1];
    } else if (brackets.length === 1) {
        level = brackets[0].toUpperCase();
    }

    return {
        raw: line,
        timestamp: timestamp,
        level: level,
        node: node,
        message: remaining,
        unparsed: !isParsed,
        isEmpty: false
    };
}

// --- App State ---
const state = {
    logs: [],
    renderedCount: 0,
    chunkSize: 200, // Render 200 items at a time
    observer: null
};

// --- Formatter Utility ---
function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// --- DOM Elements ---
const DOM = {
    fileUpload: document.getElementById('file-upload'),
    uploadBtn: document.getElementById('upload-btn'),
    
    // States
    stateEmpty: document.getElementById('state-empty'),
    stateLoading: document.getElementById('state-loading'),
    stateError: document.getElementById('state-error'),
    stateViewer: document.getElementById('state-viewer'),
    
    // Info Bar
    fileInfoBar: document.getElementById('file-info-bar'),
    infoFilename: document.getElementById('info-filename'),
    infoEntries: document.getElementById('info-entries'),
    infoSize: document.getElementById('info-size'),
    
    // Footer
    footerStatusText: document.getElementById('footer-status-text'),
    footerCount: document.getElementById('footer-count'),
    statusDot: document.querySelector('.status-dot'),
    
    errorMessage: document.getElementById('error-message'),
    logList: document.getElementById('log-list'),
    scrollSentinel: document.getElementById('scroll-sentinel')
};

// --- View Transition ---
function showState(stateName) {
    DOM.stateEmpty.classList.remove('active');
    DOM.stateLoading.classList.remove('active');
    DOM.stateError.classList.remove('active');
    DOM.stateViewer.classList.remove('active');
    DOM.fileInfoBar.classList.remove('active');
    
    DOM.statusDot.className = 'status-dot'; // reset

    switch (stateName) {
        case 'empty':
            DOM.stateEmpty.classList.add('active');
            DOM.uploadBtn.classList.remove('disabled');
            DOM.footerStatusText.textContent = 'Ready';
            break;
        case 'loading':
            DOM.stateLoading.classList.add('active');
            DOM.uploadBtn.classList.add('disabled');
            DOM.footerStatusText.textContent = 'Processing...';
            DOM.statusDot.classList.add('loading');
            break;
        case 'error':
            DOM.stateError.classList.add('active');
            DOM.uploadBtn.classList.remove('disabled');
            DOM.footerStatusText.textContent = 'Error';
            DOM.statusDot.classList.add('error');
            break;
        case 'viewer':
            DOM.stateViewer.classList.add('active');
            DOM.fileInfoBar.classList.add('active');
            DOM.uploadBtn.classList.remove('disabled');
            DOM.footerStatusText.textContent = 'Ready';
            break;
    }
}

// --- Rendering Logic ---
function getLevelClass(level) {
    if (level === '—') return 'badge-unparsed';
    const l = level.toLowerCase();
    if (['debug', 'info', 'warn', 'error', 'fatal'].includes(l)) {
        return `badge-${l}`;
    }
    return 'badge-unparsed';
}

function getRowClass(log) {
    if (log.unparsed) return 'row-unparsed';
    const l = log.level.toLowerCase();
    if (['debug', 'info', 'warn', 'error', 'fatal'].includes(l)) {
        return `row-${l}`;
    }
    return '';
}

function createLogElement(log) {
    const row = document.createElement('div');
    row.className = `log-row ${getRowClass(log)}`;

    // Timestamp
    const tsCol = document.createElement('div');
    tsCol.className = 'col-timestamp log-timestamp';
    tsCol.textContent = log.timestamp;
    
    // Level
    const levelCol = document.createElement('div');
    levelCol.className = 'col-level';
    if (log.level !== '—') {
        const levelBadge = document.createElement('span');
        levelBadge.className = `log-level-badge ${getLevelClass(log.level)}`;
        levelBadge.textContent = log.level;
        levelCol.appendChild(levelBadge);
    }
    
    // Node / Source
    const nodeCol = document.createElement('div');
    nodeCol.className = 'col-node log-node';
    if (log.node !== '—') {
        const nodeBadge = document.createElement('span');
        nodeBadge.className = 'node-badge';
        nodeBadge.textContent = log.node;
        nodeCol.appendChild(nodeBadge);
    } else {
        nodeCol.textContent = '—';
    }
    
    // Message
    const msgCol = document.createElement('div');
    msgCol.className = 'col-message log-message';
    msgCol.textContent = log.message;

    row.appendChild(tsCol);
    row.appendChild(levelCol);
    row.appendChild(nodeCol);
    row.appendChild(msgCol);

    return row;
}

function renderNextChunk() {
    if (state.renderedCount >= state.logs.length) {
        return;
    }

    const fragment = document.createDocumentFragment();
    const end = Math.min(state.renderedCount + state.chunkSize, state.logs.length);

    for (let i = state.renderedCount; i < end; i++) {
        const log = state.logs[i];
        if (!log.isEmpty) {
            fragment.appendChild(createLogElement(log));
        }
    }

    DOM.logList.insertBefore(fragment, DOM.scrollSentinel);
    state.renderedCount = end;
}

// --- Initialization & File Handling ---
function setupObserver() {
    if (state.observer) {
        state.observer.disconnect();
    }
    
    state.observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            renderNextChunk();
        }
    }, {
        root: DOM.logList,
        rootMargin: '150px' // Load slightly earlier for smoother scrolling
    });
    
    state.observer.observe(DOM.scrollSentinel);
}

function updateMetadataUI(file, validEntryCount) {
    DOM.infoFilename.textContent = file.name;
    DOM.infoSize.textContent = formatBytes(file.size);
    const countStr = validEntryCount.toLocaleString() + ' entries';
    DOM.infoEntries.textContent = countStr;
    DOM.footerCount.textContent = countStr;
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = ''; // Reset input
    showState('loading');
    
    // Slight timeout to allow UI paint
    setTimeout(() => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split(/\r?\n/);
                
                state.logs = [];
                state.renderedCount = 0;
                DOM.logList.innerHTML = '';
                DOM.logList.appendChild(DOM.scrollSentinel);
                
                let validEntryCount = 0;
                
                for (let i = 0; i < lines.length; i++) {
                    const parsed = parseLogLine(lines[i]);
                    state.logs.push(parsed);
                    if (!parsed.isEmpty) validEntryCount++;
                }
                
                if (validEntryCount === 0) {
                    DOM.errorMessage.textContent = 'The file is empty or contains no valid lines.';
                    showState('error');
                    return;
                }

                updateMetadataUI(file, validEntryCount);
                showState('viewer');
                
                setupObserver();
                renderNextChunk();
                
            } catch (err) {
                console.error(err);
                DOM.errorMessage.textContent = err.message || 'Failed to parse log file.';
                showState('error');
            }
        };
        
        reader.onerror = () => {
            DOM.errorMessage.textContent = 'Failed to read the file from disk.';
            showState('error');
        };

        reader.readAsText(file);
    }, 100);
}

// --- Event Listeners ---
DOM.fileUpload.addEventListener('change', handleFileSelect);

// Initial state
showState('empty');
