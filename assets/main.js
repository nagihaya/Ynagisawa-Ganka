// 牛込柳町弁天眼科クリニック 提案用デモ（依存なし）
(function () {
  "use strict";

  // 診療時間（0=日曜）。[開始, 終了] は分単位
  // 受付 9:30–12:30 / 14:00–17:00（月〜金）、土日祝休診
  var AM = [570, 750];
  var PM = [840, 1020];
  var SCHEDULE = {
    0: [],
    1: [AM, PM],
    2: [AM, PM],
    3: [AM, PM],
    4: [AM, PM],
    5: [AM, PM],
    6: []
  };
  var DAY = ["日", "月", "火", "水", "木", "金", "土"];

  function fmt(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    return h + ":" + (m < 10 ? "0" + m : m);
  }

  // 祝日（2026–2027年）。休診扱い
  var HOLIDAYS = {
    "2026-01-01": "元日", "2026-01-12": "成人の日", "2026-02-11": "建国記念の日",
    "2026-02-23": "天皇誕生日", "2026-03-20": "春分の日", "2026-04-29": "昭和の日",
    "2026-05-03": "憲法記念日", "2026-05-04": "みどりの日", "2026-05-05": "こどもの日",
    "2026-05-06": "振替休日", "2026-07-20": "海の日", "2026-08-11": "山の日",
    "2026-09-21": "敬老の日", "2026-09-22": "国民の休日", "2026-09-23": "秋分の日",
    "2026-10-12": "スポーツの日", "2026-11-03": "文化の日", "2026-11-23": "勤労感謝の日",
    "2027-01-01": "元日", "2027-01-11": "成人の日", "2027-02-11": "建国記念の日",
    "2027-02-23": "天皇誕生日", "2027-03-21": "春分の日", "2027-03-22": "振替休日",
    "2027-04-29": "昭和の日", "2027-05-03": "憲法記念日", "2027-05-04": "みどりの日",
    "2027-05-05": "こどもの日", "2027-07-19": "海の日", "2027-08-11": "山の日",
    "2027-09-20": "敬老の日", "2027-09-23": "秋分の日", "2027-10-11": "スポーツの日",
    "2027-11-03": "文化の日", "2027-11-23": "勤労感謝の日"
  };

  // 臨時休診・時間変更（お知らせと合わせて更新する）
  // am / pm に true を入れるとその枠が休診になる
  var SPECIAL = {
    "2026-10-30": { am: true, note: "10月30日（金）は午前休診です。午後は通常どおり受付します。" }
  };

  function ymd(d) {
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
  }

  // 指定日の受付枠を返す。closed: 休診理由（なければ null）
  function sessionsFor(d) {
    var key = ymd(d);
    var sp = SPECIAL[key] || {};
    var base = SCHEDULE[d.getDay()];
    var holiday = HOLIDAYS[key];
    var reason = holiday ? "祝日（" + holiday + "）" : (base.length ? null : "定休日");
    return {
      note: sp.note || null,
      am: { range: AM, closed: reason || (sp.am ? "臨時休診" : null) },
      pm: { range: PM, closed: reason || (sp.pm ? "臨時休診" : null) }
    };
  }

  function stateOf(slot, min) {
    if (slot.closed) return "closed";
    if (min < slot.range[0]) return "before";
    if (min < slot.range[1]) return "open";
    return "after";
  }

  function nextOpening(now) {
    var min = now.getHours() * 60 + now.getMinutes();
    for (var i = 0; i <= 14; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      var s = sessionsFor(d);
      var list = [s.am, s.pm];
      for (var k = 0; k < list.length; k++) {
        var slot = list[k];
        if (slot.closed) continue;
        if (i === 0 && slot.range[0] <= min) continue;
        var label = i === 0 ? "本日" : i === 1 ? "明日" : (d.getMonth() + 1) + "月" + d.getDate() + "日（" + DAY[d.getDay()] + "）";
        return label + " " + fmt(slot.range[0]);
      }
    }
    return null;
  }

  var demoNow = null;

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function hhmm(min) {
    return pad(Math.floor(min / 60)) + ":" + pad(min % 60);
  }

  // 1マス分のHTML。本日のみ「受付中／受付終了」を添える
  function cellHTML(slot, isToday, min) {
    if (slot.closed) {
      var label = slot.closed === "臨時休診" ? "臨時休診"
        : slot.closed.indexOf("祝日") === 0 ? "祝日休診" : "休診";
      var cls = slot.closed === "臨時休診" ? "is-special" : "is-closed";
      return '<td><span class="slot ' + cls + '">' + label + "</span></td>";
    }
    var time = hhmm(slot.range[0]) + " - " + hhmm(slot.range[1]);
    var state = "";
    var cls2 = "is-open";
    if (isToday) {
      var st = stateOf(slot, min);
      if (st === "open") state = '<span class="slot-state">受付中</span>';
      if (st === "after") {
        state = '<span class="slot-state">受付終了</span>';
        cls2 = "is-done";
      }
    }
    return '<td><span class="slot ' + cls2 + '">' + time + state + "</span></td>";
  }

  function renderToday() {
    var root = document.querySelector("[data-today]");
    if (!root) return;
    var now = demoNow || new Date();
    var min = now.getHours() * 60 + now.getMinutes();
    var rows = "";
    var notes = [];

    for (var i = 0; i < 3; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      var s = sessionsFor(d);
      var label = i === 0
        ? "本日"
        : pad(d.getMonth() + 1) + "." + pad(d.getDate()) + "(" + DAY[d.getDay()] + ")";
      rows += '<tr><th scope="row">' + label + "</th>" +
        cellHTML(s.am, i === 0, min) + cellHTML(s.pm, i === 0, min) + "</tr>";
      if (s.note) notes.push("※" + s.note);
    }

    root.querySelector("[data-schedule-body]").innerHTML = rows;
    root.querySelector("[data-today-date]").textContent =
      (now.getMonth() + 1) + "月" + now.getDate() + "日（" + DAY[now.getDay()] + "） " + fmt(min) + " 現在";

    var note = root.querySelector("[data-today-note]");
    note.hidden = !notes.length;
    note.textContent = notes.join(" ");
  }

  function setupToday() {
    var root = document.querySelector("[data-today]");
    if (!root) return;
    var input = root.querySelector("[data-demo-now]");
    function setDemo(v) {
      demoNow = v ? new Date(v) : null;
      if (input) input.value = v || "";
      renderToday();
      highlightToday();
    }
    if (input) {
      input.addEventListener("change", function () { setDemo(input.value); });
    }
    root.querySelectorAll("[data-demo-sample]").forEach(function (b) {
      b.addEventListener("click", function () { setDemo(b.dataset.demoSample); });
    });
    var reset = root.querySelector("[data-demo-reset]");
    if (reset) reset.addEventListener("click", function () { setDemo(null); });
    renderToday();
    setInterval(function () { if (!demoNow) renderToday(); }, 30000);
  }

  // 診療時間表の今日の列を強調
  function highlightToday() {
    var day = (demoNow || new Date()).getDay();
    document.querySelectorAll(".today").forEach(function (el) {
      el.classList.remove("today");
    });
    document.querySelectorAll("[aria-current='date']").forEach(function (el) {
      el.removeAttribute("aria-current");
    });
    document.querySelectorAll("[data-day='" + day + "']").forEach(function (el) {
      el.classList.add("today");
    });
    var head = document.querySelector("th[data-day='" + day + "']");
    if (head) head.setAttribute("aria-current", "date");
  }

  // モバイル用シート（メニュー）
  function setupSheet() {
    var sheet = document.getElementById("menu-sheet");
    var openBtn = document.querySelector("[data-open-sheet]");
    if (!sheet || !openBtn) return;
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      sheet.dataset.open = "true";
      openBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      var first = sheet.querySelector("button, a");
      if (first) first.focus();
    }
    function close() {
      sheet.dataset.open = "false";
      openBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }

    openBtn.addEventListener("click", open);
    sheet.querySelectorAll("[data-close-sheet]").forEach(function (el) {
      el.addEventListener("click", close);
    });
    sheet.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sheet.dataset.open === "true") close();
    });
  }

  // コラムのカテゴリ絞り込み（セグメンテッドコントロール）
  function setupFilter() {
    var control = document.querySelector("[data-filter]");
    if (!control) return;
    var items = document.querySelectorAll("[data-category]");
    var buttons = control.querySelectorAll("button");

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var value = btn.dataset.value;
        buttons.forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        items.forEach(function (item) {
          item.hidden = value !== "all" && item.dataset.category !== value;
        });
      });
    });
  }

  // スクロールでふわっと表示
  function setupReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  }

  // 院内写真スライドショー（スワイプ対応・自動送り・一時停止）
  function setupCarousel() {
    var root = document.querySelector("[data-carousel]");
    if (!root) return;
    var track = root.querySelector("[data-track]");
    var slides = track.children;
    var dots = root.querySelectorAll("[data-slide-to]");
    var toggle = root.querySelector("[data-toggle]");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var index = 0;
    var playing = !reduce;
    var hold = false;
    var timer = null;

    function go(i) {
      index = (i + slides.length) % slides.length;
      track.scrollTo({ left: track.clientWidth * index, behavior: reduce ? "auto" : "smooth" });
    }

    function mark() {
      dots.forEach(function (d, i) {
        d.setAttribute("aria-current", String(i === index));
      });
    }

    function tick() {
      clearInterval(timer);
      if (playing) {
        timer = setInterval(function () {
          if (!hold && !document.hidden) go(index + 1);
        }, 5000);
      }
    }

    function setPlaying(v) {
      playing = v;
      toggle.setAttribute("aria-label", v ? "スライドショーを一時停止" : "スライドショーを再生");
      toggle.querySelector("[data-icon-pause]").hidden = !v;
      toggle.querySelector("[data-icon-play]").hidden = v;
      tick();
    }

    var scrollTimer = null;
    track.addEventListener("scroll", function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        index = Math.round(track.scrollLeft / track.clientWidth);
        mark();
      }, 80);
    });

    dots.forEach(function (d) {
      d.addEventListener("click", function () {
        go(Number(d.dataset.slideTo));
        tick();
      });
    });

    root.querySelector("[data-prev]").addEventListener("click", function () {
      go(index - 1);
      tick();
    });
    root.querySelector("[data-next]").addEventListener("click", function () {
      go(index + 1);
      tick();
    });

    toggle.addEventListener("click", function () {
      setPlaying(!playing);
    });

    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { go(index + 1); tick(); }
      if (e.key === "ArrowLeft") { go(index - 1); tick(); }
    });

    ["pointerenter", "focusin", "touchstart"].forEach(function (ev) {
      root.addEventListener(ev, function () { hold = true; }, { passive: true });
    });
    ["pointerleave", "focusout", "touchend"].forEach(function (ev) {
      root.addEventListener(ev, function () { hold = false; }, { passive: true });
    });

    window.addEventListener("resize", function () {
      track.scrollTo({ left: track.clientWidth * index, behavior: "auto" });
    });

    mark();
    setPlaying(playing);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupCarousel();
    setupToday();
    highlightToday();
    setupSheet();
    setupFilter();
    setupReveal();
  });
})();
