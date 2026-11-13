'use strict'

const STORAGE_KEY = 'mai-curriculum-admin-demo-v1'

const initialData = {
    groups: [
        { id: 1, name: 'ИВТ-101', students: 26, lessons: 23 },
        { id: 2, name: 'ИВТ-102', students: 28, lessons: 24 },
        { id: 3, name: 'ИВТ-103', students: 22, lessons: 21 },
        { id: 4, name: 'ИВТ-104', students: 25, lessons: 22 },
        { id: 5, name: 'ПМИ-201', students: 24, lessons: 20 },
        { id: 6, name: 'ПМИ-202', students: 27, lessons: 24 }
    ],
    users: [
        { id: 1, name: 'Петров Пётр Петрович', login: 'petrov', email: 'petrov@example.com', role: 'admin', groupId: null },
        { id: 2, name: 'Иванов Иван Иванович', login: 'ivanov', email: 'ivanov@example.com', role: 'teacher', groupId: null },
        { id: 3, name: 'Смирнова Анна Сергеевна', login: 'smirnova', email: 'smirnova@example.com', role: 'teacher', groupId: null },
        { id: 4, name: 'Кузнецов Дмитрий Олегович', login: 'kuznetsov', email: 'kuznetsov@example.com', role: 'teacher', groupId: null },
        { id: 5, name: 'Соколова Екатерина Игоревна', login: 'sokolova', email: 'sokolova@example.com', role: 'student', groupId: 1 },
        { id: 6, name: 'Орлов Максим Сергеевич', login: 'orlov', email: 'orlov@example.com', role: 'student', groupId: 1 },
        { id: 7, name: 'Михайлова Дарья Алексеевна', login: 'mikhailova', email: 'mikhailova@example.com', role: 'student', groupId: 2 },
        { id: 8, name: 'Фёдоров Алексей Андреевич', login: 'fedorov', email: 'fedorov@example.com', role: 'student', groupId: 3 }
    ],
    classrooms: [
        { id: 1, roomNumber: '101', capacity: 28, active: true },
        { id: 2, roomNumber: '118', capacity: 40, active: true },
        { id: 3, roomNumber: '210', capacity: 32, active: true },
        { id: 4, roomNumber: '301', capacity: 90, active: true },
        { id: 5, roomNumber: '404', capacity: 24, active: false },
        { id: 6, roomNumber: '405', capacity: 30, active: true },
        { id: 7, roomNumber: '410', capacity: 26, active: true },
        { id: 8, roomNumber: '501', capacity: 70, active: true }
    ],
    subjects: [
        { id: 1, name: 'Высшая математика', code: 'MATH-01' },
        { id: 2, name: 'Программирование', code: 'PROG-01' },
        { id: 3, name: 'Информатика', code: 'INFO-01' },
        { id: 4, name: 'Физика', code: 'PHYS-01' },
        { id: 5, name: 'Инженерная графика', code: 'ENG-01' },
        { id: 6, name: 'Алгоритмы', code: 'ALG-01' }
    ]
}

let data = loadData()

let editingType = ''
let editingId = null

let sortCapacityAscending = true
let sortStatusAscending = true
let classroomSortKey = ''

const dialog = document.getElementById('record-dialog')
const modalTitle = document.getElementById('modal-title')
const toast = document.getElementById('admin-toast')

const sectionNames = {
    dashboard: 'Панель управления',
    users: 'Пользователи',
    classrooms: 'Аудитории',
    subjects: 'Дисциплины',
    groups: 'Учебные группы',
    teachers: 'Преподаватели',
    lessons: 'Занятия',
    import: 'Импорт из CSV',
    generation: 'Генерация',
    versions: 'Версии расписания',
    'version-detail': 'Версия расписания',
    comparison: 'Сравнение версий'
}

function loadData() {
    try {
        const savedText = localStorage.getItem(STORAGE_KEY)

        if (savedText) {
            const saved = JSON.parse(savedText)

            if (Array.isArray(saved.users) && Array.isArray(saved.groups) &&
                Array.isArray(saved.classrooms) && Array.isArray(saved.subjects)) {
                return saved
            }
        }
    } catch (error) {
    }

    return JSON.parse(JSON.stringify(initialData))
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
        showToast('Изменения есть на странице, но браузер не разрешил их сохранить')
    }
}

