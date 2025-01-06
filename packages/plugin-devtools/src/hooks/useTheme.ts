import { flavors } from '@catppuccin/palette';
import { type CSSProperties, useMemo } from 'react';

export const useTheme = () => {
  const theme = chrome?.devtools?.panels?.themeName ?? 'dark';
  const { colors, inverseColors } = useMemo(
    () =>
      theme === 'dark'
        ? {
            colors: flavors.mocha.colors,
            inverseColors: flavors.latte.colors,
          }
        : {
            colors: flavors.latte.colors,
            inverseColors: flavors.mocha.colors,
          },
    [theme],
  );

  const transparent = 'rgba(0, 0, 0, 0)';

  //126, 129, 138
  return {
    accent: colors.mauve.hex,
    secondary: colors.sky.hex,
    highlight: colors.yellow.hex,
    backgroundColor: colors.base.hex,
    backgroundColorMuted: colors.crust.hex,
    backgroundColorInverse: inverseColors.base.hex,
    color: colors.text.hex,
    colorMuted: colors.subtext0.hex,
    colorInverse: inverseColors.text.hex,
    border: colors.overlay0.hex,

    red: colors.red.hex,
    blue: colors.blue.hex,
    green: colors.green.hex,
    yellow: colors.yellow.hex,

    dragHandleSize: 8,
    toolbarHeight: 24,

    transparent,

    // :(
    // https://github.com/frenic/csstype#what-should-i-do-when-i-get-type-errors
    jsonViewer: {
      '--w-rjv-color': colors.text.hex,
      '--w-rjv-key-number': colors.mauve.hex,
      '--w-rjv-key-string': colors.mauve.hex,
      '--w-rjv-background-color': 'rgba(0, 0, 0, 0)',
      '--w-rjv-line-color': colors.peach.hex,
      '--w-rjv-arrow-color': colors.text.hex,
      '--w-rjv-edit-color': colors.peach.hex,
      '--w-rjv-info-color': colors.overlay0.hex,
      '--w-rjv-update-color': colors.peach.hex,
      '--w-rjv-copied-color': colors.green.hex,
      '--w-rjv-copied-success-color': colors.green.hex,
      '--w-rjv-curlybraces-color': colors.flamingo.hex,
      '--w-rjv-colon-color': colors.text.hex,
      '--w-rjv-brackets-color': colors.flamingo.hex,
      '--w-rjv-ellipsis-color': colors.text.hex,
      '--w-rjv-quotes-color': colors.text.hex,
      '--w-rjv-quotes-string-color': colors.text.hex,
      '--w-rjv-type-string-color': colors.green.hex,
      '--w-rjv-type-int-color': colors.peach.hex,
      '--w-rjv-type-float-color': colors.peach.hex,
      '--w-rjv-type-bigint-color': colors.peach.hex,
      '--w-rjv-type-boolean-color': colors.teal.hex,
      '--w-rjv-type-date-color': colors.peach.hex,
      '--w-rjv-type-url-color': colors.green.hex,
      '--w-rjv-type-null-color': colors.red.hex,
      '--w-rjv-type-nan-color': colors.red.hex,
      '--w-rjv-type-undefined-color': colors.red.hex,
    } as CSSProperties,
  };
};
