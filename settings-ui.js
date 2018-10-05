// ==UserScript==
// @name     Mangadex Settings
// @version  0.0.1
// @description Settings UI builder for Mangadex userscripts. Should be required by other userscripts.
// @grant    unsafeWindow
// @grant    GM.getValue
// @grant    GM.setValue
// @grant    GM_getValue
// @grant    GM_setValue
// @grant    GM_listValues
// @grant    GM_listValues
// @require  https://cdn.rawgit.com/Christopher-McGinnis/Mangadex-Userscripts/ecfc52fda045b5262562cf6a25423603f1ac5a99/common.js
// @require  https://cdn.rawgit.com/Christopher-McGinnis/Mangadex-Userscripts/ecfc52fda045b5262562cf6a25423603f1ac5a99/uncommon.js
// @match    https://mangadex.org/*
// @author   Christopher McGinnis
// @icon     https://mangadex.org/images/misc/default_brand.png
// @license  MIT
// ==/UserScript==
// Note, above metablock is only processed when installed directly
// Done for debugging purposes
/* eslint no-unused-vars: ["off"] */
/* eslint no-undef: ["off"] */

'use strict'

function createToolTip({ title ,text }) {
  const tooltipElm = htmlToElement(`<div>${title}<br><span>${text}</span></div>`)
  const tooltipText = tooltipElm.children[1]
  tooltipElm.style.display = 'none'
  tooltipElm.style.backgroundColor = 'rgba(15,15,15,0.9)'
  tooltipElm.style.borderRadius = '15px'
  tooltipElm.style.color = 'rgb(215,215,215)'
  tooltipElm.style.left = '0%'
  tooltipElm.style.position = 'absolute'
  tooltipElm.style.zIndex = 10
  tooltipElm.style.textAlign = 'center'
  document.body.appendChild(tooltipElm)
  return {
    tooltip: tooltipElm
    ,text_container: tooltipText
  }
}
// WARNING ALL SETTING UIs MUST BE BUILT SHORTLY AFTER THE USERSCRIPT STARTS!
// We are utilizing the site's own bootstrap jquery based select builder..
// We are fighting a race against time to use it.
// Seems to work fine ATM, so long as we build our UI before doing any processing.
// FIXME There should be a way to add things after it runs. If not, we will have
// to do our own menus. I like the current methd mainly because it uses the sites
// own setting menu elements, so there is no excuse for our users not to know how
// to use them.
// FIXME singlton is only single per userscript. Multiple userscripts against
// multiple versions of this can cause problems. need to stabilize the API And
// then attempt to latch onto the newest version.
// if (typeof window.SettingUI !== 'function') {
// TODO Save
// Should be top down. everything saves to the same monolithic object unless
// they specify a diffrent location. save should only save objects in same
// save location, and should save all of them.
// a save all for saving children who specify diffrent locations as wel to their
// independent storage locations.
// Save should be an overridable function, but there should never be a need to
// override it.
// TODO saveLocation. A simple name for where we save crap. used by the default
// save function.
// TODO autosave: bool. Specifies weather or not we should save after every change
// TODO autosaveDelay: A delay between saves, will NOT save until this much time
// has passed. Sequential autosave triggers will reset the delay.
// NOTE until these are implementecd, you must save manualy. recommened
// passing that in onchange callback.

