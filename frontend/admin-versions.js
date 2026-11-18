function askConfirmation(title, description, positive, callback) {
    confirmAction = callback
    byId('confirmation-title').textContent = title
    byId('confirmation-description').textContent = description
    byId('confirmation-yes').textContent = positive
    byId('confirmation-dialog').showModal()
}
byId('confirmation-yes').addEventListener('click', () => {
    byId('confirmation-dialog').close()
    const action = confirmAction
    confirmAction = null
    if (action) action()
})
byId('confirmation-no').addEventListener('click', () => { confirmAction = null; byId('confirmation-dialog').close() })
byId('extended-dialog-close').addEventListener('click', () => byId('extended-dialog').close())
document.querySelectorAll('[data-extra-close]').forEach((button) => button.addEventListener('click', () => byId('extended-dialog').close()))

function versionStatus(status) {
    if (status === 'draft') return 'Черновик'
    if (status === 'published') return 'Опубликовано'
    return 'Архивировано'
}
function findVersion(id) { return extraData.versions.find((item) => item.id === Number(id)) }
function selectedVersions() {
    return [...document.querySelectorAll('.version-select:checked')].map((input) => Number(input.value))
}
function changeVersionName(version) {
    editingVersionId = version.id
    byId('rename-version').value = version.title
    showExtraError('rename-form-error', '')
    openExtraDialog('rename-form', 'Переименовать версию')
}
byId('rename-form').addEventListener('submit', (event) => {
    event.preventDefault()
    const version = findVersion(editingVersionId)
    const title = byId('rename-version').value.trim()
    if (!version || !title) { showExtraError('rename-form-error', 'Введите название версии'); return }
    version.title = title
    saveExtended()
    byId('extended-dialog').close()
    renderVersions()
    if (openVersionId === version.id) renderVersionDetail()
})
function copyVersion(id) {
    const version = findVersion(id)
    if (!version) return
    const copy = structuredClone(version)
    copy.id = nextRecordId(extraData.versions)
    copy.title = version.title + ' (копия)'
    copy.createdAt = new Date().toISOString()
    copy.status = 'draft'
    extraData.versions.push(copy)
    saveExtended()
    renderVersions()
    renderDashboardVersionCards()
    showToast('Создан черновик №' + copy.id)
}
function publishVersion(id) {
    const version = findVersion(id)
    if (!version || version.status !== 'draft') return
    const conflicts = scheduleConflicts(version.placements)
    if (conflicts.length) {
        showToast('Публикация невозможна: жёстких конфликтов ' + conflicts.length)
        openVersion(id)
        return
    }
    askConfirmation('Опубликовать версию №' + id + '?',
        'Проверка ограничений пройдена. Предыдущая опубликованная версия будет перенесена в архив, а студенты и преподаватели получат новое расписание после подключения сервера.',
        'Опубликовать', () => {
            extraData.versions.forEach((item) => { if (item.status === 'published') item.status = 'archived' })
            version.status = 'published'
            saveExtended()
            renderVersions()
            if (openVersionId === version.id) renderVersionDetail()
            showToast('Опубликована демонстрационная версия №' + id + ' в локальном браузере')
        })
}
function deleteVersion(id) {
    const version = findVersion(id)
    if (!version || version.status !== 'draft') return
    askConfirmation('Удалить черновик №' + id + '?', 'Версию нельзя будет восстановить.', 'Удалить', () => {
        extraData.versions = extraData.versions.filter((item) => item.id !== id)
        comparisonIds = comparisonIds.filter((value) => value !== id)
        saveExtended()
        renderVersions()
        showToast('Черновик удалён')
    })
}
function renderVersions() {
    const body = byId('versions-table-body')
    body.replaceChildren()
    const filter = byId('versions-status').value
    extraData.versions.slice().reverse().filter((version) => filter === 'all' || version.status === filter).forEach((version) => {
        const tr = document.createElement('tr')
        const selected = document.createElement('td')
        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.className = 'version-select'
        checkbox.value = version.id
        checkbox.checked = comparisonIds.includes(version.id)
        checkbox.setAttribute('aria-label', 'Выбрать версию ' + version.id)
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                if (comparisonIds.length >= 2) { checkbox.checked = false; showToast('Для сравнения выберите ровно две версии'); return }
                comparisonIds.push(version.id)
            } else comparisonIds = comparisonIds.filter((id) => id !== version.id)
        })
        selected.append(checkbox)
        tr.append(selected)
        addCell(tr, version.id)
        const nameCell = addCell(tr, version.title, 'cell-main')
        nameCell.title = 'Двойной щелчок для переименования'
        nameCell.addEventListener('dblclick', () => changeVersionName(version))
        addCell(tr, dateTime(version.createdAt))
        addCell(tr, versionStatus(version.status))
        addCell(tr, 'Лимит ' + version.limit + ' с')
        addCell(tr, version.penalty)
        const conflictCount = scheduleConflicts(version.placements).length
        let conflictClass = ''
        if (conflictCount > 0) conflictClass = 'cell-invalid'
        addCell(tr, conflictCount, conflictClass)
        const controls = document.createElement('td')
        controls.className = 'version-actions'
        controls.append(createButton('Открыть', () => openVersion(version.id)))
        controls.append(createButton('Копия', () => copyVersion(version.id)))
        if (version.status === 'draft') {
            controls.append(createButton('Удалить', () => deleteVersion(version.id)))
            controls.append(createButton('Опубликовать', () => publishVersion(version.id)))
        }
        tr.append(controls)
        body.append(tr)
    })
    if (!body.children.length) showEmptyRow(body, 9)
}
function openVersion(id) {
    if (!findVersion(id)) return
    openVersionId = id
    window.location.hash = 'version-detail'
    showSection('version-detail')
    renderVersionDetail()
}
function formatPlacement(lesson) {
    return subjectName(lesson.subjectId) + ' · ' + (LESSON_TYPES[lesson.lessonType] || 'Занятие') + ' · ' +
        groupName(lesson.groupId) + ' · ауд. ' + roomName(lesson.roomId) + ' · ' + teacherName(lesson.teacherId)
}
function syncScheduleEntities() {
    const type = byId('schedule-view').value
    const previous = byId('schedule-entity').value
    let items = []
    if (type === 'group') items = data.groups
    if (type === 'teacher') items = data.users.filter((item) => item.role === 'teacher')
    if (type === 'classroom') items = data.classrooms.map((room) => ({ id: room.id, name: room.roomNumber }))
    if (type === 'all') items = [{ id: 'all', name: 'Все занятия' }]
    setOptions('schedule-entity', items, previous)
    if (!items.some((item) => String(item.id) === byId('schedule-entity').value) && items.length) {
        byId('schedule-entity').value = String(items[0].id)
    }
}
function filteredVersionPlacements(version) {
    const view = byId('schedule-view').value
    const entity = byId('schedule-entity').value
    const type = byId('schedule-type').value
    return version.placements.filter((lesson) => {
        if (type !== 'all' && lesson.lessonType !== type) return false
        if (view === 'group' && String(lesson.groupId) !== entity) return false
        if (view === 'teacher' && String(lesson.teacherId) !== entity) return false
        if (view === 'classroom' && String(lesson.roomId) !== entity) return false
        return true
    })
}
function renderScheduleTable(version) {
    const head = byId('schedule-head')
    const body = byId('schedule-body')
    head.replaceChildren()
    body.replaceChildren()
    const row = document.createElement('tr')
    const corner = document.createElement('th')
    corner.textContent = 'Пара'
    row.append(corner)
    WEEK_DAYS.forEach((day) => { const th = document.createElement('th'); th.textContent = day; row.append(th) })
    head.append(row)
    const placements = filteredVersionPlacements(version)
    for (let period = 1; period <= 7; period += 1) {
        const tr = document.createElement('tr')
        const label = document.createElement('th')
        label.className = 'schedule-period'
        label.textContent = period + ' пара'
        const time = document.createElement('span'); time.textContent = PERIOD_TIMES[period - 1]; label.append(time)
        tr.append(label)
        WEEK_DAYS.forEach((_, day) => {
            const td = document.createElement('td')
            td.className = 'schedule-slot'
            placements.filter((lesson) => lesson.day === day && lesson.period === period).forEach((lesson) => {
                const button = createButton(formatPlacement(lesson), () => openSlotEditor(lesson.id), 'schedule-lesson')
                button.disabled = version.status !== 'draft'
                if (version.status === 'draft') {
                    button.title = 'Изменить занятие'
                } else {
                    button.title = 'Редактирование доступно только для черновиков'
                }
                td.append(button)
            })
            tr.append(td)
        })
        body.append(tr)
    }
}
function renderVersionDetail() {
    const version = findVersion(openVersionId)
    if (!version) return
    byId('version-detail-heading').textContent = 'Версия №' + version.id + ' «' + version.title + '» · ' + versionStatus(version.status)
    byId('detail-publish').hidden = version.status !== 'draft'
    syncScheduleEntities()
    renderScheduleTable(version)
    const conflicts = scheduleConflicts(version.placements)
    byId('version-conflicts-title').textContent = 'Конфликты (' + conflicts.length + ')'
    const problems = byId('version-conflicts')
    problems.replaceChildren()
    if (!conflicts.length) { const p = document.createElement('p'); p.textContent = 'Нарушений жёстких ограничений нет'; problems.append(p) }
    conflicts.forEach((text) => { const p = document.createElement('p'); p.className = 'cell-invalid'; p.textContent = text; problems.append(p) })
    byId('version-quality').replaceChildren()
    const summary = ['Общий штраф: ' + version.penalty, 'Занятий: ' + version.placements.length, 'Конфликтов: ' + conflicts.length]
    summary.forEach((text) => { const p = document.createElement('p'); p.textContent = text; byId('version-quality').append(p) })
}
function openSlotEditor(slotId) {
    const version = findVersion(openVersionId)
    if (!version || version.status !== 'draft') return
    const index = version.placements.findIndex((item) => item.id === slotId)
    if (index === -1) return
    editingSlotIndex = index
    const lesson = version.placements[index]
    byId('slot-description').textContent = groupName(lesson.groupId) + ' · ' + subjectName(lesson.subjectId) + ' · ' + LESSON_TYPES[lesson.lessonType]
    setOptions('slot-day', WEEK_DAYS.map((name, id) => ({ id, name })), lesson.day)
    setOptions('slot-period', PERIOD_TIMES.map((time, i) => ({ id: i + 1, name: (i + 1) + ' пара, ' + time })), lesson.period)
    setOptions('slot-room', data.classrooms.filter((r) => r.active && r.capacity >= (getGroup(lesson.groupId)?.students || 9999))
        .map((room) => ({ id: room.id, name: room.roomNumber + ' · ' + room.capacity + ' мест' })), lesson.roomId)
    setOptions('slot-teacher', data.users.filter((u) => u.role === 'teacher' && teacherSubjectIds(u.id).includes(lesson.subjectId)), lesson.teacherId)
    showExtraError('slot-form-error', '')
    openExtraDialog('slot-form', 'Изменить занятие')
}
byId('slot-form').addEventListener('submit', (event) => {
    event.preventDefault()
    const version = findVersion(openVersionId)
    if (!version || version.status !== 'draft') return
    const original = version.placements[editingSlotIndex]
    if (!original) return
    const day = Number(byId('slot-day').value)
    const period = Number(byId('slot-period').value)
    const roomId = Number(byId('slot-room').value)
    const teacherId = Number(byId('slot-teacher').value)
    const room = getRoom(roomId)
    const group = getGroup(original.groupId)
    if (!Number.isInteger(day) || day < 0 || day > 5 || !Number.isInteger(period) || period < 1 || period > 7 ||
        !room || !room.active || !group || room.capacity < group.students || !teacherSubjectIds(teacherId).includes(original.subjectId)) {
        showExtraError('slot-form-error', 'Проверьте день, пару, аудиторию и преподавателя')
        return
    }
    version.placements[editingSlotIndex] = { ...original, day, period, roomId, teacherId }
    version.penalty = schedulePenalty(version.placements, version.weights)
    saveExtended()
    byId('extended-dialog').close()
    renderVersionDetail()
    showToast('Занятие изменено. Конфликты пересчитаны')
})
byId('schedule-view').addEventListener('change', () => { byId('schedule-entity').value = ''; renderVersionDetail() })
byId('schedule-entity').addEventListener('change', renderVersionDetail)
byId('schedule-type').addEventListener('change', renderVersionDetail)
byId('detail-copy').addEventListener('click', () => { if (openVersionId) copyVersion(openVersionId) })
byId('detail-publish').addEventListener('click', () => { if (openVersionId) publishVersion(openVersionId) })
function showVersionList() { window.location.hash = 'versions'; showSection('versions'); renderVersions() }
byId('back-to-versions').addEventListener('click', showVersionList)
byId('back-from-comparison').addEventListener('click', showVersionList)
byId('versions-status').addEventListener('change', renderVersions)
byId('compare-selected').addEventListener('click', () => {
    if (comparisonIds.length !== 2) { showToast('Выберите ровно две версии для сравнения'); return }
    const versionA = findVersion(comparisonIds[0])
    const versionB = findVersion(comparisonIds[1])
    if (!versionA || !versionB) return
    renderComparison(versionA, versionB)
    window.location.hash = 'comparison'
    showSection('comparison')
})
function renderComparison(a, b) {
    const summary = byId('comparison-summary')
    summary.replaceChildren()
    const table = document.createElement('table')
    table.className = 'admin-table comparison-summary'
    const rows = [
        ['Показатель', 'Версия A №' + a.id, 'Версия Б №' + b.id],
        ['Дата создания', dateTime(a.createdAt), dateTime(b.createdAt)],
        ['Параметры генерации', a.limit + ' с', b.limit + ' с'],
        ['Общий штраф', a.penalty, b.penalty],
        ['Конфликты', scheduleConflicts(a.placements).length, scheduleConflicts(b.placements).length]
    ]
    rows.forEach((values) => { const tr = document.createElement('tr'); values.forEach((value) => addCell(tr, value)); table.append(tr) })
    summary.append(table)
    const body = byId('comparison-body')
    body.replaceChildren()
    const lookup = (version) => {
        const occurrences = new Map()
        const result = new Map()
        version.placements.forEach((lesson) => {
            const count = occurrences.get(lesson.requirementId) || 0
            occurrences.set(lesson.requirementId, count + 1)
            result.set(lesson.requirementId + ':' + count, lesson)
        })
        return result
    }
    const left = lookup(a)
    const right = lookup(b)
    const keys = new Set([...left.keys(), ...right.keys()])
    let changes = 0
    keys.forEach((key) => {
        const lessonA = left.get(key)
        const lessonB = right.get(key)
        let slotA = '—'
        let slotB = '—'
        if (lessonA) slotA = WEEK_DAYS[lessonA.day] + ', ' + lessonA.period + ' пара · ауд. ' + roomName(lessonA.roomId)
        if (lessonB) slotB = WEEK_DAYS[lessonB.day] + ', ' + lessonB.period + ' пара · ауд. ' + roomName(lessonB.roomId)
        if (slotA === slotB && lessonA?.teacherId === lessonB?.teacherId) return
        changes += 1
        const lesson = lessonA || lessonB
        const tr = document.createElement('tr')
        addCell(tr, groupName(lesson.groupId))
        addCell(tr, subjectName(lesson.subjectId))
        addCell(tr, slotB)
        addCell(tr, slotA)
        body.append(tr)
    })
    if (!changes) showEmptyRow(body, 4)
}

