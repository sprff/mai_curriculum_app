'use strict'

// Этот файл отвечает за переключение вкладок и работу форм администратора
// Пока сервер не подключён, данные хранятся только внутри браузера

// Ключ нужен браузеру, чтобы отличать данные нашего проекта от других сайтов
const STORAGE_KEY = 'mai-curriculum-admin-demo-v1'

// Демонстрационные записи помогают проверить интерфейс до подключения БД
// Пароли здесь не храним даже в демонстрационном режиме
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

// Загружаем сохранённые записи или используем примеры выше
let data = loadData()

// Здесь запоминаем форму, которую открыли, и запись для редактирования
let editingType = ''
let editingId = null

// Параметры сортировки списка аудиторий
let sortCapacityAscending = true
let sortStatusAscending = true
let classroomSortKey = ''

// По id получаем элементы, с которыми часто работает JavaScript
const dialog = document.getElementById('record-dialog')
const modalTitle = document.getElementById('modal-title')
const toast = document.getElementById('admin-toast')

// Соответствие технических названий разделов их русским заголовкам
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
    versions: 'Версии расписания'
}

// Если в браузере есть прошлые изменения, возвращаем их из localStorage
function loadData() {
    try {
        const savedText = localStorage.getItem(STORAGE_KEY)

        if (savedText) {
            const saved = JSON.parse(savedText)

            // Проверяем основные поля перед использованием старых данных
            if (Array.isArray(saved.users) && Array.isArray(saved.groups) &&
                Array.isArray(saved.classrooms) && Array.isArray(saved.subjects)) {
                return saved
            }
        }
    } catch (error) {
        // Если хранилище недоступно, всё равно показываем демонстрационную страницу
    }

    return JSON.parse(JSON.stringify(initialData))
}

// Записываем данные обратно в браузер после создания или изменения записи
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
        showToast('Изменения есть на странице, но браузер не разрешил их сохранить')
    }
}

// Показываем выбранную вкладку и выделяем её кнопку в меню
function showSection(name) {
    // Неизвестное название заменяем панелью управления
    if (!sectionNames[name]) {
        name = 'dashboard'
    }

    // Скрываем разделы, которые сейчас не нужны
    document.querySelectorAll('.admin-section').forEach((section) => {
        section.hidden = true
    })

    // Синее выделение оставляем только у активной кнопки меню
    document.querySelectorAll('.admin-nav-link').forEach((button) => {
        const isSelected = button.dataset.section === name
        button.classList.toggle('is-current', isSelected)
        button.setAttribute('aria-current', isSelected ? 'page' : 'false')
    })

    const section = document.getElementById('section-' + name)

    if (section) {
        // Если разметка этой вкладки уже сделана, показываем её
        section.hidden = false
    } else {
        // Для вкладок без готовой страницы оставляем рабочую область пустой
        document.getElementById('section-upcoming').hidden = false
    }
}

// Нажатия на кнопки меню переключают содержимое без перезагрузки
// hash позволяет открыть конкретный раздел прямо по адресу admin.html#users
document.querySelectorAll('[data-section]').forEach((button) => {
    button.addEventListener('click', () => {
        const name = button.dataset.section
        window.location.hash = name
        showSection(name)
    })
})

// Эти кнопки находятся в карточках панели управления
// Пока просмотр версии не реализован, они открывают будущий раздел версий
document.querySelectorAll('[data-section-target]').forEach((button) => {
    button.addEventListener('click', () => {
        const name = button.dataset.sectionTarget
        window.location.hash = name
        showSection(name)
    })
})

// Когда пользователь сам изменил адрес после #, открываем нужную вкладку
window.addEventListener('hashchange', () => {
    const name = window.location.hash.slice(1)
    showSection(name)
})

// Обновляем пять чисел в верхней части панели управления
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

// Для пустой таблицы показываем понятное сообщение вместо белого экрана
function showEmptyRow(body, columnCount) {
    const row = document.createElement('tr')
    const cell = document.createElement('td')
    cell.colSpan = columnCount
    cell.className = 'empty-row'
    cell.textContent = 'По вашему запросу ничего не найдено'
    row.append(cell)
    body.append(row)
}

// Создаём обычную ячейку таблицы и безопасно вставляем в неё текст
function addCell(row, text, className = '') {
    const cell = document.createElement('td')
    cell.textContent = String(text)

    if (className) {
        cell.className = className
    }

    row.append(cell)
    return cell
}

// Добавляем справа кнопку Изменить для конкретной записи
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

// Ищем название группы по её id, чтобы выводить номер вместо числа
function findGroupName(groupId) {
    const group = data.groups.find((item) => item.id === groupId)

    if (group) {
        return group.name
    }

    return '—'
}

// Переводим роли из БД на русский для показа в таблице
function getRoleName(role) {
    if (role === 'admin') {
        return 'Администратор'
    }

    if (role === 'teacher') {
        return 'Преподаватель'
    }

    return 'Студент'
}

// Строим строки таблицы пользователей с учётом поиска и фильтра по роли
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

