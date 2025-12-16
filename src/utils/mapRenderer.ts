import { CounterpartyInstance } from '../types'

export class MapRenderer {
  static generateHTML(
    guid: string,
    data: CounterpartyInstance,
    useYandex: boolean = true
  ): string {
    if (!process.env.YANDEX_API_KEY) return 'Не задан API KEY'
    return this.generateYandexMapHTML(guid, data)
  }

  private static generateYandexMapHTML(
    guid: string,
    data: CounterpartyInstance
  ): string {
    // Собираем уникальные значения цен из конкурентов
    const allCompetitors = data.competitors || []

    // Группируем с учетом контрагента
    const groups = this.groupCompetitorsByCoordinates(allCompetitors, data)

    // Подсчет статистики
    const totalCompetitors = allCompetitors.length
    const unmarkedCompetitors = allCompetitors.filter(
      (c) =>
        !c.longitude || !c.latitude || c.longitude === 0 || c.latitude === 0
    ).length

    // Подсчет уникальных цен для фильтров
    const uniquePrices = Array.from(
      new Set(allCompetitors.map((c) => c.price).filter(Boolean))
    )

    // Подсчет групп с координатами
    const groupsWithCoords = Object.values(groups).filter(
      (g) => g.coordinates
    ).length

    return `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Карта контрагента - ${data.manager}</title>
      <meta charset="utf-8" />
      <script src="https://api-maps.yandex.ru/v3/?apikey=${
        process.env.YANDEX_API_KEY
      }&lang=ru_RU"></script>
      <style>
        html, body {
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
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          width: 300px;
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
        
        .competitor-balloon {
          border: 2px solid #ccc;
        }
        
        .competitor-balloon::after {
          border-top-color: #ccc;
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
        
        /* Стили для кнопки свернуть/развернуть в заголовке */
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
        
        /* Стили для группы конкурентов в балуне */
        .competitors-group {
          max-height: 240px;
          overflow-y: auto;
          padding-right: 5px;
          margin-top: 10px;
          transition: max-height 0.3s ease, opacity 0.3s ease;
        }
        
        .balloon.collapsed .competitors-group {
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          margin-top: 0;
        }
        
        .competitor-section {
          border: 1px solid #eee;
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 10px;
          background: #f9f9f9;
          position: relative;
        }
        
        .competitor-section:last-child {
          margin-bottom: 0;
        }
        
        .competitor-section.compact {
          cursor: pointer;
        }
        
        .competitor-section.expanded {
          background: #fff;
          border-color: #ddd;
        }
        
        .competitor-section.compact:hover {
          background: #f0f0f0;
        }
        
        .competitor-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .competitor-section-title {
          font-weight: bold;
          color: #333;
          font-size: 13px;
        }
        
        .competitor-count-badge {
          height: 16px;
          background: #138e4e;
          color: white;
          font-size: 14px;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: bold;
          margin-left: 8px;
        }
        
        .balloon-more {
          background: #007bff;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 8px;
          font-size: 12px;
          width: 100%;
          text-align: center;
        }
        
        .balloon-more:hover {
          background: #0056b3;
        }
        
        .toggle-more-btn {
          background: transparent;
          border: none;
          color: #007bff;
          cursor: pointer;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: background 0.2s ease;
          margin-top: 8px;
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
        
        .competitor-compact {
          display: block;
        }
        
        .competitor-expanded {
          display: none;
        }
        
        .competitor-section.compact .competitor-compact {
          display: block;
        }
        
        .competitor-section.compact .competitor-expanded {
          display: none;
        }
        
        .competitor-section.expanded .competitor-compact {
          display: none;
        }
        
        .competitor-section.expanded .competitor-expanded {
          display: block;
        }
        
        .hidden-section {
          display: none !important;
        }
        
        .competitors-section.hidden-section {
          display: none !important;
        }
        
        .group-statistics {
          margin-top: 10px;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
          font-size: 12px;
          color: #666;
          border-left: 3px solid #007bff;
        }
        
        .group-statistics p {
          margin: 3px 0;
        }
        
        /* Стили маркеров */
        .pin-marker {
          width: 34px;
          height: 34px;
          cursor: pointer;
          transform: translate(-17px, -34px);
          position: relative;
        }
        
        .pin-marker.green svg path {
          fill: seagreen;
        }
        
        .pin-marker.red svg path {
          fill: orangered;
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
          z-index: 100000;
          backdrop-filter: blur(2px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          max-width: 300px;
          width: 300px;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        
        .filters-panel.compact {
          height: 155px;
          overflow: hidden;
        }
        
        .filters-panel.expanded {
          max-height: 90vh;
          overflow: hidden;
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
        }
        
        .toggle-arrow.down {
          transform: rotate(0deg);
        }
        
        .toggle-arrow.up {
          transform: rotate(180deg);
        }
        
        .filter-content {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-right: 5px;
          opacity: 1;
          transition: opacity 0.2s ease;
        }
        
        .filters-panel.compact .filter-content {
          opacity: 0;
          pointer-events: none;
        }
        
        .filters-actions {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.3);
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
        
        .filters-stats {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.3);
          font-size: 12px;
          color: #ccc;
          line-height: 1.4;
          flex-shrink: 0;
        }
        
        .filters-panel.compact .filters-stats {
          margin-top: 8px;
          padding-top: 8px;
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
        
        .prices-container {
          max-height: 35vh;
          overflow-y: auto;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }
        
        .filter-checkbox {
          display: flex;
          align-items: center;
          margin: 6px 0;
          cursor: pointer;
          padding: 4px 0;
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
        }
        
        .filter-checkbox.checked {
          background: rgba(255, 255, 255, 0.1);
          margin: 6px -4px;
          padding: 4px;
          border-radius: 3px;
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
        }
        
        /* Улучшенные стили для секции клиента с более заметной анимацией */
        .client-section {
          animation: intensePulse 1.5s infinite;
          border: 3px solid #4CAF50;
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
          background: linear-gradient(135deg, #4CAF50, #2E7D32);
          color: white;
          font-size: 10px;
          font-weight: bold;
          padding: 3px 8px;
          border-radius: 0 0 0 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
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
          color: #2E7D32;
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
          color: #1B5E20;
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
        
        .prices-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .prices-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        
        .prices-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        
        .prices-container::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        
        .competitors-group::-webkit-scrollbar {
          width: 4px;
        }
        
        .competitors-group::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 2px;
        }
        
        .competitors-group::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 2px;
        }
        
        .competitors-group::-webkit-scrollbar-thumb:hover {
          background: #aaa;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="balloons-overlay" id="balloonsOverlay"></div>

      <script>
        const counterpartyData = ${JSON.stringify(data)};
        const allCompetitors = ${JSON.stringify(allCompetitors)};
        const groups = ${JSON.stringify(groups)};
        const uniquePrices = ${JSON.stringify(uniquePrices)};
        const totalCompetitors = ${totalCompetitors};
        const unmarkedCompetitors = ${unmarkedCompetitors};
        const groupsWithCoords = ${groupsWithCoords};

        // Подсчитываем сколько конкурентов с координатами
        const competitorsWithCoords = allCompetitors.filter(c => 
          c.latitude && c.longitude && c.latitude !== 0 && c.longitude !== 0
        ).length;
        
        // Считаем общее количество точек на карте
        let totalPointsOnMap = 0;
        Object.values(groups).forEach(group => {
          if (group.coordinates) {
            totalPointsOnMap++;
          }
        });

        let activeFilters = {
          prices: [],
          revenueRange: 'all'
        };

        let competitorMarkers = [];
        let competitorBalloons = new Map();
        let competitorGroupsData = new Map();

        ymaps3.ready.then(() => {
          const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = ymaps3;
          
          let center = [37.64, 55.76]

          function getZoom() {
            const minZoom = 12
            const maxZoom = 18
          
            const result = minZoom + Math.ceil(groupsWithCoords / 100)

            if(result > maxZoom) return maxZoom

            return result
          }

          let zoom = getZoom()

          // Ищем первую группу с координатами
          const firstGroupWithCoords = Object.values(groups).find(group => 
            group.coordinates
          );
          if (firstGroupWithCoords) {
            center = firstGroupWithCoords.coordinates;
          }
          
          const map = new YMap(
            document.getElementById('map'),
            {
              location: {
                center,
                zoom
              }
            },
            [
              new YMapDefaultSchemeLayer({}),
              new YMapDefaultFeaturesLayer({})
            ]
          );

          const filtersPanel = document.createElement('div');
          filtersPanel.className = \`filters-panel compact \${unmarkedCompetitors ? "unmarkedCompetitors" : ""}\`;
          
          filtersPanel.innerHTML = \`
            <div class="filters-header" id="filtersHeader">
              <h3>Фильтры конкурентов</h3>
              <svg class="toggle-arrow down" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M7.41 8.84L12 13.42l4.59-4.58L18 10.25l-6 6-6-6z"/>
              </svg>
            </div>
            
            <div class="filter-content" id="filterContent">
              <div class="filter-section">
                <h4>Вид цены</h4>
                <div class="prices-container" id="pricesContainer">
                  \${uniquePrices.map(price => \`
                    <div class="filter-checkbox" id="checkbox-\${price}">
                      <input type="checkbox" id="price-\${price}" value="\${price}">
                      <label for="price-\${price}">\${price}</label>
                    </div>
                  \`).join('')}
                  \${uniquePrices.length === 0 ? '<p style="color: #999; font-size: 12px; margin: 0;">Нет данных о ценах</p>' : ''}
                </div>
              </div>

              <div class="filter-section">
                <h4>Оборот за 3 месяца</h4>
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
            </div>
            
            <div class="filters-actions" id="filtersActions">
              <button class="reset-filters" id="resetFilters">Сбросить фильтры</button>
            </div>
            
            <div class="filters-stats">
              <div class="stats-total" style="margin-top: 4px;">Конкурентов: <span id="visibleCompetitorsCount">\${competitorsWithCoords}</span> из \${totalCompetitors}</div>
              \${unmarkedCompetitors > 0 ? \`<div class="stats-unmarked" id="unmarkedStats">Не отмечены на карте: \${unmarkedCompetitors}</div>\` : ''}
            </div>
          \`;
          
          document.body.appendChild(filtersPanel);

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

          document.getElementById('filtersHeader').addEventListener('click', toggleFilters);

          const balloonsOverlay = document.getElementById('balloonsOverlay');
          let currentActiveContainer = null;
          const balloonContainers = new Map();
          let updateInterval = null;

          // Функция проверки конкурента по фильтрам
          function competitorMatchesFilters(competitor) {
            const priceMatch = activeFilters.prices.length === 0 || 
                              activeFilters.prices.includes(competitor.price);
            
            const revenue = competitor.revenue_last_3_months || 0;
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
            
            return priceMatch && revenueMatch;
          }

          // Генерация HTML для секции конкурента
          function generateCompetitorSectionHTML(competitor, index) {
            return \`
              <div class="competitor-section compact" data-competitor-id="\${competitor.id || index}" data-matches-filters="true">
                <div class="competitor-compact">
                  <div class="competitor-section-header">
                    <span class="competitor-section-title">\${competitor.name}</span>
                  </div>
                  <p><strong>Цена:</strong> \${competitor.price || '-'}</p>
                  <p><strong>Оборот:</strong> \${competitor.formatted_revenue_last_3_months || '0 ₽'}</p>
                </div>
                <div class="competitor-expanded">
                  <div class="competitor-section-header">
                    <span class="competitor-section-title">\${competitor.name}</span>
                  </div>
                  <p><strong>Тип:</strong> \${competitor.relationship_type || '-'}</p>
                  <p><strong>Телефон:</strong> \${competitor.phone || '-'}</p>
                  <p><strong>Менеджер:</strong> \${competitor.manager || '-'}</p>
                  <p><strong>Адрес:</strong> \${competitor.address || '-'}</p>
                  <p><strong>Цена:</strong> \${competitor.price || '-'}</p>
                  <p><strong>Оборот за посл. 3 мес.:</strong> \${competitor.formatted_revenue_last_3_months || '0 ₽'}</p>
                  <p><strong>Последняя продажа:</strong> \${competitor.last_sale_date || '-'}</p>
                </div>
                <button class="toggle-more-btn">
                  <span>Подробнее</span>
                  <svg class="icon" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                  </svg>
                </button>
              </div>
            \`;
          }

          // Функция для создания HTML секции нового клиента
          function generateClientSectionHTML(clientData) {
            return \`
              <div class="client-section">
                <h4>Новый клиент</h4>
                <p><strong>Телефон:</strong> \${clientData.phone || '-'}</p>
                <p><strong>Менеджер:</strong> \${clientData.manager || '-'}</p>
                <p><strong>Адрес:</strong> \${clientData.address || '-'}</p>
                <p><strong>Цена:</strong> \${clientData.price || '-'}</p>
              </div>
            \`;
          }

          // Функция для создания комбинированного балуна
          function createCombinedBalloon(group, groupId) {
            const balloonContainer = document.createElement('div');
            balloonContainer.className = 'balloon-container';
            
            // Основной контент
            let contentHTML = '';
            
            if (group.hasClient) {
              contentHTML += generateClientSectionHTML(group.clientData);
            }
            
            // Добавляем секцию конкурентов только если есть конкуренты
            if (group.competitors.length > 0) {
              // HTML для секций конкурентов
              const competitorsSectionsHTML = group.competitors
                .map((competitor, index) => generateCompetitorSectionHTML(competitor, index))
                .join('');
                
              contentHTML += \`
                <div class="competitors-section" id="competitors-section-\${groupId}">
                  <h3 style="display: flex; justify-content: space-between; align-items: center;">
                    ⚡ Конкуренты
                    <span style="display: flex; align-items: center; gap: 8px;">
                      <span class="competitor-count-badge" id="count-badge-\${groupId}">\${group.competitors.length}</span>
                      <button class="toggle-collapse-btn" title="Свернуть/развернуть">
                        <svg class="icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                        </svg>
                      </button>
                    </span>
                  </h3>
                  <div class="competitors-group" id="competitors-group-\${groupId}">
                    \${competitorsSectionsHTML}
                  </div>
                </div>
              \`;
            }
            
            // Если контента нет вообще (хотя такого не должно быть)
            if (contentHTML === '') {
              contentHTML = '<p>Нет данных для отображения</p>';
            }
            
            const balloonContent = contentHTML;
            
            const balloon = document.createElement('div');
            balloon.className = 'balloon competitor-balloon';
            if (group.hasClient) {
              balloon.classList.add('has-client');
            }
            balloon.innerHTML = balloonContent;
            
            balloonContainer.appendChild(balloon);
            balloonsOverlay.appendChild(balloonContainer);
            balloonContainer.style.display = 'block';
            
            // Обработчики для кнопок (только если есть конкуренты)
            const toggleBtn = balloon.querySelector('.toggle-collapse-btn');
            if (toggleBtn) {
              toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                balloon.classList.toggle('collapsed');
                toggleBtn.classList.toggle('collapsed');
                activateBalloon(balloonContainer, balloon);
              });
            }
            
            // Обработчики для секций конкурентов
            balloon.addEventListener('click', (e) => {
              e.stopPropagation();
              
              if (!e.target.classList.contains('toggle-more-btn') && 
                  !e.target.closest('.toggle-more-btn') &&
                  !e.target.classList.contains('toggle-collapse-btn') &&
                  !e.target.closest('.toggle-collapse-btn')) {
                activateBalloon(balloonContainer, balloon);
              }
              
              // Обработка кнопки "Подробнее/Свернуть" в секциях конкурентов
              if (e.target.classList.contains('toggle-more-btn') || e.target.closest('.toggle-more-btn')) {
                const btn = e.target.classList.contains('toggle-more-btn') 
                  ? e.target 
                  : e.target.closest('.toggle-more-btn');
                const section = btn.closest('.competitor-section');
                
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
            });
            
            balloonContainer.addEventListener('click', (e) => {
              e.stopPropagation();
              activateBalloon(balloonContainer, balloon);
            });
            
            return { container: balloonContainer, balloon: balloon };
          }

          function updateCheckedStyles() {
            const pricesContainer = document.getElementById('pricesContainer');
            if (!pricesContainer) return;

            const checkboxes = Array.from(pricesContainer.querySelectorAll('.filter-checkbox'));
            
            checkboxes.sort((a, b) => {
              const aChecked = a.querySelector('input[type="checkbox"]').checked;
              const bChecked = b.querySelector('input[type="checkbox"]').checked;
              
              if (aChecked && !bChecked) return -1;
              if (!aChecked && bChecked) return 1;
              return 0;
            });
            
            checkboxes.forEach(item => {
              const checkbox = item.querySelector('input[type="checkbox"]');
              if (checkbox.checked) {
                item.classList.add('checked');
              } else {
                item.classList.remove('checked');
              }
              pricesContainer.appendChild(item);
            });
          }

          // Обновление видимости маркеров и секций в балунах
          function applyFilters() {
            let visiblePointsCount = 0;
            let visibleCompetitorsCount = 0;
            
            competitorMarkers.forEach((marker, index) => {
              const groupId = marker.element.dataset.groupId;
              const group = competitorGroupsData.get(groupId);
              
              if (!group) return;
              
              // Проверяем видимость группы
              const hasClient = group.hasClient;
              const visibleCompetitorsInGroup = group.competitors.filter(c => competitorMatchesFilters(c));
              const visibleCompetitorsCountInGroup = visibleCompetitorsInGroup.length;
              
              // Группа видима если есть клиент ИЛИ есть видимые конкуренты
              const shouldBeVisible = hasClient || visibleCompetitorsCountInGroup > 0;
              
              // Скрываем/показываем маркер
              if (marker.element) {
                if (shouldBeVisible) {
                  marker.element.classList.remove('hidden-marker');
                  visiblePointsCount++;
                  visibleCompetitorsCount += visibleCompetitorsCountInGroup;
                } else {
                  marker.element.classList.add('hidden-marker');
                }
              }
              
              // Обновляем секции в балуне
              const balloonData = competitorBalloons.get(marker.element);
              if (balloonData && balloonData.container) {
                const competitorsContainer = balloonData.container.querySelector('.competitors-group');
                if (competitorsContainer && group.competitors.length > 0) {
                  const sections = competitorsContainer.querySelectorAll('.competitor-section');
                  
                  sections.forEach((section, idx) => {
                    const competitor = group.competitors[idx];
                    if (!competitor) return;
                    
                    const matchesFilters = competitorMatchesFilters(competitor);
                    section.dataset.matchesFilters = matchesFilters;
                    
                    if (matchesFilters) {
                      section.classList.remove('hidden-section');
                    } else {
                      section.classList.add('hidden-section');
                    }
                  });
                  
                  // Обновляем бейдж в заголовке балуна с количеством видимых конкурентов
                  const titleBadge = balloonData.container.querySelector('.competitor-count-badge');
                  if (titleBadge) {
                    titleBadge.textContent = visibleCompetitorsCountInGroup;
                  }
                  
                  // Проверяем, нужно ли скрыть всю секцию конкурентов
                  const competitorsSection = balloonData.container.querySelector('.competitors-section');
                  if (competitorsSection) {
                    if (visibleCompetitorsCountInGroup > 0) {
                      competitorsSection.classList.remove('hidden-section');
                    } else {
                      competitorsSection.classList.add('hidden-section');
                    }
                  }
                }
                
                // Балуны всегда видны, скрываем только маркеры
                balloonData.container.style.display = 'block';
              }
            });
            
            // Обновляем статистику в панели фильтров
            document.getElementById('visibleCompetitorsCount').textContent = visibleCompetitorsCount;
            updateCheckedStyles();
          }

          function initializeFilters() {
            const pricesContainer = document.getElementById('pricesContainer');
            if (pricesContainer) {
              pricesContainer.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                  const price = e.target.value;
                  if (e.target.checked) {
                    if (!activeFilters.prices.includes(price)) {
                      activeFilters.prices.push(price);
                    }
                  } else {
                    activeFilters.prices = activeFilters.prices.filter(p => p !== price);
                  }
                  applyFilters();
                }
              });
            }
            
            document.querySelectorAll('input[name="revenue"]').forEach(radio => {
              radio.addEventListener('change', (e) => {
                activeFilters.revenueRange = e.target.value;
                applyFilters();
              });
            });
            
            document.getElementById('resetFilters').addEventListener('click', () => {
              uniquePrices.forEach(price => {
                const checkbox = document.getElementById(\`price-\${price}\`);
                if (checkbox) checkbox.checked = false;
              });
              
              document.getElementById('revenue-all').checked = true;
              
              activeFilters = {
                prices: [],
                revenueRange: 'all'
              };
              
              applyFilters();
            });
          }

          const getMarkerScreenPosition = (markerElement) => {
            const markerRect = markerElement.getBoundingClientRect();
            return {
              x: markerRect.left + markerRect.width / 2,
              y: markerRect.top
            };
          };

          const updateBalloonPosition = (markerElement, balloonContainer) => {
            if (!markerElement || !balloonContainer) return;
            
            const position = getMarkerScreenPosition(markerElement);
            balloonContainer.style.left = position.x + 'px';
            balloonContainer.style.top = (position.y + 15) + 'px';
          };

          const updateAllBalloonPositions = () => {
            balloonContainers.forEach((data, markerElement) => {
              updateBalloonPosition(markerElement, data.container);
            });
          };

          const activateBalloon = (container, balloon) => {
            if (currentActiveContainer && currentActiveContainer !== container) {
              currentActiveContainer.classList.remove('active');
              currentActiveContainer.querySelector('.balloon').classList.remove('active');
            }
            
            container.classList.add('active');
            balloon.classList.add('active');
            currentActiveContainer = container;
          };

          // Функция для создания маркера с правильной формой 50/50
          function createMarker(coordinates, group, groupId) {
            const markerElement = document.createElement('div');
            
            // Создаем SVG для маркера
            const svgNS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(svgNS, "svg");
            svg.setAttribute("width", "34");
            svg.setAttribute("height", "34");
            svg.setAttribute("viewBox", "0 0 34 34");
            
            // Определяем тип маркера и цвет
            let markerClass = 'pin-marker';
            let pathFill = 'orangered'; // по умолчанию красный
            
            if (group.hasClient && group.competitors.length > 0) {
              // Комбинированный маркер - создаем два отдельных path
              markerClass = 'pin-marker combined';
              
              // Левая половина - зеленая
              const leftPath = document.createElementNS(svgNS, "path");
              leftPath.setAttribute("d", "M17 0C10.1 0 4.5 5.6 4.5 12.5C4.5 22.8 17 34 17 34V0Z");
              leftPath.setAttribute("fill", "seagreen");
              
              // Правая половина - красная
              const rightPath = document.createElementNS(svgNS, "path");
              rightPath.setAttribute("d", "M17 0V34S29.5 22.8 29.5 12.5C29.5 5.6 23.9 0 17 0Z");
              rightPath.setAttribute("fill", "orangered");
              
              svg.appendChild(leftPath);
              svg.appendChild(rightPath);
              
            } else if (group.hasClient) {
              // Только клиент - зеленый
              markerClass = 'pin-marker green';
              pathFill = 'seagreen';
              
              const path = document.createElementNS(svgNS, "path");
              path.setAttribute("d", "M17 0C10.1 0 4.5 5.6 4.5 12.5C4.5 22.8 17 34 17 34S29.5 22.8 29.5 12.5C29.5 5.6 23.9 0 17 0Z");
              path.setAttribute("fill", pathFill);
              svg.appendChild(path);
              
            } else {
              // Только конкуренты - красный
              markerClass = 'pin-marker red';
              pathFill = 'orangered';
              
              const path = document.createElementNS(svgNS, "path");
              path.setAttribute("d", "M17 0C10.1 0 4.5 5.6 4.5 12.5C4.5 22.8 17 34 17 34S29.5 22.8 29.5 12.5C29.5 5.6 23.9 0 17 0Z");
              path.setAttribute("fill", pathFill);
              svg.appendChild(path);
            }
            
            // Добавляем белый круг в центре для всех типов маркеров
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", "17");
            circle.setAttribute("cy", "12");
            circle.setAttribute("r", "5");
            circle.setAttribute("fill", "white");
            svg.appendChild(circle);
            
            markerElement.className = markerClass;
            
            if (groupId) {
              markerElement.dataset.groupId = groupId;
            }
            
            markerElement.appendChild(svg);
            
            let title = '';
            if (group.hasClient && group.competitors.length > 0) {
              title = \`Клиент + \${group.competitors.length} конкурентов\`;
            } else if (group.hasClient) {
              title = 'Новый клиент';
            } else if (group.competitors.length > 1) {
              title = \`Группа конкурентов (\${group.competitors.length})\`;
            } else if (group.competitors.length === 1) {
              title = group.competitors[0].name || 'Конкурент';
            } else {
              title = 'Точка';
            }
            
            markerElement.title = title;
            const marker = new YMapMarker({ coordinates }, markerElement);
            
            // Сохраняем данные группы
            competitorGroupsData.set(groupId, group);
            
            // Создаем балун
            const balloonData = createCombinedBalloon(group, groupId);
            
            balloonContainers.set(markerElement, { 
              container: balloonData.container, 
              balloon: balloonData.balloon, 
              coordinates,
              groupId 
            });
            
            competitorBalloons.set(markerElement, { 
              container: balloonData.container, 
              balloon: balloonData.balloon,
              groupId 
            });
            
            // Обработчик клика на маркер
            markerElement.addEventListener('click', (event) => {
              event.stopPropagation();
              activateBalloon(balloonData.container, balloonData.balloon);
            });
            
            setTimeout(() => {
              updateBalloonPosition(markerElement, balloonData.container);
            }, 100);
            
            return marker;
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
              competitorMarkers.push(marker);
              
              // Активируем балун для первой группы с клиентом
              if (group.hasClient && index === 0) {
                setTimeout(() => {
                  const balloonData = balloonContainers.get(marker.element);
                  if (balloonData) {
                    activateBalloon(balloonData.container, balloonData.balloon);
                  }
                }, 1000);
              }
            }
          });

          initializeFilters();
          updateCheckedStyles();
          applyFilters(); // Применяем фильтры при инициализации

          setTimeout(() => {
            updateInterval = setInterval(updateAllBalloonPositions, 100);
          }, 100);
          
          window.addEventListener('resize', updateAllBalloonPositions);

          window.addEventListener('beforeunload', () => {
            if (updateInterval) {
              clearInterval(updateInterval);
            }
          });
          
        }).catch(error => {
          console.error('Ошибка загрузки Яндекс Карт:', error);
          document.body.innerHTML = 
            '<div style="padding: 20px; text-align: center;"><h3>Ошибка загрузки карты</h3><p>' + error.message + '</p></div>';
        });
      </script>
    </body>
  </html>
        `
  }

