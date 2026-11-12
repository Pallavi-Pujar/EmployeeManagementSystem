const apiUrl = "/api/employees";

const form = document.getElementById("employee-form");
const formTitle = document.getElementById("form-title");
const formHint = document.getElementById("form-hint");
const formMessage = document.getElementById("form-message");
const submitButton = document.getElementById("submit-button");
const cancelButton = document.getElementById("cancel-button");
const rows = document.getElementById("employee-rows");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search");

const fields = {
    name: document.getElementById("name"),
    email: document.getElementById("email"),
    department: document.getElementById("department"),
    salary: document.getElementById("salary")
};

let employees = [];
let editingId = null;

searchInput.addEventListener("input", renderTable);
cancelButton.addEventListener("click", resetForm);
form.addEventListener("submit", saveEmployee);

loadEmployees();

async function loadEmployees() {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error("The server could not load employees");
        }
        employees = await response.json();
        renderSummary();
        renderTable();
    } catch (error) {
        showMessage(error.message + ". Start the Spring Boot app and check the MySQL password.", true);
    }
}

function renderSummary() {
    const departments = new Set(employees.map((employee) => employee.department.toLowerCase()));
    const payroll = employees.reduce((total, employee) => total + Number(employee.salary), 0);
    document.getElementById("stat-count").textContent = String(employees.length);
    document.getElementById("stat-departments").textContent = String(departments.size);
    document.getElementById("stat-payroll").textContent = formatMoney(payroll);
}

function renderTable() {
    const query = searchInput.value.trim().toLowerCase();
    const visible = employees.filter((employee) => {
        const haystack = [employee.id, employee.name, employee.email, employee.department].join(" ").toLowerCase();
        return haystack.includes(query);
    });

    rows.replaceChildren();
    emptyState.hidden = visible.length > 0;
    emptyState.textContent = employees.length === 0
        ? "No employees yet. Add the first record with the form."
        : "No employees match that search.";

    for (const employee of visible) {
        const row = document.createElement("tr");
        row.append(
            cell(String(employee.id)),
            cell(employee.name),
            cell(employee.email),
            cell(employee.department),
            cell(formatMoney(employee.salary))
        );

        const actions = document.createElement("td");
        actions.className = "actions";
        actions.append(actionButton("Edit", () => startEdit(employee)), actionButton("Delete", () => removeEmployee(employee), true));
        row.append(actions);
        rows.append(row);
    }
}

function cell(text) {
    const item = document.createElement("td");
    item.textContent = text;
    return item;
}

function actionButton(label, onClick, danger) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = danger ? "link danger" : "link";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
}

async function saveEmployee(event) {
    event.preventDefault();
    const payload = {
        name: fields.name.value.trim(),
        email: fields.email.value.trim(),
        department: fields.department.value.trim(),
        salary: Number(fields.salary.value)
    };
    const updating = editingId !== null;

    submitButton.disabled = true;
    try {
        const response = await fetch(updating ? `${apiUrl}/${editingId}` : apiUrl, {
            method: updating ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            showMessage(body.message || "Could not save the employee", true);
            return;
        }
        showMessage(updating ? "Employee updated." : "Employee added.", false);
        resetForm();
        await loadEmployees();
    } catch (error) {
        showMessage("Could not reach the server.", true);
    } finally {
        submitButton.disabled = false;
    }
}

function startEdit(employee) {
    editingId = employee.id;
    fields.name.value = employee.name;
    fields.email.value = employee.email;
    fields.department.value = employee.department;
    fields.salary.value = employee.salary;
    formTitle.textContent = `Update employee ${employee.id}`;
    formHint.textContent = "Saving replaces the current details for this ID.";
    submitButton.textContent = "Update employee";
    cancelButton.hidden = false;
    fields.name.focus();
}

async function removeEmployee(employee) {
    if (!window.confirm(`Delete ${employee.name}? This cannot be undone.`)) {
        return;
    }
    try {
        const response = await fetch(`${apiUrl}/${employee.id}`, { method: "DELETE" });
        if (!response.ok && response.status !== 204) {
            const body = await response.json().catch(() => ({}));
            showMessage(body.message || "Could not delete the employee", true);
            return;
        }
        if (editingId === employee.id) {
            resetForm();
        }
        showMessage("Employee deleted.", false);
        await loadEmployees();
    } catch (error) {
        showMessage("Could not reach the server.", true);
    }
}

function resetForm() {
    form.reset();
    editingId = null;
    formTitle.textContent = "Add employee";
    formHint.textContent = "Employee ID is created automatically.";
    submitButton.textContent = "Save employee";
    cancelButton.hidden = true;
}

function showMessage(text, isError) {
    formMessage.textContent = text;
    formMessage.className = isError ? "message error" : "message ok";
}

function formatMoney(value) {
    return Number(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
