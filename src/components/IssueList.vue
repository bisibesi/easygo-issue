<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  issues: {
    type: Array,
    required: true
  },
  selectedId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['select'])

const getStatusColor = (status) => {
  switch (status) {
    case 'OPEN': return 'var(--primary)';
    case 'IN_PROGRESS': return 'var(--warning)';
    case 'CLOSED': return 'var(--success)';
    default: return 'var(--text-secondary)';
  }
}
</script>

<template>
  <div class="issue-sidebar-list">
    <div 
      v-for="issue in issues" 
      :key="issue.id"
      class="issue-item"
      :class="{ 'selected': selectedId === issue.id, 'closed': issue.status === 'CLOSED' }"
      @click="emit('select', issue.id)"
    >
        <div class="status-indicator-wrapper">
          <div v-if="issue.status === 'CLOSED'" class="status-icon-check">✓</div>
          <div v-else class="status-indicator" :style="{ backgroundColor: getStatusColor(issue.status) }"></div>
        </div>
        <div class="info">
          <h4 class="title">{{ issue.title }}</h4>
          <div class="meta">
            <span class="id">#{{ String(issue.id).slice(0, 4) }}</span>
            <span class="assignee" v-if="issue.assignee">{{ issue.assignee }}</span>
          </div>
        </div>
      </div>
      
      <div v-if="issues.length === 0" class="empty-state">
        <p>{{ t('issue.noIssues') }}</p>
      </div>
    </div>
  </template>
  
  <style scoped>
  .issue-sidebar-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    overflow-y: auto;
    max-height: 100%;
  }
  
  .issue-item {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    cursor: pointer;
    background: transparent;
    transition: all var(--transition-fast);
    border: 1px solid transparent;
    position: relative;
  }
  
  .issue-item:hover {
    background: var(--bg-card-hover);
  }
  
  .issue-item.selected {
    background: var(--bg-card);
    border-color: var(--primary);
    box-shadow: var(--glass-shadow);
  }
  
  /* Closed State Styling */
  .issue-item.closed {
    opacity: 0.75;
    background: rgba(0, 0, 0, 0.02);
  }
  
  .status-indicator-wrapper {
      width: 16px;
      display: flex;
      justify-content: center;
      padding-top: 4px;
      flex-shrink: 0;
  }
  
  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 2px;
  }
  
  .status-icon-check {
      color: var(--success);
      font-weight: bold;
      font-size: 0.9rem;
      line-height: 1;
  }
  
  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
  }
  
  .title {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .closed .title {
    color: var(--text-secondary);
    text-decoration: line-through;
  }
  
  .meta {
    display: flex;
  gap: var(--spacing-sm);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-md);
  color: var(--text-secondary);
  font-size: 0.9rem;
}
</style>
