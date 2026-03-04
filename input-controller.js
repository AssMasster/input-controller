(function(global) {
    'use strict'
    class InputController {
        static get ACTION_ACTIVATED() { return 'input-controller:action-activated' }
        static get ACTION_DEACTIVATED() { return 'input-controller:action-deactivated' }

        _actions = new Map();
        _target = null;
        _enabled = false;
        _focused = true;
        _plugins = [];
        _globalActionStates = new Map()
        _actionEnabled = new Map()
        _actionsConfig = {}
        _pluginCallbackBound = this._pluginCallback.bind(this)

        constructor(actionsToBind = {}, target = null, plugins = []) {
            this._plugins = plugins
            if (actionsToBind) {
                this.bindActions(actionsToBind)
            }
            if (target) {
                this.attach(target)
            }
        };

        bindActions(actionsToBind) {
            this._actionsConfig = actionsToBind
            for (const [actionName, config] of Object.entries(actionsToBind)) {
                const enable = config.enable !== undefined ? config.enable : true;
                this._actionEnabled.set(actionName, enable)
            }

            for (const actionName of this._actionEnabled.keys()) {
                if (!(actionName in actionsToBind)) {
                    this._actionEnabled.delete(actionName)
                }
            }

            for (const plugin of this._plugins) {
                if (plugin.updateConfig) {
                    plugin.updateConfig(actionsToBind) //проблемное место надо доделать
                } else if (this._target) {
                    plugin.destroy()
                    plugin.init(this._target, actionsToBind, this._pluginCallbackBound)
                }
            }

            this._recomputeAllGlobalStates()
        }
        enableAction(actionName) { //() => void
            if (!this._actionEnabled.has(actionName)) {
                return
            }
            const wasEnabled = this._actionEnabled.get(actionName)
            if (wasEnabled) {
                return
            }
            this._actionEnabled.set(actionName, true)

            const globalActive = this._globalActionStates.get(actionName) || false
            if (globalActive && this._enabled && this._focused) {
                this._dispatchEvent(InputController.ACTION_ACTIVATED, actionName)
            }
        };

        disableAction(actionName) { //() => void
            if (!this._actionEnabled.has(actionName)) {
                return
            }
            const wasEnabled = this._actionEnabled.get(actionName)
            if (!wasEnabled) {
                return
            }
            this._actionEnabled.set(actionName, false)
            const globalActive = this._globalActionStates.get(actionName) || false
            if (globalActive && this._enabled && this._focused) {
                this._dispatchEvent(InputController.ACTION_DEACTIVATED, actionName)
            }
        };

        attach(target, dontEnable = false) { //() => void
            if (target === this._target) return
            this.detach()
            this._target = target
            for (const plugin of this._plugins) {
                plugin.init(this._target, this._actionsConfig, this._pluginCallbackBound)
            }
            if (!dontEnable) {
                this._enabled = true
            }
        };
        detach() { //() => void
            for (const plugin of this._plugins) {
                plugin.destroy()
            }
            this._target = null
            this._enabled = false
            this._globalActionStates.clear()
        };

        isActionActive(actionName) { //() => bool
            const globalActive = this._globalActionStates.get(actionName)
            const enabled = this._actionEnabled.get(actionName)
            return globalActive && enabled
        };

        get enabled() {
            return this._enabled
        };

        set enabled(value) {
            if (this._enabled === value) return
            this._enabled = value

            if (value && this._focused) {
                for (const [actionName, globalActive] of this._globalActionStates) {
                    if (globalActive && this._actionEnabled.get(actionName)) {
                        this._dispatchEvent(InputController.ACTION_ACTIVATED, actionName)
                    }
                }
            }
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

        _pluginCallback(actionName) {
            const oldGlobalActive = this._globalActionStates.get(actionName) || false;
            const newGlobalActive = this._computeGlobalActionState(actionName);

            if (newGlobalActive !== oldGlobalActive) {
                this._globalActionStates.set(actionName, newGlobalActive);
                if (this._enabled && this._focused && this._actionEnabled.get(actionName)) {
                    const eventType = newGlobalActive ? InputController.ACTION_ACTIVATED : InputController.ACTION_DEACTIVATED;
                    this._dispatchEvent(eventType, actionName);
                }
            }
        }

        // _pluginCallback(actionName) {
        //     const oldGlobalActive = this._globalActionStates.get(actionName) || false
        //     const newGlobalActive = this._computeGlobalActionState(actionName)
        //     if (newGlobalActive !== oldGlobalActive) {
        //         this._globalActionStates.set(actionName, newGlobalActive)
        //     }
        //     if (this._actionEnabled.get(actionName) && this._focused && this._enabled) {
        //         const eventType = newGlobalActive ?
        //             InputController.ACTION_ACTIVATED :
        //             InputController.ACTION_DEACTIVATED;
        //         this._dispatchEvent(eventType, actionName)
        //     }
        // } 
        
        /* Я протестировал, действительно действие диспатчилось,
         если при зажатой клавише нажать другую активирующую тоже самое действие, более того если зажать две то будет две активации,
         а потом отпустить одну из них то оно активируется третий раз.
         Проблему я решил просто внеся всю логику диспатча внутрь условия newGlobalActive !== oldGlobalActive, 
         таким образом если статус не меняется не важно сколь доаолнительных кнопок мы нажмем диспатча не будетю
        */
        _computeGlobalActionState(actionName) {
            return this._plugins.some(plugin => {
                return plugin.isActionActive(actionName)
            })
        }

        _recomputeAllGlobalStates() {
            for (const actionName of Object.keys(this._actionsConfig)) {
                const oldGlobalActive = this._globalActionStates.get(actionName) || false
                const newGlobalActive = this._computeGlobalActionState(actionName)

                if (newGlobalActive !== oldGlobalActive) {
                    this._globalActionStates.set(actionName, newGlobalActive)
                }
                if (this._focused && this._enabled && this._actionEnabled.get(actionName)) {
                    const eventType = newGlobalActive ?
                        InputController.ACTION_ACTIVATED :
                        InputController.ACTION_DEACTIVATED;
                    this._dispatchEvent(eventType, actionName)
                }
            }
        }



        _dispatchEvent(type, actionName) {
            if (!this._target) return
            const event = new CustomEvent(type, { detail: { action: actionName } })
            this._target.dispatchEvent(event)
        };

        _handleWindowBlur() {
            this._focused = false
        };

        _handleWindowFocus() {
            this._focused = true
            if (this._enabled) {
                for (const [actionName, globalActive] of this._globalActionStates) {
                    if (globalActive && this._actionEnabled.get(actionName)) {
                        this._dispatchEvent(InputController.ACTION_ACTIVATED, actionName)
                    }
                }
            }
        };
    }
    global.InputController = InputController
})(window)