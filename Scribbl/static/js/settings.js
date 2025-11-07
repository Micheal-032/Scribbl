// static/js/settings.js
// Appearance, Editor, Behavior Settings Module for Scribbl

class SettingsManager {
    constructor() {
        this.settings = {
            appearance: {
                theme: 'auto',
                fontScale: 1.0,
                layout: 'grid',
                density: 'comfortable',
                accentColor: '#5b5fe9'
            },
            editor: {
                autosave: true,
                autosaveInterval: 5,
                richtext: true,
                spellcheck: true,
                wordcount: true,
                defaultFont: 'inter',
                fontSize: 16,
                lineHeight: 1.6
            },
            behavior: {
                startupAction: 'last',
                recentFiles: true,
                saveNotify: true,
                backupNotify: true,
                smoothScroll: true,
                animations: true
            }
        };
        
        this.currentPanel = 'appearance';
        this.isInitialized = false;
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.bindEvents();
        this.initializeUI();
        this.isInitialized = true;
        
        this.emitEvent('settings:ready');
    }

    async loadSettings() {
        try {
            const stored = localStorage.getItem('scribbl-settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.settings = this.deepMerge(this.settings, parsed);
            }

            if (typeof window.utils !== 'undefined' && typeof window.utils.get === 'function') {
                try {
                    const dbSettings = await window.utils.get('settings', 'global');
                    if (dbSettings) {
                        this.settings = this.deepMerge(this.settings, dbSettings);
                    }
                } catch (error) {
                    console.warn('Failed to load settings from IndexedDB:', error);
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showToast('Error loading settings', 'error');
        }
    }

    async saveSettings() {
        try {
            localStorage.setItem('scribbl-settings', JSON.stringify(this.settings));

            if (typeof window.utils !== 'undefined' && typeof window.utils.put === 'function') {
                try {
                    await window.utils.put('settings', {
                        id: 'global',
                        ...this.settings
                    });
                } catch (error) {
                    console.warn('Failed to save settings to IndexedDB:', error);
                }
            }

            this.emitEvent('settings:changed', this.settings);
            this.showToast('Settings saved', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showToast('Error saving settings', 'error');
        }
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const panel = e.currentTarget.dataset.panel;
                this.switchPanel(panel);
            });
        });

        // Appearance Settings
        this.bindThemeSelection();
        this.bindColorSelection();
        this.bindSlider('fontScale', 'appearance.fontScale', value => {
            document.getElementById('fontScaleValue').textContent = Math.round(value * 100) + '%';
            this.applyFontScale(value);
            this.updatePreview();
        });
        this.bindSelect('layoutSelect', 'appearance.layout');
        this.bindSelect('densitySelect', 'appearance.density');

        // Editor Settings
        this.bindToggle('autosaveToggle', 'editor.autosave');
        this.bindSlider('autosaveInterval', 'editor.autosaveInterval', value => {
            document.getElementById('autosaveIntervalValue').textContent = value + ' seconds';
        });
        this.bindToggle('richtextToggle', 'editor.richtext');
        this.bindToggle('spellcheckToggle', 'editor.spellcheck');
        this.bindToggle('wordcountToggle', 'editor.wordcount');
        this.bindSelect('defaultFont', 'editor.defaultFont', value => {
            this.applyFontFamily(value);
            this.updatePreview();
        });
        this.bindSlider('fontSize', 'editor.fontSize', value => {
            document.getElementById('fontSizeValue').textContent = value + 'px';
            this.applyFontSize(value);
            this.updatePreview();
        });
        this.bindSlider('lineHeight', 'editor.lineHeight', value => {
            document.getElementById('lineHeightValue').textContent = value.toFixed(1);
            this.applyLineHeight(value);
            this.updatePreview();
        });

