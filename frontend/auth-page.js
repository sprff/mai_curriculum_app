'use strict'
document.addEventListener('DOMContentLoaded', async () => {
    const logout = document.querySelector('.logout-button')
    if (logout) logout.addEventListener('click', async event => {
        event.preventDefault()
        try { await Auth.logout(); window.location.assign('index.html') }
        catch (_) { alert('Не удалось выйти. Проверьте соединение и попробуйте ещё раз.') }
    })
    try {
        const user = await Auth.profile()
        const name = document.querySelector('.user-name')
        if (name) name.textContent = user.fullName
    } catch (_) {
        if (!Auth.read()) window.location.assign('index.html')
    }
})
