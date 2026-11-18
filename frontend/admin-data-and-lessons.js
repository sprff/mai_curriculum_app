'use strict'

const EXTENDED_STORAGE_KEY = 'mai-curriculum-admin-extended-v1'
const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const PERIOD_TIMES = ['09:00–10:30', '10:45–12:15', '13:00–14:30', '14:45–16:15', '16:30–18:00', '18:15–19:45', '20:00–21:30']
const LESSON_TYPES = { lecture: 'Лекция', practice: 'Практика', lab: 'Лаб. работа' }
const QUALITY_LABELS = [
    ['groupGaps', 'Окна у групп'], ['teacherGaps', 'Окна у преподавателей'],
    ['fewGroup', 'Мало пар у группы за день'], ['manyGroup', 'Много пар у группы за день'],
    ['fewTeacher', 'Мало пар у преподавателя за день'], ['manyTeacher', 'Много пар у преподавателя за день'],
    ['unevenGroup', 'Неравномерность нагрузки групп'], ['unevenTeacher', 'Неравномерность нагрузки преподавателей'],
    ['early', 'Ранние пары'], ['late', 'Поздние пары'],
    ['teacherPreference', 'Предпочтения преподавателей'], ['oversizedRoom', 'Слишком большая аудитория']
]
const CSV_DEFINITIONS = {
    classrooms: ['roomNumber', 'capacity', 'active'],
    groups: ['name', 'students'],
    subjects: ['name', 'code'],
    teachers: ['name', 'login', 'email', 'subjectCodes'],
    lessons: ['group', 'subject', 'teacher', 'lessonType', 'weeklyCount']
}

function byId(id) { return document.getElementById(id) }
function getSubject(id) { return data.subjects.find((item) => item.id === Number(id)) }
function getGroup(id) { return data.groups.find((item) => item.id === Number(id)) }
function getTeacher(id) { return data.users.find((item) => item.id === Number(id) && item.role === 'teacher') }
function getRoom(id) { return data.classrooms.find((item) => item.id === Number(id)) }
function teacherName(id) {
    const user = getTeacher(id)
    if (user) return user.name
    return 'Преподаватель удалён'
}
function subjectName(id) {
    const subject = getSubject(id)
    if (subject) return subject.name
    return 'Дисциплина удалена'
}
function groupName(id) {
    const group = getGroup(id)
    if (group) return group.name
    return 'Группа удалена'
}
function roomName(id) {
    const room = getRoom(id)
    if (room) return room.roomNumber
    return 'Аудитория удалена'
}
function dateTime(value) { return new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) }
function nextRecordId(items) { return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1 }
function createButton(text, handler, className = 'admin-edit') {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = className
    button.textContent = text
    button.addEventListener('click', handler)
    return button
}
function makeOption(value, label) {
    const option = document.createElement('option')
    option.value = String(value)
    option.textContent = label
    return option
}
function setOptions(id, items, selectedValue, emptyText = '') {
    const select = byId(id)
    select.replaceChildren()
    if (emptyText) select.append(makeOption('', emptyText))
    items.forEach((item) => select.append(makeOption(item.id, item.name)))
    if (selectedValue !== undefined && selectedValue !== null) select.value = String(selectedValue)
}
function showExtraError(id, text) {
    const element = byId(id)
    element.textContent = text
    element.hidden = !text
}
function loadExtended() {
    const defaults = {
        teacherSubjects: { 2: [1, 2, 3], 3: [4, 5], 4: [2, 6] },
        lessons: [
            { id: 1, groupId: 1, subjectId: 1, teacherId: 2, lessonType: 'lecture', weeklyCount: 3 },
            { id: 2, groupId: 1, subjectId: 2, teacherId: 4, lessonType: 'practice', weeklyCount: 2 },
            { id: 3, groupId: 1, subjectId: 4, teacherId: 3, lessonType: 'lab', weeklyCount: 2 },
            { id: 4, groupId: 2, subjectId: 1, teacherId: 2, lessonType: 'lecture', weeklyCount: 3 },
            { id: 5, groupId: 2, subjectId: 5, teacherId: 3, lessonType: 'practice', weeklyCount: 2 },
            { id: 6, groupId: 3, subjectId: 3, teacherId: 2, lessonType: 'practice', weeklyCount: 2 },
            { id: 7, groupId: 3, subjectId: 6, teacherId: 4, lessonType: 'lecture', weeklyCount: 2 },
            { id: 8, groupId: 4, subjectId: 2, teacherId: 4, lessonType: 'lab', weeklyCount: 2 },
            { id: 9, groupId: 5, subjectId: 5, teacherId: 3, lessonType: 'lecture', weeklyCount: 2 },
            { id: 10, groupId: 6, subjectId: 1, teacherId: 2, lessonType: 'practice', weeklyCount: 2 }
        ],
        versions: [],
        priorities: {},
        limit: 120
    }
    try {
        const raw = localStorage.getItem(EXTENDED_STORAGE_KEY)
        if (!raw) return defaults
        const saved = JSON.parse(raw)
        if (!saved || !Array.isArray(saved.lessons) || !Array.isArray(saved.versions) ||
            typeof saved.teacherSubjects !== 'object' || saved.teacherSubjects === null) return defaults
        return { ...defaults, ...saved }
    } catch (error) {
        return defaults
    }
}
let extraData = loadExtended()
let editingTeacherId = null
let pendingTeacherSubjectIds = []
let editingLessonId = null
let editingVersionId = null
let editingSlotIndex = null
let openVersionId = null
let comparisonIds = []
let pendingImport = null
let activeGeneration = null
let generationTimer = null
let confirmAction = null

