// app.js - Версия с локальной отрисовкой мест и сбором данных клиента

let debugLogDiv = null;

function logDebug(message) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    if (debugLogDiv) {
        const p = document.createElement('p');
        p.textContent = logMessage;
        debugLogDiv.appendChild(p);
        debugLogDiv.scrollTop = debugLogDiv.scrollHeight;
    }
}

logDebug("app.js: Скрипт начал выполняться [LocalSeatsVersion_CustomerData]");

let tg = null;
try {
    tg = window.Telegram.WebApp;
    if (tg) {
      logDebug("Telegram WebApp API найден.");
      tg.expand();
      logDebug("tg.expand() успешно вызван.");
    } else {
      logDebug("ПРЕДУПРЕЖДЕНИЕ: Telegram WebApp API (window.Telegram.WebApp) НЕ НАЙДЕН!");
    }
} catch(e) {
    logDebug(`ОШИБКА при инициализации Telegram WebApp API: ${e.message}`);
}

const events = [
  { id: 1, title: "«Абай» операсы", place: "С.Сейфуллин атындағы қазақ драма театры", image: "https://raw.githubusercontent.com/Aibynz/Tiketon/refs/heads/main/image1.jpg" },
  { id: 2, title: "Ерлан Көкеев концерті", place: "Орталық концерт залы", image: "https://raw.githubusercontent.com/Aibynz/Tiketon/refs/heads/main/image2.jpg" },
  { id: 3, title: "«Қыз Жібек» спектаклі", place: "Жастар театры", image: "https://raw.githubusercontent.com/Aibynz/Tiketon/refs/heads/main/image3.jpg" }
];
logDebug(`Массив events определен, количество: ${events.length}`);

const dateList = (() => {
  const now = new Date();
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
})();
logDebug(`Массив dateList сгенерирован, количество: ${dateList.length}`);

let selectedEvent = null;
let selectedSeats = [];
let selectedDate = "";
let selectedTime = "16:00"; // Значение по умолчанию, которое есть в select

// DOM Элементы
let eventList, bookingSection, eventTitle, seatTableBody, seatTableHeaderRow, confirmBtn, dateSelect, timeSelect, backToEventsBtn, customerNameInput, customerPhoneInput;

function initializeDOMElements() {
    logDebug("initializeDOMElements: Начало инициализации DOM элементов.");
    eventList = document.getElementById("eventList");
    bookingSection = document.getElementById("bookingSection");
    eventTitle = document.getElementById("eventTitle");
    seatTableBody = document.querySelector("#seatTable tbody");
    seatTableHeaderRow = document.querySelector("#seatTable thead tr"); // Для заголовков мест
    confirmBtn = document.getElementById("confirmBtn");
    dateSelect = document.getElementById("dateSelect");
    timeSelect = document.getElementById("timeSelect");
    backToEventsBtn = document.getElementById("backToEventsBtn");
    customerNameInput = document.getElementById("customerName");
    customerPhoneInput = document.getElementById("customerPhone");

    if (!eventList) logDebug("ОШИБКА: eventList не найден!"); else logDebug("eventList найден.");
    if (!bookingSection) logDebug("ОШИБКА: bookingSection не найден!"); else logDebug("bookingSection найден.");
    if (!eventTitle) logDebug("ОШИБКА: eventTitle не найден!"); else logDebug("eventTitle найден.");
    if (!seatTableBody) logDebug("ОШИБКА: seatTable tbody не найден!"); else logDebug("seatTable tbody найден.");
    if (!seatTableHeaderRow) logDebug("ОШИБКА: seatTable thead tr не найден!"); else logDebug("seatTable thead tr найден.");
    if (!confirmBtn) logDebug("ОШИБКА: confirmBtn не найден!"); else logDebug("confirmBtn найден.");
    if (!dateSelect) logDebug("ОШИБКА: dateSelect не найден!"); else logDebug("dateSelect найден.");
    if (!timeSelect) logDebug("ОШИБКА: timeSelect не найден!"); else logDebug("timeSelect найден.");
    if (!backToEventsBtn) logDebug("ОШИБКА: backToEventsBtn не найден!"); else logDebug("backToEventsBtn найден.");
    if (!customerNameInput) logDebug("ОШИБКА: customerNameInput не найден!"); else logDebug("customerNameInput найден.");
    if (!customerPhoneInput) logDebug("ОШИБКА: customerPhoneInput не найден!"); else logDebug("customerPhoneInput найден.");
    logDebug("initializeDOMElements: Завершение инициализации DOM элементов.");
}

