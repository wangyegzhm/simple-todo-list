// ==============================
// 1. 页面元素：先找到 HTML 里的按钮、输入框和显示区域
// ==============================

const todoInput = document.getElementById('todo-input');
    const todoPriorityInput = document.getElementById('todo-priority');
    const todoTagInput = document.getElementById('todo-tag');
    const todoDueDateInput = document.getElementById('todo-due-date');
    const todoNoteInput = document.getElementById('todo-note');
    const addButton = document.getElementById('add-button');
    const quickDateButtons = document.querySelectorAll('.quick-date-button');
    const inputHelper = document.getElementById('input-helper');
    const actionMessage = document.getElementById('action-message');
    const todoList = document.getElementById('todo-list');
    const todoCount = document.getElementById('todo-count');
    const completeAllButton = document.getElementById('complete-all-button');
    const activateAllButton = document.getElementById('activate-all-button');
    const clearCompletedButton = document.getElementById('clear-completed-button');
    const clearAllButton = document.getElementById('clear-all-button');
    const filterButtons = document.querySelectorAll('.filter-button');
    const searchInput = document.getElementById('search-input');
    const clearSearchButton = document.getElementById('clear-search-button');
    const searchSummary = document.getElementById('search-summary');
    const tagFilterSelect = document.getElementById('tag-filter-select');
    const sortSelect = document.getElementById('sort-select');
    const dateSummary = document.getElementById('date-summary');
    const storageSummary = document.getElementById('storage-summary');
    const exportButton = document.getElementById('export-button');
    const importFileInput = document.getElementById('import-file-input');
    const resetSampleButton = document.getElementById('reset-sample-button');
    const undoArea = document.getElementById('undo-area');
    const undoText = document.getElementById('undo-text');
    const undoDeleteButton = document.getElementById('undo-delete-button');
    const emptyMessage = document.getElementById('empty-message');

// ==============================
// 2. 固定配置和页面状态：记录当前筛选、排序、搜索等状态
// ==============================

    const storageKey = 'simple-todo-list';
    const backupVersion = 'V16';
    const maxTodoLength = 60;
    const maxTagLength = 20;
    const maxNoteLength = 120;

    let currentFilter = 'all';
    let currentSort = 'original';
    let currentSearchText = '';
    let currentTagFilter = 'all';
    let editingIndex = null;
    let messageTimer = null;
    let undoTimer = null;
    let lastDeletedItems = [];

// ==============================
// 3. 初始数据：第一次打开页面时使用的示例任务
// ==============================

    function getSampleTodos() {
      return [
        { text: '完成作业', completed: false, priority: 'high', tag: '学习', note: '今晚先完成数学部分。' },
        { text: '买牛奶', completed: true, priority: 'medium', tag: '生活', note: '' },
        { text: '整理书桌', completed: false, priority: 'low', tag: '整理', note: '先把不用的纸收起来。' }
      ];
    }

    function loadStoredTodos() {
      try {
        const storedTodos = JSON.parse(localStorage.getItem(storageKey));

        if (Array.isArray(storedTodos)) {
          return storedTodos;
        }

        return getSampleTodos();
      } catch (error) {
        return getSampleTodos();
      }
    }

    let todos = loadStoredTodos();

// ==============================
// 4. 保存与提示：负责保存数据、刷新页面、显示操作结果
// ==============================

    function saveTodos() {
      try {
        localStorage.setItem(storageKey, JSON.stringify(todos));
        return true;
      } catch (error) {
        showMessage('保存失败，请检查浏览器是否允许本地保存。', 'error');
        return false;
      }
    }

    function saveAndRender(successMessage) {
      const saved = saveTodos();
      renderTodos();

      if (saved && successMessage) {
        showMessage(successMessage, 'success');
      }

      return saved;
    }

    function showMessage(message, type) {
      actionMessage.textContent = message;
      actionMessage.className = 'action-message ' + type;

      clearTimeout(messageTimer);
      messageTimer = setTimeout(function () {
        actionMessage.classList.add('hidden');
      }, 2200);
    }

    function resetAddForm() {
      todoInput.value = '';
      todoPriorityInput.value = 'medium';
      todoTagInput.value = '';
      todoDueDateInput.value = '';
      todoNoteInput.value = '';
      updateInputHelper();
    }

    function updateInputHelper() {
      const length = todoInput.value.length;
      const tagLength = todoTagInput.value.length;
      const noteLength = todoNoteInput.value.length;
      const remaining = maxTodoLength - length;
      const tagRemaining = maxTagLength - tagLength;
      const noteRemaining = maxNoteLength - noteLength;
      inputHelper.textContent = '任务 ' + length + ' / ' + maxTodoLength + ' 字，标签 ' + tagLength + ' / ' + maxTagLength + ' 字，备注 ' + noteLength + ' / ' + maxNoteLength + ' 字';
      inputHelper.classList.toggle('warning', remaining <= 10 || tagRemaining <= 5 || noteRemaining <= 15);
    }

