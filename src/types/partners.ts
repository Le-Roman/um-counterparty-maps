export interface PartnerProduct {
  id?: number
  partner_guid: string
  name: string
  oborot: number
  last_sale_date_product?: string
}

export interface Partner {
  guid: string
  name: string
  price: string
  priority: number
  phone?: string
  email?: string
  manager?: string
  relationship_type?: string
  address: string
  latitude: number
  longitude: number
  revenue_last_n_months: number
  last_sale_date?: string
  clients_transferred: number
  clients_in_progress: number
  clients_converted: number
  client_request_guid?: string
  products?: PartnerProduct[]
}

export interface ClientRequest {
  guid: string
  date: string
  population: number
  variant_map: number
  partnerGuid: string | null
  buyer_name: string
  phone: string
  address: string
  latitude: number
  longitude: number
}

export interface ClientRequestData extends ClientRequest {
  partner: Omit<Partner, 'id' | 'client_request_guid'>[]
}

export interface ClientRequestInstance extends ClientRequest {
  partners: Partner[]
}
