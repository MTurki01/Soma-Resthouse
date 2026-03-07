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

// مراجع الجداول في قاعدة البيانات
const bookingsCollection = db.ref("bookings");
const financialsCollection = db.ref("financials");
const tasksCollection = db.ref("tasks");

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
    fetchFinancialsRealtime();
    fetchTasksRealtime();
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
            await bookingsCollection.push({
                clientName: clientName,
                date: startDate, // تاريخ البداية
                daysCount: days, // نحتاجها لطباعة الأيام المتتالية في التقويم
                dailyPrice: dailyPrice,
                price: totalPrice,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            bookingForm.reset();
            totalPriceDisplay.textContent = '0';
            closeBookingModal();
            showToast("تم بناء وتخزين الحجز بنجاح الخادم!", "success");
        } catch (error) {
            console.error("Firebase Error:", error);
            showToast(`فشل الحفظ: يرجى تفعيل صلاحيات القراءة والكتابة (Rules) في Firebase. رسالة الخطأ: ${error.message}`, "error");
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

    finForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const desc = document.getElementById('financialDesc').value;
        const amount = Number(document.getElementById('financialAmount').value);
        const type = finTypeInput.value;

        try {
            await financialsCollection.push({
                desc: desc,
                amount: amount,
                type: type,
                date: new Date().toISOString().split('T')[0],
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            showToast(`تم حفظ السجل (${type === 'income' ? 'إيراد' : 'مصروف'}): ${desc} بنجاح!`, "success");
            finForm.reset();
            closeFinModal();
        } catch (error) {
             console.error("Firebase Error:", error);
             showToast(`فشل إضافة السجل: ${error.message}`, "error");
        }
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

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('taskTitle').value;
        const desc = document.getElementById('taskDesc').value;

        try {
            await tasksCollection.push({
                title: title,
                desc: desc,
                status: 'pending',
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            showToast(`تم إضافة المهمة: ${title} للعمليات بنجاح.`, "success");
            taskForm.reset();
            closeTaskModal();
        } catch (error) {
             console.error("Firebase Error:", error);
             showToast(`فشل إضافة المهمة: ${error.message}`, "error");
        }
    });

    // ---- 4. Complete Task logic ----
    const operationsSection = document.getElementById('operations-section');
    if (operationsSection) {
        operationsSection.addEventListener('click', async (e) => {
            if (e.target.tagName.toLowerCase() === 'button' && e.target.textContent.trim() === 'إنجاز') {
                const taskCard = e.target.closest('.task-card');
                const taskId = taskCard.getAttribute('data-id');
                
                if (taskId) {
                    try {
                        await tasksCollection.child(taskId).update({ 
                            status: 'completed',
                            completedAt: firebase.database.ServerValue.TIMESTAMP 
                        });
                        showToast("تم تحديث حالة المهمة بنجاح!", "success");
                    } catch (error) {
                        showToast(`فشل تحديث المهمة: ${error.message}`, "error");
                    }
                } else {
                    // For hardcoded items without Firebase ID
                    showToast("تم الإنجاز محلياً (هذه المهمة غير محفوظة بقاعدة البيانات)", "success");
                    e.target.remove();
                }
            }
        });
    }
}

/**
 * دالة الاستماع لقاعدة البيانات فورياً (Realtime)
 */
function fetchBookingsRealtime() {
    // استعلام لجلب الحجوزات مرتبة حسب الإضافة
    // on("value") تُنفذ هذا الكود تلقائياً كلما تغيرت البيانات أو أُضيف حجز جديد
    bookingsCollection.orderByChild("timestamp").on("value", (snapshot) => {
        const bookingsList = [];
        let totalIncome = 0;

        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            bookingsList.push({ id: childSnapshot.key, ...data });
            totalIncome += (data.price || 0);
        });

        // تحديث المتغير العام
        globalBookings = bookingsList;

        // تحديث واجهات المستخدم بالبيانات الجديدة
        // الدخل سيتم حسابه بالكامل من دالة الجداول المالية بدقة أكبر
        updateDashboardStats(globalBookings.length, totalIncome);
        updateCalendar(new Date()); // إعادة رسم التقويم الحالي
        // updateCharts will be called from fetchFinancialsRealtime to combine both
    }, (error) => {
        console.warn("Realtime listener error:", error.message);
        console.log("تنبيه: الكود يعمل لكن حدث خطأ في ربط Firebase.");
        showToast("لا يمكن قراءة البيانات، يرجى الذهاب إلى Firebase وتفعيل خيار Security Rules (read, write = true)", "error");
        updateCalendar(new Date());
    });
}

function fetchFinancialsRealtime() {
    // We will listen to both financials and bookings.
    // Instead of using just financialsCollection, we'll combine data.
    db.ref().on("value", (snapshot) => {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        let totalExpense = 0;
        let totalIncome = 0;
        
        const allItems = [];

        // 1. Get Financials
        const financials = snapshot.child("financials");
        financials.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            allItems.push({
                id: childSnapshot.key,
                date: data.date || '',
                desc: data.desc,
                type: data.type, // 'income' | 'expense'
                amount: Number(data.amount) || 0,
                status: 'مكتمل',
                timestamp: data.timestamp || 0,
                isBooking: false
            });
            if (data.type === 'expense') totalExpense += (Number(data.amount) || 0);
            if (data.type === 'income') totalIncome += (Number(data.amount) || 0);
        });

        // 2. Get Bookings
        const bookings = snapshot.child("bookings");
        bookings.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            allItems.push({
                id: childSnapshot.key,
                date: data.date || '',
                desc: `حجز - ${data.clientName}`,
                type: 'booking',
                amount: Number(data.price) || 0,
                status: data.isPaid ? 'مدفوع (محصل)' : 'غير مدفوع',
                timestamp: data.timestamp || 0,
                isBooking: true,
                isPaid: !!data.isPaid
            });
            // إذا كان الحجز مدفوعاً، يُعتبر إيراداً
            if (data.isPaid) {
                totalIncome += (Number(data.price) || 0);
            }
        });

        // ترتيب حسب الأحدث
        allItems.sort((a, b) => b.timestamp - a.timestamp);

        allItems.forEach((item) => {
            const tr = document.createElement('tr');
            
            let badgeTypeClass = '';
            let badgeTypeText = '';
            let btnHtml = '';

            if (item.type === 'income') {
                badgeTypeClass = 'income';
                badgeTypeText = 'إيراد خارج الحجوزات';
            } else if (item.type === 'expense') {
                badgeTypeClass = 'expense';
                badgeTypeText = 'مصروف';
            } else if (item.type === 'booking') {
                badgeTypeClass = 'income'; // Bookings are income eventually
                badgeTypeText = 'حجز الاستراحة';
                if (!item.isPaid) {
                    btnHtml = `<button class="btn btn-sm btn-success mark-paid-btn" data-id="${item.id}" data-amount="${item.amount}">تأكيد الدفع (للإيرادات)</button>`;
                }
            }

            const statusClass = item.status === 'غير مدفوع' ? 'bg-warning' : 'status-paid';

            tr.innerHTML = `
                <td>${item.date || '---'}</td>
                <td>${item.desc}</td>
                <td><span class="badge ${badgeTypeClass}">${badgeTypeText}</span></td>
                <td>${item.amount.toLocaleString()} د.ل</td>
                <td>
                    <span class="badge ${statusClass}">${item.status}</span>
                    ${btnHtml}
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Update Totals on UI
        updateDashboardStats(globalBookings.length, totalIncome); // update the stats using accurate totalIncome

        const expenseEl = document.querySelector('.expense-icon');
        if (expenseEl && expenseEl.parentElement) {
            const expP = expenseEl.parentElement.querySelector('p');
            if (expP) expP.textContent = `${totalExpense.toLocaleString()} د.ل`;
        }

        const incomeEl = document.querySelector('.income-icon');
        if (incomeEl && incomeEl.parentElement) {
            const incP = incomeEl.parentElement.querySelector('p');
            if (incP) incP.textContent = `${totalIncome.toLocaleString()} د.ل`;
        }
        
        // Update charts with accurate combined income
        updateCharts(allItems);

        // Attach Event Listeners to "Mark Paid" buttons
        const paidBtns = tbody.querySelectorAll('.mark-paid-btn');
        paidBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const bookingId = e.target.getAttribute('data-id');
                if (bookingId) {
                    try {
                        await bookingsCollection.child(bookingId).update({ isPaid: true });
                        showToast("تم إضافة قيمة الحجز إلى الإيرادات بنجاح!", "success");
                    } catch (err) {
                        showToast(`فشل تأكيد الدفع: ${err.message}`, "error");
                    }
                }
            });
        });

    }, (error) => {
        console.warn("Combined listener error:", error.message);
    });
}

function fetchTasksRealtime() {
    tasksCollection.orderByChild("timestamp").on("value", (snapshot) => {
        const grid = document.querySelector('.tasks-grid');
        if (!grid) return;
        grid.innerHTML = '';

        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const taskId = childSnapshot.key;
            const isCompleted = data.status === 'completed';
            
            // Auto delete if completed and > 24 hours old
            if (isCompleted && data.completedAt) {
                const now = Date.now();
                const twentyFourHours = 24 * 60 * 60 * 1000;
                if (now - data.completedAt > twentyFourHours) {
                    tasksCollection.child(taskId).remove();
                    return; // skip rendering
                }
            }

            const div = document.createElement('div');
            div.className = 'task-card glass-panel';
            div.setAttribute('data-id', taskId);
            
            div.innerHTML = `
                <div class="task-header ${isCompleted ? 'border-success' : 'border-warning'}">
                    <h4>${data.title}</h4>
                    <span class="badge ${isCompleted ? 'bg-success' : 'bg-warning'}">${isCompleted ? 'مكتمل' : 'قيد التنفيذ'}</span>
                </div>
                <p>${data.desc || ''}</p>
                <div class="task-footer">
                    <span><i class="fa-regular fa-clock"></i> المهمة</span>
                    ${!isCompleted ? '<button class="btn btn-sm">إنجاز</button>' : ''}
                </div>
            `;
            grid.appendChild(div);
        });
    }, (error) => {
        console.warn("Tasks listener error:", error.message);
    });
}

/**
 * تحديث إحصائيات لوحة التحكم
 */
function updateDashboardStats(totalBookings, totalIncome) {
    const incomeEl = document.getElementById('totalIncomeDisplay');
    const bookingsEl = document.getElementById('totalBookingsDisplay');

    if (incomeEl) incomeEl.textContent = `${totalIncome.toLocaleString()} د.ل`;
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
                    label: 'الإيرادات (د.ل)',
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
function updateCharts(allItems) {
    if (chartInstances.revenue) {
        // تجميع الإيرادات بناء على الأشهر
        const monthlyIncome = {};
        const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

        allItems.forEach(item => {
            // Check if it's actual income (paid booking or income record)
            if (item.type === 'income' || (item.type === 'booking' && item.isPaid)) {
                let d = new Date(item.timestamp || Date.now());
                if (item.date) d = new Date(item.date); // Use the explicit date if available

                const monthKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
                if (!monthlyIncome[monthKey]) {
                    monthlyIncome[monthKey] = 0;
                }
                monthlyIncome[monthKey] += item.amount;
            }
        });

        // Convert grouped data to arrays for the chart
        // Sort months chronologically if needed, but since it's an object we take keys as they were inserted or sort them
        const labels = Object.keys(monthlyIncome).reverse(); // simple reverse to show oldest to newest roughly (depends on keys though)
        const data = labels.map(label => monthlyIncome[label]);

        chartInstances.revenue.data.labels = labels.length ? labels : ['لا يوجد إيرادات بعد'];
        chartInstances.revenue.data.datasets[0].data = data.length ? data : [0];
        chartInstances.revenue.update();
    }

    // تحديث مخطط الإشغال
    if (chartInstances.occupancy) {
        // حساب إشغال الشهر الحالي
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        let bookedDaysCurrentMonth = 0;

        globalBookings.forEach(booking => {
            if (booking.date && booking.daysCount) {
                let currentDateIter = new Date(booking.date);
                for (let j = 0; j < booking.daysCount; j++) {
                    if (currentDateIter.getMonth() === currentMonth && currentDateIter.getFullYear() === currentYear) {
                        bookedDaysCurrentMonth++;
                    }
                    currentDateIter.setDate(currentDateIter.getDate() + 1);
                }
            }
        });

        const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
        const availableDays = totalDays - bookedDaysCurrentMonth > 0 ? totalDays - bookedDaysCurrentMonth : 0;

        chartInstances.occupancy.data.datasets[0].data = [bookedDaysCurrentMonth, availableDays];
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
