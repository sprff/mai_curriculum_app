'use strict'

// Строгий режим JavaScript
// Помогает раньше замечать некоторые ошибки в коде

// true - используется демонстрационный режим без настоящего сервера
const DEMO_MODE = true

// Адрес, куда позже будет отправляться запрос на вход в систему
// Сейчас он не используется, пока DEMO_MODE равен true
const LOGIN_API_URL = '/api/auth/login'

// Здесь записано, куда должен попасть пользователь после входа
// Слева указана роль, справа адрес нужной страницы
const ROLE_ROUTES = {
    // Администратор переходит в раздел администратора
    admin: '/admin/',

    // Дополнительный вариант названия роли администратора
    administrator: '/admin/',

    // Преподаватель переходит к своему расписанию
    teacher: '/teacher/schedule/',

    // Дополнительный вариант названия роли преподавателя
    lecturer: '/teacher/schedule/',

    // Студент переходит к расписанию своей группы
    student: '/student/schedule/'
}

// document означает текущую HTML-страницу
// getElementById находит элемент по его id из HTML

// Находим форму входа с id="login-form"
const form = document.getElementById('login-form')

// Находим поле для логина
const loginInput = document.getElementById('login')

// Находим поле для пароля
const passwordInput = document.getElementById('password')

// Находим текст ошибки под полем логина
const loginError = document.getElementById('login-error')

// Находим текст ошибки под полем пароля
const passwordError = document.getElementById('password-error')

// Находим общий блок сообщения над формой
const message = document.getElementById('login-message')

// Находим заголовок общего сообщения
const messageTitle = document.getElementById('message-title')

// Находим пояснение внутри общего сообщения
const messageDescription = document.getElementById('message-description')

// Находим кнопку Войти
const submitButton = document.getElementById('login-button')

// addEventListener позволяет выполнить код при каком-то действии пользователя
// input означает изменение текста внутри поля

// Когда пользователь начинает менять логин, убираем старую ошибку у этого поля
loginInput.addEventListener('input', () => clearFieldError(loginInput, loginError))

// Когда пользователь начинает менять пароль, убираем старую ошибку у этого поля
passwordInput.addEventListener('input', () => clearFieldError(passwordInput, passwordError))

// submit происходит при отправке формы
// Например после нажатия кнопки Войти или Enter
// async означает, что внутри можно ждать результат асинхронных действий через await
form.addEventListener('submit', async (event) => {
    // По умолчанию браузер перезагрузил бы страницу после отправки формы
    // preventDefault отменяет это стандартное поведение
    event.preventDefault()

    // Скрываем старое общее сообщение перед новой попыткой входа
    hideMessage()

    // Берем текст из поля логина
    // value содержит введенное пользователем значение
    // trim убирает пробелы в начале и конце
    const login = loginInput.value.trim()

    // Берем пароль из поля пароля
    // Здесь trim не используем, потому что пробел теоретически может быть частью пароля
    const password = passwordInput.value

    // Проверяем, что оба обязательных поля заполнены
    const formIsValid = validateRequiredFields(login, password)

    // Этот блок выполнится, если форма не прошла проверку
    if (!formIsValid) {
        return
    }

    // Блокируем кнопку и меняем ее текст на Проверяем...
    setLoadingState(true)

    // try используется для кода, в котором может возникнуть ошибка
    try {
        // Если DEMO_MODE равен true, используется demoLogin
        // Иначе используется настоящий запрос requestLogin
        const result = DEMO_MODE
            ? await demoLogin(login, password)
            : await requestLogin(login, password)

        // await заставляет дождаться результата функции
        // После успешной проверки передаем результат дальше
        handleSuccessfulLogin(result)

    // catch срабатывает, если внутри try произошла ошибка
    } catch (error) {
        // Передаем ошибку в отдельную функцию для обработки
        handleLoginError(error)

    // finally выполняется в любом случае
    // И после успеха, и после ошибки
    } finally {
        // Возвращаем кнопку Войти в обычное состояние
        setLoadingState(false)
    }
})

// Функция проверяет, заполнены ли логин и пароль
// login и password здесь являются входными параметрами функции
function validateRequiredFields(login, password) {
    // Сначала считаем, что форма заполнена правильно
    // let используется потому, что это значение ниже может измениться
    let isValid = true

    // Если логин пустой
    if (!login) {
        // Показываем ошибку рядом с полем логина
        showFieldError(loginInput, loginError)

        // Запоминаем, что форма заполнена неправильно
        isValid = false
    }

    // Если пароль пустой
    if (!password) {
        // Показываем ошибку рядом с полем пароля
        showFieldError(passwordInput, passwordError)

        // Запоминаем, что форма заполнена неправильно
        isValid = false
    }

    // Возвращаем итог проверки наружу
    // true значит все хорошо, false значит есть ошибка
    return isValid
}

