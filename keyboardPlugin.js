(function(global) {
    'use strict';
    class KeyboardPlugin {
        constructor() {
            this._target = null;
            this._notify = null;
            this._actionKeys = new Map(); // actionName -> Set<keyCode>
            this._keyStates = new Map(); // keyCode -> boolean
            this._boundHandlers = {
                keydown: null,
                keyup: null
            };
        }

        init(target, actionsConfig, notify) {
            this._target = target;
            this._notify = notify;
            this._updateMapping(actionsConfig);
            this._addEventListeners();
        }
        updateConfig(actionsConfig) {
            this._updateMapping(actionsConfig);
            this._notifyAllActions();
        }

        destroy() {
            this._removeEventListeners();
            this._target = null;
            this._notify = null;
            this._actionKeys.clear();
            this._keyStates.clear();
        }

        isActionActive(actionName) {
            const keys = this._actionKeys.get(actionName);
            if (!keys) return false;
            for (const keyCode of keys) {
                if (this._keyStates.get(keyCode)) return true;
            }
            return false;
        }

        isKeyPressed(keyCode) {
            return this._keyStates.get(keyCode) || false;
        }

        // приватные

        _updateMapping(actionsConfig) {
            this._actionKeys.clear();
            for (const [actionName, config] of Object.entries(actionsConfig)) {
                // Плагин обрабатывает только действия с полем keys
                if (config.keys && Array.isArray(config.keys)) {
                    this._actionKeys.set(actionName, new Set(config.keys));
                }
            }
        }

        _addEventListeners() {
            if (!this._target) return;

            this._boundHandlers.keydown = this._handleKeyDown.bind(this);
            this._boundHandlers.keyup = this._handleKeyUp.bind(this);

            this._target.addEventListener('keydown', this._boundHandlers.keydown);
            this._target.addEventListener('keyup', this._boundHandlers.keyup);
        }

        _removeEventListeners() {
            if (!this._target) return;

            this._target.removeEventListener('keydown', this._boundHandlers.keydown);
            this._target.removeEventListener('keyup', this._boundHandlers.keyup);

            this._boundHandlers.keydown = null;
            this._boundHandlers.keyup = null;
        }
        _handleKeyDown(event) {
            const keyCode = event.keyCode;
            console.log('keydown', keyCode)
            if ([32, 37, 38, 39, 40].includes(keyCode)) {
                event.preventDefault();
            }

            if (this._keyStates.get(keyCode)) return;

            this._keyStates.set(keyCode, true);

            const affectedActions = this._getActionsByKey(keyCode);
            for (const actionName of affectedActions) {
                if (this._notify) {
                    this._notify(actionName, this.isActionActive(actionName));
                }
            }
        }

        _handleKeyUp(event) {
            const keyCode = event.keyCode;
            if ([32, 37, 38, 39, 40].includes(keyCode)) {
                event.preventDefault();
            }

            if (!this._keyStates.get(keyCode)) return;

            this._keyStates.set(keyCode, false);

            const affectedActions = this._getActionsByKey(keyCode);
            for (const actionName of affectedActions) {
                if (this._notify) {
                    this._notify(actionName, this.isActionActive(actionName));
                }
            }
        }

        _getActionsByKey(keyCode) {
            const result = [];
            for (const [actionName, keys] of this._actionKeys.entries()) {
                if (keys.has(keyCode)) {
                    result.push(actionName);
                }
            }
            return result;
        }

        //уведомляет контроллер о текущем состоянии всех действий.
        _notifyAllActions() {
            if (!this._notify) return;
            for (const actionName of this._actionKeys.keys()) {
                this._notify(actionName, this.isActionActive(actionName));
            }
        }
    }

    global.KeyboardPlugin = KeyboardPlugin;
})(window);