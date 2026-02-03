<script setup>
import { ref, computed, onMounted } from 'vue'
import { useIssues } from '../composables/useIssues'
import { useAuth } from '../composables/useAuth'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { issues, fetchIssues } = useIssues()
const { user } = useAuth()

const currentDate = ref(new Date())
const viewMode = ref('MONTH') // MONTH, WEEK (Currently only Month implemented for simplicity)

onMounted(() => {
    fetchIssues()
})

// Requested Issues (Created by me)
const requestedIssues = computed(() => {
    if (!user.value) return []
    return issues.value.filter(i => 
        (i.creator_id === user.value.id) && 
        i.start_date && 
        i.due_date
    )
})

// Assigned Issues (Assigned to me)
const assignedIssues = computed(() => {
    if (!user.value) return []
    return issues.value.filter(i => 
        (i.assignee === user.value.name) && 
        i.start_date && 
        i.due_date
    )
})

const hasIssues = computed(() => requestedIssues.value.length > 0 || assignedIssues.value.length > 0)

// Calculate days in current month
const daysInMonth = computed(() => {
    const year = currentDate.value.getFullYear()
    const month = currentDate.value.getMonth()
    const date = new Date(year, month, 1)
    const days = []
    while (date.getMonth() === month) {
        days.push(new Date(date))
        date.setDate(date.getDate() + 1)
    }
    return days
})

const monthLabel = computed(() => {
    return currentDate.value.toLocaleString('ko-KR', { year: 'numeric', month: 'long' })
})

