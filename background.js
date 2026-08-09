// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
This extension looks up HP parts and attempts to find typical solutions to user problems
AIO/Laptop:  lookup model, parts list and disassembly help
Desktop:  Lookup model and parts
Printer: Lookup model, how to reset and help on network connection
Part : lookup on eBay
Cloud: brings up the cloud recovery page but for now you need to use "copy" to get the text onto the clipboard
June 2024 its seems that //partsurfer.hp.com/partsurfer needs to be //partsurfer.hp.com
July 2024 want to extract ID and model if user listed "15-xxxx (yyyyyyy)"
there are 7 of the Y and must be 2 numeric digits minimum length of 16 characters
July 2026 "My HP 17t-CN300CTO2" failed parsing as lookup provide 100+ product IDs
reference this post https://h30434.www3.hp.com/t5/Volunteer-Lounge/My-HP-17t-CN300CTO2-laptop-will-not-power-up/m-p/9686576/highlight/false#M1366
note that the product ID for the 17t-CN300 can be
77L21AV - 17-c3000 RCTO
or
7P3Q0AV - 17-c3000 IDS Base Model
Joseph Stateson
Princal Analyst, Retired
Southwest Research Institute
*/

//import './marked.umd.min.js'; 
import { tldLocales } from './locales.js'; //note: locales here is NOT country or language code it should have been "options"
const hpLocale = "us-en";   // could change to in-en for india
const VirtualAgentUrl = "https://virtualagent.hpcloud.hp.com/"
//const CloudRecoveryUrl = "http://support.hp.cloud-recovery.s3-website-us-west-1.amazonaws.com/"
const CloudRecoveryUrl = "https://d34z73bbtpzgej.cloudfront.net/"
let supportGPTActive = false;

// Add a listener to create the initial context menu items,
// context menu items only need to be created at runtime.onInstalled
chrome.runtime.onInstalled.addListener(async () => {

    chrome.contextMenus.create({
        id: "FixS",
        title: "Fix Khoros Spoilers",
        type: "normal",
        contexts: ["all"]
    });
    chrome.contextMenus.create({
        id: "CitRem",
        title: "Clean Pasted HTML",
        type: "normal",
        contexts: ["all"]
    });
    chrome.contextMenus.create({
        id: "CR",
        title: "CloudRecover",
        type: "normal",
        contexts: ["all"]
    });
    chrome.contextMenus.create({
        id: "separator0",
        type: "separator",
        contexts: ["all"]
    });

    chrome.contextMenus.create({
        id: "StartSupportGPT",
        title: "Start Support GPT",
        type: "normal",
        contexts: ["all"]
    });
    chrome.contextMenus.create({
        id: "AskSupportGPT",
        title: "Ask Support GPT",
        type: "normal",
        contexts: ["all"]
    });
    chrome.contextMenus.create({
        id: "StopSupportGPT",
        title: "Stop Support GPT",
        type: "normal",
        contexts: ["all"]
    });
    chrome.contextMenus.create({
        id: "separator1",
        type: "separator",
        contexts: ["all"]
    });

    for (const [tld, locale] of Object.entries(tldLocales)) {              

        if (tld == "APrt") {
            chrome.contextMenus.create({
                id: "separator2",
                type: "separator",
                contexts: ["all"]
            });
        }

        chrome.contextMenus.create({
            id: tld,
            title: locale,
            type: 'normal',
            contexts: ['selection']
        });
    }
});

async function GetAppTab() {
    const urlToFind = VirtualAgentUrl;

    console.log("HP_Search: GetAppTab entered1");

    const tabs = await chrome.tabs.query({});

    const existingTab = tabs.find(tab =>
        tab.url && tab.url.startsWith(urlToFind)
    );

    if (existingTab) {
        console.log("HP_Search:SupportGPT old tab ID:", existingTab.id);
        return existingTab;
    }

    console.log("GetAppTab entered2");

    const tab = await chrome.tabs.create({
        url: urlToFind
    });

    console.log("HP_Search: SupportGPT new tab ID:", tab.id);

    return tab;
}

async function xWaitForSupportGPTButton(tabId) {
    console.log("HP_Search: Waiting for SupportGPT button in tab", tabId);

    const response = await chrome.tabs.sendMessage(tabId, {
        action: "startSupportGPT"
    });

    console.log("HP_Search response:", response);

    if (response?.success) {
        console.log("SupportGPT started");
    }
    else {
        console.log("SupportGPT could not be started");
    }
}


