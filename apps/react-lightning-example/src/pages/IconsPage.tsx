const iconGlyphs =
  '!#$%*+0123456789<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz©®⌨⏳⏾■●◻◼☀☑☝☹♚♛♜♝♞♟♥⚪⚫⚽✅✉✋✌✱❄❆❓❔❕❗❤➕⬛⬜⬤⭐懶癩駱藍朗李吝';
const charsPerLine = 30;

export const IconsPage = () => {
  return (
    <lng-view>
      {iconGlyphs
        .match(new RegExp(`.{1,${charsPerLine}}`, 'g'))
        ?.map((line, i) => (
          <lng-text
            key={line}
            style={{
              fontFamily: 'fa-regular-400',
              fontSize: 40,
            }}
          >
            {line}
          </lng-text>
        ))}
    </lng-view>
  );
};
