(function(global) {
    'use strict'
    class InputController {
        static get ACTION_ACTIVATED() { return 'input-controller:action-activated' }
        static get ACTION_DEACTIVATED() { return 'input-controller:action-deactivated' }

        _actions = new Map();
        _keyStates = new Map();
        _keyToActions = new Map();
        _target = null;
        _enabled = false;
        _focused = true;
        _listeners = {};

        constructor(actionsToBind = {}, target = null) {
            if (actionsToBind) {
                this.bindActions(actionsToBind)
            }
            if (target) {
                this.attach(target)
            }
        };

bindActions(actionsToBind) {
    for (const [actionName, config] of Object.entries(actionsToBind)) {
        let action = this._actions.get(actionName);
        const newKeys = config.keys || [];
        const newEnabled = config.enabled !== undefined ? config.enabled : (action ? action.enabled : true);

        if (!action) {
            action = { keys: new Set(), enabled: newEnabled, active: false };
            this._actions.set(actionName, action);
        } else {
            // Удаляем старые привязки
            for (const oldKey of action.keys) {
                const actionsSet = this._keyToActions.get(oldKey);
                if (actionsSet) {
                    actionsSet.delete(actionName);
                    if (actionsSet.size === 0) this._keyToActions.delete(oldKey);
                }
            }
            action.keys.clear();
            action.enabled = newEnabled;
        }

        // Добавляем новые ключи (общая часть)
        for (const keyCode of newKeys) {
            action.keys.add(keyCode);
            if (!this._keyToActions.has(keyCode)) {
                this._keyToActions.set(keyCode, new Set());
            }
            this._keyToActions.get(keyCode).add(actionName);
        }

        // Пересчитываем активность (общая часть)
        const wasActive = action.active;
        const nowActive = [...action.keys].some(code => this._keyStates.get(code));
        action.active = nowActive;

        if (wasActive !== nowActive && action.enabled && this._enabled && this._focused && this._target) {
            const eventType = nowActive ? InputController.ACTION_ACTIVATED : InputController.ACTION_DEACTIVATED;
            this._dispatchEvent(eventType, actionName);
        }
    }
}
        enableAction(actionName) { //() => void
            const action = this._actions.get(actionName)
            if (action) {
                action.enabled = true
            }
        };

        disableAction(actionName) { //() => void
            const action = this._actions.get(actionName)
            if (action) {
                action.enabled = false
            }
        };

        attach(target, dontEnable = false) { //() => void
            if (target === this._target) return
            this.detach()
            this._target = target
            this._addEventListeners()
            if (!dontEnable) {
                this._enabled = true
            }
        };
        detach() { //() => void
            this._removeEventListeners()
            this._target = null
            this._enabled = false
            this._resetAllKeys()
        };

        isActionActive(actionName) { //() => bool
            const action = this._actions.get(actionName)
            return action ? (action.enabled && action.active) : false
        };

        isKeyPressed(keyCode) {
            return this._keyStates.get(keyCode) || false
        };

        get enabled() {
            return this._enabled
        };

        set enabled(value) {
            if (this._enabled === value) return
            this._enabled = value
        };

        get focused() {
            return this._focused
        };

        get ACTION_ACTIVATED() {
            return InputController.ACTION_ACTIVATED
        };

        get ACTION_DEACTIVATED() {
            return InputController.ACTION_DEACTIVATED
        };

        //приватные

        _dispatchEvent(type, actionName) {
            if (!this._target) return
            const event = new CustomEvent(type, { detail: { action: actionName } })
            this._target.dispatchEvent(event)
        };

        _addEventListeners() {
            if (!this._target) return;

            this._listeners.keydown = this._handleKeyDown.bind(this);
            this._listeners.keyup = this._handleKeyUp.bind(this);
            this._listeners.windowBlur = this._handleWindowBlur.bind(this);
            this._listeners.targetBlur = this._handleTargetBlur.bind(this);
            this._listeners.windowFocus = this._handleWindowFocus.bind(this);

            this._target.addEventListener('keydown', this._listeners.keydown);
            this._target.addEventListener('keyup', this._listeners.keyup);
            this._target.addEventListener('blur', this._listeners.targetBlur);
            window.addEventListener('blur', this._listeners.windowBlur);
            window.addEventListener('focus', this._listeners.windowFocus);
        }

        _removeEventListeners() {
            if (this._target) {
                this._target.removeEventListener('keydown', this._listeners.keydown);
                this._target.removeEventListener('keyup', this._listeners.keyup);
                this._target.removeEventListener('blur', this._listeners.targetBlur);
            }
            window.removeEventListener('blur', this._listeners.windowBlur);
            window.removeEventListener('focus', this._listeners.windowFocus);
            this._listeners = {};
        }

        _resetAllKeys() {
            const affectedActions = new Set()
            for (const [keyCode, pressed] of this._keyStates.entries()) {
                if (pressed) {
                    const actionNames = this._keyToActions.get(keyCode)
                    if (actionNames) {
                        for (const name of actionNames) {
                            affectedActions.add(name)
                        }
                    }
                }
            }
            this._keyStates.clear()

            for (const actionName of affectedActions) {
                const action = this._actions.get(actionName)
                if (action) {
                    action.active = false
                }
            }
        };

        _handleKeyDown(event) {
            const keyCode = event.keyCode
            if ([32, 37, 38, 39, 40].includes(keyCode)) {
                event.preventDefault()
            }
            if (this._keyStates.get(keyCode)) return
            this._keyStates.set(keyCode, true)

            const actionNames = this._keyToActions.get(keyCode)
            if (actionNames) {
                for (const actionName of actionNames) {
                    const action = this._actions.get(actionName)
                    if (!action) continue
                    const wasActive = action.active
                    if (!wasActive) {
                        action.active = true
                        if (this._enabled && this._focused && action.enabled) {
                            this._dispatchEvent(InputController.ACTION_ACTIVATED, actionName)
                        }
                    }
                }
            }
        };
        _handleKeyUp(event) {
            const keyCode = event.keyCode
            if ([32, 37, 38, 39, 40].includes(keyCode)) {
                event.preventDefault()
            }
            if (!this._keyStates.get(keyCode)) return
            this._keyStates.set(keyCode, false)

            const actionNames = this._keyToActions.get(keyCode)

            if (actionNames) {
                for (const actionName of actionNames) {
                    const action = this._actions.get(actionName)
                    if (!action) continue
                    const wasActive = action.active
                    const anyKeyPressed = [...action.keys].some(code => this._keyStates.get(code))
                    const newActive = anyKeyPressed;
                    if (wasActive !== newActive) {
                        action.active = newActive
                        if (!newActive && this._enabled && this._focused && action.enabled) {
                            this._dispatchEvent(InputController.ACTION_DEACTIVATED, actionName)
                        }
                    }
                }
            }
        };

        _handleWindowBlur() {
            this._focused = false
            this._resetAllKeys()
        };

        _handleTargetBlur() {
            this._resetAllKeys()
        };

        _handleWindowFocus() {
            this._focused = true
        };
    }
    global.InputController = InputController
})(window)