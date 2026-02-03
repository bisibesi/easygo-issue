import { ref, onMounted } from 'vue'

const issues = ref([])

export function useIssues() {
  const fetchIssues = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/issues', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          issues.value = data
        } else {
          console.error('API returned non-array issues data:', data)
          issues.value = []
        }
      } else {
        console.error('Failed to fetch issues:', res.statusText)
        issues.value = [] // Clear if fetch fails (e.g. 401)
      }
    } catch (e) {
      console.error('Failed to fetch issues', e)
    }
  }

  const clearIssues = () => {
    issues.value = []
  }

  // Load from API on mount
  onMounted(() => {
    fetchIssues()
  })

  const addIssue = async (issueData) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(issueData)
      })
      if (res.ok) {
        const newIssue = await res.json()
        issues.value.unshift(newIssue)
      } else {
        alert('이슈 추가 실패')
      }
    } catch (e) {
      console.error('Error adding issue:', e)
    }
  }

  const updateIssueStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/issues/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })

      if (res.ok) {
        const index = issues.value.findIndex(i => i.id === id)
        if (index !== -1) {
          issues.value[index].status = status
          issues.value[index].updated_at = new Date().toISOString()
        }
      } else {
        const err = await res.json()
        alert('상태 업데이트 실패: ' + (err.error || '권한 부족'))
      }
    } catch (e) {
      console.error('Error updating issue status:', e)
    }
  }

  const updateIssue = async (id, updates) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/issues/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      })

      if (res.ok) {
        const index = issues.value.findIndex(i => i.id === id)
        if (index !== -1) {
          // Update local state with new values
          issues.value[index] = { ...issues.value[index], ...updates, updated_at: new Date().toISOString() }
        }
      } else {
        const err = await res.json()
        alert('업데이트 실패: ' + (err.error || '권한 부족'))
      }
    } catch (e) {
      console.error('Error updating issue:', e)
    }
  }

  const deleteIssue = async (id) => {
    if (confirm('이슈를 삭제하시겠습니까?')) {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/issues/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          issues.value = issues.value.filter(i => i.id !== id)
        } else {
          const err = await res.json()
          alert('삭제 실패: ' + (err.error || '권한 부족'))
        }
      } catch (e) {
        console.error('Error deleting issue:', e)
      }
    }
  }

  return {
    issues,
    fetchIssues,
    addIssue,
    updateIssueStatus,
    updateIssue,
    deleteIssue,
    clearIssues
  }
}
