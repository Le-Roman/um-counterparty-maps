import { ClientRequestInstance, Partner } from '../types/partners'
import { formatAmount } from './formatAmount'

 const addClientUrl = `https://${process.env.HOST}/api/maps/partners/add_client`

export class PartnersMapRenderer {
  static generateHTML(guid: string, data: ClientRequestInstance): string {
    if (!process.env.YANDEX_API_KEY) return 'Не задан API KEY'
    return this.generateYandexMapHTML(guid, data)
  }

  private static generateYandexMapHTML(
    guid: string,
    data: ClientRequestInstance
  ): string {
    // Собираем всех партнеров
    const allPartners = data.partners || []

    // Группируем с учетом контрагента
    const groups = this.groupPartnersByCoordinates(allPartners, data)

    // Подсчет статистики
    const totalPartners = allPartners.length
    const unmarkedPartners = allPartners.filter(
      (p) =>
        !p.longitude || !p.latitude || p.longitude === 0 || p.latitude === 0
    ).length

    // Собираем уникальные товары для фильтров
    const allProducts: string[] = []
    allPartners.forEach((partner) => {
      if (partner.products) {
        partner.products.forEach((product) => {
          if (product.name && !allProducts.includes(product.name)) {
            allProducts.push(product.name)
          }
        })
      }
    })

    // Собираем уникальные цены
    const uniquePrices = Array.from(
      new Set(allPartners.map((p) => p.price).filter(Boolean))
    )

    // Тексты в зависимости от variant_map
    const getVariantLabels = (variant: number) => {
      switch (variant) {
        case 1:
          return {
            selectedTypes: 'по выбранным типам товаров',
            productsHeader: 'Оборот за период',
          }
        case 2:
          return {
            selectedTypes: 'по выбранной номенклатуре',
            productsHeader: 'Оборот за период',
          }
        default:
          return {
            selectedTypes: 'по выбранным типам товаров',
            productsHeader: 'Оборот за период',
          }
      }
    }

    const labels = getVariantLabels(data.variant_map)

    // Рассчитываем суммарный оборот по всем товарам для каждого партнера
    const partnersWithTotals = allPartners.map((partner) => {
      const totalProductsOborot = partner.products
        ? partner.products.reduce(
            (sum, product) => sum + (product.oborot || 0),
            0
          )
        : 0

      return {
        ...partner,
        // Используем totalProductsOborot для отображения в обычном режиме (до фильтрации)
        // selectedProductsTotal будет пересчитываться динамически при фильтрации
        totalProductsOborot,
        formattedTotalProductsOborot: formatAmount(totalProductsOborot, {
          currency: 'RUB',
        }),
      }
    })

    return `
<!DOCTYPE html>
<html>
  <head>
    <title>Заявка - ${data.buyer_name}</title>
    <meta charset="utf-8" />
    <script src="https://api-maps.yandex.ru/v3/?apikey=${
      process.env.YANDEX_API_KEY
    }&lang=ru_RU"></script>
    <style>
      html,
      body {
        height: 100%;
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
        overflow: hidden;
      }
      #map {
        width: 100vw;
        height: 100vh;
        position: fixed;
        top: 0;
        left: 0;
        overflow: hidden;
      }
      /* Контейнер для балунов поверх карты */
      .balloons-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 1000;
        overflow: visible;
      }
      .balloon-container {
        position: absolute;
        pointer-events: auto;
        transform: translate(-50%, -100%);
        z-index: 1000;
      }
      .balloon-container.active {
        z-index: 10000 !important;
      }
      .balloon {
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        width: 320px;
        font-family: Arial, sans-serif;
        border: 2px solid #ccc;
        position: relative;
        margin-bottom: 10px;
        pointer-events: auto;
        box-sizing: border-box;
      }
      .balloon.active {
        border-color: #999;
      }
      /* Стрелка балуна */
      .balloon::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 10px solid transparent;
        border-top-color: #ccc;
      }
      .balloon::before {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 10px solid transparent;
        border-top-color: white;
        margin-top: -2px;
        z-index: 1;
      }
      .balloon.active::after {
        border-top-color: #999;
      }
      .balloon h3 {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 0 0 10px 0;
        color: #333;
        border-bottom: 1px solid #eee;
        padding-bottom: 5px;
      }
      .balloon h4 {
        margin: 0 0 8px 0;
        color: #444;
        font-size: 14px;
      }
      .balloon p {
        margin: 5px 0;
        color: #666;
        font-size: 13px;
      }
      .balloon strong {
        color: #333;
      }
      /* Иконки статусов */
      .status-icons {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-left: 8px;
      }
      .priority-icon {
        color: #0066cc;
        font-size: 18px;
        margin-bottom: 1px;
      }
      .selected-icon {
        color: #28a745;
        font-size: 14px;
      }
      /* Кнопки */
      .toggle-collapse-btn {
        background: transparent;
        border: none;
        color: #666;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      .toggle-collapse-btn:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #333;
      }
      .toggle-collapse-btn .icon {
        width: 16px;
        height: 16px;
        transition: transform 0.3s ease;
      }
      .toggle-collapse-btn.collapsed .icon {
        transform: rotate(180deg);
      }
      /* Стили для группы партнеров в балуне */
      .partners-group {
        max-height: 240px;
        overflow-y: auto;
        padding-right: 5px;
        margin-top: 10px;
        transition: max-height 0.3s ease, opacity 0.3s ease;
      }
      .balloon.collapsed .partners-group {
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        margin-top: 0;
      }
      .partner-section {
        border: 1px solid #eee;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 12px;
        background: #f9f9f9;
        position: relative;
      }
      .partner-section:last-child {
        margin-bottom: 0;
      }
      .partner-section.compact {
        cursor: pointer;
      }
      .partner-section.expanded {
        background: #fff;
        border-color: #ddd;
      }
      .partner-section.compact:hover {
        background: #f0f0f0;
      }
      /* Приоритетный партнер - светло-синий фон */
      .partner-section.priority {
        background: #e6f7ff !important;
        border-left: 3px solid #0066cc;
      }
      /* Выбранный партнер - светло-зеленый фон */
      .partner-section.selected {
        background: #d4edda !important;
        border-left: 3px solid #28a745;
      }
      .partner-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .partner-section-title {
        font-weight: bold;
        color: #333;
        font-size: 14px;
        flex: 1;
      }
      .partner-count-badge {
        height: 16px;
        background: #0051ff;
        color: white;
        font-size: 14px;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: bold;
        margin-left: 8px;
      }
      .toggle-more-btn {
        background: rgba(0, 123, 255, 0.15);
        border: none;
        color: #0051ff;
        cursor: pointer;
        font-size: 12px;
        padding: 6px 10px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: background 0.2s ease;
        margin-top: 8px;
        width: 100%;
        justify-content: center;
      }
      .toggle-more-btn:hover {
        background: rgba(0, 123, 255, 0.1);
      }
      .toggle-more-btn .icon {
        width: 12px;
        height: 12px;
        transition: transform 0.3s ease;
      }
      .toggle-more-btn.expanded .icon {
        transform: rotate(180deg);
      }
      /* Кнопка выбора партнера */
      .select-partner-btn {
        background: #0051ff;
        border: none;
        color: #fff;
        cursor: pointer;
        font-size: 12px;
        padding: 6px 10px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: background 0.2s ease;
        margin-top: 8px;
        width: 100%;
        justify-content: center;
        font-weight: bold;
      }
      .select-partner-btn:hover {
        background: #0051ffb0;
      }
      .select-partner-btn:disabled {
        color: #6c757d;
        cursor: not-allowed;
      }
      .select-partner-btn:disabled:hover {
        background: transparent;
      }
      .partner-compact {
        display: block;
      }
      .partner-expanded {
        display: none;
      }
      .partner-section.compact .partner-compact {
        display: block;
      }
      .partner-section.compact .partner-expanded {
        display: none;
      }
      .partner-section.expanded .partner-compact {
        display: none;
      }
      .partner-section.expanded .partner-expanded {
        display: block;
      }
      .hidden-section {
        display: none !important;
      }
      .partners-section.hidden-section {
        display: none !important;
      }
      /* Стили для ссылки открытия поповера с товарами */
      .products-details-link {
        color: #0051ff;
        cursor: pointer;
        font-size: 13px;
        text-decoration: underline;
        text-decoration-style: dotted;
        display: inline;
        transition: color 0.2s;
        background: none;
        border: none;
        padding: 0;
      }
      .products-details-link:hover {
        color: #003dcc;
        text-decoration: underline;
      }
      /* Стили для поповера с товарами */
      .products-popover {
        position: fixed;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 100000;
        width: 500px;
        max-height: 400px;
        overflow: hidden;
        display: none;
      }
      .products-popover.active {
        display: block;
      }
      .products-popover-header {
        padding: 12px 16px;
        background: #f8f9fa;
        border-bottom: 1px solid #eee;
        font-weight: bold;
        font-size: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .products-popover-header-title {
        display: flex;
        flex-direction: column
      }

      .close-popover-btn {
        background: transparent;
        border: none;
        color: #666;
        cursor: pointer;
        font-size: 16px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      .close-popover-btn:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #333;
      }
      .products-table-container {
        max-height: 320px;
        overflow-y: auto;
      }
      .products-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .products-table th {
        background: #f1f3f4;
        padding: 10px 12px;
        text-align: left;
        font-weight: 600;
        color: #333;
        border-bottom: 1px solid #ddd;
        position: sticky;
        top: 0;
        z-index: 5;
      }
      .products-table td {
        padding: 10px 12px;
        border-bottom: 1px solid #eee;
      }
      .products-table tr:hover {
        background: #f9f9f9;
      }
      .products-table .product-name {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .products-table .product-oborot {
        text-align: right;
        font-weight: 600;
        color: #333;
      }
      .products-table .product-date {
        text-align: center;
        color: #666;
        font-size: 12px;
      }
      .products-table-footer {
        position: sticky;
        bottom: 0;
        background: #f8f9fa;
        border-top: 2px solid #ddd;
        z-index: 10;
      }
      .products-table-footer td {
        font-weight: bold;
        color: #333;
      }
      .no-products {
        padding: 20px;
        text-align: center;
        color: #666;
        font-style: italic;
      }
      /* Стили маркеров */
      .pin-marker {
        width: 34px;
        height: 34px;
        cursor: pointer;
        transform: translate(-17px, -34px);
        position: relative;
        transition: transform 0.2s ease;
      }
      /* Активный маркер */
      .pin-marker.active {
        filter: drop-shadow(0 0 8px rgba(0, 81, 255, 0.7));
        transform: translate(-17px, -34px) scale(1.1);
        z-index: 1001;
      }
      /* Зеленый маркер для клиента */
      .pin-marker.green svg path {
        fill: seagreen;
      }
      /* Синий маркер для партнеров */
      .pin-marker.blue svg path {
        fill: #0051ff;
      }
      /* Стили для counter на маркере (синий цвет) */
      .marker-count-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #0051ff; /* Синий цвет */
        color: white;
        font-size: 11px;
        font-weight: bold;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        z-index: 3;
      }
      .marker-count-badge.hidden {
        display: none !important;
      }
      .hidden-marker {
        display: none !important;
      }
      /* Панель фильтров */
      .filters-panel {
        position: fixed;
        top: 15px;
        left: 15px;
        background: rgba(60, 60, 60, 0.95);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        backdrop-filter: blur(2px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        max-width: 320px;
        width: 320px;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        transition: all 0.3s ease;
      }

      .filters-panel.compact {
        height: auto;
        min-height: auto;
        max-height: none;
        overflow: visible;
      }

      .filters-panel.expanded {
        max-height: 80vh;
        overflow-y: auto;
      }

      .filters-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 0;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        cursor: pointer;
        flex-shrink: 0;
        user-select: none;
        min-height: 24px;
      }

      .filters-header:hover {
        background: rgba(255, 255, 255, 0.05);
        margin: -8px -8px 0 -8px;
        padding: 8px 8px 8px 8px;
        border-radius: 4px;
      }

      .filters-header h3 {
        margin: 0;
        color: white;
        font-size: 16px;
        flex: 1;
      }

      .toggle-arrow {
        width: 16px;
        height: 16px;
        transition: transform 0.3s ease;
        color: #ccc;
        flex-shrink: 0;
      }
      .toggle-arrow.down {
        transform: rotate(0deg);
      }

      .toggle-arrow.up {
        transform: rotate(180deg);
      }

      /* Поиск */
      .search-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        margin: 10px 0;
        box-sizing: border-box;
        display: block;
      }

      .search-input::placeholder {
        color: #aaa;
      }

      .filter-content {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px 0;
        opacity: 1;
        transition: opacity 0.2s ease;
      }

      .filters-panel.compact .filter-content {
        display: none;
      }

      .filters-panel.expanded .filter-content {
        display: flex;
      }

      .filter-checkbox {
        display: flex;
        align-items: center;
        margin: 6px 0;
        cursor: pointer;
        padding: 4px 0px;
        border-radius: 3px;
        transition: background-color 0.2s;
        user-select: none;
      }

      .filter-checkbox:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .filter-checkbox input {
        margin-right: 8px;
        cursor: pointer;
        flex-shrink: 0;
      }

      .filter-checkbox label {
        cursor: pointer;
        user-select: none;
        flex-grow: 1;
        margin: 0;
        font-size: 13px;
        display: block;
        line-height: 1.4;
      }

      .filter-checkbox.checked {
        background: rgba(255, 255, 255, 0.2);
      }

      .filter-checkbox.checked:hover {
        background: rgba(255, 255, 255, 0.25);
      }

      .filters-actions {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.3);
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .filters-stats {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.3);
        font-size: 12px;
        color: #ccc;
        line-height: 1.4;
        flex-shrink: 0;
      }

      .reset-filters {
        background: #6c757d;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        width: 100%;
        transition: background 0.2s;
        flex-shrink: 0;
      }

      .reset-filters:hover {
        background: #5a6268;
      }

      .toggle-cards-btn {
        background: #2c7c3e;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        width: 100%;
        transition: background 0.2s;
        flex-shrink: 0;
      }

      .toggle-cards-btn:hover {
        background: #218838;
      }

      .stats-population {
        font-weight: bold;
        margin-bottom: 4px;
      }

      .stats-total {
        font-weight: bold;
        margin-bottom: 4px;
      }

      .stats-unmarked {
        color: #ff6b6b;
        font-weight: bold;
        margin-top: 4px;
      }

      .filter-section {
        margin-top: 8px;
        flex-shrink: 0;
      }

      .filter-section h4 {
        margin: 0 0 8px 0;
        color: #ccc;
        font-size: 14px;
        font-weight: bold;
      }

      .priority-container {
        margin: -10px 0;
      }

      .prices-container,
      .products-container {
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.1);
        flex-shrink: 0;
      }

      .revenue-filter {
        display: flex;
        flex-direction: column;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.1);
        gap: 6px;
        flex-shrink: 0;
      }

      .revenue-option {
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 4px 0;
      }
      
      .revenue-option input {
        margin-right: 8px;
        cursor: pointer;
        flex-shrink: 0;
      }
      
      .revenue-option label {
        cursor: pointer;
        user-select: none;
        flex-grow: 1;
        margin: 0;
        font-size: 13px;
      }
      /* Информационный блок для выбранного партнера */
      .info-panel {
        position: fixed;
        top: 80px;
        left: 15px;
        background: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 99999;
        max-width: 320px;
        width: 320px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
        border: 2px solid #28a745;
      }
      .info-panel h4 {
        margin: 0 0 10px 0;
        color: #28a745;
        font-size: 16px;
      }
      .info-panel .partner-info {
        background: #f8f9fa;
        padding: 10px;
        border-radius: 4px;
        margin-bottom: 10px;
        border-left: 3px solid #28a745;
      }
      .info-panel .instruction {
        background: #fff3cd;
        padding: 10px;
        border-radius: 4px;
        border-left: 3px solid #ffc107;
        font-size: 12px;
        color: #856404;
      }
      /* Модальное окно */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000000;
        animation: fadeIn 0.3s ease;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      .modal-content {
        background: white;
        padding: 25px;
        border-radius: 8px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        animation: slideIn 0.3s ease;
      }
      @keyframes slideIn {
        from {
          transform: translateY(-20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      .modal-content h3 {
        margin: 0 0 15px 0;
        color: #333;
        text-align: center;
      }
      .modal-content p {
        margin: 0 0 20px 0;
        color: #666;
        text-align: center;
        line-height: 1.5;
      }
      .modal-actions {
        display: flex;
        gap: 10px;
        justify-content: center;
      }
      .modal-btn {
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        border: none;
        min-width: 100px;
        transition: all 0.2s;
      }
      .modal-btn.cancel {
        background: #6c757d;
        color: white;
      }
      .modal-btn.cancel:hover {
        background: #5a6268;
      }
      .modal-btn.cancel:disabled {
        background: #6c757d;
        cursor: not-allowed;
      }
      .modal-btn.confirm {
        min-width: 132px;
        background: #2c7c3e;
        color: white;
      }
      .modal-btn.confirm:hover {
        background: #218838;
      }
      .modal-btn.confirm:disabled {
        background: #6c757d;
        cursor: not-allowed;
      }
      .spinner {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s linear infinite;
        margin-right: 8px;
        vertical-align: middle;
      }
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
      /* Стили для секции клиента */
      .client-section {
        animation: intensePulse 1.5s infinite;
        border: 3px solid #4caf50;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
        background: linear-gradient(135deg, #ffffff 0%, #e8f5e9 100%);
        position: relative;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
      }
      .client-section::before {
        content: '🔥 НОВЫЙ КЛИЕНТ';
        position: absolute;
        top: 0;
        right: 0;
        background: linear-gradient(135deg, #4caf50, #2e7d32);
        color: white;
        font-size: 10px;
        font-weight: bold;
        padding: 3px 8px;
        border-radius: 0 0 0 6px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        z-index: 2;
      }
      .client-section::after {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: #f8ffef;
        border-radius: 10px;
        z-index: 1;
        opacity: 0.7;
        animation: borderGlow 2s infinite;
      }
      @keyframes intensePulse {
        0% {
          box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
          transform: scale(1);
        }
        50% {
          box-shadow: 0 0 0 15px rgba(76, 175, 80, 0);
          transform: scale(1.02);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
          transform: scale(1);
        }
      }
      @keyframes borderGlow {
        0% {
          opacity: 0.3;
        }
        50% {
          opacity: 0.7;
        }
        100% {
          opacity: 0.3;
        }
      }
      .client-section h4 {
        color: #2e7d32;
        margin-top: 0;
        margin-bottom: 10px;
        padding-right: 85px;
        font-size: 15px;
        font-weight: bold;
        position: relative;
        z-index: 2;
      }
      .client-section p {
        position: relative;
        z-index: 2;
        margin: 6px 0;
        font-size: 13px;
      }
      .client-section strong {
        color: #1b5e20;
        font-weight: bold;
      }
      /* Стили для скроллбара */
      .filter-content::-webkit-scrollbar {
        width: 6px;
      }
      .filter-content::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
      }
      .filter-content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
      }
      .filter-content::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }
      .prices-container::-webkit-scrollbar,
      .products-container::-webkit-scrollbar {
        width: 6px;
      }
      .prices-container::-webkit-scrollbar-track,
      .products-container::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
      }
      .prices-container::-webkit-scrollbar-thumb,
      .products-container::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
      }
      .prices-container::-webkit-scrollbar-thumb:hover,
      .products-container::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }
      .balloon ::-webkit-scrollbar-track {
        background: #f1f1f1;
      }
      .balloon ::-webkit-scrollbar-thumb {
        background: #ccc;
      }
      .balloon ::    webkit-scrollbar-thumb:hover {
        background: #aaa;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div class="balloons-overlay" id="balloonsOverlay"></div>
    <script>
      const clientRequestData = ${JSON.stringify(data)};
      const allPartners = ${JSON.stringify(partnersWithTotals)};
      const groups = ${JSON.stringify(groups)};
      const allProducts = ${JSON.stringify(allProducts)};
      const uniquePrices = ${JSON.stringify(uniquePrices)};
      const totalPartners = ${totalPartners};
      const unmarkedPartners = ${unmarkedPartners};
      const selectedPartnerGuid = ${JSON.stringify(data.partnerGuid)};
      const labels = ${JSON.stringify(labels)};
      const variantMap = ${data.variant_map};
      const addClientUrl = ${JSON.stringify(addClientUrl)}

      // Подсчитываем сколько партнеров с координатами
      const partnersWithCoords = allPartners.filter(
        (p) =>
          p.latitude &&
          p.longitude &&
          p.latitude !== 0 &&
          p.longitude !== 0
      ).length;

      // Считаем общее количество точек на карте
      let totalPointsOnMap = 0;
      Object.values(groups).forEach((group) => {
        if (group.coordinates) {
          totalPointsOnMap++;
        }
      });

      let activeFilters = {
        search: '',
        priorityOnly: false,
        selectedProducts: [],
        selectedPrices: [],
        revenueRange: 'all' // Добавляем фильтр по обороту
      };

      let partnerMarkers = [];
      let partnerBalloons = new Map();
      let partnerGroupsData = new Map();
      let allCardsVisible = true;

      ymaps3.ready.then(() => {
        const {
          YMap,
          YMapDefaultSchemeLayer,
          YMapDefaultFeaturesLayer,
          YMapMarker,
        } = ymaps3;

        let center = [37.64, 55.76];

        function getZoom() {
          const minZoom = 12;
          const maxZoom = 18;
          const groupsWithCoords = Object.values(groups).filter(
            (g) => g.coordinates
          ).length;
          const result = minZoom + Math.ceil(groupsWithCoords / 100);
          if (result > maxZoom) return maxZoom;
          return result;
        }

        let zoom = getZoom();

        // Ищем первую группу с координатами
        const firstGroupWithCoords = Object.values(groups).find(
          (group) => group.coordinates
        );
        if (firstGroupWithCoords) {
          center = firstGroupWithCoords.coordinates;
        }

        const map = new YMap(
          document.getElementById('map'),
          {
            location: {
              center,
              zoom,
            },
          },
          [
            new YMapDefaultSchemeLayer({}),
            new YMapDefaultFeaturesLayer({}),
          ]
        );

        // Генерация HTML для чекбоксов с правильной структурой
        const generateCheckboxesHTML = (items, type) => {
          return items
            .map((item, index) => {
              const safeId = item.replace(/[^a-zA-Z0-9]/g, '_') + '_' + index;
              return \`
                <div class="filter-checkbox" data-item="\${item}">
                  <input type="checkbox" id="\${type}_\${safeId}" value="\${item}">
                  <label for="\${type}_\${safeId}">\${item}</label>
                </div>
              \`;
            })
            .join('');
        };

        // Генерация HTML для фильтра по обороту (аналогично CompetitorsMapRenderer)
        const generateRevenueFilterHTML = () => {
          return \`
            <div class="filter-section">
              <h4>Оборот за период</h4>
              <div class="revenue-filter">
                <div class="revenue-option">
                  <input type="radio" id="revenue-all" name="revenue" value="all" checked>
                  <label for="revenue-all">Любой</label>
                </div>
                <div class="revenue-option">
                  <input type="radio" id="revenue-less-100k" name="revenue" value="less-100k">
                  <label for="revenue-less-100k">Менее 100 000 ₽</label>
                </div>
                <div class="revenue-option">
                  <input type="radio" id="revenue-100k-plus" name="revenue" value="100k-plus">
                  <label for="revenue-100k-plus">От 100 000 ₽</label>
                </div>
                <div class="revenue-option">
                  <input type="radio" id="revenue-500k-plus" name="revenue" value="500k-plus">
                  <label for="revenue-500k-plus">От 500 000 ₽</label>
                </div>
                <div class="revenue-option">
                  <input type="radio" id="revenue-1m-plus" name="revenue" value="1m-plus">
                  <label for="revenue-1m-plus">От 1 000 000 ₽</label>
                </div>
              </div>
            </div>
          \`;
        };

        const filtersPanel = document.createElement('div');
        filtersPanel.className = \`filters-panel compact \${unmarkedPartners ? 'unmarkedPartners' : ''}\`;
        filtersPanel.innerHTML = \`
          <div class="filters-header" id="filtersHeader">
            <h3>Фильтры партнеров</h3>
            <svg class="toggle-arrow down" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M7.41 8.84L12 13.42l4.59-4.58L18 10.25l-6 6-6-6z"/>
            </svg>
          </div>
          <input type="text" class="search-input" id="searchPartners" placeholder="Поиск партнеров по названию" />
          <div class="filter-content" id="filterContent">
            <div class='priority-container'>
              <div class="filter-checkbox">
                <input type="checkbox" id="priorityOnly">
                <label for="priorityOnly">Только приоритетные клиенты</label>
              </div>
            </div>

            \${
              uniquePrices.length > 0
                ? \`
            <div class="filter-section">
              <h4>Вид цены</h4>
              <div class="prices-container" id="pricesContainer">
                \${generateCheckboxesHTML(uniquePrices, 'price')}
              </div>
            </div>
            \` : ''
            }
            
            \${generateRevenueFilterHTML()}
            
            \${
              allProducts.length > 0
                ? \`
            <div class="filter-section">
              <h4>\${variantMap === 2 ? "Номенклатура" : "Тип товаров"}</h4>
              <div class="products-container" id="productsContainer">
                \${generateCheckboxesHTML(allProducts, 'product')}
              </div>
            </div>
            \`
                : ''
            }
          
          </div>
          <div class="filters-actions" id="filtersActions">
            <button class="reset-filters" id="resetFilters">Сбросить фильтры</button>
            <button class="toggle-cards-btn" id="toggleCardsBtn">Скрыть все карточки</button>
          </div>
          <div class="filters-stats">
            \${
              clientRequestData.population > 0
                ? \`<div class="stats-population" style="margin-top: 4px;">Население: <span id="population">\${clientRequestData.population} чел.</span></div>\`
                : ''
            }
            <div class="stats-total" style="margin-top: 4px;">Показано: <span id="visiblePartnersCount">\${partnersWithCoords}</span> из ${totalPartners}</div>
            \${
              unmarkedPartners > 0
                ? \`<div class="stats-unmarked" id="unmarkedStats">Не отмечены на карте: \${unmarkedPartners}</div>\`
                : ''
            }
          </div>
        \`;

        document.body.appendChild(filtersPanel);

        const balloonsOverlay = document.getElementById('balloonsOverlay');
        let currentActiveContainer = null;
        const balloonContainers = new Map();
        let updateInterval = null;

        // Функция сортировки партнеров в группе
        function sortPartnersInGroup(partners) {
          return [...partners].sort((a, b) => {
            // 1. Выбранный партнер всегда первый
            if (a.guid === selectedPartnerGuid && b.guid !== selectedPartnerGuid)
              return -1;
            if (a.guid !== selectedPartnerGuid && b.guid === selectedPartnerGuid)
              return 1;
            // 2. Приоритетные партнеры
            if (a.priority === 1 && b.priority !== 1) return -1;
            if (a.priority !== 1 && b.priority === 1) return 1;
            // 3. Сортировка по названию для одинакового статуса
            return a.name.localeCompare(b.name);
          });
        }

        // Функция форматирования суммы
        function formatAmount(amount, options = {}) {
          const { currency = 'RUB' } = options;
          if (typeof amount !== 'number' || isNaN(amount)) return '0 ₽';
          // Форматирование с разделителями тысяч
          const formatted = new Intl.NumberFormat('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(amount);
          return currency === 'RUB'
            ? \`\${formatted} ₽\`
            : \`\${formatted} \${currency}\`;
        }

        // --- НОВАЯ ФУНКЦИЯ: пересчёт данных партнера с учётом фильтров ---
        function recalculatePartnerTotals(partner) {
          // Фильтруем товары по активным фильтрам
          const filteredProducts = partner.products ? partner.products.filter(product => {
            // Фильтр по товарам
            if (activeFilters.selectedProducts.length > 0) {
              if (!activeFilters.selectedProducts.includes(product.name)) {
                return false;
              }
            }
            return true;
          }) : [];

          // Считаем оборот по отфильтрованным товарам
          const filteredOborotTotal = filteredProducts.reduce((sum, product) => sum + (product.oborot || 0), 0);

          return {
            ...partner,
            // Эти поля будут использоваться для отображения в UI
            calculatedFilteredProducts: filteredProducts,
            calculatedFilteredOborotTotal: filteredOborotTotal,
            calculatedFormattedFilteredOborotTotal: formatAmount(filteredOborotTotal, { currency: 'RUB' })
          };
        }
        // --- /НОВАЯ ФУНКЦИЯ ---

        // Функция для генерации таблицы товаров
        function generateProductsTableHTML(products, partnerName) {
          if (!products || products.length === 0) {
            return '<div class="no-products">нет данных</div>';
          }

          // Считаем общую сумму (для отфильтрованных товаров)
          const totalOborot = products.reduce(
            (sum, product) => sum + (product.oborot || 0),
            0
          );

          // Сортируем товары по обороту (по убыванию)
          const sortedProducts = [...products].sort(
            (a, b) => (b.oborot || 0) - (a.oborot || 0)
          );

          return \`
            <table class="products-table">
              <thead>
                <tr>
                  <th style="width: 50%;">Товар</th>
                  <th style="width: 25%; text-align: right;">Оборот</th>
                  <th style="width: 25%; text-align: center;">Последний заказ</th>
                </tr>
              </thead>
              <tbody>
                \${sortedProducts
                  .map(
                    (product) => \`
                  <tr>
                    <td class="product-name" title="\${
                      product.name || 'Без названия'
                    }">
                      \${product.name || 'Без названия'}
                    </td>
                    <td class="product-oborot">
                      \${product.oborot
                        ? formatAmount(product.oborot, { currency: 'RUB' })
                        : '0 ₽'}
                    </td>
                    <td class="product-date">
                      \${product.last_sale_date_product ||
                        product.last_sale_date ||
                        '-'}
                    </td>
                  </tr>
                \`
                  )
                  .join('')}
              </tbody>
              <tfoot class="products-table-footer">
                <tr>
                  <td><strong>Итого:</strong></td>
                  <td style="text-align: right;">
                    <strong>\${formatAmount(totalOborot, { currency: 'RUB' })}</strong>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          \`;
        }

        // Функция для переключения компактного режима
        function toggleFilters() {
          const isCompact = filtersPanel.classList.contains('compact');
          const arrow = document.querySelector('.toggle-arrow');
          if (isCompact) {
            filtersPanel.classList.remove('compact');
            filtersPanel.classList.add('expanded');
            arrow.classList.remove('down');
            arrow.classList.add('up');
          } else {
            filtersPanel.classList.add('compact');
            filtersPanel.classList.remove('expanded');
            arrow.classList.remove('up');
            arrow.classList.add('down');
          }
        }

        document
          .getElementById('filtersHeader')
          .addEventListener('click', toggleFilters);

        // Функция проверки партнера по фильтрам (ОБНОВЛЕНА с учетом оборота)
        function partnerMatchesFilters(partner) {
          // Поиск по названию
          if (
            activeFilters.search &&
            !partner.name
              .toLowerCase()
              .includes(activeFilters.search.toLowerCase())
          ) {
            return false;
          }

          // Фильтр по приоритету
          if (activeFilters.priorityOnly && partner.priority !== 1) {
            return false;
          }

          // Фильтр по ценам
          if (
            activeFilters.selectedPrices.length > 0 &&
            !activeFilters.selectedPrices.includes(partner.price)
          ) {
            return false;
          }

          // Фильтр по товарам (для видимости партнера)
          // В данной логике партнер отображается, если у него есть товары, удовлетворяющие фильтру
          if (activeFilters.selectedProducts.length > 0) {
            const partnerProducts = partner.products || [];
            const hasSelectedProduct = partnerProducts.some((product) =>
              activeFilters.selectedProducts.includes(product.name)
            );
            if (!hasSelectedProduct) return false;
          }

          // Фильтр по обороту (revenue_last_n_months)
          const revenue = partner.revenue_last_n_months || 0;
          let revenueMatch = true;
          
          switch (activeFilters.revenueRange) {
            case 'less-100k':
              revenueMatch = revenue < 100000;
              break;
            case '100k-plus':
              revenueMatch = revenue >= 100000;
              break;
            case '500k-plus':
              revenueMatch = revenue >= 500000;
              break;
            case '1m-plus':
              revenueMatch = revenue >= 1000000;
              break;
            case 'all':
            default:
              revenueMatch = true;
          }
          
          if (!revenueMatch) return false;

          return true;
        }

        // Генерация HTML для секции партнера
        function generatePartnerSectionHTML(partner, index) {
          const isSelected = selectedPartnerGuid === partner.guid;
          const isPriority = partner.priority === 1;
          let sectionClass = 'partner-section compact';
          if (isPriority) sectionClass += ' priority';
          if (isSelected) sectionClass += ' selected';

          // ИСПРАВЛЕНИЕ: Используем пересчитанные значения
          const productsTotal = partner.calculatedFilteredOborotTotal || partner.totalProductsOborot || 0; // fallback
          const formattedProductsTotal = partner.calculatedFormattedFilteredOborotTotal || partner.formattedTotalProductsOborot || '0 ₽'; // fallback
          const partnerProductsForDetails = partner.calculatedFilteredProducts || partner.products || []; // fallback

          // Иконки статусов
          const statusIcons = \`
            <div class="status-icons">
              \${isSelected ? '<span class="selected-icon">✔</span>' : ''}
              \${isPriority ? '<span class="priority-icon">★</span>' : ''}
            </div>
          \`;

          return \`
            <div class="\${sectionClass}" data-partner-id="\${partner.guid}" data-matches-filters="true" data-original-partner-guid="\${partner.guid}">
              <div class="partner-compact">
                <div class="partner-section-header">
                  <span class="partner-section-title">\${partner.name}</span>
                  \${statusIcons}
                </div>
                <p><strong>Цена:</strong> \${partner.price || '-'}</p>
                <p><strong>Общий оборот за период:</strong> \${partner.formatted_revenue_last_n_months || '0 ₽'}</p>
                <p><strong>\${labels.productsHeader} \${labels.selectedTypes}:</strong> \${formattedProductsTotal}</p>
              </div>
              <div class="partner-expanded">
                <div class="partner-section-header">
                  <span class="partner-section-title">\${partner.name}</span>
                  \${statusIcons}
                </div>
                <p><strong>Тип:</strong> \${partner.relationship_type || 'Партнер'}</p>
                <p><strong>Телефон:</strong> \${partner.phone || '-'}</p>
                <p><strong>Email:</strong> \${partner.email || '-'}</p>
                <p><strong>Менеджер:</strong> \${partner.manager || '-'}</p>
                <p><strong>Адрес:</strong> \${partner.address || '-'}</p>
                <hr>
                <p><strong>Цена:</strong> \${partner.price || '-'}</p>
                <p><strong>Общий оборот за период:</strong> \${partner.formatted_revenue_last_n_months || '0 ₽'}</p>
                <p><strong>Передано клиентов:</strong> \${partner.clients_transferred || 0}</p>
                <p><strong>В работе клиентов:</strong> \${partner.clients_in_progress || 0}</p>
                <p><strong>Сработано клиентов:</strong> \${partner.clients_converted || 0}</p>
                <p><strong>Дата последнего заказа:</strong> \${partner.last_sale_date || '-'}</p>
                <hr>
                <div style="margin-bottom: 12px;">
                  <p>
                    <strong>\${labels.productsHeader} \${labels.selectedTypes}:</strong> 
                    \${partnerProductsForDetails && partnerProductsForDetails.length > 0
                        ? \`
                      <span>
                        \${formattedProductsTotal}
                      </span>
                      </br>
                      <span class="products-details-link" data-partner-id="\${partner.guid}">
                        (показать детализацию)
                      </span>
                    \`
                        : '<span style="margin-left: 8px; color: #999;">нет данных</span>'
                    }
                  </p>
                </div>
              </div>
              <button class="toggle-more-btn">
                <span>Подробнее</span>
                <svg class="icon" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                </svg>
              </button>
              \${!selectedPartnerGuid
                  ? \`
              <button class="select-partner-btn" data-partner-guid="\${partner.guid}">
                Выбрать партнера
              </button>
            \`
                  : ''
              }
            </div>
          \`;
        }

        // Функция для создания HTML секции клиента
        function generateClientSectionHTML(clientData) {
          return \`
            <div class="client-section">
              <h4>Клиент</h4>
              <p><strong>ФИО:</strong> \${clientData.buyer_name}</p>
              <p><strong>Телефон:</strong> \${clientData.phone}</p>
              <p><strong>Адрес:</strong> \${clientData.address}</p>
            </div>
          \`;
        }

        // Функция для создания комбинированного балуна
        function createCombinedBalloon(group, groupId) {
          // Сортируем партнеров в группе
          const sortedPartners = sortPartnersInGroup(group.partners || []);

          const balloonContainer = document.createElement('div');
          balloonContainer.className = 'balloon-container';

          // Основной контент
          let contentHTML = '';

          if (group.hasClient) {
            contentHTML += generateClientSectionHTML(group.clientData);
          }

          // Добавляем секцию партнеров только если есть партнеры
          const hasPartners = sortedPartners && sortedPartners.length > 0;
          if (hasPartners) {
            // HTML для секций партнеров
            const partnersSectionsHTML = sortedPartners
              .map((partner, index) => {
                 // Применяем пересчёт к каждому партнеру при генерации
                 const recalculatedPartner = recalculatePartnerTotals(partner);
                 return generatePartnerSectionHTML(recalculatedPartner, index);
              })
              .join('');

            contentHTML += \`
              <div class="partners-section" id="partners-section-\${groupId}">
                <h3 style="display: flex; justify-content: space-between; align-items: center;">
                  ⚡ Партнеры
                  <span style="display: flex; align-items: center; gap: 8px;">
                    <span class="partner-count-badge" id="count-badge-\${groupId}">\${sortedPartners.length}</span>
                    <button class="toggle-collapse-btn" title="Свернуть/развернуть">
                      <svg class="icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                      </svg>
                    </button>
                  </span>
                </h3>
                <div class="partners-group" id="partners-group-\${groupId}">
                  \${partnersSectionsHTML}
                </div>
              </div>
            \`;
          }

          // Если контента нет вообще (хотя такого не должно быть)
          if (contentHTML === '') {
            contentHTML = '<p>Нет данных для отображения</p>';
          }

          const balloon = document.createElement('div');
          balloon.className = 'balloon';
          balloon.innerHTML = contentHTML;

          // Сохраняем информацию о наличии партнеров в контейнере
          balloonContainer.dataset.hasPartners = hasPartners;

          // Сохраняем отсортированных партнеров в дата-атрибуте
          balloonContainer.dataset.sortedPartners = JSON.stringify(
            sortedPartners.map((p) => p.guid)
          );

          balloonContainer.appendChild(balloon);
          balloonsOverlay.appendChild(balloonContainer);
          balloonContainer.style.display = 'block';

          // Обработчики для кнопок (только если есть партнеры)
          const toggleBtn = balloon.querySelector('.toggle-collapse-btn');
          if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              balloon.classList.toggle('collapsed');
              toggleBtn.classList.toggle('collapsed');
              activateBalloon(balloonContainer, balloon);
            });
          }

          // Обработчики для секций партнеров
          balloon.addEventListener('click', (e) => {
            e.stopPropagation();

            if (
              !e.target.classList.contains('toggle-more-btn') &&
              !e.target.closest('.toggle-more-btn') &&
              !e.target.classList.contains('toggle-collapse-btn') &&
              !e.target.closest('.toggle-collapse-btn') &&
              !e.target.classList.contains('select-partner-btn') &&
              !e.target.closest('.select-partner-btn') &&
              !e.target.classList.contains('products-details-link')
            ) {
              activateBalloon(balloonContainer, balloon);
            }

            // Обработка кнопки "Подробнее/Свернуть" в секциях партнеров
            if (
              e.target.classList.contains('toggle-more-btn') ||
              e.target.closest('.toggle-more-btn')
            ) {
              const btn =
                e.target.classList.contains('toggle-more-btn')
                  ? e.target
                  : e.target.closest('.toggle-more-btn');
              const section = btn.closest('.partner-section');
              if (section) {
                const isExpanded = section.classList.contains('expanded');
                section.classList.toggle('compact');
                section.classList.toggle('expanded');
                btn.classList.toggle('expanded');
                const textSpan = btn.querySelector('span');
                if (section.classList.contains('expanded')) {
                  textSpan.textContent = 'Свернуть';
                } else {
                  textSpan.textContent = 'Подробнее';
                }
                activateBalloon(balloonContainer, balloon);
              }
            }

            // Обработка кнопки "Выбрать партнера"
            if (
              e.target.classList.contains('select-partner-btn') ||
              e.target.closest('.select-partner-btn')
            ) {
              const btn =
                e.target.classList.contains('select-partner-btn')
                  ? e.target
                  : e.target.closest('.select-partner-btn');
              const partnerGuid = btn.dataset.partnerGuid;
              showConfirmationModal(partnerGuid);
            }

            // Обработка ссылки "показать детализацию"
            if (e.target.classList.contains('products-details-link')) {
              const partnerId = e.target.dataset.partnerId;
              // Ищем оригинального партнера по GUID
              const originalPartner = allPartners.find(
                (p) => p.guid === partnerId
              );
              if (!originalPartner) return;

              // Пересчитываем его с текущими фильтрами
              const recalculatedPartner = recalculatePartnerTotals(originalPartner);
              const partnerProductsForDetails = recalculatedPartner.calculatedFilteredProducts || [];

              if (partnerProductsForDetails.length > 0) {
                showProductsPopover(
                  partnerId,
                  originalPartner.name,
                  partnerProductsForDetails // <- Передаём отфильтрованные товары
                );
                e.stopPropagation();
              }
            }
          });

          balloonContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            activateBalloon(balloonContainer, balloon);
          });

          return { container: balloonContainer, balloon: balloon };
        }

        // Функция для обновления counter на маркере (синий цвет)
        function updateMarkerCounter(markerElement, group) {
          const sortedPartners = sortPartnersInGroup(group.partners || []);
          const visiblePartnersCount = sortedPartners.filter((p) =>
            partnerMatchesFilters(p)
          ).length;

          let counterBadge = markerElement.querySelector(
            '.marker-count-badge'
          );
          if (
            !counterBadge &&
            (visiblePartnersCount > 0 || sortedPartners.length > 0)
          ) {
            counterBadge = document.createElement('div');
            counterBadge.className = 'marker-count-badge';
            markerElement.appendChild(counterBadge);
          }

          if (counterBadge) {
            if (visiblePartnersCount > 0) {
              counterBadge.textContent = visiblePartnersCount;
              counterBadge.classList.remove('hidden');
            } else {
              counterBadge.classList.add('hidden');
            }
          }
        }

        // Функция для переключения видимости всех карточек
        function toggleAllCards() {
          allCardsVisible = !allCardsVisible;
          const toggleBtn = document.getElementById('toggleCardsBtn');
          if (allCardsVisible) {
            toggleBtn.textContent = 'Скрыть все карточки';
            // Сбрасываем флаги ручного скрытия при показе всех карточек
            partnerMarkers.forEach(marker => {
              delete marker.element.dataset.balloonHidden;
            });
          } else {
            toggleBtn.textContent = 'Показать все карточки';
          }
          updateCardsVisibility();
        }

        // Функция для обновления видимости карточек
        function updateCardsVisibility() {
          partnerMarkers.forEach((marker) => {
            const groupId = marker.element.dataset.groupId;
            const group = partnerGroupsData.get(groupId);
            if (!group) return;

            // Сортируем партнеров в группе для обновления
            const sortedPartners = sortPartnersInGroup(
              group.partners || []
            );
            const visiblePartnersInGroup = sortedPartners.filter((p) =>
              partnerMatchesFilters(p)
            );
            const visiblePartnersCountInGroup = visiblePartnersInGroup.length;
            const hasVisiblePartners = visiblePartnersCountInGroup > 0;
            const hasClient = group.hasClient;
            const hasPartners = sortedPartners && sortedPartners.length > 0;

            const balloonData = partnerBalloons.get(marker.element);
            if (!balloonData || !balloonData.container) return;

            // Если пользователь вручную скрыл балун через клик на маркере,
            // не показываем его даже при обновлении фильтров
            const wasManuallyHidden = marker.element.dataset.balloonHidden === 'true';
            
            if (allCardsVisible && !wasManuallyHidden) {
              if (hasClient) {
                balloonData.container.style.display = 'block';
                const partnersSection = balloonData.container.querySelector(
                  '.partners-section'
                );
                if (partnersSection) {
                  if (hasPartners && hasVisiblePartners) {
                    partnersSection.classList.remove('hidden-section');
                  } else {
                    partnersSection.classList.add('hidden-section');
                  }
                }
                const counterBadge = marker.element.querySelector(
                  '.marker-count-badge'
                );
                if (counterBadge) {
                  counterBadge.classList.add('hidden');
                }
              } else {
                if (hasVisiblePartners) {
                  balloonData.container.style.display = 'block';
                } else {
                  balloonData.container.style.display = 'none';
                }
                const counterBadge = marker.element.querySelector(
                  '.marker-count-badge'
                );
                if (counterBadge) {
                  counterBadge.classList.add('hidden');
                }
              }
            } else if (!wasManuallyHidden) {
              // Логика для скрытого режима (если не был скрыт вручную)
              if (hasClient) {
                balloonData.container.style.display = 'block';
                const partnersSection = balloonData.container.querySelector(
                  '.partners-section'
                );
                if (partnersSection) {
                  partnersSection.classList.add('hidden-section');
                }
                updateMarkerCounter(marker.element, {
                  ...group,
                  partners: sortedPartners,
                });
              } else {
                balloonData.container.style.display = 'none';
                updateMarkerCounter(marker.element, {
                  ...group,
                  partners: sortedPartners,
                });
              }
            }
          });

          if (
            currentActiveContainer &&
            currentActiveContainer.style.display === 'none'
          ) {
            currentActiveContainer.classList.remove('active');
            currentActiveContainer
              .querySelector('.balloon')
              ?.classList.remove('active');
            currentActiveContainer = null;
          }

          updateAllBalloonPositions();
        }

        function updateCheckedStyles() {
          const productsContainer = document.getElementById(
            'productsContainer'
          );
          if (productsContainer) {
            const productCheckboxes = Array.from(
              productsContainer.querySelectorAll('.filter-checkbox')
            );

            productCheckboxes.sort((a, b) => {
              const aChecked = a
                .querySelector('input[type="checkbox"]')
                .checked;
              const bChecked = b
                .querySelector('input[type="checkbox"]')
                .checked;
              if (aChecked && !bChecked) return -1;
              if (!aChecked && bChecked) return 1;
              return 0;
            });

            productCheckboxes.forEach((item) => {
              const checkbox = item.querySelector('input[type="checkbox"]');
              if (checkbox.checked) {
                item.classList.add('checked');
              } else {
                item.classList.remove('checked');
              }
              productsContainer.appendChild(item);
            });
          }

          const pricesContainer = document.getElementById('pricesContainer');
          if (pricesContainer) {
            const priceCheckboxes = Array.from(
              pricesContainer.querySelectorAll('.filter-checkbox')
            );

            priceCheckboxes.sort((a, b) => {
              const aChecked = a
                .querySelector('input[type="checkbox"]')
                .checked;
              const bChecked = b
                .querySelector('input[type="checkbox"]')
                .checked;
              if (aChecked && !bChecked) return -1;
              if (!aChecked && bChecked) return 1;
              return 0;
            });

            priceCheckboxes.forEach((item) => {
              const checkbox = item.querySelector('input[type="checkbox"]');
              if (checkbox.checked) {
                item.classList.add('checked');
              } else {
                item.classList.remove('checked');
              }
              pricesContainer.appendChild(item);
            });
          }
        }

        // --- ИЗМЕНЁННАЯ ФУНКЦИЯ: Обновление видимости маркеров и секций в балунах ---
        function applyFilters() {
          let visiblePointsCount = 0;
          let visiblePartnersCount = 0;

          partnerMarkers.forEach((marker) => {
            const groupId = marker.element.dataset.groupId;
            const group = partnerGroupsData.get(groupId);
            if (!group) return;

            const hasClient = group.hasClient;

            // Сортируем и фильтруем партнеров в группе
            const sortedPartners = sortPartnersInGroup(
              group.partners || []
            );
            const visiblePartnersInGroup = sortedPartners.filter((p) =>
              partnerMatchesFilters(p)
            );
            const visiblePartnersCountInGroup = visiblePartnersInGroup.length;
            const hasVisiblePartners = visiblePartnersCountInGroup > 0;

            const shouldBeVisible = hasClient || hasVisiblePartners;

            if (marker.element) {
              if (shouldBeVisible) {
                marker.element.classList.remove('hidden-marker');
                visiblePointsCount++;
                visiblePartnersCount += visiblePartnersCountInGroup;
              } else {
                marker.element.classList.add('hidden-marker');
              }
            }

            const balloonData = partnerBalloons.get(marker.element);
            if (balloonData && balloonData.container) {
              // Получаем контейнер секций партнеров
              const partnersContainer = balloonData.container.querySelector(
                '.partners-group'
              );

              // Обновляем каждую секцию партнера
              if (partnersContainer && sortedPartners && sortedPartners.length > 0) {
                const sections = partnersContainer.querySelectorAll(
                  '.partner-section'
                );
                sections.forEach((section, idx) => {
                  const originalPartner = sortedPartners[idx];
                  if (!originalPartner) return;

                  // Пересчитываем данные партнера
                  const recalculatedPartner = recalculatePartnerTotals(originalPartner);
                  const matchesFilters = partnerMatchesFilters(recalculatedPartner);

                  section.dataset.matchesFilters = matchesFilters;

                  if (matchesFilters) {
                    section.classList.remove('hidden-section');
                  } else {
                    section.classList.add('hidden-section');
                  }

                  // --- КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: перегенерация HTML ---
                  const updatedSectionHTML = generatePartnerSectionHTML(recalculatedPartner, idx);
                  const wrapperDiv = document.createElement('div');
                  wrapperDiv.innerHTML = updatedSectionHTML;
                  const newSection = wrapperDiv.firstElementChild;

                  // Сохраняем состояние раскрытости/свёрнутости и статусы
                  const wasExpanded = section.classList.contains('expanded');
                  const wasCompact = section.classList.contains('compact');
                  const isSelected = section.classList.contains('selected');
                  const isPriority = section.classList.contains('priority');

                  newSection.className = section.className; // Копируем все классы
                  newSection.classList.remove('expanded', 'compact', 'selected', 'priority'); // Очищаем для установки новых
                  
                  if (wasExpanded) {
                    newSection.classList.add('expanded');
                  } else {
                    newSection.classList.add('compact');
                  }
                  if (isSelected) newSection.classList.add('selected');
                  if (isPriority) newSection.classList.add('priority');

                  // Заменяем старую секцию на новую
                  section.parentNode.replaceChild(newSection, section);

                  // Обновляем обработчики для новой секции (если бы они были повешены здесь)
                  // В данном случае они вешаются в основном обработчике balloon.addEventListener('click', ...)
                });

                const titleBadge = balloonData.container.querySelector(
                  '.partner-count-badge'
                );
                if (titleBadge) {
                  titleBadge.textContent = visiblePartnersCountInGroup;
                }
              }
            }
          });

          document.getElementById(
            'visiblePartnersCount'
          ).textContent = visiblePartnersCount;

          updateCheckedStyles();
          updateCardsVisibility();
        }

        function initializeFilters() {
          const searchInput = document.getElementById('searchPartners');
          searchInput.addEventListener('input', (e) => {
            activeFilters.search = e.target.value;
            applyFilters();
          });

          const priorityCheckbox = document.getElementById('priorityOnly');
          priorityCheckbox.addEventListener('change', (e) => {
            activeFilters.priorityOnly = e.target.checked;
            applyFilters();
          });

          // Исправленные обработчики для чекбоксов с товарами
          const productsContainer = document.getElementById(
            'productsContainer'
          );
          if (productsContainer) {
            // Используем делегирование событий для лучшей производительности
            productsContainer.addEventListener('change', (e) => {
              if (e.target.type === 'checkbox' && e.target.tagName === 'INPUT') {
                const productName = e.target.value;
                if (e.target.checked) {
                  if (!activeFilters.selectedProducts.includes(productName)) {
                    activeFilters.selectedProducts.push(productName);
                  }
                } else {
                  activeFilters.selectedProducts =
                    activeFilters.selectedProducts.filter(
                      (p) => p !== productName
                    );
                }
                applyFilters();
              }
            });
          }

          // Исправленные обработчики для чекбоксов с ценами
          const pricesContainer = document.getElementById('pricesContainer');
          if (pricesContainer) {
            pricesContainer.addEventListener('change', (e) => {
              if (e.target.type === 'checkbox' && e.target.tagName === 'INPUT') {
                const price = e.target.value;
                if (e.target.checked) {
                  if (!activeFilters.selectedPrices.includes(price)) {
                    activeFilters.selectedPrices.push(price);
                  }
                } else {
                  activeFilters.selectedPrices =
                    activeFilters.selectedPrices.filter((p) => p !== price);
                }
                applyFilters();
              }
            });
          }

          // Обработчик для фильтра по обороту (скопировано из CompetitorsMapRenderer)
          document.querySelectorAll('input[name="revenue"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
              activeFilters.revenueRange = e.target.value;
              applyFilters();
            });
          });

          document.getElementById('resetFilters').addEventListener('click', () => {
            activeFilters = {
              search: '',
              priorityOnly: false,
              selectedProducts: [],
              selectedPrices: [],
              revenueRange: 'all'
            };
            document.getElementById('searchPartners').value = '';
            document.getElementById('priorityOnly').checked = false;
            
            // Сбрасываем все чекбоксы товаров
            if (productsContainer) {
              const productCheckboxes = productsContainer.querySelectorAll('input[type="checkbox"]');
              productCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
              });
            }
            
            // Сбрасываем все чекбоксы цен
            if (pricesContainer) {
              const priceCheckboxes = pricesContainer.querySelectorAll('input[type="checkbox"]');
              priceCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
              });
            }
            
            // Сбрасываем фильтр по обороту
            document.getElementById('revenue-all').checked = true;
            
            applyFilters();
          });

          document
            .getElementById('toggleCardsBtn')
            .addEventListener('click', toggleAllCards);
        }

        const getMarkerScreenPosition = (markerElement) => {
          const markerRect = markerElement.getBoundingClientRect();
          return {
            x: markerRect.left + markerRect.width / 2,
            y: markerRect.top,
          };
        };

        const updateBalloonPosition = (markerElement, balloonContainer) => {
          if (!markerElement || !balloonContainer) return;

          const position = getMarkerScreenPosition(markerElement);
          balloonContainer.style.left = position.x + 'px';
          balloonContainer.style.top = position.y + 15 + 'px';
        };

        const updateAllBalloonPositions = () => {
          balloonContainers.forEach((data, markerElement) => {
            if (
              data.container.style.display !== 'none' &&
              !markerElement.classList.contains('hidden-marker')
            ) {
              updateBalloonPosition(markerElement, data.container);
            }
          });
        };

        const activateBalloon = (container, balloon) => {
          if (currentActiveContainer && currentActiveContainer !== container) {
            currentActiveContainer.classList.remove('active');
            currentActiveContainer
              .querySelector('.balloon')
              ?.classList.remove('active');
          }

          container.classList.add('active');
          balloon.classList.add('active');
          currentActiveContainer = container;
        };

        // Функция для управления поповерами с товарами
        function initializeProductsPopovers() {
          // Глобальный контейнер для поповеров
          const popoversContainer = document.createElement('div');
          popoversContainer.id = 'productsPopoversContainer';
          popoversContainer.style.position = 'fixed';
          popoversContainer.style.top = '0';
          popoversContainer.style.left = '0';
          popoversContainer.style.width = '100%';
          popoversContainer.style.height = '100%';
          popoversContainer.style.pointerEvents = 'none';
          popoversContainer.style.zIndex = '10001';
          document.body.appendChild(popoversContainer);

          // Закрытие всех поповеров при клике вне их
          document.addEventListener('click', (e) => {
            if (
              !e.target.closest('.products-details-link') &&
              !e.target.closest('.products-popover')
            ) {
              closeAllProductsPopovers();
            }
          });

          // Закрытие поповеров при нажатии Escape
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              closeAllProductsPopovers();
            }
          });
        }

        function closeAllProductsPopovers() {
          const popoversContainer = document.getElementById(
            'productsPopoversContainer'
          );
          if (popoversContainer) {
            popoversContainer.innerHTML = '';
          }
        }

        // --- ИЗМЕНЕНО: showProductsPopover теперь принимает products ---
        function showProductsPopover(partnerId, partnerName, products) { // Принимаем products
          closeAllProductsPopovers();

          const popoversContainer = document.getElementById(
            'productsPopoversContainer'
          );
          if (!popoversContainer) return;

          // ИСПРАВЛЕНИЕ: передаём отфильтрованные товары
          const tableHTML = generateProductsTableHTML(
            products, // <- Здесь передаются отфильтрованные товары
            partnerName
          );

          const popover = document.createElement('div');
          popover.className = 'products-popover active';
          popover.innerHTML = \`
            <div class="products-popover-header">
            <div class="products-popover-header-title">
              <span>\${labels.productsHeader} \${labels.selectedTypes}</span>
              <span>\${partnerName}</span>
            </div>
              <button class="close-popover-btn" title="Закрыть">×</button>
            </div>
            <div class="products-table-container">
              \${tableHTML}
            </div>
          \`;

          popoversContainer.appendChild(popover);

          // Позиционируем поповер
          const popoverWidth = 500;
          const popoverHeight = 400;
          const screenWidth = window.innerWidth;
          const screenHeight = window.innerHeight;

          let left = (screenWidth - popoverWidth) / 2;
          let top = (screenHeight - popoverHeight) / 2;

          // Корректируем, если выходит за границы
          if (left < 10) left = 10;
          if (top < 10) top = 10;
          if (left + popoverWidth > screenWidth - 10)
            left = screenWidth - popoverWidth - 10;
          if (top + popoverHeight > screenHeight - 10)
            top = screenHeight - popoverHeight - 10;

          popover.style.left = \`\${left}px\`;
          popover.style.top = \`\${top}px\`;
          popover.style.pointerEvents = 'auto';

          const closeBtn = popover.querySelector('.close-popover-btn');
          closeBtn.addEventListener('click', closeAllProductsPopovers);
        }

        // Функция для создания маркера
        function createMarker(coordinates, group, groupId) {
          // Сортируем партнеров в группе для маркера
          const sortedPartners = sortPartnersInGroup(group.partners || []);

          const markerElement = document.createElement('div');

          const svgNS = 'http://www.w3.org/2000/svg';
          const svg = document.createElementNS(svgNS, 'svg');
          svg.setAttribute('width', '34');
          svg.setAttribute('height', '34');
          svg.setAttribute('viewBox', '0 0 34 34');

          let markerClass = 'pin-marker';

          if (group.hasClient && sortedPartners && sortedPartners.length > 0) {
            // Комбинированный маркер (клиент + партнеры)
            markerClass = 'pin-marker combined';

            const leftPath = document.createElementNS(svgNS, 'path');
            leftPath.setAttribute(
              'd',
              'M17 0C10.1 0 4.5 5.6 4.5 12.5C4.5 22.8 17 34 17 34V0Z'
            );
            leftPath.setAttribute('fill', 'seagreen'); // Зеленый для клиента

            const rightPath = document.createElementNS(svgNS, 'path');
            rightPath.setAttribute(
              'd',
              'M17 0V34S29.5 22.8 29.5 12.5C29.5 5.6 23.9 0 17 0Z'
            );
            rightPath.setAttribute('fill', '#0051ff'); // Синий для партнеров

            svg.appendChild(leftPath);
            svg.appendChild(rightPath);
          } else if (group.hasClient) {
            // Только клиент - зеленый
            markerClass = 'pin-marker green';

            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute(
              'd',
              'M17 0C10.1 0 4.5 5.6 4.5 12.5C4.5 22.8 17 34 17 34S29.5 22.8 29.5 12.5C29.5 5.6 23.9 0 17 0Z'
            );
            path.setAttribute('fill', 'seagreen');
            svg.appendChild(path);
          } else {
            // Только партнеры - синий
            markerClass = 'pin-marker blue';

            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute(
              'd',
              'M17 0C10.1 0 4.5 5.6 4.5 12.5C4.5 22.8 17 34 17 34S29.5 22.8 29.5 12.5C29.5 5.6 23.9 0 17 0Z'
            );
            path.setAttribute('fill', '#0051ff');
            svg.appendChild(path);
          }

          const circle = document.createElementNS(svgNS, 'circle');
          circle.setAttribute('cx', '17');
          circle.setAttribute('cy', '12');
          circle.setAttribute('r', '5');
          circle.setAttribute('fill', 'white');
          svg.appendChild(circle);

          markerElement.className = markerClass;
          if (groupId) {
            markerElement.dataset.groupId = groupId;
          }
          markerElement.appendChild(svg);

          let title = '';
          if (group.hasClient && sortedPartners && sortedPartners.length > 0) {
            title = \`Клиент + \${sortedPartners.length} партнеров\`;
          } else if (group.hasClient) {
            title = 'Контрагент';
          } else if (sortedPartners && sortedPartners.length > 1) {
            title = \`Группа партнеров (\${sortedPartners.length})\`;
          } else if (sortedPartners && sortedPartners.length === 1) {
            title = sortedPartners[0].name || 'Партнер';
          }

          markerElement.title = title;

          const marker = new YMapMarker({ coordinates }, markerElement);

          // Сохраняем группу с отсортированными партнерами
          partnerGroupsData.set(groupId, {
            ...group,
            partners: sortedPartners,
          });

          const balloonData = createCombinedBalloon(
            { ...group, partners: sortedPartners },
            groupId
          );

          balloonContainers.set(markerElement, {
            container: balloonData.container,
            balloon: balloonData.balloon,
            coordinates,
            groupId,
          });

          partnerBalloons.set(markerElement, {
            container: balloonData.container,
            balloon: balloonData.balloon,
            groupId,
          });

          markerElement.addEventListener('click', (event) => {
            event.stopPropagation();
            
            const balloonData = partnerBalloons.get(markerElement);
            if (!balloonData || !balloonData.container) return;
            
            // Снимаем активный класс со всех маркеров
            document.querySelectorAll('.pin-marker.active').forEach(marker => {
              marker.classList.remove('active');
            });
            
            // Получаем текущее состояние балуна
            const isCurrentlyVisible = balloonData.container.style.display !== 'none';
            const isCurrentlyActive = currentActiveContainer === balloonData.container;
            
            if (!isCurrentlyVisible) {
              // Если балун скрыт - показываем его
              balloonData.container.style.display = 'block';
              markerElement.dataset.balloonHidden = 'false'; // Сбрасываем флаг ручного скрытия
              markerElement.classList.add('active'); // Добавляем активный класс
              activateBalloon(balloonData.container, balloonData.balloon);
            } else if (isCurrentlyActive) {
              // Если балун видим и активен - скрываем его
              balloonData.container.style.display = 'none';
              balloonData.container.classList.remove('active');
              balloonData.balloon.classList.remove('active');
              currentActiveContainer = null;
              markerElement.dataset.balloonHidden = 'true'; // Устанавливаем флаг ручного скрытия
              markerElement.classList.remove('active'); // Убираем активный класс
            } else {
              // Если балун видим, но не активен - активируем его
              markerElement.classList.add('active'); // Добавляем активный класс
              activateBalloon(balloonData.container, balloonData.balloon);
              markerElement.dataset.balloonHidden = 'false'; // Сбрасываем флаг ручного скрытия
            }
            
            updateBalloonPosition(markerElement, balloonData.container);
          });

          setTimeout(() => {
            updateBalloonPosition(markerElement, balloonData.container);
          }, 100);

          return marker;
        }

        // Функция для показа модального окна подтверждения
        function showConfirmationModal(partnerGuid) {
          const partner = allPartners.find((p) => p.guid === partnerGuid);
          const partnerName = partner ? partner.name : 'этого партнера';

          const modalHTML = \`
            <div class="modal-overlay" id="confirmationModal">
              <div class="modal-content">
                <h3>Выбор партнера</h3>
                <p>Вы уверены, что хотите передать клиента партнеру "<strong>\${partnerName}</strong>"?</p>
                <p><strong>После подтверждения изменение будет возможно только через администратора.</strong></p>
                <div class="modal-actions">
                  <button class="modal-btn cancel" id="cancelBtn">Отменить</button>
                  <button class="modal-btn confirm" id="confirmBtn" data-partner-guid="\${partnerGuid}">
                    <span class="spinner" style="display: none; margin: -4px 0px"></span>
                    <span>Подтвердить</span>
                  </button>
                </div>
              </div>
            </div>
          \`;

          document.body.insertAdjacentHTML('beforeend', modalHTML);

          const modal = document.getElementById('confirmationModal');
          const cancelBtn = document.getElementById('cancelBtn');
          const confirmBtn = document.getElementById('confirmBtn');

          cancelBtn.addEventListener('click', () => {
            modal.remove();
          });

          confirmBtn.addEventListener('click', async () => {
            const spinner = confirmBtn.querySelector('.spinner');
            const span = confirmBtn.querySelector('span:not(.spinner)');
            spinner.style.display = 'inline-block';
            span.textContent = '';
            confirmBtn.disabled = true;
            cancelBtn.disabled = true

            try {
              const response = await fetch(
                addClientUrl,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    requestGuid: clientRequestData.guid, 
                    partnerGuid: partnerGuid,
                  }),
                }
              );

              const result = await response.json();

              if (result.success) {
                location.reload();
              } else {
                alert('Ошибка: ' + (result.error || 'Неизвестная ошибка'));
                modal.remove();
              }
            } catch (error) {
              alert('Ошибка сети: ' + error.message);
              modal.remove();
            }
          });

          modal.addEventListener('click', (e) => {
            if (e.target === modal) {
              modal.remove();
            }
          });
        }

        // Добавление маркеров для всех групп
        Object.entries(groups).forEach(([groupId, group], index) => {
          if (group.coordinates) {
            const marker = createMarker(
              group.coordinates,
              group,
              groupId
            );
            map.addChild(marker);
            partnerMarkers.push(marker);

            if (group.hasClient && index === 0) {
              setTimeout(() => {
                const balloonData = balloonContainers.get(marker.element);
                if (balloonData) {
                  activateBalloon(balloonData.container, balloonData.balloon);
                  // Добавляем активный класс к маркеру клиента
                  marker.element.classList.add('active');
                }
              }, 1000);
            }
          }
        });

        initializeFilters();
        updateCheckedStyles();
        applyFilters();
        initializeProductsPopovers();

        setTimeout(() => {
          updateInterval = setInterval(updateAllBalloonPositions, 100);
        }, 100);

        window.addEventListener('resize', updateAllBalloonPositions);
        window.addEventListener('beforeunload', () => {
          if (updateInterval) {
            clearInterval(updateInterval);
          }
        });
      }).catch((error) => {
        console.error('Ошибка загрузки Яндекс Карт:', error);
        document.body.innerHTML =
          '<div style="padding: 20px; text-align: center;"><h3>Ошибка загрузки карты</h3><p>' +
          error.message +
          '</p></div>';
      });
    </script>
  </body>
</html>
    `
  }

