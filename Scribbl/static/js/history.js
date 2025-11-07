// History Module for Scribbl
class HistoryManager {
    constructor() {
        this.versions = [];
        this.filteredVersions = [];
        this.currentView = 'timeline';
        this.selectedNote = 'all';
        this.dateFilter = 'all';
        this.sortBy = 'newest';
        this.searchQuery = '';
        this.bulkCompareItems = [];
        
        this.init();
    }

    async init() {
        await this.loadVersions();
        this.renderStats();
        this.setupEventListeners();
        this.renderTimeline();
        this.populateNoteFilter();
        this.initCharts();
    }

    async loadVersions() {
        try {
            // Load from localStorage or IndexedDB
            const savedVersions = localStorage.getItem('scribbl_versions');
            this.versions = savedVersions ? JSON.parse(savedVersions) : await this.generateSampleData();
            
            // Apply initial filters
            this.applyFilters();
        } catch (error) {
            console.error('Error loading versions:', error);
            this.versions = await this.generateSampleData();
        }
    }

    async generateSampleData() {
        // Generate sample version history data
        const sampleNotes = [
            { id: '1', title: 'Project Ideas', content: 'Brainstorming new project ideas...' },
            { id: '2', title: 'Meeting Notes', content: 'Important points from team meeting...' },
            { id: '3', title: 'Personal Goals', content: 'My goals for this quarter...' },
            { id: '4', title: 'Research Findings', content: 'Summary of recent research...' }
        ];

        const versions = [];
        const now = new Date();

        sampleNotes.forEach(note => {
            // Create multiple versions for each note
            for (let i = 0; i < 3; i++) {
                const versionDate = new Date(now);
                versionDate.setDate(versionDate.getDate() - i * 2);
                versionDate.setHours(10 + i, 30 + i * 10, 0);

                versions.push({
                    id: `${note.id}_v${i}`,
                    noteId: note.id,
                    noteTitle: note.title,
                    content: i === 0 ? note.content : `Previous version ${i} of ${note.title}`,
                    timestamp: versionDate.toISOString(),
                    wordCount: Math.floor(Math.random() * 100) + 50,
                    characterCount: Math.floor(Math.random() * 500) + 200,
                    isBookmarked: Math.random() > 0.8,
                    versionNumber: i + 1,
                    changes: {
                        wordsAdded: Math.floor(Math.random() * 20),
                        wordsRemoved: Math.floor(Math.random() * 15),
                        charactersChanged: Math.floor(Math.random() * 100)
                    }
                });
            }
        });

        // Save sample data
        localStorage.setItem('scribbl_versions', JSON.stringify(versions));
        return versions;
    }

