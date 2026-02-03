<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIssues } from './composables/useIssues'
import { useAuth } from './composables/useAuth'
import IssueForm from './components/IssueForm.vue'
import IssueList from './components/IssueList.vue'
import IssueDetail from './components/IssueDetail.vue'
import FilterBar from './components/FilterBar.vue'
import LoginView from './components/LoginView.vue'
import AdminView from './components/AdminView.vue'
import WikiView from './components/WikiView.vue'
import ScheduleView from './components/ScheduleView.vue'
import AnalyticsView from './components/AnalyticsView.vue'
import { useNotifications } from './composables/useNotifications'

const { issues, fetchIssues, addIssue, updateIssueStatus, updateIssue, deleteIssue, clearIssues } = useIssues()
const { t, locale } = useI18n()
const toggleLanguage = () => {
    locale.value = locale.value === 'ko' ? 'en' : 'ko'
    localStorage.setItem('locale', locale.value) // Persist preference if you want
}
const { isAuthenticated, user, logout } = useAuth()
const { notifications, unreadCount, markAsRead, removeNotification, clearAll, fetchNotifications, clearNotifications } = useNotifications()

// Views: 'TRACKER', 'LOGIN', 'ADMIN', 'WIKI', 'SCHEDULE', 'ANALYTICS'
const currentView = ref('LOGIN') 
const showNotifications = ref(false)
// Tracker State
const selectedIssueId = ref(null)
const isCreating = ref(false)

const filterStatus = ref({
    status: 'ALL',
    priority: 'ALL',
    label: 'ALL'
}) 

onMounted(() => {
  // Session is auto-restored by useAuth logic (localStorage)
  if (isAuthenticated.value) {
    currentView.value = 'TRACKER'
    fetchIssues() // Fetch on load if authenticated
  }
})

const filteredIssues = computed(() => {
  return issues.value.filter(issue => {
      const matchStatus = filterStatus.value.status === 'ALL' || issue.status === filterStatus.value.status
      const matchPriority = filterStatus.value.priority === 'ALL' || issue.priority === filterStatus.value.priority
      const matchLabel = filterStatus.value.label === 'ALL' || issue.label === filterStatus.value.label
      return matchStatus && matchPriority && matchLabel
  })
})

const selectedIssue = computed(() => {
  return issues.value.find(i => i.id === selectedIssueId.value)
})

const navigateTo = (view) => {
  // Protect authenticated routes
  const protectedViews = ['ADMIN', 'TRACKER', 'WIKI', 'SCHEDULE', 'ANALYTICS']
  if (protectedViews.includes(view) && !isAuthenticated.value) {
    currentView.value = 'LOGIN'
  } else {
    currentView.value = view
    if (view === 'TRACKER') {
        fetchIssues() // Refresh data when entering tracker
    }
  }
}

const handleLoginSuccess = () => {
  currentView.value = 'TRACKER'
  fetchIssues() // Refresh data on login
}

const handleLogout = async () => {
  await logout()
  clearIssues()
  clearNotifications()
  currentView.value = 'LOGIN'
  selectedIssueId.value = null
  isCreating.value = false
}

// Tracker Actions
const selectIssue = (id) => {
  selectedIssueId.value = id
  isCreating.value = false
}

const startCreating = () => {
  selectedIssueId.value = null
  isCreating.value = true
}

const handleAddIssue = (issueData) => {
  addIssue(issueData)
  isCreating.value = false
  if (issues.value.length > 0) {
    selectedIssueId.value = issues.value[0].id
  }
}

const handleDeleteIssue = (id) => {
  deleteIssue(id)
  selectedIssueId.value = null
}
</script>

