function renderDashboardVersionCards() {
    const published = extraData.versions.find((item) => item.status === 'published')
    const latest = extraData.versions[extraData.versions.length - 1]
    const cases = [
        ['dashboard-published', published, 'Нет опубликованной версии'],
        ['dashboard-latest', latest, 'Пока нет версий расписания']
    ]
    cases.forEach(([id, version, empty]) => {
        const card = byId(id)
        if (!card) return
        const paragraphs = card.querySelectorAll('p')
        const tag = card.querySelector('.status-pill')
        if (version) {
            paragraphs[0].textContent = 'Версия №' + version.id + ' · ' + version.title
            paragraphs[1].textContent = 'Создана: ' + dateTime(version.createdAt)
            paragraphs[2].textContent = 'Штраф: ' + version.penalty + ' · Конфликтов: ' + scheduleConflicts(version.placements).length
            tag.textContent = versionStatus(version.status)
        } else {
            paragraphs[0].textContent = empty
            paragraphs[1].textContent = 'Запустите генерацию, чтобы создать черновик'
            paragraphs[2].textContent = ''
            tag.textContent = 'Нет данных'
        }
    })
}
renderDashboardVersionCards()

seedDemoVersion()
renderPriorities()
renderExtendedAdmin()
checkGeneration()
