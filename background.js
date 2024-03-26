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



// do not want any white space in the lookup
// any trailing period or comma needs to be removed
// remove any parenthesis
function ExtractSearchID(str) {
    var n=0, res="", str0 = "";
    str = str.trim();

    //remove any parens anywhere
    str0 = str.replace("(", "").replace(")", "");
    while (str0 != str) {
        str = str0;
        str0 = str.replace("(", "").replace(")", "");
    }
    
    //remove trailing periods or commas
    n = str.length - 1;
    res = str.charAt(n);
    if (res == '.' || res == ',') str0 = str.substring(0, n);

    while (str0 != str)
    {
        str = str0;
        let n = str.length - 1;
        let res = str.charAt(n);
        if (res == '.' || res == ',') str0 = str.substring(0, n);
    }



    return str;
}

// need to figure out how to identify the below arguement as a string!!!  
// this is not standard VBA !!!
function RemoveCountryCode(strStupid)
{
    var str = strStupid.trim(); 
    var i = str.indexOf("#");
    if (i < 0) return str;
    return str.substring(0, i);
}

//https://youtube.com/@HPSupport/search?query=deskjet%203755
function RunPRT(tab, str, id) {
    var url1, url2, url3, url4;
    url4 = new URL(`https://youtube.com/@HPSupport/search?query=` + str);
    chrome.tabs.create({ url: url4.href, index: tab.index + 1 })
    url3 = new URL(`https://www.google.com/search`);
    url3.searchParams.set('q', str + ' youtube network connect');
    chrome.tabs.create({ url: url3.href, windowId: id, index: tab.index + 1 });
    url2 = new URL(`https://www.google.com/search`);
    url2.searchParams.set('q', str + ' printer factory reset');
    chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
    url1 = new URL(`https://support.hp.com/us-en/deviceSearch`);
    url1.searchParams.set('q', str);
    url1.searchParams.append('origin', 'pdp');
    chrome.tabs.create({ url: url1.href, windowId: id, index: tab.index + 1 });
}

function RunAIO(tab, str, id)
{
    var url1, url2, url3;
    url3 = new URL(`https://www.google.com/search`);
    url3.searchParams.set('q', str + ' disassembly');
    chrome.tabs.create({ url: url3.href, windowId: id, index: tab.index + 1 });
    url2 = new URL(`https://partsurfer.hp.com/partsurfer`);
    url2.searchParams.set('searchtext', str);
    chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
    url1 = new URL(`https://support.hp.com/us-en/deviceSearch`);
    url1.searchParams.set('q', str);
    url1.searchParams.append('origin', 'pdp');
    chrome.tabs.create({ url: url1.href, windowId: id, index: tab.index + 1 });
}


function RunPC(tab, str, id)
{
    var url1, url2;
    url2 = new URL(`https://partsurfer.hp.com/partsurfer`);
    url2.searchParams.set('searchtext', str);
    chrome.tabs.create({ url: url2.href, windowId: id, index: tab.index + 1 });
    url1 = new URL(`https://support.hp.com/us-en/deviceSearch`);
    url1.searchParams.set('q', str);
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
    let str1 = ExtractSearchID(item.selectionText);
    let str = RemoveCountryCode(str1);
    chrome.tabs.query({
        windowId: id
    });

    switch (tld)
    {
        case "PRN":
            RunPRT(tab, str, id);
            break;

        case "AIO":
            RunAIO(tab, str, id);
            break;

        case "PC":
            RunPC(tab, str, id);
            break;

        case "OEM":
            url3 = new URL(`https://www.google.com/search`);
            url3.searchParams.set('q', str);
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
            let str0 = "https://www.ebay.com/sch/i.html?_nkw=" + str + "&_sacat=58058"
            url3 = new URL(str0);
            chrome.tabs.create({ url: url3.href, index: tab.index + 1 });
            url2 = new URL(`https://partsurfer.hp.com/partsurfer`);
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
                        RunPRT(tab, str, newWin.id);
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
                        RunPC(tab, str, newWin.id);
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
                        RunAIO(tab, str, newWin.id);
                        chrome.tabs.query({ currentWindow: true }, function (tabs) {
                            chrome.tabs.remove(tabs[0].id);
                        });
                    });
                });
            break;
    }


});

