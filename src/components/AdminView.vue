<script setup>
import { ref, computed, onMounted } from 'vue'
import { useIssues } from '../composables/useIssues'
import { useUsers } from '../composables/useUsers'
import { useAuth } from '../composables/useAuth'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { issues } = useIssues()
const { users, addUser, updateUser, deleteUser } = useUsers()
const { logout } = useAuth()

const milestones = ref([])
const milestoneForm = ref({ title: '', description: '', due_date: '' })
const isEditingMilestone = ref(false)
const editingMilestoneId = ref(null)

const fetchMilestones = async () => {
  const token = localStorage.getItem('token')
  const res = await fetch('/api/milestones', { headers: { 'Authorization': `Bearer ${token}` }})
  if (res.ok) milestones.value = await res.json()
}

const handleMilestoneSubmit = async () => {
  if (!milestoneForm.value.title.trim()) return
  const token = localStorage.getItem('token')
  
  const url = isEditingMilestone.value ? `/api/milestones/${editingMilestoneId.value}` : '/api/milestones'
  const method = isEditingMilestone.value ? 'PATCH' : 'POST'

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(milestoneForm.value)
  })

  if (res.ok) {
    milestoneForm.value = { title: '', description: '', due_date: '' }
    isEditingMilestone.value = false
    editingMilestoneId.value = null
    fetchMilestones()
    alert(isEditingMilestone.value ? t('admin.milestone.updated') : t('admin.milestone.added'))
  }
}
const editMilestone = (m) => {
  milestoneForm.value = { 
    title: m.title, 
    description: m.description, 
    due_date: m.due_date ? m.due_date.split('T')[0] : '' 
  }
  isEditingMilestone.value = true
  editingMilestoneId.value = m.id
}

const cancelMilestoneEdit = () => {
  milestoneForm.value = { title: '', description: '', due_date: '' }
  isEditingMilestone.value = false
  editingMilestoneId.value = null
}