function seedDemoVersion() {
    if (extraData.demoSeeded) return
    extraData.demoSeeded = true
    if (!extraData.versions.length) {
        try {
            const weights = Object.fromEntries(QUALITY_LABELS.map(([key]) => [key, 1]))
            const schedule = buildLocalDemoSchedule(weights)
            extraData.versions.push({ id: 1, title: 'Пример опубликованного расписания', createdAt: new Date().toISOString(),
                status: 'published', penalty: schedulePenalty(schedule, weights), limit: 120, weights, placements: schedule })
            const copy = structuredClone(extraData.versions[0])
            copy.id = 2
            copy.title = 'Пример черновика'
            copy.status = 'draft'
            extraData.versions.push(copy)
        } catch (error) {
        }
    }
    saveExtended()
}

function renderExtendedAdmin() {
    generationChecks = null
    renderTeachers()
    renderLessons()
    renderVersions()
    renderDashboardVersionCards()
    if (openVersionId) renderVersionDetail()
    const totalLessons = extraData.lessons.reduce((sum, lesson) => sum + lesson.weeklyCount, 0)
    const counts = byId('dashboard-stats').querySelectorAll('.stat-card__count')
    if (counts.length === 5) counts[4].textContent = String(totalLessons)
}
byId('teachers-search').addEventListener('input', renderTeachers)
byId('lessons-search').addEventListener('input', renderLessons)
byId('lessons-group-filter').addEventListener('change', renderLessons)
byId('lessons-teacher-filter').addEventListener('change', renderLessons)

