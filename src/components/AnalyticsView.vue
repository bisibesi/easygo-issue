<template>
    <div class="analytics-view">
        <div class="header">
            <h1 class="title">{{ t('analytics.title') }}</h1>
            <div class="subtitle">{{ t('analytics.subtitle') }}</div>
        </div>

        <div class="stats-grid">
            <div class="stat-main">
                <div class="stat-card">
                    <div class="stat-label">{{ t('analytics.total') }}</div>
                    <div class="stat-value">{{ issues.length }}</div>
                    <div class="stat-footer">{{ t('analytics.accumulated') }}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">{{ t('analytics.completed') }}</div>
                    <div class="stat-value text-success">{{ completedCount }}</div>
                    <div class="stat-footer">{{ completionRate }}% {{ t('analytics.completionRate') }}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">{{ t('analytics.ongoing') }}</div>
                    <div class="stat-value text-primary">{{ ongoingCount }}</div>
                    <div class="stat-footer">{{ t('analytics.ongoingDesc') }}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">{{ t('analytics.avgTime') }}</div>
                    <div class="stat-value">{{ avgResolutionDays }}{{ t('analytics.days') }}</div>
                    <div class="stat-footer">{{ t('analytics.recent30') }}</div>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="charts-row">
                <!-- Status Chart -->
                <div class="chart-card">
                    <div class="chart-title">{{ t('analytics.statusDist') }}</div>
                    <div class="chart-body">
                        <svg viewBox="0 0 100 100" class="donut-chart">
                            <circle v-for="(s, i) in statusData" :key="i"
                                class="donut-segment"
                                cx="50" cy="50" r="40"
                                fill="transparent"
                                :stroke="s.color"
                                :stroke-width="12"
                                :stroke-dasharray="getDashArray(s.percent)"
                                :stroke-dashoffset="getDashOffset(i)"
                            />
                            <text x="50" y="55" text-anchor="middle" class="donut-text">{{ completionRate }}%</text>
                        </svg>
                        <div class="legend">
                            <div v-for="s in statusData" :key="s.label" class="legend-item">
                                <span class="dot" :style="{background: s.color}"></span>
                                <span>{{ s.label }} ({{ s.count }})</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Priority Chart -->
                <div class="chart-card">
                    <div class="chart-title">{{ t('analytics.priorityDist') }}</div>
                    <div class="chart-body bar-chart">
                        <div v-for="p in priorityData" :key="p.label" class="bar-row">
                            <div class="bar-label">{{ p.label }}</div>
                            <div class="bar-container">
                                <div class="bar-fill" :style="{ width: p.percent + '%', background: p.color }"></div>
                            </div>
                            <div class="bar-value">{{ p.count }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Milestone Progress Section -->
            <div class="chart-card full-width">
                <div class="chart-title">{{ t('analytics.milestoneProgress') }}</div>
                <div class="milestone-progress-list">
                    <div v-for="m in milestoneProgress" :key="m.id" class="milestone-progress-row">
                        <div class="milestone-info-header">
                            <span class="m-title">🚩 {{ m.title }}</span>
                            <span class="m-percent">{{ m.percent }}%</span>
                        </div>
                        <div class="m-progress-container">
                            <div class="m-progress-fill" :style="{ width: m.percent + '%', background: m.color }"></div>
                        </div>
                        <div class="m-meta-footer">
                            <span>{{ m.completed }} / {{ m.total }} {{ t('analytics.issuesCompleted') }}</span>
                            <span>{{ t('analytics.dueDate') }}: {{ m.due_date }}</span>
                        </div>
                    </div>
                    <div v-if="milestoneProgress.length === 0" class="empty-state">{{ t('analytics.noMilestones') }}</div>
                </div>
            </div>

            <!-- Trend Chart -->
            <div class="chart-card full-width">
                <div class="chart-title">{{ t('analytics.trend') }}</div>
                <div class="chart-body trend-chart">
                    <svg viewBox="0 0 1000 200" preserveAspectRatio="none" class="area-chart">
                        <path :d="trendPath" fill="rgba(88, 101, 242, 0.2)" stroke="var(--primary)" stroke-width="2" />
                    </svg>
                    <div class="trend-labels">
                        <span v-for="l in trendLabels" :key="l">{{ l }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useIssues } from '../composables/useIssues'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { issues, fetchIssues } = useIssues()
const milestones = ref([])

const fetchMilestones = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/milestones', { headers: { 'Authorization': `Bearer ${token}` }})
    if (res.ok) milestones.value = await res.json()
}

onMounted(() => {
    fetchIssues()
    fetchMilestones()
})

const completedCount = computed(() => issues.value.filter(i => i.status === 'CLOSED').length)
const ongoingCount = computed(() => issues.value.filter(i => i.status !== 'CLOSED').length)
const completionRate = computed(() => issues.value.length ? Math.round((completedCount.value / issues.value.length) * 100) : 0)

