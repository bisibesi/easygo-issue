<script setup>
import { ref, computed } from 'vue'
import { useWiki } from '../composables/useWiki'
import { marked } from 'marked'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const { pages, addPage, updatePage, deletePage } = useWiki()

const selectedPageId = ref(null)
const isEditing = ref(false)
const searchQuery = ref('')
const editLang = ref('ko') // Language tab in edit mode

const filteredPages = computed(() => {
  if (!searchQuery.value.trim()) return pages.value
  const query = searchQuery.value.toLowerCase()
  return pages.value.filter(p => p.title.toLowerCase().includes(query))
})

const selectedPage = computed(() => pages.value.find(p => p.id === selectedPageId.value))

const renderedContent = computed(() => {
  if (!selectedPage.value) return ''
  // Display content based on current locale
  const content = locale.value === 'ko' 
    ? (selectedPage.value.content_ko || selectedPage.value.content || '')
    : (selectedPage.value.content_en || selectedPage.value.content || '')
  return marked.parse(content)
})

// Editor State
const editTitle = ref('')
const editContentKo = ref('')
const editContentEn = ref('')

const selectPage = (id) => {
  selectedPageId.value = id
  isEditing.value = false
}

const handleAddPage = () => {
  const id = addPage(t('wiki.newPageTitle'), t('wiki.newPageContent'))
  selectedPageId.value = id
  startEdit(pages.value.find(p => p.id === id))
}

const startEdit = (page) => {
  editTitle.value = page.title
  editContentKo.value = page.content_ko || page.content || ''
  editContentEn.value = page.content_en || ''
  editLang.value = 'ko'
  isEditing.value = true
}

const saveEdit = () => {
  if (!editTitle.value.trim()) return
  
  updatePage(selectedPageId.value, {
    title: editTitle.value,
    content_ko: editContentKo.value,
    content_en: editContentEn.value
  })
  isEditing.value = false
}

const handleDelete = () => {
  if (confirm(t('wiki.deleteConfirm'))) {
    deletePage(selectedPageId.value)
    selectedPageId.value = null
    isEditing.value = false
  }
}

const formatDate = (isoString) => {
  return new Date(isoString).toLocaleString('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}
</script>

<template>
  <div class="layout-master-grid">
    <!-- Sidebar -->
    <aside class="layout-sidebar">
      <div class="layout-header">
        <button @click="handleAddPage" class="btn-create">{{ t('wiki.newPage') }}</button>
      </div>

      <div class="search-box">
        <input v-model="searchQuery" :placeholder="t('wiki.search')" class="input-search" />
      </div>

      <div class="page-list">
        <div 
          v-for="page in filteredPages" 
          :key="page.id"
          class="page-item"
          :class="{ selected: selectedPageId === page.id }"
          @click="selectPage(page.id)"
        >
          <div class="page-icon">📄</div>
          <div class="page-info">
            <span class="page-title">{{ page.title }}</span>
            <span class="page-date">{{ formatDate(page.updatedAt) }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <section class="layout-main-panel">
      <!-- Empty State -->
      <div v-if="!selectedPage" class="empty-state">
        <p>{{ t('wiki.empty') }}</p>
      </div>

      <!-- View Mode -->
      <div v-else-if="!isEditing" class="wiki-view">
        <div class="view-header">
          <h2 class="view-title">{{ selectedPage.title }}</h2>
          <div class="view-actions">
            <button @click="startEdit(selectedPage)" class="btn-action">{{ t('action.edit') }}</button>
            <button @click="handleDelete" class="btn-action btn-danger">{{ t('action.delete') }}</button>
          </div>
        </div>
        <div class="view-content">
          <div class="markdown-body" v-html="renderedContent"></div>
        </div>
      </div>

      <!-- Edit Mode -->
      <div v-else class="wiki-edit">
        <div class="edit-header">
          <input v-model="editTitle" type="text" :placeholder="t('wiki.placeholderTitle')" class="input-title" />
          <div class="edit-actions">
            <button @click="isEditing = false" class="btn-action">{{ t('action.cancel') }}</button>
            <button @click="saveEdit" class="btn-primary">{{ t('action.save') }}</button>
          </div>
        </div>
        
        <!-- Language Tabs -->
        <div class="lang-tabs">
          <button 
            @click="editLang = 'ko'" 
            :class="{ active: editLang === 'ko' }"
            class="lang-tab"
          >
            🇰🇷 한국어
          </button>
          <button 
            @click="editLang = 'en'" 
            :class="{ active: editLang === 'en' }"
            class="lang-tab"
          >
            🇺🇸 English
          </button>
        </div>
        
        <textarea 
          v-show="editLang === 'ko'"
          v-model="editContentKo" 
          class="input-content" 
          :placeholder="t('wiki.placeholderContent')"
        ></textarea>
        <textarea 
          v-show="editLang === 'en'"
          v-model="editContentEn" 
          class="input-content" 
          placeholder="Enter content in English..."
        ></textarea>
      </div>
    </section>
  </div>
</template>

<style scoped>
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

.search-box {
  margin-bottom: 0.5rem;
}

.input-search {
  width: 100%;
  background: var(--bg-body);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 0.5rem;
  color: var(--text-primary);
}

.page-list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow-y: auto;
  flex: 1;
}

.page-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.page-item:hover {
  background: var(--bg-card-hover);
}

.page-item.selected {
  background: var(--bg-card-hover);
  border: 1px solid var(--primary);
}

.page-icon {
  font-size: 1.2rem;
}

.page-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--text-secondary);
  border: 2px dashed var(--glass-border);
  border-radius: var(--radius-lg);
}

