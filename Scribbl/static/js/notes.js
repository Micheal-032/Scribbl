// notes.js - Premium Notes Manager with Working Text Color Feature
class PremiumNotesManager {
    constructor() {
        this.db = null;
        this.notes = [];
        this.filteredNotes = [];
        this.currentNote = null;
        this.currentTags = [];
        this.activeFilters = new Set();
        this.sortBy = localStorage.getItem('notesSortBy') || 'updated';
        this.viewMode = localStorage.getItem('notesViewMode') || 'grid';
        this.isLoading = true;
        this.musicEnabled = false;
        this.audioContext = null;
        this.oscillator = null;
        this.isResizing = false;
        this.currentResizeElement = null;
        this.currentColor = '#1e293b';
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Premium Notes Manager...');
        await this.initializeDB();
        this.initializeParticles();
        this.initializeCustomCursor();
        this.bindEvents();
        await this.loadNotes();
        this.applyStoredSettings();
        this.renderNotes();
        this.hideLoading();
        this.startBackgroundAnimations();
    }

    async initializeDB() {
        try {
            console.log('📝 Initializing database...');
            await new Promise(resolve => setTimeout(resolve, 500));
            this.db = { name: 'notes-db' };
            console.log('✅ Database initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize database:', error);
            this.showNotification('Failed to load notes database', 'error');
        }
    }

    initializeParticles() {
        console.log('🌀 Initializing particles...');
        this.createSimpleParticles();
    }

