/*
 * ISO 4217 Коды для представления валют
 * https://ru.wikipedia.org/wiki/%D0%9E%D0%B1%D1%89%D0%B5%D1%80%D0%BE%D1%81%D1%81%D0%B8%D0%B9%D1%81%D0%BA%D0%B8%D0%B9_%D0%BA%D0%BB%D0%B0%D1%81%D1%81%D0%B8%D1%84%D0%B8%D0%BA%D0%B0%D1%82%D0%BE%D1%80_%D0%B2%D0%B0%D0%BB%D1%8E%D1%82
 * https://en.wikipedia.org/wiki/List_of_circulating_currencies
 */

export const currencyList = [
  {
    label: 'Российский рубль',
    value: 'RUB',
    symbol: '₽',
    code: '643',
  },
  {
    label: 'Доллар США',
    value: 'USD',
    symbol: '$',
    code: '840',
  },
  {
    label: 'Евро',
    value: 'EUR',
    symbol: '€',
    code: '978',
  },
  {
    label: 'Английский фунт стерлингов',
    value: 'GBP',
    symbol: '£',
    code: '826',
  },
  {
    label: 'Японская йена',
    value: 'JPY',
    symbol: '¥',
    code: '392',
  },
  {
    label: 'Швейцарский франк',
    value: 'CHF',
    symbol: 'Fr.',
    code: '756',
  },
  {
    label: 'Китайский юань',
    value: 'CNY',
    symbol: '¥',
    code: '156',
  },
  {
    label: 'Украинская гривна',
    value: 'UAH',
    symbol: '₴',
    code: '980',
  },
  {
    label: 'Армянский драм',
    value: 'AMD',
    symbol: '֏',
    code: '051',
  },
  {
    label: 'Австралийский доллар',
    value: 'AUD',
    symbol: '$',
    code: '036',
  },
  {
    label: 'Азербайджанский манат',
    value: 'AZN',
    symbol: '₼',
    code: '944',
  },
  {
    label: 'Болгарский лев',
    value: 'BGN',
    symbol: 'лв.',
    code: '975',
  },
  {
    label: 'Бразильский реал',
    value: 'BRL',
    symbol: '$',
    code: '986',
  },
  {
    label: 'Беларусский рубль',
    value: 'BYN',
    symbol: 'Br',
    code: '933',
  },
  {
    label: 'Канадский доллар',
    value: 'CAD',
    symbol: '$',
    code: '124',
  },
  {
    label: 'Чешская крона',
    value: 'CZK',
    symbol: 'Kč',
    code: '203',
  },
  {
    label: 'Датская крона',
    value: 'DKK',
    symbol: 'kr',
    code: '208',
  },
  {
    label: 'Гонконгский доллар',
    value: 'HKD',
    symbol: '$',
    code: '344',
  },
  {
    label: 'Венгерский форинт',
    value: 'HUF',
    symbol: 'ƒ',
    code: '348',
  },
  {
    label: 'Индийская рупия',
    value: 'INR',
    symbol: '₹',
    code: '356',
  },
  {
    label: 'Киргизский сом',
    value: 'KGS',
    symbol: 'с',
    code: '417',
  },
  {
    label: 'Южнокорейская вона',
    value: 'KRW',
    symbol: '₩',
    code: '410',
  },
  {
    label: 'Казахский тенге',
    value: 'KZT',
    symbol: '₸',
    code: '398',
  },
  {
    label: 'Молдавский лей',
    value: 'MDL',
    symbol: 'L',
    code: '498',
  },
  {
    label: 'Норвежская крона',
    value: 'NOK',
    symbol: 'kr',
    code: '578',
  },
  {
    label: 'Польский злотый',
    value: 'PLN',
    symbol: 'zł',
    code: '985',
  },
  {
    label: 'Новый румынский лей',
    value: 'RON',
    symbol: 'RON',
    code: '946',
  },
  {
    label: 'Шведская крона',
    value: 'SEK',
    symbol: 'kr',
    code: '752',
  },
  {
    label: 'SGD, СИНГАПУРСКИЙ ДОЛЛАР',
    value: 'SGD',
    symbol: '$',
    code: '702',
  },
  {
    label: 'Таджиксий сомони',
    value: 'TJS',
    symbol: 'с.',
    code: '972',
  },
  {
    label: 'Новый туркменский манат',
    value: 'TMT',
    symbol: 'm.',
    code: '934',
  },
  {
    label: 'Турецкая лира',
    value: 'TRY',
    symbol: '₺',
    code: '949',
  },
  {
    label: 'Узбекский сум',
    value: 'UZS',
    symbol: 'Sʻ',
    code: '860',
  },
  {
    label: 'Южноафриканский ренд',
    value: 'ZAR',
    symbol: 'R',
    code: '710',
  },
] as const

type CurrencyISOCodes = (typeof currencyList)[number]['value']

type Options = {
  currency?: CurrencyISOCodes
  withZero?: boolean
  precision?: number
}

const SPACE = String.fromCharCode(160) // &nbsp;

const SEPARATOR = ','
const SPLIT_PART_SIZE = 3
const SPLIT_FROM = 5

const isTruthy = (value: unknown): boolean => !!value || value === 0

export const formatAmount = (
  value: number | string,
  options?: Options
): string => {
  const { currency, withZero = false, precision = 2 } = options || {}
  if (!isTruthy(value)) {
    return ''
  }

  const parsed = String(value).replace(SEPARATOR, '.')
  const fixed = Number(parsed).toFixed(precision)

  let formatted = String(withZero ? fixed : Number(fixed)).replace(
    '.',
    SEPARATOR
  )

  const [majorPart, minorPart] = formatted.split(SEPARATOR)

  /*
   * Если длина суммы меньше требуемой, не форматируем сумму
   * Не учитываем минус (-)
   */
  if (majorPart.replace('-', '').length >= SPLIT_FROM) {
    const splitted = majorPart.replace(
      new RegExp(`\\B(?=(\\d{${SPLIT_PART_SIZE}})+(?!\\d))`, 'g'),
      SPACE
    )

    formatted =
      minorPart?.length > 0 ? `${splitted}${SEPARATOR}${minorPart}` : splitted
  }

  if (currency) {
    const currencySymbol =
      currencyList.find((item) => item.value === currency)?.symbol || ''

    formatted = `${formatted}${SPACE}${currencySymbol}`
  }

  return formatted
}