function setupEventHandlers() {
    logDebug("setupEventHandlers: Начало установки обработчиков событий.");
    if (dateSelect) {
        dateSelect.onchange = () => {
          selectedDate = dateSelect.value;
          logDebug(`dateSelect.onchange: Дата изменена на ${selectedDate}`);
          drawSeatMap();
        };
        logDebug("Обработчик dateSelect.onchange установлен.");
    }

    if (timeSelect) {
        timeSelect.onchange = () => {
          selectedTime = timeSelect.value;
          logDebug(`timeSelect.onchange: Время изменено на ${selectedTime}`);
          drawSeatMap();
        };
        logDebug("Обработчик timeSelect.onchange установлен.");
    }

    if (confirmBtn) {
        confirmBtn.onclick = () => {
          logDebug("confirmBtn.onclick: Нажата кнопка 'Брондау'");
          if (!selectedEvent || selectedSeats.length === 0) {
            alert("Кемінде бір орынды таңдаңыз (Выберите хотя бы одно место).");
            logDebug("confirmBtn.onclick: Предупреждение - не выбрано мероприятие или места.");
            return;
          }

          const customerName = customerNameInput ? customerNameInput.value.trim() : "";
          const customerPhone = customerPhoneInput ? customerPhoneInput.value.trim() : "";

          if (!customerName) {
              alert("Аты-жөніңізді енгізіңіз (Пожалуйста, введите ваше имя).");
              logDebug("confirmBtn.onclick: Предупреждение - имя клиента не заполнено.");
              if (customerNameInput) customerNameInput.focus();
              return;
          }
          // Простая проверка формата телефона (можно усложнить)
          if (!customerPhone || !/^\+?[0-9\s()-]{7,}$/.test(customerPhone)) { 
              alert("Телефон нөміріңізді дұрыс форматта енгізіңіз (Пожалуйста, введите ваш номер телефона в корректном формате).");
              logDebug("confirmBtn.onclick: Предупреждение - телефон клиента не заполнен или некорректен.");
              if (customerPhoneInput) customerPhoneInput.focus();
              return;
          }

          const data = {
            event: selectedEvent,
            seats: selectedSeats,
            date: selectedDate,
            time: selectedTime,
            customerName: customerName,
            customerPhone: customerPhone,
            userId: (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) ? tg.initDataUnsafe.user.id : 'unknown_user_webapp'
          };
          logDebug(`confirmBtn.onclick: Отправка данных в Telegram: ${JSON.stringify(data)}`);
          if (tg && tg.sendData) {
              try {
                  tg.sendData(JSON.stringify(data));
                  logDebug("confirmBtn.onclick: tg.sendData вызвана успешно.");
                  // Очищаем поля и сбрасываем выбор после успешной отправки
                  if (customerNameInput) customerNameInput.value = "";
                  if (customerPhoneInput) customerPhoneInput.value = "";
                  selectedSeats = [];
                  // Не нужно перерисовывать карту здесь, так как WebApp скорее всего закроется или перейдет на другой экран после sendData
                  // alert("Брондау туралы ақпарат жіберілді!"); // Это сообщение лучше показывать через бота
              } catch (e) {
                  logDebug(`ОШИБКА confirmBtn.onclick при вызове tg.sendData: ${e.message}`);
                  alert("Не удалось отправить данные. Ошибка API Telegram.");
              }
          } else {
              logDebug("ОШИБКА confirmBtn.onclick: tg.sendData не доступна!");
              alert("Не удалось отправить данные. Telegram API не доступно. (Для локальной проверки данные выведены в консоль)");
              console.log("Данные для отправки (локально):", data);
          }
        };
        logDebug("Обработчик confirmBtn.onclick установлен.");
    }

    if (backToEventsBtn) {
        backToEventsBtn.onclick = () => {
            logDebug("backToEventsBtn.onclick: Нажата кнопка 'Назад к мероприятиям'");
            if (bookingSection) bookingSection.classList.add("fully-hidden");
            if (eventList) eventList.classList.remove("fully-hidden");
            selectedEvent = null;
            selectedSeats = [];
            if (customerNameInput) customerNameInput.value = ""; // Очищаем поля при возврате
            if (customerPhoneInput) customerPhoneInput.value = "";
            logDebug("backToEventsBtn.onclick: Возврат к списку мероприятий, состояние сброшено.");
        };
        logDebug("Обработчик backToEventsBtn.onclick установлен.");
    }
    logDebug("setupEventHandlers: Завершение установки обработчиков событий.");
}

