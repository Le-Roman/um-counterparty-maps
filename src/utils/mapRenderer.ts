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
        html {
          height: 100%;
        }
        body {
          height: 100%;
          margin: 0;
          font-family: Arial, sans-serif;
        }
        #map {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        
        /* Контейнер для балунов поверх карты */
        .balloons-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1000;
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
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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
        
        /* Информационный блок */
        .info-panel {
          position: absolute;
          top: 15px;
          left: 15px;
          background: rgba(60, 60, 60, 0.8);
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-family: Arial, sans-serif;
          font-size: 14px;
          line-height: 1.4;
          z-index: 100000;
          backdrop-filter: blur(2px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        .info-panel p {
          margin: 0;
        }
        
        .info-panel .total {
          font-weight: bold;
        }
          
        .info-panel .unmarked {
          color: #ff6b6b;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="balloons-overlay" id="balloonsOverlay"></div>
  
      <script>
        const counterpartyData = ${JSON.stringify(data)};

        // Подсчет статистики конкурентов
        const totalCompetitors = counterpartyData.competitors ? counterpartyData.competitors.length : 0;
        const unmarkedCompetitors = counterpartyData.competitors ? 
          counterpartyData.competitors.filter(c => c.longitude === 0 && c.latitude === 0).length : 0;
        
        ymaps3.ready.then(() => {
          const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = ymaps3;
          
          let center = [37.64, 55.76]
          const zoom = 14
          
          if (counterpartyData.latitude && counterpartyData.longitude) {
            center = [counterpartyData.longitude, counterpartyData.latitude];
          } else {
            const firstCompetitor = counterpartyData.competitors?.find(c => c.latitude && c.longitude);
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

          // Создаем информационную панель
          const infoPanel = document.createElement('div');
          infoPanel.className = 'info-panel';
          
          if (unmarkedCompetitors > 0) {
            infoPanel.innerHTML = \`
              <p class="total">Всего конкурентов: \${totalCompetitors}</p>
              <p class="unmarked">Не отмечены: \${unmarkedCompetitors}</p>
            \`;
          } else {
            infoPanel.innerHTML = \`
              <p class="total">Всего конкурентов: \${totalCompetitors}</p>
            \`;
          }
          
          document.getElementById('map').appendChild(infoPanel);
  
          const balloonsOverlay = document.getElementById('balloonsOverlay');
          let currentActiveContainer = null;
          const balloonContainers = new Map();
          let updateInterval = null;
  
          // Функция для обновления позиции балуна
          const updateBalloonPosition = (markerElement, balloonContainer) => {
            if (!markerElement || !balloonContainer) return;
            
            const rect = markerElement.getBoundingClientRect();
            const mapRect = document.getElementById('map').getBoundingClientRect();
            
            if (rect && mapRect) {
              const markerCenterX = rect.left - mapRect.left + rect.width / 2;
              balloonContainer.style.left = markerCenterX + 'px';
              balloonContainer.style.top = (rect.top - mapRect.top + 15) + 'px';
            }
          };
  
          // Функция для обновления всех позиций балунов
          const updateAllBalloonPositions = () => {
            balloonContainers.forEach((data, markerElement) => {
              updateBalloonPosition(markerElement, data.container);
            });
          };
  
          // Функция для активации балуна
          const activateBalloon = (container, balloon) => {
            console.log('Активируем балун');
            
            // Снимаем активность с предыдущего контейнера
            if (currentActiveContainer && currentActiveContainer !== container) {
              currentActiveContainer.classList.remove('active');
              currentActiveContainer.querySelector('.balloon').classList.remove('active');
              console.log('Сняли активность с предыдущего балуна');
            }
            
            // Активируем новый контейнер и балун
            container.classList.add('active');
            balloon.classList.add('active');
            currentActiveContainer = container;
            console.log('Новый активный балун установлен');
          };
  
          // Функция для создания балуна
          const createBalloon = (coordinates, content, isCompetitor = false) => {
            const balloonContainer = document.createElement('div');
            balloonContainer.className = 'balloon-container';
            
            const balloon = document.createElement('div');
            balloon.className = \`balloon \${isCompetitor ? 'competitor-balloon compact' : ''}\`;
            balloon.innerHTML = content;
            
            balloonContainer.appendChild(balloon);
            balloonsOverlay.appendChild(balloonContainer);
            
            // Для конкурентов сразу показываем балун
            if (isCompetitor) {
              balloonContainer.style.display = 'block';
            } else {
              balloonContainer.style.display = 'none';
            }
            
            // Обработчик клика на балун
            balloon.addEventListener('click', (e) => {
              e.stopPropagation();
              console.log('Клик по балуну');
              activateBalloon(balloonContainer, balloon);
              
              if (e.target.classList.contains('balloon-more')) {
                balloon.classList.toggle('compact');
                balloon.classList.toggle('expanded');
              }
            });
            
            // Обработчик клика на контейнер (на случай пустых областей)
            balloonContainer.addEventListener('click', (e) => {
              e.stopPropagation();
              console.log('Клик по контейнеру балуна');
              activateBalloon(balloonContainer, balloon);
            });
            
            return { container: balloonContainer, balloon: balloon };
          };
  
          // Функция для создания маркера
          const createPinMarker = (coordinates, colorClass, title, balloonData = null) => {
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
            
            // Если есть данные для балуна - создаем его
            if (balloonData) {
              const { container, balloon } = createBalloon(
                coordinates, 
                balloonData.content, 
                balloonData.isCompetitor
              );
              
              balloonContainers.set(markerElement, { container, balloon, coordinates });
              
              // Обработчик клика на маркер
              markerElement.addEventListener('click', (event) => {
                event.stopPropagation();
                console.log('Клик по маркеру', colorClass);
                
                if (balloonData.isCompetitor) {
                  // Для конкурентов активируем балун
                  activateBalloon(container, balloon);
                } else {
                  // Для контрагента показываем/скрываем балун
                  const isVisible = container.style.display === 'block';
                  container.style.display = isVisible ? 'none' : 'block';
                  if (!isVisible) {
                    activateBalloon(container, balloon);
                  }
                }
              });
              
              // Изначальное позиционирование
              setTimeout(() => {
                updateBalloonPosition(markerElement, container);
              }, 100);
            }
  
            return marker;
          };
  
          // Добавляем контрагента
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
            
            // Автоматически открываем балун контрагента
            setTimeout(() => {
              const balloonData = balloonContainers.get(counterpartyMarker.element);
              if (balloonData) {
                balloonData.container.style.display = 'block';
                activateBalloon(balloonData.container, balloonData.balloon);
                console.log('Автоматически открыт балун контрагента');
              }
            }, 1000);
          }
  
          // Добавляем конкурентов (только тех, у кого есть координаты и они не равны 0)
          if (counterpartyData.competitors && counterpartyData.competitors.length > 0) {
            counterpartyData.competitors.forEach((competitor) => {
              if (competitor.latitude && competitor.longitude && 
                  competitor.latitude !== 0 && competitor.longitude !== 0) {
                const competitorCompactContent = \`
                  <div class="balloon-compact">
                    <p><strong>\${competitor.name}</strong></p>
                    <p><strong>Тип:</strong> \${competitor.relationship_type || '-'}</p>
                    <p><strong>Цена:</strong> \${competitor.price}</p>
                    <p><strong>Оборот:</strong> \${competitor.revenue_last_3_months || '0'}р</p>
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
                    <p><strong>Оборот за посл. 3 мес.:</strong> \${competitor.revenue_last_3_months || '0'}р</p>
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
                  }
                );
                map.addChild(competitorMarker);
              }
            });
          }
  
          // Запускаем интервал для обновления позиций балунов
          setTimeout(() => {
            updateInterval = setInterval(updateAllBalloonPositions, 100);
          }, 100);
  
          // Закрываем балун контрагента при клике на карту
          document.getElementById('map').addEventListener('click', (e) => {
            if (!e.target.closest('.balloon') && !e.target.closest('.pin-marker') && !e.target.closest('.info-panel')) {
              console.log('Клик по карте - скрываем балуны');
              
              // Скрываем все балуны контрагентов
              balloonContainers.forEach((data, markerElement) => {
                if (markerElement.classList.contains('green')) {
                  data.container.style.display = 'none';
                }
              });
              
              // Снимаем активность со всех балунов
              if (currentActiveContainer) {
                currentActiveContainer.classList.remove('active');
                currentActiveContainer.querySelector('.balloon').classList.remove('active');
                currentActiveContainer = null;
              }
            }
          });
          
          // Обновляем позиции балунов при ресайзе
          window.addEventListener('resize', () => {
            updateAllBalloonPositions();
          });
          
        }).catch(error => {
          console.error('Ошибка загрузки Яндекс Карт:', error);
          document.getElementById('map').innerHTML = 
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