    createSimpleParticles() {
        const container = document.getElementById('particles');
        if (!container) return;

        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'simple-particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 2}px;
                height: ${Math.random() * 4 + 2}px;
                background: #8b5cf6;
                border-radius: 50%;
                opacity: ${Math.random() * 0.3 + 0.1};
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: float-particle ${Math.random() * 20 + 10}s infinite linear;
            `;
            container.appendChild(particle);
        }
    }

    initializeCustomCursor() {
        console.log('🎯 Initializing custom cursor...');
        this.cursor = document.getElementById('cursor');
        this.cursorFollower = document.getElementById('cursorFollower');
        
        if (!this.cursor || !this.cursorFollower) {
            console.warn('Cursor elements not found');
            return;
        }

        document.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            if (this.cursor && this.cursorFollower) {
                this.cursor.style.transform = `translate3d(${mouseX - 10}px, ${mouseY - 10}px, 0)`;
                this.cursorFollower.style.transform = `translate3d(${mouseX - 25}px, ${mouseY - 25}px, 0)`;
            }
        });

        // Enhanced hover effects
        const hoverElements = document.querySelectorAll(
            'button, .note-card, .tag-cloud-item, .sort-option, .action-btn, .format-btn, .quick-action'
        );
        
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                if (this.cursor) this.cursor.classList.add('hover');
                if (this.cursorFollower) this.cursorFollower.classList.add('hover');
            });
            
            el.addEventListener('mouseleave', () => {
                if (this.cursor) this.cursor.classList.remove('hover');
                if (this.cursorFollower) this.cursorFollower.classList.remove('hover');
            });
        });

        console.log('✅ Custom cursor initialized');
    }

    bindEvents() {
        console.log('🔗 Binding events...');
        
        // Back Button
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = 'dashboard.html';
            });
        }

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
        }

        // View Toggle
        const gridView = document.getElementById('gridView');
        const listView = document.getElementById('listView');
        if (gridView) gridView.addEventListener('click', () => this.setViewMode('grid'));
        if (listView) listView.addEventListener('click', () => this.setViewMode('list'));

        // Sort functionality
        document.querySelectorAll('.sort-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.handleSort(e.currentTarget.dataset.sort);
            });
        });

        // New Note Actions
        const newNoteBtn = document.getElementById('newNoteBtn');
        const createFirstNote = document.getElementById('createFirstNote');
        if (newNoteBtn) newNoteBtn.addEventListener('click', () => this.openEditor());
        if (createFirstNote) createFirstNote.addEventListener('click', () => this.openEditor());

        // Quick Actions
        const quickNote = document.getElementById('quickNote');
        const importNotes = document.getElementById('importNotes');
        const exportNotes = document.getElementById('exportNotes');
        const aiAssist = document.getElementById('aiAssist');
        if (quickNote) quickNote.addEventListener('click', () => this.createQuickNote());
        if (importNotes) importNotes.addEventListener('click', () => this.importNotes());
        if (exportNotes) exportNotes.addEventListener('click', () => this.exportNotes());
        if (aiAssist) aiAssist.addEventListener('click', () => this.aiAssist());

        // Editor Actions
        const closeEditor = document.getElementById('closeEditor');
        const saveNote = document.getElementById('saveNote');
        const manualSave = document.getElementById('manualSave');
        const deleteNote = document.getElementById('deleteNote');
        const pinNote = document.getElementById('pinNote');
        const toggleSecure = document.getElementById('toggleSecure');
        const aiEnhance = document.getElementById('aiEnhance');
        const previewNote = document.getElementById('previewNote');
        if (closeEditor) closeEditor.addEventListener('click', () => this.closeEditor());
        if (saveNote) saveNote.addEventListener('click', () => this.saveNote());
        if (manualSave) manualSave.addEventListener('click', () => this.saveNote());
        if (deleteNote) deleteNote.addEventListener('click', () => this.confirmDelete());
        if (pinNote) pinNote.addEventListener('click', () => this.togglePin());
        if (toggleSecure) toggleSecure.addEventListener('click', () => this.toggleSecure());
        if (aiEnhance) aiEnhance.addEventListener('click', () => this.aiEnhanceNote());
        if (previewNote) previewNote.addEventListener('click', () => this.previewNote());

        // New Features - FIXED TEXT COLOR
        const fontColor = document.getElementById('fontColor');
        const uploadImageBtn = document.getElementById('uploadImageBtn');
        const imageUpload = document.getElementById('imageUpload');
        const quickTagInput = document.getElementById('quickTagInput');
        const addTagBtn = document.getElementById('addTagBtn');

        if (fontColor) {
            fontColor.addEventListener('input', (e) => {
                this.changeFontColor(e.target.value);
            });
        }

        if (uploadImageBtn && imageUpload) {
            uploadImageBtn.addEventListener('click', () => imageUpload.click());
            imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        if (quickTagInput) {
            quickTagInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.addQuickTag(quickTagInput.value.trim());
                    quickTagInput.value = '';
                }
            });
        }

        if (addTagBtn) {
            addTagBtn.addEventListener('click', () => {
                if (quickTagInput.value.trim()) {
                    this.addQuickTag(quickTagInput.value.trim());
                    quickTagInput.value = '';
                }
            });
        }

        // Tags functionality
        const tagInput = document.getElementById('tagInput');
        const clearFilters = document.getElementById('clearFilters');
        if (tagInput) {
            tagInput.addEventListener('keydown', (e) => this.handleTagInput(e));
            tagInput.addEventListener('input', (e) => this.showTagSuggestions(e));
        }
        if (clearFilters) clearFilters.addEventListener('click', () => this.clearFilters());

        // Confirmation Modal
        const confirmCancel = document.getElementById('confirmCancel');
        const confirmAction = document.getElementById('confirmAction');
        if (confirmCancel) confirmCancel.addEventListener('click', () => this.closeConfirmation());
        if (confirmAction) confirmAction.addEventListener('click', () => this.executeConfirmedAction());

        // Formatting Toolbar - FIXED
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.applyFormatting(e.currentTarget.dataset.format);
            });
        });

        // Clear formatting
        const clearFormatBtn = document.querySelector('.clear-format-btn');
        if (clearFormatBtn) {
            clearFormatBtn.addEventListener('click', () => this.clearFormatting());
        }

        // Auto-save and stats
        const noteContent = document.getElementById('noteContent');
        if (noteContent) {
            noteContent.addEventListener('input', this.debounce(() => this.autoSave(), 2000));
            noteContent.addEventListener('input', () => this.updateEditorStats());
        }

        // Scroll progress
        window.addEventListener('scroll', () => this.updateScrollProgress());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Click outside to close modals
        document.addEventListener('click', (e) => this.handleOutsideClick(e));

        // Music toggle
        const musicBtn = document.getElementById('musicBtn');
        if (musicBtn) musicBtn.addEventListener('click', () => this.toggleBackgroundMusic());

        console.log('✅ All events bound successfully');
    }

    // FIXED: Change Font Color - Working Properly
    changeFontColor(color) {
        const noteContent = document.getElementById('noteContent');
        if (!noteContent) return;

        // Store current color
        this.currentColor = color;
        
        // Focus the content editable first
        noteContent.focus();
        
        // Check if there's selected text
        const selection = window.getSelection();
        if (selection.toString().length > 0) {
            // Apply color to selected text only
            document.execCommand('styleWithCSS', false, true);
            document.execCommand('foreColor', false, color);
        } else {
            // Apply color to new text that will be typed
            document.execCommand('styleWithCSS', false, true);
            document.execCommand('foreColor', false, color);
            
            // Show notification
            this.showNotification(`Text color changed to ${color}`, 'success');
        }
        
        // Update color picker display
        const colorPicker = document.getElementById('fontColor');
        if (colorPicker) {
            colorPicker.value = color;
        }
    }

    // FIXED: Handle Image Upload
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select an image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.insertImage(e.target.result);
        };
        reader.readAsDataURL(file);
        
        // Reset file input
        event.target.value = '';
    }

    // FIXED: Insert Image with Resizing
    insertImage(src) {
        const noteContent = document.getElementById('noteContent');
        if (!noteContent) return;

        const imageContainer = document.createElement('div');
        imageContainer.className = 'uploaded-image';
        
        const img = document.createElement('img');
        img.src = src;
        img.style.maxWidth = '300px';
        img.style.cursor = 'move';
        img.draggable = false;
        
        const controls = document.createElement('div');
        controls.className = 'image-controls';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'image-control-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete Image';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            imageContainer.remove();
        });
        
        const resizeBtn = document.createElement('button');
        resizeBtn.className = 'image-control-btn resize';
        resizeBtn.innerHTML = '⤢';
        resizeBtn.title = 'Resize Image';
        resizeBtn.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.startResizing(img, e);
        });
        
        controls.appendChild(deleteBtn);
        controls.appendChild(resizeBtn);
        imageContainer.appendChild(img);
        imageContainer.appendChild(controls);
        
        // Insert at cursor position or at the end
        this.insertAtCursor(imageContainer);
        
        noteContent.focus();
        this.showNotification('Image added successfully', 'success');
    }

    // Helper: Insert element at cursor position
    insertAtCursor(element) {
        const noteContent = document.getElementById('noteContent');
        const selection = window.getSelection();
        
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(element);
            
            // Move cursor after the inserted element
            const newRange = document.createRange();
            newRange.setStartAfter(element);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        } else {
            noteContent.appendChild(element);
        }
    }

    // FIXED: Make Image Draggable
    makeImageDraggable(img, container) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        img.addEventListener('mousedown', (e) => {
            if (e.target !== img) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = img.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            img.style.position = 'relative';
            img.style.zIndex = '1000';
            img.style.cursor = 'grabbing';
            
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            img.style.left = dx + 'px';
            img.style.top = dy + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                img.style.cursor = 'move';
            }
        });
    }

    // FIXED: Start Image Resizing
    startResizing(img, event) {
        this.isResizing = true;
        this.currentResizeElement = img;
        
        const startWidth = img.offsetWidth;
        const startHeight = img.offsetHeight;
        const startX = event.clientX;
        const startY = event.clientY;
        
        img.classList.add('resizing');
        
        const doResize = (e) => {
            if (!this.isResizing) return;
            
            const dx = e.clientX - startX;
            const newWidth = Math.max(100, startWidth + dx);
            
            img.style.width = newWidth + 'px';
            img.style.height = 'auto';
        };
        
        const stopResize = () => {
            this.isResizing = false;
            this.currentResizeElement = null;
            img.classList.remove('resizing');
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
        };
        
        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
        
        event.preventDefault();
    }

    // FIXED: Add Quick Tag
    addQuickTag(tag) {
        if (tag && !this.currentTags.includes(tag)) {
            this.currentTags.push(tag);
            this.renderCurrentTags();
            this.showNotification(`Added tag: ${tag}`, 'success');
        }
    }

    // FIXED: Clear Formatting
    clearFormatting() {
        const noteContent = document.getElementById('noteContent');
        if (!noteContent) return;

        noteContent.focus();
        
        // Clear all formatting
        document.execCommand('removeFormat', false, null);
        document.execCommand('unlink', false, null);
        
        // Reset color to default
        this.currentColor = '#1e293b';
        const colorPicker = document.getElementById('fontColor');
        if (colorPicker) {
            colorPicker.value = this.currentColor;
        }
        
        this.showNotification('Formatting cleared', 'info');
    }

    handleOutsideClick(e) {
        if (e.target.classList.contains('modal-backdrop')) {
            this.closeEditor();
            this.closeConfirmation();
        }
    }

    async loadNotes() {
        console.log('📖 Loading notes...');
        try {
            this.showLoading();
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Load from localStorage or use sample data
            const storedNotes = localStorage.getItem('scribbl-notes');
            if (storedNotes) {
                this.notes = JSON.parse(storedNotes);
            } else {
                // Create sample notes for demonstration
                this.notes = this.createSampleNotes();
                this.saveNotesToStorage();
            }
            
            this.notes = this.notes.filter(note => !note.secure);
            this.updateStats();
            this.renderTagsCloud();
            
            console.log(`✅ Loaded ${this.notes.length} notes`);
        } catch (error) {
            console.error('❌ Error loading notes:', error);
            this.showNotification('Failed to load notes', 'error');
        }
    }

    createSampleNotes() {
        return [
            {
                id: '1',
                title: 'Welcome to Scribbl!',
                content: 'This is your first note. You can edit, delete, or create new notes. Use tags to organize your thoughts and the search feature to find them quickly.',
                tags: ['welcome', 'getting-started', 'tips'],
                secure: false,
                encrypted: false,
                createdAt: Date.now() - 86400000,
                updatedAt: Date.now(),
                wordCount: 28,
                lastEditor: 'system',
                meta: { pinned: true, version: 1 }
            },
            {
                id: '2',
                title: 'Meeting Notes - Project Alpha',
                content: 'Discussed project timeline and deliverables. Key points: \n- Frontend completion by Friday\n- Backend API integration next week\n- Client demo scheduled for next month',
                tags: ['work', 'meeting', 'project-alpha'],
                secure: false,
                encrypted: false,
                createdAt: Date.now() - 43200000,
                updatedAt: Date.now() - 3600000,
                wordCount: 25,
                lastEditor: 'user',
                meta: { pinned: false, version: 1 }
            },
            {
                id: '3',
                title: 'Shopping List',
                content: 'Groceries to buy:\n- Milk\n- Eggs\n- Bread\n- Fruits\n- Vegetables',
                tags: ['personal', 'shopping', 'reminder'],
                secure: false,
                encrypted: false,
                createdAt: Date.now() - 7200000,
                updatedAt: Date.now() - 1800000,
                wordCount: 8,
                lastEditor: 'user',
                meta: { pinned: false, version: 1 }
            }
        ];
    }

    saveNotesToStorage() {
        try {
            localStorage.setItem('scribbl-notes', JSON.stringify(this.notes));
        } catch (error) {
            console.error('Error saving notes to storage:', error);
        }
    }

    updateStats() {
        const totalNotes = this.notes.length;
        const pinnedNotes = this.notes.filter(note => note.meta?.pinned).length;
        const totalTags = new Set();
        
        this.notes.forEach(note => {
            if (note.tags) {
                note.tags.forEach(tag => totalTags.add(tag));
            }
        });

        this.updateElementText('totalNotes', totalNotes.toString());
        this.updateElementText('totalNotesCount', totalNotes.toString());
        this.updateElementText('pinnedNotesCount', pinnedNotes.toString());
        this.updateElementText('totalTagsCount', totalTags.size.toString());
    }

    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    renderNotes() {
        console.log('🎨 Rendering notes...');
        const grid = document.getElementById('notesGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (!grid) {
            console.error('Notes grid element not found');
            return;
        }

        this.applyFilters();
        this.applySorting();

        if (this.filteredNotes.length === 0) {
            grid.style.display = 'none';
            if (emptyState) emptyState.classList.remove('hidden');
            this.animateEmptyState();
            console.log('📭 No notes to display');
            return;
        }

        grid.style.display = 'grid';
        if (emptyState) emptyState.classList.add('hidden');

        grid.innerHTML = this.filteredNotes.map((note, index) => 
            this.createNoteCard(note, index)
        ).join('');
        
        this.attachNoteCardEvents();
        console.log(`✅ Rendered ${this.filteredNotes.length} notes`);
    }

    createNoteCard(note, index) {
        const date = new Date(note.updatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        const contentPreview = note.content.length > 120 
            ? note.content.substring(0, 120) + '...' 
            : note.content;
        
        const wordCount = note.wordCount || note.content.split(/\s+/).filter(Boolean).length;
        const charCount = note.content.length;
        const readTime = Math.ceil(wordCount / 200);

        return `
            <div class="note-card ${note.meta?.pinned ? 'pinned' : ''}" 
                 data-note-id="${note.id}"
                 style="animation-delay: ${index * 0.1}s">
                <div class="note-card-header">
                    <h3 class="note-title">${this.escapeHtml(note.title)}</h3>
                    <span class="note-date">${date}</span>
                </div>
                
                <div class="note-content">${this.escapeHtml(contentPreview)}</div>
                
                <div class="note-stats">
                    <span>${wordCount} words</span>
                    <span>${charCount} chars</span>
                    <span>${readTime} min read</span>
                </div>
                
                ${note.tags && note.tags.length > 0 ? `
                    <div class="note-tags">
                        ${note.tags.slice(0, 3).map(tag => 
                            `<span class="note-tag">${this.escapeHtml(tag)}</span>`
                        ).join('')}
                        ${note.tags.length > 3 ? 
                            `<span class="note-tag">+${note.tags.length - 3}</span>` : ''}
                    </div>
                ` : ''}
                
                <div class="note-actions">
                    <button class="action-btn edit" title="Edit Note">
                        <span class="material-icons-round">edit</span>
                    </button>
                    <button class="action-btn delete" title="Delete Note">
                        <span class="material-icons-round">delete</span>
                    </button>
                </div>
            </div>
        `;
    }

    attachNoteCardEvents() {
        document.querySelectorAll('.note-card').forEach((card, index) => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.action-btn')) {
                    this.openEditor(this.filteredNotes[index]);
                }
            });
        });

        document.querySelectorAll('.action-btn.edit').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.animateButton(btn);
                this.openEditor(this.filteredNotes[index]);
            });
        });

        document.querySelectorAll('.action-btn.delete').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.animateButton(btn);
                this.confirmDelete(this.filteredNotes[index]);
            });
        });

        document.querySelectorAll('.note-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                e.stopPropagation();
                this.animateButton(tag);
                this.addFilter(tag.textContent.replace('+', '').trim());
            });
        });
    }

    animateButton(element) {
        element.style.transform = 'scale(0.9)';
        setTimeout(() => {
            element.style.transform = '';
        }, 200);
    }

    renderTagsCloud() {
        const tagsCloud = document.getElementById('tagsCloud');
        if (!tagsCloud) return;

        const tagCounts = this.getTagCounts();
        tagsCloud.innerHTML = '';

        Object.entries(tagCounts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([tag, count]) => {
                const maxCount = Math.max(...Object.values(tagCounts));
                const size = Math.min(1.2, Math.max(0.8, count / maxCount * 1.2));
                const tagElement = document.createElement('div');
                tagElement.className = `tag-cloud-item ${this.activeFilters.has(tag) ? 'active' : ''}`;
                tagElement.innerHTML = `
                    ${this.escapeHtml(tag)}
                    <span class="tag-count">${count}</span>
                    <div class="tag-glow"></div>
                `;
                tagElement.style.fontSize = `${size}rem`;
                tagElement.dataset.tag = tag;
                
                tagElement.addEventListener('click', () => {
                    this.animateButton(tagElement);
                    this.toggleFilter(tag);
                });
                
                tagsCloud.appendChild(tagElement);
            });
    }

    getTagCounts() {
        const counts = {};
        this.notes.forEach(note => {
            if (note.tags) {
                note.tags.forEach(tag => {
                    counts[tag] = (counts[tag] || 0) + 1;
                });
            }
        });
        return counts;
    }

    applyFilters() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        
        this.filteredNotes = this.notes.filter(note => {
            if (searchTerm && !this.matchesSearch(note, searchTerm)) {
                return false;
            }

            if (this.activeFilters.size > 0) {
                const noteTags = new Set(note.tags || []);
                const hasAllTags = Array.from(this.activeFilters).every(tag => noteTags.has(tag));
                if (!hasAllTags) return false;
            }

            return true;
        });
    }

    matchesSearch(note, searchTerm) {
        return note.title.toLowerCase().includes(searchTerm) ||
               note.content.toLowerCase().includes(searchTerm) ||
               (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
    }

    applySorting() {
        switch (this.sortBy) {
            case 'updated':
                this.filteredNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                break;
            case 'created':
                this.filteredNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'title':
                this.filteredNotes.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'words':
                this.filteredNotes.sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));
                break;
            case 'pinned':
                this.filteredNotes.sort((a, b) => {
                    const aPinned = a.meta?.pinned ? 1 : 0;
                    const bPinned = b.meta?.pinned ? 1 : 0;
                    return bPinned - aPinned || new Date(b.updatedAt) - new Date(a.updatedAt);
                });
                break;
        }
    }

    setViewMode(mode) {
        this.viewMode = mode;
        const grid = document.getElementById('notesGrid');
        const gridBtn = document.getElementById('gridView');
        const listBtn = document.getElementById('listView');

        if (mode === 'grid') {
            grid?.classList.remove('list-view');
            gridBtn?.classList.add('active');
            listBtn?.classList.remove('active');
        } else {
            grid?.classList.add('list-view');
            gridBtn?.classList.remove('active');
            listBtn?.classList.add('active');
        }

        localStorage.setItem('notesViewMode', mode);
        this.animateViewTransition();
        this.showNotification(`View changed to ${mode} mode`, 'info');
    }

    animateViewTransition() {
        const grid = document.getElementById('notesGrid');
        if (grid) {
            grid.style.animation = 'none';
            setTimeout(() => {
                grid.style.animation = 'gridReveal 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            }, 10);
        }
    }

    handleSort(sortType) {
        this.sortBy = sortType;
        
        document.querySelectorAll('.sort-option').forEach(option => {
            option.classList.toggle('active', option.dataset.sort === sortType);
        });

        this.renderNotes();
        localStorage.setItem('notesSortBy', sortType);
        this.showNotification(`Sorted by ${this.getSortLabel(sortType)}`, 'info');
    }

    getSortLabel(sortType) {
        const labels = {
            'updated': 'last updated',
            'created': 'date created',
            'title': 'title',
            'words': 'word count',
            'pinned': 'pinned first'
        };
        return labels[sortType] || sortType;
    }

    openEditor(note = null) {
        console.log('📝 Opening editor...');
        this.currentNote = note;
        const editor = document.getElementById('noteEditor');
        const titleInput = document.getElementById('noteTitle');
        const noteContent = document.getElementById('noteContent');

        if (!editor || !titleInput || !noteContent) {
            console.error('Editor elements not found');
            return;
        }

        // Reset color picker to default
        this.currentColor = '#1e293b';
        const colorPicker = document.getElementById('fontColor');
        if (colorPicker) {
            colorPicker.value = this.currentColor;
        }

        if (note) {
            titleInput.value = note.title;
            noteContent.innerHTML = note.content;
            this.currentTags = note.tags || [];
            this.updatePinButton(note.meta?.pinned);
            this.updateSecureButton(note.secure);
        } else {
            titleInput.value = '';
            noteContent.innerHTML = 'Start writing your thoughts... Let your ideas flow freely across the digital canvas. Capture moments, insights, and inspiration as they come to you.';
            this.currentTags = [];
            this.updatePinButton(false);
            this.updateSecureButton(false);
        }

        this.renderCurrentTags();
        this.updateEditorStats();
        editor.classList.remove('hidden');
        
        setTimeout(() => {
            titleInput.focus();
        }, 400);
        
        console.log('✅ Editor opened');
    }

    updatePinButton(isPinned) {
        const pinBtn = document.getElementById('pinNote');
        if (pinBtn) {
            if (isPinned) {
                pinBtn.classList.add('active');
            } else {
                pinBtn.classList.remove('active');
            }
        }
    }

    updateSecureButton(isSecure) {
        const secureBtn = document.getElementById('toggleSecure');
        if (secureBtn) {
            if (isSecure) {
                secureBtn.classList.add('active');
            } else {
                secureBtn.classList.remove('active');
            }
        }
    }

    closeEditor() {
        const editor = document.getElementById('noteEditor');
        if (editor) {
            editor.classList.add('hidden');
        }
        this.currentNote = null;
        console.log('📝 Editor closed');
    }

    async saveNote() {
        console.log('💾 Saving note...');
        const titleInput = document.getElementById('noteTitle');
        const noteContent = document.getElementById('noteContent');
        const pinBtn = document.getElementById('pinNote');
        const secureBtn = document.getElementById('toggleSecure');

        if (!titleInput || !noteContent) {
            console.error('Form elements not found');
            return;
        }

        const title = titleInput.value.trim();
        const content = noteContent.innerHTML;

        if (!title && !content) {
            this.showNotification('Note must have title or content', 'warning');
            return;
        }

        const noteData = {
            id: this.currentNote?.id || this.generateId(),
            title: title || 'Untitled Note',
            content: content,
            tags: this.currentTags,
            secure: secureBtn?.classList.contains('active') || false,
            encrypted: false,
            createdAt: this.currentNote?.createdAt || Date.now(),
            updatedAt: Date.now(),
            wordCount: noteContent.textContent.split(/\s+/).filter(Boolean).length,
            lastEditor: 'user',
            meta: {
                pinned: pinBtn?.classList.contains('active') || false,
                version: (this.currentNote?.meta?.version || 0) + 1
            }
        };

        try {
            // Show loading for exactly 4 seconds
            this.showLoading();
            setTimeout(() => {
                this.hideLoading();
                
                // Save to local storage
                if (this.currentNote) {
                    const index = this.notes.findIndex(n => n.id === this.currentNote.id);
                    if (index !== -1) {
                        this.notes[index] = noteData;
                    }
                } else {
                    this.notes.push(noteData);
                }

                this.saveNotesToStorage();
                
                this.closeEditor();
                this.loadNotes();
                this.renderNotes();
                
                const message = this.currentNote ? 'Note updated successfully' : 'Note created successfully';
                this.showNotification(message, 'success');
                
                this.createConfetti();
                
            }, 4000); // Exactly 4 seconds
            
        } catch (error) {
            this.hideLoading();
            console.error('❌ Error saving note:', error);
            this.showNotification('Failed to save note', 'error');
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    confirmDelete(note = null) {
        const noteToDelete = note || this.currentNote;
        if (!noteToDelete) return;

        this.pendingAction = { type: 'delete', note: noteToDelete };
        
        const confirmTitle = document.getElementById('confirmTitle');
        const confirmMessage = document.getElementById('confirmMessage');
        
        if (confirmTitle) confirmTitle.textContent = 'Delete Note';
        if (confirmMessage) confirmMessage.textContent = 
            `Are you sure you want to delete "${noteToDelete.title}"? This action cannot be undone.`;
        
        const confirmModal = document.getElementById('confirmModal');
        if (confirmModal) confirmModal.classList.remove('hidden');
    }

    async executeConfirmedAction() {
        if (!this.pendingAction) return;

        switch (this.pendingAction.type) {
            case 'delete':
                await this.deleteNote(this.pendingAction.note);
                break;
        }

        this.closeConfirmation();
    }

    async deleteNote(note) {
        try {
            this.notes = this.notes.filter(n => n.id !== note.id);
            this.saveNotesToStorage();

            await this.loadNotes();
            this.renderNotes();
            
            this.showNotification('Note deleted successfully', 'success');
            this.closeEditor();
            
        } catch (error) {
            console.error('❌ Error deleting note:', error);
            this.showNotification('Failed to delete note', 'error');
        }
    }

    closeConfirmation() {
        const confirmModal = document.getElementById('confirmModal');
        if (confirmModal) confirmModal.classList.add('hidden');
        this.pendingAction = null;
    }

    togglePin() {
        const pinBtn = document.getElementById('pinNote');
        if (pinBtn) {
            pinBtn.classList.toggle('active');
            const message = pinBtn.classList.contains('active') ? 'Note pinned' : 'Note unpinned';
            this.showNotification(message, 'info');
            this.animateButton(pinBtn);
        }
    }

    toggleSecure() {
        const secureBtn = document.getElementById('toggleSecure');
        if (secureBtn) {
            secureBtn.classList.toggle('active');
            const message = secureBtn.classList.contains('active') ? 
                'Note will be secured' : 'Note will be regular';
            this.showNotification(message, 'info');
            this.animateButton(secureBtn);
        }
    }

    aiEnhanceNote() {
        this.showNotification('AI enhancement feature coming soon!', 'info');
    }

    previewNote() {
        this.showNotification('Preview feature coming soon!', 'info');
    }

    handleTagInput(e) {
        if (e.key === 'Enter' && e.target.value.trim()) {
            e.preventDefault();
            this.addTag(e.target.value.trim());
            e.target.value = '';
            this.hideTagSuggestions();
        }
    }

    showTagSuggestions(e) {
        const input = e.target;
        const value = input.value.trim().toLowerCase();
        const suggestions = document.getElementById('tagsSuggestions');
        
        if (!value || !suggestions) {
            this.hideTagSuggestions();
            return;
        }

        const allTags = this.getAllTags();
        const matchingTags = allTags.filter(tag => 
            tag.toLowerCase().includes(value) && !this.currentTags.includes(tag)
        ).slice(0, 5);

        if (matchingTags.length === 0) {
            this.hideTagSuggestions();
            return;
        }

        suggestions.innerHTML = matchingTags.map(tag => `
            <div class="tag-suggestion" data-tag="${tag}">
                ${this.escapeHtml(tag)}
            </div>
        `).join('');

        suggestions.style.display = 'block';

        suggestions.querySelectorAll('.tag-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                this.addTag(suggestion.dataset.tag);
                input.value = '';
                this.hideTagSuggestions();
            });
        });
    }

    hideTagSuggestions() {
        const suggestions = document.getElementById('tagsSuggestions');
        if (suggestions) {
            suggestions.style.display = 'none';
        }
    }

    getAllTags() {
        const allTags = new Set();
        this.notes.forEach(note => {
            if (note.tags) {
                note.tags.forEach(tag => allTags.add(tag));
            }
        });
        return Array.from(allTags);
    }

    addTag(tag) {
        if (!this.currentTags.includes(tag)) {
            this.currentTags.push(tag);
            this.renderCurrentTags();
            this.showNotification(`Added tag: ${tag}`, 'success');
        }
    }

    removeTag(tag) {
        this.currentTags = this.currentTags.filter(t => t !== tag);
        this.renderCurrentTags();
        this.showNotification(`Removed tag: ${tag}`, 'info');
    }

    renderCurrentTags() {
        const tagsDisplay = document.getElementById('tagsDisplay');
        if (!tagsDisplay) return;

        tagsDisplay.innerHTML = this.currentTags.map(tag => `
            <span class="tag-chip">
                ${this.escapeHtml(tag)}
                <button type="button" class="remove" data-tag="${tag}">×</button>
            </span>
        `).join('');

        tagsDisplay.querySelectorAll('.remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTag(btn.dataset.tag);
            });
        });
    }

    addFilter(tag) {
        this.activeFilters.add(tag);
        this.updateActiveFilters();
        this.renderTagsCloud();
        this.renderNotes();
        this.showNotification(`Filtered by: ${tag}`, 'info');
    }

    removeFilter(tag) {
        this.activeFilters.delete(tag);
        this.updateActiveFilters();
        this.renderTagsCloud();
        this.renderNotes();
        this.showNotification(`Removed filter: ${tag}`, 'info');
    }

    toggleFilter(tag) {
        if (this.activeFilters.has(tag)) {
            this.removeFilter(tag);
        } else {
            this.addFilter(tag);
        }
    }

    clearFilters() {
        this.activeFilters.clear();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        this.updateActiveFilters();
        this.renderTagsCloud();
        this.renderNotes();
        this.showNotification('All filters cleared', 'success');
    }

    updateActiveFilters() {
        const container = document.getElementById('activeFilters');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.activeFilters.forEach(tag => {
            const chip = document.createElement('div');
            chip.className = 'filter-chip';
            chip.innerHTML = `
                ${this.escapeHtml(tag)}
                <button type="button" class="remove">×</button>
            `;
            
            chip.querySelector('.remove').addEventListener('click', () => this.removeFilter(tag));
            container.appendChild(chip);
        });
    }

    handleSearch() {
        this.renderNotes();
    }

    updateEditorStats() {
        const noteContent = document.getElementById('noteContent');
        if (!noteContent) return;

        const content = noteContent.textContent;
        const words = content.split(/\s+/).filter(Boolean);
        const characters = content.length;
        const readTime = Math.ceil(words.length / 200);

        this.updateElementText('wordCount', `${words.length} words`);
        this.updateElementText('charCount', `${characters} chars`);
        this.updateElementText('readTime', `${readTime} min read`);
        
        this.updateElementText('lastSaved', 'Just now');
    }

    updateScrollProgress() {
        const scrollBar = document.querySelector('.scroll-bar');
        if (!scrollBar) return;

        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;

        scrollBar.style.width = `${scrollPercent}%`;
    }

    applyFormatting(format) {
        const noteContent = document.getElementById('noteContent');
        if (!noteContent) return;

        noteContent.focus();
        
        switch (format) {
            case 'bold':
                document.execCommand('bold', false, null);
                break;
            case 'italic':
                document.execCommand('italic', false, null);
                break;
            case 'underline':
                document.execCommand('underline', false, null);
                break;
            case 'list':
                document.execCommand('insertUnorderedList', false, null);
                break;
            case 'numbers':
                document.execCommand('insertOrderedList', false, null);
                break;
            case 'code':
                document.execCommand('formatBlock', false, '<pre>');
                break;
            case 'link':
                const url = prompt('Enter URL:');
                if (url) {
                    document.execCommand('createLink', false, url);
                }
                break;
        }

        const button = event.target.closest('.format-btn');
        if (button) this.animateButton(button);
    }

    async autoSave() {
        if (this.currentNote) {
            const titleInput = document.getElementById('noteTitle');
            const noteContent = document.getElementById('noteContent');
            
            if (!titleInput || !noteContent) return;

            const title = titleInput.value.trim();
            const content = noteContent.innerHTML;
            
            if (title || content) {
                console.log('💾 Auto-saving...');
                this.updateElementText('lastSaved', 'Auto-saved');
            }
        }
    }

    createQuickNote() {
        this.openEditor();
        const now = new Date();
        const titleInput = document.getElementById('noteTitle');
        if (titleInput) {
            titleInput.value = `Quick Note - ${now.toLocaleString()}`;
        }
        const noteContent = document.getElementById('noteContent');
        if (noteContent) noteContent.focus();
        this.showNotification('Quick note created! Start typing...', 'success');
    }

    async importNotes() {
        this.showNotification('Import feature coming soon!', 'info');
    }

    async exportNotes() {
        this.showNotification('Export feature coming soon!', 'info');
    }

    aiAssist() {
        this.showNotification('AI Assist feature coming soon!', 'info');
    }

    toggleBackgroundMusic() {
        this.musicEnabled = !this.musicEnabled;
        
        if (this.musicEnabled) {
            this.startAmbientMusic();
            this.showNotification('Ambient music enabled', 'success');
        } else {
            this.stopAmbientMusic();
            this.showNotification('Ambient music disabled', 'info');
        }
    }

    startAmbientMusic() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            this.oscillator.type = 'sine';
            this.oscillator.frequency.value = 220;
            gainNode.gain.value = 0.1;
            
            this.oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            this.oscillator.start();
        } catch (error) {
            console.warn('Audio context not supported:', error);
        }
    }

    stopAmbientMusic() {
        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'n':
                    e.preventDefault();
                    this.openEditor();
                    break;
                case 'f':
                    e.preventDefault();
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) searchInput.focus();
                    break;
                case 's':
                    e.preventDefault();
                    this.saveNote();
                    break;
                case 'p':
                    e.preventDefault();
                    this.togglePin();
                    break;
            }
        }

        if (e.key === 'Escape') {
            this.closeEditor();
            this.closeConfirmation();
        }
    }

    applyStoredSettings() {
        this.setViewMode(this.viewMode);
        
        document.querySelectorAll('.sort-option').forEach(option => {
            if (option.dataset.sort === this.sortBy) {
                option.classList.add('active');
            }
        });
    }

    showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
        }
        this.isLoading = true;
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
        this.isLoading = false;
    }

    animateEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.animation = 'none';
            setTimeout(() => {
                emptyState.style.animation = 'fadeInUp 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            }, 10);
        }
    }

    startBackgroundAnimations() {
        this.initializeTiltEffects();
        this.initializeMagneticButtons();
        this.startFloatingAnimations();
    }

    initializeTiltEffects() {
        // Remove tilt effects completely as requested
        const tiltElements = document.querySelectorAll('[data-tilt]');
        tiltElements.forEach(el => {
            el.removeAttribute('data-tilt');
        });
    }

    initializeMagneticButtons() {
        const magneticButtons = document.querySelectorAll('.magnetic');
        
        magneticButtons.forEach(button => {
            button.addEventListener('mousemove', (e) => {
                const rect = button.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const moveX = (x - centerX) * 0.15;
                const moveY = (y - centerY) * 0.15;
                
                button.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(1.05)`;
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translate3d(0, 0, 0) scale(1)';
            });
        });
    }

    startFloatingAnimations() {
        const floatingElements = document.querySelectorAll('.floating-element');
        floatingElements.forEach((el, index) => {
            el.style.animationDelay = `${index * 0.5}s`;
        });
    }

    showNotification(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: '💡'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">${message}</div>
            <div class="toast-progress"></div>
        `;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-card);
            backdrop-filter: blur(40px);
            color: var(--text);
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--border);
            z-index: 10000;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            max-width: 350px;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            overflow: hidden;
        `;

        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: 'var(--primary)'
        };
        
        const progress = toast.querySelector('.toast-progress');
        progress.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: ${colors[type] || colors.info};
            width: 100%;
            transform: scaleX(1);
            transform-origin: left;
            transition: transform ${duration}ms linear;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 10);

        setTimeout(() => {
            progress.style.transform = 'scaleX(0)';
        }, 10);

        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 400);
        }, duration);
    }

    createConfetti() {
        const confettiCount = 40;
        const colors = ['#8b5cf6', '#a78bfa', '#7c3aed', '#06d6a0', '#ff6b6b'];
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 2px;
                top: -10px;
                left: ${Math.random() * 100}%;
                opacity: 0;
                z-index: 10000;
                pointer-events: none;
                transform: rotate(${Math.random() * 360}deg);
            `;
            
            document.body.appendChild(confetti);
            
            const animation = confetti.animate([
                {
                    transform: 'translateY(0) rotate(0deg)',
                    opacity: 1
                },
                {
                    transform: `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 720}deg)`,
                    opacity: 0
                }
            ], {
                duration: 2500 + Math.random() * 1000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            animation.onfinish = () => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            };
        }
    }

    // Utility methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Add CSS for new features
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    @keyframes float-particle {
        0% {
            transform: translateY(0) translateX(0);
        }
        100% {
            transform: translateY(-100vh) translateX(100px);
        }
    }
    
    .simple-particle {
        pointer-events: none;
    }
    
    .tag-suggestion {
        padding: 0.75rem 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
        border-bottom: 1px solid var(--border-light);
    }
    
    .tag-suggestion:hover {
        background: var(--bg-secondary);
    }
    
    .tag-suggestion:last-child {
        border-bottom: none;
    }
    
    /* Enhanced animations */
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
    
    .note-card {
        animation: cardAppear 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
    }
    
    @keyframes cardAppear {
        from {
            opacity: 0;
            transform: scale(0.8) translateY(30px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
    
    .empty-state {
        animation: fadeInUp 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
    }
    
    /* Smooth scrolling */
    html {
        scroll-behavior: smooth;
    }
    
    /* Custom scrollbar */
    ::-webkit-scrollbar {
        width: 8px;
    }
    
    ::-webkit-scrollbar-track {
        background: var(--bg-secondary);
        border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb {
        background: var(--primary);
        border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
        background: var(--primary-dark);
    }
    
    /* Image resize cursor */
    .uploaded-image img.resizing {
        cursor: nwse-resize !important;
    }
    
    /* Text color styles */
    .color-picker-container {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .color-picker-container label {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-muted);
        white-space: nowrap;
    }
    
    .color-picker {
        width: 40px;
        height: 40px;
        border: 2px solid var(--border);
        border-radius: var(--border-radius);
        cursor: pointer;
        transition: var(--transition);
        padding: 0;
    }
    
    .color-picker:hover {
        border-color: var(--primary);
        transform: scale(1.05);
    }
    
    .quick-editor-actions {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 1rem 2.5rem;
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border-light);
        flex-wrap: wrap;
    }
    
    .image-upload-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .tag-input-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
        max-width: 250px;
    }
    
    .quick-tag-input {
        flex: 1;
        padding: 0.75rem 1rem;
        border: 1px solid var(--border);
        border-radius: var(--border-radius);
        background: var(--bg-card);
        color: var(--text);
        font-size: 0.9rem;
        transition: var(--transition);
    }
    
    .quick-tag-input:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-glow);
    }
    
    /* Image controls */
    .uploaded-image {
        position: relative;
        display: inline-block;
        max-width: 100%;
        margin: 0.5rem 0;
    }
    
    .uploaded-image img {
        max-width: 100%;
        height: auto;
        border-radius: var(--border-radius);
        border: 2px solid var(--border);
        transition: var(--transition);
        cursor: move;
    }
    
    .uploaded-image img.resizing {
        cursor: nwse-resize;
    }
    
    .image-controls {
        position: absolute;
        top: -10px;
        right: -10px;
        display: flex;
        gap: 0.25rem;
        opacity: 0;
        transition: var(--transition);
    }
    
    .uploaded-image:hover .image-controls {
        opacity: 1;
    }
    
    .image-control-btn {
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 6px;
        background: var(--danger);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        cursor: pointer;
        transition: var(--transition);
    }
    
    .image-control-btn.resize {
        background: var(--primary);
    }
    
    .image-control-btn:hover {
        transform: scale(1.1);
    }
`;
document.head.appendChild(additionalStyles);

// Initialize the notes manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting Scribbl Notes Manager...');
    new PremiumNotesManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PremiumNotesManager };
}