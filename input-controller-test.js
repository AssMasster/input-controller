(function() {
    const targetElement = document.getElementById('controller-target')
    const player = document.getElementById('player')
    const log = document.getElementById('log')

    let posX = 100
    let posY = 100

    const controller = new InputController({
        left: { keys: [37, 65] },
        right: { keys: [39, 68] },
        top: { keys: [38, 87] },
        bottom: { keys: [40, 83] }
    }, targetElement)

    function updateUI() {
        document.getElementById('enabled-indicator').textContent = controller.enabled;
        document.getElementById('focused-indicator').textContent = controller.focused
        document.getElementById('left-active').textContent = controller.isActionActive('left')
        document.getElementById('right-active').textContent = controller.isActionActive('right')
        document.getElementById('jump-active').textContent = controller.isActionActive('jump')
    }

    function updatePlayer() {
        if (controller.isActionActive('left')) {
            posX = Math.max(0, posX - 3)
        }
        if (controller.isActionActive('right')) {
            posX = Math.min(500, posX + 3)
        }
        if (controller.isActionActive('top')) {
            posY = Math.max(0, posY - 3)
        }
        if (controller.isActionActive('bottom')) {
            posY = Math.min(500, posY + 3)
        }
        player.style.left = posX + 'px'
        player.style.top = posY + 'px'

        if (controller.isActionActive('jump')) {
            player.style.backgroundColor = 'blue'
            posY = Math.max(0, posY - 10)
            player.style.top = posY + 'px'
        } else {
            player.style.backgroundColor = 'red'
        }
        updateUI()
        requestAnimationFrame(updatePlayer)
    }
    requestAnimationFrame(updatePlayer)

    targetElement.addEventListener(controller.ACTION_ACTIVATED, (e) => {
        log.innerHTML += `<div>Активированно: ${e.detail.action}</div>`
        log.scrollTop = log.scrollHeight
    })
    targetElement.addEventListener(controller.ACTION_DEACTIVATED, (e) => {
        log.innerHTML += `<div>Дезактивированно: ${e.detail.action}</div>`
        log.scrollTop = log.scrollHeight
    })

    document.getElementById('btn-attach').addEventListener('click', () => {
        controller.attach(targetElement)
    })
    document.getElementById('btn-detach').addEventListener('click', () => {
        controller.detach()
    })
    document.getElementById('btn-enable').addEventListener('click', () => {
        controller.enabled = true
    })
    document.getElementById('btn-disable').addEventListener('click', () => {
        controller.enabled = false
    })
    document.getElementById('btn-bind-jump').addEventListener('click', () => {
        controller.bindActions({ jump: { keys: [32] } })
    })
    document.getElementById('btn-enable-left').addEventListener('click', () => {
        controller.enableAction('left')
        console.log('left')
    })
    document.getElementById('btn-disable-left').addEventListener('click', () => {
        controller.disableAction('left')
    })
    document.getElementById('btn-enable-jump').addEventListener('click', () => {
        controller.enableAction('jump')
    })
    document.getElementById('btn-disable-jump').addEventListener('click', () => {
        controller.disableAction('jump')
    })
    document.getElementById('btn-focus-target').addEventListener('click', () => {
        targetElement.focus()
    })
})()