const prevMonth = () => {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

const nextMonth = () => {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

// Workload Statistics (Admin Only)
const workloadStats = computed(() => {
    if (!user.value || user.value.role !== 'ADMIN') return []
    
    // Group all issues by assignee
    const stats = {}
    
    issues.value.forEach(issue => {
        if (!issue.assignee) return // Skip unassigned
        
        if (!stats[issue.assignee]) {
            stats[issue.assignee] = { 
                name: issue.assignee, 
                total: 0, 
                completed: 0, 
                ongoing: 0,
                totalEfficiency: 0,
                efficiencyCount: 0,
                delayedCount: 0
            }
        }
        
        stats[issue.assignee].total++
        
        if (issue.status === 'CLOSED') {
            stats[issue.assignee].completed++
            
            // Calculate Efficiency & Delay
            if (issue.start_date && issue.due_date && issue.updated_at) {
                const due = new Date(issue.due_date).setHours(23, 59, 59, 999) // End of due date
                const closed = new Date(issue.updated_at).getTime()
                
                // Calculate difference in days (integers)
                // Positive diff means Early (Due > Closed)
                // Negative diff means Late (Due < Closed)
                const diffTime = due - closed
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                
                let score = 0
                
                if (diffDays < 0) {
                    // Late
                    stats[issue.assignee].delayedCount = (stats[issue.assignee].delayedCount || 0) + 1
                    // Score: 10 - days late (min 0)
                    score = Math.max(0, 10 + diffDays)
                } else if (diffDays === 0) {
                    // On Time (Same day)
                    // Note: due is end of day, closed is updated_at. 
                    // If closed on same day before midnight, diffTime is positive but < 24h.
                    // Math.floor(positive < 1) is 0.
                    score = 10
                } else {
                    // Early (diffDays >= 1)
                    // 1 day early -> 12 (+2)
                    // 2 days early -> 13 (+3)
                    // ... Max 15
                    score = Math.min(15, 11 + diffDays)
                }
                
                stats[issue.assignee].totalEfficiency += score
                stats[issue.assignee].efficiencyCount = (stats[issue.assignee].efficiencyCount || 0) + 1
            }
        } else {
            stats[issue.assignee].ongoing++
        }
    })
    
    return Object.values(stats).map(stat => {
        const avgEff = stat.efficiencyCount > 0 ? Math.round((stat.totalEfficiency / stat.efficiencyCount) * 10) / 10 : 0
        const delayRate = stat.completed > 0 ? Math.round((stat.delayedCount / stat.completed) * 100) : 0
        
        return {
            ...stat,
            rate: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0,
            avgEfficiency: avgEff,
            avgDelayRate: delayRate
        }
    }).sort((a, b) => b.total - a.total)
})

const getEfficiency = (issue) => {
    if (issue.status !== 'CLOSED' || !issue.start_date || !issue.due_date || !issue.updated_at) return null
    
    const due = new Date(issue.due_date).setHours(23, 59, 59, 999)
    const closed = new Date(issue.updated_at).getTime()
    const diffTime = due - closed
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return Math.max(0, 10 + diffDays)
    if (diffDays === 0) return 10
    return Math.min(15, 11 + diffDays)
}

const getIssueBarStyle = (issue) => {
    if (!issue.start_date || !issue.due_date) return {}
    
    const start = new Date(issue.start_date)
    const end = new Date(issue.due_date)
    const monthStart = daysInMonth.value[0]
    const monthEnd = daysInMonth.value[daysInMonth.value.length - 1]
    
    // Check if overlaps
    if (end < monthStart || start > monthEnd) return { display: 'none' }
    
    // Clamp dates/widths to view
    const visibleStart = start < monthStart ? monthStart : start
    const visibleEnd = end > monthEnd ? monthEnd : end
    
    const totalDays = daysInMonth.value.length
    const startDay = visibleStart.getDate()
    const durationDays = Math.max(1, (visibleEnd - visibleStart) / (1000 * 60 * 60 * 24) + 1)
    
    const left = ((startDay - 1) / totalDays) * 100
    const width = (durationDays / totalDays) * 100
    
    return {
        left: `${left}%`,
        width: `${width}%`,
        backgroundColor: getStatusColor(issue.status)
    }
}

const getStatusColor = (status) => {
    switch (status) {
        case 'OPEN': return '#3b82f6';
        case 'IN_PROGRESS': return '#f97316';
        case 'VERIFICATION_NEEDED': return '#eab308';
        case 'CLOSED': return '#64748b';
        default: return '#64748b';
    }
}
</script>

<template>
  <div class="schedule-view">
    <div class="schedule-header">
        <h2 class="title">{{ t('schedule.title') }}</h2>
        <div class="controls">
            <button @click="prevMonth" class="btn-nav">❮</button>
            <span class="month-label">{{ monthLabel }}</span>
            <button @click="nextMonth" class="btn-nav">❯</button>
        </div>
    </div>

    <!-- Admin Workload Dashboard -->
    <div v-if="user && user.role === 'ADMIN' && workloadStats.length > 0" class="admin-dashboard">
        <h3 class="dash-title">📊 {{ t('schedule.adminStats') }}</h3>
        <div class="stats-grid">
            <div v-for="stat in workloadStats" :key="stat.name" class="stat-card">
                <div class="stat-header">
                    <span class="stat-name">{{ stat.name }}</span>
                    <!-- Display Delay Rate (100 - AvgEfficiency) -->
                    <!-- If AvgEff is 120%, Delay is -20% (Good) -->
                    <!-- If AvgEff is 80%, Delay is 20% (Bad) -->
                    <div class="stat-badges" v-if="stat.efficiencyCount > 0">
                        <span class="stat-rate" :class="stat.avgDelayRate > 0 ? 'text-danger' : 'text-success'">
                            {{ stat.avgDelayRate }}%
                            <span class="label-sm">{{ t('schedule.delayRate') }}</span>
                        </span>
                    </div>
                    <div v-else class="text-secondary text-sm">{{ t('schedule.noData') }}</div>
                </div>
                
                <!-- Progress bar still useful for Volume -->
                <div class="progress-bar-bg" :title="t('schedule.completionRate')">
                    <div class="progress-bar" :style="{ width: stat.rate + '%' }"></div>
                </div>

                <div class="stat-details">
                   <span>{{ t('schedule.avgEfficiency') }}: {{ Math.round(stat.avgEfficiency * 10) }}%</span>
                   <span>{{ t('schedule.completed') }}: {{ stat.completed }}/{{ stat.total }}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="gantt-chart">
        <!-- Date Header -->
        <div class="gantt-header">
            <div class="task-col-header">Issue</div>
            <div class="date-col-header">
                <div v-for="day in daysInMonth" :key="day" class="day-cell" :class="{ 'today': day.toDateString() === new Date().toDateString() }">
                    {{ day.getDate() }}
                </div>
            </div>
        </div>

        <!-- Rows -->
        <div class="gantt-body">
            <div v-if="!hasIssues" class="empty-schedule">
                {{ t('schedule.empty') }}
            </div>

            <!-- Requested Issues Section -->
             <div v-if="requestedIssues.length > 0" class="section-header">
                📝 {{ t('schedule.requested') }}
            </div>
            <div v-for="issue in requestedIssues" :key="'req-'+issue.id" class="gantt-row">
                <div class="task-col">
                    <span class="task-title" :title="issue.title">
                        <span class="status-dot" :style="{ backgroundColor: getStatusColor(issue.status) }"></span>
                        {{ issue.title }}
                        <span v-if="getEfficiency(issue)" class="eff-tag-sm" :class="getEfficiency(issue) >= 100 ? 'eff-good' : 'eff-bad'">
                            {{ getEfficiency(issue) }}%
                        </span>
                    </span>
                </div>
                <div class="timeline-col">
                    <div class="timeline-grid">
                        <div v-for="day in daysInMonth" :key="day" class="grid-cell" :class="{ 'today': day.toDateString() === new Date().toDateString() }"></div>
                    </div>
                    <div class="task-bar" :style="getIssueBarStyle(issue)">
                         <span class="bar-label">{{ issue.status }}</span>
                    </div>
                </div>
            </div>

            <!-- Assigned Issues Section -->
             <div v-if="assignedIssues.length > 0" class="section-header">
                💼 {{ t('schedule.assigned') }}
            </div>
            <div v-for="issue in assignedIssues" :key="'assign-'+issue.id" class="gantt-row">
                <div class="task-col">
                    <span class="task-title" :title="issue.title">
                        <span class="status-dot" :style="{ backgroundColor: getStatusColor(issue.status) }"></span>
                         {{ issue.title }}
                         <span v-if="getEfficiency(issue)" class="eff-tag-sm" :class="getEfficiency(issue) >= 100 ? 'eff-good' : 'eff-bad'">
                            {{ getEfficiency(issue) }}%
                        </span>
                    </span>
                </div>
                <div class="timeline-col">
                    <div class="timeline-grid">
                        <div v-for="day in daysInMonth" :key="day" class="grid-cell" :class="{ 'today': day.toDateString() === new Date().toDateString() }"></div>
                    </div>
                    <div class="task-bar" :style="getIssueBarStyle(issue)">
                         <span class="bar-label">{{ issue.status }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.schedule-view {
    background: var(--bg-card);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
}

.schedule-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
}

.title {
    font-size: 1.5rem;
    font-weight: 700;
}

.controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--bg-body);
    padding: 0.5rem 1rem;
    border-radius: var(--radius-full);
    border: 1px solid var(--glass-border);
}

