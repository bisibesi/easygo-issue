import { ref } from 'vue'

const getUserFromStorage = () => {
    try {
        return JSON.parse(localStorage.getItem('user')) || null
    } catch {
        localStorage.removeItem('user')
        return null
    }
}

const user = ref(getUserFromStorage())
const isAuthenticated = ref(!!user.value)

export function useAuth() {
    const login = async (email, password) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })
            const data = await res.json()

            if (data.auth) {
                user.value = data.user
                isAuthenticated.value = true
                localStorage.setItem('token', data.token)
                localStorage.setItem('user', JSON.stringify(data.user))
                return true
            } else {
                alert(data.error || 'Login failed')
                return false
            }
        } catch (error) {
            console.error('Login error:', error)
            return false
        }
    }

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
        } finally {
            user.value = null
            isAuthenticated.value = false
            localStorage.removeItem('token')
            localStorage.removeItem('user')
        }
    }

    return {
        user,
        isAuthenticated,
        login,
        logout
    }
}
