// static/js/dashboard.js

class PremiumDashboard {
    constructor() {
    this.notes = window.dataManager.getNotes();
    this.quickNoteModal = document.getElementById('quickNoteModal');
    this.activityList = document.getElementById('activityList');
    this.isCursorActive = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.init();
}

    init() {
        this.createParticles();
        this.initCustomCursor();
        this.bindEvents();
        this.loadUserData();
        this.renderStats();
        this.renderRecentActivity();
        this.startAnimations();
        this.initScrollProgress();
        this.initThemeToggle();
        this.initTiltEffects();
        this.initMagneticButtons();
        this.initRippleEffects();
    }

    createParticles() {
        const container = document.getElementById('particles');
        const particleCount = 50;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Random position
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            
            // Random size and animation delay
            const size = Math.random() * 3 + 1;
            const delay = Math.random() * 20;
            
            particle.style.cssText = `
                left: ${posX}%;
                top: ${posY}%;
                width: ${size}px;
                height: ${size}px;
                animation-delay: -${delay}s;
                opacity: ${Math.random() * 0.3 + 0.1};
            `;
            
            container.appendChild(particle);
        }
    }

    initCustomCursor() {
        this.cursor = document.getElementById('cursor');
        this.cursorFollower = document.getElementById('cursorFollower');
        
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            
            if (this.cursor && this.cursorFollower) {
                this.cursor.style.transform = `translate3d(${this.mouseX - 4}px, ${this.mouseY - 4}px, 0)`;
                this.cursorFollower.style.transform = `translate3d(${this.mouseX - 20}px, ${this.mouseY - 20}px, 0)`;
            }
        });

        // Add hover effects
        const hoverElements = document.querySelectorAll('button, .nav-item, .feature-card, .stat-card, .quick-action-btn');
        
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                this.cursor.classList.add('hover');
                this.cursorFollower.classList.add('hover');
            });
            
            el.addEventListener('mouseleave', () => {
                this.cursor.classList.remove('hover');
                this.cursorFollower.classList.remove('hover');
            });
        });

        // Enable cursor
        document.body.classList.add('cursor-active');
    }

    initTiltEffects() {
        const tiltElements = document.querySelectorAll('[data-tilt]');
        
        tiltElements.forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;
                
                el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
            });
            
            el.addEventListener('mouseleave', () => {
                el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
            });
        });
    }

    initMagneticButtons() {
        const magneticButtons = document.querySelectorAll('.magnetic');
        
        magneticButtons.forEach(button => {
            button.addEventListener('mousemove', (e) => {
                const rect = button.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const moveX = (x - centerX) * 0.2;
                const moveY = (y - centerY) * 0.2;
                
                button.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(1.05)`;
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translate3d(0, 0, 0) scale(1)';
            });
        });
    }

    initRippleEffects() {
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            if (target.classList.contains('nav-item') || 
                target.classList.contains('quick-action-btn') ||
                target.classList.contains('primary-btn') ||
                target.classList.contains('secondary-btn') ||
                target.closest('.nav-item') ||
                target.closest('.quick-action-btn') ||
                target.closest('.primary-btn') ||
                target.closest('.secondary-btn')) {
                
                const button = target.classList.contains('nav-item') || 
                              target.classList.contains('quick-action-btn') ||
                              target.classList.contains('primary-btn') ||
                              target.classList.contains('secondary-btn') ? 
                              target : 
                              target.closest('.nav-item, .quick-action-btn, .primary-btn, .secondary-btn');
                
                if (button) {
                    const ripple = button.querySelector('.button-ripple') || button.querySelector('.nav-ripple');
                    if (ripple) {
                        const rect = button.getBoundingClientRect();
                        const size = Math.max(rect.width, rect.height);
                        const x = e.clientX - rect.left - size / 2;
                        const y = e.clientY - rect.top - size / 2;
                        
                        ripple.style.cssText = `
                            width: ${size}px;
                            height: ${size}px;
                            left: ${x}px;
                            top: ${y}px;
                        `;
                        
                        ripple.classList.remove('button-ripple', 'nav-ripple');
                        void ripple.offsetWidth;
                        ripple.classList.add('button-ripple', 'nav-ripple');
                    }
                }
            }
        });
    }

    initScrollProgress() {
        const scrollBar = document.querySelector('.scroll-bar');
        
        window.addEventListener('scroll', () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;
            
            if (scrollBar) {
                scrollBar.style.width = `${scrollPercent}%`;
            }
        });
    }

    initThemeToggle() {
        const themeSwitch = document.getElementById('themeSwitch');
        const savedTheme = localStorage.getItem('theme') || 'light';
        
        if (savedTheme === 'dark') {
            document.body.classList.add('dark');
            themeSwitch.checked = true;
        }

        themeSwitch.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('dark');
                localStorage.setItem('theme', 'dark');
                this.showNotification('Dark mode enabled', 'success');
            } else {
                document.body.classList.remove('dark');
                localStorage.setItem('theme', 'light');
                this.showNotification('Light mode enabled', 'success');
            }
        });
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            if (btn.dataset.section !== 'home') {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = btn.onclick.toString().match(/href='(.*?)'/)[1];
                    this.animatePageTransition(() => {
                        window.location.href = target;
                    });
                });
            }
        });

        // Quick Note FAB
        document.getElementById('quickNoteBtn').addEventListener('click', () => this.openQuickNote());
        document.getElementById('closeQuickNote').addEventListener('click', () => this.closeQuickNote());
        document.getElementById('saveQuickNote').addEventListener('click', () => this.saveQuickNote());

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Input animations
        this.initInputAnimations();
    }

    initInputAnimations() {
        const inputs = document.querySelectorAll('.input-group input, .input-group textarea');
        
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.classList.add('focused');
            });
            
            input.addEventListener('blur', () => {
                if (!input.value) {
                    input.parentElement.classList.remove('focused');
                }
            });
            
            // Check initial values
            if (input.value) {
                input.parentElement.classList.add('focused');
            }
        });
    }

    animatePageTransition(callback) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--gradient);
            z-index: 9999;
            transform: scaleY(0);
            transform-origin: bottom;
            transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        `;
        
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.style.transform = 'scaleY(1)';
        }, 10);
        
        setTimeout(() => {
            callback();
        }, 600);
    }
    loadUserData() {
    const user = JSON.parse(localStorage.getItem('currentUser')) || { email: 'User' };
    document.getElementById('username').textContent = user.email.split('@')[0];
    
    // Load real data from dataManager
    const notes = window.dataManager.getNotes();
    const secureNotes = window.dataManager.getSecureNotes();
    const progress = window.dataManager.updateProgress();
    
    document.getElementById('totalNotes').textContent = notes.length;
    document.getElementById('secureNotes').textContent = secureNotes.length;
    document.getElementById('streakDays').textContent = progress.streak;
}
    
    renderStats() {
        const totalNotes = this.notes.length;
        const secureNotes = this.notes.filter(note => note.secure).length;
        const streak = this.calculateStreak();

        document.getElementById('totalNotes').textContent = totalNotes;
        document.getElementById('secureNotes').textContent = secureNotes;
        document.getElementById('streakDays').textContent = streak;

        this.animateNumbers();
        this.animateProgressBars();
    }

    calculateStreak() {
        const today = new Date();
        const lastActivity = localStorage.getItem('lastActivity');
        
        if (!lastActivity) return 0;
        
        const lastDate = new Date(lastActivity);
        const diffTime = Math.abs(today - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays === 1 ? 7 : Math.min(7, Math.floor(Math.random() * 7) + 1);
    }

    animateNumbers() {
        const counters = document.querySelectorAll('.stat-number');
        counters.forEach(counter => {
            const target = parseInt(counter.textContent);
            let current = 0;
            const increment = target / 30;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    counter.textContent = target;
                    clearInterval(timer);
                } else {
                    counter.textContent = Math.floor(current);
                }
            }, 50);
        });
    }

    animateProgressBars() {
        const progressBars = document.querySelectorAll('.stat-progress');
        progressBars.forEach(bar => {
            setTimeout(() => {
                bar.style.width = '100%';
            }, 1000);
        });
    }

    renderRecentActivity() {
        const activities = this.generateRecentActivities();
        this.activityList.innerHTML = '';

        activities.forEach((activity, index) => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.style.animationDelay = `${index * 100}ms`;
            activityItem.innerHTML = `
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            `;
            this.activityList.appendChild(activityItem);
        });
    }
    generateRecentActivities() {
    const history = window.dataManager.getHistory().slice(0, 4);
    return history.map(item => ({
        icon: item.icon,
        title: item.description,
        time: this.formatTime(new Date(item.timestamp))
    }));
}

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes} minutes ago`;
        if (hours < 24) return `${hours} hours ago`;
        return `${days} days ago`;
    }

    openQuickNote() {
        this.quickNoteModal.classList.remove('hidden');
        document.getElementById('quickNoteTitle').value = '';
        document.getElementById('quickNoteBody').value = '';
        
        setTimeout(() => {
            document.getElementById('quickNoteTitle').focus();
        }, 400);
    }

    closeQuickNote() {
        this.quickNoteModal.classList.add('hidden');
    }
    saveQuickNote() {
    const title = document.getElementById('quickNoteTitle').value.trim();
    const body = document.getElementById('quickNoteBody').value.trim();

    if (!title && !body) {
        this.showNotification('Please add a title or content for your note', 'warning');
        return;
    }

    const newNote = {
        title: title || 'Quick Note',
        body: body,
        tags: ['quick']
    };

    window.dataManager.saveNote(newNote);
    window.dataManager.updateProgress();
    
    this.closeQuickNote();
    this.renderStats();
    this.renderRecentActivity();
    
    this.showNotification('Quick note saved successfully!', 'success');
    this.createConfetti();
}

    createConfetti() {
        const confettiCount = 50;
        const colors = ['#5b5fe9', '#6d72f0', '#4a4fd8', '#8b5cf6'];
        
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
            
            animation.onfinish = () => confetti.remove();
        }
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'n':
                    e.preventDefault();
                    this.openQuickNote();
                    break;
                case 'k':
                    e.preventDefault();
                    // Focus search (would be implemented in notes page)
                    break;
                case '/':
                    e.preventDefault();
                    this.showKeyboardHelp();
                    break;
                case 't':
                    e.preventDefault();
                    document.getElementById('themeSwitch').click();
                    break;
            }
        }

        if (e.key === 'Escape') {
            this.closeQuickNote();
        }
    }

    showKeyboardHelp() {
        const helpMessage = `
