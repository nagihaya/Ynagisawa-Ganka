// やなぎさわ眼科 デモサイト用スクリプト（依存なし）
(function () {
  "use strict";

  // 診療時間（0=日曜）。[開始, 終了] は分単位
  var SCHEDULE = {
    0: [],
    1: [[540, 750], [870, 1080]],
    2: [[540, 750], [870, 1080]],
    3: [[540, 750], [870, 1080]],
    4: [[540, 750]],
    5: [[540, 750], [870, 1080]],
    6: [[540, 750], [840, 960]]
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
      text.textContent = "本日 " + fmt(cur[1]) + " まで（受付は15分前まで）";
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

  document.addEventListener("DOMContentLoaded", function () {
    renderStatus();
    highlightToday();
    setupSheet();
    setupFilter();
    setupReveal();
  });
})();
