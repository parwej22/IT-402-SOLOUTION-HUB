
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

function validatePDF(file) {
    if (!file) return true;

    return file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
}

/* =====================================
   LOAD ALL RESOURCES
===================================== */

async function loadPapers() {
    try {
        const papers = await getAllPapers();

        renderPapers(papers);
        renderNotes(papers);
        renderManageList(papers);
        renderManageNotesList(papers);
        updateYearFilter(papers);

        document.getElementById("storageMessage").textContent =
            papers.length + " resource(s) available in this browser.";

    } catch(error) {
        console.error(error);
        alert("Could not load resources.");
    }
}

/* =====================================
   YEAR FILTER
===================================== */

function updateYearFilter(papers) {
    const filter = document.getElementById("yearFilter");
    const selected = filter.value;

    const years = [...new Set(
        papers
            .filter(paper => paper.type !== "notes" && paper.year)
            .map(paper => String(paper.year))
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
   RESOURCE SEARCH AND FILTER
===================================== */

function getFilteredResources(papers) {
    const search = document.getElementById("searchInput")
        .value.toLowerCase().trim();

    const type = document.getElementById("typeFilter").value;
    const year = document.getElementById("yearFilter").value;

    return papers.filter(paper => {

        const searchableText = paper.type === "notes"
            ? `${paper.chapterNumber || ""} ${paper.chapterName || ""}`.toLowerCase()
            : `${paper.title || ""} ${paper.year || ""}`.toLowerCase();

        const matchesSearch = searchableText.includes(search);

        const matchesType =
            type === "all" || paper.type === type;

        const matchesYear =
            paper.type === "notes"
                ? year === "all"
                : year === "all" || String(paper.year) === year;

        return matchesSearch && matchesType && matchesYear;
    });
}

/* =====================================
   STUDENT PAPER DISPLAY
===================================== */

function renderPapers(papers) {

    const grid = document.getElementById("paperGrid");
    const empty = document.getElementById("emptyMessage");

    const filtered = getFilteredResources(papers)
        .filter(paper => paper.type !== "notes");

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

                ${paper.question ? `
                    <button class="btn question-btn"
                        data-action="view-question"
                        data-id="${escapeHTML(paper.id)}">
                        📖 View Questions
                    </button>

                    <button class="btn download-btn"
                        data-action="download-question"
                        data-id="${escapeHTML(paper.id)}">
                        ⬇ Download Questions
                    </button>
                ` : ""}

                ${paper.solution ? `
                    <button class="btn solution-btn"
                        data-action="view-solution"
                        data-id="${escapeHTML(paper.id)}">
                        ✅ View Solutions
                    </button>

                    <button class="btn download-btn"
                        data-action="download-solution"
                        data-id="${escapeHTML(paper.id)}">
                        ⬇ Download Solutions
                    </button>
                ` : ""}

            </div>
        `;

        grid.appendChild(card);
    });
}

/* =====================================
   STUDENT CHAPTER NOTES DISPLAY
===================================== */

function renderNotes(papers) {

    const grid = document.getElementById("notesGrid");
    const empty = document.getElementById("notesEmptyMessage");

    const filtered = getFilteredResources(papers)
        .filter(paper => paper.type === "notes");

    filtered.sort((a, b) =>
        Number(a.chapterNumber) - Number(b.chapterNumber)
    );

    grid.innerHTML = "";

    empty.style.display = filtered.length ? "none" : "block";

    filtered.forEach(note => {

        const card = document.createElement("div");
        card.className = "card notes-card";

        card.innerHTML = `
            <div class="card-icon">📘</div>

            <h3>Chapter ${escapeHTML(note.chapterNumber)}</h3>

            <p>${escapeHTML(note.chapterName)}</p>

            <div class="card-buttons">

                <button class="btn question-btn"
                    data-action="view-notes"
                    data-id="${escapeHTML(note.id)}">
                    📖 View Notes
                </button>

                <button class="btn download-btn"
                    data-action="download-notes"
                    data-id="${escapeHTML(note.id)}">
                    ⬇ Download Notes
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

    const paper = papers.find(item => String(item.id) === String(id));

    if (!paper) {
        alert("Resource not found.");
        return;
    }

    let file;
    let fileName;

    if (action.includes("question")) {
        file = paper.question;
        fileName = paper.title + " Questions.pdf";

    } else if (action.includes("solution")) {
        file = paper.solution;
        fileName = paper.title + " Solutions.pdf";

    } else if (action.includes("notes")) {
        file = paper.notesFile;
        fileName = "Chapter " + paper.chapterNumber +
            " " + paper.chapterName + " Notes.pdf";
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

    } else {

        const link = document.createElement("a");

        link.href = url;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000);
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

document.getElementById("notesGrid").addEventListener("click", function(event) {

    const button = event.target.closest("button[data-action]");

    if (!button || button.disabled) return;

    handlePDF(button.dataset.action, button.dataset.id)
        .catch(error => {
            console.error(error);
            alert("Could not open or download the Notes PDF.");
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
    resetNotesForm();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
};

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
            ? (await getAllPapers()).find(p => String(p.id) === String(id))
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
   ADMIN MANAGE PAPER LIST
===================================== */

function renderManageList(papers) {

    const list = document.getElementById("manageList");

    list.innerHTML = "";

    const paperList = papers.filter(paper => paper.type !== "notes");

    if (!paperList.length) {
        list.innerHTML = "<p>No papers uploaded yet.</p>";
        return;
    }

    paperList.sort((a, b) => Number(b.year) - Number(a.year));

    paperList.forEach(paper => {

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
    const paper = papers.find(p => String(p.id) === String(id));

    if (!paper) return;

    document.getElementById("editId").value = paper.id;
    document.getElementById("paperTitle").value = paper.title;
    document.getElementById("paperYear").value = paper.year;
    document.getElementById("paperType").value = paper.type;

    document.getElementById("formHeading").textContent = "Edit Paper";
    document.getElementById("saveBtn").textContent = "Update Paper";

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
   RESET PAPER FORM
===================================== */

function resetForm() {

    document.getElementById("paperForm").reset();

    document.getElementById("editId").value = "";

    document.getElementById("formHeading").textContent = "Add New Paper";
    document.getElementById("saveBtn").textContent = "Save Paper";

    document.getElementById("cancelEditBtn")
        .classList.add("hidden");
}

document.getElementById("cancelEditBtn").onclick = resetForm;

/* =====================================
   ADD AND EDIT CHAPTER NOTES
===================================== */

document.getElementById("notesForm").onsubmit = async function(event) {

    event.preventDefault();

    if (!isAdmin || !db) {
        alert("Admin login required.");
        return;
    }

    const id = document.getElementById("notesEditId").value;

    const chapterNumber =
        document.getElementById("notesChapterNumber").value;

    const chapterName =
        document.getElementById("notesChapterName").value.trim();

    const notesFile =
        document.getElementById("notesFile").files[0];

    if (!chapterNumber || !chapterName) {
        alert("Please enter Chapter Number and Chapter Name.");
        return;
    }

    if (notesFile && !validatePDF(notesFile)) {
        alert("Notes file must be a PDF.");
        return;
    }

    try {

        const existing = id
            ? (await getAllPapers()).find(p => String(p.id) === String(id))
            : null;

        if (id && (!existing || existing.type !== "notes")) {
            alert("Notes not found.");
            return;
        }

        if (!id && !notesFile) {
            alert("Please upload Notes PDF.");
            return;
        }

        const note = {
            id: id || (
                crypto.randomUUID
                    ? crypto.randomUUID()
                    : Date.now().toString()
            ),

            type: "notes",
            chapterNumber: Number(chapterNumber),
            chapterName: chapterName,

            notesFile: notesFile || existing?.notesFile || null,

            createdAt: existing?.createdAt || Date.now()
        };

        document.getElementById("saveNotesBtn").disabled = true;

        await savePaper(note);

        alert(id
            ? "Chapter Notes updated successfully!"
            : "Chapter Notes added successfully!"
        );

        resetNotesForm();

        await loadPapers();

    } catch(error) {

        console.error(error);
        alert("Could not save Notes. Check available browser storage.");

    } finally {

        document.getElementById("saveNotesBtn").disabled = false;

    }
};

/* =====================================
   ADMIN MANAGE NOTES LIST
===================================== */

function renderManageNotesList(papers) {

    const list = document.getElementById("manageNotesList");

    list.innerHTML = "";

    const notes = papers.filter(paper => paper.type === "notes");

    if (!notes.length) {
        list.innerHTML = "<p>No chapter notes uploaded yet.</p>";
        return;
    }

    notes.sort((a, b) =>
        Number(a.chapterNumber) - Number(b.chapterNumber)
    );

    notes.forEach(note => {

        const item = document.createElement("div");
        item.className = "manage-item";

        const info = document.createElement("div");

        const heading = document.createElement("h4");
        heading.textContent =
            "Chapter " + note.chapterNumber + ": " + note.chapterName;

        const details = document.createElement("small");
        details.textContent = "Chapter Notes PDF";

        info.append(heading, details);

        const actions = document.createElement("div");
        actions.className = "manage-actions";

        const edit = document.createElement("button");
        edit.className = "edit-btn";
        edit.textContent = "Edit";
        edit.onclick = () => editNotes(note.id);

        const remove = document.createElement("button");
        remove.className = "delete-btn";
        remove.textContent = "Delete";
        remove.onclick = () => deleteNotes(note.id);

        actions.append(edit, remove);
        item.append(info, actions);

        list.appendChild(item);
    });
}

/* =====================================
   EDIT CHAPTER NOTES
===================================== */

async function editNotes(id) {

    if (!isAdmin) return;

    const papers = await getAllPapers();
    const note = papers.find(p => String(p.id) === String(id));

    if (!note || note.type !== "notes") return;

    document.getElementById("notesEditId").value = note.id;

    document.getElementById("notesChapterNumber").value =
        note.chapterNumber;

    document.getElementById("notesChapterName").value =
        note.chapterName;

    document.getElementById("notesFormHeading").textContent =
        "Edit Chapter Notes";

    document.getElementById("saveNotesBtn").textContent =
        "Update Notes";

    document.getElementById("cancelNotesEditBtn")
        .classList.remove("hidden");

    document.getElementById("notesForm")
        .scrollIntoView({behavior: "smooth"});
}

/* =====================================
   DELETE CHAPTER NOTES
===================================== */

async function deleteNotes(id) {

    if (!isAdmin) return;

    const confirmDelete = confirm(
        "Are you sure you want to delete these Chapter Notes?"
    );

    if (!confirmDelete) return;

    try {

        await deletePaperFromDB(id);

        alert("Chapter Notes deleted successfully!");

        await loadPapers();
        resetNotesForm();

    } catch(error) {

        console.error(error);
        alert("Could not delete Chapter Notes.");

    }
}

/* =====================================
   RESET NOTES FORM
===================================== */

function resetNotesForm() {

    document.getElementById("notesForm").reset();

    document.getElementById("notesEditId").value = "";

    document.getElementById("notesFormHeading").textContent =
        "Add Chapter Notes";

    document.getElementById("saveNotesBtn").textContent =
        "Save Notes";

    document.getElementById("cancelNotesEditBtn")
        .classList.add("hidden");
}

document.getElementById("cancelNotesEditBtn")
    .onclick = resetNotesForm;

/* =====================================
   INITIALIZE
===================================== */

