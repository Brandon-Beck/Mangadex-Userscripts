// ==UserScript==
// @name     Mangadex Post Autocomplete
// @description Autocompletes @Usernames in posts.
// @namespace https://github.com/Brandon-Beck
// @version  0.0.1
// @grant    unsafeWindow
// @grant    GM.getValue
// @grant    GM.setValue
// @grant    GM_getValue
// @grant    GM_setValue
// @require  https://greasyfork.org/scripts/372223-mangadex-common/code/Mangadex%20Common.js
// @require  https://raw.githubusercontent.com/component/textarea-caret-position/master/index.js
// @match    https://mangadex.org/*
// ==/UserScript==
let xp = new XPath();
let posts=xp.new('//tr').with(xp.new().contains('@class','post'));

// userid = Your user ID
function UserHistory({read_posts_history=[],user_id,username}={}) {
  let uhist = this;
  if (!( uhist instanceof UserHistory) ) {
	    return new UserHistory();
	}
  function clipText(text,max_length){
       return (text.length > max_length) ? text.substr(0, max_length - 1) + '&hellip;' : text;
  };
  let cleanupHistory= () => {
    if (this.history.size > this.max_size){
      //delete(this.history.entries().next().value[0]);
      this.history.shift();
    }
  };
  this.user_id=user_id;
  this.username=""; // get from userid
  this.max_size=200;
  this.history=read_posts_history;
  /*  postid: {
      userid,
      username,
      userimg,
      excerpt,
    }*/
  this.push = (post)=> {
    let post_id=parseInt(post.id.replace(/^post_/,''));

    //this.history.delete(post_id);
    //this.history.set(post_id,{user_id:user_id,user_img:user_img,excerpt:excerpt});

    //this.history.filter((e)=> { e.thread_id === thread_id } );

    function array_move(arr, old_index, new_index) {
      arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
      return arr;
    };
    let exists=false;
    this.history.some((e,k) => {
      if (e.post_id === post_id) {
        exists=true;
        array_move(this.history,k,0)
        return true;
      }
      return false;
    });
    if (exists) {
      return false;
    }
    let thread=xp.new('./td/span/a').with( xp.new('preceding-sibling::span').with(xp.new().contains('@class','fa-clock')) ).getElement(post).href;
    let thread_id = parseInt(thread.match(/\/thread\/(\d+)\//)[1]);
    let user=xp.new('./td/a[starts-with(@href,"/user/")]').getElement(post);
    let user_name=user.textContent;
    let user_id=parseInt(user.href.match(/\/user\/(\d+)\//)[1]);
    let user_img=xp.new('./td/img').with(xp.new().contains('@class','avatar')).getElement(post).src;
    let postContents=xp.new('./td/div').with('preceding-sibling::hr').getElement(post);
    let did_mention=Boolean(xp.new(`.//a[@href="https://mangadex.org/user/${uhist.user_id}"]`).getElement(postContents));
    let excerpt=clipText(xp.new('./td/div').with('preceding-sibling::hr').getElement(post).textContent,100);
    this.history.push({thread_id:thread_id,user_name:user_name,did_mention:did_mention,post_id:post_id,user_id:user_id,user_img:user_img,excerpt:excerpt});
    cleanupHistory();
  };
  this.oldautoComplete = (partial_name,{thread_id=0,case_sensitive=false,fuzzy=true}={})=> {
    let seen={};
    function see(e,lvl) {
      if (seen[e.user_id] == null) {
        e.lvl=lvl;
        seen[e.user_id]=e;
        return true;
      }
      if (seen[e.user_id].lvl > lvl) {
        e.lvl=lvl;
        seen[e.user_id]=e;
        return true;
      }
      return false;
    }
    let matches = this.history.filter( (e)=>{
      // If this user is already marked as the highest priority match, dont process them anymore.
      if (seen[e.user_id] && seen[e.user_id].lvl === 0) {
        return false;
      }
      let regex_partial_name = new RegExp(`${fuzzy ? '' : '^'}${partial_name}`,`${case_sensitive ? '' : 'i'}`);
      if (e.user_name.match(regex_partial_name)) {
        // Users from this thread
        if (e.thread_id === thread_id) {
          if (e.did_mention) {
            return see(e,0);
          }
          return see(e,1);
        }
        // Users from other recent threads
        else if (e.did_mention) {
          return see(e,3);
        }
        return see(e,4);
      };
      return false;
    } );
    return Object.entries(seen).sort( ([,a],[,b])=>{ return a.lvl > b.lvl; } ).reduce( (a,[,v]) => { a.push(v); return a; }, []);
  }
  this.autoComplete = (partial_name,{thread_id=0,case_sensitive=false,fuzzy=true}={})=> {
    let matches = this.history.filter( (e) => {
      // If this user is already marked as the highest priority match, dont process them anymore.
      let regex_partial_name = new RegExp(`${fuzzy ? '' : '^'}${partial_name}`,`${case_sensitive ? '' : 'i'}`);
      if (e.user_name.match(regex_partial_name)) {
        return true;
      }
      return false;
    } ).sort( (a,b) => {
      // List those from this thread before other threads
      {
        let am = a.thread_id === thread_id;
        let bm = b.thread_id === thread_id;
        if (am!==bm) {
          return bm;
        };
      }
      // List people whos names start with partial before those with partial anywhere in name
      if (fuzzy) {
        let regex_partial_name = new RegExp(`^${partial_name}`,`${case_sensitive ? '' : 'i'}`);
        let am = a.user_name.match(regex_partial_name) != null;
        let bm = b.user_name.match(regex_partial_name) != null;
        if (am!==bm) {
          return bm;
        };
      }
      // List those who mentioned us before those who did not.
      if (a.did_mention!==b.did_mention) {
          return b.did_mention;
      };
    } );
    let seen = {};
    dbg(matches);
    matches = matches.filter( (e) => {
      if (seen[e.user_id]) {
        return false;
      }
      seen[e.user_id]=true;
      return true;
    } );
    dbg(matches);
    return matches;
  };
  return this;
}
function getCurrentUserID() {
  xp.new('id("navbarSupportedContent")').with(xp.new().contains('@class','navbarSupportedContent'));
  let current_user_id = xp.new('id("navbarSupportedContent")//a[contains(@href,"/user/")]').getElement().href.match(/\/user\/(\d+)\//)[1];
  return parseInt(current_user_id);
}

let displayAutocomplete_html = htmlToElement(`
  <div class="dropdown-menu show pre-scrollable" style="overflow-y:hidden;" >
  </div>
  `);
  //displayAutocomplete_html.tabIndex=1;
function clearAutocomplete() {
  while (displayAutocomplete_html.firstChild) {
    displayAutocomplete_html.removeChild(displayAutocomplete_html.firstChild);
  }
  if (displayAutocomplete_html.parentNode) {
    displayAutocomplete_html.parentNode.removeChild(displayAutocomplete_html);
  }
  displayAutocomplete_html.dataset.selected=-1;
}
function displayAutocomplete({textarea,recommendations,prefix_startpos,prefix_stoppos,thread_id}) {
  clearAutocomplete();
  for (let recommendation of recommendations) {
    //<span class="dropdown-item"><img src="${recommendation.user_img}"/>${recommendation.user_name}</span>
    //recommendation.user_img.classList.add("mh-100");
    let item_html = htmlToElement(`
      <div class="dropdown-item d-flex justify-content-between align-items-center px-2" style="height:50px;">
      <div class="h-100">
      <span class="">${recommendation.did_mention ? '@' : ''}</span>
      <span class="${recommendation.thread_id === thread_id ? 'far fa-comments' : ''}"></span>
      <img src="${recommendation.user_img}" class="mh-100 rounded avatar"/>
      </div>
      <span>${recommendation.user_name}</span>
      </div>
    `);
    //item_html.tabIndex=1;
    item_html.onclick=() => {
      clearAutocomplete();
      replaceTextareaInput({
        textarea:textarea,
        replacement:recommendation.user_name + " ",
        prefix_startpos:prefix_startpos,
        prefix_stoppos:prefix_stoppos,
      });
    };
    displayAutocomplete_html.appendChild(item_html);
  }
  let caret = getCaretCoordinates(textarea,textarea.selectionEnd);
  dbg(caret);
  displayAutocomplete_html.style.top = caret.top + caret.height + "px";
  displayAutocomplete_html.style.left = caret.left + "px";
  displayAutocomplete_html.style.position='absolute';
  displayAutocomplete_html.style.display='inline';

  textarea.parentNode.style.position="relative";
  textarea.parentNode.appendChild(displayAutocomplete_html);
}

function onTextareaInput({textarea,uhist,thread_id}) {
  clearAutocomplete();
  let start = textarea.selectionStart;
  let end = textarea.selectionEnd;
  let v = textarea.value;
  let textBefore = v.substring(0, start);
  let textAfter  = v.substring(end, v.length);
  if (start === end) {
    let has_prefix = textBefore.match(/@(\S*)$/);
    if ( has_prefix ) {
      let prefix = has_prefix[1] + textAfter;
      prefix = prefix.match(/^(\S*)/)[1];
      let prefix_startpos = has_prefix.index + 1;
      let prefix_stoppos = prefix_startpos + prefix.length;
      let recommendations=uhist.autoComplete(prefix,{thread_id:thread_id});
      displayAutocomplete({
        textarea:textarea,
        recommendations:recommendations,
        prefix_startpos:prefix_startpos,
        prefix_stoppos:prefix_stoppos,
        thread_id:thread_id
      });
    }
  }
}
function onTextareaKeyDown(e) {
  // Down
  let activexp = xp.new('./').with(xp.new().contains('@class','active'));
  function doIncrement(increment) {
    let should_preventDefault = false;
    if (displayAutocomplete_html.hasChildNodes()) {
      let cur_selection = displayAutocomplete_html.dataset.selected || -1;
      cur_selection=parseInt(cur_selection);
      if (increment === 0) {
        // prevent default if something is selected
        should_preventDefault = cur_selection !== -1;
        return should_preventDefault;
      }
      if (displayAutocomplete_html.children[cur_selection]) {
        displayAutocomplete_html.children[cur_selection].classList.remove('active')
      }
      should_preventDefault=true;
      cur_selection += increment;
      if (cur_selection >= displayAutocomplete_html.children.length ) {
        cur_selection = displayAutocomplete_html.children.length - 1;
      }
      if (cur_selection >=0 ) {
        displayAutocomplete_html.children[cur_selection].classList.add("active");
        displayAutocomplete_html.children[cur_selection].scrollIntoView();
      }
      else if (cur_selection < -1 ) {
        should_preventDefault=false;
        cur_selection = -1;
      }
      displayAutocomplete_html.dataset.selected = cur_selection;
    }
    return should_preventDefault;
  }
  let selection = parseInt(displayAutocomplete_html.dataset.selected);
  if (e.keyCode == keycodes.downarrow || (selection === -1 && e.keyCode == keycodes.tab)) {
    if (doIncrement(1)) {
      e.preventDefault();
    }
  }
  // Up
  else if (e.keyCode == keycodes.uparrow) {
    if (doIncrement(-1)) {
      e.preventDefault();
    }
    else {
      clearAutocomplete();
    }
  }
  // right
  else if (e.keyCode == keycodes.rightarrow || e.keyCode == keycodes.enter || e.keyCode == keycodes.tab || e.keyCode == keycodes.space) {
    if (doIncrement(0)) {
      displayAutocomplete_html.children[selection].onclick();
      e.preventDefault();
    }
    //else {
    //  clearAutocomplete();
    //}
  }
  else {
    clearAutocomplete();
  }
}
function replaceTextareaInput({
  textarea,
  replacement,
  prefix_startpos,
  prefix_stoppos,
}) {
  let start = prefix_startpos || textarea.selectionStart;
  let end = prefix_stoppos || textarea.selectionEnd;
  let v = textarea.value;
  let textBefore = v.substring(0, start);
  let textAfter  = v.substring(end, v.length);
  let textSelected = v.substring(start, end);
	textarea.value = `${textBefore}${replacement}${textAfter}`;
  textarea.selectionStart = start + replacement.length;
  textarea.selectionEnd = start + replacement.length;
  textarea.focus();
}
function disableAutocompletion() {
  let textarea = xp.new('id("text")').getElement();
  //textarea.removeEventListener("input",() => onTextareaInput );
}
function main({read_posts_history}) {
  dbg("INSIDE MAIN");
  let user_id=getCurrentUserID();
  let uhist = new UserHistory({read_posts_history:read_posts_history,user_id:user_id});
  // Add current page's posts to history.
  let thread=xp.new(posts).append('//td/span/a').with( xp.new('preceding-sibling::span').with(xp.new().contains('@class','fa-clock')) ).getElement().href;
  let thread_id = parseInt(thread.match(/\/thread\/(\d+)\//)[1]);
  for(let [i,post] = [posts.getItter()]; (()=>{post=i.iterateNext(); return post;})();) { uhist.push(post) };
  setUserValues({read_posts_history:uhist.history});
  xp.new('//textarea[@id="text"]').forEachElement( (textarea) => {
    dbg("Got TXT");
    dbg(textarea);
    textarea.addEventListener("input",() => onTextareaInput({
      textarea:textarea,
      uhist:uhist,
      thread_id:thread_id,
    } ) );
    textarea.addEventListener("keydown", onTextareaKeyDown);
  });
  unsafeWindow.uhist=uhist;
}
dbg("Starting!");
getUserValues({
  read_posts_history: []
},main);
