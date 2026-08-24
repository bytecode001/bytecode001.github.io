"use strict";

/**
 * Magnetic CTA Playground
 *
 * A small spring-physics engine drives every button from one shared
 * requestAnimationFrame loop. Pointer input only updates targets; DOM writes
 * happen during the animation frame to avoid layout thrashing.
 */

(() => {
  const DEFAULTS = Object.freeze({
    strength: 28,
    radius: 180,
    spring: 14,
    damping: 82,
  });

  const EPSILON = 0.015;
  const MAX_FRAME_DELTA = 1 / 30;

  const playground = document.querySelector("[data-playground]");
  const targetElements = document.querySelectorAll("[data-magnetic-target]");
  const settingInputs = document.querySelectorAll("[data-setting]");
  const motionToggle = document.querySelector("[data-motion-toggle]");
  const resetButton = document.querySelector("[data-reset]");
  const motionStatus = document.querySelector("[data-motion-status]");
  const coordinateDisplay = document.querySelector("[data-coordinate-display]");
  const toast = document.querySelector("[data-toast]");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Exit safely if the required application structure is unavailable.
  if (
    !(playground instanceof HTMLElement) ||
    !(motionToggle instanceof HTMLInputElement) ||
    !(resetButton instanceof HTMLButtonElement) ||
    !(motionStatus instanceof HTMLElement) ||
    !(coordinateDisplay instanceof HTMLElement) ||
    !(toast instanceof HTMLElement)
  ) {
    return;
  }

  const settings = { ...DEFAULTS };
  let frameId = 0;
  let previousTime = 0;
  let toastTimer = 0;
  let motionEnabled = motionToggle.checked && !reducedMotionQuery.matches;

  /** Clamp untrusted numeric input to a known finite range. */
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  /** Parse a range value and constrain it to the element's declared limits. */
  const readRangeValue = (input) => {
    const value = Number.parseFloat(input.value);
    const min = Number.parseFloat(input.min);
    const max = Number.parseFloat(input.max);

    if (![value, min, max].every(Number.isFinite)) {
      return 0;
    }

    return clamp(value, min, max);
  };

  class MagneticButton {
    constructor(target) {
      this.target = target;
      this.button = target.querySelector("button");
      this.position = { x: 0, y: 0 };
      this.velocity = { x: 0, y: 0 };
      this.destination = { x: 0, y: 0 };
      this.engaged = false;
      this.rect = null;
    }

    isValid() {
      return this.button instanceof HTMLButtonElement;
    }

    measure() {
      this.rect = this.target.getBoundingClientRect();
    }

    setPointer(clientX, clientY) {
      if (!this.rect) {
        this.measure();
      }

      const centerX = this.rect.left + this.rect.width / 2;
      const centerY = this.rect.top + this.rect.height / 2;
      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);
      const radius = settings.radius;
      const isInsideField = distance < radius;

      if (isInsideField && motionEnabled) {
        // Ease the force near the edge so entering the field never jumps.
        const proximity = 1 - distance / radius;
        const pull = (settings.strength / 100) * (0.35 + proximity * 0.65);

        this.destination.x = deltaX * pull;
        this.destination.y = deltaY * pull;
        this.setEngaged(true);
      } else {
        this.release();
      }
    }

    setEngaged(value) {
      if (this.engaged === value) {
        return;
      }

      this.engaged = value;
      this.target.classList.toggle("is-engaged", value);
    }

    release() {
      this.destination.x = 0;
      this.destination.y = 0;
      this.setEngaged(false);
    }

    update(deltaTime) {
      if (!this.isValid()) {
        return false;
      }

      // Convert UI values into stable, frame-rate-independent spring factors.
      const step = deltaTime * 60;
      const springForce = settings.spring / 100;
      const dampingFactor = Math.pow(settings.damping / 100, step);

      this.velocity.x += (this.destination.x - this.position.x) * springForce * step;
      this.velocity.y += (this.destination.y - this.position.y) * springForce * step;
      this.velocity.x *= dampingFactor;
      this.velocity.y *= dampingFactor;
      this.position.x += this.velocity.x * step;
      this.position.y += this.velocity.y * step;

      const displacement = Math.hypot(
        this.destination.x - this.position.x,
        this.destination.y - this.position.y,
      );
      const speed = Math.hypot(this.velocity.x, this.velocity.y);
      const isMoving = displacement > EPSILON || speed > EPSILON;

      if (!isMoving && !this.engaged) {
        this.position.x = 0;
        this.position.y = 0;
        this.velocity.x = 0;
        this.velocity.y = 0;
      }

      this.button.style.setProperty("--magnetic-x", `${this.position.x.toFixed(3)}px`);
      this.button.style.setProperty("--magnetic-y", `${this.position.y.toFixed(3)}px`);

      return isMoving;
    }

    resetImmediately() {
      this.release();
      this.position.x = 0;
      this.position.y = 0;
      this.velocity.x = 0;
      this.velocity.y = 0;

      if (this.isValid()) {
        this.button.style.setProperty("--magnetic-x", "0px");
        this.button.style.setProperty("--magnetic-y", "0px");
      }
    }
  }

  const magneticButtons = Array.from(targetElements)
    .map((element) => new MagneticButton(element))
    .filter((instance) => instance.isValid());

  const requestAnimation = () => {
    if (frameId === 0 && motionEnabled) {
      frameId = window.requestAnimationFrame(animate);
    }
  };

  function animate(time) {
    const elapsed = previousTime ? (time - previousTime) / 1000 : 1 / 60;
    const deltaTime = clamp(elapsed, 0, MAX_FRAME_DELTA);
    previousTime = time;

    const animationNeeded = magneticButtons.reduce(
      (needed, button) => button.update(deltaTime) || needed,
      false,
    );

    if (animationNeeded && motionEnabled) {
      frameId = window.requestAnimationFrame(animate);
    } else {
      frameId = 0;
      previousTime = 0;
    }
  }

  const measureAll = () => {
    magneticButtons.forEach((button) => button.measure());
  };

  const releaseAll = () => {
    magneticButtons.forEach((button) => button.release());
    requestAnimation();
  };

  const resetMotionImmediately = () => {
    if (frameId !== 0) {
      window.cancelAnimationFrame(frameId);
    }

    frameId = 0;
    previousTime = 0;
    magneticButtons.forEach((button) => button.resetImmediately());
  };

  const formatOutput = (name, value) => {
    if (name === "strength" || name === "damping") {
      return `${value}%`;
    }

    if (name === "radius") {
      return `${value} px`;
    }

    return String(value);
  };

  const updateRangePresentation = (input) => {
    const name = input.dataset.setting;
    const value = readRangeValue(input);
    const min = Number.parseFloat(input.min);
    const max = Number.parseFloat(input.max);
    const progress = max === min ? 0 : ((value - min) / (max - min)) * 100;
    const output = document.querySelector(`[data-output="${name}"]`);

    if (name && Object.hasOwn(settings, name)) {
      settings[name] = value;
    }

    if (output instanceof HTMLOutputElement) {
      output.value = formatOutput(name, value);
    }

    input.style.setProperty("--range-progress", `${progress}%`);
  };

  const updateFieldVisualization = () => {
    magneticButtons.forEach((button) => {
      button.target.style.setProperty("--field-diameter", `${settings.radius * 2}px`);
    });
  };

  const syncMotionState = () => {
    motionEnabled = motionToggle.checked && !reducedMotionQuery.matches;
    motionStatus.textContent = reducedMotionQuery.matches
      ? "Reduced motion is respected"
      : motionEnabled
        ? "Motion is active"
        : "Motion is paused";

    if (!motionEnabled) {
      resetMotionImmediately();
    }
  };

  const showToast = (message) => {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");

    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 1800);
  };

  playground.addEventListener(
    "pointermove",
    (event) => {
      // Coarse touch pointers should retain native tap behavior without magnetism.
      if (!motionEnabled || event.pointerType === "touch") {
        return;
      }

      magneticButtons.forEach((button) => button.setPointer(event.clientX, event.clientY));

      const playgroundRect = playground.getBoundingClientRect();
      const localX = clamp(event.clientX - playgroundRect.left, 0, playgroundRect.width);
      const localY = clamp(event.clientY - playgroundRect.top, 0, playgroundRect.height);
      coordinateDisplay.textContent = `X ${String(Math.round(localX)).padStart(3, "0")} · Y ${String(
        Math.round(localY),
      ).padStart(3, "0")}`;

      requestAnimation();
    },
    { passive: true },
  );

  playground.addEventListener("pointerleave", releaseAll, { passive: true });

  magneticButtons.forEach((instance) => {
    instance.button.addEventListener("click", () => {
      const label = instance.button.querySelector(".magnetic-cta__label")?.textContent;
      showToast(`${label || "CTA"} — interaction confirmed`);
    });
  });

  settingInputs.forEach((element) => {
    if (!(element instanceof HTMLInputElement)) {
      return;
    }

    updateRangePresentation(element);

    element.addEventListener("input", () => {
      updateRangePresentation(element);

      if (element.dataset.setting === "radius") {
        updateFieldVisualization();
        measureAll();
      }

      requestAnimation();
    });
  });

  motionToggle.addEventListener("change", syncMotionState);

  resetButton.addEventListener("click", () => {
    settingInputs.forEach((element) => {
      if (!(element instanceof HTMLInputElement)) {
        return;
      }

      const name = element.dataset.setting;
      if (name && Object.hasOwn(DEFAULTS, name)) {
        element.value = String(DEFAULTS[name]);
        updateRangePresentation(element);
      }
    });

    motionToggle.checked = true;
    updateFieldVisualization();
    syncMotionState();
    measureAll();
    showToast("Playground reset to defaults");
  });

  reducedMotionQuery.addEventListener("change", syncMotionState);
  window.addEventListener("resize", measureAll, { passive: true });
  window.addEventListener("blur", releaseAll);

  // Initial geometry and UI state are prepared once after the DOM is available.
  updateFieldVisualization();
  syncMotionState();
  measureAll();
})();
