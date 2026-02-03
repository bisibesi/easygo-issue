<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  issue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update-status', 'delete'])

const formatDate = (isoString) => {
  return new Date(isoString).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

const statusColor = computed(() => {
  switch (props.issue.status) {
    case 'OPEN': return 'var(--primary)';
    case 'IN_PROGRESS': return 'var(--warning)';
    case 'CLOSED': return 'var(--success)';
    default: return 'var(--text-secondary)';
  }
})

const statusLabel = computed(() => {
   switch (props.issue.status) {
    case 'OPEN': return t('status.OPEN');
    case 'IN_PROGRESS': return t('status.IN_PROGRESS');
    case 'CLOSED': return t('status.CLOSED');
    default: return props.issue.status;
  }
})

const priorityColor = computed(() => {
  switch (props.issue.priority) {
    case 'URGENT': return '#ef4444'; // Red
    case 'HIGH': return '#f97316'; // Orange
    case 'MEDIUM': return '#3b82f6'; // Blue
    case 'LOW': return '#64748b'; // Slate
    default: return '#64748b';
  }
})

const priorityLabel = computed(() => {
  switch (props.issue.priority) {
    case 'URGENT': return t('priority.URGENT');
    case 'HIGH': return t('priority.HIGH');
    case 'MEDIUM': return t('priority.MEDIUM');
    case 'LOW': return t('priority.LOW');
    default: return t('priority.MEDIUM');
  }
})

const labelColor = computed(() => {
   switch (props.issue.label) {
    case 'BUG': return '#ec4899'; // Pink
    case 'FEATURE': return '#8b5cf6'; // Purple
    case 'ENHANCEMENT': return '#10b981'; // Emerald
    case 'TASK': return '#64748b'; // Slate
    default: return '#64748b';
  }
})

const labelText = computed(() => {
   switch (props.issue.label) {
    case 'BUG': return t('label.BUG');
    case 'FEATURE': return t('label.FEATURE');
    case 'ENHANCEMENT': return t('label.ENHANCEMENT');
    case 'TASK': return t('label.TASK');
    default: return t('label.TASK');
  }
})

const toggleStatus = () => {
  const nextStatus = props.issue.status === 'CLOSED' ? 'OPEN' : 'CLOSED'
  emit('update-status', props.issue.id, nextStatus)
}

const confirmDelete = () => {
  if (confirm(t('message.deleteConfirm'))) {
    emit('delete', props.issue.id)
  }
}
</script>

<template>
  <div class="card" :class="{ 'is-closed': issue.status === 'CLOSED' }">
    <div class="card-header">
      <div class="badges">
        <span class="badge" :style="{ backgroundColor: statusColor }">
          {{ statusLabel }}
        </span>
        <span class="badge-outline" :style="{ borderColor: priorityColor, color: priorityColor }">
          {{ priorityLabel }}
        </span>
        <span class="badge-soft" :style="{ backgroundColor: labelColor + '20', color: labelColor }">
          {{ labelText }}
        </span>
      </div>
      <span class="date">{{ formatDate(issue.createdAt) }}</span>
    </div>
    
    <h3 class="title">{{ issue.title }}</h3>
    <p class="description">{{ issue.description }}</p>
    
    <div class="card-footer">
      <div class="assignee" v-if="issue.assignee">
        <span class="avatar">{{ issue.assignee[0] }}</span>
        <span class="name">{{ issue.assignee }}</span>
      </div>
      <div class="assignee-empty" v-else>
         <!-- Spacer -->
      </div>
      
      <div class="actions">
        <button @click="toggleStatus" class="btn-action" :title="t('action.changeStatus')">
          <span v-if="issue.status === 'CLOSED'">{{ t('action.reopen') }}</span>
          <span v-else>{{ t('action.markComplete') }}</span>
        </button>
        
        <button @click="confirmDelete" class="btn-action btn-danger" :title="t('action.delete')">
          {{ t('action.delete') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--glass-shadow);
  background: var(--bg-card-hover);
}

.is-closed {
  opacity: 0.7;
}

.is-closed .title {
  text-decoration: line-through;
  color: var(--text-secondary);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.badges {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.badge {
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
}

.badge-outline {
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 600;
  border: 1px solid currentColor;
}

.badge-soft {
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 600;
}

.date {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.description {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  white-space: pre-wrap;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--glass-border);
}

.assignee {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.avatar {
  background: var(--bg-card-hover);
  color: var(--text-primary);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: bold;
  border: 1px solid var(--glass-border);
}

.name {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.actions {
  display: flex;
  gap: var(--spacing-sm);
}

.btn-action {
  font-size: 0.85rem;
  color: var(--text-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.btn-action:hover {
  color: var(--text-primary);
  background: rgba(255,255,255,0.05);
}

.btn-danger:hover {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
}
</style>
