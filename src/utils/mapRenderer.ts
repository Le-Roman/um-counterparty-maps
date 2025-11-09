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
      .pin-marker {
        width: 34px;
        height: 34px;
        cursor: pointer;
        transform: translate(-17px, -34px);
        z-index: 100;
      }
      .pin-marker.green svg {
        fill: seagreen;
      }
      .pin-marker.red svg {
        fill: orangered;
      }
      .balloon-container {
        position: absolute;
        z-index: 1000;
        pointer-events: none;
        max-width: calc(100% - 20px);
      }
      .balloon {
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 300px;
        font-family: Arial, sans-serif;
        border: 2px solid #ccc;
        pointer-events: auto;
        position: relative;
      }
      /* Базовые стили стрелки (по умолчанию - сверху слева) */
      .balloon::after {
        content: '';
        position: absolute;
        left: 5px;
        top: 100%;
        border: 10px solid transparent;
        border-top-color: #ccc;
      }
      .balloon::before {
        content: '';
        position: absolute;
        left: 5px;
        top: 100%;
        border: 10px solid transparent;
        border-top-color: white;
        margin-top: -2px;
        z-index: 1;
      }
      /* Стрелка сверху справа */
      .balloon.arrow-top-right::after {
        left: auto;
        right: 5px;
      }
      .balloon.arrow-top-right::before {
        left: auto;
        right: 5px;
      }
      /* Стрелка снизу слева */
      .balloon.arrow-bottom-left::after {
        top: -20px;
        border-top-color: transparent;
        border-bottom-color: #ccc;
      }
      .balloon.arrow-bottom-left::before {
        top: -20px;
        border-top-color: transparent;
        border-bottom-color: white;
        margin-top: 2px;
      }
      /* Стрелка снизу справа */
      .balloon.arrow-bottom-right::after {
        top: -20px;
        left: auto;
        right: 5px;
        border-top-color: transparent;
        border-bottom-color: #ccc;
      }
      .balloon.arrow-bottom-right::before {
        top: -20px;
        left: auto;
        right: 5px;
        border-top-color: transparent;
        border-bottom-color: white;
        margin-top: 2px;
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
    </style>
  </head>
  <body>
    <div id="map"></div>

    <script>
      const counterpartyData = ${JSON.stringify(data)};
      
      ymaps3.ready.then(() => {
        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = ymaps3;
        
        // ПРИОРИТЕТ 1: Координаты контрагента
        let center
        const zoom = 10
        
        if (counterpartyData.latitude && counterpartyData.longitude) {
          center = [counterpartyData.latitude, counterpartyData.longitude];
        } else {
          // Если у контрагента нет координат, ищем у первого конкурента
          const firstCompetitor = counterpartyData.competitors?.find(c => c.latitude && c.longitude);
          if (firstCompetitor) {
            center = [firstCompetitor.latitude, firstCompetitor.longitude];
          } else {
            // Если вообще нет координат - используем Москву по умолчанию
            center = [55.76, 37.64];
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

        let activeBalloon = null;
        let activeMarker = null;
        const competitorBalloons = new Map();

        // Функция для закрытия балуна контрагента
        const closeBalloon = () => {
          if (activeBalloon) {
            activeBalloon.remove();
            activeBalloon = null;
            activeMarker = null;
          }
        };

        // Функция для обновления позиции балуна с адаптивным позиционированием
        const updateBalloonPosition = (markerElement, balloonContainer) => {
          if (!markerElement || !balloonContainer) return;
          
          const rect = markerElement.getBoundingClientRect();
          const mapRect = document.getElementById('map').getBoundingClientRect();
          
          // Проверяем, виден ли маркер в viewport карты
          const isMarkerVisible = (
            rect.left >= mapRect.left &&
            rect.right <= mapRect.right &&
            rect.top >= mapRect.top &&
            rect.bottom <= mapRect.bottom
          );
          
          if (!isMarkerVisible) {
            balloonContainer.style.display = 'none';
            return;
          }
          
          balloonContainer.style.display = 'block';
          
          const balloonWidth = balloonContainer.offsetWidth;
          const balloonHeight = balloonContainer.offsetHeight;
          const markerWidth = 34;
          const markerHeight = 34;
          
          // Позиция по умолчанию - сверху справа
          let position = {
            left: rect.left - mapRect.left,
            top: rect.top - mapRect.top - balloonHeight - 10,
            arrow: 'top-left'
          };
          
          // Проверяем, помещается ли балун в позиции по умолчанию
          const fitsDefault = 
            position.left >= 10 && 
            position.left + balloonWidth <= mapRect.width - 10 &&
            position.top >= 10;
          
          if (fitsDefault) {
            // Если помещается - используем позицию по умолчанию
            balloonContainer.style.left = position.left + 'px';
            balloonContainer.style.top = position.top + 'px';
            updateBalloonArrow(balloonContainer, position.arrow);
            return;
          }
          
          // Если не помещается в позиции по умолчанию, ищем альтернативу
          
          // 1. Проверяем выход за правый край
          if (position.left + balloonWidth > mapRect.width - 10) {
            // Пробуем позицию сверху слева
            position.left = rect.left - mapRect.left - balloonWidth + markerWidth;
            position.arrow = 'top-right';
            
            // Если и слева не помещается, пробуем снизу
            if (position.left < 10) {
              position.left = rect.left - mapRect.left;
              position.top = rect.bottom - mapRect.top + 10;
              position.arrow = 'bottom-left';
              
              // Если снизу справа не помещается, пробуем снизу слева
              if (position.left + balloonWidth > mapRect.width - 10) {
                position.left = rect.left - mapRect.left - balloonWidth + markerWidth;
                position.arrow = 'bottom-right';
              }
            }
          }
          
          // 2. Проверяем выход за верхний край (только если еще не меняли на нижнюю позицию)
          if (position.top < 10 && position.arrow.includes('top')) {
            position.top = rect.bottom - mapRect.top + 10;
            position.arrow = position.arrow.replace('top', 'bottom');
          }
          
          // 3. Проверяем выход за левый край (для левых позиций)
          if (position.left < 10 && position.arrow.includes('right')) {
            position.left = rect.left - mapRect.left;
            position.arrow = position.arrow.replace('right', 'left');
          }
          
          // 4. Финальная корректировка - если все равно не помещается, прижимаем к краям
          position.left = Math.max(10, Math.min(position.left, mapRect.width - balloonWidth - 10));
          position.top = Math.max(10, Math.min(position.top, mapRect.height - balloonHeight - 10));
          
          balloonContainer.style.left = position.left + 'px';
          balloonContainer.style.top = position.top + 'px';
          updateBalloonArrow(balloonContainer, position.arrow);
        };

        // Функция для обновления позиции стрелки балуна
        const updateBalloonArrow = (balloonContainer, arrowPosition) => {
          const balloon = balloonContainer.querySelector('.balloon');
          if (!balloon) return;
          
          // Удаляем все классы стрелок
          balloon.classList.remove('arrow-top-left', 'arrow-top-right', 'arrow-bottom-left', 'arrow-bottom-right');
          
          // Добавляем класс для текущей позиции стрелки (ИСПРАВЛЕННАЯ СТРОКА)
          balloon.classList.add(\`arrow-\${arrowPosition}\`);
        };
        
        // Функция для обновления всех позиций балунов
        const updateAllBalloonPositions = () => {
          if (activeBalloon && activeMarker) {
            updateBalloonPosition(activeMarker, activeBalloon);
          }
          competitorBalloons.forEach((balloonContainer, markerElement) => {
            updateBalloonPosition(markerElement, balloonContainer);
          });
        };

        // Функция для создания балуна конкурента
        const createCompetitorBalloon = (markerElement, compactContent, fullContent) => {
          const balloonContainer = document.createElement('div');
          balloonContainer.className = 'balloon-container';
          
          const balloon = document.createElement('div');
          balloon.className = 'balloon competitor-balloon compact';
          balloon.innerHTML = \`
            <div class="balloon-compact">
              \${compactContent}
              <button class="balloon-more" onclick="this.closest('.balloon').classList.remove('compact'); this.closest('.balloon').classList.add('expanded');">▼ Подробнее</button>
            </div>
            <div class="balloon-full">
              \${fullContent}
              <button class="balloon-more" onclick="this.closest('.balloon').classList.remove('expanded'); this.closest('.balloon').classList.add('compact');">▲ Свернуть</button>
            </div>
          \`;
          
          balloonContainer.appendChild(balloon);
          document.getElementById('map').appendChild(balloonContainer);
          
          competitorBalloons.set(markerElement, balloonContainer);
          updateBalloonPosition(markerElement, balloonContainer);
          
          return balloonContainer;
        };

        // Функция для создания маркера
        const createPinMarker = (coordinates, colorClass, title, isCompetitor = false, compactContent = '', fullContent = '') => {
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

          // Для конкурентов создаем автоматический балун
          if (isCompetitor) {
            setTimeout(() => {
              createCompetitorBalloon(markerElement, compactContent, fullContent);
            }, 100);
          } else {
            // Для контрагента добавляем обработчик клика
            markerElement.addEventListener('click', (event) => {
              event.stopPropagation();
              
              if (activeMarker === markerElement) {
                closeBalloon();
                return;
              }
              
              closeBalloon();
              
              const balloonContainer = document.createElement('div');
              balloonContainer.className = 'balloon-container';
              
              const balloonContent = \`
                <div class="balloon">
                  <h3>🎯 Новый клиент</h3>
                  <p><strong>Телефон:</strong> \${counterpartyData.phone}</p>
                  <p><strong>Менеджер:</strong> \${counterpartyData.manager}</p>
                  <p><strong>Адрес:</strong> \${counterpartyData.address}</p>
                  <br/>
                  <p><strong>Цена:</strong> \${counterpartyData.price}</p>
                </div>
              \`;
              
              balloonContainer.innerHTML = balloonContent;
              document.getElementById('map').appendChild(balloonContainer);
              
              competitorBalloons.set(markerElement, balloonContainer);
              updateBalloonPosition(markerElement, balloonContainer);
              
              activeBalloon = balloonContainer;
              activeMarker = markerElement;
            });
          }
          
          return marker;
        };

        const markers = [];

        // Добавляем контрагента - ПРИОРИТЕТНЫЙ МАРКЕР
        if (counterpartyData.latitude && counterpartyData.longitude) {
          const counterpartyMarker = createPinMarker(
            [counterpartyData.latitude, counterpartyData.longitude],
            'green',
            'Контрагент: Новый клиент',
            false
          );
          map.addChild(counterpartyMarker);
          markers.push([counterpartyData.latitude, counterpartyData.longitude]);
          
          // Автоматически открываем балун контрагента
          setTimeout(() => {
            if (counterpartyMarker && counterpartyMarker.element) {
              counterpartyMarker.element.click();
            }
          }, 1000);
        }

        // Добавляем конкурентов
        if (counterpartyData.competitors && counterpartyData.competitors.length > 0) {
          counterpartyData.competitors.forEach((competitor) => {
            if (competitor.latitude && competitor.longitude) {
              const competitorCompactContent = \`
                <p><strong> \${competitor.name}</strong></p>
                <p><strong>Тип:</strong> \${competitor.relationship_type}</p>
                <p><strong>Цена:</strong> \${competitor.price}</p>
                <p><strong>Оборот:</strong> \${competitor.revenue_last_3_months || '0'}р</p>
              \`;
              
              const competitorFullContent = \`
                <h3>⚡ Конкурент</h3>
                <p><strong>Название:</strong> \${competitor.name}</p>
                <p><strong>Тип:</strong> \${competitor.relationship_type}</p>
                <p><strong>Телефон:</strong> \${competitor.phone}</p>
                <p><strong>Менеджер:</strong> \${competitor.manager}</p>
                <p><strong>Адрес:</strong> \${competitor.address}</p>
                <br/>
                <p><strong>Цена:</strong> \${competitor.price}</p>
                <p><strong>Оборот за посл. 3 мес.:</strong> \${competitor.revenue_last_3_months || '0'}р</p>
                <p><strong>Последняя продажа:</strong> \${competitor.last_sale_date || "-"}</p>
              \`;
              
              const competitorMarker = createPinMarker(
                [competitor.latitude, competitor.longitude],
                'red',
                'Конкурент: ' + competitor.name,
                true,
                competitorCompactContent,
                competitorFullContent
              );
              map.addChild(competitorMarker);
              markers.push([competitor.latitude, competitor.longitude]);
            }
          });
        }

        // Закрываем балун при клике на карту
        document.getElementById('map').addEventListener('click', (e) => {
          if (!e.target.closest('.balloon') && !e.target.closest('.pin-marker')) {
            closeBalloon();
          }
        });

        // Обновляем позиции балунов
        setInterval(updateAllBalloonPositions, 100);

        // Автоматическое подстраивание границ только если есть несколько меток
        if (markers.length > 1) {
          const bounds = markers.reduce((acc, coord) => {
            return {
              north: Math.max(acc.north, coord[0]),
              south: Math.min(acc.south, coord[0]),
              east: Math.max(acc.east, coord[1]),
              west: Math.min(acc.west, coord[1])
            };
          }, {
            north: -90,
            south: 90,
            east: -180,
            west: 180
          });

          if (bounds.north !== -90 && bounds.south !== 90 && markers.length > 1) {
            const initialCenter = center;
            const counterpartyCoords = [counterpartyData.latitude, counterpartyData.longitude];
            
            // Подстраиваем границы только если центр не совпадает с координатами контрагента
            // или если у контрагента нет координат
            if (!counterpartyCoords[0] || !counterpartyCoords[1] || 
                Math.abs(initialCenter[0] - counterpartyCoords[0]) > 0.001 || 
                Math.abs(initialCenter[1] - counterpartyCoords[1]) > 0.001) {
              
              setTimeout(() => {
                map.setLocation({
                  bounds: [
                    [bounds.west - 0.01, bounds.south - 0.01],
                    [bounds.east + 0.01, bounds.north + 0.01]
                  ]
                });
              }, 1500);
            }
          }
        }
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
