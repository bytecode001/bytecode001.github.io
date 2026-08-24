(() => {
  "use strict";

  /* Cache the stable DOM references once. No dynamic HTML is injected. */
  const scroller = document.querySelector("#stories");
  const cards = Array.from(document.querySelectorAll(".story-card"));
  const dots = Array.from(document.querySelectorAll(".story-dot"));
  const previousButton = document.querySelector("#previous-story");
  const nextButton = document.querySelector("#next-story");
  const counter = document.querySelector("#current-counter");
  const progress = document.querySelector("#story-progress");
  const progressLabel = document.querySelector("#progress-label");
  const announcer = document.querySelector("#story-announcer");
  const enhancementStatus = document.querySelector("#enhancement-status");

  const requiredElements = [
    scroller,
    previousButton,
    nextButton,
    counter,
    progress,
    progressLabel,
    announcer,
  ];

  /* Exit safely if the static markup is incomplete or has been customized. */
  if (requiredElements.some((element) => !element) || cards.length === 0) {
    return;
  }

  document.documentElement.classList.remove("no-js");
  document.documentElement.classList.add("js");

  const storyCount = cards.length;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  const intersectionRatios = new Map();

  let activeIndex = 0;
  let hasInitialized = false;
  let userHasInteracted = false;
  let scrollFrame = 0;

  const clamp = (value, minimum, maximum) =>
    Math.min(Math.max(value, minimum), maximum);

  const formatIndex = (index) => String(index + 1).padStart(2, "0");

  const getStoryTitle = (index) =>
    cards[index]?.dataset.title || `Story ${index + 1}`;

  /**
   * Synchronize every active-state representation from one source of truth.
   * The CSS scroll-state query remains a native visual enhancement; this state
   * also powers controls, accessibility metadata, and unsupported browsers.
   */
  const setActiveStory = (requestedIndex, shouldAnnounce = true) => {
    const nextIndex = clamp(requestedIndex, 0, storyCount - 1);
    const changed = nextIndex !== activeIndex;

    activeIndex = nextIndex;

    cards.forEach((card, index) => {
      card.classList.toggle("is-active", index === activeIndex);
    });

    dots.forEach((dot, index) => {
      const isCurrent = index === activeIndex;
      dot.classList.toggle("is-active", isCurrent);

      if (isCurrent) {
        dot.setAttribute("aria-current", "step");
      } else {
        dot.removeAttribute("aria-current");
      }
    });

    previousButton.disabled = activeIndex === 0;
    nextButton.disabled = activeIndex === storyCount - 1;
    counter.textContent = formatIndex(activeIndex);

    const currentPosition = activeIndex + 1;
    const progressRatio = currentPosition / storyCount;
    progress.style.setProperty("--story-progress", String(progressRatio));
    progress.setAttribute("aria-valuenow", String(currentPosition));
    progressLabel.textContent = `Story ${currentPosition} of ${storyCount}`;

    if (changed && hasInitialized && shouldAnnounce && userHasInteracted) {
      announcer.textContent = `Story ${currentPosition} of ${storyCount}: ${getStoryTitle(activeIndex)}`;
    }

    hasInitialized = true;
  };

  /* Native scrolling preserves touch, trackpad, and browser snap behavior. */
  const navigateToStory = (requestedIndex, shouldFocusScroller = false) => {
    const nextIndex = clamp(requestedIndex, 0, storyCount - 1);
    const target = cards[nextIndex];

    if (!target) {
      return;
    }

    userHasInteracted = true;
    setActiveStory(nextIndex);
    target.scrollIntoView({
      behavior: reducedMotion.matches ? "auto" : "smooth",
      block: "nearest",
      inline: "start",
    });

    if (shouldFocusScroller) {
      scroller.focus({ preventScroll: true });
    }
  };

  /* Find the card closest to the rail's leading snap edge. */
  const findNearestStory = () => {
    const scrollerRect = scroller.getBoundingClientRect();
    const styles = window.getComputedStyle(scroller);
    const scrollPadding = Number.parseFloat(styles.scrollPaddingInlineStart) || 0;
    const snapEdge = scrollerRect.left + scrollPadding;

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const distance = Math.abs(card.getBoundingClientRect().left - snapEdge);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  };

  /* IntersectionObserver is the primary active-card detector. */
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          intersectionRatios.set(entry.target, entry.intersectionRatio);
        });

        const mostVisible = cards.reduce(
          (best, card, index) => {
            const ratio = intersectionRatios.get(card) || 0;
            return ratio > best.ratio ? { index, ratio } : best;
          },
          { index: activeIndex, ratio: 0 },
        );

        if (mostVisible.ratio >= 0.48) {
          setActiveStory(mostVisible.index);
        }
      },
      {
        root: scroller,
        threshold: [0.25, 0.48, 0.65, 0.82, 0.95],
      },
    );

    cards.forEach((card) => observer.observe(card));
  } else {
    /* Geometry-based fallback for older engines without IntersectionObserver. */
    scroller.addEventListener(
      "scroll",
      () => {
        if (scrollFrame) {
          return;
        }

        scrollFrame = window.requestAnimationFrame(() => {
          scrollFrame = 0;
          setActiveStory(findNearestStory());
        });
      },
      { passive: true },
    );
  }

  previousButton.addEventListener("click", () => {
    navigateToStory(activeIndex - 1);
  });

  nextButton.addEventListener("click", () => {
    navigateToStory(activeIndex + 1);
  });

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const targetIndex = Number.parseInt(dot.dataset.storyTarget || "", 10);

      if (Number.isInteger(targetIndex)) {
        navigateToStory(targetIndex);
      }
    });
  });

  /* Support arrows, Page Up/Down, Home, and End when the rail is focused. */
  scroller.addEventListener("keydown", (event) => {
    const keyActions = {
      ArrowLeft: () => navigateToStory(activeIndex - 1),
      ArrowRight: () => navigateToStory(activeIndex + 1),
      PageUp: () => navigateToStory(activeIndex - 1),
      PageDown: () => navigateToStory(activeIndex + 1),
      Home: () => navigateToStory(0),
      End: () => navigateToStory(storyCount - 1),
    };
    const action = keyActions[event.key];

    if (!action || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    event.preventDefault();
    userHasInteracted = true;
    action();
  });

  scroller.addEventListener(
    "pointerdown",
    () => {
      userHasInteracted = true;
    },
    { passive: true },
  );

  /* Re-evaluate the nearest snap target after responsive layout changes. */
  window.addEventListener(
    "resize",
    () => {
      if (scrollFrame) {
        window.cancelAnimationFrame(scrollFrame);
      }

      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        setActiveStory(findNearestStory(), false);
      });
    },
    { passive: true },
  );

  /* Report whether the experimental native active-state enhancement is present. */
  if (
    enhancementStatus &&
    window.CSS?.supports("container-type", "scroll-state")
  ) {
    enhancementStatus.textContent = "Scroll-state enhanced";
  }

  setActiveStory(0, false);
})();
