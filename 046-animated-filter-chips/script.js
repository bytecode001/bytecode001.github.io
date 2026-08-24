/**
 * Chromaflow — Animated Filter Chips
 *
 * The gallery prefers the View Transition API and progressively falls back to
 * a Web Animations API implementation of the FLIP technique. If motion APIs are
 * unavailable—or the user requests reduced motion—the content updates instantly.
 */

(() => {
  "use strict";

  const FILTERS = Object.freeze({
    all: Object.freeze({ label: "all", count: 12 }),
    identity: Object.freeze({ label: "Identity", count: 3 }),
    digital: Object.freeze({ label: "Digital", count: 3 }),
    spatial: Object.freeze({ label: "Spatial", count: 3 }),
    motion: Object.freeze({ label: "Motion", count: 3 })
  });

  const filterList = document.querySelector("#filter-list");
  const gallery = document.querySelector("#gallery");
  const visibleCount = document.querySelector("#visible-count");
  const resultStatus = document.querySelector("#result-status");
  const engineLabel = document.querySelector("#engine-label");

  // Exit safely if the expected document structure is incomplete.
  if (!filterList || !gallery || !visibleCount || !resultStatus || !engineLabel) {
    return;
  }

  const chips = Array.from(filterList.querySelectorAll("button[data-filter]"));
  const cards = Array.from(gallery.querySelectorAll(".project-card[data-category]"));
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const supportsViewTransitions = typeof document.startViewTransition === "function";
  const supportsWebAnimations = typeof Element.prototype.animate === "function";

  const state = {
    activeFilter: "all",
    requestedFilter: "all",
    isAnimating: false
  };

  document.documentElement.classList.remove("no-js");
  document.documentElement.classList.add("js");

  /** Return true only for filter values defined by this application. */
  const isValidFilter = (value) =>
    Object.prototype.hasOwnProperty.call(FILTERS, value);

  /** Determine whether a card belongs in the requested result set. */
  const cardMatchesFilter = (card, filter) =>
    filter === "all" || card.dataset.category === filter;

  /** Wait for the browser to commit one visual frame before reading layout. */
  const nextFrame = () =>
    new Promise((resolve) => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
    });

  /**
   * Run a Web Animation and always resolve, including when a browser cancels it.
   * Cancelling completed animations removes their fill effect and avoids leaks.
   */
  const playAnimation = async (element, keyframes, options) => {
    const animation = element.animate(keyframes, options);

    try {
      await animation.finished;
    } catch {
      // Cancellation is a valid outcome when the document lifecycle changes.
    } finally {
      animation.cancel();
    }
  };

  /** Update which chip is exposed as selected to pointer and keyboard users. */
  const updateChipSelection = (filter) => {
    chips.forEach((chip) => {
      chip.setAttribute("aria-pressed", String(chip.dataset.filter === filter));
    });
  };

  /** Apply the actual DOM visibility state without creating unsafe markup. */
  const applyVisibility = (filter) => {
    cards.forEach((card) => {
      card.hidden = !cardMatchesFilter(card, filter);
    });
  };

  /** Announce the completed result set and update the visible counter. */
  const updateResultSummary = (filter) => {
    const filterData = FILTERS[filter];
    const count = filterData.count;
    const projectWord = count === 1 ? "project" : "projects";

    visibleCount.textContent = String(count).padStart(2, "0");
    resultStatus.textContent =
      filter === "all"
        ? `Showing all ${count} ${projectWord}.`
        : `Showing ${count} ${filterData.label} ${projectWord}.`;
  };

  /** Reflect the best currently available animation path in the interface. */
  const updateEngineLabel = () => {
    if (reducedMotionQuery.matches) {
      engineLabel.textContent = "Reduced motion";
      return;
    }

    if (supportsViewTransitions) {
      engineLabel.textContent = "View Transition API";
      return;
    }

    if (supportsWebAnimations) {
      engineLabel.textContent = "FLIP fallback";
      return;
    }

    engineLabel.textContent = "Instant fallback";
  };

  /**
   * Use the browser-native document transition. Stable CSS transition names let
   * the engine interpolate both position and size across the grid reflow.
   */
  const runNativeTransition = async (filter) => {
    const transition = document.startViewTransition(() => {
      applyVisibility(filter);
      updateResultSummary(filter);
    });

    try {
      await transition.finished;
    } catch {
      // A superseded or interrupted transition still leaves the DOM in a valid state.
    }
  };

  /**
   * Progressive fallback using a two-phase exit plus FLIP reflow:
   * 1. Fade outgoing cards while their grid positions are stable.
   * 2. Update visibility, invert surviving cards to their old coordinates,
   *    then animate survivors and new cards into the final layout together.
   */
  const runFlipTransition = async (filter) => {
    const currentlyVisible = cards.filter((card) => !card.hidden);
    const leaving = currentlyVisible.filter((card) => !cardMatchesFilter(card, filter));
    const staying = currentlyVisible.filter((card) => cardMatchesFilter(card, filter));
    const entering = cards.filter(
      (card) => card.hidden && cardMatchesFilter(card, filter)
    );

    const firstRects = new Map(
      staying.map((card) => [card, card.getBoundingClientRect()])
    );

    await Promise.all(
      leaving.map((card, index) =>
        playAnimation(
          card,
          [
            { opacity: 1, filter: "blur(0)", transform: "scale(1)" },
            {
              opacity: 0,
              filter: "blur(5px)",
              transform: "translateY(8px) scale(0.965)"
            }
          ],
          {
            duration: 190,
            delay: Math.min(index * 18, 72),
            easing: "cubic-bezier(0.4, 0, 1, 1)",
            fill: "both"
          }
        )
      )
    );

    applyVisibility(filter);
    updateResultSummary(filter);
    await nextFrame();

    const movementAnimations = staying.flatMap((card) => {
      const first = firstRects.get(card);
      const last = card.getBoundingClientRect();

      if (!first || last.width === 0 || last.height === 0) {
        return [];
      }

      const deltaX = first.left - last.left;
      const deltaY = first.top - last.top;
      const scaleX = first.width / last.width;
      const scaleY = first.height / last.height;
      const hasMeaningfulChange =
        Math.abs(deltaX) > 0.5 ||
        Math.abs(deltaY) > 0.5 ||
        Math.abs(scaleX - 1) > 0.005 ||
        Math.abs(scaleY - 1) > 0.005;

      if (!hasMeaningfulChange) {
        return [];
      }

      return [
        playAnimation(
          card,
          [
            {
              transformOrigin: "top left",
              transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`
            },
            {
              transformOrigin: "top left",
              transform: "translate(0, 0) scale(1, 1)"
            }
          ],
          {
            duration: 520,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            fill: "both"
          }
        )
      ];
    });

    const entranceAnimations = entering.map((card, index) =>
      playAnimation(
        card,
        [
          {
            opacity: 0,
            filter: "blur(7px)",
            transform: "translateY(22px) scale(0.96)"
          },
          {
            opacity: 1,
            filter: "blur(0)",
            transform: "translateY(0) scale(1)"
          }
        ],
        {
          duration: 470,
          delay: Math.min(index * 34, 170),
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both"
        }
      )
    );

    await Promise.all([...movementAnimations, ...entranceAnimations]);
  };

  /** Select the appropriate motion path and keep ARIA busy state accurate. */
  const transitionTo = async (filter) => {
    gallery.setAttribute("aria-busy", "true");

    try {
      if (reducedMotionQuery.matches) {
        applyVisibility(filter);
        updateResultSummary(filter);
      } else if (supportsViewTransitions) {
        await runNativeTransition(filter);
      } else if (supportsWebAnimations) {
        await runFlipTransition(filter);
      } else {
        applyVisibility(filter);
        updateResultSummary(filter);
      }
    } finally {
      gallery.setAttribute("aria-busy", "false");
    }
  };

  /**
   * Process the latest requested filter serially. If a user clicks rapidly,
   * intermediate requests are skipped and the final intent is preserved.
   */
  const processFilterQueue = async () => {
    if (state.isAnimating) {
      return;
    }

    state.isAnimating = true;

    try {
      while (state.activeFilter !== state.requestedFilter) {
        const targetFilter = state.requestedFilter;
        await transitionTo(targetFilter);
        state.activeFilter = targetFilter;
      }
    } finally {
      state.isAnimating = false;
    }
  };

  /** Validate a user request before updating selection or DOM state. */
  const requestFilter = (filter) => {
    if (!isValidFilter(filter)) {
      return;
    }

    state.requestedFilter = filter;
    updateChipSelection(filter);
    void processFilterQueue();
  };

  filterList.addEventListener("click", (event) => {
    const chip = event.target.closest("button[data-filter]");

    if (!chip || !filterList.contains(chip)) {
      return;
    }

    requestFilter(chip.dataset.filter);
  });

  // Arrow keys make the horizontal chip group faster to navigate.
  filterList.addEventListener("keydown", (event) => {
    const currentIndex = chips.indexOf(document.activeElement);

    if (currentIndex === -1) {
      return;
    }

    const keyActions = {
      ArrowRight: () => (currentIndex + 1) % chips.length,
      ArrowDown: () => (currentIndex + 1) % chips.length,
      ArrowLeft: () => (currentIndex - 1 + chips.length) % chips.length,
      ArrowUp: () => (currentIndex - 1 + chips.length) % chips.length,
      Home: () => 0,
      End: () => chips.length - 1
    };

    const getNextIndex = keyActions[event.key];

    if (!getNextIndex) {
      return;
    }

    event.preventDefault();
    chips[getNextIndex()].focus();
  });

  // Keep the capability label correct if the OS preference changes at runtime.
  if (typeof reducedMotionQuery.addEventListener === "function") {
    reducedMotionQuery.addEventListener("change", updateEngineLabel);
  } else if (typeof reducedMotionQuery.addListener === "function") {
    // Legacy Safari exposes MediaQueryList.addListener instead.
    reducedMotionQuery.addListener(updateEngineLabel);
  }

  updateEngineLabel();
})();