// Строим список аудиторий и применяем выбранную сортировку
function renderClassrooms() {
    const search = document.getElementById('classrooms-search').value.trim().toLowerCase()
    const body = document.getElementById('classrooms-table-body')
    body.replaceChildren()

    const found = data.classrooms.filter((room) => room.roomNumber.toLowerCase().includes(search))

    // sort изменяет порядок записей только в копии массива
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

// Показываем дисциплины, подходящие под введённый текст
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

// Показываем названия групп и их количество студентов и занятий
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

// После изменения данных перерисовываем таблицы и панель управления
function renderEverything() {
    renderDashboard()
    renderUsers()
    renderClassrooms()
    renderSubjects()
    renderGroups()
}

// Поиск обновляет таблицу сразу после ввода каждой буквы
document.getElementById('users-search').addEventListener('input', renderUsers)
document.getElementById('users-role').addEventListener('change', renderUsers)
document.getElementById('classrooms-search').addEventListener('input', renderClassrooms)
document.getElementById('subjects-search').addEventListener('input', renderSubjects)
document.getElementById('groups-search').addEventListener('input', renderGroups)

// Установка сортировки по вместимости аудиторий
document.getElementById('sort-capacity').addEventListener('click', () => {
    if (classroomSortKey === 'capacity') {
        sortCapacityAscending = !sortCapacityAscending
    } else {
        classroomSortKey = 'capacity'
        sortCapacityAscending = true
    }

    renderClassrooms()
})

// Установка сортировки по активности аудиторий
document.getElementById('sort-status').addEventListener('click', () => {
    if (classroomSortKey === 'status') {
        sortStatusAscending = !sortStatusAscending
    } else {
        classroomSortKey = 'status'
        sortStatusAscending = true
    }

    renderClassrooms()
})

// Возвращает массив с нужными записями для выбранной формы
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

// Находим свободный id для новой записи
function getNextId(records) {
    let biggestId = 0

    records.forEach((record) => {
        if (record.id > biggestId) {
            biggestId = record.id
        }
    })

    return biggestId + 1
}

// Обновляем список групп в форме пользователя
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

// Показываем или прячем поле группы в зависимости от роли
function updateUserGroupVisibility() {
    const selectedRole = document.querySelector('input[name="user-role"]:checked')
    const block = document.getElementById('user-group-block')

    if (selectedRole && selectedRole.value === 'student') {
        block.hidden = false
    } else {
        block.hidden = true
    }
}

// Слушаем переключение роли в форме нового пользователя
document.querySelectorAll('input[name="user-role"]').forEach((radio) => {
    radio.addEventListener('change', updateUserGroupVisibility)
})

// Открываем одно и то же модальное окно для создания или редактирования
function openForm(type, id = null) {
    editingType = type
    editingId = id

    // Прячем все формы, кроме выбранной
    document.querySelectorAll('.record-form').forEach((form) => {
        form.hidden = true
        form.reset()
    })

    const form = document.getElementById('form-' + type)
    form.hidden = false

    // Снимаем старые красные рамки и старое сообщение об ошибке
    form.querySelectorAll('.admin-input, .admin-select').forEach((field) => {
        field.classList.remove('is-invalid')
    })

    document.getElementById(type + '-form-error').hidden = true

    // Подготавливаем пустую форму для новой записи
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

    // Если id передан, значит нажали Изменить, а не Создать
    if (id !== null) {
        const record = getRecords(type).find((item) => item.id === id)

        if (!record) {
            return
        }

        // Для режима редактирования используем отдельные понятные заголовки
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

// Подставляем старые значения в форму редактирования
function fillFormFromRecord(type, record) {
    if (type === 'users') {
        document.getElementById('user-name').value = record.name
        document.getElementById('user-login').value = record.login
        document.getElementById('user-email').value = record.email
        document.querySelector('input[name="user-role"][value="' + record.role + '"]').checked = true
        // Изменение пароля ещё не подключено к серверу, поэтому поле прячем
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

// При нажатии кнопки Создать узнаём, какую форму нужно открыть
document.querySelectorAll('[data-create]').forEach((button) => {
    button.addEventListener('click', () => openForm(button.dataset.create))
})

// Закрытие модального окна крестиком или кнопкой Отмена
document.getElementById('modal-close').addEventListener('click', () => dialog.close())

document.querySelectorAll('[data-cancel-dialog]').forEach((button) => {
    button.addEventListener('click', () => dialog.close())
})

// Нажатие непосредственно на затемнённую область тоже закрывает окно
dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
        dialog.close()
    }
})

// Сообщение об ошибке появляется под полями выбранной формы
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

// Сохраняем запись в её массиве и заново рисуем таблицы
function saveRecord(type, record) {
    const records = getRecords(type)

    if (editingId === null) {
        record.id = getNextId(records)
        records.push(record)
    } else {
        const index = records.findIndex((item) => item.id === editingId)

        if (index !== -1) {
            // Сохраняем тот же id, чтобы ссылки на запись не сломались
            record.id = editingId

            // При редактировании группы оставляем её количество занятий
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

// Проверка формы пользователя и сохранение его данных
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

    // Проверяем, не занят ли логин другим пользователем
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

    // В браузер сохраняем только данные списка, но не пароль
    saveRecord('users', { name: name, login: login, email: email, role: role, groupId: groupId })
}

// Проверяем номер и вместимость новой аудитории
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

// Проверяем название дисциплины и её код
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

// Проверяем название группы и численность студентов
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

    // Для новой группы число занятий пока равно нулю
    saveRecord('groups', { name: name, students: students, lessons: 0 })
}

// Каждая форма вызывает свою проверку при нажатии Сохранить
document.getElementById('form-users').addEventListener('submit', submitUser)
document.getElementById('form-classrooms').addEventListener('submit', submitClassroom)
document.getElementById('form-subjects').addEventListener('submit', submitSubject)
document.getElementById('form-groups').addEventListener('submit', submitGroup)

// Убираем красную рамку, когда пользователь исправляет поле
document.querySelectorAll('.record-form input, .record-form select').forEach((field) => {
    field.addEventListener('input', () => {
        field.classList.remove('is-invalid')
    })
})

// Короткое уведомление показываем в правом нижнем углу
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

// Сразу после загрузки страницы заполняем все таблицы
renderEverything()

// Если в адресе есть #users или другой раздел, открываем его
showSection(window.location.hash.slice(1))