    setupEventListeners() {
        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Filters
        document.getElementById('dateFilter').addEventListener('change', (e) => {
            this.dateFilter = e.target.value;
            this.applyFilters();
        });

        document.getElementById('noteFilter').addEventListener('change', (e) => {
            this.selectedNote = e.target.value;
            this.applyFilters();
        });

        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.applyFilters();
        });

        // Search
        document.getElementById('historySearch').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Export
        document.getElementById('exportHistory').addEventListener('click', () => {
            this.exportHistory();
        });

        // Bulk compare
        document.getElementById('bulkCompare').addEventListener('click', () => {
            this.openBulkCompare();
        });
    }

    applyFilters() {
        let filtered = [...this.versions];

        // Filter by note
        if (this.selectedNote !== 'all') {
            filtered = filtered.filter(version => version.noteId === this.selectedNote);
        }

        // Filter by date
        const now = new Date();
        switch (this.dateFilter) {
            case 'today':
                filtered = filtered.filter(version => {
                    const versionDate = new Date(version.timestamp);
                    return versionDate.toDateString() === now.toDateString();
                });
                break;
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                filtered = filtered.filter(version => new Date(version.timestamp) >= weekAgo);
                break;
            case 'month':
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                filtered = filtered.filter(version => new Date(version.timestamp) >= monthAgo);
                break;
        }

        // Search filter
        if (this.searchQuery) {
            filtered = filtered.filter(version => 
                version.noteTitle.toLowerCase().includes(this.searchQuery) ||
                version.content.toLowerCase().includes(this.searchQuery)
            );
        }

        // Sort
        switch (this.sortBy) {
            case 'newest':
                filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                break;
            case 'oldest':
                filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                break;
            case 'title':
                filtered.sort((a, b) => a.noteTitle.localeCompare(b.noteTitle));
                break;
        }

        this.filteredVersions = filtered;
        this.renderCurrentView();
    }

    switchView(view) {
        this.currentView = view;
        
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        // Show/hide views
        document.getElementById('timelineView').classList.remove('active');
        document.getElementById('listView').classList.remove('active');
        document.getElementById('statsView').classList.remove('active');
        document.getElementById(`${view}View`).classList.add('active');

        this.renderCurrentView();
    }

    renderCurrentView() {
        switch (this.currentView) {
            case 'timeline':
                this.renderTimeline();
                break;
            case 'list':
                this.renderList();
                break;
            case 'stats':
                this.updateCharts();
                break;
        }
    }

    renderTimeline() {
        const container = document.querySelector('.timeline-container');
        if (!container) return;

        // Group versions by date
        const groupedVersions = this.groupVersionsByDate(this.filteredVersions);
        
        let html = '';
        
        Object.keys(groupedVersions).forEach(date => {
            html += `
                <div class="timeline-group">
                    <div class="timeline-date">
                        <i class="fas fa-calendar-day"></i>
                        ${this.formatDateHeader(date)}
                    </div>
            `;

            groupedVersions[date].forEach(version => {
                html += this.createTimelineItem(version);
            });

            html += `</div>`;
        });

        container.innerHTML = html;
        this.attachTimelineEventListeners();
    }

    renderList() {
        const container = document.querySelector('.versions-list');
        if (!container) return;

        let html = '';

        this.filteredVersions.forEach(version => {
            html += `
                <div class="version-card" data-version-id="${version.id}">
                    <div class="version-info">
                        <div class="version-meta">
                            <h3 class="version-title">${version.noteTitle}</h3>
                            <span class="version-time">
                                <i class="fas fa-clock"></i>
                                ${this.formatDateTime(version.timestamp)}
                            </span>
                        </div>
                        <div class="version-preview">
                            ${version.content.substring(0, 150)}...
                        </div>
                        <div class="version-stats">
                            <span class="stat-badge">
                                <i class="fas fa-font"></i>
                                ${version.wordCount} words
                            </span>
                            <span class="stat-badge">
                                <i class="fas fa-plus"></i>
                                +${version.changes.wordsAdded} words
                            </span>
                            <span class="stat-badge">
                                <i class="fas fa-minus"></i>
                                -${version.changes.wordsRemoved} words
                            </span>
                        </div>
                    </div>
                    <div class="version-actions">
                        <button class="timeline-btn restore-btn" data-action="restore" data-version-id="${version.id}">
                            <i class="fas fa-rotate-left"></i>
                            Restore
                        </button>
                        <button class="timeline-btn compare-btn" data-action="compare" data-version-id="${version.id}">
                            <i class="fas fa-code-compare"></i>
                            Compare
                        </button>
                        <button class="timeline-btn bookmark-btn ${version.isBookmarked ? 'bookmarked' : ''}" 
                                data-action="bookmark" data-version-id="${version.id}">
                            <i class="fas fa-bookmark"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        this.attachListEventListeners();
    }

    createTimelineItem(version) {
        return `
            <div class="timeline-item" data-version-id="${version.id}">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <h3 class="timeline-title">${version.noteTitle}</h3>
                        <span class="timeline-time">
                            <i class="fas fa-clock"></i>
                            ${this.formatTime(version.timestamp)}
                        </span>
                    </div>
                    <div class="timeline-preview">
                        ${version.content.substring(0, 100)}...
                    </div>
                    <div class="timeline-stats">
                        <span class="stat-badge">
                            <i class="fas fa-font"></i>
                            ${version.wordCount} words
                        </span>
                        <span class="stat-badge">
                            <i class="fas fa-plus"></i>
                            +${version.changes.wordsAdded}
                        </span>
                        <span class="stat-badge">
                            <i class="fas fa-minus"></i>
                            -${version.changes.wordsRemoved}
                        </span>
                    </div>
                    <div class="timeline-actions">
                        <button class="timeline-btn restore-btn" data-action="restore" data-version-id="${version.id}">
                            <i class="fas fa-rotate-left"></i>
                            Restore
                        </button>
                        <button class="timeline-btn compare-btn" data-action="compare" data-version-id="${version.id}">
                            <i class="fas fa-code-compare"></i>
                            Compare
                        </button>
                        <button class="timeline-btn diff-btn" data-action="diff" data-version-id="${version.id}">
                            <i class="fas fa-file-diff"></i>
                            View Diff
                        </button>
                        <button class="timeline-btn bookmark-btn ${version.isBookmarked ? 'bookmarked' : ''}" 
                                data-action="bookmark" data-version-id="${version.id}">
                            <i class="fas fa-bookmark"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    attachTimelineEventListeners() {
        document.querySelectorAll('.timeline-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const versionId = btn.dataset.versionId;
                this.handleVersionAction(action, versionId);
            });
        });
    }

    attachListEventListeners() {
        document.querySelectorAll('.version-actions .timeline-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const versionId = btn.dataset.versionId;
                this.handleVersionAction(action, versionId);
            });
        });
    }

    handleVersionAction(action, versionId) {
        const version = this.versions.find(v => v.id === versionId);
        if (!version) return;

        switch (action) {
            case 'restore':
                this.restoreVersion(version);
                break;
            case 'compare':
                this.openCompareModal(version);
                break;
            case 'diff':
                this.showDiffView(version);
                break;
            case 'bookmark':
                this.toggleBookmark(version);
                break;
        }
    }

    async restoreVersion(version) {
        if (confirm(`Are you sure you want to restore this version of "${version.noteTitle}"?`)) {
            try {
                // Update the current note with this version's content
                const notes = JSON.parse(localStorage.getItem('scribbl_notes') || '[]');
                const noteIndex = notes.findIndex(n => n.id === version.noteId);
                
                if (noteIndex !== -1) {
                    // Create a backup of current version before restoring
                    const currentNote = notes[noteIndex];
                    this.createVersionBackup(currentNote);
                    
                    // Restore the version
                    notes[noteIndex].content = version.content;
                    notes[noteIndex].updatedAt = new Date().toISOString();
                    
                    localStorage.setItem('scribbl_notes', JSON.stringify(notes));
                    
                    // Show success message
                    this.showNotification(`Version restored successfully!`, 'success');
                    
                    // Update stats
                    this.renderStats();
                }
            } catch (error) {
                console.error('Error restoring version:', error);
                this.showNotification('Error restoring version', 'error');
            }
        }
    }

    createVersionBackup(note) {
        const backupVersion = {
            id: `${note.id}_backup_${Date.now()}`,
            noteId: note.id,
            noteTitle: note.title,
            content: note.content,
            timestamp: new Date().toISOString(),
            wordCount: note.content.split(/\s+/).length,
            characterCount: note.content.length,
            isBookmarked: false,
            versionNumber: this.versions.filter(v => v.noteId === note.id).length + 1,
            changes: { wordsAdded: 0, wordsRemoved: 0, charactersChanged: 0 }
        };
        
        this.versions.unshift(backupVersion);
        localStorage.setItem('scribbl_versions', JSON.stringify(this.versions));
    }

    openCompareModal(version) {
        // For single version compare, show diff with current version
        this.showDiffView(version);
    }

    showDiffView(version) {
        // Get current version of the note
        const notes = JSON.parse(localStorage.getItem('scribbl_notes') || '[]');
        const currentNote = notes.find(n => n.id === version.noteId);
        
        if (!currentNote) {
            this.showNotification('Current version of note not found', 'error');
            return;
        }

        // Generate diff HTML
        const diffHtml = this.generateDiffHTML(version.content, currentNote.content);
        
        const modalHTML = `
            <div class="bulk-compare-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-code-compare"></i> Compare Versions</h2>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="compare-grid">
                            <div class="compare-panel">
                                <div class="panel-header">
                                    <span class="panel-title">Version from ${this.formatDateTime(version.timestamp)}</span>
                                </div>
                                <div class="panel-content">
                                    <pre>${version.content}</pre>
                                </div>
                            </div>
                            <div class="compare-panel">
                                <div class="panel-header">
                                    <span class="panel-title">Current Version</span>
                                </div>
                                <div class="panel-content">
                                    <pre>${currentNote.content}</pre>
                                </div>
                            </div>
                        </div>
                        <div class="diff-viewer" style="margin-top: 2rem;">
                            <div class="diff-header">
                                <h3>Changes Summary</h3>
                                <div class="diff-stats">
                                    <span class="diff-added">
                                        <i class="fas fa-plus"></i>
                                        ${this.countAddedWords(version.content, currentNote.content)} words added
                                    </span>
                                    <span class="diff-removed">
                                        <i class="fas fa-minus"></i>
                                        ${this.countRemovedWords(version.content, currentNote.content)} words removed
                                    </span>
                                </div>
                            </div>
                            <div class="diff-content">
                                ${diffHtml}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="timeline-btn secondary-btn" id="closeDiffView">
                            Close
                        </button>
                        <button class="timeline-btn restore-btn" data-version-id="${version.id}">
                            <i class="fas fa-rotate-left"></i>
                            Restore This Version
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalsContainer').innerHTML = modalHTML;
        
        // Add event listeners
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('modalsContainer').innerHTML = '';
        });
        
        document.getElementById('closeDiffView').addEventListener('click', () => {
            document.getElementById('modalsContainer').innerHTML = '';
        });
        
        document.querySelector('.modal-footer .restore-btn').addEventListener('click', () => {
            this.restoreVersion(version);
            document.getElementById('modalsContainer').innerHTML = '';
        });
    }

    generateDiffHTML(oldText, newText) {
        // Simple diff implementation - in a real app, use a proper diff library
        const oldWords = oldText.split(/\s+/);
        const newWords = newText.split(/\s+/);
        
        let html = '';
        let i = 0, j = 0;
        
        while (i < oldWords.length || j < newWords.length) {
            if (i < oldWords.length && j < newWords.length && oldWords[i] === newWords[j]) {
                html += `<div class="diff-line unchanged">${oldWords[i]}</div>`;
                i++;
                j++;
            } else {
                // Check if it's a removal
                if (i < oldWords.length && !newWords.includes(oldWords[i])) {
                    html += `<div class="diff-line removed">${oldWords[i]}</div>`;
                    i++;
                }
                // Check if it's an addition
                else if (j < newWords.length && !oldWords.includes(newWords[j])) {
                    html += `<div class="diff-line added">${newWords[j]}</div>`;
                    j++;
                } else {
                    // Fallback - just show both
                    if (i < oldWords.length) {
                        html += `<div class="diff-line removed">${oldWords[i]}</div>`;
                        i++;
                    }
                    if (j < newWords.length) {
                        html += `<div class="diff-line added">${newWords[j]}</div>`;
                        j++;
                    }
                }
            }
        }
        
        return html;
    }

    countAddedWords(oldText, newText) {
        const oldWords = new Set(oldText.split(/\s+/));
        const newWords = newText.split(/\s+/);
        return newWords.filter(word => !oldWords.has(word)).length;
    }

    countRemovedWords(oldText, newText) {
        const newWords = new Set(newText.split(/\s+/));
        const oldWords = oldText.split(/\s+/);
        return oldWords.filter(word => !newWords.has(word)).length;
    }

    toggleBookmark(version) {
        version.isBookmarked = !version.isBookmarked;
        localStorage.setItem('scribbl_versions', JSON.stringify(this.versions));
        this.applyFilters(); // Re-render to update bookmark state
        this.showNotification(
            version.isBookmarked ? 'Version bookmarked' : 'Bookmark removed', 
            'success'
        );
    }

    openBulkCompare() {
        const modalHTML = `
            <div class="bulk-compare-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-layer-group"></i> Compare Multiple Versions</h2>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Select versions to compare (max 4):</p>
                        <div class="versions-selection">
                            ${this.filteredVersions.slice(0, 10).map(version => `
                                <label class="version-checkbox">
                                    <input type="checkbox" value="${version.id}">
                                    <span>${version.noteTitle} - ${this.formatDateTime(version.timestamp)}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div class="compare-preview" id="comparePreview" style="display: none; margin-top: 1rem;">
                            <h4>Selected versions:</h4>
                            <div id="selectedVersionsList"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="timeline-btn secondary-btn" id="cancelBulkCompare">
                            Cancel
                        </button>
                        <button class="timeline-btn compare-btn" id="startBulkCompare" disabled>
                            <i class="fas fa-code-compare"></i>
                            Compare Selected
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalsContainer').innerHTML = modalHTML;
        
        // Add event listeners for bulk compare
        this.setupBulkCompareEvents();
    }

    setupBulkCompareEvents() {
        const checkboxes = document.querySelectorAll('.version-checkbox input');
        const startBtn = document.getElementById('startBulkCompare');
        const preview = document.getElementById('comparePreview');
        const selectedList = document.getElementById('selectedVersionsList');
        
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const selected = Array.from(checkboxes).filter(cb => cb.checked);
                startBtn.disabled = selected.length < 2;
                
                if (selected.length > 0) {
                    preview.style.display = 'block';
                    selectedList.innerHTML = selected.map(cb => {
                        const version = this.versions.find(v => v.id === cb.value);
                        return `<div>• ${version.noteTitle} - ${this.formatDateTime(version.timestamp)}</div>`;
                    }).join('');
                } else {
                    preview.style.display = 'none';
                }
                
                // Limit to 4 selections
                if (selected.length >= 4) {
                    checkboxes.forEach(cb => {
                        if (!cb.checked) cb.disabled = true;
                    });
                } else {
                    checkboxes.forEach(cb => cb.disabled = false);
                }
            });
        });
        
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('modalsContainer').innerHTML = '';
        });
        
        document.getElementById('cancelBulkCompare').addEventListener('click', () => {
            document.getElementById('modalsContainer').innerHTML = '';
        });
        
        document.getElementById('startBulkCompare').addEventListener('click', () => {
            const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
            this.showBulkCompare(selected);
        });
    }

    showBulkCompare(versionIds) {
        const selectedVersions = versionIds.map(id => this.versions.find(v => v.id === id));
        
        let compareHTML = `
            <div class="bulk-compare-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-layer-group"></i> Comparing ${selectedVersions.length} Versions</h2>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="compare-grid" style="grid-template-columns: repeat(${Math.min(selectedVersions.length, 2)}, 1fr);">
        `;
        
        selectedVersions.forEach(version => {
            compareHTML += `
                <div class="compare-panel">
                    <div class="panel-header">
                        <span class="panel-title">${version.noteTitle}</span>
                        <small>${this.formatDateTime(version.timestamp)}</small>
                    </div>
                    <div class="panel-content">
                        <pre>${version.content}</pre>
                    </div>
                </div>
            `;
        });
        
        compareHTML += `
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="timeline-btn secondary-btn" id="closeBulkCompare">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modalsContainer').innerHTML = compareHTML;
        
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('modalsContainer').innerHTML = '';
        });
        
        document.getElementById('closeBulkCompare').addEventListener('click', () => {
            document.getElementById('modalsContainer').innerHTML = '';
        });
    }

    renderStats() {
        const totalVersions = this.versions.length;
        const editedNotes = new Set(this.versions.map(v => v.noteId)).size;
        const today = new Date().toDateString();
        const todayEdits = this.versions.filter(v => 
            new Date(v.timestamp).toDateString() === today
        ).length;
        const restoredCount = parseInt(localStorage.getItem('scribbl_restored_count') || '0');

        document.getElementById('totalVersions').textContent = totalVersions;
        document.getElementById('editedNotes').textContent = editedNotes;
        document.getElementById('todayEdits').textContent = todayEdits;
        document.getElementById('restoredCount').textContent = restoredCount;
    }

    populateNoteFilter() {
        const noteFilter = document.getElementById('noteFilter');
        const uniqueNotes = [...new Set(this.versions.map(v => v.noteId))];
        
        uniqueNotes.forEach(noteId => {
            const note = this.versions.find(v => v.noteId === noteId);
            const option = document.createElement('option');
            option.value = noteId;
            option.textContent = note.noteTitle;
            noteFilter.appendChild(option);
        });
    }

    initCharts() {
        this.editsChart = new Chart(document.getElementById('editsChart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Edits per Day',
                    data: [],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        this.notesChart = new Chart(document.getElementById('notesChart'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Number of Versions',
                    data: [],
                    backgroundColor: '#8b5cf6'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        this.updateCharts();
    }

    updateCharts() {
        // Update edits over time chart
        const last7Days = this.getLast7Days();
        const editsByDay = this.getEditsByDay(last7Days);
        
        this.editsChart.data.labels = last7Days.map(date => 
            date.toLocaleDateString('en-US', { weekday: 'short' })
        );
        this.editsChart.data.datasets[0].data = editsByDay;
        this.editsChart.update();

        // Update most edited notes chart
        const noteEdits = this.getNoteEditCounts();
        const topNotes = Object.entries(noteEdits)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        this.notesChart.data.labels = topNotes.map(([noteId]) => {
            const note = this.versions.find(v => v.noteId === noteId);
            return note ? note.noteTitle : 'Unknown';
        });
        this.notesChart.data.datasets[0].data = topNotes.map(([, count]) => count);
        this.notesChart.update();
    }

    getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date);
        }
        return days;
    }

    getEditsByDay(days) {
        return days.map(day => {
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);
            
            return this.versions.filter(version => {
                const versionDate = new Date(version.timestamp);
                return versionDate >= dayStart && versionDate <= dayEnd;
            }).length;
        });
    }

    getNoteEditCounts() {
        const counts = {};
        this.versions.forEach(version => {
            counts[version.noteId] = (counts[version.noteId] || 0) + 1;
        });
        return counts;
    }

    groupVersionsByDate(versions) {
        const groups = {};
        versions.forEach(version => {
            const date = new Date(version.timestamp).toDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(version);
        });
        return groups;
    }

    formatDateHeader(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
    }

    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    exportHistory() {
        const exportData = {
            exportedAt: new Date().toISOString(),
            totalVersions: this.versions.length,
            versions: this.versions
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `scribbl-history-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('History exported successfully!', 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `history-notification history-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles if not already added
        if (!document.querySelector('#history-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'history-notification-styles';
            styles.textContent = `
                .history-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--history-card);
                    border: 1px solid var(--history-border);
                    border-radius: 8px;
                    padding: 1rem 1.5rem;
                    box-shadow: var(--history-shadow-lg);
                    z-index: 1000;
                    transform: translateX(100%);
                    transition: transform 0.3s ease;
                }
                .history-notification.show {
                    transform: translateX(0);
                }
                .history-notification-success {
                    border-left: 4px solid #10b981;
                }
                .history-notification-error {
                    border-left: 4px solid #ef4444;
                }
                .history-notification-info {
                    border-left: 4px solid #3b82f6;
                }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .history-notification i {
                    font-size: 1.2rem;
                }
                .history-notification-success i { color: #10b981; }
                .history-notification-error i { color: #ef4444; }
                .history-notification-info i { color: #3b82f6; }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize History Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HistoryManager();
});