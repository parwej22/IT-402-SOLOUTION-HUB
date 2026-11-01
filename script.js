
/* =====================================
   IT402 SOLUTION HUB
   ADMIN SETTINGS
===================================== */

const ADMIN_ID = "parwej2228";
const ADMIN_PASSWORD = "P@700100a";

let isAdmin = false;
let db;

/* =====================================
   INDEXED DATABASE
===================================== */

const request = indexedDB.open("IT402LibraryDB", 1);

request.onupgradeneeded = function(event) {
    const database = event.target.result;

    if (!database.objectStoreNames.contains("papers")) {
        database.createObjectStore("papers", {
            keyPath: "id"
        });
    }
};

request.onsuccess = function(event) {
    db = event.target.result;
    loadPapers();
};

request.onerror = function() {
    alert("Database could not be opened. Please use a modern browser.");
};

/* =====================================
   DATABASE HELPERS
===================================== */

function getAllPapers() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("papers", "readonly");
        const store = transaction.objectStore("papers");
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function savePaper(paper) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("papers", "readwrite");
        transaction.objectStore("papers").put(paper);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

function deletePaperFromDB(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("papers", "readwrite");
        transaction.objectStore("papers").delete(id);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

/* =====================================
   SAFE TEXT DISPLAY
===================================== */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function(char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char];
    });
}

/* =====================================
   LOAD PAPERS
===================================== */

async function loadPapers() {
    try {
        const papers = await getAllPapers();

        renderPapers(papers);
        renderManageList(papers);
        updateYearFilter(papers);

        document.getElementById("storageMessage").textContent =
            papers.length + " paper(s) available in this browser.";

    } catch(error) {
        console.error(error);
        alert("Could not load papers.");
    }
}

/* =====================================
   YEAR FILTER
===================================== */

function updateYearFilter(papers) {
    const filter = document.getElementById("yearFilter");
    const selected = filter.value;

    const years = [...new Set(
        papers.map(paper => String(paper.year))
    )].sort((a, b) => Number(b) - Number(a));

    filter.innerHTML = '<option value="all">All Years</option>';

    years.forEach(year => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        filter.appendChild(option);
    });

    if (years.includes(selected)) {
        filter.value = selected;
    }
}

/* =====================================
   STUDENT PAPER DISPLAY
===================================== */

