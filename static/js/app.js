/**
 * TypeLux — Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    const engine = new TypingEngine();
    const textDisplay = document.getElementById('textDisplay');
    const typingInput = document.getElementById('typingInput');
    engine.init(textDisplay, typingInput);

    // ---------- Settings persistence ----------
    const FONT_MAP = {
        jetbrains: "'JetBrains Mono', 'Fira Code', monospace",
        inter: "'Inter', system-ui, sans-serif",
        system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        serif: "Georgia, 'Times New Roman', serif",
        mono: "'Courier New', Courier, monospace"
    };

    const defaults = {
        soundEnabled: true,
        soundVolume: 70,
        soundStyle: 'soft-piano',
        highlightEnabled: true,
        theme: 'dark',
        targetLines: 100,
        fontFamily: 'jetbrains',
        fontSize: 18
    };

    function loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem('typelux-settings') || '{}');
            return { ...defaults, ...saved };
        } catch {
            return { ...defaults };
        }
    }

    function saveSettings(s) {
        localStorage.setItem('typelux-settings', JSON.stringify(s));
    }

    let settings = loadSettings();

    function applyFontSettings() {
        const family = FONT_MAP[settings.fontFamily] || FONT_MAP.jetbrains;
        const size = Math.max(12, Math.min(32, settings.fontSize || 18));
        document.documentElement.style.setProperty('--typing-font', family);
        document.documentElement.style.setProperty('--typing-font-size', size + 'px');
        const sizeLabel = document.getElementById('fontSizeValue');
        if (sizeLabel) sizeLabel.textContent = size + 'px';
        const fontSelect = document.getElementById('fontFamily');
        if (fontSelect) fontSelect.value = settings.fontFamily || 'jetbrains';
    }

    // Apply settings to UI & engines
    function applySettings() {
        document.getElementById('soundEnabled').checked = settings.soundEnabled;
        document.getElementById('soundVolume').value = settings.soundVolume;
        document.getElementById('volumeValue').textContent = settings.soundVolume + '%';
        document.getElementById('soundStyle').value = settings.soundStyle;
        document.getElementById('highlightEnabled').checked = settings.highlightEnabled;
        document.getElementById('themeSelect').value = settings.theme;

        window.soundEngine.setEnabled(settings.soundEnabled);
        window.soundEngine.setVolume(settings.soundVolume / 100);
        window.soundEngine.setStyle(settings.soundStyle);
        engine.setHighlightEnabled(settings.highlightEnabled);

        if (settings.theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }

        applyFontSettings();
    }

    applySettings();

    // ---------- Story loading ----------
    let currentStoryIndex = 0;
    let stories = [];

    async function fetchStories() {
        try {
            const res = await fetch('/api/stories');
            const data = await res.json();
            stories = data.stories || [];
            if (stories.length > 0) {
                loadStory(0);
            }
        } catch (err) {
            console.error('Failed to load stories', err);
            // Fallback text
            engine.loadText('Welcome to TypeLux. Start typing to begin your practice session. The quick brown fox jumps over the lazy dog.', settings.targetLines);
            document.getElementById('storyTitle').textContent = 'Welcome';
            document.getElementById('storyAuthor').textContent = '';
        }
    }

    function loadStory(index) {
        if (!stories.length) return;
        currentStoryIndex = ((index % stories.length) + stories.length) % stories.length;
        const story = stories[currentStoryIndex];
        document.getElementById('storyTitle').textContent = story.title || 'Practice Text';
        document.getElementById('storyAuthor').textContent = story.author ? `by ${story.author}` : '';
        engine.loadText(story.text, settings.targetLines);
        updateTargetUI();
    }

    function loadRandomStory() {
        if (stories.length < 2) {
            loadStory(currentStoryIndex);
            return;
        }
        let next;
        do {
            next = Math.floor(Math.random() * stories.length);
        } while (next === currentStoryIndex);
        loadStory(next);
    }

    // ---------- Custom text ----------
    const customInput = document.getElementById('customTextInput');
    const wordCounter = document.getElementById('wordCounter');
    const charCounter = document.getElementById('charCounter');
    const customError = document.getElementById('customTextError');

    function updateCustomCounters() {
        const text = customInput.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        wordCounter.textContent = `${words.toLocaleString()} / 30,000 words`;
        charCounter.textContent = `${chars.toLocaleString()} characters`;

        if (words > 30000) {
            customError.textContent = `Text exceeds 30,000 word limit (${words.toLocaleString()} words). Please shorten it.`;
            wordCounter.style.color = 'var(--incorrect)';
        } else {
            customError.textContent = '';
            wordCounter.style.color = '';
        }
    }

    customInput.addEventListener('input', updateCustomCounters);

    document.getElementById('loadCustomText').addEventListener('click', () => {
        const text = customInput.value.trim();
        if (!text) {
            customError.textContent = 'Please enter or paste some text first.';
            return;
        }
        const words = text.split(/\s+/).length;
        if (words > 30000) {
            customError.textContent = `Text exceeds 30,000 word limit (${words.toLocaleString()} words). Cannot load.`;
            return;
        }
        customError.textContent = '';
        document.getElementById('storyTitle').textContent = 'Custom Text';
        document.getElementById('storyAuthor').textContent = 'Your practice material';
        engine.loadText(text, settings.targetLines);
        updateTargetUI();
        // Close mobile sidebar
        closeSidebars();
        showStartPanel();
    });

    document.getElementById('clearCustomText').addEventListener('click', () => {
        customInput.value = '';
        updateCustomCounters();
        customError.textContent = '';
    });

    // File upload (client-side)
    const fileZone = document.getElementById('fileUploadZone');
    const fileInput = document.getElementById('fileInput');

    fileZone.addEventListener('click', () => fileInput.click());

    fileZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileZone.classList.add('dragover');
    });
    fileZone.addEventListener('dragleave', () => fileZone.classList.remove('dragover'));
    fileZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFile(fileInput.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.name.toLowerCase().endsWith('.txt')) {
            customError.textContent = 'Only .txt files are supported.';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result || '';
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            if (words > 30000) {
                customError.textContent = `File exceeds 30,000 word limit (${words.toLocaleString()} words).`;
                return;
            }
            customInput.value = text;
            updateCustomCounters();
            customError.textContent = '';
        };
        reader.onerror = () => {
            customError.textContent = 'Failed to read the file.';
        };
        reader.readAsText(file);
    }

    // ---------- Sound controls ----------
    document.getElementById('soundEnabled').addEventListener('change', (e) => {
        settings.soundEnabled = e.target.checked;
        window.soundEngine.setEnabled(settings.soundEnabled);
        saveSettings(settings);
    });

    document.getElementById('soundVolume').addEventListener('input', (e) => {
        settings.soundVolume = parseInt(e.target.value, 10);
        document.getElementById('volumeValue').textContent = settings.soundVolume + '%';
        window.soundEngine.setVolume(settings.soundVolume / 100);
        saveSettings(settings);
    });

    document.getElementById('soundStyle').addEventListener('change', (e) => {
        settings.soundStyle = e.target.value;
        window.soundEngine.setStyle(settings.soundStyle);
        saveSettings(settings);
    });

    document.getElementById('highlightEnabled').addEventListener('change', (e) => {
        settings.highlightEnabled = e.target.checked;
        engine.setHighlightEnabled(settings.highlightEnabled);
        saveSettings(settings);
    });

    document.getElementById('themeSelect').addEventListener('change', (e) => {
        settings.theme = e.target.value;
        applySettings();
        saveSettings(settings);
    });

    document.getElementById('fontFamily').addEventListener('change', (e) => {
        settings.fontFamily = e.target.value;
        applyFontSettings();
        saveSettings(settings);
    });

    document.getElementById('fontSizeDown').addEventListener('click', () => {
        settings.fontSize = Math.max(12, (settings.fontSize || 18) - 1);
        applyFontSettings();
        saveSettings(settings);
    });

    document.getElementById('fontSizeUp').addEventListener('click', () => {
        settings.fontSize = Math.min(32, (settings.fontSize || 18) + 1);
        applyFontSettings();
        saveSettings(settings);
    });

    document.getElementById('resetSettings').addEventListener('click', () => {
        settings = { ...defaults };
        applySettings();
        saveSettings(settings);
        engine.setTargetLines(settings.targetLines);
        updateTargetUI();
    });

    // ---------- Line target ----------
    function updateTargetUI() {
        const target = settings.targetLines;
        document.getElementById('targetDisplay').textContent = target;
        document.getElementById('customTarget').value = target;

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.target, 10) === target);
        });

        // Also refresh progress display
        const stats = engine.getStats();
        updateProgressPanel(stats);

        if (engine.warningFewLines) {
            // Optional: could show a small notice
        }
    }

    function updateProgressPanel(stats) {
        document.getElementById('completedLines').textContent = stats.completedLines;
        document.getElementById('remainingLines').textContent = Math.max(0, stats.targetLines - stats.completedLines);
        const pct = stats.targetLines > 0
            ? Math.min(100, Math.round((stats.completedLines / stats.targetLines) * 100))
            : 0;
        document.getElementById('progressBar').style.width = pct + '%';
        document.getElementById('progressPercent').textContent = pct + '%';
    }

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const t = parseInt(btn.dataset.target, 10);
            settings.targetLines = t;
            saveSettings(settings);
            engine.setTargetLines(t);
            updateTargetUI();
        });
    });

    document.getElementById('applyCustomTarget').addEventListener('click', () => {
        const val = parseInt(document.getElementById('customTarget').value, 10);
        if (val >= 1 && val <= 500) {
            settings.targetLines = val;
            saveSettings(settings);
            engine.setTargetLines(val);
            updateTargetUI();
        }
    });

    document.getElementById('resetTargetBtn').addEventListener('click', () => {
        engine.reset();
        updateTargetUI();
        showStartPanel();
    });

    // ---------- Progress & completion events ----------
    document.addEventListener('typing-progress', (e) => {
        updateProgressPanel(e.detail);
    });

    document.addEventListener('typing-complete', (e) => {
        addHistoryEntry(e.detail);
        showResults(e.detail);
    });

    function showResults(stats) {
        const fmt = (s) => {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return `${m}:${sec.toString().padStart(2, '0')}`;
        };

        document.getElementById('resultNetWpm').textContent = stats.netWpm;
        document.getElementById('resultGrossWpm').textContent = stats.grossWpm;
        document.getElementById('resultAccuracy').textContent = stats.accuracy + '%';
        document.getElementById('resultTime').textContent = fmt(stats.timeSeconds);
        document.getElementById('resultCorrect').textContent = stats.correctChars;
        document.getElementById('resultIncorrect').textContent = stats.incorrectChars;
        document.getElementById('resultTotal').textContent = stats.totalTyped;
        document.getElementById('resultLines').textContent = `${stats.completedLines} / ${stats.targetLines}`;

        document.getElementById('resultsModal').classList.add('active');
        // Refresh icons in modal
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // ---------- History (max 20) ----------
    const HISTORY_KEY = 'typelux-history';
    const HISTORY_MAX = 20;

    function loadHistory() {
        try {
            const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            return Array.isArray(raw) ? raw : [];
        } catch {
            return [];
        }
    }

    function saveHistory(list) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    }

    function formatTimeSeconds(s) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    function addHistoryEntry(stats) {
        const now = new Date();
        const entry = {
            id: Date.now(),
            date: now.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
            time: now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            durationSeconds: stats.timeSeconds || 0,
            lines: stats.completedLines || 0,
            targetLines: stats.targetLines || 0,
            speed: stats.netWpm || 0,
            accuracy: stats.accuracy || 0
        };

        let list = loadHistory();
        // Newest first
        list.unshift(entry);
        // Auto-clear when over max (keep newest 20)
        if (list.length > HISTORY_MAX) {
            list = list.slice(0, HISTORY_MAX);
        }
        saveHistory(list);
        renderHistoryList();
    }

    function renderHistoryList() {
        const list = loadHistory();
        const container = document.getElementById('historyList');
        const emptyEl = document.getElementById('historyEmpty');
        const detailEl = document.getElementById('historyDetail');

        // Clear previous labels (keep empty placeholder node if present)
        container.querySelectorAll('.history-item').forEach(el => el.remove());

        if (list.length === 0) {
            if (emptyEl) emptyEl.style.display = '';
            if (detailEl) detailEl.classList.add('hidden');
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        list.forEach((entry, index) => {
            const label = 'T' + (index + 1);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'history-item';
            btn.dataset.index = String(index);
            btn.textContent = label;
            btn.setAttribute('aria-label', `History ${label}`);
            btn.addEventListener('click', () => showHistoryDetail(index));
            container.appendChild(btn);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function showHistoryDetail(index) {
        const list = loadHistory();
        const entry = list[index];
        if (!entry) return;

        const detailEl = document.getElementById('historyDetail');
        const labelEl = document.getElementById('historyDetailLabel');
        const bodyEl = document.getElementById('historyDetailBody');

        labelEl.textContent = 'T' + (index + 1);
        bodyEl.innerHTML = `
            <div class="history-detail-row">
                <span class="hd-label">Date</span>
                <span class="hd-value">${entry.date || '—'}</span>
            </div>
            <div class="history-detail-row">
                <span class="hd-label">Time</span>
                <span class="hd-value">${entry.time || '—'}</span>
            </div>
            <div class="history-detail-row">
                <span class="hd-label">Duration</span>
                <span class="hd-value">${formatTimeSeconds(entry.durationSeconds || 0)}</span>
            </div>
            <div class="history-detail-row">
                <span class="hd-label">Lines</span>
                <span class="hd-value">${entry.lines || 0} / ${entry.targetLines || 0}</span>
            </div>
            <div class="history-detail-row">
                <span class="hd-label">Speed</span>
                <span class="hd-value">${entry.speed || 0} WPM</span>
            </div>
            <div class="history-detail-row">
                <span class="hd-label">Accuracy</span>
                <span class="hd-value">${entry.accuracy || 0}%</span>
            </div>
        `;

        detailEl.classList.remove('hidden');

        // Highlight active label
        document.querySelectorAll('.history-item').forEach((el, i) => {
            el.classList.toggle('active', i === index);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    document.getElementById('closeHistoryDetail').addEventListener('click', () => {
        document.getElementById('historyDetail').classList.add('hidden');
        document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
    });

    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        if (!confirm('Clear all practice history?')) return;
        saveHistory([]);
        renderHistoryList();
        document.getElementById('historyDetail').classList.add('hidden');
    });

    // Initial render
    renderHistoryList();

    function hideResults() {
        document.getElementById('resultsModal').classList.remove('active');
    }

    document.getElementById('closeModal').addEventListener('click', hideResults);
    document.getElementById('tryAgainBtn').addEventListener('click', () => {
        hideResults();
        engine.reset();
        updateTargetUI();
        showStartPanel();
    });
    document.getElementById('anotherStoryBtn').addEventListener('click', () => {
        hideResults();
        loadRandomStory();
        showStartPanel();
    });
    document.getElementById('changeTargetBtn').addEventListener('click', () => {
        hideResults();
        openRightSidebar();
    });

    // ---------- Start / Stop typing panels ----------
    const startPanel = document.getElementById('startPanel');
    const typingPanel = document.getElementById('typingPanel');
    let typingActive = false;

    function showStartPanel() {
        typingActive = false;
        startPanel.classList.remove('hidden');
        typingPanel.classList.add('hidden');
        typingInput.blur();
        typingInput.value = '';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function showTypingPanel() {
        typingActive = true;
        startPanel.classList.add('hidden');
        typingPanel.classList.remove('hidden');
        // Unlock audio on this click (browsers require a user gesture)
        if (window.soundEngine) {
            window.soundEngine.init();
            const p = window.soundEngine.ensureRunning();
            if (p && typeof p.then === 'function') {
                p.then(() => {
                    if (settings.soundEnabled) window.soundEngine.playTest();
                }).catch(() => {});
            } else if (settings.soundEnabled) {
                window.soundEngine.playTest();
            }
        }
        typingInput.disabled = false;
        typingInput.value = '';
        setTimeout(() => typingInput.focus(), 50);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    document.getElementById('startTypingBtn').addEventListener('click', () => {
        showTypingPanel();
    });

    document.getElementById('stopTypingBtn').addEventListener('click', () => {
        // Stop does not reset progress — just closes the typing window
        showStartPanel();
    });

    function doRestart() {
        engine.reset();
        updateTargetUI();
        showStartPanel();
    }

    function doNewStory() {
        loadRandomStory();
        showStartPanel();
    }

    // Active panel buttons
    document.getElementById('restartBtn').addEventListener('click', doRestart);
    document.getElementById('newStoryBtn').addEventListener('click', doNewStory);
    // Idle panel buttons
    document.getElementById('restartBtnIdle').addEventListener('click', doRestart);
    document.getElementById('newStoryBtnIdle').addEventListener('click', doNewStory);

    // When practice completes, return to start panel after closing results is optional;
    // keep typing panel disabled via engine; user can Stop or Try Again.
    document.addEventListener('typing-complete', () => {
        // leave panel as-is; input is already disabled by engine
    });

    // ---------- Sidebars (auto-hide on all screen sizes) ----------
    const leftSidebar = document.getElementById('leftSidebar');
    const rightSidebar = document.getElementById('rightSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const leftToggle = document.getElementById('toggleLeftSidebar');
    const rightToggle = document.getElementById('toggleRightSidebar');

    function openLeftSidebar() {
        rightSidebar.classList.remove('open');
        leftSidebar.classList.add('open');
        overlay.classList.add('active');
        if (leftToggle) leftToggle.classList.add('hidden-on-open');
        if (rightToggle) rightToggle.classList.remove('hidden-on-open');
    }
    function openRightSidebar() {
        leftSidebar.classList.remove('open');
        rightSidebar.classList.add('open');
        overlay.classList.add('active');
        if (rightToggle) rightToggle.classList.add('hidden-on-open');
        if (leftToggle) leftToggle.classList.remove('hidden-on-open');
    }
    function closeSidebars() {
        leftSidebar.classList.remove('open');
        rightSidebar.classList.remove('open');
        overlay.classList.remove('active');
        if (leftToggle) leftToggle.classList.remove('hidden-on-open');
        if (rightToggle) rightToggle.classList.remove('hidden-on-open');
    }
    function toggleLeftSidebar() {
        if (leftSidebar.classList.contains('open')) {
            closeSidebars();
        } else {
            openLeftSidebar();
        }
    }
    function toggleRightSidebar() {
        if (rightSidebar.classList.contains('open')) {
            closeSidebars();
        } else {
            openRightSidebar();
        }
    }

    // Mobile header buttons
    document.getElementById('openLeftSidebar').addEventListener('click', openLeftSidebar);
    document.getElementById('openRightSidebar').addEventListener('click', openRightSidebar);
    // Desktop floating toggles
    if (leftToggle) leftToggle.addEventListener('click', toggleLeftSidebar);
    if (rightToggle) rightToggle.addEventListener('click', toggleRightSidebar);
    // Close buttons & overlay
    document.getElementById('closeLeftSidebar').addEventListener('click', closeSidebars);
    document.getElementById('closeRightSidebar').addEventListener('click', closeSidebars);
    overlay.addEventListener('click', closeSidebars);

    // Escape key closes sidebars (or stops typing if active and no sidebar open)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (leftSidebar.classList.contains('open') || rightSidebar.classList.contains('open')) {
                closeSidebars();
            } else if (typingActive) {
                showStartPanel();
            }
        }
    });

    // ---------- Fullscreen (silent, no message) ----------
    // Auto full screen only — browsers usually allow it after first click/key.
    function isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement);
    }

    function requestAppFullscreen() {
        if (isFullscreen()) return Promise.resolve(true);
        const el = document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
        if (req) {
            return Promise.resolve(req.call(el)).catch(() => false);
        }
        return Promise.resolve(false);
    }

    // Try immediately on load
    requestAppFullscreen();

    // Silent retry on first user action (no UI message)
    function tryFullscreenOnGesture() {
        requestAppFullscreen();
    }
    document.addEventListener('click', tryFullscreenOnGesture, { once: true, capture: true });
    document.addEventListener('keydown', tryFullscreenOnGesture, { once: true, capture: true });
    document.addEventListener('touchstart', tryFullscreenOnGesture, { once: true, capture: true });

    // If user exits fullscreen, re-arm silent request on next interaction
    function rearmFullscreen() {
        if (!isFullscreen()) {
            document.addEventListener('click', tryFullscreenOnGesture, { once: true, capture: true });
            document.addEventListener('keydown', tryFullscreenOnGesture, { once: true, capture: true });
            document.addEventListener('touchstart', tryFullscreenOnGesture, { once: true, capture: true });
        }
    }
    document.addEventListener('fullscreenchange', rearmFullscreen);
    document.addEventListener('webkitfullscreenchange', rearmFullscreen);

    // ---------- Init ----------
    fetchStories();
    showStartPanel();
});
