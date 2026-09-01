"use strict";

/**
 * Relay dependency checklist
 * The task catalogue is immutable; only completed task IDs are persisted.
 */
const PHASES = [
  {
    id: "foundation", number: "01", title: "Foundation", subtitle: "Define the scope and establish the project baseline", color: "#c8f056",
    tasks: [
      { id: "brief", title: "Create project brief", description: "Define the project goals, audience and key success metrics.", requires: [] },
      { id: "stakeholders", title: "Confirm stakeholders", description: "Identify decision-makers and establish the approval workflow.", requires: ["brief"] },
      { id: "requirements", title: "Gather requirements", description: "Document functional, content and technical requirements.", requires: ["brief", "stakeholders"] },
      { id: "scope", title: "Approve project scope", description: "Lock deliverables, constraints and the delivery timeline.", requires: ["requirements"] }
    ]
  },
  {
    id: "build", number: "02", title: "Design & build", subtitle: "Turn the approved direction into a working experience", color: "#6d8dff",
    tasks: [
      { id: "wireframes", title: "Create wireframes", description: "Map core screens, hierarchy and user journeys.", requires: ["scope"] },
      { id: "content", title: "Prepare final content", description: "Write, review and approve production-ready content.", requires: ["scope"] },
      { id: "ui", title: "Design user interface", description: "Build the visual system and high-fidelity screens.", requires: ["wireframes"] },
      { id: "development", title: "Develop website", description: "Implement responsive components and interactions.", requires: ["ui", "content"] },
      { id: "qa", title: "Quality assurance", description: "Test accessibility, performance and browser compatibility.", requires: ["development"] }
    ]
  },
  {
    id: "launch", number: "03", title: "Launch", subtitle: "Validate the release and bring the project live", color: "#aa82ff",
    tasks: [
      { id: "approval", title: "Final stakeholder approval", description: "Collect sign-off on the production-ready experience.", requires: ["qa"] },
      { id: "deploy", title: "Deploy to production", description: "Publish the approved release and verify the environment.", requires: ["approval"] },
      { id: "handoff", title: "Complete project handoff", description: "Deliver documentation, assets and ownership details.", requires: ["deploy"] }
    ]
  }
];

const STORAGE_KEY = "relay-checklist-v1";
const THEME_KEY = "relay-theme-v1";
const allTasks = PHASES.flatMap((phase) => phase.tasks);
const taskById = new Map(allTasks.map((task) => [task.id, task]));
let completed = loadCompleted();
let activeFilter = "all";
let toastTimer;

const elements = {
  taskList: document.querySelector("#task-list"), progressCount: document.querySelector("#progress-count"),
  progressPercent: document.querySelector("#progress-percent"), mainProgressBar: document.querySelector("#main-progress-bar"),
  progressbar: document.querySelector("[role='progressbar']"), sidebarProgress: document.querySelector("#sidebar-progress"),
  sidebarProgressBar: document.querySelector("#sidebar-progress-bar"), nextTask: document.querySelector("#next-task"),
  nextUp: document.querySelector("#next-up"), savedState: document.querySelector("#saved-state"),
  dependencyDialog: document.querySelector("#dependency-dialog"), dependencyMap: document.querySelector("#dependency-map"),
  confirmDialog: document.querySelector("#confirm-dialog"), sidebar: document.querySelector(".sidebar"),
  menuButton: document.querySelector("#mobile-menu"), toast: document.querySelector("#toast"),
  toastMessage: document.querySelector("#toast-message")
};

function loadCompleted() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return new Set(Array.isArray(data) ? data.filter((id) => taskById.has(id)) : []);
  } catch (error) {
    console.warn("Stored checklist data could not be read.", error);
    return new Set();
  }
}

function isAvailable(task) { return task.requires.every((id) => completed.has(id)); }
function statusOf(task) { return completed.has(task.id) ? "completed" : isAvailable(task) ? "available" : "locked"; }

function persist() {
  elements.savedState.classList.add("saving");
  elements.savedState.lastChild.textContent = " Saving…";
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed])); }
  catch (error) { console.warn("Progress could not be saved.", error); }
  window.setTimeout(() => {
    elements.savedState.classList.remove("saving");
    elements.savedState.lastChild.textContent = " Saved locally";
  }, 320);
}

function makeIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "m5 12 4 4L19 6"); svg.append(path); return svg;
}

function buildTask(task) {
  const status = statusOf(task);
  const article = document.createElement("article");
  article.className = `task ${status}`; article.dataset.status = status;

  const check = document.createElement("button");
  check.className = "task-check"; check.type = "button"; check.dataset.taskId = task.id;
  check.disabled = status === "locked";
  check.setAttribute("aria-label", status === "completed" ? `Mark ${task.title} incomplete` : status === "locked" ? `${task.title} is locked` : `Complete ${task.title}`);
  check.setAttribute("aria-pressed", String(status === "completed")); check.append(makeIcon());

  const copy = document.createElement("div"); copy.className = "task-copy";
  const title = document.createElement("h3"); title.textContent = task.title;
  const description = document.createElement("p"); description.textContent = task.description;
  copy.append(title, description);

  if (task.requires.length) {
    const requirements = document.createElement("div"); requirements.className = "requirements";
    const label = document.createElement("span"); label.className = "requires-label"; label.textContent = "Requires"; requirements.append(label);
    task.requires.forEach((id) => {
      const pill = document.createElement("span"); pill.className = `requirement-pill${completed.has(id) ? " met" : ""}`;
      pill.textContent = taskById.get(id).title; requirements.append(pill);
    });
    copy.append(requirements);
  }

  const badge = document.createElement("span"); badge.className = "task-status";
  badge.textContent = status === "completed" ? "Done" : status === "available" ? "Ready" : "Locked";
  article.append(check, copy, badge);
  return article;
}

function buildPhaseHeader(phase, done) {
  const header = document.createElement("header"); header.className = "phase-header";
  const titleWrap = document.createElement("div"); titleWrap.className = "phase-title";
  const number = document.createElement("span"); number.className = "phase-number"; number.textContent = phase.number;
  const copy = document.createElement("div");
  const title = document.createElement("h2"); title.textContent = phase.title;
  const subtitle = document.createElement("p"); subtitle.textContent = phase.subtitle;
  copy.append(title, subtitle); titleWrap.append(number, copy);

  const meta = document.createElement("div"); meta.className = "phase-meta";
  const count = document.createElement("span"); count.textContent = `${done}/${phase.tasks.length} complete`;
  const track = document.createElement("span"); track.className = "phase-mini-track";
  const fill = document.createElement("i"); fill.style.width = `${(done / phase.tasks.length) * 100}%`;
  track.append(fill); meta.append(count, track); header.append(titleWrap, meta);
  return header;
}

function render() {
  elements.taskList.replaceChildren();
  let visibleTasks = 0;
  PHASES.forEach((phase) => {
    const matching = phase.tasks.filter((task) => activeFilter === "all" || statusOf(task) === activeFilter);
    if (!matching.length) return;
    visibleTasks += matching.length;
    const section = document.createElement("section"); section.className = "phase"; section.style.setProperty("--phase-color", phase.color);
    const done = phase.tasks.filter((task) => completed.has(task.id)).length;
    section.append(buildPhaseHeader(phase, done));
    const list = document.createElement("div"); list.className = "tasks";
    matching.forEach((task) => list.append(buildTask(task))); section.append(list); elements.taskList.append(section);
  });
  if (!visibleTasks) {
    const empty = document.createElement("div"); empty.className = "empty-state";
    const strong = document.createElement("strong"); strong.textContent = "Nothing here yet";
    const span = document.createElement("span"); span.textContent = `No tasks match the ${activeFilter} filter.`;
    empty.append(strong, span); elements.taskList.append(empty);
  }
  updateSummary(); renderMap();
}