function showSection(name) {
    if (!sectionNames[name]) {
        name = 'dashboard'
    }

    document.querySelectorAll('.admin-section').forEach((section) => {
        section.hidden = true
    })

    document.querySelectorAll('.admin-nav-link').forEach((button) => {
        const isSelected = button.dataset.section === name
        button.classList.toggle('is-current', isSelected)
        if (isSelected) {
            button.setAttribute('aria-current', 'page')
        } else {
            button.setAttribute('aria-current', 'false')
        }
    })

    const section = document.getElementById('section-' + name)

    if (section) {
        section.hidden = false
    } else {
        document.getElementById('section-upcoming').hidden = false
    }
}

document.querySelectorAll('[data-section]').forEach((button) => {
    button.addEventListener('click', () => {
        const name = button.dataset.section
        window.location.hash = name
        showSection(name)
    })
})

document.querySelectorAll('[data-section-target]').forEach((button) => {
    button.addEventListener('click', () => {
        const name = button.dataset.sectionTarget
        window.location.hash = name
        showSection(name)
    })
})

window.addEventListener('hashchange', () => {
    const name = window.location.hash.slice(1)
    showSection(name)
})

function renderDashboard() {
    const stats = [
        { name: 'Группы', count: data.groups.length },
        { name: 'Преподаватели', count: data.users.filter((user) => user.role === 'teacher').length },
        { name: 'Аудитории', count: data.classrooms.length },
        { name: 'Дисциплины', count: data.subjects.length },
        { name: 'Занятия', count: data.groups.reduce((sum, group) => sum + group.lessons, 0) }
    ]

    const wrapper = document.getElementById('dashboard-stats')
    wrapper.replaceChildren()

    stats.forEach((stat) => {
        const card = document.createElement('div')
        card.className = 'stat-card'

        const count = document.createElement('strong')
        count.className = 'stat-card__count'
        count.textContent = stat.count

        const name = document.createElement('span')
        name.className = 'stat-card__name'
        name.textContent = stat.name

        card.append(count, name)
        wrapper.append(card)
    })
}

function showEmptyRow(body, columnCount) {
    const row = document.createElement('tr')
    const cell = document.createElement('td')
    cell.colSpan = columnCount
    cell.className = 'empty-row'
    cell.textContent = 'По вашему запросу ничего не найдено'
    row.append(cell)
    body.append(row)
}

function addCell(row, text, className = '') {
    const cell = document.createElement('td')
    cell.textContent = String(text)

    if (className) {
        cell.className = className
    }

    row.append(cell)
    return cell
}

function addEditCell(row, type, id) {
    const cell = document.createElement('td')
    cell.className = 'cell-action'

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'admin-edit'
    button.textContent = 'Изменить'
    button.addEventListener('click', () => openForm(type, id))

    cell.append(button)
    row.append(cell)
}

function findGroupName(groupId) {
    const group = data.groups.find((item) => item.id === groupId)

    if (group) {
        return group.name
    }

    return '—'
}

function getRoleName(role) {
    if (role === 'admin') {
        return 'Администратор'
    }

    if (role === 'teacher') {
        return 'Преподаватель'
    }

    return 'Студент'
}

function renderUsers() {
    const search = document.getElementById('users-search').value.trim().toLowerCase()
    const role = document.getElementById('users-role').value
    const body = document.getElementById('users-table-body')
    body.replaceChildren()

    const found = data.users.filter((user) => {
        const text = (user.name + ' ' + user.login + ' ' + user.email).toLowerCase()
        const matchesText = text.includes(search)
        const matchesRole = role === 'all' || user.role === role
        return matchesText && matchesRole
    })

    found.forEach((user) => {
        const row = document.createElement('tr')
        addCell(row, user.name, 'cell-main')
        addCell(row, user.login)
        addCell(row, user.email)
        addCell(row, getRoleName(user.role))
        addCell(row, findGroupName(user.groupId), 'cell-muted')
        addEditCell(row, 'users', user.id)
        body.append(row)
    })

    if (found.length === 0) {
        showEmptyRow(body, 6)
    }
}

