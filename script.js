class HabitTracker {
    constructor() {
        this.habits = JSON.parse(localStorage.getItem('habits')) || [];
        this.completions = JSON.parse(localStorage.getItem('completions')) || {};
        this.currentView = 'today';
        this.calendarDate = new Date();
        this.editingHabitId = null;
        
        // Timer dla countdown
        this.countdownInterval = null;
        
        this.initializeEventListeners();
        this.updateCurrentDate();
        this.renderHabits();
        this.updateStats();
        this.renderCalendar();
        this.startCountdownTimer();
    }

    initializeEventListeners() {
        // Modal dodawania nawyku
        document.getElementById('openHabitModal').addEventListener('click', () => {
            this.openAddHabitModal();
        });

        document.getElementById('closeHabitModal').addEventListener('click', () => {
            this.closeAddHabitModal();
        });

        document.getElementById('cancelAddHabit').addEventListener('click', () => {
            this.closeAddHabitModal();
        });

        // Formularz dodawania nawyków
        document.getElementById('habitForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addHabit();
        });

        // Przełączanie widoków
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Modal edycji
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.closeModals();
        });

        document.getElementById('editHabitForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEditedHabit();
        });

        // Kalendarz
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
            this.renderCalendar();
        });

        // Zamknij modal po kliknięciu poza nim
        window.addEventListener('click', (e) => {
            const editModal = document.getElementById('editModal');
            const detailsModal = document.getElementById('detailsModal');
            const habitModal = document.getElementById('habitModal');
            
            if (e.target === editModal) {
                this.closeModals();
            }
            if (e.target === detailsModal) {
                this.closeModals();
            }
            if (e.target === habitModal) {
                this.closeAddHabitModal();
            }
        });
    }

    openAddHabitModal() {
        document.getElementById('habitModal').style.display = 'block';
        this.clearForm();
        setTimeout(() => {
            document.getElementById('habitName').focus();
        }, 100);
    }

    closeAddHabitModal() {
        document.getElementById('habitModal').style.display = 'none';
        this.clearForm();
    }

    addHabit() {
        const name = document.getElementById('habitName').value.trim();
        const description = document.getElementById('habitDescription').value.trim();
        const category = document.getElementById('habitCategory').value;
        const frequency = document.getElementById('habitFrequency').value;
        const color = document.getElementById('habitColor').value;
        
        // Deadline fields
        const deadline = document.getElementById('habitDeadline').value;
        const targetDays = parseInt(document.getElementById('habitTargetDays').value) || null;
        const deadlineType = document.getElementById('habitDeadlineType').value;

        if (!name) return;

        const habit = {
            id: Date.now(),
            name,
            description,
            category,
            frequency,
            color,
            deadline: deadline || null,
            targetDays: targetDays,
            deadlineType: deadlineType,
            createdAt: this.formatDate(new Date())
        };

        this.habits.push(habit);
        this.saveData();
        this.renderHabits();
        this.updateStats();
        this.closeAddHabitModal();
        this.showNotification('Nawyk został dodany!', 'success');
    }

    deleteHabit(id) {
        if (confirm('Czy na pewno chcesz usunąć ten nawyk? Wszystkie dane zostaną utracone.')) {
            this.habits = this.habits.filter(habit => habit.id !== id);
            
            Object.keys(this.completions).forEach(date => {
                if (this.completions[date][id]) {
                    delete this.completions[date][id];
                    if (Object.keys(this.completions[date]).length === 0) {
                        delete this.completions[date];
                    }
                }
            });
            
            this.saveData();
            this.renderHabits();
            this.updateStats();
            this.renderCalendar();
            this.showNotification('Nawyk został usunięty!', 'info');
        }
    }

    toggleHabitCompletion(id, date = null) {
        const targetDate = date || this.formatDate(new Date());
        
        if (!this.completions[targetDate]) {
            this.completions[targetDate] = {};
        }
        
        this.completions[targetDate][id] = !this.completions[targetDate][id];
        
        if (Object.values(this.completions[targetDate]).every(completed => !completed)) {
            delete this.completions[targetDate];
        }
        
        this.saveData();
        this.renderHabits();
        this.updateStats();
        this.renderCalendar();
        
        const habit = this.habits.find(h => h.id === id);
        const isCompleted = this.completions[targetDate] && this.completions[targetDate][id];
        const message = isCompleted ? `${habit.name} - ukończone!` : `${habit.name} - cofnięto`;
        this.showNotification(message, 'success');
    }

    editHabit(id) {
        const habit = this.habits.find(h => h.id === id);
        if (habit) {
            this.editingHabitId = id;
            
            document.getElementById('editHabitName').value = habit.name;
            document.getElementById('editHabitDescription').value = habit.description;
            document.getElementById('editHabitCategory').value = habit.category;
            document.getElementById('editHabitFrequency').value = habit.frequency;
            document.getElementById('editHabitColor').value = habit.color;
            
            // Deadline fields
            document.getElementById('editHabitDeadline').value = habit.deadline || '';
            document.getElementById('editHabitTargetDays').value = habit.targetDays || '';
            document.getElementById('editHabitDeadlineType').value = habit.deadlineType || 'none';
            
            document.getElementById('editModal').style.display = 'block';
        }
    }

    saveEditedHabit() {
        const habit = this.habits.find(h => h.id === this.editingHabitId);
        if (habit) {
            habit.name = document.getElementById('editHabitName').value.trim();
            habit.description = document.getElementById('editHabitDescription').value.trim();
            habit.category = document.getElementById('editHabitCategory').value;
            habit.frequency = document.getElementById('editHabitFrequency').value;
            habit.color = document.getElementById('editHabitColor').value;
            
            // Deadline fields
            habit.deadline = document.getElementById('editHabitDeadline').value || null;
            habit.targetDays = parseInt(document.getElementById('editHabitTargetDays').value) || null;
            habit.deadlineType = document.getElementById('editHabitDeadlineType').value;
            
            this.saveData();
            this.renderHabits();
            this.closeModals();
            this.showNotification('Nawyk został zaktualizowany!', 'success');
        }
    }

    showHabitDetails(id) {
        const habit = this.habits.find(h => h.id === id);
        if (!habit) return;

        const stats = this.getHabitStats(id);
        const countdown = this.calculateCountdown(habit);
        const modal = document.getElementById('detailsModal');
        const title = document.getElementById('detailsTitle');
        const content = document.getElementById('detailsContent');

        title.textContent = habit.name;
        
        content.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h4>Informacje podstawowe</h4>
                <p><strong>Kategoria:</strong> ${this.getCategoryLabel(habit.category)}</p>
                <p><strong>Częstotliwość:</strong> ${this.getFrequencyLabel(habit.frequency)}</p>
                <p><strong>Data utworzenia:</strong> ${new Date(habit.createdAt).toLocaleDateString('pl-PL')}</p>
                ${habit.description ? `<p><strong>Opis:</strong> ${habit.description}</p>` : ''}
                ${countdown.hasDeadline ? `
                    <p><strong>Deadline:</strong> ${countdown.message}</p>
                    ${countdown.progress > 0 ? `
                        <div class="deadline-progress">
                            <div class="deadline-progress-bar">
                                <div class="deadline-progress-fill ${countdown.status}" style="width: ${countdown.progress}%"></div>
                            </div>
                        </div>
                    ` : ''}
                ` : ''}
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4>Statystyki</h4>
                <div class="habit-stats">
                    <div class="habit-stat">
                        <div class="habit-stat-number">${stats.currentStreak}</div>
                        <div class="habit-stat-label">Aktualna seria</div>
                    </div>
                    <div class="habit-stat">
                        <div class="habit-stat-number">${stats.longestStreak}</div>
                        <div class="habit-stat-label">Najdłuższa seria</div>
                    </div>
                    <div class="habit-stat">
                        <div class="habit-stat-number">${stats.totalCompletions}</div>
                        <div class="habit-stat-label">Łącznie ukończeń</div>
                    </div>
                    <div class="habit-stat">
                        <div class="habit-stat-number">${stats.completionRate}%</div>
                        <div class="habit-stat-label">Wskaźnik ukończenia</div>
                    </div>
                </div>
            </div>
            
            <div>
                <h4>Postęp (ostatnie 30 dni)</h4>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${stats.last30DaysRate}%"></div>
                </div>
                <p style="text-align: center; margin-top: 10px;">
                    ${stats.last30DaysCompletions} z ${stats.last30DaysPossible} dni (${stats.last30DaysRate}%)
                </p>
            </div>
        `;

        modal.style.display = 'block';
    }

    // Funkcje countdown i deadline
    calculateCountdown(habit) {
        const now = new Date();
        const created = new Date(habit.createdAt);
        const stats = this.getHabitStats(habit.id);
        
        let result = {
            hasDeadline: false,
            timeLeft: null,
            daysLeft: null,
            progress: 0,
            status: 'normal',
            message: '',
            showCountdown: false
        };

        if (habit.deadlineType === 'none' || habit.deadlineType === undefined) {
            return result;
        }

        result.hasDeadline = true;

        // Deadline do konkretnej daty
        if ((habit.deadlineType === 'date' || habit.deadlineType === 'both') && habit.deadline) {
            const deadlineDate = new Date(habit.deadline);
            const timeDiff = deadlineDate - now;
            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            
            result.daysLeft = daysDiff;
            result.timeLeft = timeDiff;
            result.showCountdown = true;
            
            if (daysDiff < 0) {
                result.status = 'expired';
                result.message = 'Deadline minął!';
            } else if (daysDiff <= 3) {
                result.status = 'danger';
                result.message = `Zostało ${daysDiff} dni!`;
            } else if (daysDiff <= 7) {
                result.status = 'warning';
                result.message = `Zostało ${daysDiff} dni`;
            } else {
                result.status = 'normal';
                result.message = `Zostało ${daysDiff} dni`;
            }
            
            const totalDays = Math.ceil((deadlineDate - created) / (1000 * 60 * 60 * 24));
            const passedDays = totalDays - daysDiff;
            result.progress = Math.max(0, Math.min(100, (passedDays / totalDays) * 100));
        }

        // Cel serii dni
        if ((habit.deadlineType === 'streak' || habit.deadlineType === 'both') && habit.targetDays) {
            const currentStreak = stats.currentStreak;
            const target = habit.targetDays;
            
            if (currentStreak >= target) {
                result.status = 'success';
                result.message = `Cel osiągnięty! ${currentStreak}/${target} dni`;
            } else {
                const remaining = target - currentStreak;
                result.message = `${currentStreak}/${target} dni (zostało ${remaining})`;
                
                const streakProgress = (currentStreak / target) * 100;
                if (habit.deadlineType === 'streak') {
                    result.progress = streakProgress;
                } else {
                    result.progress = (result.progress + streakProgress) / 2;
                }
            }
        }

        return result;
    }

    formatCountdown(timeLeft) {
        if (timeLeft <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        return { days, hours, minutes, seconds };
    }

    startCountdownTimer() {
        this.countdownInterval = setInterval(() => {
            this.updateCountdownDisplays();
        }, 1000);
    }

    updateCountdownDisplays() {
        document.querySelectorAll('.countdown-timer').forEach(timer => {
            const habitId = parseInt(timer.dataset.habitId);
            const habit = this.habits.find(h => h.id === habitId);
            
            if (habit) {
                const countdown = this.calculateCountdown(habit);
                if (countdown.showCountdown && countdown.timeLeft > 0) {
                    const time = this.formatCountdown(countdown.timeLeft);
                    timer.innerHTML = this.createCountdownHTML(time, countdown.message);
                }
            }
        });
    }

    createCountdownHTML(time, message) {
        return `
            <div>${message}</div>
            <div class="countdown-numbers">
                <div class="countdown-unit">
                    <div class="number">${time.days}</div>
                    <div class="label">dni</div>
                </div>
                <div class="countdown-unit">
                    <div class="number">${time.hours}</div>
                    <div class="label">godz</div>
                </div>
                <div class="countdown-unit">
                    <div class="number">${time.minutes}</div>
                    <div class="label">min</div>
                </div>
                <div class="countdown-unit">
                    <div class="number">${time.seconds}</div>
                    <div class="label">sek</div>
                </div>
            </div>
        `;
    }

    switchView(view) {
        this.currentView = view;
        
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        document.querySelectorAll('.view-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${view}View`).classList.add('active');
        
        if (view === 'all') {
            this.renderAllHabits();
        } else if (view === 'calendar') {
            this.renderCalendar();
        }
    }

    renderHabits() {
        const container = document.getElementById('habitsList');
        const emptyState = document.getElementById('emptyState');
        
        if (this.habits.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        container.style.display = 'block';
        emptyState.style.display = 'none';
        
        const today = this.formatDate(new Date());
        
        container.innerHTML = this.habits.map(habit => {
            const isCompleted = this.completions[today] && this.completions[today][habit.id];
            const stats = this.getHabitStats(habit.id);
            
            return this.createHabitHTML(habit, isCompleted, stats, true);
        }).join('');
        
        this.attachHabitEventListeners(container);
    }

    renderAllHabits() {
        const container = document.getElementById('allHabitsList');
        
        container.innerHTML = this.habits.map(habit => {
            const stats = this.getHabitStats(habit.id);
            return this.createHabitHTML(habit, false, stats, false);
        }).join('');
        
        this.attachHabitEventListeners(container);
    }

    createHabitHTML(habit, isCompleted, stats, showTodayActions) {
        const categoryIcons = {
            health: 'fas fa-heart',
            fitness: 'fas fa-dumbbell',
            learning: 'fas fa-book',
            productivity: 'fas fa-chart-line',
            mindfulness: 'fas fa-leaf',
            social: 'fas fa-users',
            other: 'fas fa-star'
        };

        const countdown = this.calculateCountdown(habit);

        return `
            <div class="habit-item ${isCompleted ? 'completed' : ''}" 
                 data-habit-id="${habit.id}" 
                 style="--habit-color: ${habit.color}">
                <div class="habit-header">
                    <div class="habit-info">
                        <h3>${habit.name}</h3>
                        <div class="habit-category">
                            <i class="${categoryIcons[habit.category]}"></i>
                            ${this.getCategoryLabel(habit.category)}
                        </div>
                        ${stats.currentStreak > 0 ? `
                            <div class="streak-indicator">
                                <i class="fas fa-fire"></i>
                                ${stats.currentStreak} dni z rzędu
                            </div>
                        ` : ''}
                        ${countdown.hasDeadline ? `
                            <div class="deadline-badge ${countdown.status}">
                                <i class="fas fa-clock"></i>
                                ${countdown.message}
                            </div>
                        ` : ''}
                    </div>
                    <div class="habit-actions">
                        ${showTodayActions ? `
                            <button class="habit-btn complete ${isCompleted ? 'completed' : ''}" 
                                    data-action="complete" 
                                    title="${isCompleted ? 'Cofnij ukończenie' : 'Oznacz jako ukończone'}">
                                <i class="fas ${isCompleted ? 'fa-undo' : 'fa-check'}"></i>
                                ${isCompleted ? 'Cofnij' : 'Ukończ'}
                            </button>
                        ` : ''}
                        <button class="habit-btn details" data-action="details" title="Szczegóły">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                        <button class="habit-btn edit" data-action="edit" title="Edytuj">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="habit-btn delete" data-action="delete" title="Usuń">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                ${habit.description ? `<p style="margin: 10px 0; color: #666; font-style: italic;">${habit.description}</p>` : ''}
                
                ${countdown.hasDeadline && countdown.progress > 0 ? `
                    <div class="deadline-progress">
                        <div class="deadline-progress-bar">
                            <div class="deadline-progress-fill ${countdown.status}" style="width: ${countdown.progress}%"></div>
                        </div>
                    </div>
                ` : ''}
                
                ${countdown.showCountdown && countdown.timeLeft > 0 ? `
                    <div class="countdown-timer ${countdown.status}" data-habit-id="${habit.id}">
                        ${this.createCountdownHTML(this.formatCountdown(countdown.timeLeft), countdown.message)}
                    </div>
                ` : ''}
                
                <div class="habit-stats">
                    <div class="habit-stat">
                        <div class="habit-stat-number">${stats.currentStreak}</div>
                        <div class="habit-stat-label">Aktualna seria</div>
                    </div>
                    <div class="habit-stat">
                        <div class="habit-stat-number">${stats.longestStreak}</div>
                        <div class="habit-stat-label">Najdłuższa seria</div>
                    </div>
                    <div class="habit-stat">
                        <div class="habit-stat-number">${stats.totalCompletions}</div>
                        <div class="habit-stat-label">Łącznie</div>
                    </div>
                    <div class="habit-stat">
                        <div class="habit-stat-number">${stats.completionRate}%</div>
                        <div class="habit-stat-label">Wskaźnik</div>
                    </div>
                </div>
            </div>
        `;
    }

    attachHabitEventListeners(container) {
        container.querySelectorAll('.habit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const habitId = parseInt(e.target.closest('.habit-item').dataset.habitId);
                const action = e.target.closest('.habit-btn').dataset.action;

                switch (action) {
                    case 'complete':
                        this.toggleHabitCompletion(habitId);
                        break;
                    case 'details':
                        this.showHabitDetails(habitId);
                        break;
                    case 'edit':
                        this.editHabit(habitId);
                        break;
                    case 'delete':
                        this.deleteHabit(habitId);
                        break;
                }
            });
        });
    }

    renderCalendar() {
        const calendar = document.getElementById('calendar');
        const title = document.getElementById('calendarTitle');
        
        const year = this.calendarDate.getFullYear();
        const month = this.calendarDate.getMonth();
        
        title.textContent = new Date(year, month).toLocaleDateString('pl-PL', { 
            year: 'numeric', 
            month: 'long' 
        });
        
        const firstDay = new Date(year, month, 1);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);
        
        const days = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie'];
        let calendarHTML = '';
        
        days.forEach(day => {
            calendarHTML += `<div class="calendar-day header">${day}</div>`;
        });
        
        const currentDate = new Date(startDate);
        for (let i = 0; i < 42; i++) {
            const dateStr = this.formatDate(currentDate);
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = dateStr === this.formatDate(new Date());
            const dayCompletions = this.completions[dateStr] || {};
            const completedHabits = Object.values(dayCompletions).filter(Boolean).length;
            const totalHabitsForDay = this.getHabitsForDate(currentDate).length;
            const isPerfectDay = totalHabitsForDay > 0 && completedHabits === totalHabitsForDay;
            
            let dayClass = 'calendar-day';
            if (!isCurrentMonth) dayClass += ' other-month';
            if (isToday) dayClass += ' today';
            if (completedHabits > 0) dayClass += ' has-habits';
            if (isPerfectDay) dayClass += ' perfect-day';
            
            calendarHTML += `
                <div class="${dayClass}" data-date="${dateStr}">
                    <div>${currentDate.getDate()}</div>
                    ${completedHabits > 0 ? `<small>${completedHabits}/${totalHabitsForDay}</small>` : ''}
                </div>
            `;
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        calendar.innerHTML = calendarHTML;
    }

    getHabitsForDate(date) {
        const dateStr = this.formatDate(date);
        return this.habits.filter(habit => {
            const createdDate = new Date(habit.createdAt);
            return date >= createdDate;
        });
    }

    getHabitStats(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return {};
        
        const createdDate = new Date(habit.createdAt);
        const today = new Date();
        const totalDays = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24)) + 1;
        
        let totalCompletions = 0;
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        
        const sortedDates = Object.keys(this.completions).sort();
        
        for (const dateStr of sortedDates) {
            if (this.completions[dateStr][habitId]) {
                totalCompletions++;
                tempStreak++;
                longestStreak = Math.max(longestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        }
        
        const currentDate = new Date();
        while (currentDate >= createdDate) {
            const dateStr = this.formatDate(currentDate);
            if (this.completions[dateStr] && this.completions[dateStr][habitId]) {
                currentStreak++;
            } else {
                break;
            }
            currentDate.setDate(currentDate.getDate() - 1);
        }
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        let last30DaysCompletions = 0;
        let last30DaysPossible = 0;
        
        const checkDate = new Date(Math.max(thirtyDaysAgo, createdDate));
        while (checkDate <= today) { // Poprawka: używamy 'today' zamiast 'currentDate'
            const dateStr = this.formatDate(checkDate);
            last30DaysPossible++;
            if (this.completions[dateStr] && this.completions[dateStr][habitId]) {
                last30DaysCompletions++;
            }
            checkDate.setDate(checkDate.getDate() + 1);
        }
        
        return {
            totalCompletions,
            currentStreak,
            longestStreak,
            completionRate: totalDays > 0 ? Math.round((totalCompletions / totalDays) * 100) : 0,
            last30DaysCompletions,
            last30DaysPossible,
            last30DaysRate: last30DaysPossible > 0 ? Math.round((last30DaysCompletions / last30DaysPossible) * 100) : 0
        };
    }

    updateStats() {
        const today = this.formatDate(new Date());
        const todayCompletions = this.completions[today] || {};
        const completedToday = Object.values(todayCompletions).filter(Boolean).length;
        
        let longestStreak = 0;
        let totalCompletions = 0;
        
        this.habits.forEach(habit => {
            const stats = this.getHabitStats(habit.id);
            longestStreak = Math.max(longestStreak, stats.longestStreak);
            totalCompletions += stats.totalCompletions;
        });
        
        const totalHabits = this.habits.length;
        const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
        
        document.getElementById('todayCompleted').textContent = completedToday;
        document.getElementById('longestStreak').textContent = longestStreak;
        document.getElementById('completionRate').textContent = `${completionRate}%`;
        document.getElementById('totalHabits').textContent = totalHabits;
    }

    updateCurrentDate() {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('currentDate').textContent = 
            new Date().toLocaleDateString('pl-PL', options);
    }

    getCategoryLabel(category) {
        const labels = {
            health: 'Zdrowie',
            fitness: 'Fitness',
            learning: 'Nauka',
            productivity: 'Produktywność',
            mindfulness: 'Mindfulness',
            social: 'Relacje społeczne',
            other: 'Inne'
        };
        return labels[category] || category;
    }

    getFrequencyLabel(frequency) {
        const labels = {
            daily: 'Codziennie',
            weekly: 'Raz w tygodniu',
            custom: 'Niestandardowe'
        };
        return labels[frequency] || frequency;
    }

    formatDate(date) {
        return date.toISOString().split('T')[0]; // Poprawka: dodano [0] aby zwrócić tylko datę
    }

    closeModals() {
        document.getElementById('editModal').style.display = 'none';
        document.getElementById('detailsModal').style.display = 'none';
        document.getElementById('habitModal').style.display = 'none';
        this.editingHabitId = null;
    }

    clearForm() {
        document.getElementById('habitForm').reset();
        document.getElementById('habitColor').value = '#667eea';
        document.getElementById('habitDeadlineType').value = 'none';
    }

    saveData() {
        localStorage.setItem('habits', JSON.stringify(this.habits));
        localStorage.setItem('completions', JSON.stringify(this.completions));
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1001;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    destroy() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }
}

// Inicjalizacja aplikacji
document.addEventListener('DOMContentLoaded', () => {
    window.habitTracker = new HabitTracker();
    
    // Auto-save co 30 sekund
    setInterval(() => {
        if (window.habitTracker) {
            window.habitTracker.saveData();
        }
    }, 30000);
    
    if (window.habitTracker.habits.length === 0) {
        setTimeout(() => {
            window.habitTracker.showNotification('Witaj! Kliknij "Dodaj Nowy Nawyk" aby zacząć.', 'info');
        }, 2000);
    }
});

// Obsługa błędów
window.addEventListener('error', (e) => {
    console.error('Błąd aplikacji:', e.error);
    if (window.habitTracker) {
        window.habitTracker.showNotification('Wystąpił błąd aplikacji. Sprawdź konsolę.', 'error');
    }
});

// Cleanup przy zamknięciu strony
window.addEventListener('beforeunload', () => {
    if (window.habitTracker) {
        window.habitTracker.destroy();
    }
});
