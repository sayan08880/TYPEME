/**
 * Typing Engine
 * Handles character highlighting, progress tracking, WPM, accuracy, line targets.
 */

class TypingEngine {
    constructor() {
        this.fullText = '';
        this.displayText = '';
        this.lines = [];
        this.targetLines = 100;
        this.actualTargetLines = 100;
        this.warningFewLines = false;
        this.currentIndex = 0;
        this.started = false;
        this.completed = false;
        this.startTime = null;
        this.timerInterval = null;

        this.correctChars = 0;
        this.incorrectChars = 0;
        this.totalTyped = 0;
        this._results = [];

        this.textDisplay = null;
        this.typingInput = null;
        this.highlightEnabled = true;
    }

    init(textDisplayEl, typingInputEl) {
        this.textDisplay = textDisplayEl;
        this.typingInput = typingInputEl;

        this.typingInput.addEventListener('input', (e) => this._onInput(e));
        this.typingInput.addEventListener('keydown', (e) => this._onKeyDown(e));
    }

    _playSound(ch) {
        if (window.soundEngine) {
            window.soundEngine.playKey(ch);
        }
    }

    setHighlightEnabled(val) {
        this.highlightEnabled = !!val;
        this._render();
    }

    loadText(text, targetLines = null) {
        this.fullText = text || '';
        this.lines = this._splitIntoLines(this.fullText);
        if (targetLines !== null) {
            this.targetLines = targetLines;
        }
        this._applyLineTarget();
        this.reset();
    }

    setTargetLines(n) {
        this.targetLines = Math.max(1, Math.min(500, parseInt(n, 10) || 100));
        this._applyLineTarget();
        this.reset();
    }

    _splitIntoLines(text) {
        const rawLines = text.split(/\n/);
        const result = [];
        const maxLen = 80;

        for (let raw of rawLines) {
            raw = raw.trim();
            if (!raw) {
                result.push('');
                continue;
            }
            while (raw.length > maxLen) {
                let breakAt = raw.lastIndexOf(' ', maxLen);
                if (breakAt < maxLen * 0.5) breakAt = maxLen;
                result.push(raw.slice(0, breakAt).trim());
                raw = raw.slice(breakAt).trim();
            }
            if (raw) result.push(raw);
        }
        return result;
    }

    _applyLineTarget() {
        const available = this.lines.length;
        const use = Math.min(this.targetLines, available);
        this.displayText = this.lines.slice(0, use).join('\n');
        this.actualTargetLines = use;
        this.warningFewLines = available < this.targetLines;
    }

    reset() {
        this.currentIndex = 0;
        this.started = false;
        this.completed = false;
        this.startTime = null;
        this.correctChars = 0;
        this.incorrectChars = 0;
        this.totalTyped = 0;
        this._results = [];

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        if (this.typingInput) {
            this.typingInput.value = '';
            this.typingInput.disabled = false;
            this.typingInput.focus();
        }

        this._render();
        this._updateLiveStats();
        this._emitProgress();
    }

    _onKeyDown(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            return;
        }

