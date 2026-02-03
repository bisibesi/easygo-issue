<script setup>
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  currentFilter: {
    type: Object, // Changed to Object: { status, priority, label }
    required: true
  }
})

const { t } = useI18n()
const emit = defineEmits(['update-filter'])

const localFilter = ref({ ...props.currentFilter })

const statusOptions = computed(() => [
  { label: t('filter.statusAll'), value: 'ALL' },
  { label: t('status.OPEN'), value: 'OPEN' },
  { label: t('status.IN_PROGRESS'), value: 'IN_PROGRESS' },
  { label: t('status.VERIFICATION_NEEDED'), value: 'VERIFICATION_NEEDED' },
  { label: t('status.CLOSED'), value: 'CLOSED' }
])

const priorityOptions = computed(() => [
  { label: t('filter.priorityAll'), value: 'ALL' },
  { label: t('priority.URGENT'), value: 'URGENT' },
  { label: t('priority.HIGH'), value: 'HIGH' },
  { label: t('priority.MEDIUM'), value: 'MEDIUM' },
  { label: t('priority.LOW'), value: 'LOW' }
])

const labelOptions = computed(() => [
  { label: t('filter.labelAll'), value: 'ALL' },
  { label: t('label.BUG'), value: 'BUG' },
  { label: t('label.FEATURE'), value: 'FEATURE' },
  { label: t('label.ENHANCEMENT'), value: 'ENHANCEMENT' },
  { label: t('label.TASK'), value: 'TASK' }
])

// Emit changes when any filter changes
watch(localFilter, (newVal) => {
    emit('update-filter', { ...newVal })
}, { deep: true })

</script>

<template>
  <div class="filter-bar">
    <div class="filter-group">
        <select v-model="localFilter.status" class="filter-select">
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
    </div>
    <div class="filter-group">
        <select v-model="localFilter.priority" class="filter-select">
            <option v-for="opt in priorityOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
    </div>
    <div class="filter-group">
        <select v-model="localFilter.label" class="filter-select">
            <option v-for="opt in labelOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  flex-wrap: wrap;
}

.filter-select {
  padding: 0.4rem 1rem;
  border-radius: var(--radius-full);
  font-size: 0.9rem;
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  cursor: pointer;
  outline: none;
  min-width: 120px;
}

.filter-select:hover {
    background: var(--bg-card-hover);
}

.filter-select:focus {
    border-color: var(--primary);
}
</style>