/**
* SettingsUI singlton
* @param {Object} obj -
* @param {string} obj.groupName - Name of new settings group tab.
* @param {string} [obj.saveLocation] - Optional location to save/load values from. used in calls to GM (get/set)Value
* @returns {SettingsUIInstance} - The UI instance for obj.groupName. Creates new
* instance if one wasn't found.
*/
class SettingsUI {
  // Singlton group
  constructor({
    groupName = throwMissingParam('new SettingsUI' ,'groupName' ,'"SettingGroupName" || "UserscriptName"')
    ,settingsTreeConfig: settingsUiStArgs
  } = {}) {
    let currentID = new Date().valueOf() + Math.floor(Math.random() * 100000)
    function createID(id_prefix = throwMissingArg('createID(id_prefix)' ,'id_prefix' ,'settings.groupName')) {
      // Ensure standard complient. Must begin with a letter.
      return `SettingsUI-id-${id_prefix.toString().replace(/\W/g ,'_')}${currentID++}`
    }
    const xp = new XPath()
    /**
    * A builder for Setting tabs.
    * @returns {SettingsTabBuilder} The new tab builder.
    */
    function SettingsTabBuilder() {
      const sgroup = this
      if (!(sgroup instanceof SettingsTabBuilder)) {
        return new SettingsTabBuilder(...arguments)
      }
      // Get Mangadex Quick Settings Dialog
      const dialog = xp.new('//div[@id="homepage_settings_modal"]/div').with(xp.new().contains('@class' ,'modal-dialog')).getElement()
      const header = xp.new('.//div').with(xp.new().contains('@class' ,'modal-header')).getElement(dialog)
      const modal_body = xp.new('.//div').with(xp.new().contains('@class' ,'modal-body')).getElement(dialog)
      const modal_content = modal_body.parentNode

      // Remove mangadex settings header title. We will use our own version of it.
      header.removeChild(header.children[0])

      // Create new header and tab navigation list
      const header_content = htmlToElement('<div></div>')
      const tab_nav_container = htmlToElement(`
        <div class="h5 d-flex align-items-center">
        <span class="fas fa-cog fa-fw " aria-hidden="true"></span>
        <ul class="nav nav-pills" roll="tablist">

        </ul>
        </div>
      `)
      header_content.appendChild(tab_nav_container)
      header.insertBefore(header_content ,header.children[0])
      const tab_nav = tab_nav_container.children[1]

      // Create new body and tab content containers
      const tab_content = htmlToElement(`
        <div class="tab-content">
        </div>
      `)
      modal_content.insertBefore(tab_content ,modal_body)

      // Define tab/nav creation methods
      sgroup.appendNavItem = ({ title ,active = false ,id }) => {
        const item = htmlToElement(`
        <li class="nav-item ${active ? 'active' : ''}">
          <a data-toggle="tab" role="tab" class="nav-link ${active ? 'active show' : ''}" href="#${escape(id)}">${title}</a>
        </li>`)
        tab_nav.appendChild(item)
      }
      sgroup.appendTabItem = ({ title ,active = false ,id }) => {
        const item = htmlToElement(`
         <div class="modal-body tab-pane ${active ? 'show active' : ''}" role="tabpanel" id="${id}">
         </div>
        `)
        tab_content.appendChild(item)
        return item
      }

      // Unified method for creating tab navs and tab containers.
      /**
      * Adds a settings tab group
      * @param {Object} obj -
      * @param {String} obj.title - Name of new settings group tab.
      * @param {Bool} [obj.active=false] - True only if this tab should be activated by default.
      * @param {String} obj.id - unique id, required for bootstrap tabs to function.
      * @returns {Node} The settings tab node (already attatched to DOM). Add some children to it to build your ui.
      */
      sgroup.addGroup = (args) => {
        sgroup.appendNavItem(args)
        const container = sgroup.appendTabItem(args)
        return container
      }

      // Now that methods are all defined, lets finish initializing.
      // Just need to move Mangadex's settings menu into a tab, so it won't
      // be displayed when we switch to other tabs.
      const mangadex_tab = sgroup.addGroup({
        title: 'Mangadex' ,active: true ,id: createID('mangadex-setting-header-tab-')
      })
      modal_content.removeChild(modal_body)
      for (const child of modal_body.children) {
        mangadex_tab.appendChild(child)
      }

      // sgroup.tabs=tab_content;
      // sgroup.navs=nav_content;
      return sgroup
    }

    /**
     @class SettingsUIInstance
     @private
     @type {Object}
     @property {Object} value - Setting value getter/setter chain.
     */
    function SettingsUIInstance({
      groupName
      ,container = throwMissingParam('new SettingsUIInstance' ,'container' ,'HTML_Node')
      ,settingsTreeConfig: settingsUiInstanceStArgs
    }) {
      const settings = this
      if (!(settings instanceof SettingsUIInstance)) {
        return new SettingsUIInstance(...arguments)
      }
      settings.groupName = groupName
      // Get Mangadex Quick Setting's Container
      const setting_item_id_prefix = `${settings.groupName}-item-`
      function createSettingID() {
        return createID(setting_item_id_prefix)
      }


      /**
      @class SettingsTree
      @private
      @type {Object}
      @property {Object} obj -
      @property {Object} obj.value - Getter/Setter for value of all children.
      @property {Object} obj.all_savable - Getter/Setter for value of all children.
      Like obj.value, but builds a new JSON stringifyable object based on the
      current value. Used for saving/loading to/from JSON.
      @property {Object} obj.own_savable - Like obj.all_savable, but doesn't
      descend on children with diffrent save methods.
      */

      /**
      Setting Tree
      @prop {Object} obj -
      @prop {String} obj.key - Key to use for accessing this setting item in its parent's value list.
      @prop {Object} [obj.defer] - Accessor for parent SettingsTree methods. Used to inherit parrent settings when undefined for [saveLocation,saveMethod,loadMethod,autosave,autosaveDelay].
      @prop {String} [obj.initialValue] - Initial value, does not trigger onchange/update_ui callbacks. Used by leaf nodes.
      @prop {Function} [obj.onchange] - Callback for when the UI changes the value.
      @prop {Function} [obj.updateUiCallback] - Callback for when the value is changed outside the UI.
      @prop {Boolean} [obj.autosave] - Should changes to this setting's value or it's children's value cause this setting group to save? If undefined, it will defer to its parrent tree, or false if it is a root node.
      @prop {String} [obj.saveLocation] - A seperate location to save this setting tree and its children.
      @prop {Function} [obj.saveMethod] - Method used for saving this tree. Called by autosave.
      @prop {Function} [obj.loadMethod] - Method used for loading this tree.
      */
      function SettingsTree({
        key = throwMissingParam('new SettingsTree' ,'key' ,'\'a unique key to access this SettingsTree from its container\'')
        ,onchange = () => null
        ,updateUiCallback = () => null
        ,defer
        ,autosave
        ,autosaveDelay
        ,initialValue
        ,saveLocation
        ,saveMethod
        ,loadMethod
        ,isLeaf = false
      }) {
        const stree = this
        if (!(stree instanceof SettingsTree)) {
          // Your getting an instance wether you like it or not!
          return new SettingsTree(...arguments)
        }
        // Expose tvariables we should be capable of directly altering later
        // stree.key=key;
        stree.autosave = autosave
        stree.autosaveDelay = autosaveDelay

        function defaultLoadMethod() {
          // FIXME: Autoload has a few small issues.
          // 1) we may autosave on load. shouldn't be a big deal, but deffinitly not ideal.
          // 2) we use stree.values, which can load over other save_locations if
          // a child moved save locations. this could cause loaded values from children
          // to be overwritten with old values from before structure change,
          // and then sequentialy be saved. This IS an issue.
          // For the time being, we are safe as long as we only use one save location,
          // or there are no parent save locations.
          if (typeof saveLocation === 'string' && saveLocation.length > 0) {
            return getUserValue(saveLocation ,stree.own_savable).then((obj) => {
              stree.value = obj
              return stree.value
            })
          }
          throw Error(`WARNING! Attempted to load SettingsTree<${key}>, but no saveLocation was set!`)

          // FIXME Should we call onchange here? The user initiated this load, so its
          // possible for them to handle this on their own
          // plus we return a promise they can use as a oneoff onchange event.
        }
        function defaultSaveMethod() {
          if (typeof saveLocation === 'string' && saveLocation.length > 0) {
            return setUserValue(saveLocation ,stree.own_savable)
          }
          throw Error(`WARNING! Attempted to save SettingsTree<${key}>, but no saveLocation was set!`)
        }
        // Allow the child to utilize some of our functions/values when unspecified.
        const ourMethods = {}
        const privateObject = {
          children: {}
          ,autosaveTimeout: undefined
          ,saveMethod
          ,loadMethod
        }
        function getOrDefer(undeferedObject ,deferKey ,defaultValue) {
          if (undeferedObject[deferKey] != null) {
            return undeferedObject[deferKey]
          }
          if (typeof defer === 'object') {
            return defer[deferKey]
          }
          return defaultValue
        }
        function getStorageMethod(storageMethodKey ,defaultMethod) {
          // first try using a defined save method.
          if (typeof privateObject[storageMethodKey] === 'function') {
            return privateObject[storageMethodKey]
          }
          // Use the default save method on us if we save to a new location.
          if (saveLocation != null) {
            return defaultMethod
          }
          // If we are a child, defer to our parent node
          if (typeof defer === 'object') {
            return defer[storageMethodKey]
          }
          // We are a root node without a defined save method nor location.
          // There is no function we can/should return.
          // We wont log this as an error here, instead we do that when we try to call it.
          return defaultMethod
        }
        Object.defineProperties(ourMethods ,{
          autosave: {
            get() {
              return getOrDefer(stree ,'autosave' ,false)
            }
            ,set(val) {
              stree.autosave = val
            }
          }
          ,autosaveDelay: {
            get() {
              return getOrDefer(stree ,'autosaveDelay' ,500)
            }
            ,set(val) {
              stree.autosaveDelay = val
            }
          }
          ,autosaveTimeout: {
            get() {
              // We use the timeout of whoever ownes the save method.
              if (typeof privateObject.saveMethod === 'function') {
                return privateObject.autosaveTimeout
              }
              if (typeof defer === 'object') {
                return defer.autosaveTimeout
              }
              // There is no save method. One will be generated in this root
              // context, so return ours.
              return privateObject.autosaveTimeout
            }
            ,set(val) {
              // We use the timeout of whoever ownes the save method.
              if (typeof privateObject.saveMethod === 'function') {
                return privateObject.autosaveTimeout = val
              }
              if (typeof defer === 'object') {
                return defer.autosaveTimeout = val
              }
              // There is no save method. One will be generated in this root
              // context, so use ours.
              return privateObject.autosaveTimeout = val
            }
          }
          ,saveMethod: {
            get() {
              return getStorageMethod('saveMethod' ,defaultSaveMethod)
            }
            ,set(val) {
              privateObject.saveMethod = val
            }
          }
          ,loadMethod: {
            get() {
              return getStorageMethod('loadMethod' ,defaultLoadMethod)
            }
            ,set(val) {
              privateObject.loadMethod = val
            }
          }
        })
        // FIXME: Ugly patch to permit detecting same save method.
        stree.is_same_method = (parentMethod ,key) => parentMethod === ourMethods[key]

        function autosaveMethod() {
          if (ourMethods.autosave) {
            clearTimeout(ourMethods.autosaveTimeout)
            if (typeof ourMethods.saveMethod === 'function') {
              ourMethods.autosaveTimeout = setTimeout(() => {
                ourMethods.saveMethod()
              } ,ourMethods.autosaveDelay)
            }
          }
        }
        // FIXME: Dont expose. instead, we should present this data the same way we present UI's accessors.
        stree._getMethodTree = (method_name) => {
          const methods = new Set([])
          if (typeof ourMethods[method_name] === 'function') {
            methods.add(ourMethods[method_name])
          }
          for (const [key ,child] of Object.entries(privateObject.children)) {
            child._getMethodTree().forEach((decendentMethod) => {
              methods.add(decendentMethod)
            })
          }
          return methods
        }
        stree.save = () => {
          if (typeof ourMethods.saveMethod === 'function') {
            return ourMethods.saveMethod()
          }
          dbg(`No save method found for ${key}`)
        }
        stree.load = () => {
          if (typeof ourMethods.loadMethod === 'function') {
            // dbg(`Loading ${key}`);
            return ourMethods.loadMethod()
          }
          dbg(`No load method found for ${key}`)
        }
        stree.save_all = () => {
          const methods = stree._getMethodTree('saveMethod')
          // dbg(`Found a total of ${save_methods.size} save methods`);
          methods.forEach((decendentMethod) => {
            decendentMethod()
          })
        }
        stree.load_all = () => {
          const methods = stree._getMethodTree('loadMethod')
          // dbg(`Found a total of ${save_methods.size} save methods`);
          methods.forEach((decendentMethod) => {
            decendentMethod()
          })
        }

        // Private value
        let value
        if (!isLeaf) {
          value = {}
        }
        else if (typeof initialValue !== 'undefined') {
          value = initialValue
        }
        // avoid duplicating code
        function setValueCommon(accessors ,obj ,allowAutosave = true) {
          if (isLeaf) {
            value = obj
          }
          else {
            for (const key of Reflect.ownKeys(obj)) {
              // TODO: Optionaly permit setting non-existant keys.
              // Could be used to auto-build settings ui
              // Or could be used for private/non-ui keys
              if (typeof privateObject.children[key] === 'object') {
                accessors[key] = obj[key]
              }
            }
          }
          if (allowAutosave) {
            autosaveMethod()
          }
        }
        // FIXME block adding new keys to value
        Object.defineProperties(stree ,{
          children: {
            get() {
              // return a copy of children, so we dont accidently try to assign new children..
              const lockedChildren = {}
              Object.assign(lockedChildren ,privateObject.children)
              Object.freeze(lockedChildren)
              return lockedChildren
            }
          }
          ,key: {
            get() {
              return key
            }
          }
          ,value: {
            get() {
              return value
            }
            ,set(val) {
              setValueCommon(stree.value ,val)
              updateUiCallback(val)
              return value
            }
            ,enumerable: true
          }
          // all savables, even ones that save in a diffrent location
          ,all_savable: {
            get() {
              if (isLeaf) {
                return value
              }
              const obj = {}
              for (const [key ,child] of Object.entries(privateObject.children)) {
                obj[key] = child.all_savable
              }
              return obj
            }
            // TODO Throw error on attempt to set to savable
          }
          // a savable with only keys set to be stored in the same saveLocation
          ,own_savable: {
            get() {
              if (isLeaf) {
                return value
              }
              const obj = {}
              for (const [key ,child] of Object.entries(privateObject.children)) {
                // FIXME ugly patch to detect same save methods
                dbg(`Got key <${key}> with SettingsTree`)
                dbg(child)
                if (child.is_same_method(ourMethods.saveMethod ,'saveMethod')) {
                  obj[key] = child.own_savable
                }
              }
              return obj
            }
            // TODO Throw error on attempt to set to savable
          }
          // NOTE quick access method for all_savable.
          // can't justify adding it.
          // Too ambiguous.
          /* savable: {
            get() { return stree.all_savable; },
          }, */
        })
        // Similar to this.value, but for the UI.
        // Not added to settings tree, passed directly to ui for privacy.
        const uiAccessor = { children_accessors: {} }
        Object.defineProperties(uiAccessor ,{
          value: {
            get() {
              if (isLeaf) {
                return value
              }

              return uiAccessor.children_accessors
            }
            ,set(val) {
              setValueCommon(uiAccessor.children_accessors ,val)
              onchange(val)
              return value
            }
          }
        })
        stree.updateUiCallback = updateUiCallback
        if (!isLeaf) {
          function attachChildToTree(childTree ,childUiAccessor) {
            privateObject.children[childTree.key] = childTree
            const desc = Reflect.getOwnPropertyDescriptor(childTree ,'value')
            Object.defineProperty(stree.value ,childTree.key ,desc)
            const uiDesc = Reflect.getOwnPropertyDescriptor(childUiAccessor ,'value')
            Object.defineProperty(uiAccessor.value ,childTree.key ,uiDesc)
            return [childTree ,childUiAccessor]
          }
          stree.createBranch = (args) => {
            const [childTree ,childUiAccessor] = new SettingsTree({
              defer: ourMethods
              ,...args
            })
            return attachChildToTree(childTree ,childUiAccessor)
          }
          stree.createLeaf = (args) => {
            const [childTree ,childUiAccessor] = new SettingsTree({
              // Defaults
              defer: ourMethods
              ,...args
              // Overrides
              ,isLeaf: true
            })
            return attachChildToTree(childTree ,childUiAccessor)
          }
        }
        Object.seal(stree)
        Object.seal(uiAccessor)
        return [stree ,uiAccessor]
      }


      function OptionItem({
        key = throwMissingParam('new OptionItem' ,'key' ,'\'a unique key for this select group\'')
        ,icon
        ,title = key
        ,titleText
        ,value = key
        ,settingsTreeConfig: stArgs
        ,onselect = () => null
        ,ondeselect = () => null
        ,parrentSettingsTree
        ,selectId
        ,selected = false
      }) {
        const item = this
        if (!(item instanceof OptionItem)) {
          return new OptionItem(...arguments)
        }
        item.key = key
        const [settingsTree ,uiAccessor] = parrentSettingsTree.createLeaf({
          key
          ,initialValue: false
          ,...stArgs
          ,updateUiCallback: (newValue) => {
            item.elm.selected = newValue
            // update select picker text
            $(`#${selectId}`).selectpicker('refresh')
            return newValue
          }
        })
        item.settingsTree = settingsTree

        // TODO: Potentialy load settings here.
        const ui = htmlToElement(`
          <li class="${selected ? 'selected' : ''}">
          ${icon ? `<img class="" src="${icon}"/>` : ''}
          <span class="">${title}</span>
          </li>
        `)
        item.elm = htmlToElement(`
          <option  ${selected ? 'selected' : ''} value="${value}"/>${title}</option>
        `)
        // The value in select, usualy a unique index related to the items position in select.
        // Does NOT normaly change
        Object.defineProperties(item ,{
          select_value: {
            get() {
              return item.elm.value
            }
          }
        })

        item.elm.dataset.contents = ui.innerHTML
        item.elm.dataset.optionKey = key

        // callbacks not handled by settings tree
        item.select_callback = (newValue ,oldValue) => {
          onselect(item ,newValue ,oldValue)
        }
        item.deselect_callback = (newValue ,oldValue) => {
          ondeselect(item ,newValue ,oldValue)
        }
        item.change_callback = (newValue ,oldValue) => {
          uiAccessor.value = newValue
        }
        return item
      }

      function Select({
        key = throwMissingParam('new Select' ,'key' ,`'a unique key for settings group <${settings.groupName}>'`)
        ,container = throwMissingParam('new Select' ,'container' ,`'the container element for <${settings.groupName}>'`)
        ,title = key
        ,titleText = title
        ,placeholder = titleText
        ,settingsTreeConfig: stArgs
        ,multiselect = false
        ,parrentSettingsTree = throwMissingParam('new Select' ,'parrentSettingsTree' ,'Container\'s SettingsTree instance')
        ,options = []
      }) {
        const setting = this
        if (!(setting instanceof Select)) {
          return new Select(...arguments)
        }
        setting.key = key
        const [settingsTree ,uiAccessor] = parrentSettingsTree.createBranch({
          key
          ,...stArgs
        })
        setting.settingsTree = settingsTree

        setting.elm = htmlToElement(`<div class="form-group row">
          <label class="col-lg-3 col-form-label-modal">${title}:</label>
          <div class="col-lg-9">
              <select ${multiselect ? 'multiple' : ''} class="form-control selectpicker show-tick" data-actions-box="true" data-selected-text-format="count > 5" data-size="10" title="${titleText}">
              </select>
          </div>
        </div>`)
        setting.label = setting.elm.children[0]
        setting.select = setting.elm.children[1].children[0]
        const id = createSettingID()
        setting.id = id
        setting.select.id = id
        container.appendChild(setting.elm)
        //
        $(`#${id}`).on('changed.bs.select' ,(e ,clickedIndex ,newValue ,oldValue) => {
          // New value is bool related to the changed option . oldValue is array of previously selected options 'value' attribute
          if (typeof clickedIndex === 'number') {
            // setting.select.children[clickedIndex].change_callback(newValue,oldValue);
            const optionKey = setting.select.children[clickedIndex].dataset.optionKey
            uiAccessor.value[optionKey] = newValue
            // setting.options[optionKey].change_callback(newValue);
            if (newValue) {
              setting.options[optionKey].select_callback(newValue ,oldValue)
            }
            else {
              setting.options[optionKey].deselect_callback(newValue ,oldValue)
            }
            // onchange(e,setting,clickedIndex,newValue,oldValue);
            // uiAccessor.value
          }
          else {
            const n = Object.values(setting.select.selectedOptions).map(o => o.dataset.optionKey)
            /* let o = Object.values(oldValue).map( (o) => {
              dbg(o);
              return setting.select.children[o].dataset.optionKey;
            } ); */
            const o = oldValue
            // find diffrences between selected indexes
            n.filter(k => o.indexOf(k) < 0).concat(o.filter(k => n.indexOf(k) < 0)).forEach((changed_key) => {
              // and then set them to their boolean value.
              uiAccessor.value[changed_key] = n.indexOf(changed_key) >= 0
            })
          }
          dbg(setting.select)
        })
        // Contains OptionItem instances
        setting.options = {}
        // Contains OptionItem selected state (getters/setters)

        let lastUsedValue = -1
        function nextOptionValueToUse() {
          return ++lastUsedValue
        }
        setting.addExistingOption = (option) => {
          throwOnBadArg(setting.options[option.key] != null ,'Select.addExistingOption(new Option())' ,'key' ,`a unique key for select group <${setting.key}>` ,option.key)
          // if (setting.options[option.select_value] != null) {
          // dbg("WARNING! Option value reused within Select! Remoing Existing!");
          // setting.select.removeChild(setting.options[option.select_value]);
          // }
          setting.options[option.key] = option
          setting.select.appendChild(option.elm)
          lastUsedValue = option.select_value
        }

        /**
        * Adds an option to a select.
        * @param {Object} obj -
        * @param {String} obj.key - Key to use to access this from value list
        * @param {String} [obj.icon] - Displayed opyion title to use in UI.
        * @param {String} [obj.title=obj.key] - Displayed opyion title to use in UI.
        * @param {String} [obj.value=obj.key] - Value to use in the select node.
        * @param {Function} [obj.onselect] - Callback to call when option is selected.
        * @param {Function} [obj.ondeselect] - Callback to call when option is deselected.
        * @param {Function} [obj.onchange] - Callback to call when option select state is changed.
        * @returns {Node} The settings tab node (already attatched to DOM). Add some children to it to build your ui.
        */
        setting.addOption = (args) => {
          setting.addExistingOption(new OptionItem({
            // value: nextOptionValueToUse(),
            // value: args.key,
            selectId: id
            ,parrentSettingsTree: settingsTree
            ,...args
          }))
        }

        for (const [idx ,option] of options.entries()) {
          setting.addExistingOption(option)
        }
        return setting
      }

      function Textbox({
        key = throwMissingParam('new Textbox' ,'key' ,`'a unique key for settings group <${settings.groupName}>'`)
        ,container = throwMissingParam('new Textbox' ,'container' ,`'the container element for <${settings.groupName}>'`)
        ,title = key
        ,type = 'text'
        ,titleText = title
        ,placeholder = titleText
        ,value
        ,min
        ,max
        ,step
        ,settingsTreeConfig: stArgs
        ,parrentSettingsTree = throwMissingParam('new Textbox' ,'parrentSettingsTree' ,'Container\'s SettingsTree instance')
      }) {
        const setting = this
        if (!(setting instanceof Textbox)) {
          return new Textbox(...arguments)
        }
        setting.key = key
        setting.id = createSettingID()
        setting.elements = {}
        const [settingsTree ,uiAccessor] = parrentSettingsTree.createLeaf({
          key
          ,initialValue: value
          ,updateUiCallback: (newValue) => {
            setting.elements.input.value = newValue
            return newValue
          }
          ,...stArgs
        })
        setting.settingsTree = settingsTree
        setting.elements.root = htmlToElement(`<div id="${setting.id}" class="form-group row">
          <label class="col-lg-3 col-form-label-modal">${title}:</label>
          <div class="col-lg-9">
              <input class="form-control" title="${titleText}" placeholder="${placeholder}" type="${type}"
              ${value != null ? `value="${value}"` : ''}
              ${min != null ? `min="${min}"` : ''}
              ${max != null ? `max="${max}"` : ''}
              ${step != null ? `step="${step}"` : ''}
              >
          </div>
        </div>`)
        setting.elements.label = setting.elements.root.children[0]
        setting.elements.input = setting.elements.root.children[1].children[0]
        // ;[setting.elements.label ,{ children: [setting.elements.input] }] = setting.elements.root.children
        setting.elements.input.onchange = () => {
          uiAccessor.value = setting.elements.input.value
        }
        container.appendChild(setting.elements.root)
        return setting
      }


      settings.subgroup_objects = {}
      settings.subgroup = {}
      const [settingsTree] = new SettingsTree({
        key: groupName
        ,...settingsUiInstanceStArgs
      })

      settings.value = settingsTree.value
      function addSetting(setting) {
        throwOnBadArg(settings.subgroup[setting.key] != null ,'Select.addSetting(new Setting)' ,'key' ,'"UniqueSettingKey"' ,setting.key)
        settings.subgroup_objects[setting.key] = setting
        // if (setting.options[option.select_value] != null) {
        // dbg("WARNING! Option value reused within Select! Remoing Existing!");
        // setting.select.removeChild(setting.options[option.select_value]);
        // }
      }

      settings.addMultiselect = (args) => {
        const setting = new Select({
          multiselect: true
          ,container
          ,parrentSettingsTree: settingsTree
          ,...args
        })
        addSetting(setting)
        return setting
      }

      /**
      * Adds an option to a select.
      * @param {Object} obj -
      * @param {String} [obj.key] - Key to use to access this from value list
      * @param {Bool} [obj.multiselect=false] - True if multiple options may be selected at the same time.
      * @param {String} [obj.title=obj.key] - text to use for label in the UI.
      * @param {Function} [obj.onchange] - Callback to call when select state is changed. ie. when any option is selected/deselected.
      * @returns {Select} Select setting instance.
      */
      settings.addSelect = (args) => {
        const setting = new Select({
          container
          ,parrentSettingsTree: settingsTree
          ,...args
        })
        addSetting(setting)
        return setting
      }

      settings.addTextbox = (args) => {
        const setting = new Textbox({
          container
          ,parrentSettingsTree: settingsTree
          ,...args
        })
        addSetting(setting)
        return setting
      }

      settings.settingsTree = settingsTree
      return settings
    }
    // END SelectUIInstance
    // Actual constructor below
    if (!SettingsUI.instance) {
      SettingsUI.instance = this
      SettingsUI.instance.groups = []
      SettingsUI.tab_builder = new SettingsTabBuilder()
    }
    // Create the group if it doesnt exist
    if (!SettingsUI.instance.groups[groupName]) {
      const groupId = createID(`${groupName}-tab-`)
      const container = SettingsUI.tab_builder.addGroup({
        title: groupName ,id: groupId
      })
      SettingsUI.instance.groups[groupName] = new SettingsUIInstance({
        groupName
        ,container
        ,settingsTreeConfig: settingsUiStArgs
      })
    }
    // Return the requested group instance.
    const settings = SettingsUI.instance.groups[groupName]
    return settings
  }
}

