'use strict'

const weekSelects = document.querySelectorAll('.week-select')

const weekNavButtons = document.querySelectorAll('[data-week-nav]')

weekNavButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const select = button.closest('.content')?.querySelector('.week-select')

        if (!select) {
            return
        }

        const direction = button.dataset.weekNav

        const currentIndex = select.selectedIndex

        const lastIndex = select.options.length - 1

        if (direction === 'prev' && currentIndex > 0) {
            select.selectedIndex = currentIndex - 1
        }

        if (direction === 'next' && currentIndex < lastIndex) {
            select.selectedIndex = currentIndex + 1
        }
    })
})

const availabilityCells = document.querySelectorAll('.availability-cell')

const availabilityModeInputs = document.querySelectorAll('input[name="availability-mode"]')

const availabilityMessage = document.getElementById('availability-message')

const availabilityMessageTitle = document.getElementById('availability-message-title')

const availabilityMessageDescription = document.getElementById('availability-message-description')

const saveAvailabilityButton = document.getElementById('save-availability-button')

const cancelAvailabilityButton = document.getElementById('cancel-availability-button')

const applyAllButton = document.getElementById('apply-all-button')

if (availabilityCells.length > 0) {
    const initialStates = Array.from(availabilityCells, (cell) => cell.dataset.state || '')

    availabilityCells.forEach((cell) => {
        updateAvailabilityCell(cell)

        cell.addEventListener('click', () => {
            const selectedMode = document.querySelector('input[name="availability-mode"]:checked')?.value || 'unavailable'

            const currentState = cell.dataset.state || ''

            let nextState
            if (currentState === selectedMode) {
                nextState = ''
            } else {
                nextState = selectedMode
            }

            cell.dataset.state = nextState

            updateAvailabilityCell(cell)

            hideAvailabilityMessage()
        })
    })

    saveAvailabilityButton?.addEventListener('click', () => {
        showAvailabilityMessage(
            'Изменения сохранены',
            'Выбранные слоты сохранены для текущей недели'
        )
    })

    applyAllButton?.addEventListener('click', () => {
        showAvailabilityMessage(
            'Применено ко всем неделям',
            'Текущие отметки можно использовать для остальных недель'
        )
    })

    cancelAvailabilityButton?.addEventListener('click', () => {
        availabilityCells.forEach((cell, index) => {
            cell.dataset.state = initialStates[index]
            updateAvailabilityCell(cell)
        })

        hideAvailabilityMessage()
    })
}

function updateAvailabilityCell(cell) {
    const state = cell.dataset.state || ''

    if (state === 'unavailable') {
        cell.textContent = 'Недоступен'
        return
    }

    if (state === 'preferred') {
        cell.textContent = 'Предпочтителен'
        return
    }

    cell.textContent = ''
}

function showAvailabilityMessage(title, description) {
    if (!availabilityMessage || !availabilityMessageTitle || !availabilityMessageDescription) {
        return
    }

    availabilityMessage.classList.remove('message--error')

    availabilityMessage.classList.add('message--success')

    availabilityMessageTitle.textContent = title

    availabilityMessageDescription.textContent = description

    availabilityMessage.hidden = false
}

function hideAvailabilityMessage() {
    if (availabilityMessage) {
        availabilityMessage.hidden = true
    }
}