function displayEvents() {
    logDebug("displayEvents: Начало отображения мероприятий.");
    if (!eventList) {
        logDebug("ОШИБКА: displayEvents - eventList не инициализирован!");
        return;
    }
    eventList.innerHTML = "";
    events.forEach(ev => {
        const card = document.createElement("div");
        card.className = "bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300";
        card.innerHTML = `
          <img src="${ev.image || 'https://via.placeholder.com/400x200?text=No+Image'}" alt="${ev.title}" class="w-full h-48 object-cover rounded-t-lg">
          <div class="p-5">
            <h3 class="text-lg font-bold text-blue-800 mb-1">${ev.title}</h3>
            <p class="text-sm text-gray-600 mb-3">${ev.place}</p>
            <button class="event-select-btn mt-2 w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors" data-event-id="${ev.id}">
              Таңдау
            </button>
          </div>
        `;
        eventList.appendChild(card);
    });

    document.querySelectorAll('.event-select-btn').forEach(button => {
        button.addEventListener('click', function() {
            const eventId = parseInt(this.getAttribute('data-event-id'));
            logDebug(`Клик на кнопке 'Таңдау' для мероприятия ID: ${eventId}`);
            selectEvent(eventId);
        });
    });
    logDebug(`displayEvents: Мероприятия (${eventList.children.length} шт.) отображены.`);
}

function selectEvent(id) {
    logDebug(`selectEvent: Выбрано мероприятие ID: ${id}`);
    selectedEvent = events.find(e => e.id === id);
    if (!selectedEvent) {
        logDebug(`ОШИБКА selectEvent: Мероприятие с ID ${id} не найдено!`);
        alert(`Қате: ID ${id} бар іс-шара табылмады.`);
        return;
    }
    selectedSeats = []; 

    if (eventTitle) eventTitle.textContent = selectedEvent.title + " | " + selectedEvent.place;
    if (eventList) eventList.classList.add("fully-hidden");
    if (bookingSection) bookingSection.classList.remove("fully-hidden");

    if (dateSelect) {
        dateSelect.innerHTML = "";
        dateList.forEach(date => {
            const option = document.createElement("option");
            option.value = date;
            option.textContent = formatDateDisplay(date);
            dateSelect.appendChild(option);
        });
        if (dateList.length > 0) {
            selectedDate = dateList[0];
            dateSelect.value = selectedDate;
            logDebug(`selectEvent: Дата по умолчанию установлена на ${selectedDate}`);
        }
    }
  
    if (timeSelect) {
        selectedTime = timeSelect.value; // Устанавливаем из текущего значения селекта, т.к. пользователь мог его не менять
        logDebug(`selectEvent: Время установлено на ${selectedTime}`);
    }
  
    logDebug(`selectEvent: Перед drawSeatMap. Мероприятие: "${selectedEvent.title}", Дата: ${selectedDate}, Время: ${selectedTime}`);
    drawSeatMap();
}

function drawSeatMap() {
    logDebug(`drawSeatMap: Начало отрисовки. Выбранные места: ${JSON.stringify(selectedSeats)}`);
    if (!seatTableBody || !seatTableHeaderRow) {
        logDebug("ОШИБКА drawSeatMap: seatTableBody или seatTableHeaderRow не найден!");
        return;
    }
    seatTableBody.innerHTML = ""; 
    // Очищаем заголовки мест, кроме первого "Қатар"
    while (seatTableHeaderRow.children.length > 1) {
        seatTableHeaderRow.removeChild(seatTableHeaderRow.lastChild);
    }


    if (!selectedEvent) {
        const tr = seatTableBody.insertRow();
        const td = tr.insertCell();
        td.colSpan = 11; // Предполагаемое максимальное количество столбцов + 1
        td.className = "text-center p-4 text-gray-500";
        td.textContent = 'Алдымен іс-шараны таңдаңыз.';
        logDebug("drawSeatMap: Мероприятие не выбрано, карта не отрисована.");
        return;
    }
    
    const seatsPerRow = 10; // Количество мест в ряду
    const numRows = 10;    // Количество рядов

    // Добавляем заголовки для номеров мест
    for (let col = 1; col <= seatsPerRow; col++) {
        const th = document.createElement("th");
        th.className = "px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider";
        th.textContent = col;
        seatTableHeaderRow.appendChild(th);
    }


    for (let row = 1; row <= numRows; row++) {
        const tr = seatTableBody.insertRow();
        const rowLabel = tr.insertCell();
        rowLabel.textContent = `${row}-қатар`;
        rowLabel.className = "px-3 py-2 font-medium bg-gray-50 text-xs md:text-sm sticky left-0 z-10 whitespace-nowrap";
        
        for (let col = 1; col <= seatsPerRow; col++) {
            const seatId = `${row}-қатар ${col}-орын`;
            const td = tr.insertCell();
            td.textContent = col;

            const isSelected = selectedSeats.includes(seatId);

            td.className = "p-1 md:p-2 border text-center text-xs md:text-sm cursor-pointer transition-colors duration-150";

            if (isSelected) {
                td.classList.add("bg-green-500", "text-white", "hover:bg-green-600");
                td.title = "Таңдалған орын (Снять выбор)";
            } else {
                td.classList.add("bg-gray-100", "hover:bg-green-300");
                td.title = "Орынды таңдау";
            }
            td.onclick = () => toggleSeat(td, seatId);
        }
    }
    logDebug(`drawSeatMap: Карта мест отрисована для ${numRows} рядов по ${seatsPerRow} мест.`);
}