  // Вспомогательный метод для группировки партнеров по координатам с учетом контрагента
  private static groupPartnersByCoordinates(
    partners: Partner[],
    clientRequestData: ClientRequestInstance
  ): Record<string, any> {
    const groups: Record<string, any> = {}

    // Обрабатываем контрагента (клиента)
    if (
      clientRequestData.latitude &&
      clientRequestData.longitude &&
      clientRequestData.latitude !== 0 &&
      clientRequestData.longitude !== 0
    ) {
      const clientKey = `${clientRequestData.longitude.toFixed(
        6
      )}_${clientRequestData.latitude.toFixed(6)}`

      if (!groups[clientKey]) {
        groups[clientKey] = {
          coordinates: [
            clientRequestData.longitude,
            clientRequestData.latitude,
          ],
          hasClient: true,
          clientData: {
            buyer_name: clientRequestData.buyer_name,
            phone: clientRequestData.phone,
            address: clientRequestData.address,
            population: clientRequestData.population,
            date: clientRequestData.date,
            id: 'client',
            isClient: true,
          },
          partners: [],
        }
      } else {
        groups[clientKey].hasClient = true
        groups[clientKey].clientData = {
          ...clientRequestData,
          id: 'client',
          isClient: true,
        }
      }
    }

    // Обрабатываем партнеров
    partners.forEach((partner, index) => {
      if (
        partner.latitude &&
        partner.longitude &&
        partner.latitude !== 0 &&
        partner.longitude !== 0
      ) {
        const key = `${partner.longitude.toFixed(6)}_${partner.latitude.toFixed(
          6
        )}`

        if (!groups[key]) {
          groups[key] = {
            coordinates: [partner.longitude, partner.latitude],
            hasClient: false,
            clientData: null,
            partners: [],
          }
        }

        groups[key].partners.push({
          ...partner,
          id: partner.guid || `partner_${index}`,
          isClient: false,
        })
      } else {
        // Для партнеров без координат создаем отдельную группу без координат
        const noCoordsKey = `no_coords_${index}`
        groups[noCoordsKey] = {
          coordinates: null,
          hasClient: false,
          clientData: null,
          partners: [
            {
              ...partner,
              id: partner.guid || `partner_${index}`,
              isClient: false,
            },
          ],
        }
      }
    })

    return groups
  }
}