function saveExtended() {
    try {
        localStorage.setItem(EXTENDED_STORAGE_KEY, JSON.stringify(extraData))
    } catch (error) {
        showToast('Недостаточно места в хранилище браузера для сохранения изменений')
    }
}
function teacherSubjectIds(teacherId) {
    const ids = extraData.teacherSubjects[teacherId]
    if (!Array.isArray(ids)) return []
    return ids.filter((id) => getSubject(id))
}
function renderTeachers() {
    const search = byId('teachers-search').value.trim().toLowerCase()
    const body = byId('teachers-table-body')
    body.replaceChildren()
    const teachers = data.users.filter((user) => user.role === 'teacher' &&
        (user.name + ' ' + teacherSubjectIds(user.id).map(subjectName).join(' ')).toLowerCase().includes(search))
    teachers.forEach((teacher) => {
        const row = document.createElement('tr')
        addCell(row, teacher.name, 'cell-main')
        addCell(row, teacherSubjectIds(teacher.id).map(subjectName).join(', ') || 'Не назначены')
        addCell(row, teacher.login)
        const cell = document.createElement('td')
        cell.append(createButton('Изменить', () => openTeacherForm(teacher.id)))
        row.append(cell)
        body.append(row)
    })
    if (!teachers.length) showEmptyRow(body, 4)
}
function openExtraDialog(formId, title) {
    const dialog = byId('extended-dialog')
    dialog.querySelectorAll('.record-form').forEach((form) => { form.hidden = true })
    byId(formId).hidden = false
    byId('extended-dialog-title').textContent = title
    dialog.showModal()
}
function renderTeacherChips() {
    const chips = byId('teacher-subject-chips')
    chips.replaceChildren()
    pendingTeacherSubjectIds.forEach((id) => {
        const chip = document.createElement('span')
        chip.className = 'subject-chip'
        chip.append(document.createTextNode(subjectName(id)))
        chip.append(createButton('×', () => {
            pendingTeacherSubjectIds = pendingTeacherSubjectIds.filter((subjectId) => subjectId !== id)
            renderTeacherChips()
        }, 'chip-remove'))
        chips.append(chip)
    })
}
function openTeacherForm(id) {
    const teacher = getTeacher(id)
    if (!teacher) return
    editingTeacherId = id
    pendingTeacherSubjectIds = [...teacherSubjectIds(id)]
    byId('teacher-name-line').textContent = 'ФИО: ' + teacher.name
    byId('teacher-login-line').textContent = 'Учётная запись: ' + teacher.login
    setOptions('teacher-subject-select', data.subjects, '', 'Выберите дисциплину')
    showExtraError('teacher-form-error', '')
    renderTeacherChips()
    openExtraDialog('teacher-form', 'Изменить преподавателя')
}
byId('teacher-subject-select').addEventListener('change', (event) => {
    const id = Number(event.target.value)
    if (!Number.isInteger(id) || !getSubject(id)) return
    if (!pendingTeacherSubjectIds.includes(id)) pendingTeacherSubjectIds.push(id)
    event.target.value = ''
    renderTeacherChips()
})
byId('teacher-form').addEventListener('submit', (event) => {
    event.preventDefault()
    extraData.teacherSubjects[editingTeacherId] = [...pendingTeacherSubjectIds]
    saveExtended()
    byId('extended-dialog').close()
    renderTeachers()
    renderLessons()
    showToast('Дисциплины преподавателя сохранены')
})