// Simple usage example. Also used for testing functionality.
function example() {
  // Create a new setting tab with the label <Advanced Filter>.
  const settingsUi = new SettingsUI({
    groupName: 'Advanced Filter'
    ,settingsTreeConfig: { saveLocation: 'FilterSettings' }
  })
  // Create a new multiselect with the label <NSFW tags>, accessible from the settings tree via the key <nsfw_tags>.
  const selectNsfw = settingsUi.addMultiselect({
    key: 'nsfw_tags' ,title: 'NSFW tags'
  })
  // Add an option labeled <Echi> to the multiselect. Accessible from the settings tree via the <echi> key.
  selectNsfw.addOption({
    title: 'Echi' ,key: 'echi' ,settingsTreeConfig: { autosave: true }
  })
  // title is optional. Defaults to key value.
  // Add an option labeled <Smut> to the multiselect. Accessible from the settings tree via the <Smut> key.
  selectNsfw.addOption({
    key: 'Smut'
    ,settingsTreeConfig: { saveLocation: 'SmutIsSpecial' } // NOTE, autosave is off
  })
  // Optional callbacks for select, deselct, and toggle.
  selectNsfw.addOption({
    key: 'NSFW'
    ,settingsTreeConfig: {
      onchange: (item ,value) => {
        dbg('Doing something everytime NSFW value changes.')
        dbg(`In this case, printg the new value <${value}> on the console`)
      }
    }
    ,onselect: (item ,value) => {
      dbg('We could also listen to only select events')
    }
    ,ondeselect: (item ,value) => {
      dbg('We could also listen to only deselect events')
    }
  })
  // Create another multiselect
  const block_mulsel = settingsUi.addMultiselect({
    key: 'blocked' ,title: 'Blacklist' ,autosave: true
  })
  // Create a bunch of options with the same callbacks.
  for (const [idx ,name] of ['yaoi' ,'sports' ,'mecha' ,'no chapters'].entries()) {
    const item = block_mulsel.addOption({
      title: name
      ,key: name
      ,settingsTreeConfig: {
        onchange: (value) => {
          // Do something
          dbg(`Changed <${name}> to <${value}>`)
          dbg(value)
        }
      }
      ,onselect: (item ,value) => {
        // Do something
        dbg(`Selected <${name}>`)
        dbg(value)
      }
      ,ondeselect: (item ,value) => {
        // Do something
        dbg(`Deselected <${name}>`)
        dbg(value)
      }
    })
  }
  // Great! Now everything was just built into our settings tree.
  // Now we just need a refrence to the value getter, which is stored in our
  // setting tree
  const settings = settingsUi.settingsTree.value
  // settings now refers to our settings getter. You can now access or change
  // the current state by changing the relavent key in settings.

  // Check if yaoi is blocked.
  dbg('Check if yaoi is blocked')
  dbg(settingsUi.settingsTree.all_savable)
  dbg(settings.blocked.yaoi)
  // Change value from outside ui. UI will update to reflect the new value.
  // Block yaoi.
  dbg('Blocked yaoi. Checking new value')
  settings.blocked.yaoi = true
  dbg(settings.blocked.yaoi)

  // Get value from Blacklist every 5 seconds.
  // Prove that all our easy methods for accessing/setting state stay in sync with the ui.
  // Try changing the value from the ui and see what we print.

  // Export settingsUi for playing with in the console.
  settingsUi.list_all_values = () => new Promise((r ,e) => {
    const gm_values = GM_listValues()
    const length = gm_values.length
    for (const v of Object.values(gm_values)) {
      console.log(`${v} = ${GM_getValue(v ,undefined)}`) // + ' = ' +  GM_getValue(arry[p]) );
    }
  })
  setInterval(() => {
    // these should all print the same thing
    dbg(settingsUi.settingsTree.value.blocked.yaoi)
    // note value is a refrence to settingsTree.value
    // dbg(settingsUi.value.blocked.yaoi);
    dbg(settings.blocked.yaoi)
    dbg(block_mulsel.settingsTree.value.yaoi)
    settingsUi.list_all_values()
    // dbg(block_mulsel.value.yaoi);
  } ,5000)

  // NOTE:
  // SettingsTree.value reutrns getters/setters tree.
  // Refrences can be made to any non-leaf node without becoming detatched from
  // the SettingsTree.
  // These of these are bound to the SettingsTree
  const st_a = settingsUi.settingsTree.value.blocked
  const st_b = settings.blocked
  const st_c = st_b

  // Leaf nodes return actual value, not accessors. So refrences to them will
  // not be bound to the setting tree.
  // In our example, All of these would be leaf nodes.
  // As such, assignments to the new leaf_* variables will not affect the SettingsTree.
  const leaf_a = settingsUi.settingsTree.value.blocked.sports
  const leaf_b = settings.blocked.sports
  const leaf_c = st_b.sports
  // This is only usefull for caching the value of the leaf to ensure that changes to it
  // do not affect an operation. If you don't need to cache the value
  // I recomend to always refrence the leaf through the parent tree.
  // This will help avoid


  // settingsTree.value is a tree of getters/setters.
  // If we want a snapshot of the current value, we need to use
  // settingsTree.all_savable instead.
  // savable is usefull for encoding an entire tree or subtree to JSON, or
  // printing a tree to screen.
  // As a demo, first lets look at what value gives you on a tree
  dbg('settingsTree.value is nothing but getters/setters')
  dbg(settingsUi.settingsTree.value)
  // Next lets print the savable.
  dbg('settingsTree.all_savable accesses value, calling the getters and yielding a snapshot of the current value.')
  dbg(settingsUi.settingsTree.all_savable)
  dbg('all_savable returns a snapshot of all children, regardless of their save method.')
  dbg(selectNsfw.settingsTree.all_savable)
  dbg('own_savable returns a snapshot containing only children with the same save method.')
  dbg(selectNsfw.settingsTree.own_savable)
  // You can also assign to value. If you assigning an object to value
  // we will descend the object and setting tree by the shared key, when we
  // encounter a leaf node, we will assign it the object/value that shares its
  // key instead of descending. Any keys in object that do not have a
  // corasponging setting tree value will be skipped.
  settingsUi.value = { blocked: { sports: true } }

  // Since savable is a snapshot, getting the value and then asigning to the
  // keys of the result will not affect the ui or setting tree.
  // DO NOT TRY THIS
  dbg('Savable getter returns a snapshot. Assignments to the snapshot can NOT be used to change the settingsTree value')
  // DO NOT TRY THIS.
  let savable = settingsUi.settingsTree.all_savable
  // DO NOT TRY THIS. Sports will not update on the UI nor settings tree. Replaces with value instead
  savable.blocked.sports = true
  // DO NOT TRY THIS. Sports will not update on the UI nor settings tree. Replaces with value instead
  savable = { blocked: { sports: true } }
  dbg('blocked.sports was not updated in settings tree, because assignment occured on a snapshot object, completly detatched from the settings tree.')
  dbg(settingsUi.settingsTree.all_savable)
  // TL;DR settingsTree.value returns getters/setters attatched to the tree.
  // savable returns an object with a snapshot of the value, but completly detatched from the tree.

  unsafeWindow.settingsUi = settingsUi
}

/*
let xp = new XPath();
waitForElementByXpath({
  xpath:'//div[@id="homepage_settings_modal"]/div',
}).then(example);
*/
