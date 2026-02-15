/**
 * Daily Task Tracker
 * Manages task creation, storage, and display
 */

class TaskTracker {
    constructor() {
        this.tasks = [];
        this.currentDate = new Date();
        this.init();
    }

    /**
     * Initialize the task tracker
     */
    init() {
        this.loadTasks();
        this.setupEventListeners();
        this.setupDateInput();
        this.displayTasksForDate();
        this.updateStatistics();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Form submission
        const form = document.getElementById('task-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleCreateTask(e));
        }

        // Period selection to show/hide custom date fields
        const periodSelect = document.getElementById('task-period');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => this.handlePeriodChange(e));
        }

        // Date navigation
        const prevBtn = document.getElementById('prev-date');
        const nextBtn = document.getElementById('next-date');
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousDate());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextDate());
    }

    /**
     * Set today's date as default in start date input
     */
    setupDateInput() {
        const startDateInput = document.getElementById('task-start-date');
        if (startDateInput) {
            const today = new Date().toISOString().split('T')[0];
            startDateInput.value = today;
        }
    }

    /**
     * Handle period change - show/hide custom date fields
     */
    handlePeriodChange(event) {
        const period = event.target.value;
        const customFields = document.getElementById('custom-date-fields');
        const endDateInput = document.getElementById('task-end-date');

        if (period === 'custom') {
            customFields.style.display = 'flex';
            if (endDateInput) endDateInput.required = true;
        } else {
            customFields.style.display = 'none';
            if (endDateInput) {
                endDateInput.required = false;
                endDateInput.value = '';
            }
        }
    }

    /**
     * Create a new task
     */
    handleCreateTask(event) {
        event.preventDefault();

        const formError = document.getElementById('form-error');
        formError.textContent = '';

        const taskName = document.getElementById('task-name').value.trim();
        const category = document.getElementById('task-category').value;
        const period = document.getElementById('task-period').value;
        const startDate = document.getElementById('task-start-date').value;
        const endDate = document.getElementById('task-end-date').value;

        // Validation
        if (!taskName || !category || !period || !startDate) {
            formError.textContent = 'Please fill in all required fields.';
            return;
        }

        if (period === 'custom' && !endDate) {
            formError.textContent = 'Please select an end date for custom range.';
            return;
        }

        if (period === 'custom' && new Date(endDate) < new Date(startDate)) {
            formError.textContent = 'End date must be after start date.';
            return;
        }

        // Create task
        const task = {
            id: Date.now(),
            name: taskName,
            category: category,
            period: period,
            startDate: startDate,
            endDate: endDate || startDate,
            status: 'Assigned',
            createdAt: new Date().toISOString(),
            dates: this.generateTaskDates(period, startDate, endDate)
        };

        this.tasks.push(task);
        this.saveTasks();
        this.displayTasksForDate();
        this.updateStatistics();

        // Reset form
        event.target.reset();
        this.setupDateInput();
        formError.textContent = '';

        // Show success message
        this.showSuccessMessage('Task created successfully!');
    }

    /**
     * Generate dates for a task based on period
     */
    generateTaskDates(period, startDate, endDate = null) {
        const dates = [];
        const start = new Date(startDate);

        if (period === 'day') {
            dates.push(startDate);
        } else if (period === 'week') {
            for (let i = 0; i < 7; i++) {
                const date = new Date(start);
                date.setDate(date.getDate() + i);
                dates.push(date.toISOString().split('T')[0]);
            }
        } else if (period === 'month') {
            const year = start.getFullYear();
            const month = start.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            for (let day = start.getDate(); day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                dates.push(date.toISOString().split('T')[0]);
            }
        } else if (period === 'custom' && endDate) {
            const end = new Date(endDate);
            let current = new Date(start);

            while (current <= end) {
                dates.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
        }

        return dates;
    }

    /**
     * Navigate to previous date
     */
    previousDate() {
        this.currentDate.setDate(this.currentDate.getDate() - 1);
        this.displayTasksForDate();
    }

    /**
     * Navigate to next date
     */
    nextDate() {
        this.currentDate.setDate(this.currentDate.getDate() + 1);
        this.displayTasksForDate();
    }

    /**
     * Display tasks for current date
     */
    displayTasksForDate() {
        const currentDateStr = this.currentDate.toISOString().split('T')[0];
        const taskListContainer = document.getElementById('task-list');
        const dateDisplay = document.getElementById('current-date');

        // Update date display
        if (dateDisplay) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateDisplay.textContent = this.currentDate.toLocaleDateString('en-US', options);
        }

        // Get tasks for this date
        const tasksForDate = this.tasks.filter(task =>
            task.dates.includes(currentDateStr)
        );

        // Display tasks
        if (!taskListContainer) return;

        if (tasksForDate.length === 0) {
            taskListContainer.innerHTML = `
                <div class="empty-state">
                    <p>No tasks for ${this.currentDate.toLocaleDateString()}. Create a new task to get started!</p>
                </div>
            `;
            return;
        }

        taskListContainer.innerHTML = tasksForDate.map(task => `
            <div class="task-item task-${task.status.toLowerCase().replace('-', '')}">
                <div class="task-content">
                    <div class="task-header">
                        <h3 class="task-name">${this.escapeHtml(task.name)}</h3>
                        <span class="task-category category-${task.category.toLowerCase()}">${task.category}</span>
                    </div>
                    <p class="task-period">Period: ${this.formatPeriod(task.period, task.startDate, task.endDate)}</p>
                </div>
                <div class="task-actions">
                    <div class="task-status">
                        <select class="status-select" data-task-id="${task.id}" onchange="taskTracker.updateTaskStatus(${task.id}, this.value)">
                            <option value="Assigned" ${task.status === 'Assigned' ? 'selected' : ''}>Assigned</option>
                            <option value="In-progress" ${task.status === 'In-progress' ? 'selected' : ''}>In-progress</option>
                            <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
                        </select>
                        <span class="status-badge status-${task.status.toLowerCase().replace('-', '')}">${task.status}</span>
                    </div>
                    <button class="btn-delete" onclick="taskTracker.deleteTask(${task.id})" title="Delete task">
                        <span>×</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Update task status
     */
    updateTaskStatus(taskId, newStatus) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            this.saveTasks();
            this.displayTasksForDate();
            this.updateStatistics();
        }
    }

    /**
     * Delete a task
     */
    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.displayTasksForDate();
            this.updateStatistics();
            this.showSuccessMessage('Task deleted successfully!');
        }
    }

    /**
     * Update statistics
     */
    updateStatistics() {
        const currentDateStr = this.currentDate.toISOString().split('T')[0];
        const tasksForDate = this.tasks.filter(task =>
            task.dates.includes(currentDateStr)
        );

        const total = tasksForDate.length;
        const assigned = tasksForDate.filter(t => t.status === 'Assigned').length;
        const inProgress = tasksForDate.filter(t => t.status === 'In-progress').length;
        const completed = tasksForDate.filter(t => t.status === 'Completed').length;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-assigned').textContent = assigned;
        document.getElementById('stat-inprogress').textContent = inProgress;
        document.getElementById('stat-completed').textContent = completed;
    }

    /**
     * Format period display
     */
    formatPeriod(period, startDate, endDate) {
        const options = { month: 'short', day: 'numeric' };

        if (period === 'day') {
            return `Day - ${new Date(startDate).toLocaleDateString('en-US', options)}`;
        } else if (period === 'week') {
            const start = new Date(startDate);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return `Week - ${start.toLocaleDateString('en-US', options)} to ${end.toLocaleDateString('en-US', options)}`;
        } else if (period === 'month') {
            return `Month - ${new Date(startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
        } else if (period === 'custom') {
            return `Custom - ${new Date(startDate).toLocaleDateString('en-US', options)} to ${new Date(endDate).toLocaleDateString('en-US', options)}`;
        }
        return period;
    }

    /**
     * Save tasks to localStorage
     */
    saveTasks() {
        try {
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Error saving tasks:', error);
        }
    }

    /**
     * Load tasks from localStorage
     */
    loadTasks() {
        try {
            const stored = localStorage.getItem('tasks');
            this.tasks = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.tasks = [];
        }
    }

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show success message
     */
    showSuccessMessage(message) {
        const msgEl = document.createElement('div');
        msgEl.className = 'success-message';
        msgEl.textContent = message;
        document.body.appendChild(msgEl);

        setTimeout(() => {
            msgEl.style.opacity = '0';
            setTimeout(() => msgEl.remove(), 300);
        }, 3000);
    }
}

// Initialize task tracker when page loads
let taskTracker;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        taskTracker = new TaskTracker();
    });
} else {
    taskTracker = new TaskTracker();
}
