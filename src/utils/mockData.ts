import { CompetitorsMapRequestData } from '../types'

export const generateMockCompanies = (
  count: number = 5
): CompetitorsMapRequestData['competitors'] => {
  const companies: CompetitorsMapRequestData['competitors'] = []
  const names = [
    'ООО Ромашка',
    'ИП Сидоров',
    'ЗАО Луч',
    'ОАО Вектор',
    'ТД Прогресс',
    'Компания Альтаир',
    'Фирма Север',
    'Предприятие Юг',
    'Корпорация Запад',
    'Холдинг Восток',
  ]

  const managers = [
    'Петров П.П.',
    'Сидоров С.С.',
    'Иванова И.И.',
    'Кузнецов К.К.',
    'Смирнов С.С.',
    'Попов П.П.',
    'Лебедев Л.Л.',
    'Козлов К.К.',
    'Новиков Н.Н.',
    'Морозов М.М.',
  ]

  const prices = [
    'Оптовая',
    'Мелкооптовая',
    'Розничная',
    'Специальная',
    'Договорная',
  ]
  const relationshipTypes = [
    'Клиент',
    'Поставщик',
    'Клиент/поставщик',
    'Партнер',
    'Конкурент',
  ]

  const moscowCenter = { lat: 55.7558, lng: 37.6176 }

  for (let i = 0; i < count; i++) {
    const lat = moscowCenter.lat + (Math.random() - 0.5) * 0.1
    const lng = moscowCenter.lng + (Math.random() - 0.5) * 0.1

    companies.push({
      name: names[Math.floor(Math.random() * names.length)],
      manager: managers[Math.floor(Math.random() * managers.length)],
      price: prices[Math.floor(Math.random() * prices.length)],
      revenue_last_3_months: Math.floor(Math.random() * 10000000) + 1000000,
      relationship_type:
        relationshipTypes[Math.floor(Math.random() * relationshipTypes.length)],
      last_sale_date: new Date(
        Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split('T')[0],
      latitude: lat,
      longitude: lng,
      address: `Москва, ул. Примерная, ${Math.floor(Math.random() * 100) + 1}`,
      phone: `+7999${Math.random().toString().slice(2, 9)}`,
    })
  }

  return companies
}