async function WaitForSupportGPTButton(tabId) {
    const startTime = Date.now();
    const timeout = 5000;

    while (Date.now() - startTime < timeout) {
        try {
            const result = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    const btn = [...document.querySelectorAll("button")]
                        .find(b => b.innerText.trim() ===
                            "Chat with HP's SupportGPT for AI Answers");

                    if (btn) {
                        btn.click();
                        return true;
                    }

                    return false;
                }
            });

            if (result[0]?.result === true) {
                console.log("HP_Search: SupportGPT button clicked");
                return true;
            }
        }
        catch (e) {
            // tab may have closed or page not ready
            console.log("HP_Search: injection failed", e.message);
            return false;
        }

        await new Promise(resolve => setTimeout(resolve, 250));
    }

    console.log("HP_Search: SupportGPT button timeout");
    return false;
}

async function GetSupportGPTTabs() {

    const urlToFind = VirtualAgentUrl

    const tabs = await chrome.tabs.query({});

    return tabs.filter(tab =>
        tab.url &&
        tab.url.startsWith(urlToFind)
    );
}

async function StartSupportGPT() {

    const saved = await chrome.storage.local.get("supportGPTTabId");

    if (saved.supportGPTTabId) {
        try {
            await chrome.tabs.remove(saved.supportGPTTabId);
        }
        catch {
            // Tab was already closed
        }
    }    

    const tabs = await GetSupportGPTTabs();

    await Promise.all(
        tabs.map(tab => chrome.tabs.remove(tab.id))
    );

    const newTab = await chrome.tabs.create({
        url: VirtualAgentUrl,
        active: false
    });

    console.log("HP_Search: Created new SupportGPT tab:", newTab.id);

    await chrome.storage.local.set({
        supportGPTTabId: newTab.id
    });

    supportGPTActive = true;

    // Wait for the page to load...
}



chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (!supportGPTActive) return;
    const saved = await chrome.storage.local.get("supportGPTTabId");
    const hpTabId = saved.supportGPTTabId;

    if (message.type === "HP_ANSWER") {

        console.log("HP_Search: Received HP answer:");
        //console.log(message.activity);
        RunSupportGPT(message.activity);
    }

    if (message.action === "contentReady") {
        console.log("HP_Search: content ready in tab", sender.tab.id);
        await xWaitForSupportGPTButton(sender.tab.id);
    }

    if (message.type === "GET_HP_ACTIVITY") {
        console.log("HP_Search: getting last activity");
        sendResponse({
            activity: lastActivity
        });
    }

    if (message.type === "SUPPORTGPT_HTML") {

        const saved = await chrome.storage.local.get("hpForumTabId");
        const hpTabId = saved.hpForumTabId;
        console.log("HP_Search: SupportGPT HTML processed Forum ID ", hpTabId);
        const html = message.html;

        await chrome.scripting.executeScript({
            target: { tabId: hpTabId },
            files: ["content.js"]
        });

        /*
        chrome.tabs.sendMessage(hpTabId, {
            type: "COPY_SUPPORTGPT_HTML",
            html: html
        });
        */
    }

    if (message.type === "CLICK_SUPPORTGPT") {

        const btn = [...document.querySelectorAll("button")]
            .find(b => b.innerText.trim() ===
                "Chat with HP's SupportGPT for AI Answers");

        if (btn) {
            console.log("HP_Search: BK clicking SupportGPT");
            btn.click();
        }
        else {
            console.log("HP_Search: SupportGPT button not found");
        }
    }

});


function GetSupportAgent() {
    const url9 = new URL(VirtualAgentUrl);
    const tab = chrome.tabs.create({
        url: url9.href
    });
    console.log("HP_Search: SupportGPT tab ID:", tab.id);
    return tab;
}

let lastActivity = null;
function RunSupportGPT(activity) {

    lastActivity = activity;
    const url9 = chrome.runtime.getURL("supportgpt.html");
    chrome.tabs.create({
        url: url9
    });

}

