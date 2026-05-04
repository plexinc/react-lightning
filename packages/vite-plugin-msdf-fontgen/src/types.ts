import type { SdfFontInfo } from '@lightningjs/msdf-generator';

interface OverrideOption {
  fontSize?: number;
  distanceRange?: number;
}
interface Override {
  [fontName: string]: {
    msdf?: OverrideOption;
    ssdf?: OverrideOption;
  };
}

export interface OptionsInput {
  /**
   * Path to the input directory containing the font files. Fonts found in
   * subdirectories will keep their folder structure in the output directory.
   */
  src: string;
  /**
   * Path to the output directory. All fonts will be placed into this directory,
   * even if multiple directories are specified as inputs. Subdirectories will
   * be retained from the input.
   */
  dest: string;
  /**
   * Type of font to generate. Defaults to ['msdf']
   */
  types: SdfFontInfo['fieldType'][];
  /**
   * Font extensions to include. If multiple font files with the same name but
   * with different extensions are found, it will use the first one it finds
   * based on the order of this array. Defaults to ttf, otf, woff, and woff2
   */
  extensions: string[];
  /**
   * Charset to include in the generated font. If there is a charset.config.json
   * file in the input directory, or if the charsetFile option is set, they will
   * be used instead. Defaults to
   * ' !\\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~’“”'
   */
  charset?: string;
  /**
   * Path to a charset file. If this is set, it will be used instead of the charset option.
   */
  charsetFile: string;
  /**
   * Overrides for font generation. This allows you to specify custom font sizes
   * and distance ranges for specific fonts. The key is the font name. If an
   * overrides.json file is present in the input directory, that will be used instead.
   */
  overrides?: Override;
  /**
   * Path to a overrides file. If this is set, it will be used instead of the overrides option.
   */
  overridesFile: string;
}

export interface Options {
  inputs: OptionsInput[];
  /**
   * Force regeneration of fonts even if they already exist
   */
  force: boolean;
  /**
   * The folder to use to store plugin cache data. Defaults to '.font-cache'
   */
  cacheFolder: string;
  /**
   * If true, copies the original font files to the output directory. Defaults to false
   */
  copyOriginalToDestDir: boolean;
}

type RequiredProps<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: T[P] };

export type OptionsInputArg = RequiredProps<Partial<OptionsInput>, 'src' | 'dest'>;

export type OptionsArg = Omit<Partial<Options>, 'inputs'> & {
  inputs: OptionsInputArg[];
};
