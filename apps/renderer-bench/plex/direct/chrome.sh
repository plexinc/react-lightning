#!/bin/bash
# chrome.sh <port>: headless Chrome with its own profile under the scratchpad, no bfcache.
p=$1
nohup "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=$p --user-data-dir=/private/tmp/claude-502/-Volumes-Development-react-native-client--claude-worktrees-session-3-580cfb/5251ef56-6513-4f4d-ba76-8e327f3ea24e/scratchpad/direct/chrome-$p --window-size=1920,1080 --no-first-run --no-default-browser-check --autoplay-policy=no-user-gesture-required --disable-back-forward-cache --disable-features=BackForwardCache about:blank > /private/tmp/claude-502/-Volumes-Development-react-native-client--claude-worktrees-session-3-580cfb/5251ef56-6513-4f4d-ba76-8e327f3ea24e/scratchpad/direct/chrome-$p.log 2>&1 &
echo $! > /private/tmp/claude-502/-Volumes-Development-react-native-client--claude-worktrees-session-3-580cfb/5251ef56-6513-4f4d-ba76-8e327f3ea24e/scratchpad/direct/chrome-$p.pid
