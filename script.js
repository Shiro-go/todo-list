const STORAGE_KEY = 'todo_tasks';
const SORT_KEY = 'todo_sort';

const elements = {
  form: document.getElementById('taskForm'),
  title: document.getElementById('taskTitle'),
  description: document.getElementById('taskDescription'),
  state: document.getElementById('taskState'),
  taskList: document.getElementById('taskList'),
  filterNotDone: document.getElementById('filterNotDone'),
  filterInProgress: document.getElementById('filterInProgress'),
  filterFinished: document.getElementById('filterFinished'),
  totalCount: document.getElementById('totalCount'),
  visibleCount: document.getElementById('visibleCount'),
  doneCount: document.getElementById('doneCount'),
  clearFinishedBtn: document.getElementById('clearFinishedBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),
  sortButtons: Array.from(document.querySelectorAll('[data-sort]')),
};

const stateMeta = {
  not_done: { label: 'Not done', className: 'state-not_done', order: 0 },
  in_progress: { label: 'Currently doing', className: 'state-in_progress', order: 1 },
  finished: { label: 'Finished', className: 'state-finished', order: 2 },
};

let tasks = loadTasks();
let currentSort = localStorage.getItem(SORT_KEY) || 'created';

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function saveSort() {
  localStorage.setItem(SORT_KEY, currentSort);
}

function getFilters() {
  return {
    not_done: elements.filterNotDone.checked,
    in_progress: elements.filterInProgress.checked,
    finished: elements.filterFinished.checked,
  };
}

function sortTasks(taskArray) {
  const copy = [...taskArray];

  if (currentSort === 'title') {
    copy.sort((a, b) => a.title.localeCompare(b.title));
  } else if (currentSort === 'state') {
    copy.sort((a, b) => {
      const stateDiff = stateMeta[a.state].order - stateMeta[b.state].order;
      if (stateDiff !== 0) return stateDiff;
      return a.createdAt - b.createdAt;
    });
  } else {
    copy.sort((a, b) => a.createdAt - b.createdAt);
  }

  return copy;
}

function getVisibleTasks() {
  const filters = getFilters();
  return sortTasks(tasks).filter(task => filters[task.state]);
}

function updateStats(visibleTasks) {
  elements.totalCount.textContent = String(tasks.length);
  elements.visibleCount.textContent = String(visibleTasks.length);
  elements.doneCount.textContent = String(tasks.filter(task => task.state === 'finished').length);
}

function createTaskCard(task, visibleIndex) {
  const card = document.createElement('article');
  card.className = 'task-card';

  const meta = stateMeta[task.state];

  card.innerHTML = `
    <div class="task-index">${visibleIndex + 1}</div>

    <div class="task-main">
      <h3 class="task-title">${escapeHtml(task.title)}</h3>
      <p class="task-desc">${task.description ? escapeHtml(task.description) : 'No description.'}</p>
    </div>

    <div class="task-state-wrap">
      <select class="state-select ${meta.className}" aria-label="Task state">
        <option value="not_done" ${task.state === 'not_done' ? 'selected' : ''}>Not done</option>
        <option value="in_progress" ${task.state === 'in_progress' ? 'selected' : ''}>Currently doing</option>
        <option value="finished" ${task.state === 'finished' ? 'selected' : ''}>Finished</option>
      </select>
    </div>

    <div class="task-delete-wrap">
      <button class="delete-btn" type="button" aria-label="Delete task">✕</button>
    </div>
  `;

  const select = card.querySelector('select');
  const deleteBtn = card.querySelector('.delete-btn');

  select.addEventListener('change', (event) => {
    task.state = event.target.value;
    saveTasks();
    render();
  });

  deleteBtn.addEventListener('click', () => {
    tasks = tasks.filter(item => item.id !== task.id);
    saveTasks();
    render();
  });

  return card;
}

function render() {
  const visibleTasks = getVisibleTasks();
  elements.taskList.innerHTML = '';

  updateStats(visibleTasks);
  updateSortButtons();

  if (visibleTasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = tasks.length === 0
      ? '<strong>No tasks yet.</strong><br />Add your first one above.'
      : '<strong>No visible tasks.</strong><br />Your current filters hide everything.';
    elements.taskList.appendChild(empty);
    return;
  }

  visibleTasks.forEach((task, index) => {
    elements.taskList.appendChild(createTaskCard(task, index));
  });
}

function updateSortButtons() {
  elements.sortButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.sort === currentSort);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();

  const title = elements.title.value.trim();
  const description = elements.description.value.trim();
  const taskState = elements.state.value;

  if (!title) return;

  tasks.push({
    id: crypto.randomUUID(),
    title,
    description,
    state: taskState,
    createdAt: Date.now(),
  });

  saveTasks();
  elements.form.reset();
  elements.state.value = 'not_done';
  elements.title.focus();
  render();
});

[elements.filterNotDone, elements.filterInProgress, elements.filterFinished].forEach(checkbox => {
  checkbox.addEventListener('change', render);
});

elements.sortButtons.forEach(button => {
  button.addEventListener('click', () => {
    currentSort = button.dataset.sort;
    saveSort();
    render();
  });
});

elements.clearFinishedBtn.addEventListener('click', () => {
  tasks = tasks.filter(task => task.state !== 'finished');
  saveTasks();
  render();
});

elements.clearAllBtn.addEventListener('click', () => {
  if (tasks.length === 0) return;
  const confirmed = window.confirm('Delete every task?');
  if (!confirmed) return;
  tasks = [];
  saveTasks();
  render();
});

render();