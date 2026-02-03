import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import '@vueup/vue-quill/dist/vue-quill.snow.css';

import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ko from './locales/ko.json'

const i18n = createI18n({
    legacy: false, // Use Composition API
    locale: 'ko', // Default locale
    fallbackLocale: 'en',
    messages: { en, ko }
})

createApp(App).use(i18n).mount('#app')
