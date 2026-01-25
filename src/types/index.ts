export interface Counterparty {
  guid: string
  manager: string
  price: string
  latitude: number
  longitude: number
  address: string
  phone: string
}

export interface Competitor {
  id?: number
  counterpartyGuid: string
  name: string
  manager: string
  price: string
  revenue_last_3_months: number
  relationship_type: string
  last_sale_date: string
  latitude: number
  longitude: number
  address: string
  phone: string
}

export interface CompetitorsMapRequestData extends Counterparty {
  competitors: Omit<Competitor, 'id' | 'counterpartyGuid'>[]
}

export interface MapData {
  counterparty: Counterparty
  competitors: Competitor[]
}

export interface CounterpartyInstance extends Counterparty {
  competitors?: Competitor[]
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  action?: 'created' | 'updated'
  mapUrl?: string
}

export enum Queue {
  CreateCounterparty = 'create_counterparty',
}
