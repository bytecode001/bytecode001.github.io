(() => {
  "use strict";

  /* ---------- Configuration ---------- */
  const STORAGE_KEY = "northstar-project-intake:v1";
  const STORAGE_VERSION = 1;
  const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
  const STEP_IDS = Object.freeze(["contact", "project", "planning", "review"]);
  const STEP_TITLES = Object.freeze(["About you", "The project", "The plan", "Review"]);
  const SAVED_FIELD_NAMES = Object.freeze([
    "fullName",
    "email",
    "company",
    "projectType",
    "projectName",
    "projectBrief",
    "timeline",
    "targetDate",
    "budget",
    "nda"
  ]);

  /*
   * Explicit transitions keep navigation predictable. A state may move forward
   * only after validation, while already unlocked earlier steps remain editable.
   */
  const TRANSITIONS = Object.freeze({
    contact: new Set(["project"]),
    project: new Set(["contact", "planning", "review"]),
    planning: new Set(["contact", "project", "review"]),
    review: new Set(["contact", "project", "planning", "success"]),
    success: new Set(["contact"])
  });

  const DISPLAY_VALUES = Object.freeze({
    projectType: Object.freeze({
      website: "Website",
      product: "Digital product",
      brand: "Brand system"
    }),
    timeline: Object.freeze({
      "2-4-weeks": "2–4 weeks",
      "1-2-months": "1–2 months",
      "3-plus-months": "3+ months",
      flexible: "Flexible"
    }),
    budget: Object.freeze({
      "under-5k": "Under €5k",
      "5k-10k": "€5k–€10k",
      "10k-25k": "€10k–€25k",
      discuss: "Let’s discuss"
    })
  });

  /* ---------- DOM references ---------- */
  const form = document.querySelector("#multiStepForm");
  const formSteps = Array.from(form.querySelectorAll("[data-step]"));
  const stepButtons = Array.from(document.querySelectorAll("[data-step-target]"));
  const editButtons = Array.from(document.querySelectorAll("[data-edit-step]"));
  const formActions = document.querySelector("#formActions");
  const nextButton = document.querySelector("#nextButton");
  const backButton = document.querySelector("#backButton");
  const submitButton = document.querySelector("#submitButton");
  const saveDraftButton = document.querySelector("#saveDraftButton");
  const startAgainButton = document.querySelector("#startAgainButton");
  const successState = document.querySelector("#successState");
  const progressBar = document.querySelector("#progressBar");
  const progressFill = document.querySelector("#progressFill");
  const progressPercent = document.querySelector("#progressPercent");
  const mobileProgressLabel = document.querySelector("#mobileProgressLabel");
  const mobileProgressTitle = document.querySelector("#mobileProgressTitle");
  const saveState = document.querySelector(".save-state");
  const saveStatus = document.querySelector("#saveStatus");
  const briefInput = document.querySelector("#projectBrief");
  const briefCount = document.querySelector("#briefCount");
  const targetDate = document.querySelector("#targetDate");
  const restoreDialog = document.querySelector("#restoreDialog");
  const restoreTimestamp = document.querySelector("#restoreTimestamp");
  const restoreDraftButton = document.querySelector("#restoreDraftButton");
  const discardDraftButton = document.querySelector("#discardDraftButton");

  const summaryTargets = Object.freeze({
    fullName: document.querySelector("#summaryName"),
    email: document.querySelector("#summaryEmail"),
    company: document.querySelector("#summaryCompany"),
    projectType: document.querySelector("#summaryProjectType"),
    projectName: document.querySelector("#summaryProjectName"),
    projectBrief: document.querySelector("#summaryBrief"),
    timeline: document.querySelector("#summaryTimeline"),
    targetDate: document.querySelector("#summaryDate"),
    budget: document.querySelector("#summaryBudget"),
    nda: document.querySelector("#summaryNda")
  });

  const state = {
    currentStep: 0,
    maxUnlockedStep: 0,
    mode: "editing",
    saveTimer: 0,
    pendingDraft: null
  };

  /* ---------- Storage helpers ---------- */
  function readStorage() {
    try {
      const rawDraft = window.sessionStorage.getItem(STORAGE_KEY);
      if (!rawDraft) return null;

      const parsedDraft = JSON.parse(rawDraft);
      if (!isValidDraftEnvelope(parsedDraft)) {
        window.sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return parsedDraft;
    } catch {
      setSaveStatus("Session save unavailable", "error");
      return null;
    }
  }

  function writeStorage(draft) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      return true;
    } catch {
      setSaveStatus("Session save unavailable", "error");
      return false;
    }
  }

  function clearStorage() {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage can be blocked by browser privacy settings; the form still works.
    }
  }

  function isValidDraftEnvelope(draft) {
    if (!draft || typeof draft !== "object" || Array.isArray(draft)) return false;
    if (draft.version !== STORAGE_VERSION || !Number.isFinite(draft.savedAt)) return false;
    if (Date.now() - draft.savedAt > DRAFT_TTL_MS || draft.savedAt > Date.now() + 60_000) {
      return false;
    }
    if (!draft.data || typeof draft.data !== "object" || Array.isArray(draft.data)) return false;
    if (!Number.isInteger(draft.currentStep) || draft.currentStep < 0 || draft.currentStep > 3) {
      return false;
    }
    if (
      !Number.isInteger(draft.maxUnlockedStep) ||
      draft.maxUnlockedStep < 0 ||
      draft.maxUnlockedStep > 3
    ) {
      return false;
    }
    return draft.currentStep <= draft.maxUnlockedStep;
  }

  function hasMeaningfulData(data) {
    return SAVED_FIELD_NAMES.some((name) => {
      const value = data[name];
      return typeof value === "boolean" ? value : typeof value === "string" && value.trim() !== "";
    });
  }

  function collectFormData() {
    const data = Object.create(null);

    for (const name of SAVED_FIELD_NAMES) {
      if (name === "projectType" || name === "budget") {
        const checked = form.querySelector(`input[name="${name}"]:checked`);
        data[name] = checked ? checked.value : "";
        continue;
      }

      const control = form.elements.namedItem(name);
      if (control instanceof HTMLInputElement && control.type === "checkbox") {
        data[name] = control.checked;
      } else if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement
      ) {
        data[name] = control.value;
      }
    }

    return data;
  }

  function applyFormData(data) {
    for (const name of SAVED_FIELD_NAMES) {
      if (!Object.prototype.hasOwnProperty.call(data, name)) continue;

      const rawValue = data[name];
      if (name === "projectType" || name === "budget") {
        const allowedValues = Object.keys(DISPLAY_VALUES[name]);
        if (typeof rawValue === "string" && allowedValues.includes(rawValue)) {
          const radio = form.querySelector(`input[name="${name}"][value="${rawValue}"]`);
          if (radio instanceof HTMLInputElement) radio.checked = true;
        }
        continue;
      }

      const control = form.elements.namedItem(name);
      if (control instanceof HTMLInputElement && control.type === "checkbox") {
        control.checked = rawValue === true;
      } else if (
        (control instanceof HTMLInputElement ||
          control instanceof HTMLSelectElement ||
          control instanceof HTMLTextAreaElement) &&
        typeof rawValue === "string"
      ) {
        control.value = rawValue.slice(0, control.maxLength > 0 ? control.maxLength : 500);
      }
    }

    updateBriefCount();
  }

  function createDraft() {
    return {
      version: STORAGE_VERSION,
      savedAt: Date.now(),
      currentStep: state.currentStep,
      maxUnlockedStep: state.maxUnlockedStep,
      data: collectFormData()
    };
  }

  function saveDraft({ announce = false } = {}) {
    if (state.mode !== "editing") return;
    window.clearTimeout(state.saveTimer);
    setSaveStatus("Saving draft…", "saving");

    const draft = createDraft();
    if (writeStorage(draft)) {
      const savedTime = new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit"
      }).format(draft.savedAt);
      setSaveStatus(announce ? `Draft saved at ${savedTime}` : `Saved at ${savedTime}`, "saved");
    }
  }

  function scheduleDraftSave() {
    if (state.mode !== "editing") return;
    window.clearTimeout(state.saveTimer);
    setSaveStatus("Saving draft…", "saving");
    state.saveTimer = window.setTimeout(() => saveDraft(), 350);
  }

  function setSaveStatus(message, status = "idle") {
    saveStatus.textContent = message;
    saveState.classList.toggle("is-saved", status === "saved");
    saveState.classList.toggle("is-saving", status === "saving");
    saveState.classList.toggle("is-error", status === "error");
  }

  /* ---------- Constraint validation ---------- */
  function getValidationMessage(control) {
    const label = getControlLabel(control);

    if (control.validity.valueMissing && control.type === "radio") {
      return control.name === "budget"
        ? "Choose an estimated budget."
        : "Choose the project type that fits best.";
    }
    if (control.validity.valueMissing) return `Please complete ${label}.`;
    if (control.validity.typeMismatch && control.type === "email") {
      return "Enter a valid email address, such as name@company.com.";
    }
    if (control.validity.tooShort) {
      return `Use at least ${control.minLength} characters for ${label}.`;
    }
    if (control.validity.tooLong) {
      return `${label} is longer than the allowed limit.`;
    }
    if (control.validity.rangeUnderflow && control.type === "date") {
      return "Choose today or a future date.";
    }
    if (control.validity.badInput) return `Enter a valid value for ${label}.`;
    return `Please check ${label}.`;
  }

  function getControlLabel(control) {
    const explicitLabel = document.querySelector(`label[for="${control.id}"]`);
    if (explicitLabel) {
      return explicitLabel.textContent.replace("*", "").replace("Optional", "").trim().toLowerCase();
    }

    if (control.name === "projectType") return "a project type";
    if (control.name === "budget") return "an estimated budget";
    return "this field";
  }

  function getErrorTarget(control) {
    const errorId = control.getAttribute("aria-errormessage") || `${control.name}Error`;
    return document.getElementById(errorId);
  }

  function markInvalid(control) {
    const isRadio = control.type === "radio";
    const wrapper = isRadio ? control.closest(".choice-group") : control.closest(".field, .confirm-wrap");
    const errorTarget = getErrorTarget(control);

    if (wrapper) wrapper.classList.add("has-error");
    if (errorTarget) errorTarget.textContent = getValidationMessage(control);

    if (isRadio) {
      form.querySelectorAll(`input[name="${control.name}"]`).forEach((radio) => {
        radio.setAttribute("aria-invalid", "true");
      });
    } else {
      control.setAttribute("aria-invalid", "true");
    }
  }

  function clearInvalid(control) {
    const isRadio = control.type === "radio";
    const wrapper = isRadio ? control.closest(".choice-group") : control.closest(".field, .confirm-wrap");
    const errorTarget = getErrorTarget(control);

    if (wrapper) wrapper.classList.remove("has-error");
    if (errorTarget) errorTarget.textContent = "";

    if (isRadio) {
      form.querySelectorAll(`input[name="${control.name}"]`).forEach((radio) => {
        radio.removeAttribute("aria-invalid");
      });
    } else {
      control.removeAttribute("aria-invalid");
    }
  }

  function validateStep(stepIndex, { focusInvalid = true } = {}) {
    const step = formSteps[stepIndex];
    const controls = Array.from(step.querySelectorAll("input, select, textarea"));
    const checkedRadioGroups = new Set();
    let firstInvalid = null;

    for (const control of controls) {
      if (control.disabled) continue;

      if (control.type === "radio") {
        if (checkedRadioGroups.has(control.name)) continue;
        checkedRadioGroups.add(control.name);
      }

      if (!control.checkValidity()) {
        markInvalid(control);
        firstInvalid ||= control;
      } else {
        clearInvalid(control);
      }
    }

    if (firstInvalid && focusInvalid) firstInvalid.focus({ preventScroll: false });
    return !firstInvalid;
  }

  function findFirstInvalidStep({ includeReview = true } = {}) {
    const stepLimit = includeReview ? formSteps.length : formSteps.length - 1;
    for (let index = 0; index < stepLimit; index += 1) {
      if (!validateStep(index, { focusInvalid: false })) return index;
    }
    return -1;
  }

  function handleControlFeedback(control) {
    if (control.type === "radio") {
      const checked = form.querySelector(`input[name="${control.name}"]:checked`);
      if (checked) clearInvalid(control);
      return;
    }

    if (control.getAttribute("aria-invalid") === "true" && control.checkValidity()) {
      clearInvalid(control);
    }
  }

  function clearAllErrors() {
    form.querySelectorAll(".has-error").forEach((wrapper) => wrapper.classList.remove("has-error"));
    form.querySelectorAll("[aria-invalid]").forEach((control) => control.removeAttribute("aria-invalid"));
    form.querySelectorAll(".field__error").forEach((error) => {
      error.textContent = "";
    });
  }

  /* ---------- State machine and rendering ---------- */
  function canTransition(targetState) {
    const sourceState = state.mode === "success" ? "success" : STEP_IDS[state.currentStep];
    return TRANSITIONS[sourceState].has(targetState);
  }

  function transitionToStep(targetIndex, { force = false, moveFocus = true } = {}) {
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex > 3) return false;
    if (targetIndex > state.maxUnlockedStep) return false;

    const targetState = STEP_IDS[targetIndex];
    if (!force && targetIndex !== state.currentStep && !canTransition(targetState)) return false;

    state.currentStep = targetIndex;
    state.mode = "editing";
    render({ moveFocus });
    return true;
  }

  function render({ moveFocus = false } = {}) {
    const isSuccess = state.mode === "success";

    formSteps.forEach((step, index) => {
      step.hidden = isSuccess || index !== state.currentStep;
    });
    successState.hidden = !isSuccess;
    formActions.hidden = isSuccess;

    if (isSuccess) {
      setProgress(4, "Brief complete");
      stepButtons.forEach((button) => {
        button.disabled = true;
        button.classList.remove("is-active");
        button.classList.add("is-complete");
        button.removeAttribute("aria-current");
      });
      if (moveFocus) successState.focus();
      return;
    }

    const currentNumber = state.currentStep + 1;
    setProgress(currentNumber, `Step ${currentNumber} of 4`);
    mobileProgressLabel.textContent = `Step ${currentNumber} of 4`;
    mobileProgressTitle.textContent = STEP_TITLES[state.currentStep];

    stepButtons.forEach((button, index) => {
      const isActive = index === state.currentStep;
      const isComplete = index < state.currentStep || (index < state.maxUnlockedStep && !isActive);
      button.disabled = index > state.maxUnlockedStep;
      button.classList.toggle("is-active", isActive);
      button.classList.toggle("is-complete", isComplete);
      if (isActive) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });

    backButton.hidden = state.currentStep === 0;
    nextButton.hidden = state.currentStep === 3;
    submitButton.hidden = state.currentStep !== 3;
    nextButton.firstChild.textContent = state.currentStep === 2 ? "Review details " : "Continue ";

    if (state.currentStep === 3) renderSummary();

    if (moveFocus) {
      window.requestAnimationFrame(() => {
        formSteps[state.currentStep].querySelector("[data-stage-focus]")?.focus();
      });
    }
  }

  function setProgress(stepNumber, accessibleText) {
    const boundedStep = Math.min(Math.max(stepNumber, 1), 4);
    const percentage = Math.round((boundedStep / 4) * 100);
    progressFill.style.width = `${percentage}%`;
    progressPercent.textContent = `${percentage}%`;
    progressBar.setAttribute("aria-valuenow", String(boundedStep));
    progressBar.setAttribute("aria-valuetext", accessibleText);
  }

  function moveForward() {
    if (!validateStep(state.currentStep)) return;
    if (state.currentStep >= 3) return;

    const targetIndex = state.currentStep + 1;
    state.maxUnlockedStep = Math.max(state.maxUnlockedStep, targetIndex);
    transitionToStep(targetIndex, { moveFocus: true });
    saveDraft();
  }

  function moveBackward() {
    if (state.currentStep === 0) return;
    transitionToStep(state.currentStep - 1, { moveFocus: true });
    saveDraft();
  }

  function navigateFromProgress(targetIndex) {
    if (targetIndex === state.currentStep || targetIndex > state.maxUnlockedStep) return;

    if (targetIndex === 3) {
      const invalidStep = findFirstInvalidStep({ includeReview: false });
      if (invalidStep !== -1) {
        transitionToStep(invalidStep, { force: true, moveFocus: true });
        validateStep(invalidStep);
        return;
      }
    } else if (targetIndex > state.currentStep && !validateStep(state.currentStep)) {
      return;
    }

    transitionToStep(targetIndex, { force: true, moveFocus: true });
    saveDraft();
  }

  /* ---------- Summary ---------- */
  function renderSummary() {
    const data = collectFormData();

    setSummaryText(summaryTargets.fullName, data.fullName);
    setSummaryText(summaryTargets.email, data.email);
    setSummaryText(summaryTargets.company, data.company || "Not provided");
    setSummaryText(summaryTargets.projectType, DISPLAY_VALUES.projectType[data.projectType]);
    setSummaryText(summaryTargets.projectName, data.projectName);
    setSummaryText(summaryTargets.projectBrief, data.projectBrief);
    setSummaryText(summaryTargets.timeline, DISPLAY_VALUES.timeline[data.timeline]);
    setSummaryText(summaryTargets.targetDate, formatDate(data.targetDate));
    setSummaryText(summaryTargets.budget, DISPLAY_VALUES.budget[data.budget]);
    setSummaryText(summaryTargets.nda, data.nda ? "Required" : "Not required");
  }

  function setSummaryText(target, value) {
    // textContent prevents restored or typed values from being interpreted as HTML.
    target.textContent = typeof value === "string" && value.trim() ? value.trim() : "—";
  }

  function formatDate(dateValue) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return "—";
    const [year, month, day] = dateValue.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  /* ---------- Session recovery ---------- */
  function offerDraftRecovery(draft) {
    state.pendingDraft = draft;
    const relativeTime = formatRelativeTime(draft.savedAt);
    restoreTimestamp.textContent = relativeTime;

    if (typeof restoreDialog.showModal === "function") {
      restoreDialog.showModal();
    } else {
      restoreDialog.setAttribute("open", "");
    }
  }

  function restoreDraft() {
    const draft = state.pendingDraft;
    if (!draft) return;

    form.reset();
    clearAllErrors();
    applyFormData(draft.data);
    state.currentStep = draft.currentStep;
    state.maxUnlockedStep = draft.maxUnlockedStep;
    state.mode = "editing";
    form.elements.namedItem("consent").checked = false;
    closeRestoreDialog();
    render({ moveFocus: true });
    setSaveStatus(`Draft restored ${formatRelativeTime(draft.savedAt)}`, "saved");
    state.pendingDraft = null;
  }

  function discardDraft() {
    clearStorage();
    state.pendingDraft = null;
    closeRestoreDialog();
    resetJourney({ moveFocus: true });
  }

  function closeRestoreDialog() {
    if (typeof restoreDialog.close === "function" && restoreDialog.open) {
      restoreDialog.close();
    } else {
      restoreDialog.removeAttribute("open");
    }
  }

  function formatRelativeTime(timestamp) {
    const elapsedSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (elapsedSeconds < 60) return "just now";
    const elapsedMinutes = Math.round(elapsedSeconds / 60);
    if (elapsedMinutes < 60) return `${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
    const elapsedHours = Math.round(elapsedMinutes / 60);
    return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
  }

  /* ---------- Completion and reset ---------- */
  function submitJourney(event) {
    event.preventDefault();
    if (state.currentStep !== 3 || state.mode !== "editing") return;

    const invalidStep = findFirstInvalidStep();
    if (invalidStep !== -1) {
      transitionToStep(invalidStep, { force: true, moveFocus: true });
      validateStep(invalidStep);
      return;
    }

    submitButton.disabled = true;
    submitButton.firstChild.textContent = "Preparing brief ";

    window.setTimeout(() => {
      clearStorage();
      state.mode = "success";
      state.maxUnlockedStep = 3;
      submitButton.disabled = false;
      submitButton.firstChild.textContent = "Confirm brief ";
      setSaveStatus("Session draft cleared", "saved");
      render({ moveFocus: true });
    }, 550);
  }

  function resetJourney({ moveFocus = false } = {}) {
    window.clearTimeout(state.saveTimer);
    form.reset();
    clearAllErrors();
    state.currentStep = 0;
    state.maxUnlockedStep = 0;
    state.mode = "editing";
    setDateMinimum();
    updateBriefCount();
    setSaveStatus("Draft not saved yet", "idle");
    render({ moveFocus });
  }

  function setDateMinimum() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    targetDate.min = `${year}-${month}-${day}`;
  }

  function updateBriefCount() {
    briefCount.textContent = `${briefInput.value.length} / ${briefInput.maxLength}`;
  }

  /* ---------- Event wiring ---------- */
  nextButton.addEventListener("click", moveForward);
  backButton.addEventListener("click", moveBackward);
  saveDraftButton.addEventListener("click", () => saveDraft({ announce: true }));
  startAgainButton.addEventListener("click", () => {
    clearStorage();
    resetJourney({ moveFocus: true });
  });
  restoreDraftButton.addEventListener("click", restoreDraft);
  discardDraftButton.addEventListener("click", discardDraft);
  form.addEventListener("submit", submitJourney);

  form.addEventListener(
    "invalid",
    (event) => {
      // Suppress native bubbles so one consistent accessible message is shown.
      event.preventDefault();
    },
    true
  );

  form.addEventListener("input", (event) => {
    if (!(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
      return;
    }
    handleControlFeedback(event.target);
    if (event.target === briefInput) updateBriefCount();
    scheduleDraftSave();
  });

  form.addEventListener("change", (event) => {
    if (
      !(event.target instanceof HTMLInputElement) &&
      !(event.target instanceof HTMLSelectElement) &&
      !(event.target instanceof HTMLTextAreaElement)
    ) {
      return;
    }
    handleControlFeedback(event.target);
    scheduleDraftSave();
  });

  stepButtons.forEach((button) => {
    button.addEventListener("click", () => {
      navigateFromProgress(Number(button.dataset.stepTarget));
    });
  });

  editButtons.forEach((button) => {
    button.addEventListener("click", () => {
      transitionToStep(Number(button.dataset.editStep), { force: true, moveFocus: true });
      saveDraft();
    });
  });

  restoreDialog.addEventListener("cancel", (event) => {
    // Require an explicit restore/discard choice so a saved draft is not silently ignored.
    event.preventDefault();
  });

  window.addEventListener("pagehide", () => {
    if (state.mode === "editing" && hasMeaningfulData(collectFormData())) saveDraft();
  });

  /* ---------- Initialisation ---------- */
  setDateMinimum();
  updateBriefCount();
  render();

  const existingDraft = readStorage();
  if (existingDraft && hasMeaningfulData(existingDraft.data)) {
    offerDraftRecovery(existingDraft);
  }
})();
