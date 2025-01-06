const localStorageKey = 'clientIdentifier';
const random = (targetLength = 24) => {
  let result = '';

  while (result.length < targetLength) {
    result += Math.random()
      .toString(36)
      .substring(2, targetLength - result.length + 2);
  }

  return result;
};

export const getClientIdentifier = (): string => {
  const identifier = localStorage.getItem(localStorageKey);

  if (identifier) {
    return identifier;
  }

  const newIdentifier = random();

  localStorage.setItem(localStorageKey, newIdentifier);

  return newIdentifier;
};
