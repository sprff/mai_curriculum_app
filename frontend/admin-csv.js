function parseCsv(text) {
    const rows = []
    let fields = []
    let value = ''
    let inQuotes = false
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i]
        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') { value += '"'; i += 1 }
            else if (inQuotes) inQuotes = false
            else if (value.length === 0) inQuotes = true
            else throw new Error('Неверное расположение кавычек в CSV')
        } else if (char === ',' && !inQuotes) {
            fields.push(value.trim()); value = ''
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && text[i + 1] === '\n') i += 1
            fields.push(value.trim()); value = ''
            if (fields.some((field) => field !== '')) rows.push(fields)
            fields = []
        } else value += char
    }
    if (inQuotes) throw new Error('Не закрыта кавычка в CSV')
    fields.push(value.trim())
    if (fields.some((field) => field !== '')) rows.push(fields)
    return rows
}
function csvQuote(value) {
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) return '"' + str.replaceAll('"', '""') + '"'
    return str
}
byId('download-csv').addEventListener('click', () => {
    const type = byId('import-type').value
    const headers = CSV_DEFINITIONS[type]
    if (!headers) return
    const file = new Blob(['\uFEFF' + headers.join(',') + '\r\n'], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = type + '_template.csv'
    link.click()
    URL.revokeObjectURL(url)
})
function normalizeCsvRow(type, row) {
    if (type === 'classrooms') {
        const capacity = Number(row.capacity)
        if (!row.roomNumber) throw new Error('Не указан номер аудитории')
        if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000) throw new Error('Вместимость должна быть целым числом больше 0')
        if (!['true', 'false', '1', '0'].includes(row.active.toLowerCase())) throw new Error('active должен быть true, false, 1 или 0')
        if (data.classrooms.some((r) => r.roomNumber.toLowerCase() === row.roomNumber.toLowerCase())) throw new Error('Такая аудитория уже существует')
        return { roomNumber: row.roomNumber, capacity, active: ['true', '1'].includes(row.active.toLowerCase()) }
    }
    if (type === 'groups') {
        const students = Number(row.students)
        if (!row.name) throw new Error('Не указан номер группы')
        if (!Number.isInteger(students) || students < 1 || students > 10000) throw new Error('Численность должна быть целым положительным числом')
        if (data.groups.some((g) => g.name.toLowerCase() === row.name.toLowerCase())) throw new Error('Такая группа уже существует')
        return { name: row.name, students, lessons: 0 }
    }
    if (type === 'subjects') {
        if (!row.name || !row.code) throw new Error('Заполните название и код дисциплины')
        if (data.subjects.some((s) => s.name.toLowerCase() === row.name.toLowerCase() || s.code.toLowerCase() === row.code.toLowerCase())) throw new Error('Дисциплина с таким названием или кодом уже существует')
        return { name: row.name, code: row.code }
    }
    if (type === 'teachers') {
        if (!row.name || !row.login || !row.email) throw new Error('Заполните ФИО, логин и email')
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) throw new Error('Некорректный email')
        if (data.users.some((u) => u.login.toLowerCase() === row.login.toLowerCase())) throw new Error('Такой логин уже существует')
        const codes = row.subjectCodes.split('|').map((s) => s.trim()).filter(Boolean)
        const subjectIds = []
        for (const code of codes) {
            const subject = data.subjects.find((s) => s.code.toLowerCase() === code.toLowerCase())
            if (!subject) throw new Error('Неизвестный код дисциплины: ' + code)
            if (!subjectIds.includes(subject.id)) subjectIds.push(subject.id)
        }
        return { name: row.name, login: row.login, email: row.email, role: 'teacher', groupId: null, subjectIds }
    }
    if (type === 'lessons') {
        const group = data.groups.find((g) => g.name.toLowerCase() === row.group.toLowerCase())
        const subject = data.subjects.find((s) => s.code.toLowerCase() === row.subject.toLowerCase())
        const teacher = data.users.find((u) => u.role === 'teacher' && u.login.toLowerCase() === row.teacher.toLowerCase())
        const count = Number(row.weeklyCount)
        if (!group || !subject || !teacher) throw new Error('Не найдена группа, дисциплина или логин преподавателя')
        if (!LESSON_TYPES[row.lessonType]) throw new Error('Тип занятия: lecture, practice или lab')
        if (!Number.isInteger(count) || count < 1 || count > 42) throw new Error('Занятий в неделю должно быть от 1 до 42')
        if (!teacherSubjectIds(teacher.id).includes(subject.id)) throw new Error('Преподаватель не ведёт дисциплину')
        if (extraData.lessons.some((item) => item.groupId === group.id && item.subjectId === subject.id &&
            item.teacherId === teacher.id && item.lessonType === row.lessonType)) throw new Error('Это занятие уже существует')
        return { groupId: group.id, subjectId: subject.id, teacherId: teacher.id, lessonType: row.lessonType, weeklyCount: count }
    }
    throw new Error('Неподдерживаемый тип импорта')
}
function getCsvRecordKey(type, item) {
    if (type === 'classrooms') return item.roomNumber.toLowerCase()
    if (type === 'groups') return item.name.toLowerCase()
    if (type === 'subjects') return item.code.toLowerCase()
    if (type === 'teachers') return item.login.toLowerCase()
    return [item.groupId, item.subjectId, item.teacherId, item.lessonType].join(':')
}
function setImportMessage(message) {
    const element = byId('import-message')
    element.textContent = message
    element.hidden = !message
}

