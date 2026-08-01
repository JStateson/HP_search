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
*/

import { tldLocales } from './locales.js'; //note: locales here is NOT country or language code it needs to be "options" todo TO DO to do

const hpLocale = "us-en";   // could change to in-en for india

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

function CleanPastedHtml() {

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
        if (res == '.' || res == ',' || res == '-' ) str0 = str.substring(0, n);
    }
    str = str0;
    return str;
}

function RemoveParen(str) {
    var n = str.length, res = "", str0;
    str = str.trim();
    res = str.charAt(0);
    str0 = str;
    if (res == '.' || res == ',' || res == '(' || res == '-') str0 = str.substring(1, n).trim();

    while (str0 != str) {
        str = str0;
        res = str.charAt(0);
        if (res == '.' || res == ',' || res == '(' || res == '-') str0 = str.substring(1, n).trim();
    }
    str = str0;
    //remove trailing periods, commas or dash
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
    return str;
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
    var s = "" + strIn + " ";
    var t = s.toLowerCase();
    var i = t.indexOf(" inch ");
    if (i > 0)
    {
        s = strIn.substring(i+6);
        t = s.toLowerCase();
    }
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
    // some printer models might show up as laptops
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
    s = MyReplace(s, t, "currently viewing: ");  //cannot have leading space
    s = MyReplace(s, t, "energy star");
    s = MyReplace(s, t, " multifunction ");

    t = s.replace("  ", " ");
    while (t != s) {
        s = t;
        t = s.replace("  ", " ");
    }
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

//https://youtube.com/@HPSupport/search?query=deskjet%203755
function RunPRT(tab, str, id, sID) {  // this code cleaned up with the advice of ChatGPT 7/31/2026
    var url0, url1, url2, url3, url4, url5;
    url5 = new URL(`https://youtube.com/@HPSupport/search?query=` + str);
    chrome.tabs.create({ url: url5.href, index: tab.index + 1 })
    url4 = new URL(`https://www.google.com/search`);
    url4.searchParams.set('q', str + ' youtube network connect');
    chrome.tabs.create({ url: url4.href, windowId: id, index: tab.index + 1 });
    url3 = new URL(`https://www.google.com/search`);
    url3.searchParams.set('q', str + ' youtube Wi-Fi direct');
    chrome.tabs.create({ url: url3.href, windowId: id, index: tab.index + 1 });
    url2 = new URL(`https://www.google.com/search`);
    url2.searchParams.set('q', str + ' printer factory reset');
    chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
    url1 = new URL(`https://support.hp.com/${hpLocale}/deviceSearch`);
    url1.searchParams.set('q', sID);
    url1.searchParams.append('origin', 'pdp');
    chrome.tabs.create({ url: url1.href, windowId: id, index: tab.index + 1 });
    url0 = new URL(`https://partsurfer.hp.com`);
    url0.searchParams.set('searchtext', DropE(sID));
    chrome.tabs.create({ url: url0.href, windowId: id, index: tab.index + 1 });
}

function RunAIO(tab, str, id, sID)
{
    var url1, url2, url3, url4;
    url4 = new URL(`https://www.google.com/search`);
    url4.searchParams.set('q', str + ' software driver');
    chrome.tabs.create({ url: url4.href, windowId: id, index: tab.index + 1 });
    url3 = new URL(`https://www.google.com/search`);
    url3.searchParams.set('q', str + ' disassembly');
    chrome.tabs.create({ url: url3.href, windowId: id, index: tab.index + 1 });
    url2 = new URL(`https://partsurfer.hp.com`);
    url2.searchParams.set('searchtext', sID);
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
    url4.searchParams.set('q', str + ' software driver');
    chrome.tabs.create({ url: url4.href, windowId: id, index: tab.index + 1 });
    url2 = new URL(`https://partsurfer.hp.com`);
    url2.searchParams.set('searchtext', sID);
    chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
    url1 = new URL(`https://support.hp.com/${hpLocale}/deviceSearch`);
    url1.searchParams.set('q', sID);
    url1.searchParams.append('origin', 'pdp');
    chrome.tabs.create({ url: url1.href, windowId: id, index: tab.index + 1 });
}

// jstateson:  extract product ID xxxxx from (xxxxx)
//  (HP M01-F2248nf)  changes to HP M01-F2248nf
// white spaces are dropped before and after the text
// F224nf. becomes F224nf
chrome.contextMenus.onClicked.addListener((item, tab) => {
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
    // console.log("strID before CTO check: " + strID); // would have worked
    let ctoIndex = strID.indexOf("CTO");
    if (ctoIndex >= 0) {
        strID = strID.substring(0, ctoIndex).trim() + " CTO";
    }   

    let HPIndex = str.indexOf("HP ");
    if(HPIndex < 0){
        str = "HP " + str;
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
            url3.searchParams.set('q', str);
            chrome.tabs.create({ url: url3.href, index: tab.index + 1 });
            url2 = new URL(`https://www.google.com/search`);
            url2.searchParams.set('q', str + " memory finder");
            chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
            break;

        case "CR":
            url3 = new URL(`http://support.hp.cloud-recovery.s3-website-us-west-1.amazonaws.com`);
            chrome.tabs.create({ url: url3.href, index: tab.index + 1 });
            // user needs to do the copy of the 1234567#ABA first until I can find how to push "str1"
            // then a paste needs to be done to insert the product ID.  I do not see a way to do
            // this automatically.The user needs to do the copy first, and then paste.
            break;

        case "KB":
            url3 = new URL(`https://h30434.www3.hp.com/t5/forums/searchpage/tab/message?advanced=false&allow_punctuation=false&q=` + str);
            chrome.tabs.create({ url: url3.href, index: tab.index + 1 });
            break;

        case "EB":
            url2 = new URL(`https://partsurfer.hp.com`);
            url2.searchParams.set('searchtext', str);
            chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
            let str0 = "https://www.ebay.com/sch/i.html?_nkw=" + str + "&_sacat=58058" // 58058 is the computer catagory
            url3 = new URL(str0);
            chrome.tabs.create({ url: url3.href, index: tab.index + 2 });
            break;

        case "APrt": // cleaned up using advice from ChatGPT
            CreateTabs(RunPRT, tab, str, strID);
            break;

        case "APc":
            CreateTabs(RunPC, tab, str, strID);
            break;

        case "AAio":
            CreateTabs(RunAIO, tab, str, strID);
            break;
    }
});

