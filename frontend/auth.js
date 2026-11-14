'use strict'
// Local prototype only. Token persistence needs a team security decision before release.
const Auth = (() => {
    const KEY = 'curriculum_auth_prototype'
    let refreshing = null
    function read() {
        try { return JSON.parse(sessionStorage.getItem(KEY) || 'null') } catch (_) { return null }
    }
    function clear() { sessionStorage.removeItem(KEY) }
    function save(tokens) {
        if (!tokens || typeof tokens.access_token !== 'string' || !tokens.access_token ||
            typeof tokens.refresh_token !== 'string' || !tokens.refresh_token ||
            !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0) {
            throw new Error('Некорректный ответ сервера')
        }
        sessionStorage.setItem(KEY, JSON.stringify({
            access: tokens.access_token, refresh: tokens.refresh_token,
            expiresAt: Date.now() + tokens.expires_in * 1000
        }))
    }
    async function refresh() {
        if (refreshing) return refreshing
        refreshing = (async () => {
            const session = read()
            if (!session?.refresh) throw new Error('Сессия не найдена')
            const response = await fetch('/api/v1/auth/refresh', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({refresh_token: session.refresh})
            })
            if (!response.ok) {
                if (response.status === 400) clear()
                throw new Error('Не удалось обновить сессию')
            }
            save(await response.json())
            return read().access
        })()
        try { return await refreshing } finally { refreshing = null }
    }
    async function access() {
        const session = read()
        if (!session?.access) throw new Error('Сессия не найдена')
        if (session.expiresAt <= Date.now() + 5000) return refresh()
        return session.access
    }
    async function profile() {
        let token = await access()
        let response = await fetch('/api/v1/auth/me', {headers: {Authorization: 'Bearer ' + token}})
        if (response.status === 401) {
            token = await refresh()
            response = await fetch('/api/v1/auth/me', {headers: {Authorization: 'Bearer ' + token}})
        }
        if (!response.ok) throw new Error('Не удалось получить профиль')
        return response.json()
    }
    async function logout() {
        const session = read()
        if (!session?.refresh) { clear(); return }
        const response = await fetch('/api/v1/auth/logout', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({refresh_token: session.refresh})
        })
        if (!response.ok && response.status !== 400) throw new Error('Сервер не подтвердил выход')
        clear()
    }
    return {read, clear, save, refresh, profile, logout}
})()
