// static/js/secure.js

class SecureNotesManager {
    constructor() {
        this.secureNotes = JSON.parse(localStorage.getItem('secureNotes')) || [];
        this.securitySettings = JSON.parse(localStorage.getItem('securitySettings')) || {
            autoLockTimer: 5,
            failedAttempts: 0,
            lastAccess: new Date().toISOString(),
            lockUntil: null,
            sessionTimeout: 300 // 5 minutes
        };
        this.currentPattern = [];
        this.currentPin = '';
        this.currentPassword = '';
        this.selectedMethod = null;
        this.currentNoteId = null;
        this.failedUnlockAttempts = 0;
        this.maxAttempts = 5;
        this.lockDuration = 30000; // 30 seconds lockout
        this.unlockedNotes = new Map(); // Track unlocked notes with timestamps
        this.sessionTimer = null;
        this.isDrawing = false;
        this.isUnlockDrawing = false;
        
        this.init();
    }

    init() {
        this.createSecurityBackground();
        this.bindEvents();
        this.loadSecureNotes();
        this.updateSecurityDashboard();
        this.initPatternGrid();
        this.checkAutoLock();
        this.startSecurityMonitor();
        this.startSessionTimer();
    }

    createSecurityBackground() {
        const container = document.querySelector('.encryption-particles');
        if (!container) return;
        
        const particleCount = 30;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'encryption-particle';
            
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const size = Math.random() * 3 + 1;
            const delay = Math.random() * 20;
            
            particle.style.cssText = `
                left: ${posX}%;
                top: ${posY}%;
                width: ${size}px;
                height: ${size}px;
                animation-delay: -${delay}s;
                background: var(--security-primary);
            `;
            
            container.appendChild(particle);
        }
    }

    bindEvents() {
        // Modal controls
        this.safeAddEventListener('newSecureNoteBtn', 'click', () => this.openSecurityMethodModal());
        this.safeAddEventListener('closeMethodModal', 'click', () => this.closeSecurityMethodModal());
        this.safeAddEventListener('cancelMethod', 'click', () => this.closeSecurityMethodModal());

        // Pattern setup
        this.safeAddEventListener('resetPattern', 'click', () => this.resetPattern());
        this.safeAddEventListener('backToMethods', 'click', () => this.backToMethodSelection());
        this.safeAddEventListener('confirmPattern', 'click', () => this.confirmPattern());

        // PIN setup
        this.safeAddEventListener('backToMethodsPin', 'click', () => this.backToMethodSelection());
        this.safeAddEventListener('confirmPin', 'click', () => this.confirmPin());
        
        // PIN input events
        this.safeAddEventListener('pinTextInput', 'input', (e) => this.handlePinInput(e));
        this.safeAddEventListener('pinTextUnlock', 'input', (e) => this.handlePinUnlockInput(e));

        // Password setup
        this.safeAddEventListener('backToMethodsPassword', 'click', () => this.backToMethodSelection());
        this.safeAddEventListener('confirmPassword', 'click', () => this.confirmPassword());
        this.safeAddEventListener('passwordInput', 'input', (e) => this.handlePasswordInput(e));
        this.safeAddEventListener('confirmPasswordInput', 'input', (e) => this.handlePasswordInput(e));

        // Secure note form
        this.safeAddEventListener('closeSecureModal', 'click', () => this.closeSecureNoteModal());
        this.safeAddEventListener('cancelSecureNote', 'click', () => this.closeSecureNoteModal());
        this.safeAddEventListener('secureNoteForm', 'submit', (e) => this.saveSecureNote(e));

        // Character counters
        this.safeAddEventListener('secureTitle', 'input', (e) => this.updateCharCount(e, 'titleCharCount', 100));
        this.safeAddEventListener('secureContent', 'input', (e) => this.updateCharCount(e, 'contentCharCount', 10000));

        // Auto-lock settings
        this.safeAddEventListener('autoLockTimer', 'change', (e) => this.updateAutoLockTimer(e));
        this.safeAddEventListener('lockNowBtn', 'click', () => this.lockAllNotes());

        // Quick actions
        this.safeAddEventListener('lockAllBtn', 'click', () => this.lockAllNotes());
        this.safeAddEventListener('exportSecureBtn', 'click', () => this.exportSecureNotes());
        this.safeAddEventListener('securitySettingsBtn', 'click', () => this.openSecuritySettings());

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleView(e.target));
        });

        // Method selection
        document.querySelectorAll('.method-card').forEach(card => {
            card.addEventListener('click', () => this.selectSecurityMethod(card.dataset.method));
        });

        // Unlock modal
        this.safeAddEventListener('cancelUnlock', 'click', () => this.cancelUnlock());
        this.safeAddEventListener('confirmUnlock', 'click', () => this.confirmUnlock());

        // Note viewer
        this.safeAddEventListener('closeViewerModal', 'click', () => this.closeNoteViewer());
        this.safeAddEventListener('closeViewer', 'click', () => this.closeNoteViewer());
        this.safeAddEventListener('editNoteBtn', 'click', () => this.editCurrentNote());
        this.safeAddEventListener('copyContentBtn', 'click', () => this.copyNoteContent());
        this.safeAddEventListener('lockNoteBtn', 'click', () => this.lockCurrentNote());
        this.safeAddEventListener('exportNoteBtn', 'click', () => this.exportCurrentNote());

        // Note editor
        this.safeAddEventListener('closeEditorModal', 'click', () => this.closeNoteEditor());
        this.safeAddEventListener('cancelEdit', 'click', () => this.closeNoteEditor());
        this.safeAddEventListener('revertEdit', 'click', () => this.revertEdit());
        this.safeAddEventListener('noteEditorForm', 'submit', (e) => this.saveEditedNote(e));
        this.safeAddEventListener('editTitle', 'input', (e) => this.updateCharCount(e, 'editTitleCharCount', 100));
        this.safeAddEventListener('editContent', 'input', (e) => this.updateCharCount(e, 'editContentCharCount', 10000));

        // Search
        this.safeAddEventListener('secureSearch', 'input', (e) => this.searchNotes(e.target.value));
    }

    safeAddEventListener(id, event, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    loadSecureNotes() {
        const container = document.getElementById('secureNoteList');
        const emptyState = document.getElementById('emptySecureState');

        if (!container || !emptyState) return;

        if (this.secureNotes.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'grid';
        emptyState.style.display = 'none';
        container.innerHTML = '';

        this.secureNotes.forEach(note => {
            const noteCard = this.createSecureNoteCard(note);
            container.appendChild(noteCard);
        });
    }

    createSecureNoteCard(note) {
        const card = document.createElement('div');
        card.className = `secure-note-card ${this.unlockedNotes.has(note.id) ? 'unlocked' : ''}`;
        card.dataset.noteId = note.id;

        const isUnlocked = this.unlockedNotes.has(note.id);
        const contentPreview = isUnlocked ? 
            this.generateDecryptedPreview(note.content) : 
            this.generateEncryptedPreview();
        
        const formattedDate = this.formatDate(note.createdAt);

        card.innerHTML = `
            <div class="note-card-header">
                <h3 class="note-title">${this.escapeHtml(note.title)}</h3>
                <div class="note-lock">${isUnlocked ? '🔓' : this.getMethodIcon(note.security.method)}</div>
            </div>
            <div class="note-content">
                <div class="${isUnlocked ? 'decrypted-preview' : 'encrypted-content'}">
                    ${contentPreview}
                </div>
            </div>
            <div class="note-meta">
                <div class="note-date">
                    <span>📅</span>
                    <span>${formattedDate}</span>
                </div>
                <div class="note-actions">
                    <button class="note-action-btn ${isUnlocked ? 'unlocked' : ''}" 
                            onclick="secureManager.${isUnlocked ? 'viewNote' : 'unlockNote'}('${note.id}')" 
                            title="${isUnlocked ? 'View Note' : 'Unlock Note'}">
                        ${isUnlocked ? '👁️' : '🔓'}
                    </button>
                    ${isUnlocked ? `
                    <button class="note-action-btn unlocked" onclick="secureManager.editNote('${note.id}')" title="Edit Note">
                        ✏️
                    </button>
                    ` : ''}
                    <button class="note-action-btn" onclick="secureManager.deleteSecureNote('${note.id}')" title="Delete Note">
                        🗑️
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    generateEncryptedPreview() {
        const words = ['Encrypted', 'Secure', 'Protected', 'Locked'];
        const randomWord = words[Math.floor(Math.random() * words.length)];
        return `🔒 ${randomWord} Content • Secure Storage`;
    }

    generateDecryptedPreview(content) {
        // Show first 100 characters of content
        const preview = content ? content.substring(0, 100) : 'No content';
        return preview + (content && content.length > 100 ? '...' : '');
    }

    getMethodIcon(method) {
        const icons = {
            pattern: '🔷',
            pin: '🔢',
            password: '🔑'
        };
        return icons[method] || '🔒';
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));

            if (days === 0) return 'Today';
            if (days === 1) return 'Yesterday';
            if (days < 7) return `${days} days ago`;
            return date.toLocaleDateString();
        } catch (e) {
            return 'Unknown date';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateSecurityDashboard() {
        this.safeSetText('totalSecureNotes', this.secureNotes.length);
        this.safeSetText('lockedNotes', this.secureNotes.length - this.unlockedNotes.size);
        this.safeSetText('failedAttempts', this.securitySettings.failedAttempts);
        this.safeSetText('activeSessions', this.unlockedNotes.size);
        this.safeSetText('secureNotesCount', `${this.secureNotes.length} notes`);
        this.safeSetText('unlockedNotesCount', `${this.unlockedNotes.size} unlocked`);
        
        const totalSize = this.calculateEncryptedSize();
        this.safeSetText('encryptedSize', `${totalSize} KB encrypted`);
        
        // Update auto-lock timer
        const timerSelect = document.getElementById('autoLockTimer');
        if (timerSelect) {
            timerSelect.value = this.securitySettings.autoLockTimer;
        }

        // Update session indicator
        this.updateSessionIndicator();
    }

    safeSetText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }

    calculateEncryptedSize() {
        const jsonString = JSON.stringify(this.secureNotes);
        const bytes = new TextEncoder().encode(jsonString).length;
        return Math.round(bytes / 1024);
    }

    updateSessionIndicator() {
        const indicator = document.getElementById('sessionIndicator');
        if (indicator) {
            if (this.unlockedNotes.size > 0) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        }
    }

    openSecurityMethodModal() {
        if (this.isLockedOut()) {
            this.showSecurityAlert('Too many failed attempts. Please wait before trying again.');
            return;
        }

        this.showModal('securityMethodModal');
    }

    closeSecurityMethodModal() {
        this.hideModal('securityMethodModal');
        this.selectedMethod = null;
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    selectSecurityMethod(method) {
        this.selectedMethod = method;
        
        this.hideModal('securityMethodModal');
        
        switch (method) {
            case 'pattern':
                this.openPatternSetup();
                break;
            case 'pin':
                this.openPinSetup();
                break;
            case 'password':
                this.openPasswordSetup();
                break;
        }
    }

    backToMethodSelection() {
        this.hideModal('patternLockModal');
        this.hideModal('pinSetupModal');
        this.hideModal('passwordSetupModal');
        this.openSecurityMethodModal();
    }

    // Pattern Lock System
    initPatternGrid() {
        const grid = document.getElementById('patternGrid');
        if (!grid) return;

        grid.innerHTML = '';

        for (let i = 0; i < 16; i++) {
            const dot = document.createElement('div');
            dot.className = 'pattern-dot';
            dot.dataset.index = i;
            
            dot.addEventListener('mousedown', () => this.startPatternDraw(i));
            dot.addEventListener('mouseenter', () => this.addToPattern(i));
            dot.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startPatternDraw(i);
            });

            grid.appendChild(dot);
        }

        // Add touch/mouse move listeners
        grid.addEventListener('mousemove', (e) => this.handlePatternDraw(e));
        grid.addEventListener('touchmove', (e) => this.handlePatternDraw(e));
        grid.addEventListener('mouseup', () => this.endPatternDraw());
        grid.addEventListener('mouseleave', () => this.endPatternDraw());
        grid.addEventListener('touchend', () => this.endPatternDraw());
    }

    startPatternDraw(index) {
        this.currentPattern = [index];
        this.updatePatternGrid();
        this.isDrawing = true;
    }

    addToPattern(index) {
        if (!this.isDrawing || this.currentPattern.includes(index)) return;
        
        this.currentPattern.push(index);
        this.updatePatternGrid();
        this.updatePatternStrength();
    }

    handlePatternDraw(e) {
        if (!this.isDrawing) return;

        const rect = document.getElementById('patternGrid').getBoundingClientRect();
        const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
        const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

        // Find which dot we're hovering over
        const dotSize = 50;
        const gap = 15;
        const totalSize = dotSize + gap;
        
        const col = Math.floor(x / totalSize);
        const row = Math.floor(y / totalSize);
        const index = row * 4 + col;

        if (index >= 0 && index < 16 && !this.currentPattern.includes(index)) {
            this.addToPattern(index);
        }
    }

    endPatternDraw() {
        this.isDrawing = false;
        this.enablePatternConfirm();
    }

    updatePatternGrid() {
        const dots = document.querySelectorAll('.pattern-dot');
        dots.forEach((dot, index) => {
            if (this.currentPattern.includes(index)) {
                dot.classList.add('active', 'visited');
            } else {
                dot.classList.remove('active', 'visited');
            }
        });
    }

    updatePatternStrength() {
        const strengthBar = document.getElementById('patternStrengthBar');
        const strengthText = document.getElementById('patternStrengthText');
        const patternHint = document.getElementById('patternHint');

        if (!strengthBar || !strengthText || !patternHint) return;

        const length = this.currentPattern.length;
        let strength = 0;
        let text = 'Weak';
        let hint = 'Draw your pattern';

        if (length >= 4) {
            strength = Math.min((length - 3) / 5, 1); // 4-8 dots = 0-100%
            
            if (length >= 6) {
                text = 'Strong';
                hint = 'Great! Complex pattern';
            } else if (length >= 4) {
                text = 'Good';
                hint = 'Good pattern strength';
            }
        } else {
            hint = `Connect ${4 - length} more dots`;
        }

        strengthBar.style.width = `${strength * 100}%`;
        strengthText.textContent = text;
        strengthText.className = `strength-text ${text.toLowerCase()}`;
        patternHint.textContent = hint;
    }

    enablePatternConfirm() {
        const confirmBtn = document.getElementById('confirmPattern');
        if (!confirmBtn) return;
        
        const isValid = this.currentPattern.length >= 4;
        
        confirmBtn.disabled = !isValid;
        if (isValid) {
            confirmBtn.classList.add('enabled');
        } else {
            confirmBtn.classList.remove('enabled');
        }
    }

    resetPattern() {
        this.currentPattern = [];
        this.updatePatternGrid();
        this.updatePatternStrength();
        this.enablePatternConfirm();
    }

    confirmPattern() {
        if (this.currentPattern.length < 4) {
            this.showSecurityAlert('Please connect at least 4 dots for security');
            return;
        }

        this.securityData = {
            method: 'pattern',
            pattern: [...this.currentPattern]
        };

        this.hideModal('patternLockModal');
        this.openSecureNoteEditor();
    }

    // PIN System with Text Input
    handlePinInput(e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        value = value.substring(0, 4); // Limit to 4 digits
        e.target.value = value;
        
        this.currentPin = value;
        this.enablePinConfirm();
        
        // Update feedback
        const feedback = document.getElementById('pinFeedback');
        if (feedback) {
            if (value.length === 4) {
                if (this.isWeakPin(value)) {
                    feedback.textContent = 'Weak PIN - try a more complex sequence';
                    feedback.style.color = 'var(--security-warning)';
                } else {
                    feedback.textContent = 'Good PIN';
                    feedback.style.color = 'var(--security-success)';
                }
            } else {
                feedback.textContent = `${4 - value.length} digits remaining`;
                feedback.style.color = 'var(--security-text-muted)';
            }
        }
    }

    handlePinUnlockInput(e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        value = value.substring(0, 4); // Limit to 4 digits
        e.target.value = value;
        
        this.currentUnlockPin = value;
        
        // Auto-submit when 4 digits entered
        if (value.length === 4) {
            this.validateUnlockPin();
        }
    }

    enablePinConfirm() {
        const confirmBtn = document.getElementById('confirmPin');
        if (!confirmBtn) return;
        
        const isValid = this.currentPin.length === 4;
        
        confirmBtn.disabled = !isValid;
        if (isValid) {
            confirmBtn.classList.add('enabled');
        } else {
            confirmBtn.classList.remove('enabled');
        }
    }

    confirmPin() {
        if (this.currentPin.length !== 4) {
            this.showSecurityAlert('Please enter a 4-digit PIN');
            return;
        }

        // Check for weak PINs
        if (this.isWeakPin(this.currentPin)) {
            this.showSecurityAlert('Please choose a stronger PIN. Avoid simple sequences.');
            return;
        }

        this.securityData = {
            method: 'pin',
            pin: this.currentPin
        };

        this.hideModal('pinSetupModal');
        this.openSecureNoteEditor();
    }

    isWeakPin(pin) {
        const weakPins = [
            '1234', '0000', '1111', '2222', '3333', '4444', '5555',
            '6666', '7777', '8888', '9999', '1212', '2000', '2001'
        ];
        
        return weakPins.includes(pin) || 
               pin === pin.split('').reverse().join('') || // Palindrome
               new Set(pin).size === 1; // All same digits
    }

    // Password System
    handlePasswordInput(e) {
        const password = document.getElementById('passwordInput').value;
        const confirmPassword = document.getElementById('confirmPasswordInput').value;
        
        this.currentPassword = password;
        
        this.enablePasswordConfirm();
        
        // Update feedback
        const feedback = document.getElementById('passwordFeedback');
        if (feedback) {
            if (password.length > 0) {
                if (password.length < 6) {
                    feedback.textContent = 'Password should be at least 6 characters';
                    feedback.style.color = 'var(--security-warning)';
                } else if (confirmPassword && password !== confirmPassword) {
                    feedback.textContent = 'Passwords do not match';
                    feedback.style.color = 'var(--security-danger)';
                } else if (confirmPassword && password === confirmPassword) {
                    feedback.textContent = 'Passwords match';
                    feedback.style.color = 'var(--security-success)';
                } else {
                    feedback.textContent = 'Good password strength';
                    feedback.style.color = 'var(--security-success)';
                }
            } else {
                feedback.textContent = 'Enter a secure password';
                feedback.style.color = 'var(--security-text-muted)';
            }
        }
    }

    enablePasswordConfirm() {
        const confirmBtn = document.getElementById('confirmPassword');
        if (!confirmBtn) return;
        
        const password = document.getElementById('passwordInput').value;
        const confirmPassword = document.getElementById('confirmPasswordInput').value;
        
        const isValid = password.length >= 6 && password === confirmPassword;
        
        confirmBtn.disabled = !isValid;
        if (isValid) {
            confirmBtn.classList.add('enabled');
        } else {
            confirmBtn.classList.remove('enabled');
        }
    }

    confirmPassword() {
        const password = document.getElementById('passwordInput').value;
        const confirmPassword = document.getElementById('confirmPasswordInput').value;

        if (password.length < 6) {
            this.showSecurityAlert('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            this.showSecurityAlert('Passwords do not match');
            return;
        }

        this.securityData = {
            method: 'password',
            password: password
        };

        this.hideModal('passwordSetupModal');
        this.openSecureNoteEditor();
    }

    openPatternSetup() {
        this.resetPattern();
        this.showModal('patternLockModal');
    }

    openPinSetup() {
        this.currentPin = '';
        const pinInput = document.getElementById('pinTextInput');
        const feedback = document.getElementById('pinFeedback');
        if (pinInput) {
            pinInput.value = '';
            pinInput.focus();
        }
        if (feedback) {
            feedback.textContent = 'Enter 4-digit PIN using keyboard';
            feedback.style.color = 'var(--security-text-muted)';
        }
        this.showModal('pinSetupModal');
    }

    openPasswordSetup() {
        this.currentPassword = '';
        const passwordInput = document.getElementById('passwordInput');
        const confirmInput = document.getElementById('confirmPasswordInput');
        const feedback = document.getElementById('passwordFeedback');
        
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }
        if (confirmInput) {
            confirmInput.value = '';
        }
        if (feedback) {
            feedback.textContent = 'Create a secure password';
            feedback.style.color = 'var(--security-text-muted)';
        }
        this.showModal('passwordSetupModal');
    }

    openSecureNoteEditor() {
        const modalTitle = document.getElementById('modalTitle');
        const methodIcon = document.getElementById('methodIcon');
        const methodText = document.getElementById('securityMethodText');

        if (modalTitle) modalTitle.textContent = 'New Secure Note';
        if (methodIcon) methodIcon.textContent = this.getMethodIcon(this.selectedMethod);
        if (methodText) methodText.textContent = this.getMethodDisplayText(this.selectedMethod);

        // Clear form
        const titleInput = document.getElementById('secureTitle');
        const contentInput = document.getElementById('secureContent');
        if (titleInput) titleInput.value = '';
        if (contentInput) contentInput.value = '';
        
        this.updateCharCount({ target: titleInput }, 'titleCharCount', 100);
        this.updateCharCount({ target: contentInput }, 'contentCharCount', 10000);

        this.showModal('secureNoteModal');
    }

    getMethodDisplayText(method) {
        const texts = {
            pattern: 'Pattern Protected',
            pin: 'PIN Protected', 
            password: 'Password Protected'
        };
        return texts[method] || 'Secure';
    }

    closeSecureNoteModal() {
        this.hideModal('secureNoteModal');
        this.securityData = null;
        this.selectedMethod = null;
    }

    updateCharCount(e, countElementId, maxLength) {
        if (!e || !e.target) return;
        
        const count = e.target.value ? e.target.value.length : 0;
        const countElement = document.getElementById(countElementId);
        if (countElement) {
            countElement.textContent = count;
            
            if (count > maxLength * 0.8) {
                countElement.style.color = 'var(--security-warning)';
            } else {
                countElement.style.color = 'var(--security-text-muted)';
            }
        }
    }

    async saveSecureNote(e) {
        e.preventDefault();

        const titleInput = document.getElementById('secureTitle');
        const contentInput = document.getElementById('secureContent');
        
        if (!titleInput || !contentInput) return;

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title && !content) {
            this.showSecurityAlert('Please add a title or content for your note');
            return;
        }

        if (!this.securityData) {
            this.showSecurityAlert('Security configuration missing');
            return;
        }

        try {
            // Simulate saving process
            this.showSecurityNotification('💾 Saving secure note...', 'info');
            
            await this.delay(500);

            const secureNote = {
                id: Date.now().toString(),
                title: title || 'Secure Note',
                content: content, // Store content directly (no encryption for demo)
                security: this.securityData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isLocked: true
            };

            this.secureNotes.push(secureNote);
            localStorage.setItem('secureNotes', JSON.stringify(this.secureNotes));

            this.closeSecureNoteModal();
            this.loadSecureNotes();
            this.updateSecurityDashboard();
            
            this.showSecurityNotification('✅ Secure note saved successfully!', 'success');
            this.createSecurityConfetti();

        } catch (error) {
            this.showSecurityAlert('Error saving secure note: ' + error.message);
        }
    }

    // Unlock System
    unlockNote(noteId) {
        if (this.isLockedOut()) {
            this.showSecurityAlert('Too many failed attempts. Please wait before trying again.');
            return;
        }

        const note = this.secureNotes.find(n => n.id === noteId);
        if (!note) return;

        this.currentNoteId = noteId;
        this.currentUnlockMethod = note.security.method;
        this.currentUnlockData = note.security;

        this.setupUnlockModal(note);
        this.showModal('unlockModal');
    }

    setupUnlockModal(note) {
        const methodText = document.getElementById('unlockMethodText');
        if (methodText) {
            const method = note.security.method;
            methodText.textContent = this.getUnlockMessage(method);
        }

        // Hide all unlock containers
        this.hideModal('patternUnlockContainer');
        this.hideModal('pinUnlockContainer');
        this.hideModal('passwordUnlockContainer');

        // Setup based on method
        switch (note.security.method) {
            case 'pattern':
                this.setupPatternUnlock();
                break;
            case 'pin':
                this.setupPinUnlock();
                break;
            case 'password':
                this.setupPasswordUnlock();
                break;
        }
    }

    getUnlockMessage(method) {
        const messages = {
            pattern: 'Draw your security pattern to unlock this note',
            pin: 'Enter your 4-digit PIN to unlock this note',
            password: 'Enter your password to unlock this note'
        };
        return messages[method] || 'Unlock this note';
    }

    setupPatternUnlock() {
        this.showModal('patternUnlockContainer');
        this.initUnlockPatternGrid();
        this.currentUnlockPattern = [];
    }

    setupPinUnlock() {
        this.showModal('pinUnlockContainer');
        this.currentUnlockPin = '';
        const pinInput = document.getElementById('pinTextUnlock');
        if (pinInput) {
            pinInput.value = '';
            pinInput.focus();
        }
        const feedback = document.getElementById('pinUnlockFeedback');
        if (feedback) {
            feedback.textContent = '';
        }
    }

    setupPasswordUnlock() {
        this.showModal('passwordUnlockContainer');
        const passwordInput = document.getElementById('passwordUnlockInput');
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }
        const feedback = document.getElementById('passwordUnlockFeedback');
        if (feedback) {
            feedback.textContent = '';
        }
    }

    initUnlockPatternGrid() {
        const grid = document.getElementById('patternUnlockGrid');
        if (!grid) return;

        grid.innerHTML = '';

        for (let i = 0; i < 16; i++) {
            const dot = document.createElement('div');
            dot.className = 'pattern-dot';
            dot.dataset.index = i;
            
            dot.addEventListener('mousedown', () => this.startUnlockPatternDraw(i));
            dot.addEventListener('mouseenter', () => this.addToUnlockPattern(i));

            grid.appendChild(dot);
        }

        grid.addEventListener('mouseup', () => this.validateUnlockPattern());
    }

    startUnlockPatternDraw(index) {
        this.currentUnlockPattern = [index];
        this.updateUnlockPatternGrid();
        this.isUnlockDrawing = true;
    }

    addToUnlockPattern(index) {
        if (!this.isUnlockDrawing || this.currentUnlockPattern.includes(index)) return;
        this.currentUnlockPattern.push(index);
        this.updateUnlockPatternGrid();
    }

    updateUnlockPatternGrid() {
        const dots = document.querySelectorAll('#patternUnlockGrid .pattern-dot');
        dots.forEach((dot, index) => {
            if (this.currentUnlockPattern.includes(index)) {
                dot.classList.add('active', 'visited');
            } else {
                dot.classList.remove('active', 'visited');
            }
        });
    }

    validateUnlockPattern() {
        this.isUnlockDrawing = false;
        
        const expectedPattern = this.currentUnlockData.pattern;
        const isMatch = this.arraysEqual(this.currentUnlockPattern, expectedPattern);

        if (isMatch) {
            this.unlockSuccess();
        } else {
            this.unlockFailure('Incorrect pattern. Please try again.');
            // Clear pattern for retry
            this.currentUnlockPattern = [];
            this.updateUnlockPatternGrid();
        }
    }

    validateUnlockPin() {
        const isMatch = this.currentUnlockPin === this.currentUnlockData.pin;

        if (isMatch) {
            this.unlockSuccess();
        } else {
            this.unlockFailure('Incorrect PIN. Please try again.');
            // Clear PIN for retry
            this.currentUnlockPin = '';
            const pinInput = document.getElementById('pinTextUnlock');
            if (pinInput) {
                pinInput.value = '';
                pinInput.focus();
            }
        }
    }

    validateUnlockPassword() {
        const passwordInput = document.getElementById('passwordUnlockInput');
        if (!passwordInput) return;
        
        const password = passwordInput.value;
        const isMatch = password === this.currentUnlockData.password;

        if (isMatch) {
            this.unlockSuccess();
        } else {
            this.unlockFailure('Incorrect password. Please try again.');
            // Clear password for retry
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    unlockSuccess() {
        this.failedUnlockAttempts = 0;
        this.securitySettings.failedAttempts = 0;
        localStorage.setItem('securitySettings', JSON.stringify(this.securitySettings));

        // Add note to unlocked notes with timestamp
        this.unlockedNotes.set(this.currentNoteId, Date.now());
        
        this.hideModal('unlockModal');
        this.showSecurityNotification('✅ Note unlocked successfully!', 'success');
        
        // Reload notes to show unlocked state
        this.loadSecureNotes();
        this.updateSecurityDashboard();
        
        // Automatically open the note viewer
        this.viewNote(this.currentNoteId);
    }

    unlockFailure(message) {
        this.failedUnlockAttempts++;
        this.securitySettings.failedAttempts = this.failedUnlockAttempts;
        localStorage.setItem('securitySettings', JSON.stringify(this.securitySettings));

        const feedback = document.getElementById(`${this.currentUnlockMethod}UnlockFeedback`);
        if (feedback) {
            feedback.textContent = message;
            feedback.style.color = 'var(--security-danger)';
        }

        this.updateSecurityDashboard();

        if (this.failedUnlockAttempts >= this.maxAttempts) {
            this.lockOutUser();
        }
    }

    lockOutUser() {
        this.securitySettings.lockUntil = Date.now() + this.lockDuration;
        localStorage.setItem('securitySettings', JSON.stringify(this.securitySettings));
        
        this.showSecurityAlert(`Too many failed attempts. Locked for ${this.lockDuration / 1000} seconds.`);
        
        setTimeout(() => {
            this.securitySettings.lockUntil = null;
            this.failedUnlockAttempts = 0;
            localStorage.setItem('securitySettings', JSON.stringify(this.securitySettings));
        }, this.lockDuration);
    }

    isLockedOut() {
        return this.securitySettings.lockUntil && Date.now() < this.securitySettings.lockUntil;
    }

    cancelUnlock() {
        this.hideModal('unlockModal');
        this.currentUnlockPattern = [];
        this.currentUnlockPin = '';
        this.currentNoteId = null;
    }

    confirmUnlock() {
        if (this.currentUnlockMethod === 'password') {
            this.validateUnlockPassword();
        }
    }

    // Note Viewing and Editing
    viewNote(noteId) {
        const note = this.secureNotes.find(n => n.id === noteId);
        if (!note || !this.unlockedNotes.has(noteId)) {
            this.showSecurityAlert('Note is locked. Please unlock it first.');
            return;
        }

        this.currentNoteId = noteId;

        // Populate viewer
        this.safeSetText('viewerTitle', note.title);
        this.safeSetText('viewerCreatedDate', this.formatDate(note.createdAt));
        this.safeSetText('viewerModifiedDate', this.formatDate(note.updatedAt));
        this.safeSetText('viewerSecurityMethod', this.getMethodDisplayText(note.security.method));
        this.safeSetText('noteContentText', note.content || 'No content');

        this.showModal('noteViewerModal');
    }

    closeNoteViewer() {
        this.hideModal('noteViewerModal');
        this.currentNoteId = null;
    }

    editCurrentNote() {
        if (!this.currentNoteId) return;
        this.editNote(this.currentNoteId);
    }

    editNote(noteId) {
        const note = this.secureNotes.find(n => n.id === noteId);
        if (!note || !this.unlockedNotes.has(noteId)) {
            this.showSecurityAlert('Note is locked. Please unlock it first.');
            return;
        }

        this.currentNoteId = noteId;

        // Populate editor
        const titleInput = document.getElementById('editTitle');
        const contentInput = document.getElementById('editContent');
        
        if (titleInput) titleInput.value = note.title;
        if (contentInput) contentInput.value = note.content || '';
        
        this.updateCharCount({ target: titleInput }, 'editTitleCharCount', 100);
        this.updateCharCount({ target: contentInput }, 'editContentCharCount', 10000);

        // Store original content for revert
        this.originalContent = {
            title: note.title,
            content: note.content || ''
        };

        this.showModal('noteEditorModal');
        this.hideModal('noteViewerModal');
    }

    closeNoteEditor() {
        this.hideModal('noteEditorModal');
        this.originalContent = null;
    }

    revertEdit() {
        if (this.originalContent) {
            const titleInput = document.getElementById('editTitle');
            const contentInput = document.getElementById('editContent');
            
            if (titleInput) titleInput.value = this.originalContent.title;
            if (contentInput) contentInput.value = this.originalContent.content;
            
            this.updateCharCount({ target: titleInput }, 'editTitleCharCount', 100);
            this.updateCharCount({ target: contentInput }, 'editContentCharCount', 10000);
            this.showSecurityNotification('Changes reverted to original', 'info');
        }
    }

    async saveEditedNote(e) {
        e.preventDefault();

        const titleInput = document.getElementById('editTitle');
        const contentInput = document.getElementById('editContent');
        
        if (!titleInput || !contentInput) return;

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title && !content) {
            this.showSecurityAlert('Note must have a title or content');
            return;
        }

        try {
            const noteIndex = this.secureNotes.findIndex(n => n.id === this.currentNoteId);
            if (noteIndex === -1) return;

            // Update note
            this.secureNotes[noteIndex].title = title;
            this.secureNotes[noteIndex].content = content;
            this.secureNotes[noteIndex].updatedAt = new Date().toISOString();

            localStorage.setItem('secureNotes', JSON.stringify(this.secureNotes));

            this.closeNoteEditor();
            this.loadSecureNotes();
            this.showSecurityNotification('✅ Note updated successfully!', 'success');

        } catch (error) {
            this.showSecurityAlert('Error updating note: ' + error.message);
        }
    }

    copyNoteContent() {
        const contentElement = document.getElementById('noteContentText');
        if (!contentElement) return;
        
        const content = contentElement.textContent;
        navigator.clipboard.writeText(content).then(() => {
            this.showSecurityNotification('📋 Content copied to clipboard!', 'success');
        }).catch(() => {
            this.showSecurityAlert('Failed to copy content');
        });
    }

    lockCurrentNote() {
        if (!this.currentNoteId) return;
        this.unlockedNotes.delete(this.currentNoteId);
        this.closeNoteViewer();
        this.loadSecureNotes();
        this.updateSecurityDashboard();
        this.showSecurityNotification('🔒 Note locked', 'info');
    }

    exportCurrentNote() {
        if (!this.currentNoteId) return;
        
        const note = this.secureNotes.find(n => n.id === this.currentNoteId);
        if (!note) return;

        const exportData = {
            title: note.title,
            content: note.content || '',
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            securityMethod: note.security.method,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `secure-note-${note.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showSecurityNotification('📤 Note exported successfully!', 'success');
    }

    // Session Management
    startSessionTimer() {
        this.sessionTimer = setInterval(() => {
            this.checkSessionTimeout();
            this.updateSessionTimerDisplay();
        }, 1000);
    }

    checkSessionTimeout() {
        const now = Date.now();
        const timeout = this.securitySettings.sessionTimeout * 1000; // Convert to milliseconds

        for (const [noteId, unlockTime] of this.unlockedNotes.entries()) {
            if (now - unlockTime > timeout) {
                this.unlockedNotes.delete(noteId);
                this.showSecurityNotification(`🔒 Note auto-locked due to inactivity`, 'info');
            }
        }

        if (this.unlockedNotes.size === 0) {
            const indicator = document.getElementById('sessionIndicator');
            if (indicator) {
                indicator.classList.remove('active');
            }
        } else {
            this.loadSecureNotes();
            this.updateSecurityDashboard();
        }
    }

    updateSessionTimerDisplay() {
        const timerElement = document.getElementById('sessionTimer');
        if (!timerElement || this.unlockedNotes.size === 0) return;

        const now = Date.now();
        const oldestUnlock = Math.min(...this.unlockedNotes.values());
        const timeLeft = this.securitySettings.sessionTimeout - Math.floor((now - oldestUnlock) / 1000);
        
        if (timeLeft > 0) {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    // Security Management
    updateAutoLockTimer(e) {
        const timerValue = parseInt(e.target.value);
        this.securitySettings.autoLockTimer = timerValue;
        this.securitySettings.sessionTimeout = timerValue * 60; // Convert minutes to seconds
        localStorage.setItem('securitySettings', JSON.stringify(this.securitySettings));
        this.showSecurityNotification(`Auto-lock timer set to ${timerValue} minute${timerValue !== 1 ? 's' : ''}`, 'success');
    }

    lockAllNotes() {
        this.unlockedNotes.clear();
        this.loadSecureNotes();
        this.updateSecurityDashboard();
        this.showSecurityNotification('🔒 All notes locked', 'info');
    }

    exportSecureNotes() {
        this.showSecurityNotification('📤 Export feature coming soon', 'info');
    }

    openSecuritySettings() {
        this.showSecurityNotification('⚙️ Security settings panel coming soon', 'info');
    }

    deleteSecureNote(noteId) {
        if (!confirm('Are you sure you want to permanently delete this secure note? This action cannot be undone.')) {
            return;
        }

        this.secureNotes = this.secureNotes.filter(note => note.id !== noteId);
        this.unlockedNotes.delete(noteId);
        localStorage.setItem('secureNotes', JSON.stringify(this.secureNotes));
        
        this.loadSecureNotes();
        this.updateSecurityDashboard();
        this.showSecurityNotification('🗑️ Secure note deleted', 'success');
    }

    searchNotes(query) {
        const notes = document.querySelectorAll('.secure-note-card');
        const searchTerm = query.toLowerCase().trim();

        notes.forEach(note => {
            const titleElement = note.querySelector('.note-title');
            if (!titleElement) return;
            
            const title = titleElement.textContent.toLowerCase();
            const shouldShow = title.includes(searchTerm) || searchTerm === '';
            note.style.display = shouldShow ? 'block' : 'none';
        });
    }

    toggleView(button) {
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const container = document.getElementById('secureNoteList');
        if (!container) return;
        
        const view = button.dataset.view;
        
        if (view === 'list') {
            container.style.gridTemplateColumns = '1fr';
        } else {
            container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
        }
    }

    // Utility Methods
    arraysEqual(a, b) {
        return a.length === b.length && a.every((val, index) => val === b[index]);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showSecurityNotification(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.security-toast').forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `security-toast security-toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
        `;

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--security-card);
            backdrop-filter: blur(20px);
            color: var(--security-text);
            padding: 15px 20px;
            border-radius: 12px;
            border: 1px solid var(--security-border);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 300px;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 10);

        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 3000);
    }

    showSecurityAlert(message) {
        this.showSecurityNotification(message, 'error');
    }

    createSecurityConfetti() {
        const confettiCount = 30;
        const colors = ['#7c3aed', '#0891b2', '#059669', '#d97706'];
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 8px;
                height: 8px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 1px;
                top: -10px;
                left: ${Math.random() * 100}%;
                opacity: 0;
                z-index: 10000;
                pointer-events: none;
            `;
            
            document.body.appendChild(confetti);
            
            const animation = confetti.animate([
                {
                    transform: 'translateY(0) rotate(0deg)',
                    opacity: 1
                },
                {
                    transform: `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 360}deg)`,
                    opacity: 0
                }
            ], {
                duration: 2000 + Math.random() * 1000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            animation.onfinish = () => {
                if (confetti.parentNode) {
                    confetti.remove();
                }
            };
        }
    }

    checkAutoLock() {
        const lastAccess = new Date(this.securitySettings.lastAccess);
        const now = new Date();
        const diffMinutes = (now - lastAccess) / (1000 * 60);
        
        if (this.securitySettings.autoLockTimer > 0 && 
            diffMinutes >= this.securitySettings.autoLockTimer) {
            this.lockAllNotes();
        }
    }

    startSecurityMonitor() {
        setInterval(() => {
            this.securitySettings.lastAccess = new Date().toISOString();
            localStorage.setItem('securitySettings', JSON.stringify(this.securitySettings));
        }, 60000); // Update every minute
    }
}

// Initialize when DOM is loaded
let secureManager;

document.addEventListener('DOMContentLoaded', () => {
    secureManager = new SecureNotesManager();
});

// Add security-specific styles
const securityStyles = document.createElement('style');
securityStyles.textContent = `
    .security-toast-success {
        border-left: 4px solid var(--security-success) !important;
    }
    
    .security-toast-error {
        border-left: 4px solid var(--security-danger) !important;
    }
    
    .security-toast-info {
        border-left: 4px solid var(--security-primary) !important;
    }
    
    .strength-text.weak { color: var(--security-danger); }
    .strength-text.good { color: var(--security-warning); }
    .strength-text.strong { color: var(--security-success); }
    
    .enabled {
        background: var(--security-success) !important;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
    
    .shake {
        animation: shake 0.5s ease-in-out;
    }
`;
document.head.appendChild(securityStyles);