'use strict'

// Включаем строгий режим JavaScript
// Он помогает раньше замечать некоторые ошибки в коде

// true означает, что пока используем тестовых пользователей без настоящего сервера
const DEMO_MODE = true

// Адрес backend, куда позже будет отправляться запрос на вход
// Пока DEMO_MODE равен true, этот адрес не используется
const LOGIN_API_URL = '/api/auth/login'

// Здесь записано, на какую страницу переводить пользователя после входа
// Слева техническое название роли, справа нужный HTML-файл
const ROLE_ROUTES = {
    // Страница администратора теперь есть и открывается в демо-режиме
    admin: 'admin.html',
    administrator: 'admin.html',

    // Преподавателя переводим на страницу его расписания
    teacher: 'teacher-schedule.html',
    lecturer: 'teacher-schedule.html',

    // Студента переводим на страницу расписания группы
    student: 'student.html'
}

// document означает текущую HTML-страницу
// getElementById находит элемент по его id

// Находим всю форму входа
const form = document.getElementById('login-form')

// Находим поле логина
const loginInput = document.getElementById('login')

// Находим поле пароля
const passwordInput = document.getElementById('password')

// Находим текст ошибки под логином
const loginError = document.getElementById('login-error')

// Находим текст ошибки под паролем
const passwordError = document.getElementById('password-error')

// Находим общий блок сообщения над формой
const message = document.getElementById('login-message')

// Находим заголовок общего сообщения
const messageTitle = document.getElementById('message-title')

// Находим пояснение общего сообщения
const messageDescription = document.getElementById('message-description')

// Находим кнопку Войти
const submitButton = document.getElementById('login-button')

// addEventListener позволяет выполнить код после действия пользователя
// input означает, что пользователь меняет текст в поле

// Если пользователь начал исправлять логин, убираем старую ошибку
loginInput.addEventListener('input', () => clearFieldError(loginInput, loginError))

// То же самое делаем для пароля
passwordInput.addEventListener('input', () => clearFieldError(passwordInput, passwordError))

// submit происходит после нажатия Войти или Enter внутри формы
// async позволяет использовать await и ждать результат других действий
form.addEventListener('submit', async (event) => {
    // Обычно браузер после отправки формы перезагрузил бы страницу
    // preventDefault отменяет это стандартное действие
    event.preventDefault()

    // Перед новой попыткой скрываем старое сообщение
    hideMessage()

    // value содержит текст, который ввёл пользователь
    // trim убирает лишние пробелы по краям логина
    const login = loginInput.value.trim()

    // Для пароля пробелы не убираем, потому что они могут быть частью пароля
    const password = passwordInput.value

    // Проверяем, что оба поля заполнены
    const formIsValid = validateRequiredFields(login, password)

    // ! означает НЕ
    // Если форма заполнена неправильно, дальше вход не выполняем
    if (!formIsValid) {
        return
    }

    // Блокируем кнопку, пока идёт проверка
    setLoadingState(true)

    // try содержит код, в котором может возникнуть ошибка
    try {
        // Если включён DEMO_MODE, проверяем тестовых пользователей
        // Иначе отправляем настоящий запрос на backend
        const result = DEMO_MODE
            ? await demoLogin(login, password)
            : await requestLogin(login, password)

        // Если вход успешный, обрабатываем полученную роль
        handleSuccessfulLogin(result)

    // catch срабатывает, если внутри try возникла ошибка
    } catch (error) {
        handleLoginError(error)

    // finally выполняется и после успеха, и после ошибки
    } finally {
        // Возвращаем кнопке обычное состояние
        setLoadingState(false)
    }
})

// Функция проверяет обязательные поля
function validateRequiredFields(login, password) {
    // Сначала считаем, что всё заполнено правильно
    // let используем, потому что значение ниже может измениться
    let isValid = true

    // Если логина нет
    if (!login) {
        // Показываем ошибку около поля логина
        showFieldError(loginInput, loginError)
        isValid = false
    }

    // Если пароля нет
    if (!password) {
        // Показываем ошибку около поля пароля
        showFieldError(passwordInput, passwordError)
        isValid = false
    }

    // Возвращаем итог проверки
    // true значит всё хорошо, false значит есть ошибка
    return isValid
}

// Функция показывает ошибку у одного поля
function showFieldError(input, errorElement) {
    // Добавляем CSS-класс, который делает поле красным
    input.classList.add('is-invalid')

    // Помечаем поле как ошибочное для специальных средств доступности
    input.setAttribute('aria-invalid', 'true')

    // hidden = false показывает текст ошибки
    errorElement.hidden = false
}

// Функция возвращает поле в обычное состояние
function clearFieldError(input, errorElement) {
    // Убираем красное оформление
    input.classList.remove('is-invalid')

    // Убираем отметку об ошибке
    input.removeAttribute('aria-invalid')

    // Снова скрываем текст ошибки
    errorElement.hidden = true
}

