// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
This extension looks up HP parts and attempts to find typical solutions to user problems
AIO/Laptop:  lookup model, parts list and disassembly help
Desktop:  Lookup model and parts
Printer: Lookup model, how to reset and help on network connection
Part : lookup on eBay
Cloud: bring up the cloud recovery page but for now you need to use "copy" to get the text onto the clipboard
June 2024 its seems that //partsurfer.hp.com/partsurfer needs to be //partsurfer.hp.com
July 2024 want to extract ID and model if user listed "15-xxxx (yyyyyyy)"
there are 7 of the Y and must be 2 numeric digits minimum length of 16 characters
*/

import { tldLocales } from './locales.js';

// Add a listener to create the initial context menu items,
// context menu items only need to be created at runtime.onInstalled
chrome.runtime.onInstalled.addListener(async () => {
  for (const [tld, locale] of Object.entries(tldLocales)) {
    chrome.contextMenus.create({
      id: tld,
      title: locale,
      type: 'normal',
      contexts: ['selection']
    });
  }
});

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
    //return s; returned 2 digits
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

/*
    //remove any parens anywhere
    str0 = str.replace("(", "").replace(")", "");
    while (str0 != str) {
        str = str0;
        str0 = str.replace("(", "").replace(")", "");
    }
*/


// do not want any white space in the lookup
// any trailing period or comma needs to be removed
function RemoveJunk(str) {
    var n = 0, res = "", str0;
    str = str.trim();
    str0 = str;

    //remove trailing periods, commas or dash
    n = str.length - 1;
    if (n < 0) return "";
    res = str.charAt(n);
    if (res == '.' || res == ',' || res == '-') str0 = str.substring(0, n);

    while (str0 != str) {
        str = str0;
        let n = str.length - 1;
        let res = str.charAt(n);
        if (res == '.' || res == ',') str0 = str.substring(0, n);
    }
    return str.trim();
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
    s = MyReplace(s, t, " officejet ");
    s = MyReplace(s, t, " laserjet ");
    s = MyReplace(s, t, " deskjet ");
    s = MyReplace(s, t, " color ");
    s = MyReplace(s, t, " pavilion ");
    s = MyReplace(s, t, " convertible ");
    s = MyReplace(s, t, " compaq ");
    s = MyReplace(s, t, " product: ");
    s = MyReplace(s, t, " gaming ");
    s = MyReplace(s, t, " omen by ");
    s = MyReplace(s, t, "currently viewing: ");
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

//https://youtube.com/@HPSupport/search?query=deskjet%203755
function RunPRT(tab, str, id, sID) {
    var url1, url2, url3, url4;
    url4 = new URL(`https://youtube.com/@HPSupport/search?query=` + str);
    chrome.tabs.create({ url: url4.href, index: tab.index + 1 })
    url3 = new URL(`https://www.google.com/search`);
    url3.searchParams.set('q',"HP " + str + ' youtube network connect');
    chrome.tabs.create({ url: url3.href, windowId: id, index: tab.index + 1 });
    url2 = new URL(`https://www.google.com/search`);
    url2.searchParams.set('q', "HP " + str + ' printer factory reset');
    chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
    url1 = new URL(`https://support.hp.com/us-en/deviceSearch`);
    url1.searchParams.set('q', sID);
    url1.searchParams.append('origin', 'pdp');
    chrome.tabs.create({ url: url1.href, windowId: id, index: tab.index + 1 });
}

function RunAIO(tab, str, id, sID)
{
    var url1, url2, url3, url4;   
    url4 = new URL(`https://www.google.com/search`);
    url4.searchParams.set('q', "HP " + str + ' software driver');
    chrome.tabs.create({ url: url4.href, windowId: id, index: tab.index + 1 });
    url3 = new URL(`https://www.google.com/search`);
    url3.searchParams.set('q', "HP " + str + ' disassembly');
    chrome.tabs.create({ url: url3.href, windowId: id, index: tab.index + 1 });
    url2 = new URL(`https://partsurfer.hp.com`);
    url2.searchParams.set('searchtext', sID);
    chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
    url1 = new URL(`https://support.hp.com/us-en/deviceSearch`);
    url1.searchParams.set('q', sID);
    url1.searchParams.append('origin', 'pdp');
    chrome.tabs.create({ url: url1.href, windowId: id, index: tab.index + 1 });
}


function RunPC(tab, str, id, sID)
{
    var url1, url2, url3, url4;
    url4 = new URL(`https://www.google.com/search`);
    url4.searchParams.set('q', "HP " + str + ' software driver');
    chrome.tabs.create({ url: url4.href, windowId: id, index: tab.index + 1 });
    url2 = new URL(`https://partsurfer.hp.com`);
    url2.searchParams.set('searchtext', sID);
    chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
    url1 = new URL(`https://support.hp.com/us-en/deviceSearch`);
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

    chrome.tabs.query({
        windowId: id
    });

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
            url3.searchParams.set('q', "HP " + str);
            chrome.tabs.create({ url: url3.href, index: tab.index + 1 });
            url2 = new URL(`https://www.google.com/search`);
            url2.searchParams.set('q', "HP " + str + " memory finder");
            chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
            break;

        case "CR":
            url3 = new URL(`http://support.hp.cloud-recovery.s3-website-us-west-1.amazonaws.com`);
            chrome.tabs.create({ url: url3.href, index: tab.index + 1 });
            // user needs to do the copy first until I can find how to push "str1"
            break;

        case "KB":
            url3 = new URL(`https://h30434.www3.hp.com/t5/forums/searchpage/tab/message?advanced=false&allow_punctuation=false&q=` + str);
            //url3.searchParams.set('q', str);
            chrome.tabs.create({ url: url3.href, index: tab.index + 1 });
            break;

        case "EB":
            let str0 = "https://www.ebay.com/sch/i.html?_nkw=" + "HP " + str + "&_sacat=58058"
            url3 = new URL(str0);
            chrome.tabs.create({ url: url3.href, index: tab.index + 1 });
            url2 = new URL(`https://partsurfer.hp.com`);
            url2.searchParams.set('searchtext', str);
            chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
            break;

        case "APrt":
            chrome.windows.create(
                {
                    'type': 'normal'
                }, function (newWin) {
                    /* Remove the new, empty tab created by default */
                    chrome.tabs.query({
                        windowId: newWin.id
                    }, function (tabsToClose) {
                        RunPRT(tab, str, newWin.id, strID);
                        chrome.tabs.query({currentWindow: true }, function (tabs) {
                            chrome.tabs.remove(tabs[0].id);
                        });
                    });
                });
             break;

        case "APc":
            chrome.windows.create(
                {
                    'type': 'normal'
                }, function (newWin) {
                    /* Remove the new, empty tab created by default */
                    chrome.tabs.query({
                        windowId: newWin.id
                    }, function (tabsToClose) {
                        RunPC(tab, str, newWin.id, strID);
                        chrome.tabs.query({ currentWindow: true }, function (tabs) {
                            chrome.tabs.remove(tabs[0].id);
                        });
                    });
                });
            break;
        case "AAio":
            chrome.windows.create(
                {
                    'type': 'normal'
                }, function (newWin) {
                    /* Remove the new, empty tab created by default */
                    chrome.tabs.query({
                        windowId: newWin.id
                    }, function (tabsToClose) {
                        RunAIO(tab, str, newWin.id, strID);
                        chrome.tabs.query({ currentWindow: true }, function (tabs) {
                            chrome.tabs.remove(tabs[0].id);
                        });
                    });
                });
            break;
    }


});