/* Wiki View */
.wiki-view {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: var(--spacing-md);
}

.view-title {
  font-size: 2rem;
  color: var(--text-primary);
  font-weight: 700;
}

.view-content {
  flex: 1;
  overflow-y: auto;
  line-height: 1.7;
  color: var(--text-primary);
}

.markdown-body {
  line-height: 1.6;
}

.markdown-body :deep(h1), .markdown-body :deep(h2), .markdown-body :deep(h3) {
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--glass-border);
  color: var(--text-primary);
}

.markdown-body :deep(p) {
  margin-bottom: 1rem;
}

.markdown-body :deep(ul), .markdown-body :deep(ol) {
  margin-bottom: 1rem;
  padding-left: 2rem;
}

.markdown-body :deep(blockquote) {
  border-left: 4px solid var(--primary);
  padding-left: 1rem;
  color: var(--text-secondary);
  background: rgba(0,0,0,0.1);
  padding: 0.5rem 1rem;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  margin-bottom: 1rem;
}

.markdown-body :deep(code) {
  font-family: monospace;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
}

.markdown-body :deep(pre) {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin-bottom: 1rem;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #e2e8f0;
}

.markdown-body :deep(a) {
  color: var(--primary);
  text-decoration: none;
}
.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

/* Edit Mode */
.wiki-edit {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.edit-header {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.input-title {
  flex: 1;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 0.5rem 1rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.input-content {
  flex: 1;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 1rem;
  font-family: monospace;
  font-size: 1rem;
  line-height: 1.6;
  resize: none;
  color: var(--text-primary);
}

.input-content:focus, .input-title:focus {
  outline: none;
  border-color: var(--primary);
}

.lang-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.lang-tab {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.lang-tab:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.lang-tab.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.edit-actions, .view-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  background: var(--bg-card-hover);
  color: var(--text-secondary);
  font-weight: 600;
  transition: all var(--transition-fast);
}

.btn-action:hover {
  background: var(--primary);
  color: white;
}

.btn-primary {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  background: var(--primary);
  color: white;
  font-weight: 600;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-danger {
  color: var(--danger);
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--danger);
}
</style>