        // Behavior Settings
        this.bindSelect('startupAction', 'behavior.startupAction');
        this.bindToggle('recentFilesToggle', 'behavior.recentFiles');
        this.bindToggle('saveNotifyToggle', 'behavior.saveNotify');
        this.bindToggle('backupNotifyToggle', 'behavior.backupNotify');
        this.bindToggle('smoothScrollToggle', 'behavior.smoothScroll');
        this.bindToggle('animationsToggle', 'behavior.animations');
    }

    bindThemeSelection() {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.setTheme(theme);
                
                // Update UI
                document.querySelectorAll('.theme-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                e.currentTarget.classList.add('active');
            });
        });

        // Set initial active theme
        const currentTheme = this.settings.appearance.theme;
        document.querySelector(`[data-theme="${currentTheme}"]`).classList.add('active');
    }

    bindColorSelection() {
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const color = e.currentTarget.dataset.color;
                this.setAccentColor(color);
                
                // Update UI
                document.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                e.currentTarget.classList.add('active');
            });
        });

        // Set initial active color
        const currentColor = this.settings.appearance.accentColor;
        document.querySelector(`[data-color="${currentColor}"]`).classList.add('active');
    }

    bindSlider(sliderId, settingPath, onUpdate = null) {
        const slider = document.getElementById(sliderId);
        if (!slider) return;

        slider.addEventListener('input', (e) => {
            const value = e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value;
            this.setSetting(settingPath, value);
            if (onUpdate) onUpdate(value);
        });

        // Set initial value
        const currentValue = this.getSetting(settingPath);
        slider.value = currentValue;
        if (onUpdate) onUpdate(currentValue);
    }

    bindToggle(toggleId, settingPath) {
        const toggle = document.getElementById(toggleId);
        if (!toggle) return;

        toggle.addEventListener('change', (e) => {
            this.setSetting(settingPath, e.target.checked);
        });

        toggle.checked = this.getSetting(settingPath);
    }

    bindSelect(selectId, settingPath, onUpdate = null) {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.addEventListener('change', (e) => {
            this.setSetting(settingPath, e.target.value);
            if (onUpdate) onUpdate(e.target.value);
        });

        const currentValue = this.getSetting(settingPath);
        select.value = currentValue;
        if (onUpdate) onUpdate(currentValue);
    }

    initializeUI() {
        this.switchPanel(this.currentPanel);
        
        // Apply all settings to UI
        this.applyTheme(this.settings.appearance.theme);
        this.applyAccentColor(this.settings.appearance.accentColor);
        this.applyFontScale(this.settings.appearance.fontScale);
        this.applyFontFamily(this.settings.editor.defaultFont);
        this.applyFontSize(this.settings.editor.fontSize);
        this.applyLineHeight(this.settings.editor.lineHeight);
        
        this.updatePreview();
    }

    switchPanel(panelId) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-panel="${panelId}"]`).classList.add('active');

        document.querySelectorAll('.settings-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(panelId).classList.add('active');

        this.currentPanel = panelId;
    }

    setTheme(theme) {
        this.setSetting('appearance.theme', theme);
        this.applyTheme(theme);
        this.updatePreview();
    }

    applyTheme(theme) {
        const html = document.documentElement;
        const body = document.body;

        body.classList.remove('dark', 'light');

        if (theme === 'auto') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                body.classList.add('dark');
            } else {
                body.classList.add('light');
            }
            html.setAttribute('data-theme', 'auto');
        } else {
            body.classList.add(theme);
            html.setAttribute('data-theme', theme);
        }

        this.emitEvent('settings:theme-changed', { theme });
    }

    setAccentColor(color) {
        this.setSetting('appearance.accentColor', color);
        this.applyAccentColor(color);
        this.updatePreview();
    }

    applyAccentColor(color) {
        document.documentElement.style.setProperty('--primary', color);
        
        // Calculate darker and lighter variants
        const darker = this.shadeColor(color, -20);
        const lighter = this.shadeColor(color, 20);
        const glow = color + '30';
        
        document.documentElement.style.setProperty('--primary-dark', darker);
        document.documentElement.style.setProperty('--primary-light', lighter);
        document.documentElement.style.setProperty('--primary-glow', glow);

        this.emitEvent('settings:accent-color-changed', { color });
    }

    applyFontScale(scale) {
        document.documentElement.style.setProperty('--base-font-scale', scale);
        document.body.style.fontSize = (16 * scale) + 'px';
        this.emitEvent('settings:font-scale-changed', { scale });
    }

    applyFontFamily(font) {
        let fontFamily;
        switch (font) {
            case 'inter':
                fontFamily = 'Inter, system-ui, sans-serif';
                break;
            case 'system':
                fontFamily = 'system-ui, -apple-system, sans-serif';
                break;
            case 'georgia':
                fontFamily = 'Georgia, serif';
                break;
            case 'times':
                fontFamily = 'Times New Roman, serif';
                break;
            case 'arial':
                fontFamily = 'Arial, sans-serif';
                break;
            case 'monospace':
                fontFamily = 'Monaco, Consolas, monospace';
                break;
            default:
                fontFamily = 'Inter, system-ui, sans-serif';
        }
        
        document.documentElement.style.setProperty('--font-family', fontFamily);
        this.emitEvent('settings:font-family-changed', { font });
    }

    applyFontSize(size) {
        document.documentElement.style.setProperty('--editor-font-size', size + 'px');
        this.emitEvent('settings:font-size-changed', { size });
    }

    applyLineHeight(height) {
        document.documentElement.style.setProperty('--editor-line-height', height);
        this.emitEvent('settings:line-height-changed', { height });
    }

    updatePreview() {
        // Update appearance preview
        const previewCard = document.querySelector('.preview-card');
        if (previewCard) {
            previewCard.style.fontFamily = 'var(--font-family, Inter)';
            previewCard.style.fontSize = 'var(--editor-font-size, 16px)';
            previewCard.style.lineHeight = 'var(--editor-line-height, 1.6)';
        }

        // Update editor preview
        const previewText = document.querySelector('.preview-text');
        if (previewText) {
            previewText.style.fontFamily = 'var(--font-family, Inter)';
            previewText.style.fontSize = 'var(--editor-font-size, 16px)';
            previewText.style.lineHeight = 'var(--editor-line-height, 1.6)';
        }
    }

    setSetting(path, value) {
        const keys = path.split('.');
        let current = this.settings;
        
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        this.saveSettings();
    }

    getSetting(path) {
        const keys = path.split('.');
        let current = this.settings;
        
        for (const key of keys) {
            if (current[key] === undefined) return undefined;
            current = current[key];
        }
        
        return current;
    }

    // Utility methods
    deepMerge(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                this.deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    shadeColor(color, percent) {
        let R = parseInt(color.substring(1, 3), 16);
        let G = parseInt(color.substring(3, 5), 16);
        let B = parseInt(color.substring(5, 7), 16);

        R = parseInt(R * (100 + percent) / 100);
        G = parseInt(G * (100 + percent) / 100);
        B = parseInt(B * (100 + percent) / 100);

        R = (R < 255) ? R : 255;
        G = (G < 255) ? G : 255;
        B = (B < 255) ? B : 255;

        const RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
        const GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
        const BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

        return "#" + RR + GG + BB;
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('feedbackToast');
        const messageEl = document.getElementById('toastMessage');
        
        messageEl.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 4000);
    }

    emitEvent(name, detail = {}) {
        const event = new CustomEvent(name, { detail });
        window.dispatchEvent(event);
    }
}

// Initialize settings manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsManager;
}