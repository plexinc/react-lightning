---
'@plextv/react-native-lightning': patch
---

Add a findNodeHandle export that returns the element ref instead of throwing (react-native-web's re-export throws unconditionally). Lightning focus APIs (setDestinations, focus hints) take element refs directly, so shared RN code that funnels refs through findNodeHandle now works unchanged.