<template>
  <main class="container">
    <header class="header">
      <div class="brand">
        <h1>{{ t('app.title') }}</h1>
        <p class="subtitle">{{ t('app.subtitle') }}</p>
      </div>

      <div class="header-right" v-if="currentView !== 'LOGIN'">
        <button @click="toggleLanguage" class="btn-lang">
            {{ locale === 'ko' ? 'EN' : '한글' }}
        </button>

        <!-- Notification Bell -->
        <div class="notif-wrapper">
          <button @click="showNotifications = !showNotifications" class="btn-notif" :class="{ has_unread: unreadCount > 0 }">
             🔔 <span v-if="unreadCount > 0" class="badge">{{ unreadCount }}</span>
          </button>
          
          <div v-if="showNotifications" class="notif-dropdown">
            <div class="notif-header">
              {{ t('notification.title') }}
              <div class="header-btns">
                <button v-if="notifications.length > 0" @click="clearAll" class="btn-clear-all">{{ t('notification.clearAll') }}</button>
                <button @click="showNotifications = false" class="close-notif">×</button>
              </div>
            </div>
            <div class="notif-list">
              <div v-if="notifications.length === 0" class="notif-empty">{{ t('notification.empty') }}</div>
              <div 
                v-for="n in notifications" 
                :key="n.id" 
                class="notif-item" 
                :class="{ unread: !n.is_read }"
                @click="markAsRead(n.id); navigateTo('TRACKER'); selectIssue(n.issue_id); showNotifications = false"
              >
                <div class="notif-type">{{ n.type === 'NEW_COMMENT' ? '💬' : '📌' }}</div>
                <div class="notif-content">
                  <div class="notif-msg">{{ n.message }}</div>
                  <div class="notif-time">{{ new Date(n.created_at).toLocaleString() }}</div>
                </div>
                <button class="btn-del-notif" @click.stop="removeNotification(n.id)">×</button>
              </div>
            </div>
          </div>
        </div>
        
        <nav class="nav-bar">
        <button 
          @click="navigateTo('TRACKER')" 
          :class="{ active: currentView === 'TRACKER' }"
        >
          {{ t('nav.issues') }}
        </button>
        <button 
          @click="navigateTo('SCHEDULE')" 
          :class="{ active: currentView === 'SCHEDULE' }"
        >
          {{ t('nav.schedule') }}
        </button>
        <button 
          @click="navigateTo('WIKI')" 
          :class="{ active: currentView === 'WIKI' }"
        >
          {{ t('nav.wiki') }}
        </button>
        <button 
          @click="navigateTo('ANALYTICS')" 
          :class="{ active: currentView === 'ANALYTICS' }"
        >
          {{ t('nav.analytics') }}
        </button>
        <button 
          v-if="user && user.role === 'ADMIN'"
          @click="navigateTo('ADMIN')" 
          :class="{ active: currentView === 'ADMIN' }"
        >
          {{ t('nav.admin') }}
        </button>
        <button 
          @click="handleLogout" 
          class="btn-logout-nav"
        >
          {{ t('nav.logout') }}
        </button>
      </nav>
      </div>
    </header>
    
    <div class="content">
      <!-- Tracker View (Master-Detail Layout) -->
      <div v-if="currentView === 'TRACKER'" class="layout-master-grid">
        <!-- Left Sidebar: List -->
        <aside class="layout-sidebar">
          <div class="layout-header">
            <button @click="startCreating" class="btn-create">{{ t('issue.new') }}</button>
          </div>
          
          <FilterBar 
            :current-filter="filterStatus" 
            @update-filter="val => filterStatus = val" 
          />
          
          <IssueList 
            :issues="filteredIssues" 
            :selected-id="selectedIssueId"
            @select="selectIssue"
          />
        </aside>
        
        <!-- Right Main: Detail or Form -->
        <section class="layout-main-panel">
          <IssueDetail 
            v-if="selectedIssue" 
            :issue="selectedIssue"
            @update-status="updateIssueStatus"
            @update="updates => updateIssue(selectedIssue.id, updates)"
            @delete="handleDeleteIssue"
          />
          
          <div v-else-if="isCreating" class="create-panel">
            <h2>{{ t('issue.createTitle') }}</h2>
            <IssueForm @add-issue="handleAddIssue" />
          </div>
          
          <div v-else class="empty-selection">
            <p>{{ t('issue.emptySelection') }}</p>
          </div>
        </section>
      </div>

      <WikiView v-if="currentView === 'WIKI'" />

      <!-- Schedule View -->
      <ScheduleView v-if="currentView === 'SCHEDULE'" />

      <!-- Analytics View -->
      <AnalyticsView v-if="currentView === 'ANALYTICS'" />

      <!-- Login View -->
      <LoginView 
        v-if="currentView === 'LOGIN'" 
        @login-success="handleLoginSuccess" 
      />

      <!-- Admin View -->
      <AdminView 
        v-if="currentView === 'ADMIN'" 
        @logout="handleLogout"
      />
    </div>
  </main>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  height: 100vh;
  padding: var(--spacing-lg);
  max-width: 100%;
  margin: 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.brand h1 {
  font-size: 1.5rem;
  background: linear-gradient(to right, var(--primary), #818cf8);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-weight: 800;
  margin-bottom: 0;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.nav-bar {
  display: flex;
  gap: var(--spacing-sm);
  background: var(--bg-card);
  padding: 0.3rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--glass-border);
}

.nav-bar button {
  padding: 0.4rem 1rem;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.nav-bar button:hover {
  color: var(--text-primary);
}

.nav-bar button.active {
  background: var(--bg-card-hover);
  color: var(--primary);
}

.btn-logout-nav {
  margin-left: var(--spacing-sm);
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444 !important;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.btn-logout-nav:hover {
  background: rgba(239, 68, 68, 0.2) !important;
}

.btn-lang {
    background: transparent;
    border: 1px solid var(--glass-border);
    color: var(--text-secondary);
    padding: 0.3rem 0.6rem;
    border-radius: var(--radius-md);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-lang:hover {
    color: var(--text-primary);
    border-color: var(--primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.notif-wrapper {
  position: relative;
}

.btn-notif {
  font-size: 1.2rem;
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-notif:hover {
  background: var(--bg-card-hover);
  transform: scale(1.05);
}

.btn-notif.has_unread {
  animation: ring 2s infinite;
}

@keyframes ring {
  0% { transform: rotate(0); }
  5% { transform: rotate(15deg); }
  10% { transform: rotate(-15deg); }
  15% { transform: rotate(10deg); }
  20% { transform: rotate(-10deg); }
  25% { transform: rotate(0); }
  100% { transform: rotate(0); }
}

.badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #ef4444;
  color: white;
  font-size: 0.65rem;
  padding: 2px 5px;
  border-radius: 10px;
  font-weight: bold;
  border: 2px solid var(--bg-body);
}

.notif-dropdown {
  position: absolute;
  top: 50px;
  right: 0;
  width: 320px;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  z-index: 1000;
  overflow: hidden;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.notif-header {
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--glass-border);
  font-weight: 800;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.05);
}

.header-btns {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.btn-clear-all {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
    transition: all 0.2s;
}

.btn-clear-all:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
}

.close-notif { 
  font-size: 1.2rem; 
  line-height: 1; 
  opacity: 0.5; 
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
}
.close-notif:hover { opacity: 1; }

.notif-list {
  max-height: 400px;
  overflow-y: auto;
}

.notif-empty {
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.notif-item {
  padding: 1rem;
  display: flex;
  gap: 1rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s;
  position: relative;
  align-items: center;
}

.notif-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.btn-del-notif {
    opacity: 0;
    background: rgba(0,0,0,0.4);
    border: none;
    color: white;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
}

.notif-item:hover .btn-del-notif {
    opacity: 1;
}

.btn-del-notif:hover {
    background: #ef4444;
    transform: scale(1.1);
}

.notif-item.unread {
  background: rgba(88, 101, 242, 0.05);
}

.notif-item.unread::after {
  content: '';
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  margin-top: 15px;
}

.notif-type { font-size: 1.2rem; }
.notif-content { flex: 1; }
.notif-msg { font-size: 0.85rem; line-height: 1.4; margin-bottom: 4px; }
.notif-time { font-size: 0.7rem; color: var(--text-secondary); }

.content {
  flex: 1;
  min-height: 0; /* Important for scroll */
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* Enable page scrolling for views like Schedule/Wiki */
}

.btn-create {
  background: var(--primary);
  color: white;
  width: 100%;
  padding: 0.6rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: background var(--transition-fast);
}

.btn-create:hover {
  background: var(--primary-hover);
}

.layout-main-panel {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* Enable scrolling */
}

.create-panel {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  /* height: 100%;  <-- Remove fixed height */
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl); /* Add spacing at bottom for scroll */
}

.create-panel h2 {
  font-size: 1.5rem;
  color: var(--text-primary);
}

.empty-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  border: 2px dashed var(--glass-border);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
  background: rgba(0,0,0,0.1);
}
</style>
