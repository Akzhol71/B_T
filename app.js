let tg = window.Telegram.WebApp;
tg.expand();

// 👇 ВСТАВЬ СЮДА свой actual Google Script URL:
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx0E40fC0rCsqa8mNo5TRLt15psJ1S9XB-9QeprHmtO0pmSVHqAFfSjnnvnFPQjPxZKzQ/exec"; // ЗАМЕНИТЕ НА ВАШ URL

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
let selectedTime = "16:00";
let bookedSeats = []; // Места, загруженные как занятые

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
  selectedSeats = []; // Сбрасываем выбранные места при смене события
  bookedSeats = []; // Сбрасываем ранее загруженные занятые места
  eventTitle.textContent = selectedEvent.title + " | " + selectedEvent.place;
  bookingSection.classList.remove("hidden");

  dateSelect.innerHTML = "";
  dateList.forEach(date => {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = new Date(date).toLocaleDateString('kk-KZ', { day: 'numeric', month: 'long', year: 'numeric' }); // Форматируем дату
    dateSelect.appendChild(option);
  });
  selectedDate = dateList[0];
  dateSelect.value = selectedDate; // Устанавливаем значение по умолчанию

  // Сбрасываем время на первое значение, если необходимо
  selectedTime = timeSelect.options[0].value;
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

async function fetchBookedSeats() { // Сделаем асинхронной
  if (!selectedEvent || !selectedDate || !selectedTime) return;

  // Показываем индикатор загрузки (опционально)
  seatTable.innerHTML = '<tr><td colspan="11" class="p-4 text-center">Орындар жүктелуде...</td></tr>';

  const url = `${GOOGLE_SCRIPT_URL}?action=getBookedSeats&title=${encodeURIComponent(selectedEvent.title)}&date=${selectedDate}&time=${selectedTime}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({error: "Fetch error, could not parse JSON"}));
        console.error("Сервер қатесі (Google Script):", response.status, errorData);
        alert(`Орындар туралы ақпарат алу кезінде қате: ${errorData.error || response.statusText}. Кейінірек қайталап көріңіз.`);
        bookedSeats = []; // В случае ошибки считаем, что нет занятых мест, или обрабатываем по-другому
    } else {
        const data = await response.json();
        bookedSeats = data.booked || [];
    }
  } catch (err) {
    console.error("Орындарды алу кезінде желі қатесі:", err);
    alert("Орындарды алу кезінде желі қатесі. Интернет байланысыңызды тексеріңіз.");
    bookedSeats = [];
  }
  drawSeatMap();
}


function drawSeatMap() {
  seatTable.innerHTML = ""; // Очищаем предыдущую карту
  for (let row = 1; row <= 10; row++) {
    const tr = document.createElement("tr");
    const rowLabel = document.createElement("td");
    rowLabel.textContent = `${row}-қатар`;
    rowLabel.className = "p-1 font-medium bg-gray-100 text-xs sm:text-sm"; // Адаптивный размер шрифта
    tr.appendChild(rowLabel);

    for (let col = 1; col <= 10; col++) {
      const seatId = `${row}-қатар ${col}-орын`;
      const td = document.createElement("td");
      td.textContent = col;
      td.dataset.seatId = seatId; // Сохраняем ID места в data-атрибуте

      let baseClasses = "p-2 border text-xs sm:text-sm text-center "; // Адаптивный размер шрифта

      if (bookedSeats.includes(seatId)) {
        td.className = baseClasses + "bg-red-300 text-gray-600 cursor-not-allowed";
        td.title = "Бұл орын бос емес";
      } else {
        td.className = baseClasses + "cursor-pointer bg-gray-50 hover:bg-green-300";
        td.onclick = () => toggleSeat(td, seatId);
        if (selectedSeats.includes(seatId)) {
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
  if (index > -1) { // Если место уже выбрано, отменяем выбор
    selectedSeats.splice(index, 1);
    td.classList.remove("bg-green-500", "text-white");
    td.classList.add("bg-gray-50", "hover:bg-green-300");
  } else { // Если место не выбрано, выбираем
    selectedSeats.push(seatId);
    td.classList.remove("bg-gray-50", "hover:bg-green-300");
    td.classList.add("bg-green-500", "text-white");
  }
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
  if (!customerPhone) { // Можно добавить более сложную валидацию номера
    alert("Телефон нөміріңізді енгізіңіз.");
    customerPhoneInput.focus();
    return;
  }

  confirmBtn.disabled = true;
  confirmBtn.textContent = "Тексеру...";

  try {
    // Повторная проверка занятых мест перед отправкой
    const checkUrl = `${GOOGLE_SCRIPT_URL}?action=getBookedSeats&title=${encodeURIComponent(selectedEvent.title)}&date=${selectedDate}&time=${selectedTime}`;
    const response = await fetch(checkUrl);
    if (!response.ok) throw new Error(`Сервер қатесі: ${response.status}`);
    const data = await response.json();
    const currentBookedSeats = data.booked || [];

    const newlyBookedByOthers = selectedSeats.filter(seat => currentBookedSeats.includes(seat));

    if (newlyBookedByOthers.length > 0) {
      alert(`Кешіріңіз, сіз таңдау жасап жатқанда келесі орындар брондалып кетті: ${newlyBookedByOthers.join(', ')}. \nБет жаңартылады, басқа орындарды таңдаңыз.`);
      bookedSeats = currentBookedSeats; // Обновляем глобальный список занятых мест
      selectedSeats = selectedSeats.filter(seat => !newlyBookedByOthers.includes(seat)); // Убираем занятые из выбранных
      drawSeatMap(); // Перерисовываем карту
      confirmBtn.disabled = false;
      confirmBtn.textContent = "📩 Брондау";
      return;
    }

    // Если все в порядке, отправляем данные в Telegram
    const dataToSend = {
      event: { // Отправляем только нужную информацию о событии
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
    tg.sendData(JSON.stringify(dataToSend));
    // Кнопка останется неактивной, т.к. ожидается закрытие WebApp или переход к оплате

  } catch (err) {
    console.error("Брондау кезінде қате:", err);
    alert("Брондау кезінде қате орын алды. Интернет байланысыңызды тексеріп, қайталап көріңіз.");
    confirmBtn.disabled = false;
    confirmBtn.textContent = "📩 Брондау";
  }
};

// Инициализация при загрузке (если нужно выбрать первое событие по умолчанию)
// if (events.length > 0) {
//   selectEvent(events[0].id);
// }
