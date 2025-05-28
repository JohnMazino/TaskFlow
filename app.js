import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Firebase конфигурация
const firebaseConfig = {
  apiKey: "AIzaSyDx9dHwNFuPMGSLFDJHgaH1vfE679ZPVD4",
  authDomain: "miro-7014e.firebaseapp.com",
  projectId: "miro-7014e",
  storageBucket: "miro-7014e.firebasestorage.app",
  messagingSenderId: "484715250794",
  appId: "1:484715250794:web:51dac4a0311942176e3613",
  measurementId: "G-GHCKM1FMLP"
};
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Основное приложение
class TaskFlowApp {
  constructor() {
    this.app = document.getElementById('app');
    this.user = null;
    this.boardId = null;
    this.boardData = null;
    this.initAuthListener();
    this.render();
  }

  // Слушатель состояния аутентификации
  initAuthListener() {
    onAuthStateChanged(auth, (user) => {
      this.user = user;
      this.render();
    });
  }

  // Рендеринг текущего состояния
  render() {
    if (!this.user) {
      this.renderAuth();
    } else if (!this.boardId) {
      this.renderHome();
    } else {
      this.renderBoard();
    }
  }

  // Экран аутентификации
  renderAuth() {
    this.app.innerHTML = `
      <div class="container">
        <div class="auth-box">
          <h2 class="text-3xl font-bold mb-6 text-center text-gray-800">TaskFlow</h2>
          <div id="error" class="alert hidden"></div>
          <input id="email" type="email" placeholder="Email" class="w-full">
          <input id="password" type="password" placeholder="Пароль" class="w-full">
          <div class="flex justify-between mb-4 gap-2">
            <button id="signUp" class="bg-blue-500 hover:bg-blue-600">Регистрация</button>
            <button id="signIn" class="bg-green-500 hover:bg-green-600">Вход</button>
          </div>
          <button id="googleSignIn" class="bg-gray-100 text-gray-800 border hover:bg-gray-200">Войти через Google</button>
        </div>
      </div>
    `;

    document.getElementById('signUp').addEventListener('click', () => this.handleSignUp());
    document.getElementById('signIn').addEventListener('click', () => this.handleSignIn());
    document.getElementById('googleSignIn').addEventListener('click', () => this.handleGoogleSignIn());
  }

  async handleSignUp() {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    if (!email || !password) {
      this.showError('Введите email и пароль');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      this.showNotification('Успешная регистрация!');
    } catch (err) {
      this.showError(err.message);
    }
  }

  async handleSignIn() {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    if (!email || !password) {
      this.showError('Введите email и пароль');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      this.showNotification('Успешный вход!');
    } catch (err) {
      this.showError(err.message);
    }
  }

