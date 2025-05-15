// app.js

let tg = window.Telegram.WebApp;
tg.expand();

// 👇 ВАШ АКТУАЛЬНЫЙ URL ДЛЯ GOOGLE SCRIPT (убедитесь, что он правильный и развернут)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyJOoaLJEA8NykMEGmc8fJ45CuiGYeDAimSqddLUh2_GGUPod8otfrXK6t9XyffxZpmbg/exec";

const events = [
  {
    id: 1,
    title: "«Абай» операсы",
    place: "С.Сейфуллин атындағы қазақ драма театры",
    image: "https://raw.githubusercontent.com/Aibynz/Tiketon/refs/heads/main/image1.jpg"
  },
  {
    id: 2,
    title: "Ерлан Көкеев концерті",
    place: "Орталық концерт залы",
    image: "https://raw.githubusercontent.com/Aibynz/Tiketon/refs/heads/main/image2.jpg"
  },
  {
    id: 3,
    title: "«Қыз Жібек» спектаклі",
    place: "Жастар театры",
    image: "https://raw.githubusercontent.com/Aibynz/Tiketon/refs/heads/main/image3.jpg"
  }
];

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

let selectedEvent = null;
let selectedSeats = [];
let selectedDate = "";
let selectedTime = "16:00"; // Значение по умолчанию для времени
let bookedSeats = [];

const eventList = document.getElementById("eventList");
const bookingSection = document.getElementById("bookingSection");
const eventTitle = document.getElementById("eventTitle");
const seatTable = document.querySelector("#seatTable tbody");
const confirmBtn = document.getElementById("confirmBtn");
const dateSelect = document.getElementById("dateSelect");
const timeSelect = document.getElementById("timeSelect");
const customerNameInput = document.getElementById("customerName");
const customerPhoneInput = document.getElementById("customerPhone");

events.forEach(ev => {
  const card = document.createElement("div");
  card.className = "bg-white border border-gray-200 rounded-lg shadow hover:shadow-lg transition";
  card.innerHTML = `
    <div class="p-4">
      <h3 class="text-lg font-bold text-blue-800">${ev.title}</h3>
      <p class="text-sm text-gray-600">${ev.place}</p>
      <img src="${ev.image || 'https://via.placeholder.com/150'}" alt="${ev.title}" class="w-full h-auto object-cover rounded mb-3">
      <button class="mt-3 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        onclick="selectEvent(${ev.id})">
        Таңдау
      </button>
    </div>
  `;
  eventList.appendChild(card);
});

function selectEvent(id) {
  selectedEvent = events.find(e => e.id === id);
  selectedSeats = [];
  bookedSeats = [];
  eventTitle.textContent = selectedEvent.title + " | " + selectedEvent.place;
  bookingSection.classList.remove("hidden");

  dateSelect.innerHTML = "";
  dateList.forEach(dateStr => { // Изменено имя переменной для ясности
    const option = document.createElement("option");
    option.value = dateStr;
    // Форматируем дату для отображения
    const displayDate = new Date(dateStr).toLocaleDateString('kk-KZ', { day: 'numeric', month: 'long', year: 'numeric' });
    option.textContent = displayDate;
    dateSelect.appendChild(option);
  });
  selectedDate = dateList[0]; // Устанавливаем первую дату как выбранную по умолчанию
  dateSelect.value = selectedDate;

  // Устанавливаем время по умолчанию при выборе нового события
  selectedTime = timeSelect.options[0].value; // Берем первое значение из <select>
  timeSelect.value = selectedTime;

  fetchBookedSeats();
}

dateSelect.onchange = () => {
  selectedDate = dateSelect.value;
  selectedSeats = []; // Сбрасываем выбранные места при смене даты
  fetchBookedSeats();
};
timeSelect.onchange = () => {
  selectedTime = timeSelect.value;
  selectedSeats = []; // Сбрасываем выбранные места при смене времени
  fetchBookedSeats();
};