// Extract SOURCES from SupportGPT HTML and put them into a spoiler
function PutRefsIntoSpoiler(html) {
    const div = document.createElement("div");
    div.innerHTML = html;

    const sourcesHeader = [...div.querySelectorAll("h4")]
        .find(h => h.textContent.trim() === "SOURCES");

    if (!sourcesHeader) {
        console.log("HP_Search: No SOURCES found");
        return html;
    }

    let references = "";

    let node = sourcesHeader.nextElementSibling;

    while (node) {
        references += node.outerHTML;
        const next = node.nextElementSibling;
        node.remove();   // remove from original document
        node = next;
    }

    // Remove the SOURCES heading itself
    sourcesHeader.remove();

    const spoiler = document.createElement("div");
    spoiler.className = "lia-spoiler-container-editor";
    spoiler.innerHTML = `
        Expand spoiler for references
        <br>
        ${references}
    `;

    // Put spoiler where SOURCES used to be
    div.appendChild(spoiler);

    return CleanSupportGPTHtml(div.innerHTML);
}

// Clean up the HTML from SupportGPT to make it suitable for Khoros (do not want a warning about html)
function CleanSupportGPTHtml(html) {

    const div = document.createElement("div");
    div.innerHTML = html;

    // Remove all <code> tags but keep their contents
    div.querySelectorAll("code").forEach(code => {
        code.replaceWith(...code.childNodes);
    });

    // Remove id="answer" (or any id attributes)
    div.querySelectorAll("#answer").forEach(element => {
        element.removeAttribute("id");
    });

    // Fix links so Khoros does not rewrite them
    div.querySelectorAll("a").forEach(a => {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener");
    });

    return div.innerHTML;
}

function CleanPastedHtml() { // designed for Google Docs to Khoros copy/paste but should work for other sources as well

    if (document.body.id !== "tinymce")
        return;

    const body = document.body;

    // ---------------------------------------------------------
    // 1. Remove Google citation spans containing only numbers
    // ---------------------------------------------------------
    body.querySelectorAll("span").forEach(span => {

        const links = span.querySelectorAll("a");

        if (links.length > 0 &&
            [...links].every(a => /^\d+$/.test(a.textContent.trim()))) {
            span.remove();
        }
    });

    let html = body.innerHTML;

    // ---------------------------------------------------------
    // 2. Remove citations already converted by Khoros
    // ---------------------------------------------------------
    html = html.replace(
        /\[\s*\d+(?:\s*,\s*\d+)*\s*\]/g,
        ""
    );

    // ---------------------------------------------------------
    // 3. Remove HTML comments
    // ---------------------------------------------------------
    html = html.replace(
        /<!--[\s\S]*?-->/g,
        ""
    );

    // ---------------------------------------------------------
    // 4. Fix <strong>...</b> produced by Google
    // ---------------------------------------------------------
    html = html.replace(
        /(<strong\b[^>]*>.*?)(<\/b>)/gis,
        "$1</strong>"
    );

    // ---------------------------------------------------------
    // 5. Remove Google wrapper elements but keep contents
    // ---------------------------------------------------------
    html = html.replace(
        /<\/?(?:div|span|mark)\b[^>]*>/gi,
        ""
    );

    // ---------------------------------------------------------
    // 6. Remove Google's attributes from useful tags
    // ---------------------------------------------------------
    html = html.replace(
        /<ul\b[^>]*>/gi,
        "<ul>"
    );

    html = html.replace(
        /<li\b[^>]*>/gi,
        "<li>"
    );

    html = html.replace(
        /<strong\b[^>]*>/gi,
        "<strong>"
    );

    // ---------------------------------------------------------
    // 7. Remove <code> tags but keep their contents
    // ---------------------------------------------------------
    html = html.replace(
        /<\/?code\b[^>]*>/gi,
        ""
    );

    // Update the editor once
    body.innerHTML = html;

    // switch to DOM manipulation for the rest of the cleanup
    body.querySelectorAll("a").forEach(a => {

        const href = a.getAttribute("href");
        if (!href) return;

        // Remove every attribute
        [...a.attributes].forEach(attr => a.removeAttribute(attr.name));

        // Add back only what you want
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener";
    });

    // Remove trailing empty bullet/list items
    body.querySelectorAll("ul, ol").forEach(list => {
        const items = list.querySelectorAll(":scope > li");

        if (items.length === 0)
            return;

        const last = items[items.length - 1];

        if (last.textContent.trim() === "") {
            last.remove();
        }

        // Remove the list itself if it is now empty
        if (list.children.length === 0) {
            list.remove();
        }
    });
    // Tell TinyMCE/Khoros that the content has changed
    body.dispatchEvent(
        new InputEvent("input", { bubbles: true })
    );

    body.dispatchEvent(
        new Event("change", { bubbles: true })
    );
}