  // Вспомогательный метод для группировки конкурентов по координатам с учетом контрагента
  private static groupCompetitorsByCoordinates(
    competitors: any[],
    counterpartyData: any
  ): Record<string, any> {
    const groups: Record<string, any> = {}

    // Обрабатываем нового клиента
    if (
      counterpartyData.latitude &&
      counterpartyData.longitude &&
      counterpartyData.latitude !== 0 &&
      counterpartyData.longitude !== 0
    ) {
      const clientKey = `${counterpartyData.longitude.toFixed(
        6
      )}_${counterpartyData.latitude.toFixed(6)}`

      if (!groups[clientKey]) {
        groups[clientKey] = {
          coordinates: [counterpartyData.longitude, counterpartyData.latitude],
          hasClient: true,
          clientData: {
            ...counterpartyData,
            id: 'client',
            isClient: true,
          },
          competitors: [],
        }
      } else {
        groups[clientKey].hasClient = true
        groups[clientKey].clientData = {
          ...counterpartyData,
          id: 'client',
          isClient: true,
        }
      }
    }

    // Обрабатываем конкурентов
    competitors.forEach((competitor, index) => {
      if (
        competitor.latitude &&
        competitor.longitude &&
        competitor.latitude !== 0 &&
        competitor.longitude !== 0
      ) {
        const key = `${competitor.longitude.toFixed(
          6
        )}_${competitor.latitude.toFixed(6)}`

        if (!groups[key]) {
          groups[key] = {
            coordinates: [competitor.longitude, competitor.latitude],
            hasClient: false,
            clientData: null,
            competitors: [],
          }
        }

        groups[key].competitors.push({
          ...competitor,
          id: competitor.id || `comp_${index}`,
          isClient: false,
        })
      } else {
        // Для конкурентов без координат создаем отдельную группу без координат
        const noCoordsKey = `no_coords_${index}`
        groups[noCoordsKey] = {
          coordinates: null,
          hasClient: false,
          clientData: null,
          competitors: [
            {
              ...competitor,
              id: competitor.id || `comp_${index}`,
              isClient: false,
            },
          ],
        }
      }
    })

    return groups
  }
}
