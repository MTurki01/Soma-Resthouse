// ====== إعدادات قاعدة البيانات (Firebase Config) ======
const firebaseConfig = {
    apiKey: "AIzaSyDqlCpPHeNEvWgcChWR34Hp8tKBgIQ0xg0",
    authDomain: "soma-6bfb1.firebaseapp.com",
    databaseURL: "https://soma-6bfb1-default-rtdb.firebaseio.com",
    projectId: "soma-6bfb1",
    storageBucket: "soma-6bfb1.firebasestorage.app",
    messagingSenderId: "812268490400",
    appId: "1:812268490400:web:007ce6a3d8dcc9f2ffc3c5",
    measurementId: "G-3V2513E4ZP"
};

// تهيئة تطبيق Firebase وقاعدة البيانات (Compat Version)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const bookingsRef = db.ref("bookings");

// متغيرات عامة لحفظ البيانات الحية
let globalBookings = [];
let chartInstances = {}; // لحفظ مراجع الرسوم البيانية لتحديثها لاحقاً

document.addEventListener('DOMContentLoaded', () => {
    // 1. Navigation Logic (SPA Routing Effect)
    initNavigation();

    // 2. Modals Logic
    initModals();

    // 3. Initialize empty charts and calendar
    initCharts();

    // 4. Start Realtime Database Listener
    fetchBookingsRealtime();
});

/**
 * دالة التنقل بين القوائم
 */
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('page-title');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(item => item.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));
            link.classList.add('active');

            const targetId = link.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
            pageTitle.textContent = link.querySelector('span').textContent;
        });
    });
}

/**
 * نظام التنبيهات (Toast Notifications)
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // أيقونة حسب النوع
    const icon = type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';

    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    // إضافة تأثير الدخول
    setTimeout(() => toast.classList.add('show'), 100);

    // إخفاء وحذف بعد 3 ثواني
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * دالة التحكم في النوافذ المنبثقة (Modal) وحسابات النماذج
 */