async function fetchBookedSeats() {
  if (!selectedEvent || !selectedDate || !selectedTime) {
    console.warn("fetchBookedSeats: Не выбрано событие, дата или время.");
    drawSeatMap(); // Отрисовать пустую или дефолтную карту
    return;
  }

  seatTable.innerHTML = '<tr><td colspan="11" class="p-4 text-center">Орындар жүктелуде...</td></tr>';
  
  const urlParams = new URLSearchParams({ // Используем URLSearchParams для корректного кодирования
      action: "getBookedSeats",
      title: selectedEvent.title,
      date: selectedDate,
      time: selectedTime
  });
  const requestUrl = `${GOOGLE_SCRIPT_URL}?${urlParams.toString()}`;
  
  console.log("ЗАПРОС К GOOGLE SCRIPT (fetchBookedSeats):", requestUrl); // <-- ЛОГИРОВАНИЕ URL

  try {
    const response = await fetch(requestUrl);
    const responseDataText = await response.text(); // Сначала получаем как текст для отладки
    console.log("Ответ от Google Script (текст):", responseDataText);

    if (!response.ok) {
        let errorData;
        try {
            errorData = JSON.parse(responseDataText);
        } catch (e) {
            errorData = { error: "Fetch error, could not parse JSON from error response", details: responseDataText };
        }
        console.error("Сервер қатесі (Google Script) при fetchBookedSeats:", response.status, errorData);
        alert(`Орындар туралы ақпарат алу кезінде қате: ${errorData.error || response.statusText}. Толығырақ консольда.`);
        bookedSeats = [];
    } else {
        try {
            const data = JSON.parse(responseDataText);
            console.log("Ответ от Google Script (JSON parsed):", data);
            if (data.success === false) { // Явная проверка на неуспех от скрипта
                 console.error("Google Script вернул success:false:", data.error, data.details);
                 alert(`Орындарды алу кезінде сервер қатесі: ${data.error || 'Белгісіз қате'}.`);
                 bookedSeats = [];
            } else {
                bookedSeats = data.booked || [];
            }
        } catch (e) {
            console.error("Ошибка парсинга JSON от Google Script:", e, "Полученный текст:", responseDataText);
            alert("Орындар туралы ақпарат алу кезінде жауап форматы қате.");
            bookedSeats = [];
        }
    }
  } catch (err) {
    console.error("Орындарды алу кезінде желі немесе басқа қате:", err);
    alert("Орындарды алу кезінде желі қатесі. Интернет байланысыңызды тексеріңіз.");
    bookedSeats = [];
  }
  drawSeatMap();
}


function drawSeatMap() {
  seatTable.innerHTML = "";
  for (let row = 1; row <= 10; row++) {
    const tr = document.createElement("tr");
    const rowLabel = document.createElement("td");
    rowLabel.textContent = `${row}-қатар`;
    rowLabel.className = "p-1 font-medium bg-gray-100 text-xs sm:text-sm text-center";
    tr.appendChild(rowLabel);

    for (let col = 1; col <= 10; col++) {
      const seatId = `${row}-қатар ${col}-орын`;
      const td = document.createElement("td");
      td.textContent = col;
      td.dataset.seatId = seatId;

      let baseClasses = "p-2 border text-xs sm:text-sm text-center ";

      if (bookedSeats.includes(seatId)) {
        td.className = baseClasses + "bg-red-300 text-gray-600 cursor-not-allowed";
        td.title = "Бұл орын бос емес";
      } else {
        td.className = baseClasses + "cursor-pointer bg-gray-50 hover:bg-green-300";
        td.onclick = () => toggleSeat(td, seatId);
        if (selectedSeats.includes(seatId)) { // Если место выбрано, выделяем его
          td.classList.remove("bg-gray-50", "hover:bg-green-300");
          td.classList.add("bg-green-500", "text-white");
        }
      }
      tr.appendChild(td);
    }
    seatTable.appendChild(tr);
  }
}

function toggleSeat(td, seatId) {
  const index = selectedSeats.indexOf(seatId);
  if (index > -1) {
    selectedSeats.splice(index, 1);
    td.classList.remove("bg-green-500", "text-white");
    td.classList.add("bg-gray-50", "hover:bg-green-300");
  } else {
    selectedSeats.push(seatId);
    td.classList.remove("bg-gray-50", "hover:bg-green-300");
    td.classList.add("bg-green-500", "text-white");
  }
  // console.log("Выбранные места:", selectedSeats); // Для отладки выбора мест
}