function renderClassrooms() {
    const search = document.getElementById('classrooms-search').value.trim().toLowerCase()
    const body = document.getElementById('classrooms-table-body')
    body.replaceChildren()

    const found = data.classrooms.filter((room) => room.roomNumber.toLowerCase().includes(search))

    if (classroomSortKey === 'capacity') {
        found.sort((first, second) => first.capacity - second.capacity)

        if (!sortCapacityAscending) {
            found.reverse()
        }
    }

    if (classroomSortKey === 'status') {
        found.sort((first, second) => Number(first.active) - Number(second.active))

        if (!sortStatusAscending) {
            found.reverse()
        }
    }

    found.forEach((room) => {
        const row = document.createElement('tr')
        addCell(row, room.roomNumber, 'cell-main')
        addCell(row, room.capacity)

        if (room.active) {
            addCell(row, 'Активна')
        } else {
            addCell(row, 'Неактивна', 'cell-muted')
        }

        addEditCell(row, 'classrooms', room.id)
        body.append(row)
    })

    if (found.length === 0) {
        showEmptyRow(body, 4)
    }
}

function renderSubjects() {
    const search = document.getElementById('subjects-search').value.trim().toLowerCase()
    const body = document.getElementById('subjects-table-body')
    body.replaceChildren()

    const found = data.subjects.filter((subject) => {
        return (subject.name + ' ' + subject.code).toLowerCase().includes(search)
    })

    found.forEach((subject) => {
        const row = document.createElement('tr')
        addCell(row, subject.name, 'cell-main')
        addCell(row, subject.code)
        addEditCell(row, 'subjects', subject.id)
        body.append(row)
    })

    if (found.length === 0) {
        showEmptyRow(body, 3)
    }
}

function renderGroups() {
    const search = document.getElementById('groups-search').value.trim().toLowerCase()
    const body = document.getElementById('groups-table-body')
    body.replaceChildren()

    const found = data.groups.filter((group) => group.name.toLowerCase().includes(search))

    found.forEach((group) => {
        const row = document.createElement('tr')
        addCell(row, group.name, 'cell-main')
        addCell(row, group.students)
        addCell(row, group.lessons)
        addEditCell(row, 'groups', group.id)
        body.append(row)
    })

    if (found.length === 0) {
        showEmptyRow(body, 4)
    }
}

function renderEverything() {
    renderDashboard()
    renderUsers()
    renderClassrooms()
    renderSubjects()
    renderGroups()

    if (typeof renderExtendedAdmin === 'function') {
        renderExtendedAdmin()
    }
}

document.getElementById('users-search').addEventListener('input', renderUsers)
document.getElementById('users-role').addEventListener('change', renderUsers)
document.getElementById('classrooms-search').addEventListener('input', renderClassrooms)
document.getElementById('subjects-search').addEventListener('input', renderSubjects)
document.getElementById('groups-search').addEventListener('input', renderGroups)

document.getElementById('sort-capacity').addEventListener('click', () => {
    if (classroomSortKey === 'capacity') {
        sortCapacityAscending = !sortCapacityAscending
    } else {
        classroomSortKey = 'capacity'
        sortCapacityAscending = true
    }

    renderClassrooms()
})

document.getElementById('sort-status').addEventListener('click', () => {
    if (classroomSortKey === 'status') {
        sortStatusAscending = !sortStatusAscending
    } else {
        classroomSortKey = 'status'
        sortStatusAscending = true
    }

    renderClassrooms()
})

function getRecords(type) {
    if (type === 'users') {
        return data.users
    }

    if (type === 'classrooms') {
        return data.classrooms
    }

    if (type === 'subjects') {
        return data.subjects
    }

    return data.groups
}

function getNextId(records) {
    let biggestId = 0

    records.forEach((record) => {
        if (record.id > biggestId) {
            biggestId = record.id
        }
    })

    return biggestId + 1
}

function fillGroupSelect() {
    const select = document.getElementById('user-group')
    select.replaceChildren()

    const empty = document.createElement('option')
    empty.value = ''
    empty.textContent = 'Выберите группу'
    select.append(empty)

    data.groups.forEach((group) => {
        const option = document.createElement('option')
        option.value = group.id
        option.textContent = group.name
        select.append(option)
    })
}

function updateUserGroupVisibility() {
    const selectedRole = document.querySelector('input[name="user-role"]:checked')
    const block = document.getElementById('user-group-block')

    if (selectedRole && selectedRole.value === 'student') {
        block.hidden = false
    } else {
        block.hidden = true
    }
}