Quick Keyboard Shortcuts:
• Ctrl+N - New quick note
• Ctrl+K - Search notes
• Ctrl+T - Toggle theme
• Ctrl+/ - Show this help
• Escape - Close modals
        `;
        
        this.showNotification(helpMessage, 'info', 5000);
    }

    showNotification(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--card-bg);
            backdrop-filter: blur(20px);
            color: var(--text);
            padding: 15px 20px;
            border-radius: 12px;
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--glass-dark);
            z-index: 1000;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            max-width: 300px;
            border-left: 4px solid var(--primary);
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 10);

        // Animate out
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    startAnimations() {
        // Add intersection observer for feature cards
        const featureCards = document.querySelectorAll('.feature-card');
        const activityItems = document.querySelectorAll('.activity-item');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationDelay = entry.target.dataset.delay || '0s';
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });

        featureCards.forEach((card, index) => {
            card.dataset.delay = `${index * 100}ms`;
            observer.observe(card);
        });

        activityItems.forEach((item, index) => {
            item.dataset.delay = `${index * 50}ms`;
            observer.observe(item);
        });

        // Update last activity
        localStorage.setItem('lastActivity', new Date().toISOString());
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            this.animatePageTransition(() => {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('lastActivity');
                window.location.href = 'index.html';
            });
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PremiumDashboard();
});

// Add enhanced CSS for animations
const enhancedStyle = document.createElement('style');
enhancedStyle.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .feature-card {
        opacity: 0;
        transform: translateY(30px) perspective(1000px) rotateX(10deg);
        transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    
    .feature-card.animate-in {
        opacity: 1;
        transform: translateY(0) perspective(1000px) rotateX(0);
    }
    
    .activity-item {
        opacity: 0;
        transform: translateX(-30px);
        transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    
    .activity-item.animate-in {
        opacity: 1;
        transform: translateX(0);
    }
    
    .toast-success { border-left-color: #10b981 !important; }
    .toast-error { border-left-color: #ef4444 !important; }
    .toast-warning { border-left-color: #f59e0b !important; }
    .toast-info { border-left-color: var(--primary) !important; }
    
    .input-group.focused label {
        top: -10px !important;
        font-size: 0.8rem !important;
        color: var(--primary) !important;
    }
    
    /* Performance optimizations */
    .feature-card,
    .stat-card,
    .floating-card {
        will-change: transform;
        transform: translateZ(0);
    }
    
    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
        .feature-card,
        .activity-item,
        .floating-card,
        .shape {
            animation: none !important;
            transition: none !important;
        }
    }
`;
document.head.appendChild(enhancedStyle);