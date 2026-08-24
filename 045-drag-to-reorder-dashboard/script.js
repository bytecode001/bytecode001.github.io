(() => {
  "use strict";

  /* ---------- Stable application configuration ---------- */
  const STORAGE_KEY = "aeris.dashboard.card-order.v1";
  const CARD_CLASS = "dashboard-card";
  const INTERACTIVE_SELECTOR =
    "button, a, input, select, textarea, label, [contenteditable='true']";
  const POINTER_THRESHOLD = 6;
  const FLIP_DURATION = 260;

  const grid = document.querySelector("#dashboard-grid");
  const resetButton = document.querySelector("#reset-layout");
  const toast = document.querySelector("#toast");
  const dragStatus = document.querySelector("#drag-status");
  const timeElement = document.querySelector("#live-time");
  const dateElement = document.querySelector("#today-label");
  const greetingElement = document.querySelector("#greeting");
  const agendaDayElement = document.querySelector("#agenda-day-label");

  if (!(grid instanceof HTMLElement)) {
    return;
  }

  const getCards = () =>
    Array.from(grid.children).filter(
      (child) => child instanceof HTMLElement && child.classList.contains(CARD_CLASS),
    );

  const DEFAULT_ORDER = Object.freeze(
    getCards().map((card) => card.dataset.cardId).filter(Boolean),
  );
  const VALID_CARD_IDS = new Set(DEFAULT_ORDER);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const layoutAnimations = new WeakMap();

  let pointerSession = null;
  let keyboardSession = null;
  let toastTimer = 0;

  /* ---------- Safe local persistence ---------- */
  function isValidOrder(order) {
    return (
      Array.isArray(order) &&
      order.length === DEFAULT_ORDER.length &&
      order.every((id) => typeof id === "string" && VALID_CARD_IDS.has(id)) &&
      new Set(order).size === DEFAULT_ORDER.length
    );
  }

  function parseStoredOrder(rawValue) {
    if (typeof rawValue !== "string") {
      return null;
    }

    try {
      const parsed = JSON.parse(rawValue);
      return isValidOrder(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function loadOrder() {
    try {
      return parseStoredOrder(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function saveOrder() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(getCards().map((card) => card.dataset.cardId)),
      );
      return true;
    } catch {
      return false;
    }
  }

  function removeStoredOrder() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  /* ---------- FLIP layout animation ---------- */
  function stopLayoutAnimations(cards = getCards()) {
    cards.forEach((card) => {
      const animation = layoutAnimations.get(card);

      if (animation) {
        animation.cancel();
        layoutAnimations.delete(card);
      }
    });
  }

  function capturePositions(cards = getCards()) {
    // Read the cards at their current on-screen positions before cancelling
    // an interrupted FLIP animation. Cancelling first would expose the final
    // layout for one frame and create a visible flash during fast dragging.
    const positions = new Map(
      cards.map((card) => [card, card.getBoundingClientRect()]),
    );
    stopLayoutAnimations(cards);
    return positions;
  }

  function animateFrom(firstPositions, skippedCard = null) {
    if (reducedMotion.matches) {
      return;
    }

    getCards().forEach((card) => {
      if (card === skippedCard || !firstPositions.has(card)) {
        return;
      }

      const first = firstPositions.get(card);
      const last = card.getBoundingClientRect();
      const deltaX = first.left - last.left;
      const deltaY = first.top - last.top;

      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
        return;
      }

      const animation = card.animate(
        [
          { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
          { transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration: FLIP_DURATION,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      );

      layoutAnimations.set(card, animation);
      animation.addEventListener(
        "finish",
        () => {
          if (layoutAnimations.get(card) === animation) {
            layoutAnimations.delete(card);
          }
        },
        { once: true },
      );
    });
  }

  function mutateWithFlip(mutation, skippedCard = null) {
    const firstPositions = capturePositions();
    mutation();
    animateFrom(firstPositions, skippedCard);
  }

  function applyOrder(order, animate = false) {
    if (!isValidOrder(order)) {
      return false;
    }

    const cardsById = new Map(getCards().map((card) => [card.dataset.cardId, card]));
    const mutation = () => {
      order.forEach((id) => {
        const card = cardsById.get(id);
        if (card) {
          grid.append(card);
        }
      });
    };

    if (animate) {
      mutateWithFlip(mutation);
    } else {
      mutation();
    }

    return true;
  }

  /* ---------- User feedback ---------- */
  function announce(message) {
    if (dragStatus instanceof HTMLElement) {
      dragStatus.textContent = "";
      window.requestAnimationFrame(() => {
        dragStatus.textContent = message;
      });
    }
  }

  function showToast(message) {
    if (!(toast instanceof HTMLElement)) {
      return;
    }

    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2400);
  }

  function cardTitle(card) {
    return card.dataset.cardTitle || "Card";
  }

  function cardPosition(card) {
    return getCards().indexOf(card) + 1;
  }

  /* ---------- Pointer-driven sorting ---------- */
  function createDragGhost(card, rect) {
    const ghost = card.cloneNode(true);

    if (!(ghost instanceof HTMLElement)) {
      return null;
    }

    ghost.classList.remove("is-placeholder", "is-keyboard-dragging");
    ghost.classList.add("drag-ghost");
    ghost.removeAttribute("data-card-id");
    ghost.removeAttribute("data-card-title");
    ghost.setAttribute("aria-hidden", "true");
    ghost.inert = true;

    ghost.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
    ghost.querySelectorAll("button, input, a").forEach((element) => {
      if (element instanceof HTMLElement) {
        element.tabIndex = -1;
      }
    });

    Object.assign(ghost.style, {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });

    document.body.append(ghost);
    return ghost;
  }

  function activatePointerDrag(session) {
    const ghost = createDragGhost(session.card, session.startRect);

    if (!ghost) {
      return false;
    }

    session.active = true;
    session.ghost = ghost;
    session.card.classList.add("is-placeholder");
    session.handle.setAttribute("aria-pressed", "true");
    grid.classList.add("is-sorting");
    document.body.classList.add("is-dragging");

    if (resetButton instanceof HTMLButtonElement) {
      resetButton.disabled = true;
    }

    announce(
      `${cardTitle(session.card)} picked up. Current position ${cardPosition(session.card)} of ${DEFAULT_ORDER.length}.`,
    );
    return true;
  }

  function closestSlotIndex(x, y) {
    const gridRect = grid.getBoundingClientRect();
    const edgeTolerance = 56;
    const isInsideGrid =
      x >= gridRect.left - edgeTolerance &&
      x <= gridRect.right + edgeTolerance &&
      y >= gridRect.top - edgeTolerance &&
      y <= gridRect.bottom + edgeTolerance;

    if (!isInsideGrid) {
      return null;
    }

    let nearestIndex = null;
    let shortestDistance = Number.POSITIVE_INFINITY;

    // Including the placeholder creates stable physical slots and prevents
    // the dragged card from oscillating between neighboring positions.
    getCards().forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const deltaX = (x - (rect.left + rect.width / 2)) / Math.max(rect.width, 1);
      const deltaY = (y - (rect.top + rect.height / 2)) / Math.max(rect.height, 1);
      const distance = deltaX * deltaX + deltaY * deltaY;

      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }

  function reorderPointerCard(session, destinationIndex) {
    const cards = getCards();
    const draggedIndex = cards.indexOf(session.card);

    if (
      draggedIndex < 0 ||
      destinationIndex < 0 ||
      destinationIndex >= cards.length ||
      draggedIndex === destinationIndex
    ) {
      return;
    }

    const targetCard = cards[destinationIndex];
    const referenceNode =
      destinationIndex > draggedIndex ? targetCard.nextElementSibling : targetCard;

    if (referenceNode === session.card) {
      return;
    }

    mutateWithFlip(() => grid.insertBefore(session.card, referenceNode), session.card);
  }

  function autoScrollViewport(pointerY) {
    const edgeSize = Math.min(96, window.innerHeight * 0.16);
    const maximumStep = 18;
    let scrollStep = 0;

    if (pointerY < edgeSize) {
      const intensity = Math.min(1, Math.max(0, 1 - pointerY / edgeSize));
      scrollStep = -maximumStep * intensity;
    } else if (pointerY > window.innerHeight - edgeSize) {
      const intensity = Math.min(
        1,
        Math.max(0, 1 - (window.innerHeight - pointerY) / edgeSize),
      );
      scrollStep = maximumStep * intensity;
    }

    if (Math.abs(scrollStep) < 0.5) {
      return false;
    }

    const previousScrollY = window.scrollY;
    window.scrollBy({ top: scrollStep, left: 0, behavior: "auto" });
    return Math.abs(window.scrollY - previousScrollY) > 0.5;
  }

  function renderPointerDrag(session) {
    session.frameId = 0;

    if (!session.active || !(session.ghost instanceof HTMLElement)) {
      return;
    }

    const deltaX = session.latestX - session.startX;
    const deltaY = session.latestY - session.startY;
    const rotation = Math.max(-1.6, Math.min(1.6, deltaX / 180));

    session.ghost.style.transform =
      `translate3d(${deltaX}px, ${deltaY}px, 0) rotate(${rotation}deg) scale(1.015)`;

    const destinationIndex = closestSlotIndex(session.latestX, session.latestY);
    if (destinationIndex !== null) {
      reorderPointerCard(session, destinationIndex);
    }

    if (autoScrollViewport(session.latestY)) {
      schedulePointerRender(session);
    }
  }

  function schedulePointerRender(session) {
    if (!session.frameId) {
      session.frameId = window.requestAnimationFrame(() => renderPointerDrag(session));
    }
  }

  function settleGhost(session, targetRect, onComplete) {
    const ghost = session.ghost;

    if (!(ghost instanceof HTMLElement) || reducedMotion.matches) {
      onComplete();
      return;
    }

    const currentRect = ghost.getBoundingClientRect();
    let completed = false;

    const finish = () => {
      if (completed) {
        return;
      }
      completed = true;
      window.clearTimeout(fallbackTimer);
      onComplete();
    };

    Object.assign(ghost.style, {
      transition: "none",
      transform: "none",
      top: `${currentRect.top}px`,
      left: `${currentRect.left}px`,
      width: `${currentRect.width}px`,
      height: `${currentRect.height}px`,
    });

    // Force the initial style to commit before transitioning to the destination.
    void ghost.offsetWidth;

    ghost.style.transition =
      "top 220ms cubic-bezier(0.22, 1, 0.36, 1), left 220ms cubic-bezier(0.22, 1, 0.36, 1), width 220ms cubic-bezier(0.22, 1, 0.36, 1), height 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease";
    ghost.style.top = `${targetRect.top}px`;
    ghost.style.left = `${targetRect.left}px`;
    ghost.style.width = `${targetRect.width}px`;
    ghost.style.height = `${targetRect.height}px`;
    ghost.style.opacity = "0.2";

    ghost.addEventListener("transitionend", finish, { once: true });
    const fallbackTimer = window.setTimeout(finish, 270);
  }

  function finishPointerDrag(shouldCommit) {
    const session = pointerSession;

    if (!session || session.finalizing) {
      return;
    }

    session.finalizing = true;

    if (session.frameId) {
      window.cancelAnimationFrame(session.frameId);
      session.frameId = 0;
    }

    try {
      if (session.captureElement.hasPointerCapture(session.pointerId)) {
        session.captureElement.releasePointerCapture(session.pointerId);
      }
    } catch {
      // Pointer capture can already be released by the browser during cancellation.
    }

    if (!session.active) {
      pointerSession = null;
      return;
    }

    if (!shouldCommit) {
      applyOrder(session.originalOrder, true);
    }

    const destination = session.card.getBoundingClientRect();
    const finalPosition = cardPosition(session.card);
    const storageSucceeded = shouldCommit ? saveOrder() : true;
    pointerSession = null;

    const cleanup = () => {
      session.ghost?.remove();
      session.card.classList.remove("is-placeholder");
      session.handle.setAttribute("aria-pressed", "false");
      grid.classList.remove("is-sorting");
      document.body.classList.remove("is-dragging");

      if (resetButton instanceof HTMLButtonElement) {
        resetButton.disabled = false;
      }

      session.handle.focus({ preventScroll: true });

      if (shouldCommit) {
        const savedMessage = storageSucceeded
          ? "Layout saved on this device."
          : "Card moved, but local storage is unavailable.";
        announce(
          `${cardTitle(session.card)} dropped at position ${finalPosition} of ${DEFAULT_ORDER.length}. ${savedMessage}`,
        );
        showToast(savedMessage);
      } else {
        announce(`${cardTitle(session.card)} returned to its original position.`);
        showToast("Reordering cancelled.");
      }
    };

    settleGhost(session, destination, cleanup);
  }

  function onPointerDown(event) {
    if (
      pointerSession ||
      keyboardSession ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }

    const pointedElement = event.target instanceof Element ? event.target : null;
    const card = pointedElement?.closest(`.${CARD_CLASS}`);
    const handle =
      card instanceof HTMLElement ? card.querySelector(".drag-handle") : null;
    const pointedHandle = pointedElement?.closest(".drag-handle");
    const startedFromHandle = pointedHandle === handle;
    const startedFromInteractiveElement = Boolean(
      pointedElement?.closest(INTERACTIVE_SELECTOR),
    );

    if (
      !(handle instanceof HTMLButtonElement) ||
      !(card instanceof HTMLElement) ||
      card.parentElement !== grid ||
      (startedFromInteractiveElement && !startedFromHandle) ||
      (event.pointerType === "touch" && !startedFromHandle)
    ) {
      return;
    }

    if (startedFromHandle) {
      handle.focus({ preventScroll: true });
    }

    try {
      // Capture on the stable grid, not on the card that moves in the DOM.
      // This keeps one uninterrupted pointer stream across every reorder.
      grid.setPointerCapture(event.pointerId);
    } catch {
      return;
    }

    if (event.pointerType === "mouse" || event.pointerType === "pen") {
      event.preventDefault();
    }

    pointerSession = {
      active: false,
      finalizing: false,
      pointerId: event.pointerId,
      captureElement: grid,
      handle,
      card,
      startX: event.clientX,
      startY: event.clientY,
      latestX: event.clientX,
      latestY: event.clientY,
      startRect: card.getBoundingClientRect(),
      originalOrder: getCards().map((item) => item.dataset.cardId),
      ghost: null,
      frameId: 0,
    };
  }

  function onPointerMove(event) {
    const session = pointerSession;

    if (!session || session.pointerId !== event.pointerId || session.finalizing) {
      return;
    }

    session.latestX = event.clientX;
    session.latestY = event.clientY;

    if (!session.active) {
      const distance = Math.hypot(
        session.latestX - session.startX,
        session.latestY - session.startY,
      );

      if (distance < POINTER_THRESHOLD || !activatePointerDrag(session)) {
        return;
      }
    }

    event.preventDefault();
    schedulePointerRender(session);
  }

  function onPointerUp(event) {
    if (!pointerSession || pointerSession.pointerId !== event.pointerId) {
      return;
    }

    if (pointerSession.active) {
      event.preventDefault();
    }
    finishPointerDrag(true);
  }

  function onPointerCancel(event) {
    if (pointerSession?.pointerId === event.pointerId) {
      finishPointerDrag(false);
    }
  }

  function onLostPointerCapture(event) {
    if (
      pointerSession?.pointerId === event.pointerId &&
      !pointerSession.finalizing
    ) {
      finishPointerDrag(false);
    }
  }

  /* ---------- Keyboard sorting ---------- */
  function startKeyboardDrag(card, handle) {
    keyboardSession = {
      card,
      handle,
      originalOrder: getCards().map((item) => item.dataset.cardId),
    };

    card.classList.add("is-keyboard-dragging");
    handle.setAttribute("aria-pressed", "true");

    if (resetButton instanceof HTMLButtonElement) {
      resetButton.disabled = true;
    }

    announce(
      `${cardTitle(card)} picked up. Position ${cardPosition(card)} of ${DEFAULT_ORDER.length}. Use arrow keys to move.`,
    );
  }

  function moveKeyboardCard(targetIndex) {
    const session = keyboardSession;

    if (!session) {
      return;
    }

    const cards = getCards();
    const currentIndex = cards.indexOf(session.card);
    const boundedIndex = Math.max(0, Math.min(cards.length - 1, targetIndex));

    if (currentIndex === boundedIndex) {
      announce(
        `${cardTitle(session.card)} is already at position ${currentIndex + 1} of ${cards.length}.`,
      );
      return;
    }

    const targetCard = cards[boundedIndex];
    const referenceNode =
      boundedIndex > currentIndex ? targetCard.nextElementSibling : targetCard;

    mutateWithFlip(() => grid.insertBefore(session.card, referenceNode));
    announce(
      `${cardTitle(session.card)} moved to position ${cardPosition(session.card)} of ${cards.length}.`,
    );
  }

  function finishKeyboardDrag(shouldCommit) {
    const session = keyboardSession;

    if (!session) {
      return;
    }

    keyboardSession = null;

    if (!shouldCommit) {
      applyOrder(session.originalOrder, true);
    }

    session.card.classList.remove("is-keyboard-dragging");
    session.handle.setAttribute("aria-pressed", "false");

    if (resetButton instanceof HTMLButtonElement) {
      resetButton.disabled = false;
    }

    session.handle.focus({ preventScroll: true });

    if (shouldCommit) {
      const storageSucceeded = saveOrder();
      const savedMessage = storageSucceeded
        ? "Layout saved on this device."
        : "Card moved, but local storage is unavailable.";
      announce(
        `${cardTitle(session.card)} dropped at position ${cardPosition(session.card)} of ${DEFAULT_ORDER.length}. ${savedMessage}`,
      );
      showToast(savedMessage);
    } else {
      announce(`${cardTitle(session.card)} returned to its original position.`);
      showToast("Reordering cancelled.");
    }
  }

  function onHandleKeyDown(event) {
    const handle = event.currentTarget;
    const card = handle instanceof Element ? handle.closest(`.${CARD_CLASS}`) : null;

    if (!(handle instanceof HTMLButtonElement) || !(card instanceof HTMLElement)) {
      return;
    }

    const isToggleKey = event.key === "Enter" || event.key === " ";

    if (isToggleKey) {
      event.preventDefault();

      if (!keyboardSession) {
        startKeyboardDrag(card, handle);
      } else if (keyboardSession.card === card) {
        finishKeyboardDrag(true);
      }
      return;
    }

    if (!keyboardSession || keyboardSession.card !== card) {
      return;
    }

    const currentIndex = getCards().indexOf(card);

    switch (event.key) {
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        moveKeyboardCard(currentIndex - 1);
        break;
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        moveKeyboardCard(currentIndex + 1);
        break;
      case "Home":
        event.preventDefault();
        moveKeyboardCard(0);
        break;
      case "End":
        event.preventDefault();
        moveKeyboardCard(DEFAULT_ORDER.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        finishKeyboardDrag(false);
        break;
      default:
        break;
    }
  }

  /* ---------- Clock and general controls ---------- */
  function updateDateAndTime() {
    const now = new Date();

    if (timeElement instanceof HTMLTimeElement) {
      timeElement.dateTime = now.toISOString();
      timeElement.textContent = new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(now);
    }

    if (dateElement instanceof HTMLElement) {
      dateElement.textContent = new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(now);
    }

    if (agendaDayElement instanceof HTMLElement) {
      agendaDayElement.textContent = new Intl.DateTimeFormat(undefined, {
        weekday: "long",
      }).format(now);
    }

    if (greetingElement instanceof HTMLElement) {
      const hour = now.getHours();
      greetingElement.textContent =
        hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    }
  }

  function resetLayout() {
    if (pointerSession || keyboardSession) {
      return;
    }

    const alreadyDefault = DEFAULT_ORDER.every(
      (id, index) => getCards()[index]?.dataset.cardId === id,
    );
    const storageSucceeded = removeStoredOrder();

    if (!alreadyDefault) {
      applyOrder(DEFAULT_ORDER, true);
    }

    const message = storageSucceeded
      ? alreadyDefault
        ? "The default layout is already active."
        : "Default layout restored."
      : "Layout restored for this session; local storage is unavailable.";

    announce(message);
    showToast(message);
  }

  /* ---------- Initialization ---------- */
  const savedOrder = loadOrder();
  if (savedOrder) {
    applyOrder(savedOrder);
  }

  getCards().forEach((card) => {
    const handle = card.querySelector(".drag-handle");

    if (!(handle instanceof HTMLButtonElement)) {
      return;
    }

    handle.addEventListener("keydown", onHandleKeyDown);
  });

  // Event delegation keeps pointer capture attached to an element that never
  // changes position, so cards can cross any number of grid slots in one drag.
  grid.addEventListener("pointerdown", onPointerDown);
  grid.addEventListener("pointermove", onPointerMove);
  grid.addEventListener("pointerup", onPointerUp);
  grid.addEventListener("pointercancel", onPointerCancel);
  grid.addEventListener("lostpointercapture", onLostPointerCapture);

  resetButton?.addEventListener("click", resetLayout);
  updateDateAndTime();
  window.setInterval(updateDateAndTime, 30_000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateDateAndTime();
    }
  });

  // Keep separate tabs synchronized without trusting arbitrary stored values.
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || pointerSession || keyboardSession) {
      return;
    }

    const nextOrder = event.newValue === null ? [...DEFAULT_ORDER] : parseStoredOrder(event.newValue);
    if (nextOrder) {
      applyOrder(nextOrder, true);
      showToast("Layout updated from another tab.");
    }
  });
})();
