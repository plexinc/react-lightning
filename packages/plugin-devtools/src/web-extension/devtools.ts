import { sendMessage } from 'webext-bridge/devtools';
/*global chrome*/

/**
 * Run when devtools.html is automatically added to the Chrome devtools panels.
 * It creates a new pane using the panes/index.html which includes EmberInspector.
 */
chrome.devtools.panels.create(
  '⚡ React-Lightning',
  'lng.svg',
  'src/web-extension/extension.html',
  (panel) => {
    panel.onShown.addListener(() => {
      sendMessage('connected', null, 'window');
    });

    panel.onHidden.addListener(() => {
      sendMessage('disconnected', null, 'window');
    });
  },
);