document.querySelectorAll('input[name="user-role"]').forEach((radio) => {
    radio.addEventListener('change', updateUserGroupVisibility)
})

function openForm(type, id = null) {
    editingType = type
    editingId = id

    document.querySelectorAll('.record-form').forEach((form) => {
        form.hidden = true
        form.reset()
    })

    const form = document.getElementById('form-' + type)
    form.hidden = false

    form.querySelectorAll('.admin-input, .admin-select').forEach((field) => {
        field.classList.remove('is-invalid')
    })

    document.getElementById(type + '-form-error').hidden = true

    const names = {
        users: 'Новый пользователь',
        classrooms: 'Новая аудитория',
        subjects: 'Новая дисциплина',
        groups: 'Новая группа'
    }

    modalTitle.textContent = names[type]

    if (type === 'users') {
        fillGroupSelect()
        document.querySelector('input[name="user-role"][value="student"]').checked = true
        document.getElementById('user-password').required = true
        document.getElementById('user-password').closest('.admin-field').hidden = false
        document.getElementById('user-password').placeholder = 'Пароль для нового пользователя'
    }

    if (id !== null) {
        const record = getRecords(type).find((item) => item.id === id)

        if (!record) {
            return
        }

        const editNames = {
            users: 'Редактирование пользователя',
            classrooms: 'Редактирование аудитории',
            subjects: 'Редактирование дисциплины',
            groups: 'Редактирование группы'
        }
        modalTitle.textContent = editNames[type]
        fillFormFromRecord(type, record)
    }

    updateUserGroupVisibility()
    dialog.showModal()
    form.querySelector('.admin-input').focus()
}

function fillFormFromRecord(type, record) {
    if (type === 'users') {
        document.getElementById('user-name').value = record.name
        document.getElementById('user-login').value = record.login
        document.getElementById('user-email').value = record.email
        document.querySelector('input[name="user-role"][value="' + record.role + '"]').checked = true
        document.getElementById('user-password').required = false
        document.getElementById('user-password').closest('.admin-field').hidden = true

        if (record.groupId !== null) {
            document.getElementById('user-group').value = String(record.groupId)
        }
    }

    if (type === 'classrooms') {
        document.getElementById('classroom-number').value = record.roomNumber
        document.getElementById('classroom-capacity').value = record.capacity
        document.getElementById('classroom-active').checked = record.active
    }

    if (type === 'subjects') {
        document.getElementById('subject-name').value = record.name
        document.getElementById('subject-code').value = record.code
    }

    if (type === 'groups') {
        document.getElementById('group-name').value = record.name
        document.getElementById('group-students').value = record.students
    }
}

document.querySelectorAll('[data-create]').forEach((button) => {
    button.addEventListener('click', () => openForm(button.dataset.create))
})

document.getElementById('modal-close').addEventListener('click', () => dialog.close())

document.querySelectorAll('[data-cancel-dialog]').forEach((button) => {
    button.addEventListener('click', () => dialog.close())
})

dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
        dialog.close()
    }
})

function showFormError(type, message, fieldId) {
    const error = document.getElementById(type + '-form-error')
    error.textContent = message
    error.hidden = false

    if (fieldId) {
        const field = document.getElementById(fieldId)
        field.classList.add('is-invalid')
        field.focus()
    }
}

function saveRecord(type, record) {
    const records = getRecords(type)

    if (editingId === null) {
        record.id = getNextId(records)
        records.push(record)
    } else {
        const index = records.findIndex((item) => item.id === editingId)

        if (index !== -1) {
            record.id = editingId

            if (type === 'groups') {
                record.lessons = records[index].lessons
            }

            records[index] = record
        }
    }

    saveData()
    renderEverything()
    dialog.close()
    showToast('Изменения сохранены в демонстрационном списке')
}

