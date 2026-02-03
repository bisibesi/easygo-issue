<script setup>
import { ref, onMounted } from 'vue'
import { QuillEditor } from '@vueup/vue-quill'
import { useUsers } from '../composables/useUsers'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const emit = defineEmits(['add-issue'])

// Fetch users for Assignee dropdown
const { users } = useUsers()

const title = ref('')
const description = ref('')
const priority = ref('MEDIUM')
const label = ref('TASK')
const assignee = ref('')
const startDate = ref('')
const dueDate = ref('')
const milestoneId = ref(null)
const milestones = ref([])
const touched = ref(false)

const fetchMilestones = async () => {
  const token = localStorage.getItem('token')
  const res = await fetch('/api/milestones', { headers: { 'Authorization': `Bearer ${token}` }})
  if (res.ok) milestones.value = await res.json()
}

onMounted(() => {
  fetchMilestones()
})

const files = ref([])
const isUploading = ref(false)

const { token } = localStorage.getItem('token') ? { token: localStorage.getItem('token') } : { token: '' }

const handleFileChange = (e) => {
    files.value = Array.from(e.target.files)
}

const uploadFiles = async () => {
    if (files.value.length === 0) return []
    
    const formData = new FormData()
    files.value.forEach(file => {
        formData.append('files', file)
    })
    
    try {
        const res = await fetch('http://localhost:3000/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        })
        if (!res.ok) throw new Error('Upload failed')
        return await res.json()
    } catch (e) {
        console.error('Upload error:', e)
        alert(t('issue.fileUploadError'))
        return []
    }
}

const handleSubmit = async () => {
  // Enhanced Validation
  if (!title.value.trim() || !assignee.value || !startDate.value || !dueDate.value || !description.value.trim()) {
      touched.value = true
      alert(t('issue.validationError'))
      return
  }
  
  isUploading.value = true
  const uploadedFiles = await uploadFiles()
  
  emit('add-issue', {
    title: title.value,
    description: description.value,
    priority: priority.value,
    label: label.value,
    assignee: assignee.value,
    start_date: new Date(startDate.value).toISOString(),
    due_date: new Date(dueDate.value).toISOString(),
    milestone_id: milestoneId.value,
    attachments: uploadedFiles
  })
  
  // Reset form
  title.value = ''
  description.value = ''
  priority.value = 'MEDIUM'
  label.value = 'TASK'
  assignee.value = ''
  startDate.value = ''
  dueDate.value = ''
  files.value = []
  isUploading.value = false
  touched.value = false
}

</script>

<template>
  <form @submit.prevent="handleSubmit" class="add-issue-form">
    <div class="form-row">
      <div class="form-group flex-1">
        <label>{{ t('issue.titleLabel') }}</label>
        <input 
          v-model="title" 
          type="text" 
          :placeholder="t('issue.todoPlaceholder')" 
          class="input-field"
          :class="{ 'input-error': !title.trim() && touched }"
          @blur="touched = true"
          required
        />
        <span v-if="!title.trim() && touched" class="error-msg">{{ t('issue.titleLabel') }}을 입력해주세요.</span>
      </div>
    </div>

    <div class="form-row three-cols">
      <div class="form-group">
        <label>{{ t('issue.priorityLabel') }}</label>
        <select v-model="priority" class="input-field">
          <option value="LOW">{{ t('priority.LOW') }}</option>
          <option value="MEDIUM">{{ t('priority.MEDIUM') }}</option>
          <option value="HIGH">{{ t('priority.HIGH') }}</option>
          <option value="URGENT">{{ t('priority.URGENT') }}</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>{{ t('issue.labelLabel') }}</label>
        <select v-model="label" class="input-field">
          <option value="TASK">{{ t('label.TASK') }}</option>
          <option value="BUG">{{ t('label.BUG') }}</option>
          <option value="FEATURE">{{ t('label.FEATURE') }}</option>
          <option value="ENHANCEMENT">{{ t('label.ENHANCEMENT') }}</option>
        </select>
      </div>

      <div class="form-group">
        <label>{{ t('issue.assigneeLabel') }} <span class="required">*</span></label>
        <select 
            v-model="assignee" 
            class="input-field"
            :class="{ 'input-error': !assignee && touched }"
        >
          <option value="">{{ t('issue.selectAssignee') }}</option>
          <option v-for="user in users" :key="user.id" :value="user.name">
            {{ user.name }} ({{ user.role === 'ADMIN' ? t('issue.admin') : t('issue.member') }})
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>{{ t('issue.milestoneLabel') }}</label>
        <select v-model="milestoneId" class="input-field">
          <option :value="null">{{ t('issue.noMilestone') }}</option>
          <option v-for="m in milestones" :key="m.id" :value="m.id">
            {{ m.title }}
          </option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group flex-1">
        <label>{{ t('issue.startDateLabel') }} <span class="required">*</span></label>
        <input 
            type="date" 
            v-model="startDate" 
            class="input-field" 
            :class="{ 'input-error': !startDate && touched }"
        />
      </div>

      <div class="form-group flex-1">
        <label>{{ t('issue.dueDateLabel') }} <span class="required">*</span></label>
        <input 
            type="date" 
            v-model="dueDate" 
            class="input-field" 
            :class="{ 'input-error': !dueDate && touched }"
        />
      </div>
    </div>
    
    <div class="form-group">
        <label>{{ t('issue.attachmentLabel') }}</label>
        <input type="file" multiple @change="handleFileChange" class="input-field file-input" />
        <div v-if="files.length > 0" class="file-list">
            <div v-for="(file, index) in files" :key="index" class="file-item">
                {{ file.name }}
            </div>
        </div>
    </div>
    
    <div class="form-group">
      <label>{{ t('issue.description') }} <span class="required">*</span></label>
      <div class="editor-container" :class="{ 'input-error-border': !description.trim() && touched }">
          <QuillEditor 
              theme="snow" 
              v-model:content="description" 
              contentType="html" 
              :toolbar="['bold', 'italic', 'underline', 'image']"
              style="min-height: 200px; max-height: 400px; overflow-y: auto;"
          />
      </div>
    </div>
    
    <div class="form-actions">
      <button type="submit" class="btn-primary" :disabled="!title.trim()">
        {{ t('action.addIssue') }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.add-issue-form {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  box-shadow: var(--glass-shadow);
  position: relative;
}

.editor-container {
    display: flex;
    flex-direction: column;
    /* Ensure editor stays within bounds */
    position: relative; 
    z-index: 1;
}

/* Override Quill z-index issues if any */
:deep(.ql-toolbar) {
    z-index: 2;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    border-color: var(--glass-border) !important;
}

:deep(.ql-container) {
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    border-color: var(--glass-border) !important;
    background: rgba(0,0,0,0.1);
}

.form-row {
  display: flex;
  gap: var(--spacing-md);
}

.three-cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
}

.flex-1 {
  flex: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-group label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.input-field {
  width: 100%;
  background: rgba(0,0,0,0.2);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  padding: 0.5rem 0.75rem;
  font-size: 0.95rem;
  transition: all var(--transition-fast);
  color: var(--text-primary);
}

.input-field:focus {
  outline: none;
  border-color: var(--primary);
  background: rgba(0,0,0,0.3);
}

.textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-xs);
}

.btn-primary {
  background: var(--primary);
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: var(--radius-full);
  font-weight: 600;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

select.input-field {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.7rem center;
  background-size: 1em;
  padding-right: 2.5rem;
}

.input-error {
    border-color: #ef4444 !important;
    background: rgba(239, 68, 68, 0.05) !important;
}

.error-msg {
    color: #ef4444;
    font-size: 0.75rem;
    font-weight: 600;
}

.required {
    color: #ef4444;
    margin-left: 2px;
}

.input-error-border {
    border: 1px solid #ef4444;
    border-radius: var(--radius-md);
}
</style>
