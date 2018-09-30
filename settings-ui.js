// ==UserScript==
// @name     Mangadex Settings
// @version  0.0.1
// @description Settings UI builder for Mangadex userscripts. Should be required by other userscripts.
// @grant    unsafeWindow
// @grant    GM.getValue
// @grant    GM.setValue
// @grant    GM_getValue
// @grant    GM_setValue
// @require  https://cdn.rawgit.com/Brandon-Beck/Mangadex-Userscripts/54480aaaab13c3e421d0cd1d7fd25589aad5dcb9/common.js
// @match    https://mangadex.org/*
// @author   Brandon Beck
// @icon     https://mangadex.org/images/misc/default_brand.png?1
// @license  MIT
// ==/UserScript==
// Note, above metablock is only processed when installed directly
// Done for debugging purposes
"use strict";

function createToolTip({title,text}) {
  let tooltip_elm = htmlToElement(`<div>${title}<br><span>${text}</span></div>`);
  let tooltip_text = tooltip_elm.children[1];
  tooltip_elm.style.display="none";
  tooltip_elm.style.backgroundColor="rgba(15,15,15,0.9)";
  tooltip_elm.style.borderRadius="15px";
  tooltip_elm.style.color="rgb(215,215,215)";
  tooltip_elm.style.left="0%";
  tooltip_elm.style.position="absolute";
  tooltip_elm.style.zIndex=10;
  tooltip_elm.style.textAlign="center";
  document.body.appendChild(tooltip_elm);
  return {
    tooltip:tooltip_elm,
    text_container:tooltip_text
  };
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
// TODO save_location. A simple name for where we save crap. used by the default
// save function.
// TODO autosave: bool. Specifies weather or not we should save after every change
// TODO autosave_delay: A delay between saves, will NOT save until this much time
// has passed. Sequential autosave triggers will reset the delay.
// NOTE until these are implementecd, you must save manualy. recommened
// passing that in onchange callback.

/**
* SettingsUI singlton
* @param {Object} obj -
* @param {string} obj.group_name - Name of new settings group tab.
* @returns {SettingsUIInstance} - The UI instance for obj.group_name. Creates new
* instance if one wasn't found.
*/
class SettingsUI {
  // Singlton group
  constructor({
    group_name=throwMissingParam("new SettingsUI","group_name",'"SettingGroupName" || "UserscriptName"')
  }={}) {
    let currentID=new Date().valueOf() + Math.floor(Math.random() * 100000);
    function createID(id_prefix=throwMissingArg('createID(id_prefix)','id_prefix','settings.group_name')) {
      return id_prefix + (currentID++);
    }
    let xp = new XPath();
    /**
    * A builder for Setting tabs.
    * @returns {SettingsTabBuilder} The new tab builder.
    */
    function SettingsTabBuilder() {
      let sgroup = this;
      if (!( sgroup instanceof SettingsTabBuilder) ) {
          return new SettingsTabBuilder(...arguments);
      }
      // Get Mangadex Quick Settings Dialog
      let dialog=xp.new('//div[@id="homepage_settings_modal"]/div').with(xp.new().contains('@class','modal-dialog')).getElement();
      let header=xp.new('.//div').with(xp.new().contains('@class','modal-header')).getElement(dialog);
      let modal_body=xp.new('.//div').with(xp.new().contains('@class','modal-body')).getElement(dialog);
      let modal_content=modal_body.parentNode;

      // Remove mangadex settings header title. We will use our own version of it.
      header.removeChild(header.children[0]);

      // Create new header and tab navigation list
      let header_content=htmlToElement(`<div></div>`);
      let tab_nav_container=htmlToElement(`
        <div class="h5 d-flex align-items-center">
        <span class="fas fa-cog fa-fw " aria-hidden="true"></span>
        <ul class="nav nav-pills" roll="tablist">

        </ul>
        </div>
      `);
      header_content.appendChild(tab_nav_container);
      header.insertBefore(header_content,header.children[0]);
      let tab_nav=tab_nav_container.children[1];

      // Create new body and tab content containers
      let tab_content = htmlToElement(`
        <div class="tab-content">
        </div>
      `);
      modal_content.insertBefore(tab_content,modal_body);

      // Define tab/nav creation methods
      sgroup.appendNavItem = ({title,active=false,id}) => {
        let item=htmlToElement(`
        <li class="nav-item ${active ? "active" : "" }">
          <a data-toggle="tab" role="tab" class="nav-link ${active ? "active show" : "" }" href="#${id}">${title}</a>
        </li>`);
        tab_nav.appendChild(item);
      };
      sgroup.appendTabItem = ({title,active=false,id}) => {
        let item = htmlToElement(`
         <div class="modal-body tab-pane ${active ? "show active" : "" }" role="tabpanel" id=${id}>
         </div>
        `);
        tab_content.appendChild(item);
        return item;
      };

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
        sgroup.appendNavItem(args);
        let container = sgroup.appendTabItem(args);
        return container;
      };

      // Now that methods are all defined, lets finish initializing.
      // Just need to move Mangadex's settings menu into a tab, so it won't
      // be displayed when we switch to other tabs.
      let mangadex_tab = sgroup.addGroup({title:"Mangadex", active:true, id: createID('mangadex-setting-header-tab-')});
      modal_content.removeChild(modal_body);
      for (let child of modal_body.children) {
        mangadex_tab.appendChild(child);
      }

      //sgroup.tabs=tab_content;
      //sgroup.navs=nav_content;
      return sgroup;
    }

    /**
     @class SettingsUIInstance
     @private
     @type {Object}
     @property {Object} values - Setting Values getter/setter chain.
     */
    function SettingsUIInstance({group_name,container=throwMissingParam("new SettingsUIInstance","container","HTML_Node")}) {
      let settings = this;
      if (!( settings instanceof SettingsUIInstance) ) {
          return new SettingsUIInstance(...arguments);
      }
      settings.group_name=group_name;
      // Get Mangadex Quick Setting's Container
      let setting_item_id_prefix=settings.group_name + "-item-";
      function createSettingID() {
        return createID(setting_item_id_prefix);
      }
      /**
      @class SettingTree
      @private
      @type {Object}
      @property {Object} obj -
      @property {String} obj.key - Key to use for accessing this setting item in its parent's values list.
      @property {Boolean} [obj.autosave=false] - Should changes to this setting's value or it's children's values cause this setting group to save? Setting is applied recursivly to children which don't define it.
      @property {String} [obj.save_location] - A seperate location to save this setting tree and its children.
      @property {Function} [obj.save_method] - Method used for saving this value. Called by autosave.
      */
      function SettingTree({
        key=throwMissingParam("new SettingTree","key",`'a unique key to access this SettingTree from its container'`),
        autosave=false,
        save_location,
        save_method,
      }){
        let stree = this;
        if (!( stree instanceof SettingTree) ) {
          // Your getting an instance wether you like it or not!
          return new SettingTree(...arguments);
        }
        stree.key=key;
        stree.autosave=autosave;
        function defaultSaveMethod() {
          if (save_method) {
            save_method(save_location);
          }
          else if (save_location) {

          }
        }
      }
      function OptionItem({
        key=throwMissingParam("new OptionItem","key",`'a unique key for this select group'`),
        icon,
        title=key,
        title_text,
        value=key,
        autosave=false,
        save = ({obj,key}) => {
          return null;
        },
        onselect = () => {return null;},
        onchange = () => {return null;},
        ondeselect = () => {return null;},
        selected=false
      }) {
        let item = this;
        if (!( item instanceof OptionItem) ) {
            return new OptionItem(...arguments);
        }
        item.key=key;
        let ui = htmlToElement(`
          <li class="${selected ? "selected" : ""}">
          ${icon ? `<img class="" src="${icon}"/>` : "" }
          <span class="">${title}</span>
          </li>
        `);
        item.elm=htmlToElement(`
          <option  ${selected ? "selected" : "" } value="${value}"/>${title}</option>
        `);
        // The value in select, usualy a unique index related to the items position in select.
        // Does NOT normaly change
        let enabled=selected;
        Object.defineProperties(item,{
          'select_value': {
            get() { return item.elm.value; },
          },
          'enabled': {
            get() { return enabled; },
            set(new_value) {
              enabled=new_value;
              item.elm.selected=new_value;
              return new_value; },
          },
          /*value: { // same as enabled
            get() { return item.enabled; },
            set(new_value) { return item.enabled=new_value; },
          },*/
          savable: {
            get() {
              return item.enabled;
            },
            set(obj) {
              return item.enabled=obj;
            },
          },
        });
        // Boolean value programmer is interested in.
        // TODO veriffy this works
        item.elm.dataset.contents = ui.innerHTML;
        item.elm.select_callback   = (new_value,old_value) => {
          onselect(item,new_value,old_value);
        };
        item.elm.deselect_callback = (new_value,old_value) => {
          ondeselect(item,new_value,old_value);
        };
        item.elm.change_callback = (new_value,old_value) => {
          enabled=new_value;
          onchange(item,new_value,old_value);
        };
        return item;
      };

      function Select({
        key=throwMissingParam("new Select","key",`'a unique key for settings group <${settings.group_name}>'`),
        container=throwMissingParam("new Select","container",`'the container element for <${settings.group_name}>'`),
        title = key,
        title_text,
        multiselect=false,
        onchange = () => {return null;},
        options=[],
      }) {
        let setting = this;
        if (!( setting instanceof Select) ) {
            return new Select(...arguments);
        }
        setting.key=key;
        setting.elm = htmlToElement(`<div class="form-group row">
    			<label class="col-lg-3 col-form-label-modal">${title}:</label>
    			<div class="col-lg-9">
              <select ${ multiselect ? "multiple" : ""} class="form-control selectpicker show-tick" data-actions-box="true" data-selected-text-format="count > 5" data-size="10" title="${title}">
              </select>
          </div>
        </div>`);
        setting.label=setting.elm.children[0];
        setting.select=setting.elm.children[1].children[0];
        let id=createSettingID();
        setting.id=id;
        setting.select.id=id;
        container.appendChild(setting.elm);
        $('#' + id ).on("changed.bs.select",function (e,clickedIndex,newValue,oldValue) {
            // New value is bool. oldValue is... array with random crap... for some reason....
            setting.select.children[clickedIndex].change_callback(newValue,oldValue);
            if (newValue) {
              setting.select.children[clickedIndex].select_callback(newValue,oldValue);
            }
            else {
              setting.select.children[clickedIndex].deselect_callback(newValue,oldValue);
            }
            onchange(e,setting,clickedIndex,newValue,oldValue);
        });
        // Contains OptionItem instances
        setting.options={};
        // Contains OptionItem selected state (getters/setters)
        setting.values={};
        let last_used_value = -1;
        function nextOptionValueToUse() {
          return ++last_used_value;
        }
        setting.addExistingOption = (option) => {
          throwOnBadArg(setting.options[option.key] != null,"Select.addExistingOption(new Option())","key", `a unique key for select group <${setting.key}>`,option.key);
          //if (setting.options[option.select_value] != null) {
            //dbg("WARNING! Option value reused within Select! Remoing Existing!");
            //setting.select.removeChild(setting.options[option.select_value]);
          //}
          setting.options[option.key] = option;
          Object.defineProperty(setting.values, option.key,{
            get() {
              return option.enabled;
            },
            set(val) {
              return option.enabled=val;
            },
            enumerable: true,
          });
          setting.select.appendChild(option.elm);
          last_used_value=option.select_value;
        };

        /**
        * Adds an option to a select.
        * @param {Object} obj -
        * @param {String} obj.key - Key to use to access this from values list
        * @param {String} [obj.icon] - Displayed opyion title to use in UI.
        * @param {String} [obj.title=obj.key] - Displayed opyion title to use in UI.
        * @param {String} [obj.value=obj.key] - Value to use in the select node.
        * @param {Function} [obj.onselect] - Callback to call when option is selected.
        * @param {Function} [obj.ondeselect] - Callback to call when option is deselected.
        * @param {Function} [obj.onchange] - Callback to call when option select state is changed.
        * @returns {Node} The settings tab node (already attatched to DOM). Add some children to it to build your ui.
        */
        setting.addOption = (args) => {
          setting.addExistingOption(new OptionItem({value: nextOptionValueToUse(), ...args}));
        };

        for (let [idx,option] of options.entries()) {
          setting.addExistingOption(option);
        }

        Object.defineProperties(setting,{
          savable: {
            get() {
              let obj = {};
              //for (let key of Reflect.ownKeys(setting.values)) {
              for (let [key,val] of Object.entries(setting.values)) {
                obj[key]=val;
              }
              return obj;
            },
            set(obj) {
              for (let key of Reflect.ownKeys(obj)) {
                setting.values[key]=obj[key];
              }
              //return setting.values;
              return true;
            },
          },
        });
        return setting;
      };
      settings.subgroup_objects={};
      settings.subgroup={};

      settings.values=settings.subgroup;
      function addSetting(setting) {
        throwOnBadArg(settings.subgroup[setting.key] != null,"Select.addSetting(new Setting)","key",'"UniqueSettingKey"',setting.key);
        settings.subgroup_objects[setting.key]=setting;
        //if (setting.options[option.select_value] != null) {
          //dbg("WARNING! Option value reused within Select! Remoing Existing!");
          //setting.select.removeChild(setting.options[option.select_value]);
        //}
        Reflect.defineProperty(settings.subgroup, setting.key,{
          enumerable:true,
          get() {
            return setting.values;
          },
          // FIXME support non-multiselect
          set(val) {
            return setting.savable=val;
          },
        });
      }
      settings.addMultiselect = (args) => {
        let setting = new Select({multiselect:true,container:container,...args});
        addSetting(setting);
        return setting;
      };

      /**
      * Adds an option to a select.
      * @param {Object} obj -
      * @param {String} [obj.key] - Key to use to access this from values list
      * @param {Bool} [obj.multiselect=false] - True if multiple options may be selected at the same time.
      * @param {String} [obj.title=obj.key] - text to use for label in the UI.
      * @param {Function} [obj.onchange] - Callback to call when select state is changed. ie. when any option is selected/deselected.
      * @returns {Select} Select setting instance.
      */
      settings.addSelect = (args) => {
        let setting = new Select({container:container,...args});
        addSetting(setting);
        return setting;
      };
      Object.defineProperties(settings,{
        savable: {
          get() {
            let obj = {};
            //for (let key of Reflect.ownKeys(setting.values)) {
            for (let [key,val] of Object.entries(settings.subgroup_objects)) {
              obj[key]=val.savable;
            }
            return obj;
          },
          set(obj) {
            for (let [key,val] of Object.entries(obj)) {
              settings.values[key]=val;
            }
            //return setting.values;
            return true;
          },
        },
      });
      return settings;
    }
    // END SelectUIInstance
    // Actual constructor below
    if (! SettingsUI.instance ) {
      SettingsUI.instance = this;
      SettingsUI.instance.groups=[];
      SettingsUI.tab_builder = new SettingsTabBuilder();
    }
    // Create the group if it doesnt exist
    if (!SettingsUI.instance.groups[group_name]) {
      let group_id=createID(group_name + '-tab-');
      let container = SettingsUI.tab_builder.addGroup({title:group_name, id:group_id});
      SettingsUI.instance.groups[group_name]=new SettingsUIInstance({group_name:group_name,container:container});
    }
    // Return the requested group instance.
    let settings = SettingsUI.instance.groups[group_name];
    return settings;
  }
}