function toggleSeat(td, seatId) {
    logDebug(`toggleSeat: Клик по месту ${seatId}`);
    const index = selectedSeats.indexOf(seatId);
    if (index > -1) {
        selectedSeats.splice(index, 1);
        td.classList.remove("bg-green-500", "text-white", "hover:bg-green-600");
        td.classList.add("bg-gray-100", "hover:bg-green-300");
        td.title = "Орынды таңдау";
        logDebug(`Место ${seatId} отменено. Выбрано: ${selectedSeats.length}`);
    } else {
        selectedSeats.push(seatId);
        td.classList.remove("bg-gray-100", "hover:bg-green-300");
        td.classList.add("bg-green-500", "text-white", "hover:bg-green-600");
        td.title = "Таңдалған орын (Снять выбор)";
        logDebug(`Место ${seatId} выбрано. Выбрано: ${selectedSeats.length}`);
    }
    updateTelegramMainButtonState(); // Обновляем состояние кнопки Telegram
}

function formatDateDisplay(dateStringISO) {
    const date = new Date(dateStringISO);
    // Корректируем часовой пояс, чтобы дата отображалась как локальная, а не UTC
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const dateInLocal = new Date(date.getTime() + userTimezoneOffset); 
    return dateInLocal.toLocaleDateString('kk-KZ', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
}

function updateTelegramMainButtonState() {
    // Эта функция больше не управляет основной кнопкой Telegram,
    // так как мы используем стандартную кнопку в HTML.
    // Оставим ее для логов или если она понадобится для других целей.
    if (selectedEvent && selectedSeats.length > 0) {
        logDebug("Состояние для кнопки подтверждения: Активно (места выбраны).");
        if(confirmBtn) confirmBtn.disabled = false;
    } else {
        logDebug("Состояние для кнопки подтверждения: НЕ Активно (места не выбраны).");
        if(confirmBtn) confirmBtn.disabled = true;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    debugLogDiv = document.getElementById("debugLog");
    // Показываем блок логов, если есть параметр ?debug=true в URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true' && debugLogDiv) {
        debugLogDiv.classList.remove('fully-hidden');
        logDebug("Режим отладки активирован через URL параметр. Логи будут видны на странице.");
    } else if (debugLogDiv) {
        logDebug("DOMContentLoaded: debugLogDiv найден, но не показан (нет ?debug=true). Логи в консоли.");
    } else {
        console.log("ОШИБКА DOMContentLoaded: debugLogDiv НЕ НАЙДЕН! Логи будут только в консоли.");
    }

    logDebug("DOMContentLoaded: DOM полностью загружен и готов.");

    initializeDOMElements();
    setupEventHandlers();
    updateTelegramMainButtonState(); // Инициализируем состояние кнопки

    if (eventList) {
        displayEvents();
    } else {
        logDebug("ОШИБКА DOMContentLoaded: eventList не найден, displayEvents не будет вызвана!");
    }
  
    if (tg) {
        // Главную кнопку Telegram мы больше не используем, т.к. есть confirmBtn в HTML
        // tg.MainButton.hide(); 
        // logDebug("DOMContentLoaded: Главная кнопка Telegram СКРЫТА (если была).");
        tg.ready(); 
        logDebug("tg.ready() вызван.");
    } else {
        logDebug("ПРЕДУПРЕЖДЕНИЕ DOMContentLoaded: Telegram API (tg) не доступен.");
    }
    logDebug("DOMContentLoaded: Инициализация приложения завершена.");
});

logDebug("app.js: Скрипт завершил выполнение своего первичного (синхронного) кода.");
