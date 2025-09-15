import type { ITextNode } from '@lightningjs/renderer';
import type { LightningTextElementProps } from '@plextv/react-lightning';
import type { Meta } from '@storybook/react-vite';
import {
  DefaultStoryHeight,
  DefaultStoryWidth,
} from '../../../helpers/constants';

type Props = {
  text: string;
  maxLines: number;
  maxWidth: ITextNode['maxWidth'];
};

export default {
  title: 'react-lightning/Examples/Text/Text Wrapping',
  argTypes: {
    text: {
      type: { name: 'string', required: false },
      description: 'Text to render',
      control: {
        type: 'text',
      },
    },
    maxLines: {
      type: { name: 'number', required: false },
      description: 'Max number of lines of text',
      control: {
        type: 'number',
      },
    },
    maxWidth: {
      type: { name: 'number', required: false },
      description: 'Max width of the text container',
      control: {
        type: 'number',
      },
    },
  },
} as Meta<LightningTextElementProps>;

export const TextWrapping = ({ text, maxLines, maxWidth }: Props) => {
  return (
    <lng-text
      text={text}
      style={{
        color: 0xffff44ff,
        fontSize: 30,
        maxLines,
        maxWidth,
        width: DefaultStoryWidth,
      }}
    />
  );
};

TextWrapping.args = {
  text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed hendrerit vestibulum magna, eu tempor quam porta quis. Ut dignissim scelerisque luctus. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nulla aliquet, velit eget bibendum laoreet, quam mi lobortis tortor, sit amet tristique nibh metus a lacus. Curabitur tristique egestas nunc. Sed quis mi a nisl placerat aliquam. Nunc suscipit sodales augue, sed pulvinar ex malesuada vitae. Ut posuere ultrices diam, cursus vulputate felis aliquam eget. Mauris et blandit mi.',
  maxLines: 3,
  maxWidth: 400,
};

export const FlexTextWrapping = ({ text, maxLines, maxWidth }: Props) => {
  return (
    <lng-view
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: DefaultStoryWidth,
        height: DefaultStoryHeight,
        color: 0xff00ffff,
        padding: 16,
        gap: 16,
      }}
    >
      <lng-view style={{ flex: '1 0', color: 0xffff44ff }}>
        <lng-text
          text={text}
          style={{
            fontSize: 30,
            maxLines,
            maxWidth,
            color: 0x000000ff,
          }}
        />
      </lng-view>
      <lng-view style={{ flex: '1 0', color: 0x44ffffff }}>
        <lng-text
          text={text}
          style={{
            fontSize: 30,
            maxLines,
            maxWidth,
            color: 0x000000ff,
          }}
        />
      </lng-view>
    </lng-view>
  );
};

FlexTextWrapping.args = {
  text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed hendrerit vestibulum magna, eu tempor quam porta quis. Ut dignissim scelerisque luctus. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nulla aliquet, velit eget bibendum laoreet, quam mi lobortis tortor, sit amet tristique nibh metus a lacus. Curabitur tristique egestas nunc. Sed quis mi a nisl placerat aliquam. Nunc suscipit sodales augue, sed pulvinar ex malesuada vitae. Ut posuere ultrices diam, cursus vulputate felis aliquam eget. Mauris et blandit mi.',
  maxLines: 3,
  maxWidth: 400,
};
