<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../composables/useAuth'
import { useComments } from '../composables/useComments'
import { QuillEditor } from '@vueup/vue-quill'

const props = defineProps({
  issue: {
    type: Object,
    required: true
  }
})

const { t } = useI18n()
const emit = defineEmits(['update-status', 'update', 'delete', 'close'])
const { user } = useAuth()
const { comments, fetchComments, addComment, deleteComment } = useComments()

const activeTab = ref('DETAIL') // 'DETAIL' or 'HISTORY'
const logs = ref([])
const relations = ref([])
const showRelationForm = ref(false)
const relIssueId = ref('')
const relType = ref('RELATED')

const milestones = ref([])
const fetchMilestones = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/milestones', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) milestones.value = await res.json()
}

const fetchLogs = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/audit-logs/${props.issue.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) logs.value = await res.json()
}

const fetchRelations = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/relations/${props.issue.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) relations.value = await res.json()
}

const addRelation = async () => {
  const token = localStorage.getItem('token')
  const res = await fetch('/api/relations', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({
      issue_id: props.issue.id,
      related_issue_id: relIssueId.value,
      relation_type: relType.value
    })
  })
  if (res.ok) {
    relIssueId.value = ''
    showRelationForm.value = false
    fetchRelations()
  }
}

const deleteRelation = async (id) => {
  const token = localStorage.getItem('token')
  await fetch(`/api/relations/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  fetchRelations()
}

const translateAction = (action) => {
    const map = {
        'STATUS_CHANGE': t('action.statusKey'),
        'TITLE_CHANGE': t('action.titleKey'),
        'PRIORITY_CHANGE': t('action.priorityKey'),
        'ASSIGNEE_CHANGE': t('action.assigneeKey'),
        'DATE_CHANGE': t('action.dateKey'),
        'RESOLUTION_CHANGE': t('action.resolutionKey'),
        'MILESTONE_CHANGE': t('action.milestoneKey')
    }
    return map[action] || action
}

const formatLogValue = (val) => {
    if (!val || val === 'null') return '-'
    try {
        const parsed = JSON.parse(val)
        if (typeof parsed === 'object') return JSON.stringify(parsed)
        return parsed
    } catch (e) {
        return val
    }
}

const newComment = ref('')

// Edit Mode State
const isEditing = ref(false)
const editForm = ref({
    title: '',
    description: ''
})

const startEdit = () => {
    editForm.value = {
        title: props.issue.title,
        description: props.issue.description
    }
    isEditing.value = true
}

const cancelEdit = () => {
    isEditing.value = false
}

const saveEdit = () => {
    emit('update', {
        title: editForm.value.title,
        description: editForm.value.description
    })
    isEditing.value = false
}

const resolutionForm = ref('')
const commits = ref([])
const loadingCommits = ref(false)
const { token } = localStorage.getItem('token') ? { token: localStorage.getItem('token') } : { token: '' }

const fetchCommits = async () => {
    loadingCommits.value = true
    try {
        // Use prop instead of route param
        const issueId = props.issue.id
        const res = await fetch(`/api/issues/${issueId}/commits`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        if (res.ok) {
            commits.value = await res.json()
        }
    } catch (e) {
        console.error('Failed to fetch commits:', e)
    } finally {
        loadingCommits.value = false
    }
}

const startEditResolution = () => {
    resolutionForm.value = props.issue.resolution || ''
    isEditingResolution.value = true
}

const cancelEditResolution = () => {
    isEditingResolution.value = false
}

const saveResolution = () => {
    emit('update', {
        resolution: resolutionForm.value
    })
    isEditingResolution.value = false
}

onMounted(() => {
    fetchCommits()
    fetchMilestones()
})



watch(() => props.issue.id, () => {
    fetchCommits()
})

const isAdmin = computed(() => user.value?.role === 'ADMIN')
const isCreator = computed(() => user.value?.id === props.issue.creator_id)
const isAssignee = computed(() => user.value?.name === props.issue.assignee)

// Fetch comments when issue changes
watch(() => props.issue.id, (newId) => {
    if (newId) {
        fetchComments(newId)
        fetchRelations()
        fetchMilestones()
        newComment.value = ''
        activeTab.value = 'DETAIL'
    }
}, { immediate: true })

watch(activeTab, (newTab) => {
    if (newTab === 'HISTORY') fetchLogs()
})

const submitComment = async () => {
    if (!newComment.value.trim()) return
    await addComment(props.issue.id, newComment.value)
    newComment.value = ''
}

const statusColor = computed(() => {
  switch (props.issue.status) {
    case 'OPEN': return '#3b82f6';
    case 'IN_PROGRESS': return '#f97316';
    case 'VERIFICATION_NEEDED': return '#eab308';
    case 'CLOSED': return '#64748b';
    default: return '#64748b';
  }
})

const statusLabel = computed(() => {
  switch (props.issue.status) {
    case 'OPEN': return t('status.OPEN');
    case 'IN_PROGRESS': return t('status.IN_PROGRESS');
    case 'VERIFICATION_NEEDED': return t('status.VERIFICATION_NEEDED');
    case 'CLOSED': return t('status.CLOSED');
    default: return t('status.UNKNOWN');
  }
})

const priorityColor = computed(() => {
  switch (props.issue.priority) {
    case 'URGENT': return '#ef4444';
    case 'HIGH': return '#f97316';
    case 'MEDIUM': return '#3b82f6';
    case 'LOW': return '#64748b';
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
    case 'BUG': return '#ec4899';
    case 'FEATURE': return '#8b5cf6';
    case 'ENHANCEMENT': return '#10b981';
    case 'TASK': return '#64748b';
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

const updateStatus = (status) => {
  emit('update-status', props.issue.id, status)
}

const updateDate = (field, value) => {
  emit('update', { [field]: value })
}

const isoDate = (isoString) => {
  if (!isoString) return ''
  return new Date(isoString).toISOString().split('T')[0]
}

const formatDate = (isoString) => {
  if (!isoString) return '-'
  return new Date(isoString).toLocaleString('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const formatDateText = (isoString) => {
  if (!isoString) return '-'
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}년 ${month}월 ${day}일`
}

const confirmDelete = () => {
  if (confirm('정말로 이 이슈를 삭제하시겠습니까?')) {
    emit('delete', props.issue.id)
  }
}

const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    // Optional: could add a toast notification here
}

