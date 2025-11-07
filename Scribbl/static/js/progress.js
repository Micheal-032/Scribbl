class ProgressDashboard {
    constructor() {
        this.notes = JSON.parse(localStorage.getItem('notes')) || [];
        this.currentFilter = '30';
        this.charts = {};
        this.customDateRange = null;
        this.exportData = {};
        this.init();
    }

    init() {
        this.showLoading();
        setTimeout(() => {
            this.bindEvents();
            this.loadUserData();
            this.renderStats();
            this.renderCharts();
            this.renderHabits();
            this.renderInsights();
            this.initTimeFilter();
            this.setupExportPreview();
            this.hideLoading();
        }, 1500);
    }

    showLoading() {
        document.getElementById('loadingOverlay').classList.add('active');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    }

    bindEvents() {
        // Analytics navigation
        document.querySelectorAll('.analytics-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.switchAnalyticsSection(section);
            });
        });

        // Time filter
        document.getElementById('timeFilter').addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                this.openDateRangeModal();
            } else {
                this.currentFilter = e.target.value;
                this.customDateRange = null;
                this.renderCharts();
                this.renderStats();
            }
        });

        // Goal checkboxes
        document.querySelectorAll('.goal-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.updateGoalsProgress();
            });
        });

        // Export buttons
        document.getElementById('exportPdfBtn').addEventListener('click', () => {
            this.exportToPDF();
        });

        document.getElementById('shareProgressBtn').addEventListener('click', () => {
            this.openShareModal();
        });

        // Chart interactions
        document.addEventListener('click', (e) => {
            const chartCard = e.target.closest('.analytics-card[data-chart-type]');
            if (chartCard) {
                const chartType = chartCard.dataset.chartType;
                this.openChartDetails(chartType);
            }

            const chartAction = e.target.closest('.chart-action-btn');
            if (chartAction) {
                const action = chartAction.dataset.action;
                const chartCard = chartAction.closest('.analytics-card');
                const chartType = chartCard.dataset.chartType;
                this.handleChartAction(action, chartType);
            }
        });

        // Export options
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.format;
                this.handleExport(format);
            });
        });

        // Modal events
        this.bindModalEvents();
    }

    bindModalEvents() {
        // Date range modal
        document.getElementById('applyDateRange').addEventListener('click', () => {
            this.applyCustomDateRange();
        });

        document.getElementById('cancelDateRange').addEventListener('click', () => {
            this.closeDateRangeModal();
        });

        // Fullscreen modal
        document.getElementById('closeFullscreen').addEventListener('click', () => {
            this.closeFullscreenModal();
        });

        // Share modal
        document.getElementById('closeShare').addEventListener('click', () => {
            this.closeShareModal();
        });

        document.querySelectorAll('.share-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const platform = e.currentTarget.dataset.platform;
                this.handleShare(platform);
            });
        });
    }

    loadUserData() {
        const user = JSON.parse(localStorage.getItem('currentUser')) || { email: 'User' };
        document.getElementById('username').textContent = user.email.split('@')[0];
    }

    switchAnalyticsSection(section) {
        // Update active nav button
        document.querySelectorAll('.analytics-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Show active section
        document.querySelectorAll('.analytics-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(section).classList.add('active');

        // Load specific section content
        if (section === 'charts') {
            this.loadChartsSection();
        } else if (section === 'export') {
            this.updateExportPreview();
        }
    }

    renderStats() {
        const totalNotes = this.notes.length;
        const streak = this.calculateStreak();
        const avgWords = this.calculateAverageWords();
        const totalTags = this.calculateTotalTags();

        document.getElementById('totalNotesProgress').textContent = totalNotes;
        document.getElementById('streakDaysProgress').textContent = streak;
        document.getElementById('avgWordsProgress').textContent = avgWords;
        document.getElementById('totalTagsProgress').textContent = totalTags;

        // Calculate trends
        this.calculateTrends();

        this.animateNumbers();
        this.createConfettiIfAchievement();
    }

    calculateStreak() {
        if (this.notes.length === 0) return 0;
        
        const today = new Date();
        const dates = [...new Set(this.notes.map(note => {
            const date = new Date(note.date || note.createdAt);
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

    calculateAverageWords() {
        if (this.notes.length === 0) return 0;
        
        const totalWords = this.notes.reduce((sum, note) => {
            const words = note.body ? note.body.split(/\s+/).length : 0;
            return sum + words;
        }, 0);
        
        return Math.round(totalWords / this.notes.length);
    }

    calculateTotalTags() {
        const allTags = this.notes.flatMap(note => note.tags || []);
        return new Set(allTags).size;
    }

    calculateTrends() {
        // Simulate trend calculations
        const trends = {
            notes: Math.random() > 0.3 ? 'up' : Math.random() > 0.7 ? 'down' : 'neutral',
            streak: Math.random() > 0.2 ? 'up' : 'neutral',
            words: Math.random() > 0.4 ? 'up' : Math.random() > 0.8 ? 'down' : 'neutral',
            tags: Math.random() > 0.3 ? 'up' : 'neutral'
        };

        const trendElements = {
            notes: document.getElementById('notesTrend'),
            streak: document.getElementById('streakTrend'),
            words: document.getElementById('wordsTrend'),
            tags: document.getElementById('tagsTrend')
        };

        Object.keys(trends).forEach(key => {
            const element = trendElements[key];
            const trend = trends[key];
            
            element.className = 'stat-trend';
            element.classList.add(trend);
            
            if (trend === 'up') {
                element.textContent = '↗';
            } else if (trend === 'down') {
                element.textContent = '↘';
            } else {
                element.textContent = '→';
            }
        });
    }

    animateNumbers() {
        const counters = document.querySelectorAll('.progress-stat-card .stat-number');
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

    renderCharts() {
        this.renderActivityChart();
        this.renderNoteTypesChart();
        this.renderProductivityStats();
        this.renderTopTags();
    }

    renderActivityChart() {
        const ctx = document.getElementById('activityChart');
        if (!ctx) return;

        const data = this.getActivityData();
        
        if (this.charts.activity) {
            this.charts.activity.destroy();
        }

        this.charts.activity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Notes Created',
                    data: data.values,
                    borderColor: '#5b5fe9',
                    backgroundColor: 'rgba(91, 95, 233, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#5b5fe9',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#5b5fe9',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: 'var(--text-muted)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'var(--text-muted)'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'nearest'
                },
                animations: {
                    tension: {
                        duration: 1000,
                        easing: 'linear'
                    }
                }
            }
        });
    }

    renderNoteTypesChart() {
        const ctx = document.getElementById('noteTypesChart');
        if (!ctx) return;

        const regularNotes = this.notes.filter(note => !note.secure).length;
        const secureNotes = this.notes.filter(note => note.secure).length;

        if (this.charts.noteTypes) {
            this.charts.noteTypes.destroy();
        }

        this.charts.noteTypes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Regular Notes', 'Secure Notes'],
                datasets: [{
                    data: [regularNotes, secureNotes],
                    backgroundColor: ['#5b5fe9', '#8b5cf6'],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'var(--text)',
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                },
                cutout: '60%',
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });
    }

    renderProductivityStats() {
        const notesThisWeek = this.getNotesThisWeek();
        const avgNotesPerDay = this.getAverageNotesPerDay();
        const mostActiveDay = this.getMostActiveDay();
        const mostActiveHour = this.getMostActiveHour();

        document.getElementById('notesThisWeek').textContent = notesThisWeek;
        document.getElementById('avgNotesPerDay').textContent = avgNotesPerDay.toFixed(1);
        document.getElementById('mostActiveDay').textContent = mostActiveDay;
        document.getElementById('mostActiveHour').textContent = mostActiveHour;
    }

    getActivityData() {
        let startDate, endDate = new Date();
        
        if (this.customDateRange) {
            startDate = new Date(this.customDateRange.start);
            endDate = new Date(this.customDateRange.end);
        } else {
            const days = parseInt(this.currentFilter);
            startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
        }

        const data = {
            labels: [],
            values: []
        };

        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            const notesCount = this.notes.filter(note => {
                const noteDate = new Date(note.date || note.createdAt);
                return noteDate.toISOString().split('T')[0] === dateString;
            }).length;

            data.labels.push(currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            data.values.push(notesCount);

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return data;
    }

    getNotesThisWeek() {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        
        return this.notes.filter(note => {
            const noteDate = new Date(note.date || note.createdAt);
            return noteDate >= weekStart;
        }).length;
    }

    getAverageNotesPerDay() {
        if (this.notes.length === 0) return 0;
        
        const firstNoteDate = new Date(Math.min(...this.notes.map(note => 
            new Date(note.date || note.createdAt).getTime()
        )));
        const today = new Date();
        const daysDiff = Math.ceil((today - firstNoteDate) / (1000 * 60 * 60 * 24));
        
        return this.notes.length / Math.max(daysDiff, 1);
    }

    getMostActiveDay() {
        if (this.notes.length === 0) return '-';
        
        const dayCounts = {
            'Sunday': 0, 'Monday': 0, 'Tuesday': 0, 'Wednesday': 0,
            'Thursday': 0, 'Friday': 0, 'Saturday': 0
        };

        this.notes.forEach(note => {
            const date = new Date(note.date || note.createdAt);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            dayCounts[dayName]++;
        });

        return Object.keys(dayCounts).reduce((a, b) => 
            dayCounts[a] > dayCounts[b] ? a : b
        );
    }

    getMostActiveHour() {
        if (this.notes.length === 0) return '-';
        
        const hourCounts = Array(24).fill(0);
        this.notes.forEach(note => {
            const date = new Date(note.date || note.createdAt);
            const hour = date.getHours();
            hourCounts[hour]++;
        });

        const maxHour = hourCounts.indexOf(Math.max(...hourCounts));
        return maxHour >= 12 ? 
            `${maxHour === 12 ? 12 : maxHour - 12} PM` : 
            `${maxHour === 0 ? 12 : maxHour} AM`;
    }

    renderTopTags() {
        const tagsList = document.getElementById('topTagsList');
        if (!tagsList) return;

        const tagCounts = {};
        this.notes.forEach(note => {
            (note.tags || []).forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        const sortedTags = Object.entries(tagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);

        tagsList.innerHTML = sortedTags.map(([tag, count]) => `
            <div class="tag-item">
                <span class="tag-name">${tag}</span>
                <span class="tag-count">${count}</span>
            </div>
        `).join('');
    }

    renderHabits() {
        this.renderStreakCalendar();
        this.updateGoalsProgress();
    }

    renderStreakCalendar() {
        const calendar = document.getElementById('streakCalendar');
        if (!calendar) return;

        const streak = this.calculateStreak();
        document.getElementById('currentStreak').textContent = `${streak} days`;

        // Calculate additional streak stats
        const activeDays = new Set(this.notes.map(note => {
            const date = new Date(note.date || note.createdAt);
            return date.toDateString();
        })).size;

        document.getElementById('totalActiveDays').textContent = activeDays;
        document.getElementById('longestStreak').textContent = Math.max(streak, 7); // Simulated longest streak

        // Generate calendar days (4-week view)
        const today = new Date();
        calendar.innerHTML = '';

        for (let i = 27; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            const dateString = date.toISOString().split('T')[0];
            const hasNote = this.notes.some(note => {
                const noteDate = new Date(note.date || note.createdAt);
                return noteDate.toISOString().split('T')[0] === dateString;
            });

            const isToday = i === 0;

            const dayElement = document.createElement('div');
            dayElement.className = `calendar-day ${hasNote ? 'active' : 'inactive'} ${isToday ? 'today' : ''}`;
            dayElement.textContent = date.getDate();
            dayElement.title = hasNote ? 
                `Note created on ${date.toLocaleDateString()}` : 
                `No notes on ${date.toLocaleDateString()}`;
            
            calendar.appendChild(dayElement);
        }
    }

    updateGoalsProgress() {
        const goals = document.querySelectorAll('.goal-item');
        let completed = 0;

        goals.forEach((goal, index) => {
            const checkbox = goal.querySelector('.goal-checkbox');
            const progressBar = goal.querySelector('.goal-progress-fill');
            
            // Calculate progress based on actual data
            let progress = 0;
            switch(index) {
                case 0: // Write 5 notes this week
                    progress = Math.min(this.getNotesThisWeek() / 5 * 100, 100);
                    break;
                case 1: // Create 2 secure notes
                    const secureNotes = this.notes.filter(note => note.secure).length;
                    progress = Math.min(secureNotes / 2 * 100, 100);
                    break;
                case 2: // Use 3 different tags
                    const uniqueTags = new Set(this.notes.flatMap(note => note.tags || [])).size;
                    progress = Math.min(uniqueTags / 3 * 100, 100);
                    break;
                case 3: // Maintain 7-day streak
                    const streak = this.calculateStreak();
                    progress = Math.min(streak / 7 * 100, 100);
                    break;
                case 4: // Write 1000+ words
                    const totalWords = this.notes.reduce((sum, note) => 
                        sum + (note.body ? note.body.split(/\s+/).length : 0), 0
                    );
                    progress = Math.min(totalWords / 1000 * 100, 100);
                    break;
            }

            progressBar.style.width = `${progress}%`;
            
            if (progress >= 100) {
                checkbox.checked = true;
                completed++;
            } else {
                checkbox.checked = false;
            }
        });

        document.getElementById('goalsCompleted').textContent = completed;
        document.getElementById('totalGoals').textContent = goals.length;
    }

    renderInsights() {
        this.renderWritingPattern();
        this.renderConsistencyScore();
        this.renderAchievements();
        this.renderPredictions();
    }

    renderWritingPattern() {
        const patternElement = document.getElementById('writingPattern');
        const mostActiveDay = this.getMostActiveDay();
        const mostActiveHour = this.getMostActiveHour();
        
        let pattern = "Based on your activity, ";
        
        if (mostActiveDay && mostActiveHour) {
            pattern += `you tend to write more notes on ${mostActiveDay}s around ${mostActiveHour}. `;
            
            if (mostActiveHour.includes('PM') && parseInt(mostActiveHour) >= 6) {
                pattern += "You're most productive in the evenings!";
            } else if (parseInt(mostActiveHour) <= 12) {
                pattern += "Morning writing sessions work best for you!";
            } else {
                pattern += "Afternoons are your peak creative time!";
            }
        } else {
            pattern += "keep writing to discover your patterns!";
        }
        
        patternElement.textContent = pattern;

        // Calculate pattern strength (simulated)
        const patternStrength = Math.min(75 + Math.random() * 25, 100);
        document.getElementById('patternStrength').textContent = `${Math.round(patternStrength)}%`;
    }

    renderConsistencyScore() {
        const scoreElement = document.getElementById('consistencyScore');
        const feedbackElement = document.getElementById('consistencyFeedback');
        const streak = this.calculateStreak();
        const avgNotes = this.getAverageNotesPerDay();
        
        // Calculate consistency score (0-100)
        let score = 0;
        score += Math.min(streak * 5, 40); // Max 40 points for streak
        score += Math.min(avgNotes * 10, 40); // Max 40 points for frequency
        score += Math.min(this.notes.length / 10, 20); // Max 20 points for volume
        
        const roundedScore = Math.min(Math.round(score), 100);
        scoreElement.textContent = `${roundedScore}%`;
        
        // Update feedback
        if (roundedScore >= 80) {
            feedbackElement.textContent = "Excellent consistency! You're building strong writing habits.";
        } else if (roundedScore >= 60) {
            feedbackElement.textContent = "Good consistency! Keep up the regular writing practice.";
        } else if (roundedScore >= 40) {
            feedbackElement.textContent = "Moderate consistency. Try to write more regularly.";
        } else {
            feedbackElement.textContent = "Let's build better writing habits together!";
        }
        
        // Update the score circle
        const scoreCircle = document.querySelector('.score-circle');
        scoreCircle.style.background = `conic-gradient(var(--primary) ${roundedScore}%, rgba(91, 95, 233, 0.2) 0)`;
    }

    renderAchievements() {
        const achievementsList = document.getElementById('achievementsList');
        const achievementsProgress = document.getElementById('achievementsProgress');
        const achievementsText = document.getElementById('achievementsText');
        
        const achievements = this.calculateAchievements();
        const totalAchievements = 15; // Total possible achievements
        const unlockedCount = achievements.length;
        const progressPercent = (unlockedCount / totalAchievements) * 100;
        
        achievementsList.innerHTML = achievements.map(achievement => `
            <div class="achievement-item">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-title">${achievement.title}</div>
                    <div class="achievement-desc">${achievement.description}</div>
                </div>
            </div>
        `).join('');
        
        achievementsProgress.style.width = `${progressPercent}%`;
        achievementsText.textContent = `${unlockedCount}/${totalAchievements} unlocked`;
    }

    calculateAchievements() {
        const achievements = [];
        const totalNotes = this.notes.length;
        const streak = this.calculateStreak();
        const secureNotes = this.notes.filter(note => note.secure).length;
        const uniqueTags = new Set(this.notes.flatMap(note => note.tags || [])).size;
        const totalWords = this.notes.reduce((sum, note) => 
            sum + (note.body ? note.body.split(/\s+/).length : 0), 0
        );

        // Note count achievements
        if (totalNotes >= 1) {
            achievements.push({
                icon: '📝',
                title: 'First Note',
                description: 'Created your first note'
            });
        }
        if (totalNotes >= 10) {
            achievements.push({
                icon: '📚',
                title: 'Note Collector',
                description: 'Created 10 notes'
            });
        }
        if (totalNotes >= 50) {
            achievements.push({
                icon: '🏆',
                title: 'Note Master',
                description: 'Created 50 notes'
            });
        }

        // Streak achievements
        if (streak >= 3) {
            achievements.push({
                icon: '🔥',
                title: 'On Fire',
                description: '3-day writing streak'
            });
        }
        if (streak >= 7) {
            achievements.push({
                icon: '⚡',
                title: 'Consistent Writer',
                description: '7-day writing streak'
            });
        }
        if (streak >= 30) {
            achievements.push({
                icon: '🌟',
                title: 'Writing Champion',
                description: '30-day writing streak'
            });
        }

        // Security achievements
        if (secureNotes >= 1) {
            achievements.push({
                icon: '🔒',
                title: 'Security Conscious',
                description: 'Created first secure note'
            });
        }

        // Tag achievements
        if (uniqueTags >= 3) {
            achievements.push({
                icon: '🏷️',
                title: 'Organized',
                description: 'Used 3 different tags'
            });
        }
        if (uniqueTags >= 10) {
            achievements.push({
                icon: '🗂️',
                title: 'Super Organizer',
                description: 'Used 10 different tags'
            });
        }

        // Word count achievements
        if (totalWords >= 1000) {
            achievements.push({
                icon: '✍️',
                title: 'Prolific Writer',
                description: 'Wrote 1000+ words'
            });
        }
        if (totalWords >= 5000) {
            achievements.push({
                icon: '📖',
                title: 'Author',
                description: 'Wrote 5000+ words'
            });
        }

        return achievements;
    }

    renderPredictions() {
        // Simulate predictions based on current data
        const predictedNotes = Math.round(this.notes.length * 1.2); // 20% growth
        const completionRate = Math.min(Math.round((this.notes.length / 50) * 100), 100); // Based on 50-note target
        
        document.getElementById('predictedNotes').textContent = predictedNotes;
        document.getElementById('completionRate').textContent = `${completionRate}%`;
    }

    loadChartsSection() {
        const chartsSection = document.getElementById('chartsGrid');
        
        chartsSection.innerHTML = `
            <div class="chart-card large" data-chart-type="activity">
                <div class="chart-header">
                    <h3>Monthly Note Creation</h3>
                    <div class="chart-actions">
                        <button class="chart-action-btn" data-action="fullscreen">🔍</button>
                        <button class="chart-action-btn" data-action="export">📥</button>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="monthlyNotesChart"></canvas>
                </div>
                <div class="chart-footer">
                    <div class="chart-stats">
                        <div class="chart-stat">
                            <span class="stat-value" id="monthlyAvg">0</span>
                            <span class="stat-label">Avg/Month</span>
                        </div>
                        <div class="chart-stat">
                            <span class="stat-value" id="monthlyMax">0</span>
                            <span class="stat-label">Peak Month</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="chart-card" data-chart-type="wordDistribution">
                <div class="chart-header">
                    <h3>Word Count Distribution</h3>
                    <div class="chart-actions">
                        <button class="chart-action-btn" data-action="fullscreen">🔍</button>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="wordDistributionChart"></canvas>
                </div>
            </div>

            <div class="chart-card" data-chart-type="tagUsage">
                <div class="chart-header">
                    <h3>Tag Usage</h3>
                    <div class="chart-actions">
                        <button class="chart-action-btn" data-action="fullscreen">🔍</button>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="tagUsageChart"></canvas>
                </div>
            </div>

            <div class="chart-card" data-chart-type="timeDistribution">
                <div class="chart-header">
                    <h3>Writing Time Distribution</h3>
                    <div class="chart-actions">
                        <button class="chart-action-btn" data-action="fullscreen">🔍</button>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="timeDistributionChart"></canvas>
                </div>
            </div>

            <div class="chart-card large" data-chart-type="productivity">
                <div class="chart-header">
                    <h3>Productivity Timeline</h3>
                    <div class="chart-actions">
                        <button class="chart-action-btn" data-action="fullscreen">🔍</button>
                        <button class="chart-action-btn" data-action="export">📥</button>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="timelineChart"></canvas>
                </div>
            </div>

            <div class="chart-card" data-chart-type="noteLength">
                <div class="chart-header">
                    <h3>Note Length Distribution</h3>
                    <div class="chart-actions">
                        <button class="chart-action-btn" data-action="fullscreen">🔍</button>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="noteLengthChart"></canvas>
                </div>
            </div>
        `;

        // Render all charts
        this.renderMonthlyNotesChart();
        this.renderWordDistributionChart();
        this.renderTagUsageChart();
        this.renderTimeDistributionChart();
        this.renderTimelineChart();
        this.renderNoteLengthChart();
    }

    renderMonthlyNotesChart() {
        const ctx = document.getElementById('monthlyNotesChart');
        if (!ctx) return;

        const monthlyData = this.getMonthlyData();
        
        if (this.charts.monthlyNotes) {
            this.charts.monthlyNotes.destroy();
        }

        this.charts.monthlyNotes = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Notes Created',
                    data: monthlyData.values,
                    backgroundColor: '#5b5fe9',
                    borderColor: '#5b5fe9',
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });

        // Update stats
        const avg = Math.round(monthlyData.values.reduce((a, b) => a + b, 0) / monthlyData.values.length);
        const max = Math.max(...monthlyData.values);
        
        document.getElementById('monthlyAvg').textContent = avg;
        document.getElementById('monthlyMax').textContent = max;
    }

    renderWordDistributionChart() {
        const ctx = document.getElementById('wordDistributionChart');
        if (!ctx) return;

        const wordCounts = this.notes.map(note => 
            note.body ? note.body.split(/\s+/).length : 0
        );

        if (this.charts.wordDistribution) {
            this.charts.wordDistribution.destroy();
        }

        this.charts.wordDistribution = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Note Length',
                    data: wordCounts.map((count, index) => ({
                        x: index,
                        y: count
                    })),
                    backgroundColor: '#5b5fe9',
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `Note ${context.parsed.x + 1}: ${context.parsed.y} words`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Word Count'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Note Sequence'
                        }
                    }
                }
            }
        });
    }

    renderTagUsageChart() {
        const ctx = document.getElementById('tagUsageChart');
        if (!ctx) return;

        const tagCounts = {};
        this.notes.forEach(note => {
            (note.tags || []).forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        const sortedTags = Object.entries(tagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8);

        if (this.charts.tagUsage) {
            this.charts.tagUsage.destroy();
        }

        this.charts.tagUsage = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: sortedTags.map(([tag]) => tag),
                datasets: [{
                    data: sortedTags.map(([,count]) => count),
                    backgroundColor: [
                        '#5b5fe9', '#6d72f0', '#7c3aed', '#8b5cf6',
                        '#a78bfa', '#c4b5fd', '#ddd6fe', '#f3f4f6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    renderTimeDistributionChart() {
        const ctx = document.getElementById('timeDistributionChart');
        if (!ctx) return;

        const timeSlots = {
            'Morning (6AM-12PM)': 0,
            'Afternoon (12PM-6PM)': 0,
            'Evening (6PM-12AM)': 0,
            'Night (12AM-6AM)': 0
        };

        this.notes.forEach(note => {
            const date = new Date(note.date || note.createdAt);
            const hour = date.getHours();
            
            if (hour >= 6 && hour < 12) timeSlots['Morning (6AM-12PM)']++;
            else if (hour >= 12 && hour < 18) timeSlots['Afternoon (12PM-6PM)']++;
            else if (hour >= 18 && hour < 24) timeSlots['Evening (6PM-12AM)']++;
            else timeSlots['Night (12AM-6AM)']++;
        });

        if (this.charts.timeDistribution) {
            this.charts.timeDistribution.destroy();
        }

        this.charts.timeDistribution = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(timeSlots),
                datasets: [{
                    data: Object.values(timeSlots),
                    backgroundColor: ['#5b5fe9', '#6d72f0', '#7c3aed', '#8b5cf6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    renderTimelineChart() {
        const ctx = document.getElementById('timelineChart');
        if (!ctx) return;

        const timelineData = this.getTimelineData();
        
        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }

        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timelineData.labels,
                datasets: [
                    {
                        label: 'Notes Created',
                        data: timelineData.notes,
                        borderColor: '#5b5fe9',
                        backgroundColor: 'rgba(91, 95, 233, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Words Written',
                        data: timelineData.words,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderNoteLengthChart() {
        const ctx = document.getElementById('noteLengthChart');
        if (!ctx) return;

        const wordCounts = this.notes.map(note => 
            note.body ? note.body.split(/\s+/).length : 0
        );

        const lengthRanges = {
            'Short (0-50)': 0,
            'Medium (51-200)': 0,
            'Long (201-500)': 0,
            'Very Long (500+)': 0
        };

        wordCounts.forEach(count => {
            if (count <= 50) lengthRanges['Short (0-50)']++;
            else if (count <= 200) lengthRanges['Medium (51-200)']++;
            else if (count <= 500) lengthRanges['Long (201-500)']++;
            else lengthRanges['Very Long (500+)']++;
        });

        if (this.charts.noteLength) {
            this.charts.noteLength.destroy();
        }

        this.charts.noteLength = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(lengthRanges),
                datasets: [{
                    data: Object.values(lengthRanges),
                    backgroundColor: ['#5b5fe9', '#6d72f0', '#7c3aed', '#8b5cf6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    getMonthlyData() {
        const monthlyData = {};
        
        this.notes.forEach(note => {
            const date = new Date(note.date || note.createdAt);
            const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            
            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = 0;
            }
            monthlyData[monthYear]++;
        });

        const labels = Object.keys(monthlyData).slice(-12); // Last 12 months
        const values = labels.map(label => monthlyData[label]);

        return { labels, values };
    }

    getTimelineData() {
        const days = 30;
        const today = new Date();
        const data = {
            labels: [],
            notes: [],
            words: []
        };

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            const dateString = date.toISOString().split('T')[0];
            const dayNotes = this.notes.filter(note => {
                const noteDate = new Date(note.date || note.createdAt);
                return noteDate.toISOString().split('T')[0] === dateString;
            });

            const dayWords = dayNotes.reduce((sum, note) => 
                sum + (note.body ? note.body.split(/\s+/).length : 0), 0
            );

            data.labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            data.notes.push(dayNotes.length);
            data.words.push(dayWords);
        }

        return data;
    }

    openChartDetails(chartType) {
        // Store current chart data and redirect to detailed charts page
        const chartData = {
            type: chartType,
            filter: this.currentFilter,
            customRange: this.customDateRange,
            timestamp: Date.now()
        };
        
        localStorage.setItem('currentChart', JSON.stringify(chartData));
        window.location.href = 'progress_charts.html';
    }

    handleChartAction(action, chartType) {
        switch (action) {
            case 'fullscreen':
                this.openFullscreenChart(chartType);
                break;
            case 'export':
                this.exportChart(chartType);
                break;
        }
    }

    openFullscreenChart(chartType) {
        const modal = document.getElementById('fullscreenModal');
        const title = document.getElementById('fullscreenChartTitle');
        const container = document.getElementById('fullscreenChartContainer');
        
        title.textContent = this.getChartTitle(chartType);
        container.innerHTML = `<canvas id="fullscreenChartCanvas"></canvas>`;
        
        // Re-render chart in fullscreen
        this.renderFullscreenChart(chartType);
        
        modal.classList.remove('hidden');
    }

    renderFullscreenChart(chartType) {
        const ctx = document.getElementById('fullscreenChartCanvas');
        if (!ctx) return;

        // Destroy existing chart if any
        if (this.charts.fullscreen) {
            this.charts.fullscreen.destroy();
        }

        // Re-render the chart with fullscreen options
        switch (chartType) {
            case 'activity':
                this.renderActivityChartFullscreen(ctx);
                break;
            case 'noteTypes':
                this.renderNoteTypesChartFullscreen(ctx);
                break;
            // Add other chart types as needed
        }
    }

    renderActivityChartFullscreen(ctx) {
        const data = this.getActivityData();
        
        this.charts.fullscreen = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Notes Created',
                    data: data.values,
                    borderColor: '#5b5fe9',
                    backgroundColor: 'rgba(91, 95, 233, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Activity Overview',
                        font: {
                            size: 16
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderNoteTypesChartFullscreen(ctx) {
        const regularNotes = this.notes.filter(note => !note.secure).length;
        const secureNotes = this.notes.filter(note => note.secure).length;

        this.charts.fullscreen = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Regular Notes', 'Secure Notes'],
                datasets: [{
                    data: [regularNotes, secureNotes],
                    backgroundColor: ['#5b5fe9', '#8b5cf6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Note Types Distribution',
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });
    }

    closeFullscreenModal() {
        document.getElementById('fullscreenModal').classList.add('hidden');
        if (this.charts.fullscreen) {
            this.charts.fullscreen.destroy();
        }
    }

    exportChart(chartType) {
        const chart = this.charts[chartType];
        if (!chart) return;

        const image = chart.toBase64Image();
        const link = document.createElement('a');
        link.download = `scribbl-chart-${chartType}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = image;
        link.click();
        
        this.showExportSuccess();
    }

    openDateRangeModal() {
        document.getElementById('dateRangeModal').classList.remove('hidden');
        
        // Set default dates (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
    }

    closeDateRangeModal() {
        document.getElementById('dateRangeModal').classList.add('hidden');
        document.getElementById('timeFilter').value = '30';
    }

    applyCustomDateRange() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        this.customDateRange = { start: startDate, end: endDate };
        this.currentFilter = 'custom';
        this.renderCharts();
        this.renderStats();
        this.closeDateRangeModal();
    }

    openShareModal() {
        document.getElementById('shareModal').classList.remove('hidden');
        
        // Update preview stats
        document.getElementById('previewNotes').textContent = this.notes.length;
        document.getElementById('previewStreak').textContent = this.calculateStreak();
    }

    closeShareModal() {
        document.getElementById('shareModal').classList.add('hidden');
    }

    handleShare(platform) {
        const stats = {
            notes: this.notes.length,
            streak: this.calculateStreak(),
            words: this.notes.reduce((sum, note) => sum + (note.body ? note.body.split(/\s+/).length : 0), 0)
        };

        let shareUrl = '';
        let shareText = '';

        switch (platform) {
            case 'link':
                shareText = `Check out my Scribbl progress: ${stats.notes} notes, ${stats.streak} day streak, ${stats.words} words written!`;
                this.copyToClipboard(shareText);
                this.showExportSuccess('Link copied to clipboard!');
                break;
                
            case 'twitter':
                shareText = `Check out my progress on @ScribblApp! 📝\n\n${stats.notes} notes\n${stats.streak} day streak\n${stats.words} words written\n\n`;
                shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
                window.open(shareUrl, '_blank');
                break;
                
            case 'image':
                this.shareAsImage();
                break;
        }
        
        this.closeShareModal();
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Text copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        });
    }

    async shareAsImage() {
        const card = document.querySelector('.preview-card');
        
        try {
            const canvas = await html2canvas(card);
            canvas.toBlob(blob => {
                const file = new File([blob], 'scribbl-progress.png', { type: 'image/png' });
                
                if (navigator.share && navigator.canShare({ files: [file] })) {
                    navigator.share({
                        files: [file],
                        title: 'My Scribbl Progress',
                        text: 'Check out my writing progress!'
                    });
                } else {
                    // Fallback: download image
                    const link = document.createElement('a');
                    link.download = 'scribbl-progress.png';
                    link.href = URL.createObjectURL(blob);
                    link.click();
                    this.showExportSuccess('Progress image downloaded!');
                }
            });
        } catch (error) {
            console.error('Error sharing as image:', error);
            alert('Error creating shareable image');
        }
    }

    setupExportPreview() {
        // Initialize export data
        this.exportData = {
            summary: this.getExportSummary(),
            charts: this.getExportChartsData(),
            insights: this.getExportInsights()
        };
    }

    updateExportPreview() {
        const preview = document.getElementById('exportPreview');
        const includeCharts = document.getElementById('includeCharts').checked;
        const includeRawData = document.getElementById('includeRawData').checked;
        const includeInsights = document.getElementById('includeInsights').checked;

        let previewHTML = '';

        if (includeCharts) {
            previewHTML += `
                <div class="preview-section">
                    <h5>Charts Summary</h5>
                    <p>${this.exportData.charts.summary}</p>
                </div>
            `;
        }

        if (includeRawData) {
            previewHTML += `
                <div class="preview-section">
                    <h5>Data Summary</h5>
                    <p>Total Notes: ${this.exportData.summary.totalNotes}</p>
                    <p>Active Days: ${this.exportData.summary.activeDays}</p>
                    <p>Total Words: ${this.exportData.summary.totalWords}</p>
                </div>
            `;
        }

        if (includeInsights) {
            previewHTML += `
                <div class="preview-section">
                    <h5>Key Insights</h5>
                    <p>${this.exportData.insights.join('</p><p>')}</p>
                </div>
            `;
        }

        preview.innerHTML = previewHTML || `
            <div class="preview-placeholder">
                <div class="preview-icon">👁️</div>
                <p>Select export options to see preview</p>
            </div>
        `;
    }

    getExportSummary() {
        const activeDays = new Set(this.notes.map(note => {
            const date = new Date(note.date || note.createdAt);
            return date.toDateString();
        })).size;

        const totalWords = this.notes.reduce((sum, note) => 
            sum + (note.body ? note.body.split(/\s+/).length : 0), 0
        );

        return {
            totalNotes: this.notes.length,
            activeDays: activeDays,
            totalWords: totalWords,
            avgWordsPerNote: Math.round(totalWords / Math.max(this.notes.length, 1)),
            streak: this.calculateStreak()
        };
    }

    getExportChartsData() {
        return {
            summary: 'Includes all analytical charts and visualizations',
            charts: ['activity', 'noteTypes', 'wordDistribution', 'timeDistribution']
        };
    }

    getExportInsights() {
        return [
            `You've written ${this.notes.length} notes with a ${this.calculateStreak()}-day streak`,
            `Most active on ${this.getMostActiveDay()}s around ${this.getMostActiveHour()}`,
            `Average note length: ${this.calculateAverageWords()} words`,
            `Consistency score: ${document.getElementById('consistencyScore').textContent}`
        ];
    }

    handleExport(format) {
        switch (format) {
            case 'pdf':
                this.exportToPDF();
                break;
            case 'csv':
                this.exportToCSV();
                break;
            case 'json':
                this.exportToJSON();
                break;
            case 'image':
                this.exportChartsAsImages();
                break;
        }
    }

    async exportToPDF() {
        this.showLoading();
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add title
            doc.setFontSize(20);
            doc.setTextColor(91, 95, 233);
            doc.text('Scribbl Progress Report', 20, 30);
            
            // Add date
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 40);
            
            // Add summary
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text('Summary', 20, 60);
            
            const summary = this.getExportSummary();
            doc.setFontSize(10);
            doc.text(`Total Notes: ${summary.totalNotes}`, 20, 75);
            doc.text(`Active Days: ${summary.activeDays}`, 20, 85);
            doc.text(`Total Words: ${summary.totalWords}`, 20, 95);
            doc.text(`Average Words per Note: ${summary.avgWordsPerNote}`, 20, 105);
            doc.text(`Current Streak: ${summary.streak} days`, 20, 115);
            
            // Add charts if enabled
            if (document.getElementById('includeCharts').checked) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text('Charts', 20, 30);
                
                // Add chart images (simplified - in real implementation, you would generate chart images)
                doc.setFontSize(10);
                doc.text('Activity Chart: Included in full report', 20, 50);
                doc.text('Note Types Chart: Included in full report', 20, 60);
            }
            
            // Save the PDF
            doc.save(`scribbl-progress-${new Date().toISOString().split('T')[0]}.pdf`);
            this.showExportSuccess('PDF exported successfully!');
            
        } catch (error) {
            console.error('PDF export error:', error);
            alert('Error exporting PDF');
        } finally {
            this.hideLoading();
        }
    }

    exportToCSV() {
        const csvContent = this.generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `scribbl-data-${new Date().toISOString().split('T')[0]}.csv`;
        link.href = url;
        link.click();
        this.showExportSuccess('CSV exported successfully!');
    }

    generateCSV() {
        let csv = 'Date,Title,Word Count,Tags,Type\n';
        
        this.notes.forEach(note => {
            const date = new Date(note.date || note.createdAt).toISOString().split('T')[0];
            const title = note.title || 'Untitled';
            const wordCount = note.body ? note.body.split(/\s+/).length : 0;
            const tags = (note.tags || []).join(';');
            const type = note.secure ? 'Secure' : 'Regular';
            
            csv += `"${date}","${title}",${wordCount},"${tags}","${type}"\n`;
        });
        
        return csv;
    }

    exportToJSON() {
        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                source: 'Scribbl App'
            },
            summary: this.getExportSummary(),
            notes: this.notes.map(note => ({
                id: note.id,
                title: note.title,
                createdAt: note.date || note.createdAt,
                wordCount: note.body ? note.body.split(/\s+/).length : 0,
                tags: note.tags || [],
                secure: note.secure || false,
                preview: note.body ? note.body.substring(0, 100) + '...' : ''
            })),
            analytics: {
                streak: this.calculateStreak(),
                mostActiveDay: this.getMostActiveDay(),
                mostActiveHour: this.getMostActiveHour(),
                consistencyScore: document.getElementById('consistencyScore').textContent
            }
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `scribbl-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.href = url;
        link.click();
        this.showExportSuccess('JSON backup exported successfully!');
    }

    exportChartsAsImages() {
        // Export each chart as PNG
        Object.keys(this.charts).forEach(chartName => {
            const chart = this.charts[chartName];
            if (chart) {
                const image = chart.toBase64Image();
                const link = document.createElement('a');
                link.download = `scribbl-${chartName}-chart.png`;
                link.href = image;
                link.click();
            }
        });
        this.showExportSuccess('Charts exported as images!');
    }

    showExportSuccess(message = 'Export completed successfully!') {
        const successElement = document.getElementById('exportSuccess');
        successElement.querySelector('p').textContent = message;
        successElement.classList.add('show');
        
        setTimeout(() => {
            successElement.classList.remove('show');
        }, 3000);
    }

    getChartTitle(chartType) {
        const titles = {
            activity: 'Activity Overview',
            noteTypes: 'Note Types Distribution',
            wordDistribution: 'Word Count Distribution',
            tagUsage: 'Tag Usage',
            timeDistribution: 'Writing Time Distribution',
            productivity: 'Productivity Timeline',
            noteLength: 'Note Length Distribution'
        };
        
        return titles[chartType] || 'Chart';
    }

    createConfettiIfAchievement() {
        // Create confetti when significant milestones are reached
        const streak = this.calculateStreak();
        const totalNotes = this.notes.length;
        
        if (streak % 7 === 0 && streak > 0 || totalNotes % 10 === 0 && totalNotes > 0) {
            this.createConfetti();
        }
    }

    createConfetti() {
        const container = document.getElementById('confettiContainer');
        const colors = ['#5b5fe9', '#6d72f0', '#7c3aed', '#8b5cf6', '#a78bfa'];
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                top: -10px;
                left: ${Math.random() * 100}%;
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                opacity: 0;
                z-index: 1000;
                pointer-events: none;
            `;
            
            container.appendChild(confetti);
            
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

    initTimeFilter() {
        const timeFilter = document.getElementById('timeFilter');
        if (timeFilter) {
            timeFilter.value = this.currentFilter;
        }

        // Add event listener for export settings changes
        document.querySelectorAll('.export-settings input').forEach(input => {
            input.addEventListener('change', () => {
                this.updateExportPreview();
            });
        });
    }
}

// Initialize progress dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProgressDashboard();
});