const avgResolutionDays = computed(() => {
    const closedIssues = issues.value.filter(i => i.status === 'CLOSED' && i.created_at && i.updated_at)
    if (closedIssues.length === 0) return 0
    const totalDays = closedIssues.reduce((acc, i) => {
        const diff = new Date(i.updated_at) - new Date(i.created_at)
        return acc + (diff / (1000 * 60 * 60 * 24))
    }, 0)
    return Math.round(totalDays / closedIssues.length * 10) / 10
})

const statusData = computed(() => {
    const counts = {
        'OPEN': issues.value.filter(i => i.status === 'OPEN').length,
        'IN_PROGRESS': issues.value.filter(i => i.status === 'IN_PROGRESS').length,
        'VERIFICATION_NEEDED': issues.value.filter(i => i.status === 'VERIFICATION_NEEDED').length,
        'CLOSED': issues.value.filter(i => i.status === 'CLOSED').length,
    }
    const total = issues.value.length || 1
    return [
        { label: t('analytics.legend.pending'), count: counts.OPEN, percent: (counts.OPEN / total) * 100, color: '#94a3b8' },
        { label: t('analytics.legend.progress'), count: counts.IN_PROGRESS, percent: (counts.IN_PROGRESS / total) * 100, color: '#3b82f6' },
        { label: t('analytics.legend.verify'), count: counts.VERIFICATION_NEEDED, percent: (counts.VERIFICATION_NEEDED / total) * 100, color: '#f59e0b' },
        { label: t('analytics.legend.completed'), count: counts.CLOSED, percent: (counts.CLOSED / total) * 100, color: '#10b981' },
    ]
})

const milestoneProgress = computed(() => {
    return milestones.value.map(m => {
        const mIssues = issues.value.filter(i => i.milestone_id === m.id)
        const total = mIssues.length
        const completed = mIssues.filter(i => i.status === 'CLOSED').length
        const percent = total ? Math.round((completed / total) * 100) : 0
        
        // Dynamic colors based on progress
        let color = '#3b82f6' // Default blue
        if (percent === 100) color = '#10b981' // Success green
        else if (percent > 70) color = '#8b5cf6' // Purple for high progress
        
        return {
            ...m,
            total,
            completed,
            percent,
            color
        }
    })
})


const priorityData = computed(() => {
    const counts = {
        'URGENT': issues.value.filter(i => i.priority === 'URGENT').length,
        'HIGH': issues.value.filter(i => i.priority === 'HIGH').length,
        'MEDIUM': issues.value.filter(i => i.priority === 'MEDIUM').length,
        'LOW': issues.value.filter(i => i.priority === 'LOW').length,
    }
    const max = Math.max(...Object.values(counts)) || 1
    return [
        { label: t('analytics.legend.urgent'), count: counts.URGENT, percent: (counts.URGENT / max) * 100, color: '#ef4444' },
        { label: t('analytics.legend.high'), count: counts.HIGH, percent: (counts.HIGH / max) * 100, color: '#f97316' },
        { label: t('analytics.legend.medium'), count: counts.MEDIUM, percent: (counts.MEDIUM / max) * 100, color: '#3b82f6' },
        { label: t('analytics.legend.low'), count: counts.LOW, percent: (counts.LOW / max) * 100, color: '#10b981' },
    ]
})

// Simple trend calculation (last 6 months)
const trendLabels = computed(() => {
    const labels = []
    const d = new Date()
    for (let i = 5; i >= 0; i--) {
        const month = new Date(d.getFullYear(), d.getMonth() - i, 1)
        labels.push(`${month.getMonth() + 1}${t('analytics.month')}`)
    }
    return labels
})

const trendPath = computed(() => {
    const d = new Date()
    const points = []
    for (let i = 5; i >= 0; i--) {
        const startDate = new Date(d.getFullYear(), d.getMonth() - i, 1)
        const endDate = new Date(d.getFullYear(), d.getMonth() - i + 1, 0)
        const count = issues.value.filter(issue => {
            const created = new Date(issue.created_at)
            return created >= startDate && created <= endDate
        }).length
        points.push(count)
    }
    
    const max = Math.max(...points, 5)
    const width = 1000
    const height = 200
    const step = width / (points.length - 1)
    
    let path = `M 0 ${height}`
    points.forEach((p, i) => {
        const x = i * step
        const y = height - (p / max) * (height - 20)
        path += ` L ${x} ${y}`
    })
    path += ` L ${width} ${height} Z`
    return path
})


// Donut Helpers
const getDashArray = (percent) => {
    const circumference = 2 * Math.PI * 40
    return `${(percent * circumference) / 100} ${circumference}`
}

const getDashOffset = (index) => {
    const circumference = 2 * Math.PI * 40
    let offset = 0
    for (let i = 0; i < index; i++) {
        offset += statusData.value[i].percent
    }
    return -(offset * circumference) / 100
}
</script>

<style scoped>
.analytics-view {
    padding: var(--spacing-lg);
    background: transparent;
}

