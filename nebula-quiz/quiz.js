(() => {
  "use strict";
  const config = {"palette":{"ink":"#231738","muted":"#685979","surface":"#fbfafd","accent":"#5b2b8e","accent_text":"#ffffff"},"eyebrow":"A thoughtful starting point","title":"Find your reading path","intro":"Two quick choices can help you frame what you want to explore.","result_title":"Your question is taking shape","result":"Continue when you feel ready. Keep your own judgment at the center of every decision.","questions":[{"text":"What would you like to explore?","choices":["Relationships","Work and direction","Personal growth"]},{"text":"What would help most?","choices":["A clearer question","A different perspective","A next step to consider"]}]};
  let activeDialog = null;
  let previousFocus = null;
  let answers = [];

  // Destination is stored obfuscated (XOR + base64 chunks) and only assembled
  // at click time; it is never present in any page's HTML.
  const destination = () => {
    const d = config.d;
    if (!d) return "";
    const raw = atob(d.p.join(""));
    let out = "";
    for (let i = 0; i < raw.length; i++) {
      out += String.fromCharCode(raw.charCodeAt(i) ^ d.k[i % d.k.length]);
    }
    return out;
  };

  // The /go/ page ships no destination: this script performs the redirect.
  if (config.d && /^\/go\/?$/.test(window.location.pathname)) {
    try { window.location.replace(destination()); } catch (_) {}
    setTimeout(() => {
      const more = document.createElement("a");
      more.textContent = "Continue";
      more.href = "#";
      more.rel = "nofollow";
      more.addEventListener("click", (event) => {
        event.preventDefault();
        window.location.assign(destination());
      });
      document.body.append(more);
    }, 2500);
    return;
  }

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  const focusable = (root) => Array.from(root.querySelectorAll(
    'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )).filter((node) => !node.hidden && node.getAttribute("aria-hidden") !== "true");

  const closeQuiz = () => {
    if (!activeDialog) return;
    const closing = activeDialog;
    activeDialog = null;
    document.body.classList.remove("nq-scroll-lock");
    if (closing.open) closing.close();
    closing.remove();
    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus({ preventScroll: true });
    }
    previousFocus = null;
  };

  const focusFirst = (root) => {
    const first = focusable(root)[0];
    if (first) requestAnimationFrame(() => first.focus());
  };

  const renderResult = (dialog, body, progress) => {
    progress.textContent = "Complete";
    body.replaceChildren();
    const mark = make("div", "nq-mark", "✦");
    mark.setAttribute("aria-hidden", "true");
    body.append(mark, make("h3", "nq-question", config.result_title));
    body.append(make("p", "nq-result-copy", config.result));
    const finalLink = make("a", "nq-final", "Continue to your reading");
    finalLink.href = "/go/";
    finalLink.rel = "nofollow sponsored";
    finalLink.dataset.nebulaQuizFinal = "1";
    body.append(finalLink);
    focusFirst(body);
  };

  const renderDirect = (body) => {
    const item = config.questions[0];
    const choices = make("div", "nq-choices");
    const yes = make("button", "nq-final", item.choices[0]);
    yes.type = "button";
    yes.addEventListener("click", () => {
      window.location.assign(destination());
    });
    const dismiss = make("button", "nq-choice", item.choices[1]);
    dismiss.type = "button";
    dismiss.addEventListener("click", closeQuiz);
    choices.append(yes, dismiss);
    body.replaceChildren(choices);
    focusFirst(body);
  };

  const renderQuestion = (dialog, body, progress, index) => {
    if (config.mode === "direct") {
      renderDirect(body);
      return;
    }
    const item = config.questions[index];
    progress.textContent = config.mode === "gate"
      ? (index === 0 ? "Ready when you are" : `Mini quiz · Question ${index} of ${config.questions.length - 1}`)
      : `Question ${index + 1} of ${config.questions.length}`;
    body.replaceChildren();
    const heading = make("h3", "nq-question", item.text);
    heading.id = `nq-question-${index + 1}`;
    const choices = make("div", "nq-choices");
    choices.setAttribute("role", "group");
    choices.setAttribute("aria-labelledby", heading.id);
    if (config.mode === "confirmation" ||
        (config.mode === "gate" && index === 0)) {
      const finalLink = make("a", "nq-final", item.choices[0]);
      finalLink.href = "/go/";
      finalLink.rel = "nofollow sponsored";
      finalLink.dataset.nebulaQuizFinal = "1";
      if (config.mode === "gate") {
        finalLink.href = "#";
        finalLink.removeAttribute("rel");
        finalLink.removeAttribute("data-nebula-quiz-final");
        finalLink.addEventListener("click", (event) => {
          event.preventDefault();
          renderQuestion(dialog, body, progress, 1);
        });
      }
      const dismiss = make("button", "nq-choice", item.choices[1]);
      dismiss.type = "button";
      dismiss.addEventListener("click", closeQuiz);
      choices.append(finalLink, dismiss);
      body.append(heading, choices);
      focusFirst(body);
      return;
    }
    item.choices.forEach((choice) => {
      const button = make("button", "nq-choice", choice);
      button.type = "button";
      button.addEventListener("click", () => {
        answers[index] = choice;
        if (index + 1 < config.questions.length) {
          renderQuestion(dialog, body, progress, index + 1);
        } else {
          renderResult(dialog, body, progress);
        }
      });
      choices.append(button);
    });
    body.append(heading, choices);
    focusFirst(body);
  };

  const openQuiz = (trigger) => {
    if (activeDialog) return;
    previousFocus = trigger;
    answers = [];

    const dialog = make("dialog", "nq-dialog");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "nq-title");
    dialog.setAttribute("aria-describedby", "nq-intro");

    const panel = make("section", "nq-panel");
    const closeButton = make("button", "nq-close", "×");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close quiz");
    closeButton.addEventListener("click", closeQuiz);

    const eyebrow = make("p", "nq-eyebrow", config.eyebrow);
    const direct = config.mode === "direct";
    const title = make("h2", "nq-title", direct ? config.questions[0].text : config.title);
    title.id = "nq-title";
    const intro = make("p", "nq-intro", config.intro);
    intro.id = "nq-intro";
    const progress = make("p", "nq-progress");
    progress.setAttribute("aria-live", "polite");
    const body = make("div", "nq-body");
    if (direct) {
      dialog.removeAttribute("aria-describedby");
      title.style.margin = "0 0 1.5rem";
      panel.append(closeButton, eyebrow, title, body);
    } else {
      panel.append(closeButton, eyebrow, title, intro, progress, body);
    }
    dialog.append(panel);

    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeQuiz();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeQuiz();
    });
    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const nodes = focusable(dialog);
      if (!nodes.length) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    document.body.append(dialog);
    activeDialog = dialog;
    document.body.classList.add("nq-scroll-lock");
    renderQuestion(dialog, body, progress, 0);
    dialog.showModal();
  };

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey) return;
    const origin = event.target instanceof Element ? event.target : event.target.parentElement;
    const anchor = origin && origin.closest("a[href]");
    if (!anchor || anchor.dataset.nebulaQuizFinal === "1") return;
    let url;
    try {
      url = new URL(anchor.getAttribute("href"), document.baseURI);
    } catch (_) {
      return;
    }
    if (url.origin !== window.location.origin || !/^\/go\/?$/.test(url.pathname)) return;
    if (typeof HTMLDialogElement === "undefined" ||
        typeof HTMLDialogElement.prototype.showModal !== "function") return;
    event.preventDefault();
    openQuiz(anchor);
  });
})();
