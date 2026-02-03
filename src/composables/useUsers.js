import { ref, onMounted } from 'vue'
import { useAuth } from './useAuth'

export function useUsers() {
    const users = ref([])
    const { isAuthenticated } = useAuth()

    const fetchUsers = async () => {
        if (!isAuthenticated.value) return
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                if (Array.isArray(data)) {
                    users.value = data
                } else {
                    console.error('API returned non-array users data:', data)
                    users.value = []
                }
            }
        } catch (e) {
            console.error('Failed to fetch users', e)
        }
    }

    const addUser = async (userData) => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userData)
            })
            if (res.ok) {
                await fetchUsers()
                return { success: true }
            } else {
                const err = await res.json()
                return { success: false, error: err.error }
            }
        } catch (e) {
            console.error('Error adding user:', e)
            return { success: false, error: e.message }
        }
    }

    const updateUser = async (id, userData) => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userData)
            })
            if (res.ok) {
                await fetchUsers()
                return { success: true }
            } else {
                const err = await res.json()
                return { success: false, error: err.error }
            }
        } catch (e) {
            return { success: false, error: e.message }
        }
    }

    const deleteUser = async (id) => {
        if (!confirm('정말로 이 사용자를 삭제하시겠습니까?')) return

        try {
            const token = localStorage.getItem('token')
            await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            // Optimistic update or refetch
            users.value = users.value.filter(u => u.id !== id)
        } catch (e) {
            console.error('Error deleting user:', e)
        }
    }

    onMounted(() => {
        fetchUsers()
    })

    return {
        users,
        fetchUsers,
        addUser,
        updateUser,
        deleteUser
    }
}