function updateSummary() {
  const done = completed.size; const percent = Math.round((done / allTasks.length) * 100);
  elements.progressCount.textContent = `${done} of ${allTasks.length} tasks`;
  elements.progressPercent.textContent = `${percent}%`; elements.sidebarProgress.textContent = `${percent}%`;
  elements.mainProgressBar.style.width = `${percent}%`; elements.sidebarProgressBar.style.width = `${percent}%`;
  elements.progressbar.setAttribute("aria-valuenow", String(percent));

  const next = allTasks.find((task) => !completed.has(task.id) && isAvailable(task));
  elements.nextTask.textContent = next ? next.title : done === allTasks.length ? "Project complete" : "Finish prerequisites";
  elements.nextUp.classList.toggle("complete", done === allTasks.length);

  const counts = { all: allTasks.length, available: 0, locked: 0, completed: done };
  allTasks.forEach((task) => { if (!completed.has(task.id)) counts[statusOf(task)] += 1; });
  Object.entries(counts).forEach(([key, value]) => { document.querySelector(`#${key}-count`).textContent = value; });
}

function toggleTask(taskId) {
  const task = taskById.get(taskId); if (!task || (!completed.has(taskId) && !isAvailable(task))) return;
  if (completed.has(taskId)) {
    const dependents = getCompletedDependents(taskId);
    dependents.forEach((id) => completed.delete(id)); completed.delete(taskId);
    showToast(dependents.length ? `Task reopened; ${dependents.length} dependent task${dependents.length > 1 ? "s" : ""} reset` : "Task reopened");
  } else {
    completed.add(taskId); showToast(`${task.title} completed`);
  }
  persist(); render();
}

function getCompletedDependents(rootId) {
  const affected = new Set(); let changed = true;
  while (changed) {
    changed = false;
    allTasks.forEach((task) => {
      if (completed.has(task.id) && !affected.has(task.id) && task.requires.some((id) => id === rootId || affected.has(id))) {
        affected.add(task.id); changed = true;
      }
    });
  }
  return affected;
}

function renderMap() {
  elements.dependencyMap.replaceChildren();
  PHASES.forEach((phase) => {
    const column = document.createElement("section"); column.className = "map-phase"; column.style.setProperty("--phase-color", phase.color);
    const heading = document.createElement("h3"); const dot = document.createElement("i"); heading.append(dot, document.createTextNode(phase.title)); column.append(heading);
    phase.tasks.forEach((task) => {
      const node = document.createElement("div"); node.className = `map-node ${completed.has(task.id) ? "done" : statusOf(task)}`;
      node.append(document.createTextNode(task.title));
      if (task.requires.length) { const small = document.createElement("small"); small.textContent = `After: ${task.requires.map((id) => taskById.get(id).title).join(" + ")}`; node.append(small); }
      column.append(node);
    });
    elements.dependencyMap.append(column);
  });
}

function showToast(message) {
  window.clearTimeout(toastTimer); elements.toastMessage.textContent = message; elements.toast.classList.add("show");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

elements.taskList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-task-id]"); if (button) toggleTask(button.dataset.taskId);
});
document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach((item) => { const active = item === button; item.classList.toggle("active", active); item.setAttribute("aria-pressed", String(active)); });
  render();
}));

function openMap() { elements.dependencyDialog.showModal(); }
document.querySelector("#map-button").addEventListener("click", openMap);
document.querySelector("#open-dependency-map").addEventListener("click", openMap);
document.querySelector("#dialog-close").addEventListener("click", () => elements.dependencyDialog.close());
document.querySelector("#reset-button").addEventListener("click", () => elements.confirmDialog.showModal());
document.querySelector("#cancel-reset").addEventListener("click", () => elements.confirmDialog.close());
document.querySelector("#confirm-reset").addEventListener("click", () => { completed.clear(); persist(); render(); elements.confirmDialog.close(); showToast("All progress has been reset"); });

elements.menuButton.addEventListener("click", () => {
  const open = elements.sidebar.classList.toggle("open"); elements.menuButton.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", (event) => {
  if (window.innerWidth <= 740 && elements.sidebar.classList.contains("open") && !elements.sidebar.contains(event.target) && !elements.menuButton.contains(event.target)) {
    elements.sidebar.classList.remove("open"); elements.menuButton.setAttribute("aria-expanded", "false");
  }
});

const preferredTheme = localStorage.getItem(THEME_KEY) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
document.documentElement.dataset.theme = preferredTheme;
document.querySelector("#theme-toggle").addEventListener("click", () => {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme; localStorage.setItem(THEME_KEY, theme);
});

[elements.dependencyDialog, elements.confirmDialog].forEach((dialog) => dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
}));

render();