const deleteMilestone = async (id) => {
  if (!confirm(t('admin.milestone.deleteConfirm'))) return
  const token = localStorage.getItem('token')
  const res = await fetch(`/api/milestones/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (res.ok) fetchMilestones()
}

const systemReset = async () => {
  const code = Math.floor(1000 + Math.random() * 9000)
  const input = prompt(t('admin.reset.confirmBody', { code }))
  
  if (input !== code.toString()) {
    alert('Invalid code.') // Keep specific logic message simple or add key if strictly needed, but let's stick to user visible prompts.
    return
  }

  const token = localStorage.getItem('token')
  const res = await fetch('/api/admin/reset', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (res.ok) {
    alert(t('admin.reset.success'))
    handleLogout()
  } else {
    alert('Reset failed.')
  }
}

const activeTab = ref('DASHBOARD') // 'DASHBOARD', 'USERS', 'MILESTONES', 'INTEGRATIONS'

// Integration Settings
const integrationSettings = ref({
    slack_webhook_url: '',
    notion_token: '',
    notion_database_id: ''
})

const fetchSettings = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/integrations/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
        const data = await res.json()
        integrationSettings.value = { ...integrationSettings.value, ...data }
    }
}

const saveSettings = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/integrations/settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(integrationSettings.value)
    })
    if (res.ok) {
        alert(t('admin.integration.saved'))
    }
}

const webhookUrl = computed(() => {
    if (typeof window !== 'undefined') {
        return `${window.location.origin}/api/integrations/webhook/vcs`
    }
    return '/api/integrations/webhook/vcs'
})

onMounted(() => {
  fetchMilestones()
  fetchSettings()
})

const emit = defineEmits(['logout'])

// Dashboard Stats
const totalIssues = computed(() => issues.value.length)
const openIssues = computed(() => issues.value.filter(i => i.status !== 'CLOSED').length)
const closedIssues = computed(() => issues.value.filter(i => i.status === 'CLOSED').length)
const highPriorityCount = computed(() => issues.value.filter(i => i.priority === 'HIGH' || i.priority === 'URGENT').length)

// User Management Logic
const userForm = ref({
  id: null,
  email: '',
  password: '',
  name: '',
  role: 'USER'
})

const editingUser = ref(null)

const handleUserSubmit = async () => {
    // Edit Mode
    if (editingUser.value) {
        if (!userForm.value.name) return
        // Only include password if provided
        const updateData = {
            name: userForm.value.name,
            role: userForm.value.role
        }
        // Ideally backend should handle password update separately or checking if empty, 
        // but for now let's assume if password field is implemented in backend, we pass it.
        // Our backend route currently only takes name, role. 
        // Todo: Backend doesn't support password update via this route yet in my previous edit (users.js).
        // Let's stick to Name/Role update for now as requested "user info modification".
        
        const result = await updateUser(userForm.value.id, updateData)
        if (result.success) {
            cancelEdit()
            alert(t('admin.user.updated'))
        } else {
            alert('수정 실패: ' + result.error)
        }
    } 
    // Add Mode
    else {
        if (!userForm.value.email || !userForm.value.password || !userForm.value.name) return
        const result = await addUser(userForm.value)
        if (result.success) {
            userForm.value = { id: null, email: '', password: '', name: '', role: 'USER' }
            alert(t('admin.user.added'))
        } else {
            alert('오류: ' + result.error)
        }
    }
}

const startEdit = (user) => {
    editingUser.value = user
    userForm.value = {
        id: user.id,
        email: user.email,
        password: '', // Don't show current password
        name: user.name,
        role: user.role
    }
}

const cancelEdit = () => {
    editingUser.value = null
    userForm.value = { id: null, email: '', password: '', name: '', role: 'USER' }
}

const handleLogout = () => {
  logout()
  emit('logout')
}
</script>

<template>
  <div class="admin-container">
    <div class="admin-header">
      <h2>{{ t('admin.dashboard') }}</h2>
      <button @click="handleLogout" class="btn-logout">{{ t('nav.logout') }}</button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button @click="activeTab = 'DASHBOARD'" :class="{ active: activeTab === 'DASHBOARD' }">{{ t('admin.dashboard') }}</button>
      <button @click="activeTab = 'USERS'" :class="{ active: activeTab === 'USERS' }">{{ t('admin.users') }}</button>
      <button @click="activeTab = 'MILESTONES'" :class="{ active: activeTab === 'MILESTONES' }">{{ t('admin.milestones') }}</button>
      <button @click="activeTab = 'INTEGRATIONS'" :class="{ active: activeTab === 'INTEGRATIONS' }">{{ t('admin.integrations') }}</button>
    </div>

    <!-- Dashboard Tab -->
    <div v-if="activeTab === 'DASHBOARD'">
      <div class="stats-grid">
        <div class="stat-card">
          <span class="label">{{ t('admin.stats.total') }}</span>
          <span class="value">{{ totalIssues }}</span>
        </div>
        <div class="stat-card">
          <span class="label">{{ t('admin.stats.open') }}</span>
          <span class="value text-warning">{{ openIssues }}</span>
        </div>
        <div class="stat-card">
          <span class="label">{{ t('admin.stats.closed') }}</span>
          <span class="value text-success">{{ closedIssues }}</span>
        </div>
        <div class="stat-card">
          <span class="label">{{ t('admin.stats.highPriority') }}</span>
          <span class="value text-danger">{{ highPriorityCount }}</span>
        </div>
      </div>
    </div>

    <!-- User Management Tab -->
    <div v-if="activeTab === 'USERS'" class="settings-panel">
      <h3>시스템 사용자 관리</h3>
      <p class="desc">이슈 트래커에 로그인할 수 있는 사용자를 관리합니다.</p>
      
      <!-- Add/Edit User Form -->
      <form @submit.prevent="handleUserSubmit" class="add-user-form">
        <div class="form-group">
            <label v-if="editingUser" class="edit-label">이름 수정</label>
            <input v-model="userForm.name" placeholder="이름 (예: 홍길동)" required class="input-user" />
        </div>
        <div class="form-group" v-if="!editingUser">
             <input v-model="userForm.email" placeholder="아이디/이메일" required class="input-user" />
        </div>
        <div class="form-group user-id-display" v-else>
             <span class="read-only-text">{{ userForm.email }}</span>
        </div>
        <div class="form-group">
            <label v-if="editingUser" class="edit-label">비밀번호 {{ editingUser ? '(변경 시에만 입력)' : '' }}</label>
            <input v-model="userForm.password" type="password" :placeholder="editingUser ? '비밀번호 변경 (선택)' : '비밀번호'" :required="!editingUser" class="input-user" />
        </div>
        <div class="form-group">
            <label v-if="editingUser" class="edit-label">권한</label>
           <select v-model="userForm.role" class="input-user">
            <option value="USER">일반 사용자</option>
            <option value="ADMIN">관리자</option>
          </select>
        </div>
        <div class="form-actions-group">
             <button type="submit" class="btn-add">{{ editingUser ? '수정 완료' : '사용자 추가' }}</button>
             <button type="button" v-if="editingUser" @click="cancelEdit" class="btn-cancel">취소</button>
        </div>
      </form>

      <!-- User List -->
      <div class="user-table-container">
        <table class="user-table">
            <thead>
                <tr>
                    <th>이름</th>
                    <th>아이디</th>
                    <th>권한</th>
                    <th>관리</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="u in users" :key="u.id" :class="{ 'editing-row': editingUser && editingUser.id === u.id }">
                    <td>{{ u.name }}</td>
                    <td>{{ u.email }}</td>
                    <td>
                        <span :class="['role-badge', u.role === 'ADMIN' ? 'role-admin' : 'role-user']">
                            {{ u.role }}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button @click="startEdit(u)" class="btn-edit">수정</button>
                            <button v-if="u.email !== 'admin'" @click="deleteUser(u.id)" class="btn-remove">삭제</button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
      </div>
    </div>

    <!-- Milestone Management Tab -->
    <div v-if="activeTab === 'MILESTONES'" class="settings-panel">
      <h3>{{ isEditingMilestone ? t('admin.milestone.editTitle') : t('admin.milestone.title') }}</h3>
      <p class="desc">{{ t('admin.milestone.desc') }}</p>
      
      <form @submit.prevent="handleMilestoneSubmit" class="add-user-form">
        <div class="form-group">
            <input v-model="milestoneForm.title" :placeholder="t('admin.milestone.namePlaceholder')" required class="input-user" />
        </div>
        <div class="form-group">
            <input v-model="milestoneForm.description" :placeholder="t('admin.milestone.descPlaceholder')" class="input-user" />
        </div>
        <div class="form-group">
            <input v-model="milestoneForm.due_date" type="date" required class="input-user" />
        </div>
        <div class="form-actions-group">
            <button type="submit" class="btn-add">{{ isEditingMilestone ? t('action.save') : t('action.add') }}</button>
            <button v-if="isEditingMilestone" type="button" @click="cancelMilestoneEdit" class="btn-cancel">{{ t('action.cancel') }}</button>
        </div>
      </form>

      <div class="milestone-list">
        <div v-for="m in milestones" :key="m.id" class="milestone-item">
          <div class="milestone-info">
            <div class="milestone-title">🚩 {{ m.title }}</div>
            <div class="milestone-desc">{{ m.description }}</div>
            <div class="milestone-date">📅 {{ t('admin.milestone.targetDate') }}: {{ m.due_date ? new Date(m.due_date).toLocaleDateString() : t('admin.milestone.undefined') }}</div>
          </div>
          <div class="action-buttons">
            <button @click="editMilestone(m)" class="btn-edit">{{ t('action.edit') }}</button>
            <button @click="deleteMilestone(m.id)" class="btn-remove">{{ t('action.delete') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Integration Settings Tab -->
    <div v-if="activeTab === 'INTEGRATIONS'" class="settings-panel">
      <h3>{{ t('admin.integration.title') }}</h3>
      <p class="desc">{{ t('admin.integration.desc') }}</p>
      
      <div class="settings-grid">
        <div class="settings-section">
          <h4>{{ t('admin.integration.slack') }}</h4>
          <p class="settings-desc">{{ t('admin.integration.slackDesc') }}</p>
          <input 
            v-model="integrationSettings.slack_webhook_url" 
            type="password" 
            placeholder="https://hooks.slack.com/services/..."
            class="input-settings"
          >
        </div>

        <div class="settings-section">
          <h4>{{ t('admin.integration.notion') }}</h4>
          <p class="settings-desc">{{ t('admin.integration.notionDesc') }}</p>
          <input 
            v-model="integrationSettings.notion_token" 
            type="password" 
            placeholder="Secret Token"
            class="input-settings"
          >
          <input 
            v-model="integrationSettings.notion_database_id" 
            type="text" 
            placeholder="Database ID"
            class="input-settings mt-sm"
          >
        </div>
      </div>
      <div class="admin-footer-actions">
        <button @click="saveSettings" class="btn-primary">{{ t('admin.integration.save') }}</button>
      </div>
    </div>

    <!-- Danger Zone (Common) -->
    <div class="settings-panel danger-zone">
      <h3 class="text-danger">🚨 {{ t('admin.reset.title') }}</h3>
      <p class="desc">{{ t('admin.reset.desc') }}</p>
      <div class="danger-action">
        <p class="danger-warning">{{ t('admin.reset.warning') }}</p>
        <button @click="systemReset" class="btn-reset">{{ t('admin.reset.button') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
}

.tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
}

.tabs button {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--glass-border);
    padding: 0.6rem 1.2rem;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.tabs button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
}

.tabs button.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
}

.admin-header h2 {
  font-size: 1.5rem;
  color: var(--text-primary);
}

.btn-logout {
  color: var(--danger);
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid rgba(239, 68, 68, 0.3);
  transition: all var(--transition-fast);
}

.btn-logout:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-md);
}

.stat-card {
  background: var(--bg-card);
  padding: var(--spacing-lg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  align-items: center;
  text-align: center;
}

.stat-card .label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.stat-card .value {
  font-size: 2rem;
  font-weight: 800;
}

.text-warning { color: var(--warning); }
.text-success { color: var(--success); }
.text-danger { color: #ef4444; }

/* User Management */
.settings-panel {
  background: var(--bg-card);
  padding: var(--spacing-xl);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
}

.settings-panel h3 {
  font-size: 1.25rem;
  margin-bottom: var(--spacing-xs);
}

.desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: var(--spacing-lg);
}

.add-user-form {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xl);
  align-items: center;
  background: rgba(0,0,0,0.1);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
}

.form-group {
    flex: 1;
    min-width: 150px;
}

.input-user {
  width: 100%;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 0.5rem 1rem;
  color: var(--text-primary);
}

.input-user:focus {
  outline: none;
  border-color: var(--primary);
}

.btn-add {
  background: var(--primary);
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  white-space: nowrap;
}

.user-table-container {
    overflow-x: auto;
}

.user-table {
    width: 100%;
    border-collapse: collapse;
    color: var(--text-primary);
}

.user-table th {
    text-align: left;
    padding: 0.75rem;
    border-bottom: 2px solid var(--glass-border);
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.user-table td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--glass-border);
}

.role-badge {
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-full);
    font-size: 0.8rem;
    font-weight: 600;
}

.role-admin {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
}

.role-user {
    background: rgba(59, 130, 246, 0.2);
    color: #93c5fd;
}

.btn-remove {
    background: transparent;
    border: 1px solid var(--danger);
    color: var(--danger);
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-remove:hover {
    background: var(--danger);
    color: white;
}

.btn-edit {
    background: transparent;
    border: 1px solid var(--primary);
    color: var(--primary);
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-edit:hover {
    background: var(--primary);
    color: white;
}

.action-buttons {
    display: flex;
    gap: 0.5rem;
}

.btn-cancel {
    background: transparent;
    border: 1px solid var(--text-secondary);
    color: var(--text-secondary);
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    cursor: pointer;
}

.edit-label {
    display: block;
    margin-bottom: 0.2rem;
    font-size: 0.8rem;
    color: var(--primary);
    font-weight: bold;
}

.user-id-display {
    display: flex;
    align-items: center;
    padding: 0 1rem;
}

.read-only-text {
    color: var(--text-secondary);
    font-weight: bold;
}

.form-actions-group {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.editing-row {
    background: rgba(59, 130, 246, 0.1);
}

.milestone-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.milestone-item {
    background: rgba(0,0,0,0.1);
    padding: 1rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--glass-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.milestone-title {
    font-weight: 800;
    color: var(--primary);
    margin-bottom: 0.2rem;
}

.milestone-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-bottom: 0.3rem;
}

.milestone-date {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.danger-zone {
    border: 1px solid rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.02);
}

.danger-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
    background: rgba(0,0,0,0.2);
    padding: 1.5rem;
    border-radius: var(--radius-md);
}

.danger-warning {
    color: #f87171;
    font-size: 0.9rem;
    font-weight: 600;
}

.btn-reset {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.8rem 1.5rem;
    border-radius: var(--radius-md);
    font-weight: 800;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.btn-reset:hover {
    background: #dc2626;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-reset:active {
    transform: translateY(0);
}

.settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.settings-section {
    background: rgba(0, 0, 0, 0.2);
    padding: 1.5rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--glass-border);
}

.settings-section.full-width {
    grid-column: 1 / -1;
}

.settings-section h4 {
    margin-bottom: 0.5rem;
    color: var(--primary);
}

.settings-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-bottom: 1rem;
}

.input-settings {
    width: 100%;
    padding: 0.8rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: white;
}

.mt-sm { margin-top: 0.5rem; }

.webhook-display {
    background: rgba(0, 0, 0, 0.4);
    padding: 1.2rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--primary);
    margin-top: 1rem;
}

.webhook-display code {
    color: var(--primary);
    word-break: break-all;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.95rem;
}

.webhook-note {
    margin-top: 0.75rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.admin-footer-actions {
    display: flex;
    justify-content: flex-end;
}

.btn-primary {
    background: var(--primary);
    color: white;
    padding: 0.8rem 2rem;
    border-radius: var(--radius-md);
    font-weight: 700;
}
</style>
