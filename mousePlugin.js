(function(global) {
    'use strict';

    class MousePlugin {
        constructor() {
            this._target = null;
            this._notify = null;
            this._actionButtons = new Map(); // actionName -> button number (один или несколько)
            this._buttonStates = new Map(); // button -> boolean
            this._boundHandlers = {
                mousedown: null,
                mouseup: null
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
            this._actionButtons.clear();
            this._buttonStates.clear();
        }

        isActionActive(actionName) {
            const button = this._actionButtons.get(actionName);
            if (button === undefined) return false;
            // Можно несколько кнопок
            return this._buttonStates.get(button) || false;
        }


        isKeyPressed(button) {
            return this._buttonStates.get(button) || false;
        }

        // приватные

        _updateMapping(actionsConfig) {
            this._actionButtons.clear();
            for (const [actionName, config] of Object.entries(actionsConfig)) {
                if (config.mouse && typeof config.mouse.button === 'number') {
                    this._actionButtons.set(actionName, config.mouse.button);
                }
                // можно расширить если config.mouse.buttons будет массив
            }
        }

        _addEventListeners() {
            const listenTarget = this._target;
            this._boundHandlers.mousedown = this._handleMouseDown.bind(this);
            this._boundHandlers.mouseup = this._handleMouseUp.bind(this);

            listenTarget.addEventListener('mousedown', this._boundHandlers.mousedown);
            listenTarget.addEventListener('mouseup', this._boundHandlers.mouseup);
        }

        _removeEventListeners() {
            const listenTarget = window;
            listenTarget.removeEventListener('mousedown', this._boundHandlers.mousedown);
            listenTarget.removeEventListener('mouseup', this._boundHandlers.mouseup);

            this._boundHandlers.mousedown = null;
            this._boundHandlers.mouseup = null;
        }

        _handleMouseDown(event) {
            const button = event.button;
            if (this._buttonStates.get(button)) return;
            this._buttonStates.set(button, true);
            const affectedActions = this._getActionsByButton(button);
            for (const actionName of affectedActions) {
                if (this._notify) {
                    this._notify(actionName, true);
                }
            }
        }

        _handleMouseUp(event) {
            const button = event.button;
            if (!this._buttonStates.get(button)) return;
            this._buttonStates.set(button, false);

            const affectedActions = this._getActionsByButton(button);
            for (const actionName of affectedActions) {
                if (this._notify) {
                    this._notify(actionName, false);
                }
            }
        }

        _getActionsByButton(button) {
            const result = [];
            for (const [actionName, btn] of this._actionButtons.entries()) {
                if (btn === button) result.push(actionName);
            }
            return result;
        }

        _notifyAllActions() {
            if (!this._notify) return;
            for (const actionName of this._actionButtons.keys()) {
                this._notify(actionName, this.isActionActive(actionName));
            }
        }
    }

    global.MousePlugin = MousePlugin;
})(window);