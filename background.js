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


chrome.contextMenus.onClicked.addListener((item, tab) => {
    const url1 = new URL(`https://support.hp.com/us-en/deviceSearch`);
    url1.searchParams.set('q', item.selectionText);
    url1.searchParams.append('origin','pdp');
    chrome.tabs.create({ url: url1.href, index: tab.index + 1 });
    const url2 = new URL(`https://partsurfer.hp.com/partsurfer`);
    url2.searchParams.set('searchtext', item.selectionText);
    chrome.tabs.create({ url: url2.href, index: tab.index + 1 });
});


