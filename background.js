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
  //for (const [tld, locale] of Object.entries(tldLocales)) {
    chrome.contextMenus.create({
      id: 'HP',
      title: 'HPsearch',
      type: 'normal',
      contexts: ['selection']
    });
  //}
});

// Open a new search tab when the user clicks a context menu
chrome.contextMenus.onClicked.addListener((item, tab) => {
  //const tld = item.menuItemId;
    const url = new URL(`https://support.hp.com/us-en/deviceSearch`);
    url.searchParams.set('q', item.selectionText);
    url.searchParams.append('origin','pdp');
  chrome.tabs.create({ url: url.href, index: tab.index + 1 });
});