.btn-nav {
    background: transparent;
    color: var(--text-primary);
    font-weight: bold;
    cursor: pointer;
    font-size: 1.2rem;
}

.month-label {
    font-weight: 700;
    min-width: 100px;
    text-align: center;
}

.admin-dashboard {
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 1rem;
    margin-bottom: var(--spacing-lg);
}

.dash-title {
    font-size: 1rem;
    color: var(--text-secondary);
    margin-bottom: 0.8rem;
    font-weight: 700;
}

.stats-grid {
    display: flex;
    gap: 1rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
}

.stat-card {
    background: var(--bg-card);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 0.8rem;
    min-width: 200px;
    flex-shrink: 0;
}

.stat-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-weight: 700;
    align-items: center;
}

.stat-rate {
    color: var(--primary);
    font-size: 0.9rem;
}

.progress-bar-bg {
    background: rgba(255,255,255,0.1);
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 0.8rem;
}

.progress-bar {
    background: var(--primary);
    height: 100%;
    border-radius: 3px;
    transition: width 0.5s ease;
}

.efficiency-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    background: rgba(255,255,255,0.03);
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
}

.eff-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.eff-value {
    font-weight: 800;
    font-size: 0.95rem;
}

.text-success { color: #10b981; }
.text-danger { color: #ef4444; }

.stat-details {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--text-secondary);
    border-top: 1px solid rgba(255,255,255,0.05);
    padding-top: 0.5rem;
}

.gantt-chart {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
}

.gantt-header {
    display: flex;
    height: 50px;
    background: var(--bg-body);
    border-bottom: 1px solid var(--glass-border);
}

.task-col-header, .task-col {
    width: 250px;
    flex-shrink: 0;
    padding: 0 1rem;
    display: flex;
    align-items: center;
    border-right: 1px solid var(--glass-border);
    font-weight: 600;
    color: var(--text-secondary);
}

.date-col-header {
    flex: 1;
    display: flex;
}

.day-cell {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid rgba(255,255,255,0.05);
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.day-cell.today {
    background: rgba(255, 255, 255, 0.1);
    color: var(--primary);
    font-weight: bold;
}

.gantt-body {
    background: rgba(0,0,0,0.1);
}

.section-header {
    padding: 0.8rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    font-weight: 700;
    color: var(--text-primary);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.95rem;
}

.gantt-row {
    display: flex;
    height: 48px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

.task-col {
    background: var(--bg-card);
    font-size: 0.9rem;
    color: var(--text-primary);
}

.task-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 8px;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
}

.timeline-col {
    flex: 1;
    position: relative;
    display: flex;
}

.timeline-grid {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: flex;
    z-index: 0;
}

.grid-cell {
    flex: 1;
    border-right: 1px solid rgba(255,255,255,0.05);
}

.grid-cell.today {
    background: rgba(255, 255, 255, 0.05);
}

.task-bar {
    position: absolute;
    top: 8px;
    bottom: 8px;
    border-radius: 4px;
    z-index: 1;
    opacity: 0.9;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.bar-label {
    font-size: 0.7rem;
    color: white;
    font-weight: bold;
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

.empty-schedule {
    padding: 2rem;
    text-align: center;
    color: var(--text-secondary);
}

.eff-tag-sm {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    margin-left: 0.5rem;
    font-weight: 700;
}

.label-sm {
    font-size: 0.6rem;
    color: var(--text-secondary);
    font-weight: normal;
    margin-left: 2px;
}
</style>
