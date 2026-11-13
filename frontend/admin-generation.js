function currentPriorities() {
    const weights = {}
    QUALITY_LABELS.forEach(([key]) => {
        const value = Number(byId('weight-' + key).value)
        if (Number.isFinite(value) && value >= 0) {
            weights[key] = value
        } else {
            weights[key] = 1
        }
    })
    return weights
}
function renderPriorities() {
    const wrapper = byId('quality-settings')
    wrapper.replaceChildren()
    QUALITY_LABELS.forEach(([key, title]) => {
        const label = document.createElement('label')
        label.className = 'quality-row'
        const text = document.createElement('span')
        text.textContent = title
        const input = document.createElement('input')
        input.className = 'admin-input'
        input.id = 'weight-' + key
        input.type = 'number'
        input.min = '0'
        input.max = '100'
        input.step = '1'
        input.value = String(extraData.priorities[key] ?? 1)
        label.append(text, input)
        wrapper.append(label)
    })
    byId('generation-limit').value = extraData.limit
}
function inspectGeneration() {
    const critical = []
    const warning = []
    if (!extraData.lessons.length) critical.push('Не добавлено ни одного учебного занятия')
    const roomList = data.classrooms.filter((room) => room.active && Number.isInteger(room.capacity) && room.capacity > 0)
    if (!roomList.length) critical.push('Нет доступных аудиторий')
    const groupTotals = new Map()
    const teacherTotals = new Map()
    extraData.lessons.forEach((lesson) => {
        const group = getGroup(lesson.groupId)
        const subject = getSubject(lesson.subjectId)
        const teacher = getTeacher(lesson.teacherId)
        if (!group || !subject || !teacher) {
            critical.push('Занятие №' + lesson.id + ': отсутствует группа, дисциплина или преподаватель')
            return
        }
        if (!teacherSubjectIds(teacher.id).includes(subject.id)) critical.push(teacher.name + ' не ведёт «' + subject.name + '»')
        if (!Number.isInteger(lesson.weeklyCount) || lesson.weeklyCount < 1 || lesson.weeklyCount > 42) {
            critical.push('Неверная недельная нагрузка в занятии №' + lesson.id)
        }
        groupTotals.set(group.id, (groupTotals.get(group.id) || 0) + lesson.weeklyCount)
        teacherTotals.set(teacher.id, (teacherTotals.get(teacher.id) || 0) + lesson.weeklyCount)
        if (!roomList.some((room) => room.capacity >= group.students)) critical.push('Не хватает аудитории для группы ' + group.name + ' (' + group.students + ' чел.)')
    })
    groupTotals.forEach((total, id) => {
        if (total > 42) critical.push('Группе ' + groupName(id) + ' требуется более 42 занятий в неделю')
        if (total > 30) warning.push('Высокая недельная нагрузка у группы ' + groupName(id) + ': ' + total + ' занятий')
    })
    teacherTotals.forEach((total, id) => {
        if (total > 42) critical.push('Преподаватель ' + teacherName(id) + ' должен провести более 42 занятий')
    })
    if (roomList.length === 1 && extraData.lessons.length > 5) warning.push('Доступна только одна аудитория — возможны трудности с построением расписания')
    return { critical: [...new Set(critical)], warning: [...new Set(warning)] }
}
let generationChecks = null
function checkGeneration() {
    generationChecks = inspectGeneration()
    byId('critical-count').textContent = generationChecks.critical.length
    byId('warning-count').textContent = generationChecks.warning.length
    byId('check-time').textContent = 'Проверено ' + dateTime(new Date().toISOString())
    const wrapper = byId('generation-issues')
    wrapper.replaceChildren()
    generationChecks.critical.forEach((message) => {
        const p = document.createElement('p'); p.className = 'issue issue--critical'; p.textContent = message; wrapper.append(p)
    })
    generationChecks.warning.forEach((message) => {
        const p = document.createElement('p'); p.className = 'issue issue--warning'; p.textContent = message; wrapper.append(p)
    })
    if (!generationChecks.critical.length && !generationChecks.warning.length) {
        const p = document.createElement('p'); p.className = 'issue issue--success'; p.textContent = 'Предварительная проверка пройдена'; wrapper.append(p)
    }
    byId('start-generation').disabled = generationChecks.critical.length > 0 || Boolean(activeGeneration && activeGeneration.status === 'running')
    return generationChecks
}
byId('check-generation').addEventListener('click', checkGeneration)
function scheduleConflicts(placements) {
    const conflicts = []
    for (let i = 0; i < placements.length; i += 1) {
        const current = placements[i]
        const group = getGroup(current.groupId)
        const teacher = getTeacher(current.teacherId)
        const room = getRoom(current.roomId)
        if (!group || !teacher || !room || !room.active || group.students > room.capacity) {
            conflicts.push('У занятия ' + subjectName(current.subjectId) + ' некорректная аудитория или участник')
        }
        if (!teacherSubjectIds(current.teacherId).includes(current.subjectId)) {
            conflicts.push(teacherName(current.teacherId) + ' не ведёт ' + subjectName(current.subjectId))
        }
        for (let j = i + 1; j < placements.length; j += 1) {
            const other = placements[j]
            if (current.day !== other.day || current.period !== other.period) continue
            if (current.groupId === other.groupId) conflicts.push('Группа ' + groupName(current.groupId) + ' занята дважды: ' + WEEK_DAYS[current.day] + ', ' + current.period + ' пара')
            if (current.teacherId === other.teacherId) conflicts.push('Преподаватель ' + teacherName(current.teacherId) + ' занят дважды: ' + WEEK_DAYS[current.day] + ', ' + current.period + ' пара')
            if (current.roomId === other.roomId) conflicts.push('Аудитория ' + roomName(current.roomId) + ' занята дважды: ' + WEEK_DAYS[current.day] + ', ' + current.period + ' пара')
        }
    }
    return [...new Set(conflicts)]
}
function schedulePenalty(placements, weights) {
    let score = 0
    const groups = new Map()
    const teachers = new Map()
    placements.forEach((p) => {
        if (p.period === 1) score += weights.early
        if (p.period >= 6) score += weights.late * (p.period - 4)
        const room = getRoom(p.roomId)
        const group = getGroup(p.groupId)
        if (room && group && room.capacity > group.students * 2) score += weights.oversizedRoom
        const groupKey = p.groupId + ':' + p.day
        const teacherKey = p.teacherId + ':' + p.day
        if (!groups.has(groupKey)) groups.set(groupKey, [])
        if (!teachers.has(teacherKey)) teachers.set(teacherKey, [])
        groups.get(groupKey).push(p.period)
        teachers.get(teacherKey).push(p.period)
    })
    groups.forEach((periods) => {
        const sorted = [...periods].sort((a, b) => a - b)
        score += (sorted[sorted.length - 1] - sorted[0] + 1 - sorted.length) * weights.groupGaps
        if (sorted.length === 1) score += weights.fewGroup
        if (sorted.length > 5) score += (sorted.length - 5) * weights.manyGroup
    })
    teachers.forEach((periods) => {
        const sorted = [...periods].sort((a, b) => a - b)
        score += (sorted[sorted.length - 1] - sorted[0] + 1 - sorted.length) * weights.teacherGaps
        if (sorted.length === 1) score += weights.fewTeacher
        if (sorted.length > 5) score += (sorted.length - 5) * weights.manyTeacher
    })
    return Math.round(score)
}
// Локальный алгоритм демонстрирует интерфейс и не заменяет Python Scheduler
function buildLocalDemoSchedule(weights) {
    const placements = []
    const requirements = [...extraData.lessons].sort((a, b) => b.weeklyCount - a.weeklyCount)
    const rooms = data.classrooms.filter((room) => room.active).sort((a, b) => a.capacity - b.capacity)
    let sequence = 1
    for (const lesson of requirements) {
        const group = getGroup(lesson.groupId)
        if (!group) throw new Error('Группа для занятия не найдена')
        for (let occurrence = 0; occurrence < lesson.weeklyCount; occurrence += 1) {
            const candidates = []
            for (let day = 0; day < 6; day += 1) {
                for (let period = 1; period <= 7; period += 1) {
                    const used = placements.filter((p) => p.day === day && p.period === period)
                    if (used.some((p) => p.groupId === lesson.groupId || p.teacherId === lesson.teacherId)) continue
                    for (const room of rooms) {
                        if (room.capacity < group.students || used.some((p) => p.roomId === room.id)) continue
                        const sameSubjectToday = placements.some((p) => p.groupId === lesson.groupId && p.subjectId === lesson.subjectId && p.day === day)
                        const groupLoad = placements.filter((p) => p.groupId === lesson.groupId && p.day === day).length
                        const teacherLoad = placements.filter((p) => p.teacherId === lesson.teacherId && p.day === day).length
                        let score = groupLoad * 3 + teacherLoad * 2 + (room.capacity - group.students) / 100
                        if (sameSubjectToday) score += 15
                        if (period === 1) score += weights.early
                        if (period >= 6) score += weights.late * 2
                        if (day === 5) score += 2
                        candidates.push({ day, period, roomId: room.id, score })
                    }
                }
            }
            candidates.sort((a, b) => a.score - b.score || a.day - b.day || a.period - b.period)
            if (!candidates.length) throw new Error('Не удалось найти свободный слот для ' + group.name + ' — ' + subjectName(lesson.subjectId))
            const target = candidates[0]
            placements.push({ id: sequence, requirementId: lesson.id, groupId: lesson.groupId,
                subjectId: lesson.subjectId, teacherId: lesson.teacherId, lessonType: lesson.lessonType,
                day: target.day, period: target.period, roomId: target.roomId })
            sequence += 1
        }
    }
    return placements
}
function addGenerationLog(message) {
    const row = document.createElement('tr')
    addCell(row, new Date().toLocaleTimeString('ru-RU'))
    addCell(row, message)
    byId('generation-log').append(row)
}
function clockText(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
    const secs = String(Math.floor(seconds % 60)).padStart(2, '0')
    return mins + ':' + secs
}
function updateGenerationDisplay() {
    if (!activeGeneration) return
    const job = activeGeneration
    byId('generation-status').textContent = 'Статус: ' + ({ running: 'Выполняется', done: 'Завершено', failed: 'Не удалось построить расписание', cancelled: 'Отменено' }[job.status] || job.status)
    let percentage = 0
    if (job.total > 0) percentage = Math.round(job.placed / job.total * 100)
    byId('generation-progress').value = percentage
    byId('generation-progress-text').textContent = percentage + ' % · ' + job.placed + ' из ' + job.total + ' занятий'
    byId('generation-iterations').textContent = String(job.iterations)
    if (job.placed > 0) {
        byId('generation-penalty').textContent = String(job.penalty)
    } else {
        byId('generation-penalty').textContent = '—'
    }
    byId('generation-time').textContent = clockText((Date.now() - job.startedAt) / 1000) + ' из ' + clockText(job.limit)
    byId('cancel-generation').hidden = job.status !== 'running'
    byId('restart-generation').hidden = job.status === 'running'
    byId('open-generated-version').hidden = job.status !== 'done'
    if (job.status === 'running') byId('generation-caption').textContent = 'Можно закрыть вкладку раздела, но не браузер: демонстрационный расчёт выполняется локально'
    if (job.status === 'failed') byId('generation-caption').textContent = job.error
    if (job.status === 'cancelled') byId('generation-caption').textContent = 'Новая версия не создана'
    if (job.status === 'done') byId('generation-caption').textContent = 'Создана черновая версия №' + job.versionId
}
function finishGeneration(status, error = '') {
    if (!activeGeneration || activeGeneration.status !== 'running') return
    clearInterval(generationTimer)
    generationTimer = null
    activeGeneration.status = status
    activeGeneration.error = error
    if (status === 'done') {
        const placements = activeGeneration.schedule
        const version = { id: nextRecordId(extraData.versions), title: 'Генерация от ' + dateTime(new Date().toISOString()),
            createdAt: new Date().toISOString(), status: 'draft', penalty: schedulePenalty(placements, activeGeneration.weights),
            limit: activeGeneration.limit, weights: activeGeneration.weights, placements }
        extraData.versions.push(version)
        activeGeneration.versionId = version.id
        saveExtended()
        addGenerationLog('Генерация завершена: создана черновая версия №' + version.id)
    }
    if (status === 'failed') addGenerationLog('Ошибка: ' + error)
    if (status === 'cancelled') addGenerationLog('Генерация отменена')
    updateGenerationDisplay()
    checkGeneration()
    renderVersions()
}
function startGeneration() {
    const checks = checkGeneration()
    if (checks.critical.length) { showToast('Исправьте критические ошибки перед запуском'); return }
    const limit = Number(byId('generation-limit').value)
    if (!Number.isInteger(limit) || limit < 1 || limit > 600) { showToast('Лимит времени должен быть от 1 до 600 секунд'); return }
    const weights = currentPriorities()
    for (const [key] of QUALITY_LABELS) {
        const input = byId('weight-' + key)
        if (!Number.isInteger(Number(input.value)) || Number(input.value) < 0 || Number(input.value) > 100) {
            showToast('Веса качества должны быть целыми числами от 0 до 100')
            input.focus()
            return
        }
    }
    if (byId('save-priorities').checked) { extraData.priorities = weights; extraData.limit = limit; saveExtended() }
    const total = extraData.lessons.reduce((sum, lesson) => sum + lesson.weeklyCount, 0)
    activeGeneration = { id: 'demo-' + Date.now(), startedAt: Date.now(), status: 'running', placed: 0,
        total, iterations: 0, penalty: 0, weights, limit, schedule: [], versionId: null, error: '' }
    byId('generation-settings').hidden = true
    byId('generation-result').hidden = false
    byId('generation-log-panel').hidden = false
    byId('generation-log').replaceChildren()
    addGenerationLog('Задача поставлена в очередь локальной демонстрации')
    addGenerationLog('Генерация запущена')
    try {
        activeGeneration.schedule = buildLocalDemoSchedule(weights)
    } catch (error) {
        finishGeneration('failed', error.message)
        return
    }
    const work = activeGeneration.schedule
    generationTimer = window.setInterval(() => {
        if (!activeGeneration || activeGeneration.status !== 'running') return
        const elapsed = (Date.now() - activeGeneration.startedAt) / 1000
        if (elapsed >= activeGeneration.limit) { finishGeneration('failed', 'Превышен лимит времени'); return }
        activeGeneration.placed = Math.min(activeGeneration.placed + 1, work.length)
        activeGeneration.iterations += 4
        const partial = work.slice(0, activeGeneration.placed)
        activeGeneration.penalty = schedulePenalty(partial, activeGeneration.weights)
        if (activeGeneration.placed % 5 === 0 || activeGeneration.placed === work.length) {
            addGenerationLog('Поставлено ' + activeGeneration.placed + ' занятий; текущий штраф ' + activeGeneration.penalty)
        }
        updateGenerationDisplay()
        if (activeGeneration.placed === work.length) finishGeneration('done')
    }, 170)
    updateGenerationDisplay()
}
byId('start-generation').addEventListener('click', startGeneration)
byId('restart-generation').addEventListener('click', () => {
    byId('generation-result').hidden = true
    byId('generation-settings').hidden = false
    byId('generation-log-panel').hidden = true
    activeGeneration = null
    checkGeneration()
})
byId('open-generated-version').addEventListener('click', () => {
    if (activeGeneration && activeGeneration.versionId) openVersion(activeGeneration.versionId)
})
byId('cancel-generation').addEventListener('click', () => {
    if (!activeGeneration || activeGeneration.status !== 'running') return
    askConfirmation('Отменить генерацию?', 'Расчёт будет остановлен. Новая версия расписания не создастся.', 'Да, отменить', () => finishGeneration('cancelled'))
})

