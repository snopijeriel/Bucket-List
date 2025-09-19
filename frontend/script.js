document.addEventListener("DOMContentLoaded", () => {
  const bucketForm = document.getElementById("bucket-form");
  const bucketInput = document.getElementById("bucketInput");
  const bucketList = document.getElementById("bucketList");

  // try multiple ways to find the search input (use the placeholder from your HTML)
  const searchInput =
    document.getElementById("searchInput") ||
    document.querySelector('input[placeholder="Search your lists..."]') ||
    document.querySelector("section input[type='text']");

  // Load items from localStorage
  let bucketItems = JSON.parse(localStorage.getItem("bucketList")) || [];

  // Save function
  function saveToLocalStorage() {
    localStorage.setItem("bucketList", JSON.stringify(bucketItems));
  }

  // Reusable alert (DaisyUI/tailwind style)
  function showAlert(message, type = "success") {
    const alertBox = document.createElement("div");
    // use DaisyUI alert classes if available
    if (type === "success") {
      alertBox.className =
        "alert alert-success shadow-lg fixed top-4 right-4 z-50 w-auto";
    } else {
      alertBox.className =
        "alert alert-error shadow-lg fixed top-4 right-4 z-50 w-auto";
    }
    alertBox.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(alertBox);

    setTimeout(() => {
      alertBox.remove();
    }, 2000);
  }

  // Render one item (safe: we set textContent for span)
  function renderItem(item, index) {
    const li = document.createElement("li");
    li.className =
      "flex flex-row items-center justify-between bg-base-100 p-3 rounded-lg shadow-sm gap-3";
    li.setAttribute("data-index", index);

    // build inner structure (we will set span.textContent separately)
    li.innerHTML = `
      <div class="flex items-center gap-3">
        <input type="checkbox" class="checkbox checkbox-primary" ${item.completed ? "checked" : ""}/>
        <span class="${item.completed ? "line-through text-gray-500" : ""}"></span>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-sm btn-warning editBtn"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm btn-error deleteBtn"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;

    // set text safely
    const span = li.querySelector("span");
    span.textContent = item.text;

    // checkbox listener
    const checkbox = li.querySelector("input[type='checkbox']");
    checkbox.addEventListener("change", () => {
      bucketItems[index].completed = checkbox.checked;
      saveToLocalStorage();
      span.classList.toggle("line-through", checkbox.checked);
      span.classList.toggle("text-gray-500", checkbox.checked);
    });

    // edit button (inline edit)
    const editBtn = li.querySelector(".editBtn");
    editBtn.addEventListener("click", () => {
      // create input and swap
      const input = document.createElement("input");
      input.type = "text";
      input.value = item.text;
      input.className = "input input-bordered w-full";

      span.replaceWith(input);
      input.focus();

      // save on Enter or blur
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") finishEditing(input, index);
      });
      input.addEventListener("blur", () => finishEditing(input, index));
    });

    // delete button (confirm then re-render)
    const deleteBtn = li.querySelector(".deleteBtn");
    deleteBtn.addEventListener("click", () => {
      // prefer custom modal if present, otherwise fallback to confirm()
      const deleteModal = document.getElementById("deleteModal");
      if (deleteModal) {
        // store index to be deleted and open modal
        itemToDeleteIndex = index;
        itemToDeleteLi = li;
        deleteModal.checked = true;
        return;
      }

      // fallback confirm()
      if (confirm("Are you sure you want to delete this item?")) {
        bucketItems.splice(index, 1);
        saveToLocalStorage();
        // re-render entire list so indexes and listeners stay correct
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
  }

  // finish editing: update array, save and re-render
  function finishEditing(input, index) {
    const newText = input.value.trim();
    if (newText === "") {
      // keep focus so user can enter something
      input.focus();
      return;
    }

    bucketItems[index].text = newText;
    saveToLocalStorage();
    reRenderList();
    showAlert("Edit successful!", "success");
  }

  // If delete modal/confirm UI is present in HTML, wire it up
  let itemToDeleteIndex = null;
  let itemToDeleteLi = null;
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const deleteModalCheckbox = document.getElementById("deleteModal");
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", () => {
      if (itemToDeleteIndex !== null) {
        bucketItems.splice(itemToDeleteIndex, 1);
        saveToLocalStorage();
        // close modal
        if (deleteModalCheckbox) deleteModalCheckbox.checked = false;
        reRenderList();
        showAlert("Task deleted successfully!", "error");
        itemToDeleteIndex = null;
        itemToDeleteLi = null;
      }
    });
  }

  // initial render
  reRenderList();

  // add new item
  bucketForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = bucketInput.value.trim();
    if (!value) return;

    const newItem = { text: value, completed: false };
    bucketItems.push(newItem);
    saveToLocalStorage();
    renderItem(newItem, bucketItems.length - 1);
    bucketInput.value = "";
    showAlert("New task added successfully!", "success");
  });

  // search/filter (only if searchInput exists)
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
      li.style.display = text.includes(query) ? "flex" : "none";
    });
  }
});
