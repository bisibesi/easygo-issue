import { ref, watch, onMounted } from 'vue'

const SETTINGS_KEY = 'issue-tracker-settings'

const defaultAssignees = ['홍길동', '김철수', '이영희']

const assignees = ref([...defaultAssignees])

export function useSettings() {

    onMounted(() => {
        const data = localStorage.getItem(SETTINGS_KEY)
        if (data) {
            try {
                const parsed = JSON.parse(data)
                if (parsed.assignees) {
                    assignees.value = parsed.assignees
                }
            } catch (e) {
                console.error('Failed to parse settings', e)
            }
        }
    })

    watch(assignees, (newVal) => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ assignees: newVal }))
    }, { deep: true })

    const addAssignee = (name) => {
        if (name && !assignees.value.includes(name)) {
            assignees.value.push(name)
        }
    }

    const removeAssignee = (name) => {
        assignees.value = assignees.value.filter(a => a !== name)
    }

    return {
        assignees,
        addAssignee,
        removeAssignee
    }
}
