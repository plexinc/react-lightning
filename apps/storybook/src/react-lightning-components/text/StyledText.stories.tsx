import { StyledText } from '@plex/react-lightning-components';
import React from 'react';
import Button from '../../components/Button';
import { DefaultStoryWidth } from '../../helpers/constants';

const LANGUAGE = {
  EN: 'en',
  DE: 'de',
  IT: 'it',
  IE: 'ie',
};

const PhoneFriendFirstLine = {
  [LANGUAGE.EN]: 'Your friend says',
  [LANGUAGE.DE]: 'Dein Freund sagt',
  [LANGUAGE.IT]: 'Il tuo amico dice',
  [LANGUAGE.IE]: 'Your friend says',
};

const PhoneFriendSecondLine = {
  [LANGUAGE.EN]: `"I am pretty sure the answer is {answer}"`,
  [LANGUAGE.DE]: `"Ich bin mir ziemlich sicher, dass die Antwort {answer} ist"`,
  [LANGUAGE.IT]: `"Sono abbastanza sicuro che la risposta sia {answer}"`,
  [LANGUAGE.IE]: `"I am pretty sure the answer is {answer}"`,
};

export default {
  title: '@plex∕react-lightning-components/Text/StyledText',
  component: StyledText,
};

const baseStyle = {
  fontSize: 20,
  lineHeight: 40,
  color: 0xffffffff,
};

const positionStyles = {
  x: 50,
  y: 50,
  position: 'absolute' as const,
};

// Default usage with simple placeholders
export const Default = () => {
  const values = {
    friendName: 'Dana', // Example value to replace placeholder
    answer: 'A', // Example value to replace placeholder
  };

  const tagStyles = {
    friendName: {
      color: 0xffccddff,
    },
    answer: {
      color: 0xff9900ff,
    },
  };

  const language = LANGUAGE.EN;
  const firstLineText = PhoneFriendFirstLine[language] as string;
  const secondLineText = PhoneFriendSecondLine[language] as string;

  return (
    <lng-view style={positionStyles}>
      <StyledText
        text={firstLineText}
        values={values}
        tagStyles={tagStyles}
        textStyle={baseStyle}
      />
      <StyledText
        text={secondLineText}
        values={values}
        tagStyles={tagStyles}
        textStyle={baseStyle}
        style={{ y: 60 }}
      />
    </lng-view>
  );
};

export const TextWithTags = () => {
  const tagStyles = {
    green: { color: 0x00ff00ff },
    red: { color: 0xff0000ff },
  };

  const text = '<green>Green</green> and <red>red</red> text';

  return (
    <lng-view style={positionStyles}>
      <StyledText
        text={text}
        values={{}}
        tagStyles={tagStyles}
        textStyle={baseStyle}
      />
    </lng-view>
  );
};

// Multiple placeholders with different styles
export const MultiplePlaceholders = () => {
  const values = {
    friendName: 'John Doe',
    answer: 'B',
    question: 'What is the capital of France?',
  };

  const tagStyles = {
    friendName: { color: 0xffccddff },
    answer: { color: 0xff9900ff },
    question: { fontStyle: 'italic' as const, color: 0xccdddd99 },
  };

  const text =
    'Hello {friendName}, your answer is {answer} for the question: {question}.';

  return (
    <StyledText
      text={text}
      values={values}
      tagStyles={tagStyles}
      textStyle={baseStyle}
      style={positionStyles}
    />
  );
};

// Dynamic style changes based on state
export const DynamicStyles = () => {
  const values = {
    answer: 'C',
  };

  const [isCorrect, setIsCorrect] = React.useState(false);

  const dynamicStyles = {
    answer: {
      color: isCorrect ? 0x00ff00ff : 0xff0000ff, // Green for correct, Red for incorrect
    },
  };

  const handleAnswerCheck = () => {
    // Simulate answer check logic
    setIsCorrect(!isCorrect); // Toggle correctness for demo purposes
  };

  return (
    <lng-view style={positionStyles}>
      <StyledText
        text="Your answer is {answer}."
        values={values}
        tagStyles={dynamicStyles}
        textStyle={baseStyle}
      />
      <Button onPress={handleAnswerCheck} style={{ y: 100 }}>
        Toggle Answer
      </Button>
    </lng-view>
  );
};

// Multilingual support for dynamic language changes
export const MultilingualSupport = () => {
  const values = {
    friendName: 'Carlos',
    answer: 'B',
  };

  const tagStyles = {
    friendName: {
      color: 0xffccddff,
    },
    answer: {
      color: 0xff9900ff,
    },
  };
  const languages = [LANGUAGE.EN, LANGUAGE.DE, LANGUAGE.IT];
  const [currentLanguage, setCurrentLanguage] = React.useState(LANGUAGE.EN);

  const firstLineText = PhoneFriendFirstLine[currentLanguage] as string;
  const secondLineText = PhoneFriendSecondLine[currentLanguage] as string;

  const changeLanguage = () => {
    const nextIndex =
      (languages.indexOf(currentLanguage) + 1) % languages.length;
    const newLanguage = languages[nextIndex] as string;
    setCurrentLanguage(newLanguage);
  };

  return (
    <lng-view style={positionStyles}>
      <StyledText
        text={firstLineText}
        values={values}
        tagStyles={tagStyles}
        textStyle={baseStyle}
      />
      <StyledText
        text={secondLineText}
        values={values}
        tagStyles={tagStyles}
        textStyle={baseStyle}
        style={{ y: 60 }}
      />

      <Button onPress={changeLanguage} style={{ y: 150 }}>
        Change Language
      </Button>
    </lng-view>
  );
};

export const NestedTags = () => {
  const values = {
    string1: 'This is variable 1',
    string2: 'This is variable 2',
  };

  const dynamicStyles = {
    green: {
      color: 0x00ff00ff,
    },
    red: {
      color: 0xff0000ff,
    },
  };

  return (
    <lng-view style={positionStyles}>
      <StyledText
        text="Here is a green variable: <green>{string1}</green>."
        values={values}
        tagStyles={dynamicStyles}
        textStyle={baseStyle}
      />
      <StyledText
        text="And then the red version <red>with text next to the variable: {string2}</red>."
        values={values}
        tagStyles={dynamicStyles}
        textStyle={baseStyle}
        style={{ y: 60 }}
      />
    </lng-view>
  );
};