function submitUser(event) {
    event.preventDefault()

    const name = document.getElementById('user-name').value.trim()
    const login = document.getElementById('user-login').value.trim()
    const email = document.getElementById('user-email').value.trim()
    const password = document.getElementById('user-password').value
    const role = document.querySelector('input[name="user-role"]:checked').value
    const groupValue = document.getElementById('user-group').value

    if (!name) {
        showFormError('users', 'Введите ФИО пользователя', 'user-name')
        return
    }

    if (!login) {
        showFormError('users', 'Введите логин пользователя', 'user-login')
        return
    }

    const duplicateLogin = data.users.some((user) => {
        return user.login.toLowerCase() === login.toLowerCase() && user.id !== editingId
    })

    if (duplicateLogin) {
        showFormError('users', 'Такой логин уже существует. Укажите другой', 'user-login')
        return
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
        showFormError('users', 'Введите корректный email', 'user-email')
        return
    }

    if (editingId === null && password.length < 6) {
        showFormError('users', 'Для нового пользователя нужен пароль от 6 символов', 'user-password')
        return
    }

    let groupId = null

    if (role === 'student') {
        if (!groupValue) {
            showFormError('users', 'Выберите учебную группу для студента', 'user-group')
            return
        }

        groupId = Number(groupValue)
    }

    saveRecord('users', { name: name, login: login, email: email, role: role, groupId: groupId })
}

function submitClassroom(event) {
    event.preventDefault()

    const roomNumber = document.getElementById('classroom-number').value.trim()
    const capacityText = document.getElementById('classroom-capacity').value
    const capacity = Number(capacityText)
    const active = document.getElementById('classroom-active').checked

    if (!roomNumber) {
        showFormError('classrooms', 'Введите номер аудитории', 'classroom-number')
        return
    }

    if (data.classrooms.some((room) => room.roomNumber.toLowerCase() === roomNumber.toLowerCase() && room.id !== editingId)) {
        showFormError('classrooms', 'Аудитория с таким номером уже есть', 'classroom-number')
        return
    }

    if (!capacityText || !Number.isInteger(capacity) || capacity <= 0) {
        showFormError('classrooms', 'Вместимость должна быть целым числом больше 0', 'classroom-capacity')
        return
    }

    saveRecord('classrooms', { roomNumber: roomNumber, capacity: capacity, active: active })
}

function submitSubject(event) {
    event.preventDefault()

    const name = document.getElementById('subject-name').value.trim()
    const code = document.getElementById('subject-code').value.trim()

    if (!name) {
        showFormError('subjects', 'Введите название дисциплины', 'subject-name')
        return
    }

    if (data.subjects.some((subject) => subject.name.toLowerCase() === name.toLowerCase() && subject.id !== editingId)) {
        showFormError('subjects', 'Дисциплина с таким названием уже есть', 'subject-name')
        return
    }

    if (!code) {
        showFormError('subjects', 'Введите внутренний код дисциплины', 'subject-code')
        return
    }

    if (data.subjects.some((subject) => subject.code.toLowerCase() === code.toLowerCase() && subject.id !== editingId)) {
        showFormError('subjects', 'Дисциплина с таким кодом уже есть', 'subject-code')
        return
    }

    saveRecord('subjects', { name: name, code: code })
}

function submitGroup(event) {
    event.preventDefault()

    const name = document.getElementById('group-name').value.trim()
    const studentsText = document.getElementById('group-students').value
    const students = Number(studentsText)

    if (!name) {
        showFormError('groups', 'Введите номер или название группы', 'group-name')
        return
    }

    if (data.groups.some((group) => group.name.toLowerCase() === name.toLowerCase() && group.id !== editingId)) {
        showFormError('groups', 'Группа с таким номером уже есть', 'group-name')
        return
    }

    if (!studentsText || !Number.isInteger(students) || students <= 0) {
        showFormError('groups', 'Количество студентов должно быть целым числом больше 0', 'group-students')
        return
    }

    saveRecord('groups', { name: name, students: students, lessons: 0 })
}

document.getElementById('form-users').addEventListener('submit', submitUser)
document.getElementById('form-classrooms').addEventListener('submit', submitClassroom)
document.getElementById('form-subjects').addEventListener('submit', submitSubject)
document.getElementById('form-groups').addEventListener('submit', submitGroup)

document.querySelectorAll('.record-form input, .record-form select').forEach((field) => {
    field.addEventListener('input', () => {
        field.classList.remove('is-invalid')
    })
})

let toastTimeout = null

function showToast(text) {
    toast.textContent = text
    toast.hidden = false

    if (toastTimeout !== null) {
        clearTimeout(toastTimeout)
    }

    toastTimeout = setTimeout(() => {
        toast.hidden = true
        toastTimeout = null
    }, 3200)
}

renderEverything()

showSection(window.location.hash.slice(1))