function initModals() {
    // ---- 1. Booking Modal ----
    const bookingModal = document.getElementById('addBookingModal');
    const openBookingBtn = document.getElementById('openAddBookingModalBtn');
    const closeBookingBtn = document.getElementById('closeAddBookingModalBtn');
    const cancelBookingBtn = document.getElementById('cancelBookingBtn');
    const bookingForm = document.getElementById('addBookingForm');

    // عناصر الحساب
    const daysInput = document.getElementById('bookingDaysCount');
    const dailyPriceInput = document.getElementById('bookingDailyPrice');
    const totalPriceDisplay = document.getElementById('totalBookingPriceDisplay');

    // حساب مباشر للسعر
    const calculateTotal = () => {
        const days = Number(daysInput.value) || 0;
        const price = Number(dailyPriceInput.value) || 0;
        totalPriceDisplay.textContent = (days * price).toLocaleString();
    };
    daysInput.addEventListener('input', calculateTotal);
    dailyPriceInput.addEventListener('input', calculateTotal);

    const closeBookingModal = () => bookingModal.classList.remove('show');
    openBookingBtn.addEventListener('click', () => bookingModal.classList.add('show'));
    closeBookingBtn.addEventListener('click', closeBookingModal);
    cancelBookingBtn.addEventListener('click', closeBookingModal);

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const clientName = document.getElementById('clientName').value;
        const startDate = document.getElementById('bookingStartDate').value;
        const days = Number(daysInput.value);
        const dailyPrice = Number(dailyPriceInput.value);
        const totalPrice = days * dailyPrice;

        try {
          await bookingsRef.push({
    clientName: clientName,
    date: startDate,
    daysCount: days,
    dailyPrice: dailyPrice,
    price: totalPrice,
    timestamp: firebase.database.ServerValue.TIMESTAMP
});
            });
            bookingForm.reset();
            totalPriceDisplay.textContent = '0';
            closeBookingModal();
            showToast("تم بناء وتخزين الحجز بنجاح الخادم!", "success");
        } catch (error) {
            console.error("Error writing to Firestore:", error);
            showToast("فشل الاتصال بقاعدة البيانات. (تأكد من إعدادات المفاتيح أو جودة اتصالك).", "error");
        }
    });

    // ---- 2. Financial Modal ----
    const finModal = document.getElementById('addFinancialModal');
    const closeFinBtn = document.getElementById('closeFinancialModalBtn');
    const cancelFinBtn = document.getElementById('cancelFinancialBtn');
    const finForm = document.getElementById('addFinancialForm');
    const finTitle = document.getElementById('financialModalTitle');
    const finTypeInput = document.getElementById('financialType');

    // أزرار قسم المالية
    const addIncomeBtn = document.querySelector('.btn-success i.fa-plus').parentElement;
    const addExpenseBtn = document.querySelector('.btn-danger i.fa-minus').parentElement;

    const closeFinModal = () => finModal.classList.remove('show');
    closeFinBtn.addEventListener('click', closeFinModal);
    cancelFinBtn.addEventListener('click', closeFinModal);

    if (addIncomeBtn) {
        addIncomeBtn.addEventListener('click', () => {
            finTitle.textContent = "إضافة إيراد مالي";
            finTypeInput.value = "income";
            finModal.classList.add('show');
        });
    }

    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', () => {
            finTitle.textContent = "إضافة مصروف مالي";
            finTypeInput.value = "expense";
            finModal.classList.add('show');
        });
    }

    finForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const desc = document.getElementById('financialDesc').value;
        const amount = document.getElementById('financialAmount').value;
        const type = finTypeInput.value;

        showToast(`تم حفظ السجل (${type === 'income' ? 'إيراد' : 'مصروف'}): ${desc} بنجاح!`, "success");
        finForm.reset();
        closeFinModal();
    });

    // ---- 3. Task (Operations) Modal ----
    const taskModal = document.getElementById('addTaskModal');
    const closeTaskBtn = document.getElementById('closeTaskModalBtn');
    const cancelTaskBtn = document.getElementById('cancelTaskBtn');
    const taskForm = document.getElementById('addTaskForm');

    // زر مهمة جديدة
    const addTaskBtn = document.querySelector('#operations-section .btn-primary');

    const closeTaskModal = () => taskModal.classList.remove('show');
    closeTaskBtn.addEventListener('click', closeTaskModal);
    cancelTaskBtn.addEventListener('click', closeTaskModal);

    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => taskModal.classList.add('show'));
    }

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('taskTitle').value;

        showToast(`تم إضافة المهمة: ${title} للعمليات بنجاح.`, "success");
        taskForm.reset();
        closeTaskModal();
    });

    // ---- 4. Complete Task logic ----
    const operationsSection = document.getElementById('operations-section');
    if (operationsSection) {
        operationsSection.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() === 'button' && e.target.textContent.trim() === 'إنجاز') {
                const taskCard = e.target.closest('.task-card');
                const badge = taskCard.querySelector('.task-header .badge');

                badge.className = 'badge bg-success';
                badge.textContent = 'مكتمل';

                taskCard.querySelector('.task-header').className = 'task-header border-success';
                e.target.remove();

                showToast("تم تحديث حالة المهمة بنجاح!", "success");
            }
        });
    }
}

/**
 * دالة الاستماع لقاعدة البيانات فورياً (Realtime)
 */
function fetchBookingsRealtime() {
    // استعلام لجلب الحجوزات مرتبة حسب الإضافة
    // onSnapshot تُنفذ هذا الكود تلقائياً كلما تغيرت البيانات أو أُضيف حجز جديد
 bookingsRef.orderByChild("timestamp").on("value", (snapshot) => {
    const bookingsList = [];
    let totalIncome = 0;

    snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        bookingsList.push({ id: childSnapshot.key, ...data });
        totalIncome += (data.price || 0);
    });

    globalBookings = bookingsList;

    updateDashboardStats(globalBookings.length, totalIncome);
    updateCalendar(new Date());
    updateCharts(globalBookings);
});

        // تحديث المتغير العام
        globalBookings = bookingsList;

        // تحديث واجهات المستخدم بالبيانات الجديدة
        updateDashboardStats(globalBookings.length, totalIncome);
        updateCalendar(new Date()); // إعادة رسم التقويم الحالي
        updateCharts(globalBookings);
    }, (error) => {
        console.warn("Realtime listener error:", error.message);
        console.log("تنبيه: الكود يعمل لكن حدث خطأ في ربط Firebase.");
        updateCalendar(new Date());
    });
}

/**
 * تحديث إحصائيات لوحة التحكم
 */
function updateDashboardStats(totalBookings, totalIncome) {
    const incomeEl = document.getElementById('totalIncomeDisplay');
    const bookingsEl = document.getElementById('totalBookingsDisplay');

    if (incomeEl) incomeEl.textContent = `${totalIncome.toLocaleString()} ر.س`;
    if (bookingsEl) bookingsEl.textContent = `${totalBookings} حجز`;
}

/**
 * تهيئة الرسوم البيانية فارغة لأول مرة
 */