confirmBtn.onclick = async () => {
  const customerName = customerNameInput.value.trim();
  const customerPhone = customerPhoneInput.value.trim();

  if (!selectedEvent) {
    alert("Алдымен іс-шараны таңдаңыз.");
    return;
  }
  if (selectedSeats.length === 0) {
    alert("Кемінде бір орынды таңдаңыз.");
    return;
  }
  if (!customerName) {
    alert("Аты-жөніңізді енгізіңіз.");
    customerNameInput.focus();
    return;
  }
  if (!customerPhone) {
    alert("Телефон нөміріңізді енгізіңіз.");
    customerPhoneInput.focus();
    return;
  }

  confirmBtn.disabled = true;
  confirmBtn.textContent = "Тексеру...";

  try {
    const checkUrlParams = new URLSearchParams({ // Используем URLSearchParams
        action: "getBookedSeats",
        title: selectedEvent.title,
        date: selectedDate,
        time: selectedTime
    });
    const checkRequestUrl = `${GOOGLE_SCRIPT_URL}?${checkUrlParams.toString()}`;

    console.log("ЗАПРОС К GOOGLE SCRIPT (confirmBtn check):", checkRequestUrl); // <-- ЛОГИРОВАНИЕ URL

    const response = await fetch(checkRequestUrl);
    const responseDataText = await response.text(); // Сначала получаем как текст
    console.log("Ответ от Google Script при проверке (текст):", responseDataText);

    if (!response.ok) {
        let errorDataCheck;
        try { errorDataCheck = JSON.parse(responseDataText); }
        catch (e) { errorDataCheck = { error: "Fetch error during confirm, could not parse JSON", details: responseDataText }; }
        console.error("Сервер қатесі (Google Script) при проверке мест:", response.status, errorDataCheck);
        alert(`Орындарды тексеру кезінде қате: ${errorDataCheck.error || response.statusText}.`);
        confirmBtn.disabled = false;
        confirmBtn.textContent = "📩 Брондау";
        return;
    }
    
    let currentBookedSeats;
    try {
        const data = JSON.parse(responseDataText);
        if (data.success === false) {
            console.error("Google Script вернул success:false при проверке:", data.error, data.details);
            alert(`Орындарды тексеру кезінде сервер қатесі: ${data.error || 'Белгісіз қате'}.`);
            confirmBtn.disabled = false;
            confirmBtn.textContent = "📩 Брондау";
            return;
        }
        currentBookedSeats = data.booked || [];
    } catch (e) {
        console.error("Ошибка парсинга JSON от Google Script при проверке:", e, "Полученный текст:", responseDataText);
        alert("Орындарды тексеру кезінде жауап форматы қате.");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "📩 Брондау";
        return;
    }

    const newlyBookedByOthers = selectedSeats.filter(seat => currentBookedSeats.includes(seat));

    if (newlyBookedByOthers.length > 0) {
      // Сообщение, которое вы видите на скриншоте, формируется здесь
      alert(`Кешіріңіз, келесі орындар жаңа ғана брондалды: ${newlyBookedByOthers.join(', ')}. Тапсырыс жаңартылады, басқа орындарды таңдаңыз.`);
      bookedSeats = currentBookedSeats;
      selectedSeats = selectedSeats.filter(seat => !newlyBookedByOthers.includes(seat));
      drawSeatMap();
      confirmBtn.disabled = false;
      confirmBtn.textContent = "📩 Брондау";
      return;
    }

    const dataToSend = {
      event: {
          id: selectedEvent.id,
          title: selectedEvent.title,
          place: selectedEvent.place,
          image: selectedEvent.image
      },
      seats: selectedSeats,
      date: selectedDate,
      time: selectedTime,
      customerName: customerName,
      customerPhone: customerPhone
    };

    console.log("Отправка данных в Telegram:", JSON.stringify(dataToSend));
    tg.sendData(JSON.stringify(dataToSend));
    // tg.close(); // Можно закрыть WebApp после отправки, если нужно

  } catch (err) {
    console.error("Брондау кезінде қате (общий catch):", err);
    alert("Брондау кезінде қате орын алды. Интернет байланысыңызды тексеріп, қайталап көріңіз.");
    confirmBtn.disabled = false;
    confirmBtn.textContent = "📩 Брондау";
  }
};

// Вызываем selectEvent для первого события в списке, если он есть, чтобы инициализировать интерфейс
if (events.length > 0) {
  selectEvent(events[0].id);
}