// Simple usage example. Also used for testing functionality.
function example() {
  let settings_ui = new SettingsUI({group_name:"AdvancedFilter"});
  let block_mulsel = settings_ui.addMultiselect({key:"blocked", title:"Blacklist", autosave:true});
  for (let [idx,o] of ["adventure", "isekai", "drama","fake genre"].entries()) {
    let item = block_mulsel.addOption({
      title: o,
      key: o, // key will also be the unique genre name. could be anything, but this makes it easier to manualy refer to.
      ontoggle: (item,value) => {
        // Do something
        dbg(item);
        dbg(value);
        dbg("changed!");
      },
      onselect: (item,value) => {
        // Do something
        dbg(item);
        dbg(value);
        dbg("NOW SELECTED!");
      },
      ondeselect: (item,value) => {
        // Do something
        dbg(item);
        dbg(value);
        dbg("NOW NOT SELECTED!");
      }
    });
  }
  // title is optional. Defaults to key value.
  let selectAuto = settings_ui.addMultiselect({key:"Autocomplete"});
  selectAuto.addOption({key:"Manga", autosave:true});
  selectAuto.addOption({key:"Users"});
  let settings = settings_ui.values;
  // Get value from Blacklist every 5 seconds.
  dbg("Settings");
  dbg(settings_ui.savable);
  dbg("Select");
  dbg(selectAuto.savable);
  settings_ui.savable={blocked:{adventure:true}};
  // Prove that all our easy methods for accessing/setting state stay in sync with the ui.
  setInterval(() => {
    dbg(settings_ui.values.blocked.adventure);
    dbg(settings.blocked.adventure);
    dbg(block_mulsel.values.adventure);
  },5000);
}
/*
let xp = new XPath();
waitForElementByXpath({
  xpath:'//div[@id="homepage_settings_modal"]/div',
}).then(example);
*/
