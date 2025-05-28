import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
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
          <h2 class="text-2xl font-bold mb-4 text-center">TaskFlow</h2>
          <div id="error" class="alert hidden"></div>
          <input id="email" type="email" placeholder="Email" class="w-full">
          <input id="password" type="password" placeholder="Пароль" class="w-full">
          <div class="flex justify-between mb-4">
            <button id="signUp" class="bg-blue-500">Регистрация</button>
            <button id="signIn" class="bg-green-500">Вход</button>
          </div>
          <button id="googleSignIn" class="bg-gray-200">Войти через Google</button>
        </div>
      </div>
    `;

    document.getElementById('signUp').addEventListener('click', () => this.handleSignUp());
    document.getElementById('signIn').addEventListener('click', () => this.handleSignIn());
    document.getElementById('googleSignIn').addEventListener('click', () => this.handleGoogleSignIn());
  }

  async handleSignUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) {
      this.showError('Введите email и пароль');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      this.showError(err.message);
    }
  }

  async handleSignIn() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) {
      this.showError('Введите email и пароль');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      this.showError(err.message);
    }
  }

  async handleGoogleSignIn() {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      this.showError(err.message);
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 3000);
  }

  // Экран выбора доски
  renderHome() {
    this.app.innerHTML = `
      <div class="container">
        <div class="home-box">
          <h2 class="text-2xl font-bold mb-4 text-center">Добро пожаловать, ${this.user.email}</h2>
          <button id="createBoard" class="bg-blue-500 w-full mb-4">Создать новую доску</button>
          <input id="inviteLink" type="text" placeholder="Вставьте ссылку на доску" class="w-full">
          <button id="joinBoard" class="bg-green-500 w-full">Присоединиться к доске</button>
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
      this.render();
    } catch (err) {
      this.showError('Ошибка при создании доски: ' + err.message);
    }
  }

  async joinBoard() {
    const inviteLink = document.getElementById('inviteLink').value;
    if (!inviteLink) {
      alert('Введите ссылку на доску!');
      return;
    }
    const boardId = inviteLink.split('/').pop();
    try {
      const boardDoc = await getDoc(doc(db, 'boards', boardId));
      if (boardDoc.exists()) {
        this.boardId = boardId;
        this.render();
      } else {
        alert('Недействительная ссылка!');
      }
    } catch (err) {
      alert('Ошибка при присоединении: ' + err.message);
    }
  }

  // Экран доски
  renderBoard() {
    this.app.innerHTML = `
      <div class="board">
        <h1 class="text-3xl font-bold mb-4">Доска задач</h1>
        <p class="mb-4">Ссылка на доску: <a href="${window.location.origin}/board/${this.boardId}" class="text-blue-500">${window.location.origin}/board/${this.boardId}</a></p>
        <div id="adminControls" class="mb-8"></div>
        <div class="mb-8">
          <h2 class="text-xl font-bold mb-2">Добавить задачу</h2>
          <input id="taskTitle" type="text" placeholder="Название задачи" class="mr-2">
          <input id="taskDesc" type="text" placeholder="Описание задачи" class="mr-2">
          <button id="addTask" class="bg-green-500">Добавить задачу</button>
        </div>
        <button id="exportBoard" class="bg-gray-500 mb-4">Экспортировать доску</button>
        <div class="board-grid">
          <div>
            <h2 class="text-xl font-bold mb-2">Общая доска</h2>
            <div id="commonBoard" class="droppable"></div>
          </div>
          <div>
            <h2 class="text-xl font-bold mb-2">Ваши задачи</h2>
            <div id="personalBoard" class="droppable"></div>
          </div>
        </div>
      </div>
    `;

    this.initBoardListener();
    document.getElementById('addTask').addEventListener('click', () => this.addTask());
    document.getElementById('exportBoard').addEventListener('click', () => this.exportBoard());
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
        <h2 class="text-xl font-bold mb-2">Добавить роль</h2>
        <input id="roleName" type="text" placeholder="Название роли" class="mr-2">
        <input id="roleColor" type="color" value="#000000" class="mr-2 p-1">
        <input id="roleDesc" type="text" placeholder="Описание роли" class="mr-2">
        <button id="addRole" class="bg-blue-500">Добавить роль</button>
      `;
      document.getElementById('addRole').addEventListener('click', () => this.addRole());
    } else {
      document.getElementById('adminControls').innerHTML = '';
    }
  }

  async addRole() {
    const roleName = document.getElementById('roleName').value;
    const roleColor = document.getElementById('roleColor').value;
    const roleDesc = document.getElementById('roleDesc').value;
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
    } catch (err) {
      this.showError('Ошибка добавления роли: ' + err.message);
    }
  }

  async addTask() {
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDesc').value;
    if (!title || !description) {
      this.showError('Введите название и описание задачи');
      return;
    }
    try {
      const taskId = Date.now().toString();
      await updateDoc(doc(db, 'boards', this.boardId), {
        [`tasks.${taskId}`]: {
          title,
          description,
          createdBy: this.boardData.admin === this.user.uid ? 'admin' : 'user',
          assignedTo: this.user.uid,
          createdAt: serverTimestamp()
        }
      });
      document.getElementById('taskTitle').value = '';
      document.getElementById('taskDesc').value = '';
    } catch (err) {
      this.showError('Ошибка добавления задачи: ' + err.message);
    }
  }

  // Рендеринг задач
  renderTasks() {
    const commonBoard = document.getElementById('commonBoard');
    const personalBoard = document.getElementById('personalBoard');
    commonBoard.innerHTML = '';
    personalBoard.innerHTML = '';

    if (this.boardData?.tasks) {
      Object.entries(this.boardData.tasks).forEach(([id, task]) => {
        const taskEl = document.createElement('div');
        taskEl.className = 'task-card';
        taskEl.dataset.id = id;
        taskEl.style.borderLeft = `4px solid ${this.boardData.roles[task.assignedTo]?.color || '#000000'}`;
        taskEl.innerHTML = `
          <h3 class="font-bold">${task.title}</h3>
          <p>${task.description}</p>
          <p class="text-sm text-gray-500">Создано: ${task.createdBy === 'admin' ? 'Админ' : 'Вы'}</p>
        `;
        commonBoard.appendChild(taskEl);

        if (task.assignedTo === this.user.uid) {
          const personalTaskEl = taskEl.cloneNode(true);
          personalBoard.appendChild(personalTaskEl);
        }
      });
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
        onEnd: (evt) => {
          evt.item.classList.remove('dragging');
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
  }
}

// Запуск приложения
const taskFlowApp = new TaskFlowApp();