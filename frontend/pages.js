'use strict'

// Строгий режим JavaScript помогает раньше замечать некоторые ошибки

// querySelectorAll находит сразу все элементы, которые подходят под CSS-селектор
// Здесь находим все выпадающие списки выбора недели
const weekSelects = document.querySelectorAll('.week-select')

// Здесь находим все кнопки со специальным атрибутом data-week-nav
// Это стрелки назад и вперёд возле таблицы
const weekNavButtons = document.querySelectorAll('[data-week-nav]')

// forEach проходит по каждой найденной стрелке отдельно
weekNavButtons.forEach((button) => {
    // click означает действие после нажатия на кнопку
    button.addEventListener('click', () => {
        // closest ищет ближайший родительский блок .content
        // После этого внутри него ищем список выбора недели
        const select = button.closest('.content')?.querySelector('.week-select')

        // Если список почему-то не найден, прекращаем выполнение
        if (!select) {
            return
        }

        // dataset позволяет читать значения HTML-атрибутов вида data-...
        // Здесь получаем prev или next
        const direction = button.dataset.weekNav

        // selectedIndex это номер выбранного пункта в списке
        const currentIndex = select.selectedIndex

        // options.length показывает количество вариантов в списке
        // - 1 нужен, потому что нумерация начинается с нуля
        const lastIndex = select.options.length - 1

        // Если нажали стрелку назад и мы не на первой неделе
        if (direction === 'prev' && currentIndex > 0) {
            // Выбираем предыдущий пункт списка
            select.selectedIndex = currentIndex - 1
        }

        // Если нажали стрелку вперёд и мы не на последней неделе
        if (direction === 'next' && currentIndex < lastIndex) {
            // Выбираем следующий пункт списка
            select.selectedIndex = currentIndex + 1
        }
    })
})

// Ниже начинается логика страницы Моя доступность

// Находим все кнопки-ячеки в таблице доступности
const availabilityCells = document.querySelectorAll('.availability-cell')

// Находим переключатели Недоступен и Предпочтителен
const availabilityModeInputs = document.querySelectorAll('input[name="availability-mode"]')

// Находим блок сообщения, который появляется после сохранения
const availabilityMessage = document.getElementById('availability-message')

// Находим заголовок этого сообщения
const availabilityMessageTitle = document.getElementById('availability-message-title')

// Находим пояснение внутри сообщения
const availabilityMessageDescription = document.getElementById('availability-message-description')

// Находим кнопку Сохранить
const saveAvailabilityButton = document.getElementById('save-availability-button')

// Находим кнопку Отменить
const cancelAvailabilityButton = document.getElementById('cancel-availability-button')

// Находим кнопку Применить для каждой недели
const applyAllButton = document.getElementById('apply-all-button')

// Этот блок выполняется только если на странице есть ячейки доступности
// Поэтому один pages.js можно подключать и к обычному расписанию, и к доступности
if (availabilityCells.length > 0) {
    // Запоминаем состояние всех ячеек при открытии страницы
    // Это понадобится для кнопки Отменить
    const initialStates = Array.from(availabilityCells, (cell) => cell.dataset.state || '')

    // Настраиваем каждую ячейку отдельно
    availabilityCells.forEach((cell) => {
        // Сразу приводим текст ячейки в соответствие с data-state
        updateAvailabilityCell(cell)

        // Обрабатываем нажатие на ячейку
        cell.addEventListener('click', () => {
            // :checked находит выбранный radio-переключатель
            // ?.value безопасно получает его значение
            // Если ничего не выбрано, используем unavailable
            const selectedMode = document.querySelector('input[name="availability-mode"]:checked')?.value || 'unavailable'

            // Читаем текущее состояние нажатой ячейки
            const currentState = cell.dataset.state || ''

            // Если нажали тем же режимом второй раз, очищаем ячейку
            // Иначе записываем выбранный режим
            const nextState = currentState === selectedMode ? '' : selectedMode

            // Сохраняем новое состояние прямо в data-state HTML-элемента
            cell.dataset.state = nextState

            // Меняем текст и оформление ячейки
            updateAvailabilityCell(cell)

            // После нового изменения старое сообщение о сохранении больше не показываем
            hideAvailabilityMessage()
        })
    })

    // ?.addEventListener означает: добавить обработчик, только если кнопка существует
    saveAvailabilityButton?.addEventListener('click', () => {
        // Пока backend не подключён, просто показываем сообщение
        showAvailabilityMessage(
            'Изменения сохранены',
            'Выбранные слоты сохранены для текущей недели'
        )
    })

    // Обрабатываем кнопку применения ко всем неделям
    applyAllButton?.addEventListener('click', () => {
        showAvailabilityMessage(
            'Применено ко всем неделям',
            'Текущие отметки можно использовать для остальных недель'
        )
    })

    // Обрабатываем кнопку Отменить
    cancelAvailabilityButton?.addEventListener('click', () => {
        // Возвращаем каждой ячейке сохранённое начальное состояние
        availabilityCells.forEach((cell, index) => {
            cell.dataset.state = initialStates[index]
            updateAvailabilityCell(cell)
        })

        // Скрываем сообщение, если оно было показано
        hideAvailabilityMessage()
    })
}

// Функция меняет текст ячейки по её data-state
function updateAvailabilityCell(cell) {
    // Получаем текущее состояние
    const state = cell.dataset.state || ''

    // Если слот недоступен
    if (state === 'unavailable') {
        // Пишем соответствующий текст
        cell.textContent = 'Недоступен'
        return
    }

    // Если слот предпочтительный
    if (state === 'preferred') {
        // Пишем соответствующий текст
        cell.textContent = 'Предпочтителен'
        return
    }

    // Если состояние пустое, очищаем текст ячейки
    cell.textContent = ''
}

// Функция показывает зелёное сообщение под таблицей
function showAvailabilityMessage(title, description) {
    // Если нужных HTML-элементов нет, прекращаем выполнение
    if (!availabilityMessage || !availabilityMessageTitle || !availabilityMessageDescription) {
        return
    }

    // На всякий случай убираем красный класс ошибки
    availabilityMessage.classList.remove('message--error')

    // Добавляем зелёный класс успешного сообщения
    availabilityMessage.classList.add('message--success')

    // Подставляем заголовок
    availabilityMessageTitle.textContent = title

    // Подставляем пояснение
    availabilityMessageDescription.textContent = description

    // Показываем блок
    availabilityMessage.hidden = false
}

// Функция скрывает сообщение под таблицей
function hideAvailabilityMessage() {
    // Сначала проверяем, что блок вообще существует на странице
    if (availabilityMessage) {
        // hidden = true скрывает элемент
        availabilityMessage.hidden = true
    }
}
