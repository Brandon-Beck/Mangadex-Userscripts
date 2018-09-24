// ==UserScript==
// @name     Mangadex Copy link as BBCode
// @description Adds a "Copy as BBCode" button next to links. Currently operates on title page links, and any breadcrumbs.
// @namespace https://github.com/Christopher-McGinnis
// @version  0.0.2
// @grant    unsafeWindow
// @grant    GM.setClipboard
// @grant    GM_setClipboard
// @require  https://raw.githubusercontent.com/Christopher-McGinnis/Mangadex-Userscripts/aee2c95604c9a8e430a47773f9eb1851823186e5/common.js
// @match    https://mangadex.org/*
// ==/UserScript==
// TODO: Look for a decent IDE for userscripts.
// Currently using ViolentMonkey with Atom and atom-live-server to sync changes with ViolentMonkey
// Unfortunatly, syncing requires doesnt work well that way.
// Compiling for testing.
'use strict';
/*****************************
 * Create HTML nodes.
 */
let tooltip_elm = htmlToElement("<div>Copied as BB Code<br><span></span></div>");
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

let bb_templ = htmlToElement("<div style='display: inline;' title='Copy link as BB Code'></div>");
bb_templ.appendChild(document.createTextNode("[bb]"));


/*****************************
 * Declare global variables
 */
let tooltipTimer;

function autohide_tooltip(time) {
  clearTimeout(tooltipTimer);
  tooltipTimer=setTimeout(function() {
    tooltip_elm.style.display="none";
  },time);
}

function bbcode_link(href,title) {
  return `[url=${href}]${title}[/url]`;
}
function bbcode_onclick(bb_elm,href,title) {
  dbg("Clicked");
  let bbcd = bbcode_link(href,title);
  dbg(bbcd);
  copyTextToClipboard(bbcd);
  bb_elm.appendChild(tooltip_elm);
  tooltip_elm.style.display="block";
  tooltip_text.textContent=bbcd;
  autohide_tooltip(2000);
}



function append_bbcode_button(elm) {
  let bb_elm = bb_templ.cloneNode(true);
  dbg("appending");
  elm.parentNode.appendChild(bb_elm);
  bb_elm.onclick=function() { bbcode_onclick(bb_elm,elm.href,elm.title); };
}

function apply_to_xpath_snapshots(xpath_snapshots,fn) {
  for (let i = 0; i < xpath_snapshots.snapshotLength; i++ ) {
    let item = xpath_snapshots.snapshotItem(i);
    fn(item);
  }
}

function main() {
  dbg("Running MAIN");
	let manga_titles = getSnapshotByXpath("//a[contains(@class,'manga_title')]");
  let breadcrumb_links = getSnapshotByXpath("//li[contains(@class,'breadcrumb-item')]/a");
  apply_to_xpath_snapshots(manga_titles,append_bbcode_button);
  apply_to_xpath_snapshots(breadcrumb_links,function(elm) {
    let bb_elm = bb_templ.cloneNode(true);
    dbg("appending");
    elm.parentNode.appendChild(bb_elm);
    bb_elm.onclick=function() { bbcode_onclick(bb_elm,elm.href,elm.textContent); };
  });
}
dbg("RUNNING");
checkLoop({xpath: "//a[contains(@class,'navbar-brand')]",callback: main });
