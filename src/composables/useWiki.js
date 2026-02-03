import { ref, onMounted } from 'vue'

export function useWiki() {
    const pages = ref([])

    const fetchPages = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/wiki', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                if (Array.isArray(data)) {
                    pages.value = data
                } else {
                    console.error('API returned non-array wiki data:', data)
                    pages.value = []
                }
            } else {
                console.error('Failed to fetch pages:', res.statusText)
            }
        } catch (e) {
            console.error('Failed to fetch pages', e)
        }
    }

    onMounted(() => {
        fetchPages()
    })

    const addPage = async (title, content = '') => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/wiki', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    content_ko: content,
                    content_en: ''
                })
            })
            if (res.ok) {
                const newPage = await res.json()
                pages.value.unshift(newPage)
                return newPage.id
            }
        } catch (e) {
            console.error('Error adding page: ', e)
        }
    }

    const updatePage = async (id, updates) => {
        try {
            const token = localStorage.getItem('token')
            await fetch(`/api/wiki/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            })
            // Update local state
            const index = pages.value.findIndex(p => p.id === id)
            if (index !== -1) {
                pages.value[index] = {
                    ...pages.value[index],
                    ...updates,
                    content: updates.content_ko || updates.content || pages.value[index].content,
                    updatedAt: new Date().toISOString()
                }
            }
        } catch (e) {
            console.error('Error updating page: ', e)
        }
    }

    const deletePage = async (id) => {
        if (confirm('정말로 삭제하시겠습니까?')) {
            try {
                const token = localStorage.getItem('token')
                await fetch(`/api/wiki/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                pages.value = pages.value.filter(p => p.id !== id)
            } catch (e) {
                console.error('Error deleting page: ', e)
            }
        }
    }

    return {
        pages,
        addPage,
        updatePage,
        deletePage
    }
}