function initCharts() {
    Chart.defaults.font.family = "'Cairo', sans-serif";
    Chart.defaults.color = '#6b7280';

    const ctxRev = document.getElementById('revenueChart');
    if (ctxRev) {
        chartInstances.revenue = new Chart(ctxRev, {
            type: 'bar',
            data: {
                labels: ['الحجوزات'],
                datasets: [{
                    label: 'الإيرادات (ر.س)',
                    data: [0],
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    const ctxOcc = document.getElementById('occupancyChart');
    if (ctxOcc) {
        chartInstances.occupancy = new Chart(ctxOcc, {
            type: 'doughnut',
            data: {
                labels: ['أيام محجوزة', 'أيام متاحة'],
                datasets: [{
                    data: [0, 30],
                    backgroundColor: ['rgba(239, 68, 68, 0.8)', 'rgba(16, 185, 129, 0.6)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
            }
        });
    }
}

/**
 * تحديث الرسوم البيانية بناءً على البيانات החية
 */
function updateCharts(bookings) {
    // تحديث مخطط الإيرادات
    if (chartInstances.revenue) {
        // تجميع الإيرادات بناء على اسم العميل (أو يمكن تجميعها بالتواريخ)
        const labels = bookings.map(b => b.clientName || 'عميل');
        const data = bookings.map(b => b.price || 0);

        chartInstances.revenue.data.labels = labels.length ? labels : ['لا يوجد'];
        chartInstances.revenue.data.datasets[0].data = data.length ? data : [0];
        chartInstances.revenue.update();
    }

    // تحديث مخطط الإشغال
    if (chartInstances.occupancy) {
        const bookedDays = bookings.length;
        const totalDays = 30; // افتراض 30 يوم للشهر
        const availableDays = totalDays - bookedDays > 0 ? totalDays - bookedDays : 0;

        chartInstances.occupancy.data.datasets[0].data = [bookedDays, availableDays];
        chartInstances.occupancy.update();
    }
}

// ------ متغير التقويم المعروض حالياً ------
let currentCalendarDate = new Date();

/**
 * دالة تحديث ورسم التقويم (مع دعم الأيام المتعددة للحجز الواحد)
 */
function updateCalendar(baseDate) {
    const calendarGrid = document.getElementById('calendarGrid');
    const monthYearText = document.getElementById('monthYear');
    if (!calendarGrid || !monthYearText) return;

    // تهيئة عنوان الأيام لأول مرة إذا لم يكن موجوداً
    if (!calendarGrid.querySelector('.calendar-day-header')) {
        const daysOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        daysOfWeek.forEach(day => {
            const div = document.createElement('div');
            div.className = 'calendar-day-header';
            div.textContent = day;
            calendarGrid.appendChild(div);
        });
    }

    const dayElements = calendarGrid.querySelectorAll('.calendar-day');
    dayElements.forEach(el => el.remove());

    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();

    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    monthYearText.textContent = `${monthNames[month]} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // فجوات بداية الشهر
    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDiv);
    }

    // تجميع كل الأيام المحجوزة من كل الحجوزات الموجودة
    // هذه المصفوفة ستحتوي على كائنات { year, month, date, clientName }
    const allBookedDays = [];

    globalBookings.forEach(booking => {
        if (!booking.date || !booking.daysCount) return;

        let currentDateIter = new Date(booking.date);

        // استخرج اليوم والشهر والسنة لكل يوم في فترة الحجز
        for (let j = 0; j < booking.daysCount; j++) {
            allBookedDays.push({
                year: currentDateIter.getFullYear(),
                month: currentDateIter.getMonth(),
                date: currentDateIter.getDate(),
                clientName: booking.clientName || 'عميل'
            });
            // إضافة يوم واحد
            currentDateIter.setDate(currentDateIter.getDate() + 1);
        }
    });

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';

        // هل هذا اليوم يقع في الشهر والسنة المعروضة ومحجوز؟
        const bookingForDay = allBookedDays.find(b => b.year === year && b.month === month && b.date === i);

        if (bookingForDay) {
            dayDiv.classList.add('booked');
            dayDiv.innerHTML = `
                <span class="day-num">${i}</span>
                <span class="day-status">محجوز</span>
                <span class="day-client">${bookingForDay.clientName}</span>
            `;
        } else {
            dayDiv.innerHTML = `<span class="day-num">${i}</span>`;
        }

        calendarGrid.appendChild(dayDiv);
    }
}

// أزرار تقليب التقويم
document.getElementById('prevMonth')?.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    updateCalendar(currentCalendarDate);
});
document.getElementById('nextMonth')?.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    updateCalendar(currentCalendarDate);
});
