import type {
  LightningTextElementStyle,
  LightningViewElement,
  LightningViewElementProps,
  LightningViewElementStyle,
} from '@plextv/react-lightning';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

type Part = {
  content?: string | Part[];
  key: number;
  tag?: string; // custom tag (e.g., <green>)
  placeholder?: string; // Placeholder like {friendName}, {answer}
};

const BASE_STYLE = {
  fontSize: 18,
  lineHeight: 24,
};

let wordWrapErrorShown = false;

export type StyledTextProps = LightningViewElementProps & {
  /**
   * Input text with placeholders and custom tags.
   */
  text: string;
  /**
   * Key-value pairs for replacing placeholders.
   */
  values?: Record<string, string>;
  /**
   * Styles for placeholders or custom tags.
   */
  tagStyles?: Record<string, LightningTextElementStyle>;
  /**
   * Base style for all text elements. This style is applied to all text elements unless overridden by tagStyles.
   */
  textStyle?: Omit<LightningTextElementStyle, 'contain'>;
  /**
   * Style for the container view element.
   */
  style?: LightningViewElementStyle;
};

type TextSegmentProps = {
  part: Part;
  tagStyles: Record<string, LightningTextElementStyle>;
  style: LightningTextElementStyle;
  handleTextureLoaded: () => void;
};

const TextSegment: React.FC<TextSegmentProps> = ({
  part,
  tagStyles,
  style,
  handleTextureLoaded,
}) => {
  if (typeof part.content === 'string') {
    const lastCharEmpty = part.content?.slice(-1) === ' ';

    return (
      <lng-text
        key={part.key}
        style={style}
        onTextureReady={handleTextureLoaded}
      >
        {`${part.content}${lastCharEmpty ? ' ' : ''}`}
      </lng-text>
    );
  }

  if (Array.isArray(part.content)) {
    return (
      <>{applyTags(part.content, tagStyles, style, handleTextureLoaded)}</>
    );
  }

  return null;
};

const parseText = (
  inputText: string,
  values: { [key: string]: string },
): Part[] => {
  const parts: Part[] = [];
  const regex = /<(\w+)>(.*?)<\/\1>|{(\w+)}|([^<{]+)/g; // Match <green>...</green>, {placeholder}, or plain text
  let match = regex.exec(inputText);
  let key = 0;

  while (match !== null) {
    // match[1] - Custom tag name (e.g., green)
    // match[2] - Text inside the custom tag
    // match[3] - Placeholder name (e.g., friendName)
    if (match[1]) {
      // Matched custom tag like <green>...</green>
      parts.push({
        content: match[2] ? parseText(match[2], values) : '', // Text inside the custom tag
        key: key++,
        tag: match[1], // Custom tag name
      });
    } else if (match[3]) {
      // Matched placeholder like {friendName} or {answer}
      const placeholderText = values[match[3]] || `{${match[3]}}`;
      parts.push({
        content: placeholderText, // Replace the placeholder value with `values`
        key: key++,
        placeholder: match[3],
      });
    } else if (match[4]) {
      // Matched plain text
      parts.push({
        content: match[4],
        key: key++,
      });
    }

    match = regex.exec(inputText);
  }

  return parts;
};

const applyTags = (
  textParts: Part[],
  tagStyles: Record<string, LightningTextElementStyle>,
  textStyle: LightningTextElementStyle,
  onLoad: () => void,
): React.ReactNode => {
  return textParts.map((part: Part) => {
    // Determine if the part is a placeholder or a custom tag, and apply relevant styles
    let combinedStyle = { ...textStyle };

    if (part.placeholder && tagStyles[part.placeholder]) {
      // Apply custom styles for placeholders like {friendName}, {answer}
      combinedStyle = {
        ...combinedStyle,
        ...tagStyles[part.placeholder],
      };
    }

    if (part.tag && tagStyles[part.tag]) {
      // Apply custom tag styles (like <green>)
      combinedStyle = { ...combinedStyle, ...tagStyles[part.tag] };
    }

    return (
      <TextSegment
        key={part.key}
        part={part}
        tagStyles={tagStyles}
        style={combinedStyle}
        handleTextureLoaded={onLoad}
      />
    );
  });
};

const StyledText: React.FC<StyledTextProps> = ({
  text,
  values = {},
  tagStyles = {},
  textStyle = {},
  style = {},
}) => {
  const containerRef = useRef<LightningViewElement>(null);

  const setPositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    let cumulativeWidth = 0;

    for (const child of container.children) {
      const childNode = child.node;
      childNode.x = cumulativeWidth;
      cumulativeWidth += childNode.width || 0;
    }
  }, []);

  const handleTextureLoaded = useCallback(() => {
    setPositions();
  }, [setPositions]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: The extra dependencies are added to force re-render when those values change
  useEffect(() => {
    if (containerRef.current) {
      setPositions();
    }
  }, [text, values, tagStyles, setPositions]);

  // Parse the text into parts (plain text, placeholders, and custom tags)
  const parts = useMemo(() => parseText(text, values), [text, values]);

  const combinedTextStyle = useMemo(
    () => ({
      ...BASE_STYLE,
      ...textStyle,
    }),
    [textStyle],
  );

  const containerFinalStyle: LightningViewElementStyle = useMemo(
    () => ({
      ...style,
      // In case flexbox plugin is included, use row flow
      flexDirection: 'row',
    }),
    [style],
  );

  // TODO: Dev only warning. Remove in production.
  if ('contain' in textStyle && !wordWrapErrorShown) {
    console.error(
      '[StyledText] Error: Word wrapping is not supported with this component. Please remove the "contain" property from the styles.',
    );
    wordWrapErrorShown = true;
  }

  return (
    <lng-view ref={containerRef} style={containerFinalStyle}>
      {applyTags(parts, tagStyles, combinedTextStyle, handleTextureLoaded)}
    </lng-view>
  );
};

StyledText.displayName = 'StyledText';

export default StyledText;