// Эта функция понадобится после подключения настоящего backend
async function requestLogin(login, password) {
    // fetch отправляет HTTP-запрос на сервер
    const response = await fetch(LOGIN_API_URL, {
        // POST используем, потому что отправляем логин и пароль
        method: 'POST',

        // Сообщаем серверу, что отправляем JSON
        headers: {
            'Content-Type': 'application/json'
        },

        // JSON.stringify превращает объект JavaScript в строку JSON
        body: JSON.stringify({ login, password })
    })

    // Код 401 означает неправильный логин или пароль
    if (response.status === 401) {
        throw new AuthError(
            'invalid_credentials',
            'Неверный логин или пароль',
            'Проверьте данные и попробуйте снова'
        )
    }

    // Код 403 используем для отключённой учётной записи
    if (response.status === 403) {
        throw new AuthError(
            'account_disabled',
            'Учетная запись отключена',
            'Обратитесь к администратору системы'
        )
    }

    // response.ok равен true для успешного ответа
    // Если ответ другой, показываем общую ошибку сервера
    if (!response.ok) {
        throw new AuthError(
            'server_error',
            'Не удалось выполнить вход',
            'Попробуйте еще раз немного позже'
        )
    }

    // Читаем JSON, который прислал backend
    return response.json()
}

// Временная проверка входа без backend
async function demoLogin(login, password) {
    // Небольшая задержка делает проверку похожей на настоящий запрос
    await wait(450)

    // Тестовые пользователи для проверки трёх ролей
    const demoUsers = {
        admin: { password: 'admin123', role: 'admin' },
        teacher: { password: 'teacher123', role: 'teacher' },
        student: { password: 'student123', role: 'student' }
    }

    // Отдельный тестовый пользователь для проверки заблокированной учётной записи
    if (login === 'blocked' && password === 'blocked123') {
        throw new AuthError(
            'account_disabled',
            'Учетная запись отключена',
            'Обратитесь к администратору системы'
        )
    }

    // Ищем пользователя по введённому логину
    const user = demoUsers[login]

    // Если пользователь не найден или пароль не совпадает
    if (!user || user.password !== password) {
        throw new AuthError(
            'invalid_credentials',
            'Неверный логин или пароль',
            'Проверьте данные и попробуйте снова'
        )
    }

    // При успешной проверке возвращаем роль
    return { role: user.role }
}

// Функция обрабатывает успешный вход
function handleSuccessfulLogin(result) {
    // ?. безопасно берёт роль из результата
    const role = result?.role

    // По роли находим нужную страницу
    const route = ROLE_ROUTES[role]

    // Если такой роли нет в списке
    if (!route) {
        showMessage(
            'error',
            'Неизвестная роль пользователя',
            'Система не смогла определить раздел для перехода'
        )
        return
    }

    // Переходим на страницу нужной роли
    // В демо-режиме это тоже работает, потому что страницы уже созданы
    window.location.assign(route)
}

// Функция обрабатывает ошибки входа
function handleLoginError(error) {
    // Проверяем, относится ли ошибка к нашему классу AuthError
    if (error instanceof AuthError) {
        // Показываем заголовок и описание ошибки
        showMessage('error', error.title, error.description)

        // Если неправильные данные, красим оба поля
        if (error.code === 'invalid_credentials') {
            loginInput.classList.add('is-invalid')
            passwordInput.classList.add('is-invalid')
        }

        return
    }

    // Если произошла неизвестная ошибка, например нет соединения
    showMessage(
        'error',
        'Нет соединения с сервером',
        'Проверьте подключение и попробуйте снова'
    )
}

// Показываем общий блок сообщения над формой
function showMessage(type, title, description) {
    // Если type равен error, включаем красный вид сообщения
    message.classList.toggle('message--error', type === 'error')

    // Если type равен success, включаем зелёный вид сообщения
    message.classList.toggle('message--success', type === 'success')

    // Подставляем заголовок сообщения
    messageTitle.textContent = title

    // Подставляем пояснение
    messageDescription.textContent = description

    // Показываем блок
    message.hidden = false
}

// Скрываем общее сообщение
function hideMessage() {
    message.hidden = true
}

// Меняем кнопку во время проверки данных
function setLoadingState(isLoading) {
    // На время проверки запрещаем повторное нажатие
    submitButton.disabled = isLoading

    // Тернарный оператор выбирает один из двух текстов
    submitButton.textContent = isLoading ? 'Проверяем...' : 'Войти'
}

// Функция создаёт задержку на указанное число миллисекунд
function wait(milliseconds) {
    // Promise обозначает действие, результат которого появится позже
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

// Создаём свой тип ошибки специально для авторизации
class AuthError extends Error {
    // constructor выполняется при new AuthError(...)
    constructor(code, title, description) {
        // Передаём основной текст стандартному классу Error
        super(title)

        // Сохраняем название нашего типа ошибки
        this.name = 'AuthError'

        // Сохраняем внутренний код
        this.code = code

        // Сохраняем заголовок для пользователя
        this.title = title

        // Сохраняем подробное описание
        this.description = description
    }
}
