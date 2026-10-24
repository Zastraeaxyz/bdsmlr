import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { confirmAge, hasConfirmedAge } from "~/lib/ageGate";

export function AgeGate() {
  const [visible, setVisible] = createSignal(false);
  let previousOverflow = "";

  const unlockScroll = () => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = previousOverflow;
    }
  };

  onMount(() => {
    if (hasConfirmedAge()) return;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setVisible(true);
    onCleanup(unlockScroll);
  });

  const accept = () => {
    confirmAge();
    unlockScroll();
    setVisible(false);
  };

  return (
    <Show when={visible()}>
      <div
        class="age-gate"
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-gate-title"
        aria-describedby="age-gate-description"
      >
        <div class="age-gate-card">
          <span class="age-gate-badge">18+</span>
          <h2 id="age-gate-title">This site contains adult content</h2>
          <p id="age-gate-description">
            Better BDSMLR is a browser for BDSMLR, which hosts adult material.
            Confirm that you are at least 18 years old to continue.
          </p>
          <div class="age-gate-actions">
            <button type="button" class="age-gate-confirm" onClick={accept} autofocus>
              I am 18 or older
            </button>
            <a class="age-gate-leave" href="https://www.google.com">
              Leave
            </a>
          </div>
          <p class="age-gate-note">Your answer is stored only in this browser.</p>
        </div>
      </div>
    </Show>
  );
}
