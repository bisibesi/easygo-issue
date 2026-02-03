import { ref, onMounted, onUnmounted } from 'vue'

const notifications = ref([])
const unreadCount = ref(0)

export function useNotifications() {
    let interval = null

    const clearNotifications = () => {
        notifications.value = []
        unreadCount.value = 0
    }

    const fetchNotifications = async () => {
        const token = localStorage.getItem('token')
        if (!token) return

        try {
            const res = await fetch('/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                notifications.value = data
                unreadCount.value = data.filter(n => !n.is_read).length
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err)
        }
    }

    const markAsRead = async (id) => {
        const token = localStorage.getItem('token')
        try {
            await fetch(`/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            fetchNotifications()
        } catch (err) {
            console.error('Failed to mark notification as read:', err)
        }
    }

    const removeNotification = async (id) => {
        const token = localStorage.getItem('token')
        try {
            await fetch(`/api/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            fetchNotifications()
        } catch (err) {
            console.error('Failed to remove notification:', err)
        }
    }

    const clearAll = async () => {
        const token = localStorage.getItem('token')
        try {
            await fetch('/api/notifications', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            fetchNotifications()
        } catch (err) {
            console.error('Failed to clear notifications:', err)
        }
    }

    onMounted(() => {
        fetchNotifications()
        // Poll every 30 seconds
        interval = setInterval(fetchNotifications, 30000)
    })

    onUnmounted(() => {
        if (interval) clearInterval(interval)
    })

    return {
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        removeNotification,
        clearAll,
        clearNotifications
    }
}