function syncLessonFilters() {
    const previousGroup = byId('lessons-group-filter').value
    const previousTeacher = byId('lessons-teacher-filter').value
    setOptions('lessons-group-filter', [{ id: 'all', name: 'Группа: все' }, ...data.groups], previousGroup)
    setOptions('lessons-teacher-filter', [{ id: 'all', name: 'Преподаватель: все' }, ...data.users.filter((user) => user.role === 'teacher')], previousTeacher)
}
function renderLessons() {
    syncLessonFilters()
    const query = byId('lessons-search').value.trim().toLowerCase()
    const group = byId('lessons-group-filter').value
    const teacher = byId('lessons-teacher-filter').value
    const body = byId('lessons-table-body')
    body.replaceChildren()
    const lessons = extraData.lessons.filter((lesson) => {
        const searchText = (groupName(lesson.groupId) + ' ' + subjectName(lesson.subjectId) + ' ' + teacherName(lesson.teacherId)).toLowerCase()
        return searchText.includes(query) && (group === 'all' || String(lesson.groupId) === group) &&
            (teacher === 'all' || String(lesson.teacherId) === teacher)
    })
    lessons.forEach((lesson) => {
        const row = document.createElement('tr')
        addCell(row, groupName(lesson.groupId))
        addCell(row, subjectName(lesson.subjectId), 'cell-main')
        addCell(row, teacherName(lesson.teacherId))
        addCell(row, LESSON_TYPES[lesson.lessonType] || '—')
        addCell(row, lesson.weeklyCount)
        const cell = document.createElement('td')
        cell.append(createButton('Изменить', () => openLessonForm(lesson.id)))
        row.append(cell)
        body.append(row)
    })
    if (!lessons.length) showEmptyRow(body, 6)
}
function updateEligibleTeachers(selectedId) {
    const subjectId = Number(byId('lesson-subject').value)
    const eligible = data.users.filter((user) => user.role === 'teacher' && teacherSubjectIds(user.id).includes(subjectId))
    setOptions('lesson-teacher', eligible, selectedId, 'Выберите преподавателя')
    if (eligible.length) {
        showExtraError('lesson-teacher-warning', '')
    } else {
        showExtraError('lesson-teacher-warning', 'Нет преподавателей, закреплённых за этой дисциплиной')
    }
}
function openLessonForm(id = null) {
    editingLessonId = id
    const lesson = extraData.lessons.find((item) => item.id === id)
    let groupId = null
    let subjectId = null
    let teacherId = null
    if (lesson) {
        groupId = lesson.groupId
        subjectId = lesson.subjectId
        teacherId = lesson.teacherId
    }
    setOptions('lesson-group', data.groups, groupId, 'Выберите группу')
    setOptions('lesson-subject', data.subjects, subjectId, 'Выберите дисциплину')
    if (!lesson && data.subjects.length) byId('lesson-subject').value = String(data.subjects[0].id)
    updateEligibleTeachers(teacherId)
    if (lesson) {
        byId('lesson-weekly').value = lesson.weeklyCount
        const selected = document.querySelector('input[name="lesson-type"][value="' + lesson.lessonType + '"]')
        if (selected) selected.checked = true
    } else {
        byId('lesson-weekly').value = 2
        document.querySelector('input[name="lesson-type"][value="practice"]').checked = true
    }
    showExtraError('lesson-form-error', '')
    if (lesson) {
        openExtraDialog('lesson-form', 'Изменить занятие')
    } else {
        openExtraDialog('lesson-form', 'Новое занятие')
    }
}
byId('lesson-subject').addEventListener('change', () => updateEligibleTeachers(null))
byId('create-lesson').addEventListener('click', () => openLessonForm())
byId('lesson-form').addEventListener('submit', (event) => {
    event.preventDefault()
    const groupId = Number(byId('lesson-group').value)
    const subjectId = Number(byId('lesson-subject').value)
    const teacherId = Number(byId('lesson-teacher').value)
    const count = Number(byId('lesson-weekly').value)
    const checkedType = document.querySelector('input[name="lesson-type"]:checked')
    if (!getGroup(groupId) || !getSubject(subjectId) || !getTeacher(teacherId) || !checkedType) {
        showExtraError('lesson-form-error', 'Заполните все поля и выберите преподавателя')
        return
    }
    if (!teacherSubjectIds(teacherId).includes(subjectId)) {
        showExtraError('lesson-form-error', 'Этот преподаватель не ведёт выбранную дисциплину')
        return
    }
    if (!Number.isInteger(count) || count < 1 || count > 42) {
        showExtraError('lesson-form-error', 'Количество занятий должно быть целым числом от 1 до 42')
        return
    }
    const duplicate = extraData.lessons.find((item) => item.id !== editingLessonId && item.groupId === groupId &&
        item.subjectId === subjectId && item.teacherId === teacherId && item.lessonType === checkedType.value)
    if (duplicate) {
        showExtraError('lesson-form-error', 'Такое сочетание группы, дисциплины, преподавателя и типа уже есть')
        return
    }
    const record = { id: editingLessonId || nextRecordId(extraData.lessons), groupId, subjectId, teacherId,
        lessonType: checkedType.value, weeklyCount: count }
    if (editingLessonId === null) extraData.lessons.push(record)
    else {
        const index = extraData.lessons.findIndex((item) => item.id === editingLessonId)
        if (index < 0) { showExtraError('lesson-form-error', 'Занятие не найдено'); return }
        extraData.lessons[index] = record
    }
    saveExtended()
    byId('extended-dialog').close()
    renderExtendedAdmin()
    showToast('Занятие сохранено')
})

