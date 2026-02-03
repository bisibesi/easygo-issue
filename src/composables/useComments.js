import { ref } from 'vue'

export function useComments() {
    const comments = ref([])

    const fetchComments = async (issueId) => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/comments/${issueId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                comments.value = await res.json()
            }
        } catch (e) {
            console.error('Failed to fetch comments', e)
        }
    }

    const addComment = async (issueId, content) => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ issueId, content })
            })
            if (res.ok) {
                const newComment = await res.json()
                comments.value.push(newComment)
                return true
            }
        } catch (e) {
            console.error('Error adding comment', e)
        }
        return false
    }

    const deleteComment = async (id) => {
        if (!confirm('댓글을 삭제하시겠습니까?')) return

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/comments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                comments.value = comments.value.filter(c => c.id !== id)
            } else {
                alert('삭제 실패 (권한이 없습니다)')
            }
        } catch (e) {
            console.error('Error deleting comment', e)
        }
    }

    return {
        comments,
        fetchComments,
        addComment,
        deleteComment
    }
}
