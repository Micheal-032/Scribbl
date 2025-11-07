// static/js/dataManager.js - COMPLETE FILE - COPY EVERYTHING
class DataManager {
    constructor() {
        this.currentUser = null;
    }

    setCurrentUser(email) {
        this.currentUser = email;
        localStorage.setItem('current_user', email);
    }

    getCurrentUser() {
        if (!this.currentUser) {
            this.currentUser = localStorage.getItem('current_user');
        }
        return this.currentUser;
    }

    getUserKey(key) {
        const user = this.getCurrentUser();
        return user ? `user_${user}_${key}` : null;
    }

    getNotes() {
        const userKey = this.getUserKey('notes');
        return userKey ? JSON.parse(localStorage.getItem(userKey) || '[]') : [];
    }

    saveNote(note) {
        const notes = this.getNotes();
        if (!note.id) note.id = Date.now().toString();
        if (!note.date) note.date = new Date().toISOString();
        
        notes.push(note);
        this.saveNotes(notes);
        
        this.addToHistory('note_created', `Created note: ${note.title}`);
        
        return note;
    }

    saveNotes(notes) {
        const userKey = this.getUserKey('notes');
        if (userKey) {
            localStorage.setItem(userKey, JSON.stringify(notes));
        }
    }

    getSecureNotes() {
        const userKey = this.getUserKey('secure_notes');
        return userKey ? JSON.parse(localStorage.getItem(userKey) || '[]') : [];
    }

    saveSecureNote(note) {
        const notes = this.getSecureNotes();
        if (!note.id) note.id = Date.now().toString();
        if (!note.date) note.date = new Date().toISOString();
        
        notes.push(note);
        this.saveSecureNotes(notes);
        
        this.addToHistory('secure_note_created', `Created secure note: ${note.title}`);
        
        return note;
    }

    saveSecureNotes(notes) {
        const userKey = this.getUserKey('secure_notes');
        if (userKey) {
            localStorage.setItem(userKey, JSON.stringify(notes));
        }
    }

    getHistory() {
        const userKey = this.getUserKey('history');
        return userKey ? JSON.parse(localStorage.getItem(userKey) || '[]') : [];
    }

    addToHistory(action, description) {
        const history = this.getHistory();
        history.unshift({
            action,
            description,
            timestamp: new Date().toISOString(),
            icon: this.getActionIcon(action)
        });
        
        if (history.length > 50) history.pop();
        
        const userKey = this.getUserKey('history');
        if (userKey) {
            localStorage.setItem(userKey, JSON.stringify(history));
        }
    }

    getActionIcon(action) {
        const icons = {
            'note_created': '📝',
            'secure_note_created': '🔒',
            'note_updated': '✏️',
            'note_deleted': '🗑️',
            'user_login': '🔑',
            'export_data': '📤'
        };
        return icons[action] || '📋';
    }

    getProgress() {
        const userKey = this.getUserKey('progress');
        return userKey ? JSON.parse(localStorage.getItem(userKey) || '{}') : {};
    }

    updateProgress() {
        const notes = this.getNotes();
        const secureNotes = this.getSecureNotes();
        const history = this.getHistory();
        
        const progress = {
            totalNotes: notes.length,
            secureNotes: secureNotes.length,
            totalHistory: history.length,
            lastUpdated: new Date().toISOString(),
            streak: this.calculateStreak(notes),
            avgWords: this.calculateAverageWords(notes)
        };
        
        const userKey = this.getUserKey('progress');
        if (userKey) {
            localStorage.setItem(userKey, JSON.stringify(progress));
        }
        
        return progress;
    }

    calculateStreak(notes) {
        if (notes.length === 0) return 0;
        
        const today = new Date();
        const dates = [...new Set(notes.map(note => {
            const date = new Date(note.date);
            return date.toDateString();
        }))].sort((a, b) => new Date(b) - new Date(a));
        
        let streak = 0;
        let currentDate = new Date(today);
        
        while (dates.includes(currentDate.toDateString())) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }
        
        return streak;
    }

    calculateAverageWords(notes) {
        if (notes.length === 0) return 0;
        
        const totalWords = notes.reduce((sum, note) => {
            const words = note.body ? note.body.split(/\s+/).length : 0;
            return sum + words;
        }, 0);
        
        return Math.round(totalWords / notes.length);
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('current_user');
    }

    exportUserData() {
        return {
            notes: this.getNotes(),
            secure_notes: this.getSecureNotes(),
            history: this.getHistory(),
            progress: this.getProgress(),
            exported_at: new Date().toISOString()
        };
    }

    clearUserData() {
        const user = this.getCurrentUser();
        if (user) {
            const keys = ['notes', 'secure_notes', 'history', 'progress', 'settings'];
            keys.forEach(key => {
                localStorage.removeItem(`user_${user}_${key}`);
            });
        }
    }
}

window.dataManager = new DataManager();