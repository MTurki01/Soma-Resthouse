// ---- Firebase ----
const db = firebase.database();

// ---- الحجوزات ----
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
  bookingForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      name: custName.value,
      phone: custPhone.value,
      nights: nights.value,
      price: price.value
    };
    db.ref('bookings').push(data);
    bookingForm.reset();
  });

  db.ref('bookings').on('value', snap => {
    const list = document.getElementById('bookingsList');
    if (!list) return;
    list.innerHTML = '';
    snap.forEach(child => {
      const d = child.val();
      const li = document.createElement('li');
      li.textContent = `${d.name} - ${d.phone} - ${d.nights} ليالي - ${d.price} د.ل`;
      list.appendChild(li);
    });
  });
}

// ---- المهام ----
const taskForm = document.getElementById('taskForm');
if (taskForm) {
  taskForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = taskInput.value;
    db.ref('tasks').push({ text, done: false });
    taskForm.reset();
  });

  db.ref('tasks').on('value', snap => {
    const list = document.getElementById('tasksList');
    if (!list) return;
    list.innerHTML = '';
    snap.forEach(child => {
      const d = child.val();
      const li = document.createElement('li');
      li.textContent = d.text;
      if (d.done) li.style.textDecoration = 'line-through';
      li.onclick = () => db.ref('tasks/' + child.key).update({ done: !d.done });
      list.appendChild(li);
    });
  });
}

// ---- المدخول ----
const incomeForm = document.getElementById('incomeForm');
if (incomeForm) {
  incomeForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      name: incomeName.value,
      value: +incomeValue.value,
      date: incomeDate.value
    };
    db.ref('income').push(data);
    incomeForm.reset();
  });

  db.ref('income').on('value', snap => {
    const list = document.getElementById('incomeList');
    if (!list) return;
    list.innerHTML = '';
    snap.forEach(child => {
      const d = child.val();
      const li = document.createElement('li');
      li.textContent = `${d.name} - ${d.value} د.ل - ${d.date}`;
      list.appendChild(li);
    });
  });
}

// ---- الصرف ----
const expenseForm = document.getElementById('expenseForm');
if (expenseForm) {
  expenseForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      name: expenseName.value,
      value: +expenseValue.value,
      date: expenseDate.value
    };
    db.ref('expenses').push(data);
    expenseForm.reset();
  });

  db.ref('expenses').on('value', snap => {
    const list = document.getElementById('expenseList');
    if (!list) return;
    list.innerHTML = '';
    snap.forEach(child => {
      const d = child.val();
      const li = document.createElement('li');
      li.textContent = `${d.name} - ${d.value} د.ل - ${d.date}`;
      list.appendChild(li);
    });
  });

  const calcBtn = document.getElementById('calcTotal');
  if (calcBtn) {
    calcBtn.addEventListener('click', async () => {
      let totalIncome = 0, totalExpense = 0;
      const incomeSnap = await db.ref('income').once('value');
      incomeSnap.forEach(c => totalIncome += c.val().value);
      const expenseSnap = await db.ref('expenses').once('value');
      expenseSnap.forEach(c => totalExpense += c.val().value);
      document.getElementById('totalResult').textContent = `الإجمالي: ${totalIncome - totalExpense} د.ل`;
    });
  }
}
