'use strict'

// Деморежим использует тестовых пользователей вместо серверной авторизации
const DEMO_MODE = true

const LOGIN_API_URL = '/api/auth/login'

const ROLE_ROUTES = {
    admin: 'admin.html',
    administrator: 'admin.html',

    teacher: 'teacher-schedule.html',
    lecturer: 'teacher-schedule.html',

    student: 'student.html'
}

const form = document.getElementById('login-form')

const loginInput = document.getElementById('login')

const passwordInput = document.getElementById('password')

const loginError = document.getElementById('login-error')

const passwordError = document.getElementById('password-error')

const message = document.getElementById('login-message')

const messageTitle = document.getElementById('message-title')

const messageDescription = document.getElementById('message-description')

const submitButton = document.getElementById('login-button')

loginInput.addEventListener('input', () => clearFieldError(loginInput, loginError))

passwordInput.addEventListener('input', () => clearFieldError(passwordInput, passwordError))

form.addEventListener('submit', async (event) => {
    event.preventDefault()

    hideMessage()

    const login = loginInput.value.trim()

    const password = passwordInput.value

    try {
        validateRequiredFields(login, password)

        setLoadingState(true)

        let result
        if (DEMO_MODE) {
            result = await demoLogin(login, password)
        } else {
            result = await requestLogin(login, password)
        }

        handleSuccessfulLogin(result)
    } catch (error) {
        if (error instanceof RequiredFieldsError) {
            if (error.fields.includes('login')) {
                showFieldError(loginInput, loginError)
            }

            if (error.fields.includes('password')) {
                showFieldError(passwordInput, passwordError)
            }

            return
        }

        handleLoginError(error)
    } finally {
        setLoadingState(false)
    }
})

function validateRequiredFields(login, password) {
    const emptyFields = []

    if (!login) {
        emptyFields.push('login')
    }

    if (!password) {
        emptyFields.push('password')
    }

    if (emptyFields.length > 0) {
        throw new RequiredFieldsError(emptyFields)
    }
}

function showFieldError(input, errorElement) {
    input.classList.add('is-invalid')

    input.setAttribute('aria-invalid', 'true')

    errorElement.hidden = false
}

function clearFieldError(input, errorElement) {
    input.classList.remove('is-invalid')

    input.removeAttribute('aria-invalid')

    errorElement.hidden = true
}

async function requestLogin(login, password) {
    const response = await fetch(LOGIN_API_URL, {
        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({ login, password })
    })

    if (response.status === 401) {
        throw new AuthError(
            'invalid_credentials',
            'Неверный логин или пароль',
            'Проверьте данные и попробуйте снова'
        )
    }

    if (response.status === 403) {
        throw new AuthError(
            'account_disabled',
            'Учетная запись отключена',
            'Обратитесь к администратору системы'
        )
    }

    if (!response.ok) {
        throw new AuthError(
            'server_error',
            'Не удалось выполнить вход',
            'Попробуйте еще раз немного позже'
        )
    }

    return response.json()
}

async function demoLogin(login, password) {
    await wait(450)

    const demoUsers = {
        admin: { password: 'admin123', role: 'admin' },
        teacher: { password: 'teacher123', role: 'teacher' },
        student: { password: 'student123', role: 'student' }
    }

    if (login === 'blocked' && password === 'blocked123') {
        throw new AuthError(
            'account_disabled',
            'Учетная запись отключена',
            'Обратитесь к администратору системы'
        )
    }

    const user = demoUsers[login]

    if (!user || user.password !== password) {
        throw new AuthError(
            'invalid_credentials',
            'Неверный логин или пароль',
            'Проверьте данные и попробуйте снова'
        )
    }

    return { role: user.role }
}

function handleSuccessfulLogin(result) {
    const role = result?.role

    const route = ROLE_ROUTES[role]

    if (!route) {
        showMessage(
            'error',
            'Неизвестная роль пользователя',
            'Система не смогла определить раздел для перехода'
        )
        return
    }

    window.location.assign(route)
}

function handleLoginError(error) {
    if (error instanceof AuthError) {
        showMessage('error', error.title, error.description)

        if (error.code === 'invalid_credentials') {
            loginInput.classList.add('is-invalid')
            passwordInput.classList.add('is-invalid')
        }

        return
    }

    showMessage(
        'error',
        'Нет соединения с сервером',
        'Проверьте подключение и попробуйте снова'
    )
}

function showMessage(type, title, description) {
    message.classList.toggle('message--error', type === 'error')

    message.classList.toggle('message--success', type === 'success')

    messageTitle.textContent = title

    messageDescription.textContent = description

    message.hidden = false
}

function hideMessage() {
    message.hidden = true
}

function setLoadingState(isLoading) {
    submitButton.disabled = isLoading

    if (isLoading) {
        submitButton.textContent = 'Проверяем...'
    } else {
        submitButton.textContent = 'Войти'
    }
}

function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

class AuthError extends Error {
    constructor(code, title, description) {
        super(title)

        this.name = 'AuthError'

        this.code = code

        this.title = title

        this.description = description
    }
}

class RequiredFieldsError extends Error {
    constructor(fields) {
        super('Не заполнены обязательные поля')
        this.name = 'RequiredFieldsError'
        this.fields = fields
    }
}