// Функция показывает ошибку у конкретного поля
// input это само поле
// errorElement это текст ошибки под ним
function showFieldError(input, errorElement) {
    // classList.add добавляет CSS-класс элементу
    // Класс is-invalid делает поле визуально ошибочным
    input.classList.add('is-invalid')

    // Добавляем специальный HTML-атрибут о наличии ошибки
    // Он полезен для доступности интерфейса
    input.setAttribute('aria-invalid', 'true')

    // hidden = false означает показать элемент
    // Поэтому текст ошибки становится видимым
    errorElement.hidden = false
}

// Функция убирает ошибку у поля
function clearFieldError(input, errorElement) {
    // Убираем CSS-класс ошибки
    input.classList.remove('is-invalid')

    // Убираем атрибут aria-invalid
    input.removeAttribute('aria-invalid')

    // hidden = true означает скрыть элемент
    errorElement.hidden = true
}

// Эта функция понадобится после подключения настоящего backend
// async позволяет использовать внутри await
async function requestLogin(login, password) {
    // fetch отправляет HTTP-запрос на сервер
    // await ждет, пока сервер пришлет ответ
    const response = await fetch(LOGIN_API_URL, {
        // POST используется, когда мы отправляем данные на сервер
        method: 'POST',

        // headers содержит служебную информацию о запросе
        headers: {
            // Сообщаем серверу, что данные отправляются в формате JSON
            'Content-Type': 'application/json'
        },

        // body это данные, которые отправляются на сервер
        // JSON.stringify превращает объект JavaScript в строку JSON
        body: JSON.stringify({ login, password })
    })

    // status содержит числовой код ответа сервера
    // 401 означает неправильные данные для входа
    if (response.status === 401) {
        // throw вручную создает ошибку и передает ее в catch
        throw new AuthError(
            // Внутренний код ошибки
            'invalid_credentials',

            // Заголовок, который увидит пользователь
            'Неверный логин или пароль',

            // Дополнительное пояснение пользователю
            'Проверьте данные и попробуйте снова'
        )
    }

    // 403 означает, что доступ запрещен
    // Здесь используем его для отключенной учетной записи
    if (response.status === 403) {
        throw new AuthError(
            'account_disabled',
            'Учетная запись отключена',
            'Обратитесь к администратору системы'
        )
    }

    // response.ok равно true для успешных ответов сервера
    // !response.ok означает, что сервер вернул другую ошибку
    if (!response.ok) {
        throw new AuthError(
            'server_error',
            'Не удалось выполнить вход',
            'Попробуйте еще раз немного позже'
        )
    }

    // response.json читает JSON, который прислал сервер
    // Например сервер может вернуть объект с ролью пользователя
    return response.json()
}

// Демонстрационная функция входа
// Она временно заменяет настоящий сервер
async function demoLogin(login, password) {
    // Искусственно ждем 450 миллисекунд
    // Так проверка выглядит похожей на настоящий запрос к серверу
    await wait(450)

    // Временный список пользователей только для проверки интерфейса
    // У каждого пользователя есть пароль и роль
    const demoUsers = {
        admin: { password: 'admin123', role: 'admin' },
        teacher: { password: 'teacher123', role: 'teacher' },
        student: { password: 'student123', role: 'student' }
    }

    if (login === 'blocked' && password === 'blocked123') {
        // Для этого тестового пользователя показываем ошибку отключенной учетной записи
        throw new AuthError(
            'account_disabled',
            'Учетная запись отключена',
            'Обратитесь к администратору системы'
        )
    }

    // Ищем пользователя в объекте demoUsers по введенному логину
    // Например demoUsers['admin'] вернет данные пользователя admin
    const user = demoUsers[login]

    // !user означает, что пользователя с таким логином нет
    // !== означает не равно
    // То есть ошибка будет, если логин не найден или пароль неправильный
    if (!user || user.password !== password) {
        throw new AuthError(
            'invalid_credentials',
            'Неверный логин или пароль',
            'Проверьте данные и попробуйте снова'
        )
    }

    // Если логин и пароль подошли, возвращаем роль пользователя
    // Эта роль потом определяет нужную страницу
    return { role: user.role }
}