function FixSpoilers() {

    /*
    alert("FixSpoilers is running!");
    alert(document.location.href);
    alert(document.body.id);    
    //alerts work here because it it is running in the context of the page, not the background script
    };
    */
    if (document.body.id !== "tinymce")
        return;

    let html = document.body.innerHTML;

    let fixed = html.replaceAll(
        '<div class="">',
        '<div class="lia-spoiler-container-editor">'
    );

    if (fixed !== html) {
        document.body.innerHTML = fixed;
        document.body.dispatchEvent(
            new InputEvent("input", { bubbles: true })
        );
    }
}

function isNumber(value)
{
        if (isNaN(value)) {
            return false;
        }
    return true;
}

//14 bd0000 becomes 14-bd0000 for example
//14m db
//0123456
//14 db
function FixSpace(str)
{
    var n = str.indexOf(' ');
    if (n < 2) return str; // 9- is smallest but could be 23m- or 3 chars before a missing dash
    let s = str.substring(0, 2);
    if (isNumber(s))
    {
        s = str.substring(0,n) + "-";
        s += str.substring(n + 1);
        return s;
    }
    return str;
}


//"15-xxxx (yyyyyyy)"
function HasBothItems(str)
{
    var i, j, n;
    let strID = "";
    let strModel = "";
    str = str.trim();
    n = str.length;
    if (n < 16) return "";
    i = str.indexOf('(');
    if (i < 0) return "";
    j = str.indexOf(')', i);
    if (j < 0) return "";
    n = j - i;      // might want to remove country code
    if (n != 8) return "";
    strID = str.substring(i + 1, j);
    strModel = str.substring(0, i).trim();
    strModel = FixSpace(strModel);
    str = strModel + "(*)" + strID;
    if (str.length < 15) return "";
    return str;
}

function HasID(str) {
    var i, j, n;
    let strID = "";
    str = str.trim();
    n = str.length;
    if (n < 9) return "";
    i = str.indexOf('(');
    if (i < 0) return "";
    j = str.indexOf(')', i);
    if (j < 0) return "";
    n = j - i;
    if (n != 8) return "";
    strID = str.substring(i + 1, j);
    return strID;
}

//when looking up parts for printers, do not use e at end of printer name
function DropE(str) {
    var n = str.length - 1;
    if (n < 0) return str;
    var res = str.charAt(n);
    if (res == 'e') return str.substring(0, n);
    return str;
}


// do not want any white space in the lookup
// any trailing period or comma needs to be removed
function RemoveJunk(str) {
    var n = 0, res = "", str0;
    str = str.trim();
    str0 = str;

    //remove trailing periods, commas, dash, left parenthesis
    n = str.length - 1;
    if (n < 0) return "";
    res = str.charAt(n);
    if (res == '.' || res == ',' || res == '-' ) str0 = str.substring(0, n).trim();
    while (str0 != str) {
        str = str0;
        let n = str.length - 1;
        let res = str.charAt(n);
        if (res == '.' || res == ',' || res == '-' ) str0 = str.substring(0, n).trim();
    }
    str = str0;
    return str;
}

function RemoveParen(str) {
    var n = str.length, res = "", str0;
    if(n == 0)return "";
    str = str.trim();
    res = str.charAt(0);
    str0 = str;
    // remove leading junk not needed
    if (res == '.' || res == ',' || res == '(' || res == '-' || res == ')') str0 = str.substring(1, n).trim();

    while (str0 != str) {
        str = str0;
        res = str.charAt(0);
        if (res == '.' || res == ',' || res == '(' || res == '-' || res == ')') str0 = str.substring(1, n).trim();
    }
    str = str0;
    //remove trailing periods, commas or dash or junk
    n = str.length - 1;
    if (n < 0) return "";
    res = str.charAt(n);
    // trailing ( came from ENERGY STAR (ENERGY STAR)
    if (res == '.' || res == ',' || res == '-' || res == ')' || res == '(') str0 = str.substring(0, n).trim();

    while (str0 != str) {
        str = str0;
        n = str.length - 1;
        res = str.charAt(n);
        if (res == '.' || res == ',' || res == '-' || res == ')' || res == '(') str0 = str.substring(0, n).trim();
    }
    str = str0;
    return Rem_HP(str);
}


