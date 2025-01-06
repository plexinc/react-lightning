# Building

- `pnpm install`
- `pnpm build`

This will create the files needed for the extension in the `dist` folder.

`pnpm dev` will watch for changes and re-build.

# Usage

### Integrating into your react-lightning app

Import the plugin:

`import devtoolsPlugin from '@plex/react-lightning-plugin-devtools/plugin'`

Include the options in the react-lightning render options:

```
const options: RenderOptions = {
  // ... other options
  plugins: [devtoolsPlugin(), /* other plugins */],
};
```

### Adding devtools to Chrome

- Go to our Chrome extensions settings
- Enable `Developer mode`
- Select `Load unpacked`
- Navigate to the `dist` folder created from the build
- Open devtools and you should see a `React Lightning` panel

Note: During development, any changes to the entrypoint files or manifest may require
restarting devtools or sometimes even a reload of the extension if you don't see
your changes.