        // Play sound immediately on keydown (more reliable than input event)
        if (this.completed) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        const key = e.key;
        // Single printable character (letter, number, punctuation, space)
        if (key.length === 1) {
            this._playSound(key);
        }
    }

    _onInput(e) {
        if (this.completed) return;

        const value = this.typingInput.value;
        if (!value) return;

        if (!this.started) {
            this.started = true;
            this.startTime = Date.now();
            this.timerInterval = setInterval(() => this._updateLiveStats(), 200);
        }

        const expected = this.displayText;
        const chars = value.split('');
        this.typingInput.value = '';

        for (const ch of chars) {
            if (this.currentIndex >= expected.length) break;

            const expectedChar = expected[this.currentIndex];
            this.totalTyped++;

            const isCorrect = ch === expectedChar;
            if (isCorrect) {
                this.correctChars++;
            } else {
                this.incorrectChars++;
            }
            this._results[this.currentIndex] = isCorrect;
            this.currentIndex++;

            if (this.currentIndex >= expected.length) {
                this._complete();
                break;
            }
        }

        this._render();
        this._updateLiveStats();
        this._emitProgress();
    }

    _complete() {
        this.completed = true;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.typingInput) {
            this.typingInput.disabled = true;
        }
        this._emitComplete();
    }

    _render() {
        if (!this.textDisplay) return;

        const text = this.displayText;
        const idx = this.currentIndex;
        let html = '';

        for (let i = 0; i < text.length; i++) {
            let cls = 'char pending';
            if (i < idx) {
                cls = this._charClass(i);
            } else if (i === idx && !this.completed) {
                cls = this.highlightEnabled ? 'char current' : 'char pending';
            }

            const ch = text[i];
            if (ch === '\n') {
                html += `<span class="${cls}">\n</span>`;
            } else if (ch === ' ') {
                html += `<span class="${cls}"> </span>`;
            } else {
                html += `<span class="${cls}">${this._escape(ch)}</span>`;
            }
        }

        this.textDisplay.innerHTML = html || '<span class="pending">No text loaded.</span>';

        const currentEl = this.textDisplay.querySelector('.char.current');
        if (currentEl) {
            currentEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }

    _charClass(i) {
        if (this._results[i] === true) return 'char correct';
        if (this._results[i] === false) return 'char incorrect';
        return 'char pending';
    }

    _escape(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    _elapsedMinutes() {
        if (!this.startTime) return 0;
        return (Date.now() - this.startTime) / 60000;
    }

    _elapsedSeconds() {
        if (!this.startTime) return 0;
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    getStats() {
        const minutes = this._elapsedMinutes() || 0.001;
        const netWpm = Math.round((this.correctChars / 5) / minutes);
        const grossWpm = Math.round((this.totalTyped / 5) / minutes);
        const accuracy = this.totalTyped === 0
            ? 100
            : Math.round((this.correctChars / this.totalTyped) * 100);

        const completedLines = this._countCompletedLines();

        return {
            netWpm,
            grossWpm,
            accuracy,
            correctChars: this.correctChars,
            incorrectChars: this.incorrectChars,
            totalTyped: this.totalTyped,
            timeSeconds: this._elapsedSeconds(),
            completedLines,
            targetLines: this.actualTargetLines || this.targetLines,
            progressPercent: Math.round((this.currentIndex / Math.max(1, this.displayText.length)) * 100),
            warningFewLines: this.warningFewLines
        };
    }

    _countCompletedLines() {
        if (!this.displayText) return 0;
        const typedPortion = this.displayText.slice(0, this.currentIndex);
        const lines = typedPortion.split('\n');
        if (this.currentIndex < this.displayText.length && !typedPortion.endsWith('\n')) {
            return Math.max(0, lines.length - 1);
        }
        return lines.length;
    }

    _updateLiveStats() {
        const stats = this.getStats();
        const fmt = (s) => {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return `${m}:${sec.toString().padStart(2, '0')}`;
        };

        const el = (id) => document.getElementById(id);
        if (el('liveWpm')) el('liveWpm').textContent = stats.netWpm;
        if (el('liveAccuracy')) el('liveAccuracy').textContent = stats.accuracy + '%';
        if (el('liveTimer')) el('liveTimer').textContent = fmt(stats.timeSeconds);
        if (el('statCorrect')) el('statCorrect').textContent = stats.correctChars;
        if (el('statIncorrect')) el('statIncorrect').textContent = stats.incorrectChars;
        if (el('statTotal')) el('statTotal').textContent = stats.totalTyped;
    }

    _emitProgress() {
        const stats = this.getStats();
        document.dispatchEvent(new CustomEvent('typing-progress', { detail: stats }));
    }

    _emitComplete() {
        const stats = this.getStats();
        document.dispatchEvent(new CustomEvent('typing-complete', { detail: stats }));
    }
}

window.TypingEngine = TypingEngine;
