// script.js
document.addEventListener("DOMContentLoaded", () => {
  // --- Element references ---
  const bucketForm = document.getElementById("bucket-form");
  const bucketInput = document.getElementById("bucketInput");
  const bucketList = document.getElementById("bucketList");
  const searchInput = document.getElementById("searchInput");
  const toggleHidden = document.getElementById("toggleHidden");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const deleteModalCheckbox = document.getElementById("deleteModal");
  const pageAlert = document.getElementById("alertBox");

  // --- App state ---
  let bucketItems = JSON.parse(localStorage.getItem("bucketList")) || [];
  let itemToDeleteIndex = null;
  let itemToDeleteLi = null;
  let _alertTimeout = null;

  // --- Helpers ---
  function saveToLocalStorage() {
    localStorage.setItem("bucketList", JSON.stringify(bucketItems));
  }

  /**
   * showAlert(message, type)
   * Creates a toast notification at the top right of the screen
   * type: "success" | "error"
   */
  function showAlert(message, type = "success") {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      toastContainer.className = "fixed top-20 right-4 z-50 space-y-2";
      document.body.appendChild(toastContainer);
    }

    // Create the toast element
    const toast = document.createElement("div");
    const baseClasses = "px-4 py-3 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ease-in-out";
    
    if (type === "success") {
      toast.className = `${baseClasses} bg-green-500 text-white border-l-4 border-green-600`;
      toast.innerHTML = `
        <div class="flex items-center">
          <i class="fa-solid fa-check-circle mr-2"></i>
          <span>${message}</span>
        </div>
      `;
    } else {
      toast.className = `${baseClasses} bg-red-500 text-white border-l-4 border-red-600`;
      toast.innerHTML = `
        <div class="flex items-center">
          <i class="fa-solid fa-exclamation-circle mr-2"></i>
          <span>${message}</span>
        </div>
      `;
    }

    toast.style.transform = "translateX(100%)";
    toast.style.opacity = "0";
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.transform = "translateX(0)";
      toast.style.opacity = "1";
    }, 10);

    setTimeout(() => {
      toast.style.transform = "translateX(100%)";
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4000);
  }

  // --- Rendering / UI utilities ---
  function renderItem(item, index) {
    const li = document.createElement("li");
    li.className = "flex flex-row items-center justify-between bg-base-100 p-3 rounded-lg shadow-sm gap-3";
    li.setAttribute("data-index", index);

    li.innerHTML = `
      <div class="flex items-center gap-3">
        <input type="checkbox" class="checkbox checkbox-primary" ${item.completed ? "checked" : ""}/>
        <span class="${item.completed ? "line-through text-gray-500" : ""}"></span>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-sm btn-ghost hideBtn" title="Hide / Unhide"><i class=""></i></button>
        <button class="btn btn-sm btn-warning editBtn"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm btn-error deleteBtn"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;

    const span = li.querySelector("span");
    span.textContent = item.text;

    const isHidden = !!item.hidden;
    if (isHidden && !toggleHidden?.checked) {
      li.style.display = "none";
    } else {
      li.style.display = "flex";
    }

    if (isHidden && toggleHidden?.checked) {
      span.classList.add("italic", "opacity-70");
    } else {
      span.classList.remove("italic", "opacity-70");
    }

    const hideBtn = li.querySelector(".hideBtn");
    const hideIcon = hideBtn.querySelector("i");
    hideIcon.className = isHidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";

    const checkbox = li.querySelector("input[type='checkbox']");
    checkbox.addEventListener("change", () => {
      bucketItems[index].completed = checkbox.checked;
      saveToLocalStorage();
      span.classList.toggle("line-through", checkbox.checked);
      span.classList.toggle("text-gray-500", checkbox.checked);
      showAlert(checkbox.checked ? "Task completed!" : "Task unmarked", "success");
    });

    hideBtn.addEventListener("click", () => {
      bucketItems[index].hidden = !bucketItems[index].hidden;
      saveToLocalStorage();
      reRenderList();
      showAlert(bucketItems[index].hidden ? "Task hidden" : "Task unhidden", "success");
    });

    const editBtn = li.querySelector(".editBtn");
    editBtn.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = item.text;
      input.className = "input input-bordered w-full";

      span.replaceWith(input);
      input.focus();
      input.select();

      const finishEdit = () => finishEditing(input, index);
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") finishEdit();
        if (e.key === "Escape") reRenderList();
      });
      input.addEventListener("blur", finishEdit);
    });

    const deleteBtn = li.querySelector(".deleteBtn");
    deleteBtn.addEventListener("click", () => {
      if (deleteModalCheckbox) {
        itemToDeleteIndex = index;
        itemToDeleteLi = li;
        deleteModalCheckbox.checked = true;
        return;
      }

      if (confirm("Are you sure you want to delete this item?")) {
        bucketItems.splice(index, 1);
        saveToLocalStorage();
        reRenderList();
        showAlert("Task deleted successfully!", "error");
      } else {
        showAlert("Delete cancelled", "success");
      }
    });

    bucketList.appendChild(li);
  }

  function reRenderList() {
    bucketList.innerHTML = "";
    bucketItems.forEach((item, i) => renderItem(item, i));
    const query = searchInput?.value?.toLowerCase().trim() || "";
    if (query) filterList(query);
  }

  function finishEditing(input, index) {
    const newText = input.value.trim();
    if (newText === "") {
      showAlert("Task name cannot be empty!", "error");
      input.focus();
      return;
    }

    const exists = bucketItems.some(
      (item, i) => i !== index && item.text.toLowerCase() === newText.toLowerCase()
    );
    if (exists) {
      showAlert("Task already exists!", "error");
      reRenderList();
      return;
    }

    if (bucketItems[index].text === newText) {
      reRenderList();
      return;
    }

    bucketItems[index].text = newText;
    saveToLocalStorage();
    reRenderList();
    showAlert("Task updated successfully!", "success");
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", () => {
      if (itemToDeleteIndex !== null) {
        bucketItems.splice(itemToDeleteIndex, 1);
        saveToLocalStorage();
        if (deleteModalCheckbox) deleteModalCheckbox.checked = false;
        reRenderList();
        showAlert("Task deleted successfully!", "error");
        itemToDeleteIndex = null;
        itemToDeleteLi = null;
      }
    });
  }

  if (bucketForm) {
    bucketForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = bucketInput.value.trim();
      if (!value) {
        showAlert("Please enter a task!", "error");
        return;
      }

      const exists = bucketItems.some(
        (item) => item.text.toLowerCase() === value.toLowerCase()
      );
      if (exists) {
        showAlert("Task already exists!", "error");
        bucketInput.value = "";
        return;
      }

      const newItem = { text: value, completed: false, hidden: false };
      bucketItems.push(newItem);
      saveToLocalStorage();
      renderItem(newItem, bucketItems.length - 1);
      bucketInput.value = "";
      showAlert("New task added successfully!", "success");
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase().trim();
      filterList(query);
    });
  }

  function filterList(query) {
    const listItems = bucketList.querySelectorAll("li");
    listItems.forEach((li) => {
      const span = li.querySelector("span");
      const text = span ? span.textContent.toLowerCase() : "";
      const index = Number(li.getAttribute("data-index"));
      const item = bucketItems[index];
      const hiddenBlocked = item && item.hidden && (!toggleHidden || !toggleHidden.checked);

      if (query) {
        if (hiddenBlocked) {
          li.style.display = "none";
          return;
        }
        li.style.display = text.includes(query) ? "flex" : "none";
      } else {
        li.style.display = hiddenBlocked ? "none" : "flex";
      }
    });
  }

  if (toggleHidden) {
    toggleHidden.addEventListener("change", () => {
      reRenderList();
      const message = toggleHidden.checked ? "Showing hidden tasks" : "Hiding hidden tasks";
      showAlert(message, "success");
    });
  }

  reRenderList();

  if (bucketItems.length === 0) {
    showAlert("Welcome! Start adding your bucket list items.", "success");
  }
});

// ---- Offline/Online Toast Notification ----
function showNetworkStatus(message, color = "bg-yellow-600") {
  let toastContainer = document.getElementById("network-toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "network-toast-container";
    toastContainer.className = "fixed top-4 right-4 z-50";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `${color} text-white px-4 py-2 mb-2 rounded shadow-lg`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

window.addEventListener("offline", () => {
  showNetworkStatus("⚠️ You're offline. Some features may not work.", "bg-red-600");
});

window.addEventListener("online", () => {
  showNetworkStatus("✅ Back online!", "bg-green-600");
});


