import { create } from '@storybook/theming';

export default create({
  base: 'dark',
  brandTitle: 'Plex Theme',
  brandUrl: 'https://plex.tv',
  brandImage:
    'https://www.plex.tv/wp-content/themes/plex/assets/img/plex-logo.svg',
  brandTarget: '_top',

  // Colors
  colorPrimary: 'rgb(229, 160, 13)',
  colorSecondary: 'rgb(243, 177, 37)',

  appBg: 'rgba(0, 0, 0, 0.8)',
  appContentBg: 'rgb(28, 28, 28)',
  appBorderColor: 'rgba(255, 255, 255, 0.1)',
  appBorderRadius: 4,
  appPreviewBg: 'rgba(0, 0, 0, 0.8)',

  barBg: 'rgba(0, 0, 0, 0.3)',
  barTextColor: 'rgba(255, 255, 255, 0.8)',
  barHoverColor: 'rgb(229, 160, 13)',
  barSelectedColor: 'rgb(229, 160, 13)',

  textMutedColor: 'rgba(255, 255, 255, 0.6)',
  textColor: 'rgba(255, 255, 255, 0.8)',
  textInverseColor: 'rgb(28, 28, 28)',
});