//replace sIn with pattrn sP but case insenstive
function MyReplace(sIN, sLC, sP) {
    var s = sP;
    var n = s.length;
    var b = "                     ";
    var c = "zzzzzzzzzzzzzzzzzzzzzzz";
    var i = sLC.indexOf(s);
    if (i < 0) return sIN;
    if (i == 0) {
        return b.substring(0, n) + sIN.substring(n);
    }
    else {
        return sIN.substring(0, i) + b.substring(0, n) + sIN.substring(i + n);
    }

}

// MyReplace does not change var t so duplicate require additional t = s 
function RemoveCommonItems(strIn)
{
    var s = " " + strIn + " ";
    var t = s.toLowerCase();
    var i = t.indexOf(" inch ");
    if (i > 0)
    {
        s = strIn.substring(i+6);
        t = s.toLowerCase();
    }
    s = MyReplace(s, t, " tags:");
    s = MyReplace(s, t, "\"");
    t = s.toLowerCase();
    s = MyReplace(s, t, "\"");
    t = s.toLowerCase();
    s = MyReplace(s, t, " hp ");
    s = MyReplace(s, t, " pc ");
    s = MyReplace(s, t, " aio ");
    s = MyReplace(s, t, " laptop ");
    s = MyReplace(s, t, " notebook ");
    s = MyReplace(s, t, " printer ");
    s = MyReplace(s, t, " all-in-one ");
    // removed as some printer models might show up as laptops
    //s = MyReplace(s, t, " officejet ");
    //s = MyReplace(s, t, " laserjet ");
    //s = MyReplace(s, t, " deskjet ");
    s = MyReplace(s, t, " color ");
    s = MyReplace(s, t, " pavilion ");
    s = MyReplace(s, t, " convertible ");
    s = MyReplace(s, t, " compaq ");
    s = MyReplace(s, t, " product: ");
    s = MyReplace(s, t, " gaming ");
    s = MyReplace(s, t, " omen by ");
    s = MyReplace(s, t, " currently viewing: ");
    s = MyReplace(s, t, " energy star");
    s = MyReplace(s, t, " multifunction ");

    t = s.replace("  ", " ");
    while (t != s) {
        s = t;
        t = s.replace("  ", " ");
    }
    console.log("RemoveCommonItems: s=" + s);
    return RemoveJunk(s);
}

//Currently Viewing: "HP Laptop PC 15-dw3000 (31R08AV)" in "Notebook Hardware and Upgrade Que
function CurrentlyViewing(strIn)
{
    var s = strIn;
    var t = "Currently Viewing: \"HP ";
    var i = s.indexOf(t);
    if (i < 0) return "";
    i += t.length;
    var j = s.indexOf("\"",i);
    if (i < 0) return "";
    return s.substring(i,j);
}

// 7/31/2026 trying to simplify tab creation
function CreateTabs(runFunction, tab, str, strID) {
    chrome.windows.create(
        {
            type: 'normal'
        },
        function (newWin) {

            chrome.tabs.query(
                {
                    windowId: newWin.id
                },
                function (tabs) {

                    // Run the appropriate routine
                    runFunction(tab, str, newWin.id, strID);

                    // Remove the blank tab Chrome created
                    if (tabs.length > 0) {
                        chrome.tabs.remove(tabs[0].id);
                    }
                }
            );
        }
    );
}