function setImportFileName() {
    const file = byId('import-file').files[0]
    byId('import-file-name').textContent = file ? file.name : ''
}

function addImportStat(container, label, count, error = false) {
    const item = document.createElement('span')
    if (error) item.className = 'import-stat-errors'
    item.append(document.createTextNode(label + ': '))
    const number = document.createElement('strong')
    number.textContent = count
    item.append(number)
    container.append(item)
}

function renderImportPreview() {
    const preview = byId('import-preview')
    if (!pendingImport) {
        preview.hidden = true
        return
    }

    preview.hidden = false
    const { total, valid, errors } = pendingImport
    const stats = byId('import-stats')
    stats.replaceChildren()
    addImportStat(stats, 'Всего строк', total)
    stats.append(document.createTextNode(' · '))
    addImportStat(stats, 'корректных', valid.length)
    stats.append(document.createTextNode(' · '))
    addImportStat(stats, 'с ошибками', errors.length, true)

    const body = byId('import-errors-body')
    body.replaceChildren()
    errors.forEach((item) => {
        const tr = document.createElement('tr')
        addCell(tr, item.line)
        addCell(tr, item.values.join('; '))
        addCell(tr, item.error)
        body.append(tr)
    })

    byId('import-errors-section').hidden = errors.length === 0
    byId('import-advice-text').textContent =
        'Строки с ошибками будут пропущены — сохранятся только корректные строки (' + valid.length +
        '). Чтобы не загружать файл совсем, нажмите «Отменить импорт».'
    byId('confirm-import').disabled = valid.length === 0
}

async function inspectImport() {
    pendingImport = null
    renderImportPreview()
    setImportFileName()
    setImportMessage('')
    const file = byId('import-file').files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
        setImportMessage('Файл слишком большой (максимум 5 МБ)')
        return
    }

    const type = byId('import-type').value
    const expected = CSV_DEFINITIONS[type]
    if (!expected) {
        setImportMessage('Неподдерживаемый тип данных')
        return
    }
    try {
        const text = await file.text()
        const rows = parseCsv(text.replace(/^\uFEFF/, ''))
        if (!rows.length) throw new Error('Пустой файл')
        const header = rows[0].map((s) => s.trim())
        if (header.length !== expected.length || header.some((value, index) => value !== expected[index])) {
            throw new Error('Неверные столбцы CSV. Скачайте шаблон для выбранного типа данных')
        }

        const valid = []
        const errors = []
        const keys = new Set()
        rows.slice(1).forEach((values, index) => {
            try {
                if (values.length !== header.length) throw new Error('Неверное количество столбцов')
                const record = Object.fromEntries(header.map((key, position) => [key, values[position]]))
                const normalized = normalizeCsvRow(type, record)
                const key = getCsvRecordKey(type, normalized)
                if (keys.has(key)) throw new Error('Повторяется в загружаемом файле')
                keys.add(key)
                valid.push(normalized)
            } catch (error) {
                errors.push({ line: index + 2, values, error: error.message })
            }
        })
        pendingImport = { type, total: rows.length - 1, valid, errors }
        renderImportPreview()
    } catch (error) {
        setImportMessage('Не удалось проверить файл: ' + error.message)
    }
}

byId('import-file').addEventListener('change', inspectImport)
byId('import-type').addEventListener('change', () => {
    byId('import-file').value = ''
    pendingImport = null
    setImportFileName()
    setImportMessage('')
    renderImportPreview()
})
byId('cancel-import').addEventListener('click', () => {
    pendingImport = null
    byId('import-file').value = ''
    setImportFileName()
    setImportMessage('')
    renderImportPreview()
})
byId('confirm-import').addEventListener('click', () => {
    if (!pendingImport || !pendingImport.valid.length) return
    const { type, valid } = pendingImport
    let count = 0
    valid.forEach((record) => {
        const current = normalizeImportAgain(type, record)
        if (!current) return
        if (type === 'teachers') {
            const { subjectIds, ...user } = record
            const id = nextRecordId(data.users)
            data.users.push({ ...user, id })
            extraData.teacherSubjects[id] = subjectIds
        } else if (type === 'lessons') extraData.lessons.push({ ...record, id: nextRecordId(extraData.lessons) })
        else data[type].push({ ...record, id: nextRecordId(data[type]) })
        count += 1
    })
    saveData()
    saveExtended()
    pendingImport = null
    byId('import-file').value = ''
    setImportFileName()
    setImportMessage('')
    renderImportPreview()
    renderEverything()
    showToast('Сохранено ' + count + ' строк')
})

function normalizeImportAgain(type, record) {
    if (type === 'classrooms') return !data.classrooms.some((r) => r.roomNumber.toLowerCase() === record.roomNumber.toLowerCase())
    if (type === 'groups') return !data.groups.some((g) => g.name.toLowerCase() === record.name.toLowerCase())
    if (type === 'subjects') return !data.subjects.some((s) => s.code.toLowerCase() === record.code.toLowerCase())
    if (type === 'teachers') return !data.users.some((u) => u.login.toLowerCase() === record.login.toLowerCase())
    return !extraData.lessons.some((r) => r.groupId === record.groupId && r.subjectId === record.subjectId &&
        r.teacherId === record.teacherId && r.lessonType === record.lessonType)
}