// Функция обрабатывает успешный вход
function handleSuccessfulLogin(result) {
    // Берем роль из результата
    // ?. означает безопасное обращение к свойству
    // Если result вдруг отсутствует, программа не упадет на этой строке
    const role = result?.role

    // По роли находим адрес нужной страницы в ROLE_ROUTES
    const route = ROLE_ROUTES[role]

    // Если для такой роли адрес не найден
    if (!route) {
        // Показываем сообщение об ошибке
        showMessage(
            'error',
            'Неизвестная роль пользователя',
            'Система не смогла определить раздел для перехода'
        )
        return
    }

    // Пока включен демонстрационный режим, реальные страницы еще не открываем
    if (DEMO_MODE) {
        // Показываем сообщение, что проверка прошла успешно
        showMessage(
            'success',
            'Вход выполнен',

            // Обратные кавычки позволяют вставлять значения внутрь строки через ${...}
            `После подключения backend пользователь с ролью «${getRoleName(role)}» перейдет на ${route}`
        )

        // Завершаем функцию, потому что в демо режиме переход не нужен
        return
    }

    // Когда backend и остальные страницы будут готовы, эта строка откроет нужный раздел
    window.location.assign(route)
}

// Функция обрабатывает ошибки, возникшие при входе
function handleLoginError(error) {
    // instanceof проверяет, является ли ошибка нашей специальной AuthError
    if (error instanceof AuthError) {
        // Показываем текст ошибки пользователю
        showMessage('error', error.title, error.description)

        // Если именно логин или пароль неправильные
        if (error.code === 'invalid_credentials') {
            // Подсвечиваем красным поле логина
            loginInput.classList.add('is-invalid')

            // Подсвечиваем красным поле пароля
            passwordInput.classList.add('is-invalid')
        }

        // После обработки такой ошибки дальше функцию не продолжаем
        return
    }

    // Если произошла какая-то другая непредвиденная ошибка
    // Например сервер вообще недоступен
    showMessage(
        'error',
        'Нет соединения с сервером',
        'Проверьте подключение и попробуйте снова'
    )
}

// Функция показывает общее сообщение над формой
// type определяет вид сообщения
// title это заголовок
// description это пояснение
function showMessage(type, title, description) {
    // toggle добавляет или убирает CSS-класс в зависимости от условия
    // Если type равен error, включаем красное оформление
    message.classList.toggle('message--error', type === 'error')

    // Если type равен success, включаем зеленое оформление
    message.classList.toggle('message--success', type === 'success')

    // textContent меняет обычный текст внутри HTML-элемента
    messageTitle.textContent = title

    // Подставляем текст пояснения
    messageDescription.textContent = description

    // Показываем весь блок сообщения
    message.hidden = false
}

// Функция скрывает общее сообщение
function hideMessage() {
    // hidden = true скрывает элемент на странице
    message.hidden = true
}

// Функция меняет состояние кнопки во время проверки данных
function setLoadingState(isLoading) {
    // Если isLoading равен true, кнопка становится недоступной для повторного нажатия
    submitButton.disabled = isLoading

    // Тернарный оператор выбирает один из двух текстов
    // Во время проверки будет Проверяем..., после проверки снова Войти
    submitButton.textContent = isLoading ? 'Проверяем...' : 'Войти'
}

// Функция превращает техническое название роли в понятное русское слово
function getRoleName(role) {
    // Объект со всеми вариантами названий ролей
    const roleNames = {
        admin: 'администратор',
        administrator: 'администратор',
        teacher: 'преподаватель',
        lecturer: 'преподаватель',
        student: 'студент'
    }

    // ?? означает использовать значение справа, только если слева ничего нет
    // Если роль найдена, вернется русское название
    // Если не найдена, вернется исходное значение role
    return roleNames[role] ?? role
}

// Функция создает задержку на указанное число миллисекунд
function wait(milliseconds) {
    // Promise представляет действие, результат которого появится позже
    // setTimeout вызывает resolve после указанной задержки
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

// Создаем собственный тип ошибки специально для авторизации
// extends Error означает, что AuthError наследует возможности обычной ошибки JavaScript
class AuthError extends Error {
    // constructor запускается при создании новой ошибки через new AuthError(...)
    constructor(code, title, description) {
        // super вызывает constructor стандартного класса Error
        // В него передаем основной текст ошибки
        super(title)

        // Сохраняем понятное имя типа ошибки
        this.name = 'AuthError'

        // Сохраняем внутренний код ошибки
        this.code = code

        // Сохраняем заголовок для показа пользователю
        this.title = title

        // Сохраняем дополнительное описание ошибки
        this.description = description
    }
}