const toggleDiff = async (commit) => {
    commit.showDiff = !commit.showDiff
    if (commit.showDiff && !commit.diffContent) {
        commit.loadingDiff = true
        try {
            const res = await fetch(`/api/issues/${props.issue.id}/commits/diff?repo=${encodeURIComponent(commit.repo || 'Sample Project Repo')}&revision=${commit.revision}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                commit.diffContent = data.diff
            } else {
                commit.diffContent = null
            }
        } catch (e) {
            commit.diffContent = null
        } finally {
            commit.loadingDiff = false
        }
    }
}

import hljs from 'highlight.js/lib/core';
import diff from 'highlight.js/lib/languages/diff';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
import 'highlight.js/styles/atom-one-dark.css';

hljs.registerLanguage('diff', diff);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('vue', xml); // Use XML for Vue templates roughly
hljs.registerLanguage('css', css);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);

const detectLanguage = (diffText) => {
    // Try to find filename in diff header
    // Support Git (b/...), SVN (Index: ...), and fallback to +++
    const match = diffText.match(/diff --git a\/.*? b\/(.*?)(\n|$)/) 
               || diffText.match(/Index: (.*?)(\n|$)/)
               || diffText.match(/\+\+\+ (?:b\/)?(.*?)(\n|$)/);

    if (match) {
        let filename = match[1].trim();
        // Remove SVN version info (e.g., "file.js\t(revision 123)")
        if (filename.includes('\t')) filename = filename.split('\t')[0];
        // Remove git/svn timestamp/revision if separated by space and looks like info
        filename = filename.replace(/\s+\(.*\)$/, '').trim();

        const ext = filename.split('.').pop().toLowerCase();
        
        const map = {
            'js': 'javascript',
            'cjs': 'javascript',
            'mjs': 'javascript',
            'json': 'json',
            'vue': 'xml', // Vue files often handled well enough by XML/HTML highlighter for template parts
            'html': 'xml',
            'xml': 'xml',
            'css': 'css',
            'sql': 'sql',
            'sh': 'bash',
            'bash': 'bash',
            'txt': 'plaintext'
        };
        return map[ext] || 'diff';
    }
    return 'diff';
};

const formatDiff = (diffText) => {
    if (!diffText) return '<span class="diff-null">변경 내용이 없거나 바이너리 파일입니다.</span>'

    try {
        const lang = detectLanguage(diffText);
        
        // If standard diff or unknown, use default block highlighting
        if (lang === 'diff') {
             return hljs.highlight(diffText, { language: 'diff' }).value;
        }

        // For specific languages, we render line by line
        // We need to manually handle escaping since we are building HTML
        const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

        return diffText.split('\n').map(line => {
            if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ') || line.startsWith('Index: ') || line.startsWith('====')) {
                return `<span class="diff-line diff-header">${escapeHtml(line)}</span>`;
            }
            if (line.startsWith('@@')) {
                return `<span class="diff-line diff-chunk">${escapeHtml(line)}</span>`;
            }

            // Content lines
            let prefix = line.charAt(0);
            let content = line.slice(1);
            let typeClass = '';

            if (prefix === '+') typeClass = 'diff-add';
            else if (prefix === '-') typeClass = 'diff-del';
            else if (prefix === ' ') typeClass = ''; // context
            else {
                // Unknown prefix, treat as context or header residue
                prefix = '';
                content = line;
            }

            // Highlight content
            let highlighted = content;
            if (content.trim().length > 0) {
                 try {
                    highlighted = hljs.highlight(content, { language: lang }).value;
                 } catch (e) {
                    highlighted = escapeHtml(content);
                 }
            } else {
                highlighted = ''; // Empty line
            }

            return `<div class="diff-line ${typeClass}"><span class="diff-marker">${prefix}</span><span class="diff-code">${highlighted}</span></div>`;
        }).join('');

    } catch (e) {
        console.error(e);
        return diffText;
    }
}

const getRelationLabel = (type) => {
    const map = {
        'BLOCKS': t('relation.blocks'),
        'BLOCKED_BY': t('relation.blockedBy'),
        'RELATED': t('relation.related'),
        'SUBTASK': t('relation.subtask')
    }
    return map[type] || type
}

const getRelationClass = (type) => {
    const map = {
        'BLOCKS': 'rel-blocks',
        'BLOCKED_BY': 'rel-blocked-by',
        'RELATED': 'rel-related',
        'SUBTASK': 'rel-subtask'
    }
    return map[type] || 'rel-related'
}
</script>

<template>
  <div class="issue-detail">
    <div class="header">
      <!-- Stamp for Closed Issues -->
      <div v-if="issue.status === 'CLOSED'" class="stamp-container">
          <div class="stamp-content">COMPLETED</div>
      </div>

      <div class="meta-top">
        <div class="badges">
          <span class="badge" :style="{ backgroundColor: statusColor }">
            {{ statusLabel }}
          </span>
          <span class="id-tag">#{{ String(issue.id).slice(0, 8) }}</span>
        </div>
        <span class="date">{{ formatDateText(issue.created_at) }}</span>
      </div>
      
      <div v-if="isEditing" class="edit-title-container">
          <input v-model="editForm.title" class="input-title" placeholder="제목을 입력하세요" />
      </div>
      <h2 v-else class="title" :class="{ 'title-closed': issue.status === 'CLOSED' }">{{ issue.title }}</h2>

        <div class="properties">
        <div class="prop-item">
          <span class="prop-label">{{ t('issue.priority') }}</span>
          <span class="badge-outline" :style="{ borderColor: priorityColor, color: priorityColor }">
            {{ priorityLabel }}
          </span>
        </div>
        
        <div class="prop-item">
          <span class="prop-label">{{ t('issue.label') }}</span>
          <span class="badge-soft" :style="{ backgroundColor: labelColor + '20', color: labelColor }">
            {{ labelText }}
          </span>
        </div>

        <div class="prop-item">
          <span class="prop-label">{{ t('issue.assignee') }}</span>
          <div class="assignee" v-if="issue.assignee">
            <span class="avatar">{{ issue.assignee[0] }}</span>
            <span class="name">{{ issue.assignee }}</span>
          </div>
          <span v-else class="text-secondary">{{ t('issue.unassigned') }}</span>
        </div>

        <div class="prop-item">
            <span class="prop-label">{{ t('issue.milestone') }}</span>
            <span v-if="issue.milestone_title" class="prop-text text-primary" style="font-weight: 800;">
                🚩 {{ issue.milestone_title }}
            </span>
            <span v-else class="text-secondary">{{ t('issue.none') }}</span>
        </div>

        <div class="prop-item" v-if="issue.attachments && issue.attachments.length > 0">
            <span class="prop-label">{{ t('issue.attachments') }}</span>
            <div class="attachment-list">
                <a v-for="(file, i) in issue.attachments" :key="i" 
                   :href="'http://localhost:3000' + file.path" 
                   target="_blank" 
                   class="attachment-link">
                   📄 {{ file.originalName }}
                </a>
            </div>
        </div>

        <!-- Date Fields -->
        <div class="prop-item">
          <span class="prop-label">{{ t('issue.createdAt') }}</span>
          <span class="prop-text">{{ formatDateText(issue.created_at) }}</span>
        </div>
        <div class="prop-item">
          <span class="prop-label">{{ t('issue.startDate') }}</span>
          <span class="prop-text">{{ formatDateText(issue.start_date) }}</span>
        </div>
        <div class="prop-item">
          <span class="prop-label">{{ t('issue.dueDate') }}</span>
          <span class="prop-text">{{ formatDateText(issue.due_date) }}</span>
        </div>
      </div>
    </div>
    
    <div class="content-body">
        <!-- Tabs Nav -->
        <div class="tabs">
            <button :class="{ active: activeTab === 'DETAIL' }" @click="activeTab = 'DETAIL'">{{ t('issue.detail') }}</button>
            <button :class="{ active: activeTab === 'HISTORY' }" @click="activeTab = 'HISTORY'">{{ t('issue.history') }}</button>
        </div>

        <div v-if="activeTab === 'DETAIL'">
            <div class="detail-grid">
                <div class="prop-group">
                    <label>{{ t('issue.status') }}</label>
                    <div class="status-display">
                        <span class="badge" :style="{ backgroundColor: statusColor }">
                            {{ statusLabel }}
                        </span>
                    </div>
                </div>
                
                <div class="prop-group">
                    <label>{{ t('issue.priority') }}</label>
                    <span class="badge-outline" :style="{ borderColor: priorityColor, color: priorityColor }">
                        {{ priorityLabel }}
                    </span>
                </div>

                <div class="prop-group">
                    <label>{{ t('issue.label') }}</label>
                    <span class="badge-soft" :style="{ backgroundColor: labelColor + '20', color: labelColor }">
                        {{ labelText }}
                    </span>
                </div>

                <div class="prop-group">
                    <label>{{ t('issue.assignee') }}</label>
                    <div class="assignee" v-if="issue.assignee">
                        <span class="avatar">{{ issue.assignee[0] }}</span>
                        <span class="name">{{ issue.assignee }}</span>
                    </div>
                    <span v-else class="text-secondary">{{ t('issue.unassigned') }}</span>
                </div>

                <div class="prop-group">
                    <label>{{ t('issue.startDate') }}</label>
                    <span class="prop-text">{{ formatDateText(issue.start_date) }}</span>
                </div>

                <div class="prop-group">
                    <label>{{ t('issue.dueDate') }}</label>
                    <span class="prop-text">{{ formatDateText(issue.due_date) }}</span>
                </div>

                <div class="prop-group">
                    <label>{{ t('issue.milestone') }}</label>
                    <select :value="issue.milestone_id" @change="e => emit('update', { milestone_id: e.target.value })" class="status-select">
                        <option :value="null">{{ t('issue.none') }}</option>
                        <option v-for="m in milestones" :key="m.id" :value="m.id">{{ m.title }}</option>
                    </select>
                </div>
            </div>

            <div class="description-box">
                <h3 class="section-title">{{ t('issue.description') }}</h3>
                <div v-if="isEditing" class="editor-wrapper">
                    <QuillEditor 
                        theme="snow" 
                        v-model:content="editForm.description" 
                        contentType="html" 
                        :toolbar="['bold', 'italic', 'underline', 'image']"
                    />
                </div>
                <div v-else class="description" v-html="issue.description || t('issue.none')"></div>
            </div>

            <div class="resolution-box">
                <h3 class="section-title">
                    <span>{{ t('issue.resolution') }}</span>
                    <button v-if="!isEditingResolution && (isAssignee || isAdmin)" @click="startEditResolution" class="btn-sm-edit">{{ t('action.edit') }}</button>
                </h3>
                <div v-if="isEditingResolution" class="editor-wrapper">
                    <QuillEditor theme="snow" v-model:content="resolutionForm" contentType="html" />
                    <div class="edit-actions">
                        <button @click="saveResolution" class="btn-primary">{{ t('action.save') }}</button>
                        <button @click="cancelEditResolution" class="btn-action">{{ t('action.cancel') }}</button>
                    </div>
                </div>
                <div v-else class="description" v-html="issue.resolution || t('issue.none')"></div>
            </div>

            <!-- Relations Section -->
            <div class="relations-section">
                <div class="section-header">
                    <h3>{{ t('issue.relations') }}</h3>
                    <button @click="showRelationForm = !showRelationForm" class="btn-add-rel">
                        {{ showRelationForm ? t('action.cancel') : t('action.add') }}
                    </button>
                </div>
                <div v-if="showRelationForm" class="rel-form">
                    <input v-model="relIssueId" placeholder="ID" class="rel-input" />
                    <select v-model="relType" class="rel-select">
                        <option value="RELATED">{{ t('relation.related') }}</option>
                        <option value="BLOCKS">{{ t('relation.blocks') }}</option>
                        <option value="SUBTASK">{{ t('relation.subtask') }}</option>
                    </select>
                    <button @click="addRelation" class="btn-save-rel">{{ t('action.connect') }}</button>
                </div>
                <div class="rel-list">
                    <div v-for="rel in relations" :key="rel.id" class="rel-item">
                        <span :class="['rel-badge', getRelationClass(rel.relation_type)]">
                            {{ getRelationLabel(rel.relation_type) }}
                        </span>
                        
                        <div class="rel-title-wrapper">
                            <div class="rel-id-line">
                                <span class="rel-id">#{{ String(rel.related_issue_id).slice(0,8) }}</span>
                                <span class="rel-arrow">➔</span>
                                <span class="rel-status" :class="rel.status">{{ rel.status }}</span>
                            </div>
                            <span class="rel-title">{{ rel.title }}</span>
                        </div>
                        
                        <button @click="deleteRelation(rel.id)" class="btn-del-rel">×</button>
                    </div>
                </div>
            </div>

            <!-- Commit History -->
            <div v-if="commits.length > 0" class="resolution-box">
                <h3 class="section-title">
                    <span>{{ t('issue.commits') }}</span>
                    <span class="badge-count">{{ commits.length }}</span>
                </h3>
                <div class="commits-list">
                    <div v-for="c in commits" :key="c.revision" class="commit-card-wrapper">
                        <div class="commit-card" @click="toggleDiff(c)">
                            <div class="commit-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M6 21V9a9 9 0 0 0 9 9"></path></svg>
                            </div>
                            <div class="commit-content">
                                <div class="commit-top">
                                    <div class="commit-message">{{ c.message }}</div>
                                    <span class="commit-date">{{ formatDate(c.date) }}</span>
                                </div>
                                <div class="commit-meta">
                                    <span class="commit-hash" @click.stop="copyToClipboard(c.revision)">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                        {{ c.revision.slice(0, 7) }}
                                    </span>
                                    <span class="commit-ref">{{ c.repo || 'Sample Repo' }}</span>
                                </div>
                            </div>
                             <div class="commit-arrow" :class="{ open: c.showDiff }">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                        </div>
                        <div v-if="c.showDiff" class="diff-viewer">
                            <div v-if="c.loadingDiff" class="diff-loading">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                                {{ t('issue.loading') }}
                            </div>
                            <pre v-else class="diff-content" v-html="formatDiff(c.diffContent)"></pre>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="actions">
                <template v-if="isAssignee || isAdmin">
                    <button v-if="issue.status === 'OPEN'" @click="updateStatus('IN_PROGRESS')" class="btn-action">{{ t('action.start') }}</button>
                    <button v-if="issue.status === 'IN_PROGRESS'" @click="updateStatus('VERIFICATION_NEEDED')" class="btn-action btn-verify">{{ t('action.verify') }}</button>
                </template>
                <template v-if="isCreator || isAdmin">
                    <button v-if="issue.status === 'VERIFICATION_NEEDED'" @click="updateStatus('CLOSED')" class="btn-primary">{{ t('action.approve') }}</button>
                    <button v-if="issue.status === 'CLOSED'" @click="updateStatus('OPEN')" class="btn-action">{{ t('action.reopen') }}</button>
                </template>
                <button v-if="isAdmin || isCreator" @click="confirmDelete" class="btn-danger">{{ t('action.delete') }}</button>
            </div>

            <!-- Comments -->
            <div class="comments-section">
                <h3 class="section-title">{{ t('issue.comments') }} ({{ comments.length }})</h3>
                <div class="comments-list">
                    <div v-for="c in comments" :key="c.id" class="comment-item">
                        <div class="comment-header">
                            <span class="comment-user">{{ c.user_name }}</span>
                            <span class="comment-date">{{ formatDate(c.created_at) }}</span>
                            <button v-if="user && (user.id === c.user_id || user.role === 'ADMIN')" @click="deleteComment(c.id)" class="btn-delete-comment">×</button>
                        </div>
                        <div class="comment-content">{{ c.content }}</div>
                    </div>
                </div>
                <div class="comment-form">
                    <textarea v-model="newComment" :placeholder="t('issue.writeComment')" class="input-comment"></textarea>
                    <button @click="submitComment" class="btn-primary" :disabled="!newComment.trim()">{{ t('issue.submit') }}</button>
                </div>
            </div>
        </div>

        <!-- History Tab Panel -->
        <div v-if="activeTab === 'HISTORY'" class="history-panel">
            <div v-for="log in logs" :key="log.id" class="log-item">
                <div class="log-dot"></div>
                <div class="log-content">
                    <div class="log-header">
                        <span class="log-user">{{ log.user_name }}</span>
                        <span class="log-action">{{ translateAction(log.action) }}</span>
                        <span class="log-date">{{ formatDate(log.created_at) }}</span>
                    </div>
                    <div class="log-values">
                        <span class="old">{{ formatLogValue(log.old_value) }}</span>
                        <span class="arrow">→</span>
                        <span class="new">{{ formatLogValue(log.new_value) }}</span>
                    </div>
                </div>
            </div>
            <div v-if="logs.length === 0" class="empty-state">{{ t('issue.noHistory') }}</div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.issue-detail {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
  box-shadow: var(--glass-shadow);
  position: relative; /* For stamp positioning */
  overflow: hidden; /* Clip stamp */
  overflow-y: auto; /* Allow scrolling for long content + comments */
}

/* Stamp Effect */
.stamp-container {
    position: absolute;
    top: 30px;
    right: 40px;
    z-index: 10;
    pointer-events: none;
    opacity: 0;
    animation: stamp-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.stamp-content {
    color: var(--success);
    border: 3px solid var(--success);
    padding: 0.5rem 1rem;
    font-size: 1.5rem;
    font-weight: 800;
    text-transform: uppercase;
    transform: rotate(-15deg);
    border-radius: 8px;
    opacity: 0.8;
    letter-spacing: 2px;
    mask-image: url("data:image/svg+xml;utf8,<svg width='100%' height='100%' xmlns='http://www.w3.org/2000/svg'><filter id='noise'><feTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23noise)' opacity='0.5'/></svg>");
}

@keyframes stamp-in {
    0% { transform: scale(3) rotate(-15deg); opacity: 0; }
    100% { transform: scale(1) rotate(-15deg); opacity: 1; }
}

.title-closed {
    text-decoration: line-through;
    color: var(--text-secondary);
}

.header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: var(--spacing-lg);
  flex-shrink: 0;
}

.meta-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badges {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.id-tag {
  font-family: monospace;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.date {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.input-title {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--text-primary);
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--primary);
    border-radius: var(--radius-md);
    padding: 0.2rem 0.5rem;
    width: 100%;
}

.input-title:focus {
    outline: none;
}

.properties {
  display: flex;
  gap: var(--spacing-xl);
  margin-top: var(--spacing-xs);
  flex-wrap: wrap;
}

.prop-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.prop-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
}

.badge {
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
}

.badge-outline {
  padding: 0.15rem 0.6rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid currentColor;
  width: fit-content;
}

.badge-soft {
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 600;
  width: fit-content;
}

.assignee, .creator {
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

.attachment-list {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.attachment-link {
    color: var(--primary);
    text-decoration: none;
    font-size: 0.9rem;
}

.attachment-link:hover {
    text-decoration: underline;
}

.attachment-link:hover {
    text-decoration: underline;
}

.prop-text {
    color: var(--text-primary);
    font-size: 0.9rem;
    font-weight: 500;
}

.input-date:hover:not(:disabled) {
    background: var(--bg-card-hover);
}

.input-date:disabled {
    cursor: default;
    opacity: 0.8;
}

.description-box, .resolution-box {
  flex: 0 0 auto;
}

.resolution-box {
    padding-top: var(--spacing-lg);
    border-top: 1px dashed var(--glass-border);
}

.section-title {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: space-between;
}

.btn-sm-edit {
    font-size: 0.8rem;
    padding: 0.2rem 0.6rem;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    background: transparent;
}

.btn-sm-edit:hover {
    color: var(--primary);
    border-color: var(--primary);
}

.edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.description {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.btn-action {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  background: var(--bg-card-hover);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  transition: all var(--transition-fast);
}

.btn-action:hover {
  background: var(--primary);
  border-color: var(--primary);
}

.btn-verify {
  background: var(--warning);
  color: white;
  border: 1px solid var(--warning);
}

.btn-verify:hover {
  background: #d97706;
  border-color: #d97706;
}

.btn-reject {
    background: transparent;
    border: 1px solid var(--danger);
    color: var(--danger);
}

.btn-reject:hover {
    background: rgba(239, 68, 68, 0.1);
}

.btn-danger {
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.3);
  background: transparent;
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--danger);
}

/* Comments Styles */
.comments-section {
    margin-top: var(--spacing-lg);
    border-top: 1px solid var(--glass-border);
    padding-top: var(--spacing-lg);
}

.comments-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
}

.comment-item {
    background: var(--bg-body);
    padding: 0.75rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--glass-border);
}

.comment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.4rem;
    font-size: 0.8rem;
}

.comment-user {
    font-weight: 700;
    color: var(--text-primary);
}

.comment-date {
    color: var(--text-secondary);
}

.comment-content {
    font-size: 0.95rem;
    line-height: 1.5;
    white-space: pre-wrap;
    color: var(--text-primary);
}

.btn-delete-comment {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0 0.3rem;
    font-size: 1.1rem;
    line-height: 1;
}

.btn-delete-comment:hover {
    color: var(--danger);
}

.comment-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.input-comment {
    width: 100%;
    background: rgba(0,0,0,0.1);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 0.75rem;
    font-size: 0.95rem;
    color: var(--text-primary);
    resize: vertical;
    min-height: 60px;
}

.input-comment:focus {
    outline: none;
    border-color: var(--primary);
    background: rgba(0,0,0,0.2);
}

.text-sm {
    font-size: 0.85rem;
}

.commits-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 200px;
    overflow-y: auto;
}

/* New Commit Card Styles */
.commit-card {
    display: flex;
    gap: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--glass-border);
    padding: 1rem;
    border-radius: var(--radius-md);
    transition: all 0.2s;
    align-items: center; /* Center Vertically */
    cursor: pointer; /* Clickable cursor */
}

.commit-card:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    border-color: var(--primary);
}

.commit-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border-radius: 50%;
    flex-shrink: 0;
}

.commit-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.commit-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.commit-message {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.4;
}

.commit-date {
    font-size: 0.8rem;
    color: var(--text-secondary);
    white-space: nowrap;
    margin-left: 1rem;
}

.commit-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.commit-hash {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-family: monospace;
    font-size: 0.8rem;
    color: var(--text-secondary);
    background: rgba(0,0,0,0.2);
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.commit-hash:hover {
    background: var(--primary);
    color: white;
}

.btn-sm-diff {
    font-size: 0.75rem;
    padding: 2px 8px;
    background: var(--bg-card);
    border: 1px solid var(--glass-border);
    color: var(--text-primary);
    border-radius: 4px;
    cursor: pointer;
    margin-left: auto;
}

.btn-sm-diff:hover {
    border-color: var(--primary);
    color: var(--primary);
}

.commit-arrow {
    margin-left: auto;
    color: var(--text-secondary);
    transition: transform 0.3s ease;
}

.commit-arrow.open {
    transform: rotate(180deg);
}

.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.rel-list { display: flex; flex-direction: column; gap: 0.8rem; }
.rel-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(0,0,0,0.2);
    padding: 0.8rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--glass-border);
    transition: all 0.2s;
}

.rel-item:hover {
    transform: translateX(3px);
    background: rgba(0,0,0,0.3);
    border-color: var(--primary);
}

.rel-badge {
    font-size: 0.7rem;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    min-width: 60px;
    text-align: center;
}

.rel-blocks { background: #ef4444; }
.rel-blocked-by { background: #f59e0b; }
.rel-related { background: #3b82f6; }
.rel-subtask { background: #10b981; }

.rel-title-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.rel-id-line {
    font-size: 0.75rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.rel-arrow { font-weight: bold; color: var(--text-secondary); }

.input-comment:focus {
    outline: none;
    border-color: var(--primary);
    background: rgba(0,0,0,0.2);
}

.btn-comment {
    align-self: flex-end;
}

/* History & Relations Styles */
.content-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.tabs {
    display: flex;
    gap: 1.5rem;
    margin-bottom: var(--spacing-lg);
    border-bottom: 1px solid var(--glass-border);
    padding-bottom: 0.5rem;
}

.tabs button {
    padding: 0.5rem 0;
    font-weight: 700;
    color: var(--text-secondary);
    transition: all 0.2s;
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
    font-size: 1rem;
}

.tabs button:hover {
    color: var(--text-primary);
}

.tabs button.active {
    color: var(--primary);
}

.tabs button.active::after {
    content: '';
    position: absolute;
    bottom: -0.5rem;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--primary);
    border-radius: 2px;
}

.detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
}

.prop-group {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.prop-group label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 600;
}

.status-select {
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 0.4rem;
    color: var(--text-primary);
    font-size: 0.9rem;
}

.history-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem 0;
}

.log-item {
    display: flex;
    gap: 1.2rem;
    position: relative;
}

.log-dot {
    width: 10px;
    height: 10px;
    background: var(--primary);
    border-radius: 50%;
    margin-top: 5px;
    z-index: 1;
    box-shadow: 0 0 10px var(--primary);
}

.log-item::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 15px;
    bottom: -1.7rem;
    width: 2px;
    background: var(--glass-border);
}

.log-item:last-child::before { display: none; }

.log-content { flex: 1; }

.log-header {
    display: flex;
    gap: 0.5rem;
    font-size: 0.85rem;
    margin-bottom: 0.3rem;
    align-items: center;
}

.log-user { font-weight: bold; }
.log-action { color: var(--text-secondary); background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; }
.log-date { color: var(--text-secondary); opacity: 0.6; font-size: 0.75rem; margin-left: auto; }

.log-values {
    font-size: 0.85rem;
    background: rgba(0,0,0,0.2);
    padding: 0.5rem 0.8rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 1rem;
    border: 1px solid var(--glass-border);
}

.old { text-decoration: line-through; opacity: 0.5; color: #ef4444; }
.new { color: #10b981; }
.arrow { color: var(--text-secondary); font-weight: bold; }

.relations-section {
    margin-top: 2rem;
    padding: 1.5rem;
    background: rgba(255,255,255,0.03);
    border-radius: var(--radius-lg);
    border: 1px solid var(--glass-border);
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.btn-add-rel { 
    font-size: 0.8rem; 
    background: var(--bg-card-hover); 
    padding: 0.3rem 0.8rem; 
    border-radius: var(--radius-md); 
    color: var(--primary);
    font-weight: bold;
}

.rel-form {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    background: rgba(0,0,0,0.2);
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid var(--primary);
}

.rel-input { flex: 1; background: var(--bg-body); padding: 0.5rem; border-radius: 4px; border: 1px solid var(--glass-border); color: white; }
.rel-select { background: var(--bg-body); padding: 0.5rem; border-radius: 4px; border: 1px solid var(--glass-border); color: white; }
.btn-save-rel { background: var(--primary); color: white; padding: 0.5rem 1.2rem; border-radius: 4px; font-weight: bold; }

.btn-del-rel { font-size: 1.2rem; color: var(--text-secondary); opacity: 0.5; }
.btn-del-rel:hover { color: #ef4444; opacity: 1; }

.empty-state {
    padding: 3rem;
    text-align: center;
    color: var(--text-secondary);
    border: 1px dashed var(--glass-border);
    border-radius: var(--radius-lg);
}
</style>

<style>
/* Global Diff Styles for v-html content */
.diff-viewer {
    margin-top: 0.5rem;
    background: #1e1e1e;
    border-radius: var(--radius-md);
    padding: 1rem;
    overflow-x: auto;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.85rem;
    color: #d4d4d4;
    border: 1px solid var(--glass-border);
    line-height: 1.5;
}

.diff-content {
    margin: 0;
    white-space: pre;
}

/* Diff Styles */
.diff-line { 
    display: flex; 
    align-items: flex-start; 
    min-height: 1.5em; 
    width: 100%;
    font-family: 'Consolas', 'Monaco', monospace;
}

.diff-marker {
    display: inline-block;
    width: 30px; /* Increased width */
    text-align: center;
    flex-shrink: 0;
    opacity: 0.7;
    user-select: none;
    padding-top: 2px;
    margin-right: 5px; /* Added spacing */
}

.diff-code {
    flex: 1;
    white-space: pre-wrap; 
    word-break: break-all;
    padding-right: 0.5rem;
    padding-left: 0.2rem;
}

.diff-add { 
    background: rgba(16, 185, 129, 0.1); /* Reduced opacity */
    border-left: 3px solid #10b981;
}

.diff-del { 
    background: rgba(239, 68, 68, 0.1); /* Reduced opacity */
    border-left: 3px solid #ef4444;
}

.diff-add .diff-marker {
    color: #10b981;
    font-weight: bold;
}

.diff-del .diff-marker {
    color: #ef4444;
    font-weight: bold;
}

.diff-chunk { 
    color: #60a5fa; 
    font-weight: bold; 
    margin-top: 0.5em; 
    display: block; 
    padding: 0.2rem 0.5rem;
    background: rgba(255,255,255,0.05);
}

.diff-header {
    color: var(--text-secondary);
    font-weight: bold;
    font-size: 0.8rem;
    padding: 0.2rem 0.5rem;
}

.diff-null { opacity: 0.5; font-style: italic; }

.diff-loading {
    color: var(--text-secondary);
    font-style: italic;
    padding: 1rem;
    text-align: center;
}
</style>