async function WaitForTabLoad(tabId) {
    return new Promise((resolve) => {

        function listener(updatedTabId, changeInfo) {

            if (updatedTabId === tabId &&
                changeInfo.status === "complete") {

                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        }

        chrome.tabs.onUpdated.addListener(listener);
    });
}

//https://youtube.com/@HPSupport/search?query=deskjet%203755
function RunPRT(tab, str, id, sID) {
    var url0, url1, url2, url3, url4, url5;
    url5 = new URL(`https://youtube.com/@HPSupport/search?query=` + str);
    chrome.tabs.create({ url: url5.href, index: tab.index + 1 })
    url4 = new URL(`https://www.google.com/search`);
    url4.searchParams.set('q', Add_HP(str) + ' youtube network connect');
    chrome.tabs.create({ url: url4.href, windowId: id, index: tab.index + 1 });
    url3 = new URL(`https://www.google.com/search`);
    url3.searchParams.set('q', Add_HP(str) + ' youtube Wi-Fi direct');
    chrome.tabs.create({ url: url3.href, windowId: id, index: tab.index + 1 });
    url2 = new URL(`https://www.google.com/search`);
    url2.searchParams.set('q', Add_HP(str) + ' printer factory reset');
    chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
    url0 = new URL(`https://partsurfer.hp.com`);
    url0.searchParams.set('searchtext', DropE(sID));
    chrome.tabs.create({ url: url0.href, windowId: id, index: tab.index + 1 });
    url1 = new URL(`https://support.hp.com/${hpLocale}/deviceSearch`);
    url1.searchParams.set('q', sID);
    url1.searchParams.append('origin', 'pdp');
    chrome.tabs.create({ url: url1.href, windowId: id, index: tab.index + 1 });

}

function RunAIO(tab, str, id, sID)
{
    var url1, url2, url3, url4;
    url4 = new URL(`https://www.google.com/search`);
    url4.searchParams.set('q', Add_HP(str) + ' software driver');
    chrome.tabs.create({ url: url4.href, windowId: id, index: tab.index + 1 });
    url3 = new URL(`https://www.google.com/search`);
    url3.searchParams.set('q', Add_HP(str) + ' disassembly');
    chrome.tabs.create({ url: url3.href, windowId: id, index: tab.index + 1 });
    url2 = new URL(`https://partsurfer.hp.com`);
    url2.searchParams.set('searchtext', RemoveCountryCode(sID));
    chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
    url1 = new URL(`https://support.hp.com/${hpLocale}/deviceSearch`);
    url1.searchParams.set('q', sID);
    url1.searchParams.append('origin', 'pdp');
    chrome.tabs.create({ url: url1.href, windowId: id, index: tab.index + 1 });
}


function RunPC(tab, str, id, sID)
{
    var url1, url2, url3, url4;
    url4 = new URL(`https://www.google.com/search`);
    url4.searchParams.set('q', Add_HP(str) + ' software driver');
    chrome.tabs.create({ url: url4.href, windowId: id, index: tab.index + 1 });
    url2 = new URL(`https://partsurfer.hp.com`);
    url2.searchParams.set('searchtext', RemoveCountryCode(sID));
    chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
    url1 = new URL(`https://support.hp.com/${hpLocale}/deviceSearch`);
    url1.searchParams.set('q', sID);
    url1.searchParams.append('origin', 'pdp');
    chrome.tabs.create({ url: url1.href, windowId: id, index: tab.index + 1 });
}

function Add_HP(str) {
    let HPIndex = str.indexOf("HP ");
    if (HPIndex < 0) {
        str = "HP " + str;
    }
    return str;
}

function Rem_HP(str) {
    let HPIndex = str.indexOf("HP ");
    if (HPIndex == 0) {
        str = str.substring(3);
    }
    return str;
}

function RemoveCountryCode(phrase) {
    return phrase.length === 11 && /#[A-Za-z0-9]{3}$/.test(phrase)
        ? phrase.slice(0, 7)
        : phrase;
}

// jstateson:  extract product ID xxxxx from (xxxxx)
//  (HP M01-F2248nf)  changes to HP M01-F2248nf
// white spaces are dropped before and after the text
// F224nf. becomes F224nf
chrome.contextMenus.onClicked.addListener(async (item, tab) => {
    const tld = item.menuItemId;
    var url1, url2, url3, url4;
    var id;
    
    if (item.menuItemId == "FixS") {
        chrome.scripting.executeScript({
            target: {
                tabId: tab.id,
                allFrames: true
            },
            func: FixSpoilers
        });
        return;
    }

    if (item.menuItemId == "CitRem") {
        chrome.scripting.executeScript({
            target: {
                tabId: tab.id,
                allFrames: true
            },
            func: CleanPastedHtml
        });
        return;
    }

    if (item.menuItemId == "StopSupportGPT") {
        supportGPTActive = false;
    }

    if (item.menuItemId == "AskSupportGPT") {
        if (!supportGPTActive) {
            return;
        }
        console.log("HP_SEARCH current forum tab ", tab.id);
        const appTab = await GetAppTab();
        console.log("HP_SEARCH appTab ID:", appTab.id);


        await chrome.storage.local.set({
            hpForumTabId: tab.id
        });

        chrome.tabs.sendMessage(appTab.id, {
            type: "SEND_SUPPORTGPT_TEXT",
            text: item.selectionText
        });
        return;
    }

    if (item.menuItemId == "StartSupportGPT") {
        await StartSupportGPT();
        return;
    }

    let str1 = CurrentlyViewing(item.selectionText);
    let str = RemoveCommonItems(item.selectionText);
    str = FixSpace(str);
    let strID = str;
    if (str1 == "") {
        let str2 = HasBothItems(str);
        if (str2 != "") {
            let i = str2.indexOf("(*)");
            if (i >= 0) {
                strID = str2.substring(i + 3);
                str = RemoveJunk(str.substring(0, i));
            }
        }
    }
    else
    {
        let str2 = HasBothItems(str1);
        if (str2 != "") {
            let i = str2.indexOf("(*)");
            if (i > 0) {
                strID = str2.substring(i + 3);
                str = RemoveCommonItems(str2.substring(0, i));
            }
        }
    }

    str = RemoveParen(str);
    strID = RemoveParen(strID);

    // Remove CTO and everything (junk?) after it and put back in
    // alert does not work here because it is running in the context of the background script, not the page
    // console.log("HP_Search: strID before CTO check: " + strID); // would have worked
    // do not use HP as a prefix for any HP site but add it in for google, bing, etc
    let ctoIndex = strID.indexOf("CTO");
    if (ctoIndex >= 0) {
        strID = strID.substring(0, ctoIndex).trim() + " CTO";
    }   

    switch (tld)
    {
        case "PRN":
            RunPRT(tab, str, id, strID);
            break;

        case "AIO":
            RunAIO(tab, str, id, strID);
            break;

        case "PC":
            RunPC(tab, str, id, strID);
            break;

        case "OEM":
            url3 = new URL(`https://www.google.com/search`);
            url3.searchParams.set('q', Add_HP(str));
            chrome.tabs.create({ url: url3.href, index: tab.index + 1 });
            url2 = new URL(`https://www.google.com/search`);
            url2.searchParams.set('q', Add_HP(str) + " memory finder");
            chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
            break;

        case "CR":
            const listeners = new URL(CloudRecoveryUrl);
            const CR_tab = await chrome.tabs.create({ url: listeners.href, active: true });

            let productId = item.selectionText.trim();
            const pattern = /^[A-Za-z0-9]{7}#[A-Za-z0-9]{3}$/;
            if (!pattern.test(productId)) {
                productId = "";
            }
            if (productId === "")
                return;

            await WaitForTabLoad(CR_tab.id);
            await chrome.scripting.executeScript({
                target: { tabId: CR_tab.id },
                func: async (productId) => {

                    const form = document.querySelector("input.table-text").closest("form");
                    const input = document.querySelector("input.table-text");
                    const setter = Object.getOwnPropertyDescriptor(
                        HTMLInputElement.prototype,
                        "value"
                    ).set;

                    setter.call(input, productId);
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                    input.dispatchEvent(new Event("change", { bubbles: true }));

                    // Give the page one event loop to update its state.
                    await new Promise(resolve => setTimeout(resolve, 250));
                    form.requestSubmit();

                },
                args: [productId]   // your 11-character Product ID
            });
            break;

        case "KB":
            url3 = new URL(`https://h30434.www3.hp.com/t5/forums/searchpage/tab/message?advanced=false&allow_punctuation=false&q=` + str);
            chrome.tabs.create({ url: url3.href, index: tab.index + 1 });
            break;

        case "EB":
            url2 = new URL(`https://partsurfer.hp.com`);
            url2.searchParams.set('searchtext', RemoveCountryCode(str));
            chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
            let str0 = "https://www.ebay.com/sch/i.html?_nkw=" + Add_HP(str) + "&_sacat=58058" // 58058 is the computer catagory
            url3 = new URL(str0);
            chrome.tabs.create({ url: url3.href, index: tab.index + 2 });
            break;

        case "APrt": // cleaned up using advice from ChatGPT
            CreateTabs(RunPRT, tab, str, strID);break;

        case "APc":
            CreateTabs(RunPC, tab, str, strID);
            break;

        case "AAio":
            CreateTabs(RunAIO, tab, str, strID);
            break;
    }
});

