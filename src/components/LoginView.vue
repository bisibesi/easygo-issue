<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['login-success'])

const { login } = useAuth()
const { t } = useI18n()

const userId = ref('')
const password = ref('')
const errorMsg = ref('')

const handleLogin = () => {
  if (login(userId.value, password.value)) {
    userId.value = ''
    password.value = ''
    errorMsg.value = ''
    emit('login-success')
  } else {
    errorMsg.value = t('login.error')
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h2>{{ t('login.title') }}</h2>
      <p class="desc">{{ t('login.desc') }}</p>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label>{{ t('login.id') }}</label>
          <input 
            v-model="userId" 
            type="text" 
            placeholder="admin"
            class="input-field"
            required
          />
        </div>
        
        <div class="form-group">
          <label>{{ t('login.password') }}</label>
          <input 
            v-model="password" 
            type="password" 
            placeholder="admin"
            class="input-field"
            required
          />
        </div>
        
        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
        
        <button type="submit" class="btn-primary">{{ t('login.submit') }}</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
}

.login-card {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  width: 100%;
  max-width: 400px;
  box-shadow: var(--glass-shadow);
  text-align: center;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: var(--spacing-xs);
  color: var(--text-primary);
}

.desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: var(--spacing-lg);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  text-align: left;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-group label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.input-field {
  width: 100%;
  background: rgba(0,0,0,0.2);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  padding: 0.75rem;
  font-size: 1rem;
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.input-field:focus {
  outline: none;
  border-color: var(--primary);
  background: rgba(0,0,0,0.3);
}

.error-msg {
  color: var(--danger);
  font-size: 0.9rem;
  text-align: center;
}

.btn-primary {
  background: var(--primary);
  color: white;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 1rem;
  transition: background var(--transition-fast);
  margin-top: var(--spacing-sm);
}

.btn-primary:hover {
  background: var(--primary-hover);
}
</style>
