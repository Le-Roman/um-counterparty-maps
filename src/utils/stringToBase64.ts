export const stringToBase64 = (str: string) => {
    const bytes = new TextEncoder().encode(str)
    const binString = String.fromCodePoint(...bytes)
    return btoa(binString)
  }