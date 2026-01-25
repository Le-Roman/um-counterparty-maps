import { Router } from 'express'
import { generateMockCompanies } from '../utils/mockData'

const router = Router()

// GET - тестовые данные API
router.get('/api/test-data', (req, res) => {
  const testData = {
    guid: 'test-' + Date.now(),
    manager: 'Тестовый Менеджер',
    price: 'Спец +15',
    revenue_last_3_months: 420000.0,
    latitude: 55.7558,
    longitude: 37.6176,
    address: 'Москва, Красная площадь',
    phone: '+79990000000',
    competitors: generateMockCompanies(3),
  }
  res.json(testData)
})

export default router
