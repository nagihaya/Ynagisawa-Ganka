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

  // 本日の診療状況
  function renderStatus() {
    var pill = document.querySelector("[data-status-pill]");
    var text = document.querySelector("[data-status-text]");
    if (!pill || !text) return;

    var now = new Date();
    var day = now.getDay();
    var min = now.getHours() * 60 + now.getMinutes();
    var slots = SCHEDULE[day];
    var open = slots.some(function (s) {
      return min >= s[0] && min < s[1];
    });

    pill.textContent = open ? "診療中" : "時間外";
    pill.className = "pill " + (open ? "pill-open" : "pill-closed");

    if (open) {
      var cur = slots.filter(function (s) {
        return min >= s[0] && min < s[1];
      })[0];
      text.textContent = "本日 " + fmt(cur[1]) + " まで受付";
      return;
    }

    var next = slots.filter(function (s) {
      return s[0] > min;
    })[0];
    if (next) {
      text.textContent = "本日 " + fmt(next[0]) + " から受付開始";
      return;
    }
    for (var i = 1; i <= 7; i++) {
      var d = (day + i) % 7;
      if (SCHEDULE[d].length) {
        text.textContent =
          (i === 1 ? "明日" : DAY[d] + "曜日") +
          " " + fmt(SCHEDULE[d][0][0]) + " から受付開始";
        return;
      }
    }
  }

  // 診療時間表の今日の列を強調
  function highlightToday() {
    var day = new Date().getDay();
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
    renderStatus();
    highlightToday();
    setupSheet();
    setupFilter();
    setupReveal();
  });
})();