  async handleGoogleSignIn() {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      this.showNotification('Успешный вход через Google!');
    } catch (err) {
      this.showError(err.message);
    }
  }

  async handleSignOut() {
    try {
      await signOut(auth);
      this.showNotification('Вы вышли из аккаунта');
    } catch (err) {
      this.showError(err.message);
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
      setTimeout(() => errorDiv.classList.add('hidden'), 3000);
    } else {
      Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#b91c1c" }
      }).showToast();
    }
  }

  showNotification(message) {
    Toastify({
      text: message,
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: "#22c55e" }
    }).showToast();
  }

  // Экран выбора доски
  renderHome() {
    this.app.innerHTML = `
      <div class="container">
        <div class="home-box">
          <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Добро пожаловать, ${this.user.email}</h2>
          <button id="createBoard" class="bg-blue-500 hover:bg-blue-600 w-full mb-4">Создать новую доску</button>
          <input id="inviteLink" type="text" placeholder="Вставьте ссылку на доску" class="w-full">
          <button id="joinBoard" class="bg-green-500 hover:bg-green-600 w-full">Присоединиться к доске</button>
        </div>
      </div>
    `;

    document.getElementById('createBoard').addEventListener('click', () => this.createBoard());
    document.getElementById('joinBoard').addEventListener('click', () => this.joinBoard());
  }

  async createBoard() {
    try {
      const boardRef = doc(collection(db, 'boards'));
      await setDoc(boardRef, {
        admin: this.user.uid,
        createdAt: serverTimestamp(),
        roles: { [this.user.uid]: { name: 'Admin', color: '#FF0000', description: 'Администратор доски' } },
        tasks: {}
      });
      this.boardId = boardRef.id;
      this.showNotification('Доска создана!');
      this.render();
    } catch (err) {
      this.showError('Ошибка при создании доски: ' + err.message);
    }
  }

  async joinBoard() {
    const inviteLink = document.getElementById('inviteLink')?.value;
    if (!inviteLink) {
      this.showError('Введите ссылку на доску!');
      return;
    }
    const boardId = inviteLink.split('/').pop();
    try {
      const boardDoc = await getDoc(doc(db, 'boards', boardId));
      if (boardDoc.exists()) {
        this.boardId = boardId;
        this.showNotification('Вы присоединились к доске!');
        this.render();
      } else {
        this.showError('Недействительная ссылка!');
      }
    } catch (err) {
      this.showError('Ошибка при присоединении: ' + err.message);
    }
  }

  // Экран доски
  renderBoard() {
    this.app.innerHTML = `
      <div class="board">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-4xl font-bold text-gray-800">Доска задач</h1>
          <button id="signOut" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">Выйти</button>
        </div>
        <p class="mb-6 text-gray-600">Ссылка на доску: <a href="${window.location.origin}/board/${this.boardId}" class="text-blue-500 hover:underline">${window.location.origin}/board/${this.boardId}</a></p>
        <div id="adminControls" class="mb-8"></div>
        <div class="mb-8 bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-xl font-bold mb-4 text-gray-800">Добавить задачу</h2>
          <input id="taskTitle" type="text" placeholder="Название задачи" class="mr-2">
          <input id="taskDesc" type="text" placeholder="Описание задачи" class="mr-2">
          <select id="taskStatus" class="mr-2">
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
          <button id="addTask" class="bg-green-500 hover:bg-green-600">Добавить задачу</button>
        </div>
        <button id="exportBoard" class="bg-gray-500 hover:bg-gray-600 mb-6">Экспортировать доску</button>
        <div class="board-grid">
          <div class="status-column">
            <h2 class="text-xl font-bold mb-4 text-gray-800">To Do</h2>
            <div id="todoBoard" class="droppable"></div>
          </div>
          <div class="status-column">
            <h2 class="text-xl font-bold mb-4 text-gray-800">In Progress</h2>
            <div id="inProgressBoard" class="droppable"></div>
          </div>
          <div class="status-column">
            <h2 class="text-xl font-bold mb-4 text-gray-800">Done</h2>
            <div id="doneBoard" class="droppable"></div>
          </div>
        </div>
        <div id="modal" class="modal hidden"></div>
      </div>
    `;

    this.initBoardListener();
    document.getElementById('addTask').addEventListener('click', () => this.addTask());
    document.getElementById('exportBoard').addEventListener('click', () => this.exportBoard());
    document.getElementById('signOut').addEventListener('click', () => this.handleSignOut());
    this.renderAdminControls();
    this.initDragAndDrop();
  }

  // Слушатель данных доски
  initBoardListener() {
    onSnapshot(doc(db, 'boards', this.boardId), (doc) => {
      this.boardData = doc.data();
      this.renderTasks();
      this.renderAdminControls();
    }, (err) => {
      this.showError('Ошибка загрузки доски: ' + err.message);
    });
  }

  // Админские элементы управления
  renderAdminControls() {
    if (this.boardData?.admin === this.user.uid) {
      document.getElementById('adminControls').innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-xl font-bold mb-4 text-gray-800">Добавить роль</h2>
          <input id="roleName" type="text" placeholder="Название роли" class="mr-2">
          <input id="roleColor" type="color" value="#000000" class="mr-2 p-1">
          <input id="roleDesc" type="text" placeholder="Описание роли" class="mr-2">
          <button id="addRole" class="bg-blue-500 hover:bg-blue-600">Добавить роль</button>
        </div>
      `;
      document.getElementById('addRole').addEventListener('click', () => this.addRole());
    } else {
      document.getElementById('adminControls').innerHTML = '';
    }
  }

  async addRole() {
    const roleName = document.getElementById('roleName')?.value;
    const roleColor = document.getElementById('roleColor')?.value;
    const roleDesc = document.getElementById('roleDesc')?.value;
    if (!roleName || !roleDesc) {
      this.showError('Введите название и описание роли');
      return;
    }
    try {
      await updateDoc(doc(db, 'boards', this.boardId), {
        [`roles.${this.user.uid}`]: { name: roleName, color: roleColor, description: roleDesc }
      });
      document.getElementById('roleName').value = '';
      document.getElementById('roleDesc').value = '';
      this.showNotification('Роль добавлена!');
    } catch (err) {
      this.showError('Ошибка добавления роли: ' + err.message);
    }
  }

  async addTask() {
    const title = document.getElementById('taskTitle')?.value;
    const description = document.getElementById('taskDesc')?.value;
    const status = document.getElementById('taskStatus')?.value;
    if (!title || !description || !status) {
      this.showError('Заполните все поля задачи');
      return;
    }
    try {
      const taskId = Date.now().toString();
      await updateDoc(doc(db, 'boards', this.boardId), {
        [`tasks.${taskId}`]: {
          title,
          description,
          status,
          createdBy: this.boardData.admin === this.user.uid ? 'admin' : 'user',
          assignedTo: this.user.uid,
          createdAt: serverTimestamp()
        }
      });
      document.getElementById('taskTitle').value = '';
      document.getElementById('taskDesc').value = '';
      this.showNotification('Задача добавлена!');
    } catch (err) {
      this.showError('Ошибка добавления задачи: ' + err.message);
    }
  }

  // Рендеринг задач
  renderTasks() {
    const todoBoard = document.getElementById('todoBoard');
    const inProgressBoard = document.getElementById('inProgressBoard');
    const doneBoard = document.getElementById('doneBoard');
    todoBoard.innerHTML = '';
    inProgressBoard.innerHTML = '';
    doneBoard.innerHTML = '';

    if (this.boardData?.tasks) {
      Object.entries(this.boardData.tasks).forEach(([id, task]) => {
        const taskEl = document.createElement('div');
        taskEl.className = 'task-card';
        taskEl.dataset.id = id;
        taskEl.style.borderLeft = `4px solid ${this.boardData.roles[task.assignedTo]?.color || '#000000'}`;
        taskEl.innerHTML = `
          <h3 class="font-bold text-gray-800">${task.title}</h3>
          <p class="text-gray-600">${task.description}</p>
          <p class="text-sm text-gray-500">Создано: ${task.createdBy === 'admin' ? 'Админ' : 'Вы'}</p>
          <p class="text-sm text-gray-500">Статус: ${task.status}</p>
          <button class="edit-task bg-blue-500 hover:bg-blue-600 text-white text-sm px-2 py-1 rounded mt-2" data-id="${id}">Редактировать</button>
        `;
        if (task.status === 'To Do') {
          todoBoard.appendChild(taskEl);
        } else if (task.status === 'In Progress') {
          inProgressBoard.appendChild(taskEl);
        } else if (task.status === 'Done') {
          doneBoard.appendChild(taskEl);
        }

        taskEl.querySelector('.edit-task').addEventListener('click', () => this.openEditModal(id, task));
      });
    }
  }

  // Открытие модального окна для редактирования
  openEditModal(taskId, task) {
    const modal = document.getElementById('modal');
    modal.innerHTML = `
      <div class="modal-content">
        <h2 class="text-xl font-bold mb-4 text-gray-800">Редактировать задачу</h2>
        <input id="editTitle" type="text" value="${task.title}" placeholder="Название задачи" class="mr-2">
        <input id="editDesc" type="text" value="${task.description}" placeholder="Описание задачи" class="mr-2">
        <select id="editStatus" class="mr-2">
          <option value="To Do" ${task.status === 'To Do' ? 'selected' : ''}>To Do</option>
          <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Done" ${task.status === 'Done' ? 'selected' : ''}>Done</option>
        </select>
        <div class="flex justify-end gap-2">
          <button id="saveTask" class="bg-green-500 hover:bg-green-600">Сохранить</button>
          <button id="cancelEdit" class="bg-gray-500 hover:bg-gray-600">Отмена</button>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');

    document.getElementById('saveTask').addEventListener('click', () => this.saveTask(taskId));
    document.getElementById('cancelEdit').addEventListener('click', () => modal.classList.add('hidden'));
  }

  async saveTask(taskId) {
    const title = document.getElementById('editTitle')?.value;
    const description = document.getElementById('editDesc')?.value;
    const status = document.getElementById('editStatus')?.value;
    if (!title || !description || !status) {
      this.showError('Заполните все поля задачи');
      return;
    }
    try {
      await updateDoc(doc(db, 'boards', this.boardId), {
        [`tasks.${taskId}`]: {
          title,
          description,
          status,
          createdBy: this.boardData.tasks[taskId].createdBy,
          assignedTo: this.user.uid,
          createdAt: this.boardData.tasks[taskId].createdAt
        }
      });
      document.getElementById('modal').classList.add('hidden');
      this.showNotification('Задача обновлена!');
    } catch (err) {
      this.showError('Ошибка обновления задачи: ' + err.message);
    }
  }

  // Инициализация drag-and-drop с SortableJS
  initDragAndDrop() {
    const droppables = document.querySelectorAll('.droppable');
    droppables.forEach((droppable) => {
      new Sortable(droppable, {
        group: 'tasks',
        animation: 150,
        onStart: (evt) => {
          evt.item.classList.add('dragging');
        },
        onEnd: async (evt) => {
          evt.item.classList.remove('dragging');
          const taskId = evt.item.dataset.id;
          const newStatus = evt.to.id === 'todoBoard' ? 'To Do' :
                           evt.to.id === 'inProgressBoard' ? 'In Progress' : 'Done';
          try {
            await updateDoc(doc(db, 'boards', this.boardId), {
              [`tasks.${taskId}.status`]: newStatus
            });
            this.showNotification('Статус задачи обновлён!');
          } catch (err) {
            this.showError('Ошибка обновления статуса: ' + err.message);
          }
        }
      });
    });
  }

  // Экспорт доски в JSON
  exportBoard() {
    if (!this.boardData) {
      this.showError('Нет данных для экспорта');
      return;
    }
    const data = JSON.stringify(this.boardData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `board_${this.boardId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showNotification('Доска экспортирована!');
  }
}

// Запуск приложения
const taskFlowApp = new TaskFlowApp();