// ==============================
// 5. 数据小工具：处理时间、标签、优先级、备份格式等小规则
// ==============================

    function getCurrentTime() {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');

      return hours + ':' + minutes;
    }

    function getCreatedTimeText(todo) {
      if (todo.createdAt) {
        return '创建于 ' + todo.createdAt;
      }

      return '创建于 早期任务';
    }

    function getTodayDateString() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      return year + '-' + month + '-' + day;
    }

    function getDateOffsetString(offset) {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return year + '-' + month + '-' + day;
    }

    function normalizeTag(value) {
      return value.trim().replace(/\s+/g, ' ');
    }

    function normalizeText(value, maxLength) {
      return String(value || '').trim().slice(0, maxLength);
    }

    function getTagText(todo) {
      return todo.tag || '';
    }

    function cloneTodo(todo) {
      return {
        text: todo.text,
        completed: Boolean(todo.completed),
        createdAt: todo.createdAt || '',
        dueDate: todo.dueDate || '',
        priority: getPriorityValue(todo),
        tag: getTagText(todo),
        note: todo.note || ''
      };
    }

    function resetViewState() {
      currentFilter = 'all';
      currentSort = 'original';
      currentSearchText = '';
      currentTagFilter = 'all';
      editingIndex = null;
      searchInput.value = '';
      sortSelect.value = 'original';
    }

    function hideUndoArea() {
      lastDeletedItems = [];
      undoArea.classList.add('hidden');
      clearTimeout(undoTimer);
    }

    function getDeletedItems(shouldDelete) {
      return todos.map(function (todo, index) {
        return {
          todo: todo,
          index: index
        };
      }).filter(function (item) {
        return shouldDelete(item.todo);
      });
    }

    function rememberDeletedItems(items, message) {
      lastDeletedItems = items.map(function (item) {
        return {
          index: item.index,
          todo: cloneTodo(item.todo)
        };
      });
      undoText.textContent = message;
      undoArea.classList.remove('hidden');

      clearTimeout(undoTimer);
      undoTimer = setTimeout(function () {
        hideUndoArea();
      }, 10000);
    }

    function undoDeletedTodos() {
      if (lastDeletedItems.length === 0) {
        showMessage('当前没有可以撤销的删除。', 'warning');
        return;
      }

      lastDeletedItems.slice().sort(function (a, b) {
        return a.index - b.index;
      }).forEach(function (item) {
        const safeIndex = Math.min(item.index, todos.length);
        todos.splice(safeIndex, 0, item.todo);
      });

      const restoredCount = lastDeletedItems.length;
      hideUndoArea();
      editingIndex = null;
      const saved = saveTodos();
      renderTodos();

      if (saved) {
        showMessage('已撤销删除，恢复 ' + restoredCount + ' 条任务。', 'success');
      }
    }

    function getDueDateStatus(todo) {
      const today = getTodayDateString();

      if (!todo.dueDate) {
        return 'no-date';
      }

      if (todo.completed) {
        return 'done';
      }

      if (todo.dueDate < today) {
        return 'overdue';
      }

      if (todo.dueDate === today) {
        return 'today';
      }

      return 'future';
    }

    function getDueDateText(todo) {
      const status = getDueDateStatus(todo);

      if (status === 'no-date') {
        return '截止：未设置';
      }

      if (status === 'overdue') {
        return '截止：' + todo.dueDate + '（已逾期）';
      }

      if (status === 'today') {
        return '截止：' + todo.dueDate + '（今天截止）';
      }

      return '截止：' + todo.dueDate;
    }

    function getPriorityValue(todo) {
      return todo.priority || 'medium';
    }

    function getPriorityText(todo) {
      const priority = getPriorityValue(todo);

      if (priority === 'high') {
        return '高';
      }

      if (priority === 'low') {
        return '低';
      }

      return '中';
    }

    function getPriorityRank(todo) {
      const priority = getPriorityValue(todo);

      if (priority === 'high') {
        return 3;
      }

      if (priority === 'medium') {
        return 2;
      }

      return 1;
    }

    function createPrioritySelect(value, index) {
      const prioritySelect = document.createElement('select');
      prioritySelect.className = 'edit-priority-input';
      prioritySelect.dataset.index = index;

      [
        { value: 'low', text: '低优先级' },
        { value: 'medium', text: '中优先级' },
        { value: 'high', text: '高优先级' }
      ].forEach(function (optionInfo) {
        const option = document.createElement('option');
        option.value = optionInfo.value;
        option.textContent = optionInfo.text;
        option.selected = optionInfo.value === value;
        prioritySelect.appendChild(option);
      });

      return prioritySelect;
    }

    function updateStorageSummary(totalCount) {
      storageSummary.textContent = '浏览器已保存 ' + totalCount + ' 条任务';
    }

    function updateTagFilterOptions() {
      const selectedTag = currentTagFilter;
      const tags = Array.from(new Set(todos.map(function (todo) {
        return getTagText(todo);
      }).filter(function (tag) {
        return tag !== '';
      }))).sort(function (a, b) {
        return a.localeCompare(b, 'zh-CN');
      });

      tagFilterSelect.innerHTML = '';

      const allOption = document.createElement('option');
      allOption.value = 'all';
      allOption.textContent = '全部标签';
      tagFilterSelect.appendChild(allOption);

      tags.forEach(function (tag) {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilterSelect.appendChild(option);
      });

      if (selectedTag !== 'all' && !tags.includes(selectedTag)) {
        currentTagFilter = 'all';
      }

      tagFilterSelect.value = currentTagFilter;
    }

    function normalizeImportedTodos(importedTodos) {
      if (!Array.isArray(importedTodos)) {
        return [];
      }

      return importedTodos.map(function (todo) {
        if (!todo || typeof todo !== 'object') {
          return null;
        }

        const text = normalizeText(todo.text, maxTodoLength);

        if (text === '') {
          return null;
        }

        const priority = ['low', 'medium', 'high'].includes(todo.priority) ? todo.priority : 'medium';

        return {
          text: text,
          completed: Boolean(todo.completed),
          createdAt: normalizeText(todo.createdAt, 20) || getCurrentTime(),
          dueDate: normalizeText(todo.dueDate, 10),
          priority: priority,
          tag: normalizeTag(String(todo.tag || '')).slice(0, maxTagLength),
          note: normalizeText(todo.note, maxNoteLength)
        };
      }).filter(function (todo) {
        return todo !== null;
      });
    }

    function exportTodos() {
      const backup = {
        app: 'simple-todo-list',
        version: backupVersion,
        exportedAt: new Date().toISOString(),
        todos: todos.map(cloneTodo)
      };
      const backupText = JSON.stringify(backup, null, 2);
      const blob = new Blob([backupText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'simple-todo-list-backup-' + getTodayDateString() + '.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showMessage('已导出备份文件。', 'success');
    }

    function importTodosFromFile(file) {
      if (!file) {
        return;
      }

      const reader = new FileReader();

      reader.onload = function () {
        try {
          const data = JSON.parse(reader.result);
          const importedTodos = Array.isArray(data) ? data : data.todos;
          const nextTodos = normalizeImportedTodos(importedTodos);

          if (nextTodos.length === 0) {
            showMessage('导入失败：没有找到有效任务。', 'error');
            return;
          }

          if (todos.length > 0 && !confirm('导入备份会替换当前列表，确定继续吗？')) {
            return;
          }

          todos = nextTodos;
          resetViewState();
          hideUndoArea();
          saveAndRender('导入成功，共导入 ' + nextTodos.length + ' 条任务。');
        } catch (error) {
          showMessage('导入失败：请确认选择的是正确的备份文件。', 'error');
        } finally {
          importFileInput.value = '';
        }
      };

      reader.onerror = function () {
        showMessage('读取备份文件失败。', 'error');
        importFileInput.value = '';
      };

      reader.readAsText(file);
    }

    function resetSampleTodos() {
      if (todos.length > 0 && !confirm('恢复示例数据会替换当前列表，确定继续吗？')) {
        return;
      }

      todos = getSampleTodos();
      resetViewState();
      hideUndoArea();
      saveAndRender('已恢复示例数据。');
    }

// ==============================
// 6. 统计、筛选、搜索、排序：决定哪些任务应该显示出来
// ==============================

    function updateDateSummary() {
      const today = getTodayDateString();
      const todayCount = todos.filter(function (todo) {
        return !todo.completed && todo.dueDate === today;
      }).length;
      const overdueCount = todos.filter(function (todo) {
        return !todo.completed && todo.dueDate && todo.dueDate < today;
      }).length;

      dateSummary.textContent = '今天截止 ' + todayCount + ' 件，已逾期 ' + overdueCount + ' 件';
    }

    function sortVisibleTodos(items) {
      if (currentSort === 'priority') {
        return items.slice().sort(function (a, b) {
          const priorityDifference = getPriorityRank(b.todo) - getPriorityRank(a.todo);

          if (priorityDifference !== 0) {
            return priorityDifference;
          }

          return a.index - b.index;
        });
      }

      if (currentSort !== 'dueDate') {
        return items;
      }

      return items.slice().sort(function (a, b) {
        const aDate = a.todo.dueDate || '9999-12-31';
        const bDate = b.todo.dueDate || '9999-12-31';

        if (aDate === bDate) {
          return a.index - b.index;
        }

        return aDate.localeCompare(bDate);
      });
    }

    function todoMatchesSearch(todo) {
      if (currentSearchText === '') {
        return true;
      }

      const text = todo.text.toLowerCase();
      const note = (todo.note || '').toLowerCase();
      const tag = getTagText(todo).toLowerCase();
      const searchText = currentSearchText.toLowerCase();

      return text.includes(searchText) || note.includes(searchText) || tag.includes(searchText);
    }

    function updateSearchSummary(count) {
      clearSearchButton.disabled = currentSearchText === '';
      searchSummary.classList.toggle('hidden', currentSearchText === '');

      if (currentSearchText !== '') {
        searchSummary.textContent = '搜索“' + currentSearchText + '”：找到 ' + count + ' 条结果';
      }
    }

    function getTodoStats() {
      const unfinishedCount = todos.filter(function (todo) {
        return !todo.completed;
      }).length;
      const completedCount = todos.filter(function (todo) {
        return todo.completed;
      }).length;

      return {
        totalCount: todos.length,
        completedCount: completedCount,
        unfinishedCount: unfinishedCount
      };
    }

    function updateStats() {
      const stats = getTodoStats();

      todoCount.textContent = '共 ' + stats.totalCount + ' 件，已完成 ' + stats.completedCount + ' 件，未完成 ' + stats.unfinishedCount + ' 件';
      completeAllButton.disabled = stats.totalCount === 0;
      activateAllButton.disabled = stats.totalCount === 0;
      clearCompletedButton.disabled = stats.totalCount === 0;
      clearAllButton.disabled = stats.totalCount === 0;
      exportButton.disabled = stats.totalCount === 0;
      updateDateSummary();
      updateStorageSummary(stats.totalCount);
      updateTagFilterOptions();
    }

    function updateFilterButtons() {
      filterButtons.forEach(function (button) {
        button.classList.toggle('active', button.dataset.filter === currentFilter);
      });
    }

    function todoMatchesStatus(todo) {
      if (currentFilter === 'active') {
        return !todo.completed;
      }

      if (currentFilter === 'completed') {
        return todo.completed;
      }

      return true;
    }

    function todoMatchesTag(todo) {
      if (currentTagFilter === 'all') {
        return true;
      }

      return getTagText(todo) === currentTagFilter;
    }

    function getVisibleTodos() {
      const visibleTodos = todos.map(function (todo, index) {
        return {
          todo: todo,
          index: index
        };
      }).filter(function (item) {
        return todoMatchesStatus(item.todo);
      }).filter(function (item) {
        return todoMatchesSearch(item.todo);
      }).filter(function (item) {
        return todoMatchesTag(item.todo);
      });

      updateSearchSummary(visibleTodos.length);

      return sortVisibleTodos(visibleTodos);
    }

// ==============================
// 7. 页面渲染：根据 todos 数组重新画出整个任务列表
// ==============================

    function updateEmptyMessage(visibleCount) {
      if (visibleCount === 0) {
        if (todos.length === 0) {
          emptyMessage.textContent = '还没有待办事项，先添加一条吧。';
        } else if (currentSearchText !== '') {
          emptyMessage.textContent = '没有找到匹配的待办事项。';
        } else if (currentTagFilter !== 'all') {
          emptyMessage.textContent = '当前标签下没有待办事项。';
        } else {
          emptyMessage.textContent = '当前筛选下没有待办事项。';
        }
      }

      emptyMessage.classList.toggle('hidden', visibleCount > 0);
    }

    function renderEditTodo(todo, index) {
      const listItem = document.createElement('li');
      const editArea = document.createElement('div');
      editArea.className = 'edit-area';

      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'edit-input';
      editInput.maxLength = maxTodoLength;
      editInput.value = todo.text;
      editInput.dataset.index = index;

      const editPriorityInput = createPrioritySelect(getPriorityValue(todo), index);

      const editTagInput = document.createElement('input');
      editTagInput.type = 'text';
      editTagInput.className = 'edit-tag-input';
      editTagInput.maxLength = maxTagLength;
      editTagInput.value = getTagText(todo);
      editTagInput.placeholder = '标签：可以留空';
      editTagInput.dataset.index = index;

      const editDateInput = document.createElement('input');
      editDateInput.type = 'date';
      editDateInput.className = 'edit-date-input';
      editDateInput.value = todo.dueDate || '';
      editDateInput.dataset.index = index;

      const editNoteInput = document.createElement('textarea');
      editNoteInput.className = 'edit-note-input';
      editNoteInput.maxLength = maxNoteLength;
      editNoteInput.value = todo.note || '';
      editNoteInput.placeholder = '备注：可以写补充说明，也可以留空';
      editNoteInput.dataset.index = index;

      const time = document.createElement('div');
      time.className = 'todo-time';
      time.textContent = getCreatedTimeText(todo);

      const dueDate = document.createElement('div');
      dueDate.className = 'todo-due-date ' + getDueDateStatus(todo);
      dueDate.textContent = getDueDateText(todo);

      const saveButton = document.createElement('button');
      saveButton.type = 'button';
      saveButton.className = 'save-button';
      saveButton.textContent = '保存';
      saveButton.dataset.index = index;

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'cancel-button';
      cancelButton.textContent = '取消';
      cancelButton.dataset.index = index;

      editArea.appendChild(editInput);
      editArea.appendChild(editPriorityInput);
      editArea.appendChild(editTagInput);
      editArea.appendChild(editDateInput);
      editArea.appendChild(editNoteInput);
      editArea.appendChild(time);
      editArea.appendChild(dueDate);

      listItem.appendChild(editArea);
      listItem.appendChild(saveButton);
      listItem.appendChild(cancelButton);

      return listItem;
    }

    function renderNormalTodo(todo, index) {
      const listItem = document.createElement('li');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = todo.completed;
      checkbox.dataset.index = index;

      const content = document.createElement('div');
      content.className = 'todo-content';

      const mainLine = document.createElement('div');
      mainLine.className = 'todo-main-line';

      const priority = document.createElement('span');
      priority.className = 'priority-badge priority-' + getPriorityValue(todo);
      priority.textContent = getPriorityText(todo) + '优先级';

      const tag = document.createElement('span');
      tag.className = 'tag-badge';
      tag.textContent = getTagText(todo);
      tag.classList.toggle('hidden', getTagText(todo) === '');

      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = todo.text;

      if (todo.completed) {
        text.classList.add('completed');
      }

      mainLine.appendChild(priority);
      mainLine.appendChild(tag);
      mainLine.appendChild(text);

      const note = document.createElement('div');
      note.className = 'todo-note';
      note.textContent = todo.note || '';
      note.classList.toggle('hidden', !todo.note);

      const time = document.createElement('div');
      time.className = 'todo-time';
      time.textContent = getCreatedTimeText(todo);

      const dueDate = document.createElement('div');
      dueDate.className = 'todo-due-date ' + getDueDateStatus(todo);
      dueDate.textContent = getDueDateText(todo);

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'edit-button';
      editButton.textContent = '编辑';
      editButton.dataset.index = index;

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'delete-button';
      deleteButton.textContent = '删除';
      deleteButton.dataset.index = index;

      content.appendChild(mainLine);
      content.appendChild(note);
      content.appendChild(time);
      content.appendChild(dueDate);

      listItem.appendChild(checkbox);
      listItem.appendChild(content);
      listItem.appendChild(editButton);
      listItem.appendChild(deleteButton);

      return listItem;
    }

    function renderTodoItem(item) {
      if (item.index === editingIndex) {
        return renderEditTodo(item.todo, item.index);
      }

      return renderNormalTodo(item.todo, item.index);
    }

    function renderTodos() {
      todoList.innerHTML = '';
      updateStats();
      updateFilterButtons();

      const visibleTodos = getVisibleTodos();
      updateEmptyMessage(visibleTodos.length);

      visibleTodos.forEach(function (item) {
        todoList.appendChild(renderTodoItem(item));
      });
    }

// ==============================
// 8. 用户操作：添加、删除、编辑、批量处理、导入导出
// ==============================

    function addTodo() {
      const todoText = todoInput.value.trim();

      if (todoText === '') {
        showMessage('请先输入一件要做的事。', 'warning');
        todoInput.focus();
        return;
      }

      todos.push({
        text: todoText,
        completed: false,
        createdAt: getCurrentTime(),
        dueDate: todoDueDateInput.value,
        priority: todoPriorityInput.value,
        tag: normalizeTag(todoTagInput.value),
        note: todoNoteInput.value.trim()
      });
      resetAddForm();
      saveAndRender('已添加：' + todoText);
    }

    function clearCompletedTodos() {
      const completedCount = todos.filter(function (todo) {
        return todo.completed;
      }).length;

      if (completedCount === 0) {
        showMessage('当前没有已完成的待办事项。', 'warning');
        return;
      }

      if (!confirm('确定要清除所有已完成的待办事项吗？')) {
        return;
      }

      const deletedItems = getDeletedItems(function (todo) {
        return todo.completed;
      });

      todos = todos.filter(function (todo) {
        return !todo.completed;
      });
      editingIndex = null;
      const saved = saveAndRender('已清除 ' + completedCount + ' 条已完成事项。');

      if (saved) {
        rememberDeletedItems(deletedItems, '已清除 ' + completedCount + ' 条已完成事项，可撤销。');
      }
    }

    function clearAllTodos() {
      const totalCount = todos.length;

      if (totalCount === 0) {
        showMessage('当前没有待办事项。', 'warning');
        return;
      }

      if (!confirm('确定要清空全部待办事项吗？')) {
        return;
      }

      if (!confirm('这会删除所有待办事项，确定继续吗？')) {
        return;
      }

      const deletedItems = getDeletedItems(function () {
        return true;
      });

      todos = [];
      currentTagFilter = 'all';
      editingIndex = null;
      const saved = saveAndRender('已清空 ' + totalCount + ' 条任务。');

      if (saved) {
        rememberDeletedItems(deletedItems, '已清空 ' + totalCount + ' 条任务，可撤销。');
      }
    }

    function completeAllTodos() {
      const unfinishedCount = todos.filter(function (todo) {
        return !todo.completed;
      }).length;

      if (todos.length === 0) {
        showMessage('当前没有待办事项。', 'warning');
        return;
      }

      if (unfinishedCount === 0) {
        showMessage('所有待办事项都已经完成。', 'warning');
        return;
      }

      todos.forEach(function (todo) {
        todo.completed = true;
      });
      editingIndex = null;
      saveAndRender('已将 ' + unfinishedCount + ' 条待办设为完成。');
    }

    function activateAllTodos() {
      const completedCount = todos.filter(function (todo) {
        return todo.completed;
      }).length;

      if (todos.length === 0) {
        showMessage('当前没有待办事项。', 'warning');
        return;
      }

      if (completedCount === 0) {
        showMessage('当前没有已完成的待办事项。', 'warning');
        return;
      }

      todos.forEach(function (todo) {
        todo.completed = false;
      });
      editingIndex = null;
      saveAndRender('已将 ' + completedCount + ' 条事项恢复为未完成。');
    }

    function clearSearchText() {
      searchInput.value = '';
      currentSearchText = '';
      editingIndex = null;
      renderTodos();
      showMessage('已清空搜索。', 'success');
    }

    function setQuickDueDate(quickDate) {
      if (quickDate === 'today') {
        todoDueDateInput.value = getDateOffsetString(0);
        showMessage('已把截止日期设为今天。', 'success');
      }

      if (quickDate === 'tomorrow') {
        todoDueDateInput.value = getDateOffsetString(1);
        showMessage('已把截止日期设为明天。', 'success');
      }

      if (quickDate === 'clear') {
        todoDueDateInput.value = '';
        showMessage('已清除添加区的截止日期。', 'success');
      }
    }

    function deleteTodoByIndex(index) {
      const deletedTodo = todos[index];

      if (!deletedTodo) {
        return;
      }

      todos.splice(index, 1);
      editingIndex = null;
      const saved = saveAndRender('已删除：' + deletedTodo.text);

      if (saved) {
        rememberDeletedItems([
          {
            todo: deletedTodo,
            index: index
          }
        ], '已删除“' + deletedTodo.text + '”，可撤销。');
      }
    }

    function saveEditedTodo(button) {
      const index = button.dataset.index;
      const editInput = button.parentElement.querySelector('.edit-input');
      const editPriorityInput = button.parentElement.querySelector('.edit-priority-input');
      const editTagInput = button.parentElement.querySelector('.edit-tag-input');
      const editDateInput = button.parentElement.querySelector('.edit-date-input');
      const editNoteInput = button.parentElement.querySelector('.edit-note-input');
      const newText = editInput.value.trim();

      if (newText === '') {
        showMessage('任务文字不能为空。', 'warning');
        editInput.focus();
        return;
      }

      todos[index].text = newText;
      todos[index].priority = editPriorityInput.value;
      todos[index].tag = normalizeTag(editTagInput.value);
      todos[index].dueDate = editDateInput.value;
      todos[index].note = editNoteInput.value.trim();
      editingIndex = null;
      saveAndRender('修改已保存。');
    }

    function toggleTodoCompleted(index, checked) {
      todos[index].completed = checked;
      editingIndex = null;
      saveAndRender();
    }

// ==============================
// 9. 事件绑定：告诉页面“用户点击或输入时，要执行哪个函数”
// ==============================

    addButton.addEventListener('click', addTodo);
    completeAllButton.addEventListener('click', completeAllTodos);
    activateAllButton.addEventListener('click', activateAllTodos);
    clearCompletedButton.addEventListener('click', clearCompletedTodos);
    clearAllButton.addEventListener('click', clearAllTodos);
    exportButton.addEventListener('click', exportTodos);
    importFileInput.addEventListener('change', function () {
      importTodosFromFile(importFileInput.files[0]);
    });
    resetSampleButton.addEventListener('click', resetSampleTodos);
    undoDeleteButton.addEventListener('click', undoDeletedTodos);
    tagFilterSelect.addEventListener('change', function () {
      currentTagFilter = tagFilterSelect.value;
      editingIndex = null;
      renderTodos();
    });
    sortSelect.addEventListener('change', function () {
      currentSort = sortSelect.value;
      editingIndex = null;
      renderTodos();
    });
    searchInput.addEventListener('input', function () {
      currentSearchText = searchInput.value.trim();
      editingIndex = null;
      renderTodos();
    });
    clearSearchButton.addEventListener('click', clearSearchText);

    filterButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        currentFilter = button.dataset.filter;
        editingIndex = null;
        renderTodos();
      });
    });

    todoInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        addTodo();
      }
    });
    todoInput.addEventListener('input', updateInputHelper);
    todoTagInput.addEventListener('input', updateInputHelper);
    todoNoteInput.addEventListener('input', updateInputHelper);
    quickDateButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        setQuickDueDate(button.dataset.quickDate);
      });
    });

    todoList.addEventListener('click', function (event) {
      if (event.target.classList.contains('delete-button')) {
        deleteTodoByIndex(Number(event.target.dataset.index));
      }

      if (event.target.classList.contains('edit-button')) {
        editingIndex = Number(event.target.dataset.index);
        renderTodos();
      }

      if (event.target.classList.contains('save-button')) {
        saveEditedTodo(event.target);
      }

      if (event.target.classList.contains('cancel-button')) {
        editingIndex = null;
        renderTodos();
      }
    });

    todoList.addEventListener('change', function (event) {
      if (event.target.type === 'checkbox') {
        toggleTodoCompleted(event.target.dataset.index, event.target.checked);
      }
    });

// ==============================
// 10. 启动页面：第一次打开时，先更新字数提示，再画出任务列表
// ==============================

    updateInputHelper();
    renderTodos();
