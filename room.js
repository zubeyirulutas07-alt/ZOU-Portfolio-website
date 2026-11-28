(() => {
  "use strict";
  const data = window.ZOU_PORTFOLIO;
  if (!data?.projects?.length) return;
  const films = data.projects;
  // The client's video review. It is not his edit, so it is never in a reel or in the film index; the id "review" is reserved for it.
  const reviewer = data.testimonials?.find((t) => t.video);
  const rv = data.videoReview;
  const review = rv?.source
    ? {
        id: "review",
        review: true,
        title: rv.title || rv.name,
        credit: reviewer?.name || rv.name,
        kind: rv.kind || "Client review",
        format: "Client review",
        duration: rv.duration,
        poster: { src: rv.poster, small: rv.poster },
        focus: rv.focus,
        note: rv.note || "",
        titleLines: rv.titleLines,
        paper: rv.paper,
        plate: rv.plate,
        mobilePlate: rv.mobilePlate,
        url: reviewer?.url,
        lines: rv.lines,
        media: { src: rv.source, strip: rv.strip, length: rv.length || rv.duration, start: 0, excerpt: false },
      }
    : null;
  const everything = review ? [...films, review] : films;
  const find = (id) => everything.find((p) => p.id === id);
  // How the site looks. Set these in portfolio.js under "look"; the values here are the defaults.
  //   opening:    "number" (one giant figure), "sentence" (the record as one sentence), "headline" (a line of his own) or "none"
  //   numberFill: "footage" (frames from his films run through the figure) or "plain"
  //   sort:       "switch" (Short-form / Long-form tabs above the film) or "list" (every film grouped under the player)
  //   align:      "left" or "centre" (centres the opening on phones)
  const look = Object.assign({ opening: "number", numberFill: "footage", sort: "switch", align: "left" }, data.look);
  const sortMode = look.sort;
  if (look.align === "centre") document.documentElement.classList.add("centred");
  // One reel plays at a time: short-form or long-form, and one type of work if the visitor picks one.
  const formats = [...new Set(films.map((p) => p.format))];
  const found = [...new Set(films.map((p) => p.category).filter(Boolean))];
  const niches = [...(data.niches || []).filter((n) => found.includes(n)), ...found.filter((n) => !(data.niches || []).includes(n))];
  let reelFormat = films[0].format,
    reelNiche = "";
  const reelFilms = (format = reelFormat, niche = reelNiche) =>
    films.filter((p) => p.format === format && (!niche || p.category === niche));
  let run = everything;
  function buildRun() {
    let list = films;
    if (sortMode === "switch") list = reelFilms();
    else if (sortMode === "list") list = formats.flatMap((f) => found.flatMap((n) => reelFilms(f, n)));
    // The client's review is not one of his films, so it is never part of a reel.
    run = list;
  }
  buildRun();
  // Edit notes live on each film. An older data file kept them for one film only.
  const cuesFor = (p) =>
    p.cues?.length ? p.cues : data.breakdown?.project === p.id ? data.breakdown.cues || [] : [];
  const el = (id) => document.getElementById(id);
  const make = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const pad = (n) => String(n).padStart(2, "0");
  function time(s, padded = false) {
    if (!Number.isFinite(s)) return "";
    const whole = Math.max(0, Math.floor(s));
    return (padded ? pad(Math.floor(whole / 60)) : Math.floor(whole / 60)) + ":" + pad(whole % 60);
  }
  function watchUrl(p, at = 0) {
    return (
      "https://www.youtube.com/watch?v=" +
      encodeURIComponent(p.youtube) +
      (at ? "&t=" + Math.floor(at) + "s" : "")
    );
  }
  function poster(p, small = false) {
    return (
      (small && p.poster?.small) ||
      p.poster?.src ||
      "https://i.ytimg.com/vi/" + encodeURIComponent(p.youtube) + "/hqdefault.jpg"
    );
  }
  const cleanHex = (color) => (/^#[a-f0-9]{6}$/i.test(color || "") ? color : "#c3b1f0");
  const external = (title, url) => {
    const a = make("a", null, title);
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  };
  const video = el("project-video"),
    stage = el("stage"),
    gate = el("gate"),
    slider = el("scrub");
  const dialog = el("viewer"),
    dialogMedia = el("dialog-media");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = matchMedia("(max-width: 700px)");
  let current = films[0],
    view = "",
    loadedFilm = "",
    readySeek = null,
    silent = true,
    wantsPlay = false;
  let userPaused = false,
    waitingResume = false,
    scrubbing = false,
    expandMode = "",
    lastTrigger = null;
  let format = "",
    installedProject = "",
    onScreen = true;

  function canAutoplay() {
    return !reduced.matches && !navigator.connection?.saveData && !document.hidden;
  }
  // The run rolls on to the next film when one ends, until the visitor takes the controls.
  const ROLL_MS = 4000;
  let handsOn = false,
    rollTimer = 0,
    rolled = 0;
  function rolling() {
    return (
      !current.review &&
      !handsOn &&
      run.length > 1 &&
      rolled < run.length - 1 &&
      view === "screen" &&
      !expandMode &&
      onScreen &&
      canAutoplay()
    );
  }
  function syncLoop() {
    video.loop = silent && !reduced.matches && !rolling();
  }
  function stopRoll() {
    if (!rollTimer) return;
    clearTimeout(rollTimer);
    rollTimer = 0;
    el("next").classList.remove("is-rolling");
  }
  function takeControls() {
    handsOn = true;
    stopRoll();
    syncLoop();
  }
  function slowLink() {
    const c = navigator.connection;
    return Boolean(c && (c.saveData || /(^|-)2g$|^3g$/.test(c.effectiveType || "")));
  }
  // The client's words show under the timeline, never over the picture.
  function showCaptions(p) {
    const said = el("said");
    said.textContent = "";
    said.hidden = !p.lines?.length;
  }
  function mediaLength() {
    return current.media
      ? Number.isFinite(video.duration) && loadedFilm === current.id
        ? video.duration
        : current.media.length
      : current.duration;
  }
  function setTimeReadout() {
    const local = loadedFilm === current.id && Number.isFinite(video.currentTime) ? video.currentTime : 0;
    const pos = readySeek ?? local;
    const span = mediaLength() || 0;
    const start = current.media?.start || 0;
    const fraction = span ? Math.min(1, Math.max(0, pos / span)) : 0;
    if (!scrubbing) slider.value = pos;
    el("head").style.left = "calc(" + fraction * 100 + "% - " + fraction * 2 + "px)";
    el("elapsed").textContent = time(pos + start, true);
    el("total").textContent = time(
      start + (current.media?.excerpt ? Math.round(span) : current.duration || Math.round(span)),
      true,
    );
    slider.setAttribute("aria-valuetext", time(pos + start) + " of " + time(start + Math.round(span)));
    if (current.lines?.length) {
      let line = current.lines[0];
      for (const l of current.lines) if (pos >= l[0]) line = l;
      el("said").textContent = line[1];
    }
    const cues = cuesFor(current);
    if (cues.length) {
      let now = -1;
      cues.forEach((c, i) => {
        if (pos + start >= c.at - 0.05) now = i;
      });
      document.querySelectorAll(".cue-mark").forEach((b, i) => b.classList.toggle("is-past", i <= now));
      document
        .querySelectorAll("#cue-list button")
        .forEach((b, i) => b.classList.toggle("is-now", i === Math.max(0, now)));
      el("cue-note").textContent = cues[Math.max(0, now)].note;
    }
  }
  function updateControls() {
    const playing = Boolean(current.media && loadedFilm === current.id && !video.paused && !video.ended);
    el("play").classList.toggle("is-playing", playing);
    el("play-word").textContent = playing ? "Pause" : "Play";
    const label = (playing ? "Pause " : "Play ") + current.title;
    el("play").setAttribute("aria-label", label);
    el("surface-play").setAttribute(
      "aria-label",
      playing && silent ? "Turn sound on for " + current.title : label,
    );
    gate.classList.toggle("is-paused", !playing && !rollTimer);
    el("sound-word").textContent = silent ? "Sound off" : "Sound on";
    el("sound").setAttribute("aria-label", silent ? "Turn sound on" : "Mute sound");
    el("sound").setAttribute("aria-pressed", String(!silent));
  }
  function loadMedia() {
    if (!current.media?.src || loadedFilm === current.id) return;
    loadedFilm = current.id;
    // Phones get the full-size clip. The small one is kept for slow connections.
    video.src =
      current.media.mobile && mobile.matches && slowLink() ? current.media.mobile : current.media.src;
    video.muted = silent;
    syncLoop();
    video.load();
  }
  function requestPlay(userAction = false) {
    if (!current.media?.src) return openOriginal(el("play"));
    if (userAction) userPaused = false;
    wantsPlay = true;
    stopRoll();
    loadMedia();
    if (video.ended) video.currentTime = 0;
    const promise = video.play();
    if (promise)
      promise.catch(() => {
        if (video.paused) updateControls();
      });
  }
  function pause(userAction = false) {
    if (userAction) {
      userPaused = true;
      wantsPlay = false;
    }
    stopRoll();
    video.pause();
    updateControls();
  }
  function toggle() {
    if (!current.media?.src) return openOriginal(el("surface-play"));
    takeControls();
    if (video.paused || video.ended || loadedFilm !== current.id) requestPlay(true);
    else pause(true);
  }
  function seek(seconds, playAfter = false) {
    if (!current.media?.src) return openOriginal(el("play"), seconds);
    const pos = Math.min(Math.max(0, seconds), Math.max(0, (mediaLength() || seconds + 0.05) - 0.02));
    loadMedia();
    if (video.readyState >= 1) {
      readySeek = null;
      video.currentTime = pos;
    } else readySeek = pos;
    if (playAfter) requestPlay(true);
    setTimeReadout();
  }
  video.addEventListener("loadedmetadata", () => {
    if (!current.media || loadedFilm !== current.id) return;
    slider.max = video.duration;
    if (readySeek !== null) {
      const at = readySeek;
      readySeek = null;
      video.currentTime = Math.max(0, Math.min(at, video.duration - 0.02));
    }
    setTimeReadout();
  });
  ["timeupdate", "seeked", "durationchange"].forEach((event) =>
    video.addEventListener(event, setTimeReadout),
  );
  ["play", "playing", "pause", "ended"].forEach((event) => video.addEventListener(event, updateControls));
  video.addEventListener("error", () => {
    if (!loadedFilm || !video.error) return;
    el("player-message").hidden = false;
    updateControls();
  });
  el("play").addEventListener("click", toggle);
  el("surface-play").addEventListener("click", () => {
    const playing = current.media?.src && loadedFilm === current.id && !video.paused && !video.ended;
    if (playing && silent) {
      // A first tap on a silent film gives it sound, from the top.
      silent = false;
      video.muted = false;
      syncLoop();
      video.currentTime = 0;
      updateControls();
      return;
    }
    toggle();
  });
  video.addEventListener("ended", () => {
    if (loadedFilm !== current.id || expandMode) return;
    if (rolling()) {
      el("next").classList.add("is-rolling");
      rollTimer = setTimeout(() => {
        rollTimer = 0;
        el("next").classList.remove("is-rolling");
        if (!rolling()) return updateControls();
        rolled++;
        neighbour(1);
      }, ROLL_MS);
      updateControls();
    } else if (silent && !reduced.matches && wantsPlay && !userPaused) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  });
  el("sound").addEventListener("click", () => {
    silent = !silent;
    video.muted = silent;
    syncLoop();
    if (!silent && video.paused) requestPlay(true);
    updateControls();
  });
  video.addEventListener("volumechange", () => {
    if (expandMode === "native") {
      silent = video.muted;
      updateControls();
    }
  });
  function startScrub() {
    if (scrubbing) return;
    takeControls();
    waitingResume = !video.paused;
    scrubbing = true;
    video.pause();
  }
  function endScrub() {
    if (!scrubbing) return;
    scrubbing = false;
    if (waitingResume) requestPlay();
    waitingResume = false;
    setTimeReadout();
  }
  slider.addEventListener("pointerdown", startScrub);
  slider.addEventListener("input", () => {
    takeControls();
    seek(Number(slider.value));
  });
  window.addEventListener("pointerup", endScrub);
  window.addEventListener("pointercancel", endScrub);
  slider.addEventListener("blur", endScrub);
  slider.addEventListener("keydown", (e) => {
    const deltas = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 };
    if (e.key in deltas) {
      e.preventDefault();
      takeControls();
      seek(Number(slider.value) + deltas[e.key]);
    }
  });
  function renderTimeline(p) {
    const m = p.media;
    el("scrub-group").hidden = !m?.src;
    if (!m?.src) return;
    slider.max = m.length;
    slider.value = 0;
    const marks = [0, 0.25, 0.5, 0.75, 1].map((f) =>
      make(
        "span",
        null,
        time(
          (m.start || 0) +
            Math.round((m.excerpt ? Math.round(m.length) : p.duration || Math.round(m.length)) * f),
          true,
        ),
      ),
    );
    el("ruler").replaceChildren(...marks);
    el("cells").replaceChildren(
      ...Array.from({ length: 10 }, (_, i) => {
        const cell = make("i");
        cell.style.backgroundImage = "url(" + JSON.stringify(m.strip || poster(p, true)) + ")";
        cell.style.backgroundPosition = (i / 9) * 100 + "% 40%";
        if (!m.strip) cell.style.backgroundSize = "cover";
        return cell;
      }),
    );
    stripRatio = (p.format === "Long-form" ? 16 / 9 : 9 / 16) * 10;
    sizeCells();
    if (m.strip) {
      const probe = new Image(),
        id = p.id;
      probe.onload = () => {
        if (current.id !== id || !probe.naturalHeight) return;
        stripRatio = probe.naturalWidth / probe.naturalHeight;
        sizeCells();
      };
      probe.src = m.strip;
    }
    const flags = el("cue-marks");
    const cues = cuesFor(p);
    flags.hidden = !cues.length;
    flags.replaceChildren(
      ...cues.map((cue) => {
        const at = cue.at - (m.start || 0),
          f = Math.min(1, Math.max(0, at / m.length));
        const b = make("button", "cue-mark" + (f > 0.82 ? " flip" : ""), time(cue.at, true));
        b.type = "button";
        b.style.left = f * 100 + "%";
        b.setAttribute("aria-label", "Jump to " + time(cue.at) + ", " + cue.title);
        b.addEventListener("click", () => {
          takeControls();
          seek(at, true);
        });
        return b;
      }),
    );
  }
  // Each cell shows one frame from the strip, filling the cell without stretching it.
  let stripRatio = 5.625;
  function sizeCells() {
    const m = current.media,
      box = el("cells");
    if (!m?.strip || !box.children.length) return;
    const w = box.clientWidth / 10,
      h = box.clientHeight;
    if (!w || !h) return;
    const r = (h * (stripRatio / 10)) / w;
    [...box.children].forEach((cell, i) => {
      if (r > 1) {
        cell.style.backgroundSize = "auto 100%";
        cell.style.backgroundPosition = ((i * r + (r - 1) / 2) / (10 * r - 1)) * 100 + "% 50%";
      } else {
        cell.style.backgroundSize = "1000% auto";
        cell.style.backgroundPosition = (i / 9) * 100 + "% 40%";
      }
    });
  }
  addEventListener("resize", sizeCells);
  function drawNotes(p) {
    el("project-note").textContent = p.note;
    el("error-original").href = p.review ? p.media.src : watchUrl(p);
    el("share-cut").hidden = location.protocol === "file:";
    el("share-cut").textContent = "Copy link to this moment";
    el("share-field")?.remove();
    const original = el("full-film");
    original.href = p.review ? p.url || "#" : watchUrl(p);
    original.hidden = Boolean(p.review && !p.url);
    original.textContent = p.review ? "Visit " + (rv.name || p.title) : "Watch original on YouTube";
    original.target = "_blank";
    original.rel = "noopener";
    el("note-heading").textContent = p.review ? "About this review" : "About this cut";
    if (el("proof-watch")) el("proof-watch").hidden = Boolean(p.review);
    // Every film can carry notes, and the credits stay beside them.
    const cues = cuesFor(p);
    el("case-notes").hidden = !cues.length;
    el("cue-list").replaceChildren();
    if (cues.length)
      for (const cue of cues) {
        const b = make("button");
        b.type = "button";
        b.append(make("span", null, time(cue.at, true)), document.createTextNode(cue.title));
        b.title = cue.note;
        b.addEventListener("click", () => {
          stage.scrollIntoView({ behavior: "instant", block: "start" });
          takeControls();
          seek(cue.at - (p.media?.start || 0), true);
        });
        el("cue-list").append(b);
      }
  }
  function labelRun(p) {
    if (p.review) {
      el("film-index").textContent = "From a client";
      el("neighbours").hidden = true;
      return;
    }
    const i = run.indexOf(p);
    const count = run.filter((x) => !x.review).length;
    el("film-index").textContent = p.review ? "From a client" : "Film " + pad(i + 1) + " / " + pad(count);
    const after = run[(i + 1) % run.length],
      before = run[(i + run.length - 1) % run.length];
    el("next-label").textContent = after.title;
    el("next").querySelector("small").textContent = after.review ? "Client review" : "Next film";
    el("next").setAttribute("aria-label", (after.review ? "Next, client review, " : "Next film, ") + after.title);
    el("prev").setAttribute(
      "aria-label",
      (before.review ? "Previous, client review, " : "Previous film, ") + before.title,
    );
    el("neighbours").hidden = run.length < 2;
  }
  function drawReels() {
    const box = el("reels");
    if (!box) return;
    box.hidden = sortMode !== "switch";
    const button = (label, on, count, pick) => {
      const b = make("button", null, label);
      b.type = "button";
      b.setAttribute("aria-pressed", String(on));
      if (count) b.append(make("sup", null, pad(count)));
      b.addEventListener("click", pick);
      return b;
    };
    el("reel-format").replaceChildren(
      ...formats.map((f) => button(f, !current.review && f === reelFormat, reelFilms(f, "").length, () => pickReel(f, ""))),
    );
    const here = niches.filter((n) => reelFilms(reelFormat, n).length);
    el("reel-niche").replaceChildren(
      button("All", !current.review && !reelNiche, 0, () => pickReel(reelFormat, "")),
      ...here.map((n) => button(n, !current.review && n === reelNiche, 0, () => pickReel(reelFormat, n))),
    );
    drawProgramme();
  }
  function pickReel(format, niche) {
    reelFormat = format;
    reelNiche = reelFilms(format, niche).length ? niche : "";
    buildRun();
    rolled = 0;
    drawReels();
    if (run.includes(current)) {
      labelRun(current);
      syncLoop();
    } else location.hash = filmHash(run[0]);
  }
  function drawProgramme() {
    const box = el("programme");
    if (!box) return;
    box.hidden = sortMode !== "list";
    if (box.hidden) return;
    el("programme-list").replaceChildren(
      ...formats.map((f) => {
        const group = make("div", "programme-group");
        group.append(make("h2", "programme-format", f));
        for (const n of found) {
          const list = reelFilms(f, n);
          if (!list.length) continue;
          const set = make("div", "programme-set");
          set.append(make("h3", null, n));
          for (const p of list) {
            const b = make("button", "programme-film" + (p === current ? " is-now" : ""));
            b.type = "button";
            b.append(make("strong", null, p.title), make("span", null, p.credit), make("span", "mono", time(p.duration)));
            b.addEventListener("click", () => {
              location.hash = filmHash(p);
              stage.scrollIntoView({ behavior: "instant", block: "start" });
            });
            set.append(b);
          }
          group.append(set);
        }
        return group;
      }),
    );
  }
  function setFilm(p, at = null) {
    if (sortMode === "switch" && !p.review && !run.includes(p)) {
      reelFormat = p.format;
      if (reelNiche && p.category !== reelNiche) reelNiche = "";
      buildRun();
      rolled = 0;
    }
    const i = run.indexOf(p);
    const switching = Boolean(installedProject && installedProject !== p.id);
    if (installedProject === p.id) {
      if (at !== null) seek(at - (p.media?.start || 0), canAutoplay());
      return;
    }
    video.pause();
    loadedFilm = "";
    readySeek = null;
    video.removeAttribute("src");
    video.load();
    stopRoll();
    showCaptions(p);
    current = p;
    installedProject = p.id;
    wantsPlay = false;
    userPaused = false;
    el("player-message").hidden = true;
    video.poster = poster(p);
    video.setAttribute("aria-label", p.title + (p.review ? " client review" : " film"));
    el("film-credit").textContent = p.credit || p.title;
    el("film-kind").textContent = [p.kind || p.category, time(p.duration)].filter(Boolean).join(" / ");
    const long = p.format === "Long-form";
    stage.classList.toggle("wide", long);
    stage.style.setProperty("--stock", cleanHex(p.paper));
    el("plate-phone").srcset = p.mobilePlate || p.plate || poster(p);
    const plate = el("plate");
    plate.src = p.plate || poster(p);
    plate.classList.toggle("plain-plate", !p.plate);
    const title = el("film-title");
    title.setAttribute("aria-label", p.title);
    const lines = p.titleLines?.length ? p.titleLines : [p.title];
    title.classList.toggle("tall-name", Math.max(...lines.map((s) => s.length)) > 7);
    title.style.setProperty("--factor", Math.max(2.8, p.title.length * 0.48));
    const words = lines.map((s) => {
      const span = make("span", "title-line", s);
      span.setAttribute("aria-hidden", "true");
      return span;
    });
    const spine = make("span", "spine-title", p.title);
    spine.setAttribute("aria-hidden", "true");
    title.replaceChildren(...words, spine);
    el("stage-stamp").textContent = "ZOU / " + p.format;
    labelRun(p);
    drawReels();
    el("long-full").hidden = !p.media?.excerpt;
    el("long-full").textContent = "Full film · " + time(p.duration);
    if (!p.review) el("long-full").href = watchUrl(p);
    el("restart-name").textContent = p.media?.excerpt ? "Replay excerpt" : "Play from start";
    el("sound").hidden = !p.media?.src;
    el("expand").hidden = !p.media?.src;
    el("format-hint").textContent = p.media?.excerpt ? "Excerpt" : "";
    drawNotes(p);
    renderTimeline(p);
    readySeek = at === null ? null : Math.max(0, at - (p.media?.start || 0));
    updateControls();
    setTimeReadout();
    if (switching && !reduced.matches && gate.animate) {
      gate.animate([{ clipPath: "inset(0 0 0 75%)" }, { clipPath: "inset(0)" }], {
        duration: 190,
        easing: "ease-out",
      });
      title.animate(
        [
          { opacity: 0.4, translate: "0 8px" },
          { opacity: 1, translate: "0 0" },
        ],
        { duration: 190, easing: "ease-out" },
      );
    }
    if (view === "screen" && p.media?.src && canAutoplay() && onScreen) requestPlay();
    else {
      if (readySeek !== null && p.media?.src) seek(readySeek);
      // Opened in a background tab: start when the visitor arrives.
      if (document.hidden && view === "screen" && p.media?.src && !reduced.matches && !navigator.connection?.saveData)
        wantsPlay = true;
    }
  }
  const filmHash = (p) => "#film/" + encodeURIComponent(p.id);
  function neighbour(step) {
    const i = run.indexOf(current);
    location.hash = filmHash(run[(i + step + run.length) % run.length]);
  }
  el("restart").addEventListener("click", () => {
    takeControls();
    seek(0, true);
  });
  el("prev").addEventListener("click", () => neighbour(-1));
  el("next").addEventListener("click", () => neighbour(1));

  function beginDialog(mode, title, trigger, vertical) {
    lastTrigger = trigger;
    expandMode = mode;
    el("dialog-title").textContent = title;
    el("dialog-links").replaceChildren();
    dialogMedia.replaceChildren();
    dialogMedia.classList.toggle("portrait", vertical);
    dialog.showModal();
    el("close").focus({ preventScroll: true });
  }
  function openOriginal(trigger, at = 0) {
    if (location.protocol === "file:" || !dialog.showModal) {
      window.open(watchUrl(current, at), "_blank", "noopener");
      return;
    }
    video.pause();
    beginDialog("original", current.title, trigger, current.format !== "Long-form");
    const iframe = document.createElement("iframe");
    iframe.title = current.title + " on YouTube";
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.src =
      "https://www.youtube-nocookie.com/embed/" +
      encodeURIComponent(current.youtube) +
      "?autoplay=1&playsinline=1&start=" +
      Math.floor(at) +
      "&origin=" +
      encodeURIComponent(location.origin);
    dialogMedia.append(iframe);
    el("dialog-links").append(external("Open original on YouTube", watchUrl(current, at)));
  }
  el("share-cut").addEventListener("click", async () => {
    const t = Math.floor((current.media?.start || 0) + (video.currentTime || 0));
    const url = new URL(location.href);
    url.hash = filmHash(current) + (t ? "?at=" + t : "");
    try {
      await navigator.clipboard.writeText(url.href);
      el("share-status").textContent = "Link copied";
      el("share-cut").textContent = "Link copied";
    } catch {
      let field = el("share-field");
      if (!field) {
        field = make("input", "share-field");
        field.id = "share-field";
        field.readOnly = true;
        field.setAttribute("aria-label", "Link to this moment");
        el("share-cut").after(field);
      }
      field.value = url.href;
      field.focus();
      field.select();
    }
  });
  el("long-full").addEventListener("click", (e) => {
    if (e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    openOriginal(el("long-full"));
  });
  el("expand").addEventListener("click", () => {
    const wasPlaying = !video.paused;
    takeControls();
    beginDialog("native", current.title, el("expand"), current.format !== "Long-form");
    video.controls = true;
    dialogMedia.append(video);
    loadMedia();
    if (wasPlaying) requestPlay(true);
    if (!current.review) el("dialog-links").append(external("Original on YouTube", watchUrl(current)));
  });
  function closeDialog(restore = true) {
    if (!dialog.open) return;
    if (expandMode === "native") {
      const resume = !video.paused && restore;
      video.controls = false;
      gate.prepend(video);
      if (resume) requestPlay();
    } else {
      const v = dialogMedia.querySelector("video");
      if (v) v.pause();
    }
    dialogMedia.replaceChildren();
    dialog.close();
    expandMode = "";
    if (restore && lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
    lastTrigger = null;
  }
  el("close").addEventListener("click", () => closeDialog());
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeDialog();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeDialog();
  });
  el("review-play").addEventListener("click", () => {
    const r = data.videoReview;
    beginDialog("review", r.name + " testimonial", el("review-play"), true);
    const v = document.createElement("video");
    v.src = r.source;
    v.poster = r.poster;
    v.playsInline = true;
    v.controls = true;
    v.autoplay = true;
    if (r.captions) {
      const track = document.createElement("track");
      track.kind = "captions";
      track.label = "English";
      track.srclang = "en";
      track.src = r.captions;
      v.append(track);
    }
    dialogMedia.append(v);
    el("dialog-links").append(external("Open testimonial video", r.source));
  });

  let swipeStart = null,
    suppressTapUntil = 0;
  stage.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch" && e.isPrimary)
      swipeStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  stage.addEventListener("pointercancel", () => {
    swipeStart = null;
  });
  stage.addEventListener("pointerup", (e) => {
    if (!swipeStart || swipeStart.id !== e.pointerId) return;
    const dx = e.clientX - swipeStart.x,
      dy = e.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      suppressTapUntil = performance.now() + 450;
      neighbour(dx < 0 ? 1 : -1);
    }
  });
  stage.addEventListener(
    "click",
    (e) => {
      if (performance.now() < suppressTapUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );

  function renderIndex() {
    const cat = el("category").value;
    const matching = films.filter((p) => (!format || format === p.format) && (!cat || cat === p.category));
    el("list-status").textContent = matching.length + " films shown";
    [...el("filters").children].forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.format === format)),
    );
    const rows = matching.map((p) => {
      const row = make("a", "film-row");
      row.href = filmHash(p);
      row.setAttribute(
        "aria-label",
        "Screen " + [p.title, p.credit, p.format, time(p.duration)].filter(Boolean).join(", "),
      );
      const image = new Image();
      image.alt = "";
      image.loading = "lazy";
      image.className = "row-img";
      image.src = poster(p, true);
      image.style.objectPosition = p.focus || "center";
      row.append(
        make("span", "seq", pad(films.indexOf(p) + 1)),
        image,
        make("strong", null, p.title),
        make("span", "label", p.credit),
        make("span", "label category-name", p.category),
        make("span", "length", time(p.duration)),
      );
      return row;
    });
    el("film-list").replaceChildren(...rows);
    if (!rows.length) {
      const b = make("button", "empty under", "No matches. Show all films");
      b.type = "button";
      b.addEventListener("click", () => {
        format = "";
        el("category").value = "";
        renderIndex();
        el("filters").firstElementChild.focus();
      });
      el("film-list").append(b);
    }
  }
  ["", ...new Set(films.map((p) => p.format))].forEach((f) => {
    const b = make("button", null, f || "All films");
    b.type = "button";
    b.dataset.format = f;
    b.addEventListener("click", () => {
      format = f;
      renderIndex();
    });
    el("filters").append(b);
  });
  [...new Set(films.map((p) => p.category).filter(Boolean))].forEach((c) =>
    el("category").add(new Option(c, c)),
  );
  el("category").addEventListener("change", renderIndex);

  function profile() {
    el("mast-name").textContent = data.editor;
    el("footer-name").textContent = data.editor;
    const parts = data.editor.split(" ");
    el("editor-heading").replaceChildren(
      document.createTextNode(parts.shift()),
      document.createElement("br"),
      document.createTextNode(parts.join(" ")),
    );
    el("bio-intro").textContent = data.intro;
    // The opening under the header. Its words live in portfolio.js under "opening"; its layout under "look".
    const opening = el("opening");
    const op = data.opening || {};
    if (opening) {
      opening.hidden = look.opening === "none" || !Object.keys(op).length;
      // Figures inside a line are set in the poster type.
      const withFigures = (text) =>
        text.split(/(\d[\d,.]*\+?)/).map((part, i) => (i % 2 ? make("b", null, part) : document.createTextNode(part)));
      const lines = (list) =>
        [].concat(list || []).flatMap((t, i) => (i ? [document.createElement("br"), document.createTextNode(t)] : [document.createTextNode(t)]));
      const lineEl = el("opening-line"),
        subEl = el("opening-sub");
      lineEl.removeAttribute("aria-label");
      if (look.opening === "headline" && op.headline) {
        lineEl.className = "poster-type";
        lineEl.replaceChildren(...lines(op.headline));
        subEl.className = "opening-sub with-figures";
        subEl.replaceChildren(...withFigures(op.sentence || ""));
      } else if (look.opening === "sentence" && op.sentence) {
        lineEl.className = "sentence";
        lineEl.replaceChildren(...withFigures(op.sentence));
        subEl.className = "opening-sub";
        subEl.textContent = op.services || "";
      } else if (op.number) {
        const footage = look.numberFill === "footage" && op.reel;
        lineEl.className = "giant" + (footage ? " reel-on" : "");
        lineEl.setAttribute("aria-label", [op.number, ...[].concat(op.numberWords || [])].join(" "));
        const num = make("span", "giant-num", op.number);
        const words = make("span", "giant-words");
        words.append(...lines(op.numberWords));
        num.setAttribute("aria-hidden", "true");
        words.setAttribute("aria-hidden", "true");
        lineEl.replaceChildren(num, words);
        subEl.className = "opening-sub giant-sub with-figures";
        subEl.replaceChildren(...withFigures(op.line || ""));
        if (footage) runReel(num, op.reel);
      }
      if (!opening.hidden) {
        el("proof-line").hidden = true;
        el("proof-heading").textContent = "From a client";
      }
    }
    document.querySelectorAll("a.book").forEach((a) => (a.href = data.booking));
    el("stats").replaceChildren(
      ...data.stats.map((s) => {
        const div = make("div");
        div.append(make("dt", null, s.label), make("dd", null, s.value));
        return div;
      }),
    );
    el("proof-line").textContent =
      data.stats.map((s) => s.value + " " + s.label.toLowerCase()).join("\u00a0· ") + ".";
    const pq = data.proofQuote;
    if (pq?.quote) {
      const who = make("span");
      who.append(
        document.createTextNode(pq.name + " / "),
        pq.url ? external(pq.credit, pq.url) : document.createTextNode(pq.credit || ""),
      );
      el("proof-quote").replaceChildren(document.createTextNode("“" + pq.quote + "”"), who);
      if (review && pq.name === reviewer?.name) {
        const watch = make("a", "under", "Watch the " + Math.round(review.duration) + "-second video");
        watch.id = "proof-watch";
        watch.href = filmHash(review);
        el("proof-quote").append(watch);
      }
      el("proof-quote").hidden = false;
    }
    const people = data.testimonials;
    const primary = people.find((t) => t.video) || people[0];
    if (primary) {
      el("main-quote").textContent = "“" + primary.quote + "”";
      el("main-credit").replaceChildren(
        document.createTextNode(primary.name + " / "),
        primary.url ? external(primary.credit, primary.url) : document.createTextNode(primary.credit),
      );
    }
    el("other-quotes").replaceChildren(
      ...people
        .filter((t) => t !== primary)
        .map((t) => {
          const f = make("figure");
          // The client's own face sits beside their words, as on the previous site.
          if (t.image) {
            const face = new Image();
            face.src = t.image;
            face.alt = "";
            face.loading = "lazy";
            face.className = "quote-face";
            f.append(face);
          }
          const body = make("div", "quote-body");
          const caption = make("figcaption");
          caption.append(
            t.url ? external(t.name, t.url) : document.createTextNode(t.name),
            document.createTextNode(" / " + t.credit),
          );
          body.append(make("q", null, t.quote), caption);
          f.append(body);
          return f;
        }),
    );
    if (!data.videoReview) el("review-play").hidden = true;
    el("nav-count").textContent = pad(films.length);
  }
  // Frames from his films run through the giant figure like a reel. It stays still for visitors who ask for less motion.
  // The reel is one wide image of frames side by side (opening.reel in portfolio.js); any width works.
  function runReel(num, src) {
    const SPEED = 46; // pixels a second
    const img = new Image();
    img.src = src;
    num.style.backgroundImage = "url(" + JSON.stringify(src) + ")";
    let anim = null;
    const size = () => {
      const h = num.getBoundingClientRect().height;
      if (!h || !img.naturalWidth) return;
      const w = Math.round((img.naturalWidth * h) / img.naturalHeight);
      num.style.backgroundSize = w + "px " + Math.round(h) + "px";
      anim?.cancel();
      if (reduced.matches || navigator.connection?.saveData || !num.animate) return;
      anim = num.animate([{ backgroundPositionX: "0px" }, { backgroundPositionX: -w + "px" }], {
        duration: (w / SPEED) * 1000,
        iterations: Infinity,
        easing: "linear",
      });
    };
    const loaded = img.decode ? img.decode() : new Promise((ok, fail) => ((img.onload = ok), (img.onerror = fail)));
    Promise.all([document.fonts?.ready, loaded])
      .then(() => {
        size();
        addEventListener("resize", size);
        reduced.addEventListener("change", size);
      })
      // No reel image: show the figure plain.
      .catch(() => num.parentElement.classList.remove("reel-on"));
  }
  let calendarAsked = false;
  function loadCalendar() {
    const box = el("calendar");
    if (calendarAsked || !box || !data.booking) return;
    calendarAsked = true;
    const widget = make("div", "calendly-inline-widget");
    widget.setAttribute("data-url", data.booking + (data.booking.includes("?") ? "&" : "?") + "hide_gdpr_banner=1");
    box.append(widget);
    const css = make("link");
    css.rel = "stylesheet";
    css.href = "https://assets.calendly.com/assets/external/widget.css";
    const script = make("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    script.addEventListener("error", () => widget.remove());
    document.head.append(css, script);
  }
  function route(initial = false) {
    const fragment = location.hash.slice(1);
    const [path, query] = fragment.split("?");
    const next = path === "index" ? "index" : path === "editor" ? "editor" : "screen";
    if (dialog.open) closeDialog(false);
    const previous = view;
    view = next;
    el("screen").hidden = next !== "screen";
    el("index-view").hidden = next !== "index";
    el("editor-view").hidden = next !== "editor";
    if (next === "editor") loadCalendar();
    for (const name of ["index", "editor"]) {
      const a = el("nav-" + name);
      if (view === name) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    if (next === "screen") {
      const p = path.startsWith("film/") ? find(path.slice(5)) || films[0] : current;
      const param = new URLSearchParams(query).get("at");
      const at = param !== null && Number.isFinite(+param) ? Math.max(0, +param) : null;
      const same = installedProject === p.id;
      onScreen = true;
      setFilm(p, at === null && initial && !path && canAutoplay() && p.previewIn ? p.previewIn : at);
      if (same && previous !== next && !userPaused && canAutoplay() && p.media?.src) requestPlay();
      document.title = p.title + " | ZOU screening room";
    } else {
      pause();
      if (next === "index") renderIndex();
      el("index-return").href = filmHash(current);
      el("editor-return").href = filmHash(current);
      document.title = (next === "index" ? "Film index" : data.editor) + " | ZOU";
    }
    if (!initial) {
      // A film change keeps the visitor where they are. Arriving from another page lands on the film.
      if (next !== "screen") window.scrollTo({ top: 0, behavior: "instant" });
      else if (previous !== "screen")
        (path.startsWith("film/") ? el("reels") || stage : document.body).scrollIntoView({
          behavior: "instant",
          block: "start",
        });
      const heading = next === "screen" ? el("film-title") : el(next + "-heading");
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (view !== "screen" || expandMode) return;
    if (document.hidden) {
      if (!video.paused) wantsPlay = true;
      pause();
    } else if (onScreen && wantsPlay && !userPaused && canAutoplay() && current.media) requestPlay();
  });
  reduced.addEventListener("change", () => {
    if (reduced.matches) {
      pause(true);
      video.loop = false;
    }
  });
  if ("IntersectionObserver" in window)
    new IntersectionObserver(
      (entries) => {
        if (view !== "screen" || expandMode) return;
        onScreen = entries[0].isIntersecting;
        if (!onScreen) pause();
        else if (wantsPlay && !userPaused && canAutoplay() && current.media?.src) requestPlay();
      },
      { rootMargin: "0px 0px 60px" },
    ).observe(stage);
  // Phone menu: the two pages fold behind one button; Book a call stays in view.
  const mast = document.querySelector(".mast"),
    menuButton = el("menu-toggle");
  function setMenu(open) {
    mast.classList.toggle("menu-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
  }
  menuButton.addEventListener("click", () => setMenu(!mast.classList.contains("menu-open")));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mast.classList.contains("menu-open")) {
      setMenu(false);
      menuButton.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (mast.classList.contains("menu-open") && !mast.contains(e.target)) setMenu(false);
  });
  el("nav-pages").addEventListener("click", (e) => {
    if (e.target.closest("a") || e.target === e.currentTarget) setMenu(false);
  });
  window.addEventListener("hashchange", () => {
    setMenu(false);
    route();
  });
  profile();
  route(true);
})();
