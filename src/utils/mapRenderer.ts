import { CounterpartyInstance } from '../types'

export class MapRenderer {
  static generateHTML(
    guid: string,
    data: CounterpartyInstance,
    useYandex: boolean = true
  ): string {
    if (useYandex && process.env.YANDEX_API_KEY) {
      return this.generateYandexMapHTML(guid, data)
    } else {
      return this.generateOSMMapHTML(guid, data)
    }
  }
  private static generateYandexMapHTML(
    guid: string,
    data: CounterpartyInstance
  ): string {
    // Собираем уникальные значения цен из конкурентов
    const uniquePrices = Array.from(
      new Set(data.competitors?.map((c) => c.price).filter(Boolean) || [])
    )

    // Подсчет статистики
    const allCompetitors = data.competitors || []
    const totalCompetitors = allCompetitors.length
    const unmarkedCompetitors = allCompetitors.filter(
      (c) =>
        !c.longitude || !c.latitude || c.longitude === 0 || c.latitude === 0
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
          max-width: 300px;
          min-width: 250px;
          font-family: Arial, sans-serif;
          border: 2px solid #ccc;
          position: relative;
          margin-bottom: 10px;
          pointer-events: auto;
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
          margin: 0 0 10px 0;
          color: #333;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        
        .balloon p {
          margin: 5px 0;
          color: #666;
        }
        
        .balloon strong {
          color: #333;
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
        }
        
        .balloon-more:hover {
          background: #0056b3;
        }
        
        .balloon-full {
          display: none;
        }
        
        .balloon.compact .balloon-full {
          display: none;
        }
        
        .balloon.expanded .balloon-compact {
          display: none;
        }
        
        .balloon.expanded .balloon-full {
          display: block;
        }
        
        /* Стили маркеров */
        .pin-marker {
          width: 34px;
          height: 34px;
          cursor: pointer;
          transform: translate(-17px, -34px);
        }
        
        .pin-marker.green svg {
          fill: seagreen;
        }
        
        .pin-marker.red svg {
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
          width: 300px; /* Фиксированная ширина */
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        
        .filters-panel.compact {
          height: 140px;
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
        }
        
        .stats-unmarked {
          color: #ff6b6b;
          font-weight: bold;
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
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="balloons-overlay" id="balloonsOverlay"></div>
  
      <script>
        const counterpartyData = ${JSON.stringify(data)};
        
        const allCompetitors = ${JSON.stringify(allCompetitors)};
        const uniquePrices = ${JSON.stringify(uniquePrices)};
        const totalCompetitors = ${totalCompetitors};
        const unmarkedCompetitors = ${unmarkedCompetitors};
  
        let activeFilters = {
          prices: [],
          revenueRange: 'all'
        };
  
        let competitorMarkers = [];
        let competitorBalloons = new Map();
  
        ymaps3.ready.then(() => {
          const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = ymaps3;
          
          let center = [37.64, 55.76]
          const zoom = 14
          
          if (counterpartyData.latitude && counterpartyData.longitude) {
            center = [counterpartyData.longitude, counterpartyData.latitude];
          } else {
            const firstCompetitor = allCompetitors.find(c => c.latitude && c.longitude);
            if (firstCompetitor) {
              center = [firstCompetitor.longitude, firstCompetitor.latitude];
            } 
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
          filtersPanel.className = 'filters-panel compact'; // По умолчанию компактный режим
          
          const unmarkedStats = unmarkedCompetitors > 0 ? 
            \`<div class="stats-unmarked">Не отмечены на карте: \${unmarkedCompetitors}</div>\` : '';
          
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
              <div class="stats-total">Показано: <span id="visibleCount">\${totalCompetitors}</span> из \${totalCompetitors}</div>
              \${unmarkedStats}
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
              
              // Скрываем балун контрагента при сворачивании фильтров
              hideCounterpartyBalloon();
            }
          }
  
          // Функция для скрытия балуна контрагента
          function hideCounterpartyBalloon() {
            balloonContainers.forEach((data, markerElement) => {
              if (markerElement.classList.contains('green')) {
                data.container.style.display = 'none';
              }
            });
            
            if (currentActiveContainer) {
              currentActiveContainer.classList.remove('active');
              currentActiveContainer.querySelector('.balloon').classList.remove('active');
              currentActiveContainer = null;
            }
          }
  
          // Обработчик клика по заголовку фильтров
          document.getElementById('filtersHeader').addEventListener('click', toggleFilters);
  
          // Обработчик клика по всей панели фильтров для скрытия балуна контрагента
          filtersPanel.addEventListener('click', (e) => {
            // Если клик не по заголовку (уже обрабатывается отдельно) и не по элементам внутри контента
            if (!e.target.closest('.filters-header')) {
              hideCounterpartyBalloon();
            }
          });
  
          const balloonsOverlay = document.getElementById('balloonsOverlay');
          let currentActiveContainer = null;
          const balloonContainers = new Map();
          let updateInterval = null;
  
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
  
          function applyFilters() {
            let visibleCount = 0;
            
            competitorMarkers.forEach((marker, index) => {
              const competitor = allCompetitors[index];
              const shouldBeVisible = competitorMatchesFilters(competitor);
              
              // Скрываем/показываем маркер
              if (marker.element) {
                if (shouldBeVisible) {
                  marker.element.classList.remove('hidden-marker');
                  visibleCount++;
                } else {
                  marker.element.classList.add('hidden-marker');
                }
              }
              
              // Скрываем/показываем балун
              const balloonData = competitorBalloons.get(marker.element);
              if (balloonData) {
                if (shouldBeVisible) {
                  balloonData.container.style.display = 'block';
                } else {
                  balloonData.container.style.display = 'none';
                  if (currentActiveContainer === balloonData.container) {
                    currentActiveContainer.classList.remove('active');
                    balloonData.balloon.classList.remove('active');
                    currentActiveContainer = null;
                  }
                }
              }
            });
            
            document.getElementById('visibleCount').textContent = visibleCount;
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
  
          const createBalloon = (coordinates, content, isCompetitor = false) => {
            const balloonContainer = document.createElement('div');
            balloonContainer.className = 'balloon-container';
            
            const balloon = document.createElement('div');
            balloon.className = \`balloon \${isCompetitor ? 'competitor-balloon compact' : ''}\`;
            balloon.innerHTML = content;
            
            balloonContainer.appendChild(balloon);
            balloonsOverlay.appendChild(balloonContainer);
            
            if (isCompetitor) {
              balloonContainer.style.display = 'block';
            } else {
              balloonContainer.style.display = 'none';
            }
            
            balloon.addEventListener('click', (e) => {
              e.stopPropagation();
              activateBalloon(balloonContainer, balloon);
              
              if (e.target.classList.contains('balloon-more')) {
                balloon.classList.toggle('compact');
                balloon.classList.toggle('expanded');
              }
            });
            
            balloonContainer.addEventListener('click', (e) => {
              e.stopPropagation();
              activateBalloon(balloonContainer, balloon);
            });
            
            return { container: balloonContainer, balloon: balloon };
          };
  
          const createPinMarker = (coordinates, colorClass, title, balloonData = null, competitorData = null) => {
            const markerElement = document.createElement('div');
            markerElement.className = \`pin-marker \${colorClass}\`;
            
            markerElement.innerHTML = \`
              <svg width="34" height="34" viewBox="0 0 34 34">
                <path d="M17 0C10.1 0 4.5 5.6 4.5 12.5C4.5 22.8 17 34 17 34S29.5 22.8 29.5 12.5C29.5 5.6 23.9 0 17 0Z"/>
                <circle cx="17" cy="12" r="5" fill="white"/>
              </svg>
            \`;
            
            markerElement.title = title;
  
            const marker = new YMapMarker({ coordinates }, markerElement);
            
            if (balloonData) {
              const { container, balloon } = createBalloon(
                coordinates, 
                balloonData.content, 
                balloonData.isCompetitor
              );
              
              balloonContainers.set(markerElement, { container, balloon, coordinates });
              competitorBalloons.set(markerElement, { container, balloon, competitorData });
              
              markerElement.addEventListener('click', (event) => {
                event.stopPropagation();
                
                if (balloonData.isCompetitor) {
                  activateBalloon(container, balloon);
                } else {
                  const isVisible = container.style.display === 'block';
                  container.style.display = isVisible ? 'none' : 'block';
                  if (!isVisible) {
                    activateBalloon(container, balloon);
                  }
                }
              });
              
              setTimeout(() => {
                updateBalloonPosition(markerElement, container);
              }, 100);
            }
  
            return marker;
          };
  
          if (counterpartyData.latitude && counterpartyData.longitude) {
            const counterpartyContent = \`
              <h3>🎯 Новый клиент</h3>
              <p><strong>Телефон:</strong> \${counterpartyData.phone || '-'}</p>
              <p><strong>Менеджер:</strong> \${counterpartyData.manager}</p>
              <p><strong>Адрес:</strong> \${counterpartyData.address}</p>
              <br/>
              <p><strong>Цена:</strong> \${counterpartyData.price}</p>
            \`;
            
            const counterpartyMarker = createPinMarker(
              [counterpartyData.longitude, counterpartyData.latitude],
              'green',
              'Контрагент: Новый клиент',
              {
                content: counterpartyContent,
                isCompetitor: false
              }
            );
            map.addChild(counterpartyMarker);
            
            setTimeout(() => {
              const balloonData = balloonContainers.get(counterpartyMarker.element);
              if (balloonData) {
                balloonData.container.style.display = 'block';
                activateBalloon(balloonData.container, balloonData.balloon);
              }
            }, 1000);
          }
  
          if (allCompetitors.length > 0) {
            allCompetitors.forEach((competitor, index) => {
              if (competitor.latitude && competitor.longitude && 
                  competitor.latitude !== 0 && competitor.longitude !== 0) {
                const competitorCompactContent = \`
                  <div class="balloon-compact">
                    <p><strong>\${competitor.name}</strong></p>
                    <p><strong>Цена:</strong> \${competitor.price || '-'}</p>
                    <p><strong>Оборот:</strong> \${competitor.formatted_revenue_last_3_months || '0 ₽'}</p>
                    <button class="balloon-more">▼ Подробнее</button>
                  </div>
                  <div class="balloon-full">
                    <h3>⚡ Конкурент</h3>
                    <p><strong>Название:</strong> \${competitor.name}</p>
                    <p><strong>Тип:</strong> \${competitor.relationship_type || '-'}</p>
                    <p><strong>Телефон:</strong> \${competitor.phone || '-'}</p>
                    <p><strong>Менеджер:</strong> \${competitor.manager || '-'}</p>
                    <p><strong>Адрес:</strong> \${competitor.address || '-'}</p>
                    <br/>
                    <p><strong>Цена:</strong> \${competitor.price || '-'}</p>
                    <p><strong>Оборот за посл. 3 мес.:</strong> \${competitor.formatted_revenue_last_3_months || '0 ₽'}</p>
                    <p><strong>Последняя продажа:</strong> \${competitor.last_sale_date || '-'}</p>
                    <button class="balloon-more">▲ Свернуть</button>
                  </div>
                \`;
                
                const competitorMarker = createPinMarker(
                  [competitor.longitude, competitor.latitude],
                  'red',
                  'Конкурент: ' + competitor.name,
                  {
                    content: competitorCompactContent,
                    isCompetitor: true
                  },
                  competitor
                );
                map.addChild(competitorMarker);
                competitorMarkers.push(competitorMarker);
              }
            });
          }
  
          initializeFilters();
          updateCheckedStyles();
  
          setTimeout(() => {
            updateInterval = setInterval(updateAllBalloonPositions, 100);
          }, 100);
  
          document.getElementById('map').addEventListener('click', (e) => {
            if (!e.target.closest('.balloon') && !e.target.closest('.pin-marker') && 
                !e.target.closest('.filters-panel')) {
              balloonContainers.forEach((data, markerElement) => {
                if (markerElement.classList.contains('green')) {
                  data.container.style.display = 'none';
                }
              });
              
              if (currentActiveContainer) {
                currentActiveContainer.classList.remove('active');
                currentActiveContainer.querySelector('.balloon').classList.remove('active');
                currentActiveContainer = null;
              }
            }
          });
          
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

  private static generateOSMMapHTML(
    guid: string,
    data: CounterpartyInstance
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Карта контрагента - \${data.manager} (OSM)</title>
    <meta charset="utf-8">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
    <style>
        body { margin: 0; }
        #map { height: 100vh; width: 100%; }
        .header { 
            position: absolute; 
            top: 10px; 
            left: 10px; 
            background: white; 
            padding: 15px; 
            border-radius: 5px; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.2); 
            z-index: 1000; 
            max-width: 400px; 
        }
        .dev-banner { 
            position: absolute; 
            top: 10px; 
            right: 10px; 
            background: red; 
            color: white; 
            padding: 5px 10px; 
            z-index: 1000; 
            border-radius: 3px; 
        }
        .legend { 
            position: absolute; 
            top: 60px; 
            right: 10px; 
            background: white; 
            padding: 10px; 
            border-radius: 5px; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.2); 
            z-index: 1000; 
        }
        .legend-item { 
            display: flex; 
            align-items: center; 
            margin: 5px 0; 
        }
        .legend-color { 
            width: 20px; 
            height: 20px; 
            border-radius: 50%; 
            margin-right: 8px; 
        }
    </style>
</head>
<body>
    <div class="dev-banner">DEV MODE - OpenStreetMap</div>
    <div class="header">
        <h3>\${data.manager}</h3>
        <p><strong>Цена:</strong> \${data.price}</p>
        <p><strong>Телефон:</strong> \${data.phone}</p>
        <p><strong>Адрес:</strong> \${data.address}</p>
        <p><strong>Конкурентов:</strong> \${data.competitors?.length || 0}</p>
    </div>
    
    \${data.competitors && data.competitors.length > 0
        ? \`
    <div class="legend">
      <div class="legend-item">
        <div class="legend-color" style="background: #00ff00"></div>
        <span>Контрагент</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #ff0000"></div>
        <span>Конкуренты</span>
      </div>
    </div>
    \`
        : ''}
    
    <div id="map"></div>
    
    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
    <script>
        const counterpartyData = \${JSON.stringify(data)};
        
        // Инициализация карты
        let center = [55.76, 37.64];
        if (counterpartyData.latitude && counterpartyData.longitude) {
            center = [counterpartyData.latitude, counterpartyData.longitude];
        }
        
        const map = L.map('map').setView(center, 10);
        
        // Добавляем тайлы OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);
        
        const allMarkers = [];
        
        // Добавляем контрагента (зеленый)
        if (counterpartyData.latitude && counterpartyData.longitude) {
            const counterpartyIcon = L.divIcon({
                className: 'counterparty-icon',
                html: '<div style="background: #00ff00; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            const counterpartyMarker = L.marker(
                [counterpartyData.latitude, counterpartyData.longitude],
                { icon: counterpartyIcon }
            ).addTo(map);
            
            counterpartyMarker.bindPopup(\`
                <h3>Контрагент</h3>
                <p><strong>Менеджер:</strong> \${counterpartyData.manager}</p>
                <p><strong>Цена:</strong> \${counterpartyData.price}</p>
                <p><strong>Телефон:</strong> \${counterpartyData.phone}</p>
                <p><strong>Адрес:</strong> \${counterpartyData.address}</p>
            \`);
            
            allMarkers.push(counterpartyMarker);
        }
        
        // Добавляем конкурентов (красные)
        if (counterpartyData.competitors && counterpartyData.competitors.length > 0) {
            counterpartyData.competitors.forEach(competitor => {
                if (competitor.latitude && competitor.longitude) {
                    const competitorIcon = L.divIcon({
                        className: 'competitor-icon',
                        html: '<div style="background: #ff0000; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    
                    const competitorMarker = L.marker(
                        [competitor.latitude, competitor.longitude],
                        { icon: competitorIcon }
                    ).addTo(map);
                    
                    competitorMarker.bindPopup(\`
                        <h3>\${competitor.name}</h3>
                        <p><strong>Менеджер:</strong> \${competitor.manager}</p>
                        <p><strong>Цена:</strong> \${competitor.price}</p>
                        <p><strong>Оборот:</strong> \${competitor.revenueLast3Months?.toLocaleString('ru-RU') || '0'} руб.</p>
                        <p><strong>Тип отношений:</strong> \${competitor.relationshipType}</p>
                        <p><strong>Последняя продажа:</strong> \${competitor.lastSaleDate}</p>
                        <p><strong>Адрес:</strong> \${competitor.address}</p>
                        <p><strong>Телефон:</strong> \${competitor.phone}</p>
                    \`);
                    
                    allMarkers.push(competitorMarker);
                }
            });
        }
        
        // Подстраиваем границы если есть маркеры
        if (allMarkers.length > 0) {
            const group = new L.featureGroup(allMarkers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
    </script>
</body>
</html>
    `
  }
}