.header {
    margin-bottom: var(--spacing-xl);
}

.title {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
}

.subtitle {
    color: var(--text-secondary);
}

.stats-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
}

.stat-main {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-lg);
}

.stat-card {
    background: var(--bg-card);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    box-shadow: var(--shadow-md);
}

.stat-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
}

.stat-value {
    font-size: 2.2rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
}

.stat-footer {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.charts-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
}

.chart-card {
    background: var(--bg-card);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
}

.chart-title {
    font-weight: 700;
    margin-bottom: var(--spacing-lg);
    font-size: 1.1rem;
}

.donut-chart {
    width: 150px;
    height: 150px;
    margin: 0 auto;
    display: block;
    transform: rotate(-90deg);
}

.donut-text {
    fill: var(--text-primary);
    font-size: 14px;
    font-weight: bold;
    transform: rotate(90deg);
    transform-origin: center;
}

.legend {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-top: 1rem;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
}

.dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}

.bar-chart {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.bar-row {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.bar-label {
    width: 50px;
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.bar-container {
    flex: 1;
    background: rgba(255,255,255,0.05);
    height: 10px;
    border-radius: 5px;
    overflow: hidden;
}

.bar-fill {
    height: 100%;
    border-radius: 5px;
    transition: width 1s ease-out;
}

.bar-value {
    font-weight: bold;
    font-size: 0.9rem;
}

.full-width {
    grid-column: 1 / -1;
}

.trend-chart {
    height: 250px;
    position: relative;
    padding: 10px 0;
}

.area-chart {
    width: 100%;
    height: 200px;
}

.trend-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    color: var(--text-secondary);
    font-size: 0.8rem;
}

/* Milestone Progress Styles */
.milestone-progress-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.milestone-progress-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.milestone-info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.m-title {
    font-weight: 700;
    color: var(--text-primary);
    font-size: 1.1rem;
}

.m-percent {
    font-weight: 800;
    color: var(--primary);
    font-size: 1.1rem;
}

.m-progress-container {
    height: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--glass-border);
}

.m-progress-fill {
    height: 100%;
    border-radius: 6px;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.m-meta-footer {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.empty-state {
    text-align: center;
    color: var(--text-secondary);
    padding: 2rem;
    font-style: italic;
}

.text-success { color: #10b981; }
.text-primary { color: #3b82f6; }

@media (max-width: 768px) {
    .charts-row {
        grid-template-columns: 1fr;
    }
}
</style>

<style scoped>
.analytics-view {
    padding: var(--spacing-lg);
    background: transparent;
}

.header {
    margin-bottom: var(--spacing-xl);
}

.title {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
}

.subtitle {
    color: var(--text-secondary);
}

.stats-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
}

.stat-main {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-lg);
}

.stat-card {
    background: var(--bg-card);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    box-shadow: var(--shadow-md);
}

.stat-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
}

.stat-value {
    font-size: 2.2rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
}

.stat-footer {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.charts-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
}

.chart-card {
    background: var(--bg-card);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
}

.chart-title {
    font-weight: 700;
    margin-bottom: var(--spacing-lg);
    font-size: 1.1rem;
}

.donut-chart {
    width: 150px;
    height: 150px;
    margin: 0 auto;
    display: block;
    transform: rotate(-90deg);
}

.donut-text {
    fill: var(--text-primary);
    font-size: 14px;
    font-weight: bold;
    transform: rotate(90deg);
    transform-origin: center;
}

.legend {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-top: 1rem;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
}

.dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}

.bar-chart {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.bar-row {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.bar-label {
    width: 50px;
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.bar-container {
    flex: 1;
    background: rgba(255,255,255,0.05);
    height: 10px;
    border-radius: 5px;
    overflow: hidden;
}

.bar-fill {
    height: 100%;
    border-radius: 5px;
    transition: width 1s ease-out;
}

.bar-value {
    font-weight: bold;
    font-size: 0.9rem;
}

.full-width {
    grid-column: 1 / -1;
}

.trend-chart {
    height: 250px;
    position: relative;
    padding: 10px 0;
}

.area-chart {
    width: 100%;
    height: 200px;
}

.trend-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    color: var(--text-secondary);
    font-size: 0.8rem;
}

/* Milestone Progress Styles */
.milestone-progress-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.milestone-progress-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.milestone-info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.m-title {
    font-weight: 700;
    color: var(--text-primary);
    font-size: 1.1rem;
}

.m-percent {
    font-weight: 800;
    color: var(--primary);
    font-size: 1.1rem;
}

.m-progress-container {
    height: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--glass-border);
}

.m-progress-fill {
    height: 100%;
    border-radius: 6px;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.m-meta-footer {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.empty-state {
    text-align: center;
    color: var(--text-secondary);
    padding: 2rem;
    font-style: italic;
}

.text-success { color: #10b981; }
.text-primary { color: #3b82f6; }

@media (max-width: 768px) {
    .charts-row {
        grid-template-columns: 1fr;
    }
}
</style>
