enum Keys {
  Unknown = 'Unknown',

  Up = 'Up',
  Down = 'Down',
  Left = 'Left',
  Right = 'Right',

  Enter = 'Enter',
  Back = 'Back',

  VolumeUp = 'VolumeUp',
  VolumeDown = 'VolumeDown',

  Stop = 'Stop',
  Pause = 'Pause',
  Play = 'Play',
  PlayPause = 'PlayPause',
  Rewind = 'Rewind',
  FastForward = 'FastForward',
  StepBack = 'StepBack',
  StepForward = 'StepForward',
  SkipPrevious = 'SkipPrevious',
  SkipNext = 'SkipNext',
  CycleAudioPrevious = 'CycleAudioPrevious',
  CycleAudioNext = 'CycleAudioNext',
  ToggleSubtitles = 'ToggleSubtitles',
  CycleSubtitlesPrevious = 'CycleSubtitlesPrevious',
  CycleSubtitlesNext = 'CycleSubtitlesNext',
  CycleAspectRatio = 'CycleAspectRatio',
  TogglePlayed = 'TogglePlayed',
  DecreaseAudioDelay = 'DecreaseAudioDelay',
  IncreaseAudioDelay = 'IncreaseAudioDelay',
  DecreaseSubtitlesDelay = 'DecreaseSubtitlesDelay',
  IncreaseSubtitlesDelay = 'IncreaseSubtitlesDelay',

  Home = 'Home',
  Search = 'Search',
  Menu = 'Menu',
  Info = 'Info',
  // Debug presents a verbose info view in the Qt host.
  Debug = 'Debug',
  Exit = 'Exit',
  PowerOff = 'PowerOff',
  Reboot = 'Reboot',
  Suspend = 'Suspend',

  PreviousTab = 'PreviousTab',
  NextTab = 'NextTab',
  PageUp = 'PageUp',
  PageDown = 'PageDown',

  ToggleFullScreen = 'ToggleFullScreen',

  Num0 = 'Num0',
  Num1 = 'Num1',
  Num2 = 'Num2',
  Num3 = 'Num3',
  Num4 = 'Num4',
  Num5 = 'Num5',
  Num6 = 'Num6',
  Num7 = 'Num7',
  Num8 = 'Num8',
  Num9 = 'Num9',

  Period = 'Period', // IP Address entry

  // A fake key to allow clicks that wouldn't get to the appropriate screen
  // (ie. *MediaPlaybackScreen while playing) to be passed to them.
  VirtualClick = 'VirtualClick',

  // Restarts the app
  Restart = 'Restart',

  // A key that does nothing.
  // Allows generic platforms to disable a default keycode.
  Disabled = 'Disabled',
}

export { Keys };