async function renderPapers(papers) {

    const grid = document.getElementById("paperGrid");
    const empty = document.getElementById("emptyMessage");

    const search = document.getElementById("searchInput")
        .value.toLowerCase().trim();

    const type = document.getElementById("typeFilter").value;
    const year = document.getElementById("yearFilter").value;

    const filtered = papers.filter(paper => {

        const matchesSearch =
            paper.title.toLowerCase().includes(search) ||
            String(paper.year).includes(search);

        const matchesType =
            type === "all" || paper.type === type;

        const matchesYear =
            year === "all" || String(paper.year) === year;

        return matchesSearch && matchesType && matchesYear;
    });

    filtered.sort((a, b) => Number(b.year) - Number(a.year));

    grid.innerHTML = "";

    empty.style.display = filtered.length ? "none" : "block";

    filtered.forEach(paper => {

        const icon = paper.type === "pyq" ? "📚" : "📄";

        const typeName = paper.type === "pyq"
            ? "Previous Year Question"
            : "Sample Paper";

        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <div class="card-icon">${icon}</div>

            <h3>${escapeHTML(paper.title)}</h3>

            <span class="year-label">
                ${escapeHTML(paper.year)}
            </span>

            <p>${typeName}</p>

            <div class="card-buttons">

                <button class="btn question-btn"
                    data-action="view-question"
                    data-id="${escapeHTML(paper.id)}"
                    ${paper.question ? "" : "disabled"}>
                    📖 View Questions
                </button>

                <button class="btn solution-btn"
                    data-action="view-solution"
                    data-id="${escapeHTML(paper.id)}"
                    ${paper.solution ? "" : "disabled"}>
                    ✅ View Solutions
                </button>

                <button class="btn download-btn"
                    data-action="download-question"
                    data-id="${escapeHTML(paper.id)}"
                    ${paper.question ? "" : "disabled"}>
                    ⬇ Download Questions
                </button>

                <button class="btn download-btn"
                    data-action="download-solution"
                    data-id="${escapeHTML(paper.id)}"
                    ${paper.solution ? "" : "disabled"}>
                    ⬇ Download Solutions
                </button>

            </div>
        `;

        grid.appendChild(card);
    });
}

/* =====================================
   VIEW AND DOWNLOAD PDF
===================================== */

async function handlePDF(action, id) {

    const papers = await getAllPapers();

    const paper = papers.find(item => item.id === id);

    if (!paper) {
        alert("Paper not found.");
        return;
    }

    let file;

    if (action.includes("question")) {
        file = paper.question;
    } else {
        file = paper.solution;
    }

    if (!file) {
        alert("This PDF is not available.");
        return;
    }

    const url = URL.createObjectURL(file);

    if (action.startsWith("view")) {

        const opened = window.open(url, "_blank");

        if (!opened) {
            alert("Allow pop-ups to view the PDF.");
        }

        setTimeout(() => URL.revokeObjectURL(url), 60000);

    } else {

        const link = document.createElement("a");

        const suffix = action.includes("question")
            ? "Questions"
            : "Solutions";

        link.href = url;
        link.download = paper.title + " " + suffix + ".pdf";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
}

/* =====================================
   STUDENT BUTTON EVENTS
===================================== */

document.getElementById("paperGrid").addEventListener("click", function(event) {

    const button = event.target.closest("button[data-action]");

    if (!button || button.disabled) return;

    handlePDF(button.dataset.action, button.dataset.id)
        .catch(error => {
            console.error(error);
            alert("Could not open or download the PDF.");
        });
});

/* =====================================
   SEARCH AND FILTER
===================================== */

document.getElementById("searchInput")
    .addEventListener("input", loadPapers);

document.getElementById("typeFilter")
    .addEventListener("change", loadPapers);

document.getElementById("yearFilter")
    .addEventListener("change", loadPapers);

/* =====================================
   ADMIN LOGIN
===================================== */

const loginModal = document.getElementById("loginModal");
const adminPanel = document.getElementById("adminPanel");

document.getElementById("adminOpenBtn").onclick = function() {

    if (isAdmin) {
        adminPanel.classList.remove("hidden");
        adminPanel.scrollIntoView({behavior: "smooth"});
    } else {
        loginModal.classList.remove("hidden");
    }
};

document.getElementById("closeLoginBtn").onclick = function() {
    loginModal.classList.add("hidden");
};

document.getElementById("loginForm").onsubmit = function(event) {

    event.preventDefault();

    const id = document.getElementById("adminId").value;
    const password = document.getElementById("adminPassword").value;

    if (id === ADMIN_ID && password === ADMIN_PASSWORD) {

        isAdmin = true;

        loginModal.classList.add("hidden");
        adminPanel.classList.remove("hidden");

        document.getElementById("loginError").textContent = "";

        this.reset();

        adminPanel.scrollIntoView({behavior: "smooth"});

        loadPapers();

    } else {

        document.getElementById("loginError").textContent =
            "Incorrect Admin ID or Password!";

    }
};

/* =====================================
   ADMIN LOGOUT
===================================== */

document.getElementById("logoutBtn").onclick = function() {

    isAdmin = false;

    adminPanel.classList.add("hidden");

    resetForm();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
};

/* =====================================
   PDF VALIDATION
===================================== */

function validatePDF(file) {

    if (!file) return true;

    return file.type === "application/pdf" ||
           file.name.toLowerCase().endsWith(".pdf");
}

/* =====================================
   ADD AND EDIT PAPER
===================================== */

document.getElementById("paperForm").onsubmit = async function(event) {

    event.preventDefault();

    if (!isAdmin || !db) {
        alert("Admin login required.");
        return;
    }

    const id = document.getElementById("editId").value;

    const title = document.getElementById("paperTitle").value.trim();
    const year = document.getElementById("paperYear").value;
    const type = document.getElementById("paperType").value;

    const questionFile = document.getElementById("questionFile").files[0];
    const solutionFile = document.getElementById("solutionFile").files[0];

    if (!title || !year) {
        alert("Please enter title and year.");
        return;
    }

    if (questionFile && !validatePDF(questionFile)) {
        alert("Question file must be a PDF.");
        return;
    }

    if (solutionFile && !validatePDF(solutionFile)) {
        alert("Solution file must be a PDF.");
        return;
    }

    try {

        const existing = id
            ? (await getAllPapers()).find(p => p.id === id)
            : null;

        if (id && !existing) {
            alert("Paper not found.");
            return;
        }

        if (!id && !questionFile && !solutionFile) {
            alert("Please upload at least one PDF.");
            return;
        }

        const paper = {
            id: id || (
                crypto.randomUUID
                    ? crypto.randomUUID()
                    : Date.now().toString()
            ),

            title: title,
            year: Number(year),
            type: type,

            question: questionFile || existing?.question || null,
            solution: solutionFile || existing?.solution || null,

            createdAt: existing?.createdAt || Date.now()
        };

        document.getElementById("saveBtn").disabled = true;

        await savePaper(paper);

        alert(id ? "Paper updated successfully!" : "Paper added successfully!");

        resetForm();

        await loadPapers();

    } catch(error) {

        console.error(error);

        alert("Could not save paper. Check available browser storage.");

    } finally {

        document.getElementById("saveBtn").disabled = false;

    }
};

/* =====================================
   ADMIN MANAGE LIST
===================================== */

async function renderManageList(papers) {

    const list = document.getElementById("manageList");

    list.innerHTML = "";

    if (!papers.length) {
        list.innerHTML = "<p>No papers uploaded yet.</p>";
        return;
    }

    papers.sort((a, b) => Number(b.year) - Number(a.year));

    papers.forEach(paper => {

        const item = document.createElement("div");
        item.className = "manage-item";

        const info = document.createElement("div");

        const heading = document.createElement("h4");
        heading.textContent = paper.title;

        const details = document.createElement("small");
        details.textContent =
            paper.year + " | " +
            (paper.type === "pyq" ? "PYQ" : "Sample Paper");

        info.append(heading, details);

        const actions = document.createElement("div");
        actions.className = "manage-actions";

        const edit = document.createElement("button");
        edit.className = "edit-btn";
        edit.textContent = "Edit";
        edit.onclick = () => editPaper(paper.id);

        const remove = document.createElement("button");
        remove.className = "delete-btn";
        remove.textContent = "Delete";
        remove.onclick = () => deletePaper(paper.id);

        actions.append(edit, remove);
        item.append(info, actions);

        list.appendChild(item);
    });
}

/* =====================================
   EDIT PAPER
===================================== */

async function editPaper(id) {

    if (!isAdmin) return;

    const papers = await getAllPapers();
    const paper = papers.find(p => p.id === id);

    if (!paper) return;

    document.getElementById("editId").value = paper.id;
    document.getElementById("paperTitle").value = paper.title;
    document.getElementById("paperYear").value = paper.year;
    document.getElementById("paperType").value = paper.type;

    document.getElementById("formHeading").textContent =
        "Edit Paper";

    document.getElementById("saveBtn").textContent =
        "Update Paper";

    document.getElementById("cancelEditBtn")
        .classList.remove("hidden");

    adminPanel.scrollIntoView({behavior: "smooth"});
}

/* =====================================
   DELETE PAPER
===================================== */

async function deletePaper(id) {

    if (!isAdmin) return;

    const confirmDelete = confirm(
        "Are you sure you want to delete this paper and its PDFs?"
    );

    if (!confirmDelete) return;

    try {

        await deletePaperFromDB(id);

        alert("Paper deleted successfully!");

        await loadPapers();

        resetForm();

    } catch(error) {

        console.error(error);
        alert("Could not delete paper.");

    }
}

/* =====================================
   RESET FORM
===================================== */

function resetForm() {

    document.getElementById("paperForm").reset();

    document.getElementById("editId").value = "";

    document.getElementById("formHeading").textContent =
        "Add New Paper";

    document.getElementById("saveBtn").textContent =
        "Save Paper";

    document.getElementById("cancelEditBtn")
        .classList.add("hidden");
}

document.getElementById("cancelEditBtn").onclick = resetForm;
