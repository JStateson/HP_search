// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// When you specify "type": "module" in the manifest background,
// you can include the service worker as an ES Module,

// Joseph Stateson Dec 9, 2023 
// extension to search the HP database for product IDs
// I used the api sample programs from google.


// Add a listener to create the initial context menu items,
// context menu items only need to be created at runtime.onInstalled
chrome.runtime.onInstalled.addListener(async () => {
    chrome.contextMenus.create({
      id: 'HP',
      title: 'HPsearch',
      type: 'normal',
      contexts: ['selection']
    });
});

// do not want any white space in the lookup
// any trailing period or comma needs to be removed
// remove any parenthesis
function ExtractSearchID(str) {
    str = str.trim();
    let n = str.length - 1;
    let res = str.charAt(n);
    if (res == '.' || res == ',') str = str.substring(1, n);
    str = str.replace("(", "").replace(")", "");
    return str;
}

// jstateson:  extract product ID xxxxx from (xxxxx)
//  (HP M01-F2248nf)  changes to HP M01-F2248nf
// white spaces are dropped before and after the text
// F224nf. becomes F224nf
chrome.contextMenus.onClicked.addListener((item, tab) => {
    let str = ExtractSearchID(item.selectionText);
    const url2 = new URL(`https://partsurfer.hp.com/partsurfer`);
    url2.searchParams.set('searchtext', str);
    chrome.tabs.create({ url: url2.href, index: tab.index + 1 });
    const url1 = new URL(`https://support.hp.com/us-en/deviceSearch`);
    url1.searchParams.set('q', str);
    url1.searchParams.append('origin','pdp');
    chrome.tabs.create({ url: url1.href, index: tab.index + 1 });
});


