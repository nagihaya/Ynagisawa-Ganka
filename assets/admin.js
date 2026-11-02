// 編集画面（提案用デモ）：データの編集・プレビュー・保存・書き出し
(function () {
  "use strict";

  var STORAGE_KEY = "benten-demo-data";
  var DAY = ["日", "月", "火", "水", "木", "金", "土"];
  var ORDER = [1, 2, 3, 4, 5, 6, 0];

  var original = clone(window.CLINIC_DATA);
  var data = load();
  var dirty = false;

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function load() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return clone(original);
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function today() {
    var d = new Date();
    var p = function (n) { return n < 10 ? "0" + n : String(n); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function dateLabel(s) {
    if (!s) return "日付未設定";
    var d = new Date(s + "T00:00");
    return (d.getMonth() + 1) + "月" + d.getDate() + "日（" + DAY[d.getDay()] + "）";
  }

  // ---------- 状態表示 ----------
  function setDirty(v) {
    dirty = v;
    var el = $("[data-save-state]");
    el.textContent = v ? "未保存の変更があります" : "保存済み";
    el.classList.toggle("is-dirty", v);
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $("[data-toast]");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2400);
  }

  // ---------- プレビュー ----------
  var previewTimer = null;
  function pushPreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(function () {
      var frame = $("[data-preview]");
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: "clinic-preview", data: data }, "*");
      }
    }, 120);
  }

  function changed() {
    setDirty(true);
    pushPreview();
  }

  // ---------- 臨時休診 ----------
  var ICON_TRASH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
  var ICON_UP = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>';
  var ICON_DOWN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

  function renderSpecial() {
    var list = $("[data-list='special']");
    data.special.sort(function (a, b) { return (a.date || "9999").localeCompare(b.date || "9999"); });
    if (!data.special.length) {
      list.innerHTML = '<p class="empty">臨時休診の予定はありません。「＋ 追加」から登録できます。</p>';
      return;
    }
    var t = today();
    list.innerHTML = data.special.map(function (s, i) {
      var past = s.date && s.date < t;
      var both = s.am && s.pm;
      var summary = both ? "終日休診" : s.am ? "午前休診" : s.pm ? "午後休診" : "休診なし（お知らせのみ）";
      return '<article class="item-card' + (past ? " is-past" : "") + '" data-index="' + i + '">' +
        '<div class="item-head">' +
          '<strong>' + esc(dateLabel(s.date)) + "</strong>" +
          '<span class="item-tag">' + summary + "</span>" +
          (past ? '<span class="item-tag is-muted">終了</span>' : "") +
          '<button type="button" class="icon-btn" data-del aria-label="この臨時休診を削除">' + ICON_TRASH + "</button>" +
        "</div>" +
        '<div class="form-card">' +
          '<label class="form-row"><span class="form-label">日付</span><input type="date" data-f="date" value="' + esc(s.date) + '"></label>' +
          '<label class="form-row"><span class="form-label">午前を休診</span><input type="checkbox" class="switch" data-f="am"' + (s.am ? " checked" : "") + "></label>" +
          '<label class="form-row"><span class="form-label">午後を休診</span><input type="checkbox" class="switch" data-f="pm"' + (s.pm ? " checked" : "") + "></label>" +
          '<label class="form-row is-stacked"><span class="form-label">表に添える案内</span><textarea rows="2" data-f="note" placeholder="例：10月30日（金）は午前休診です。">' + esc(s.note) + "</textarea></label>" +
        "</div>" +
        (s.date ? "" : '<p class="field-error">日付を入力してください</p>') +
      "</article>";
    }).join("");
  }

  function bindSpecial() {
    var list = $("[data-list='special']");
    list.addEventListener("input", function (e) {
      var card = e.target.closest("[data-index]");
      if (!card) return;
      var item = data.special[Number(card.dataset.index)];
      var f = e.target.dataset.f;
      if (f === "am" || f === "pm") item[f] = e.target.checked;
      else item[f] = e.target.value;
      changed();
    });
    // 日付・休診の切り替えが確定したら並べ替えと表示を更新
    list.addEventListener("change", function (e) {
      if (e.target.dataset.f && e.target.dataset.f !== "note") renderSpecial();
    });
    list.addEventListener("click", function (e) {
      if (!e.target.closest("[data-del]")) return;
      var card = e.target.closest("[data-index]");
      var item = data.special[Number(card.dataset.index)];
      if (!confirm(dateLabel(item.date) + " の臨時休診を削除しますか？")) return;
      data.special.splice(Number(card.dataset.index), 1);
      renderSpecial();
      changed();
    });
  }

  // ---------- お知らせ ----------
  function renderNews() {
    var list = $("[data-list='news']");
    if (!data.news.length) {
      list.innerHTML = '<p class="empty">お知らせはありません。「＋ 追加」から登録できます。</p>';
      return;
    }
    list.innerHTML = data.news.map(function (n, i) {
      return '<article class="item-card" data-index="' + i + '">' +
        '<div class="item-head">' +
          '<span class="item-num">' + (i + 1) + "</span>" +
          '<strong class="item-title">' + esc(n.title || "（タイトル未入力）") + "</strong>" +
          '<button type="button" class="icon-btn" data-move="-1" aria-label="上へ移動"' + (i === 0 ? " disabled" : "") + ">" + ICON_UP + "</button>" +
          '<button type="button" class="icon-btn" data-move="1" aria-label="下へ移動"' + (i === data.news.length - 1 ? " disabled" : "") + ">" + ICON_DOWN + "</button>" +
          '<button type="button" class="icon-btn" data-del aria-label="このお知らせを削除">' + ICON_TRASH + "</button>" +
        "</div>" +
        '<div class="form-card">' +
          '<label class="form-row"><span class="form-label">日付</span><input type="date" data-f="date" value="' + esc(n.date) + '"></label>' +
          '<label class="form-row is-stacked"><span class="form-label">タイトル</span><input type="text" data-f="title" value="' + esc(n.title) + '" placeholder="例：年末年始の休診について"></label>' +
          '<label class="form-row is-stacked"><span class="form-label">本文</span><textarea rows="3" data-f="body" placeholder="お知らせの本文">' + esc(n.body) + "</textarea></label>" +
        "</div>" +
        (n.title ? "" : '<p class="field-error">タイトルを入力してください</p>') +
      "</article>";
    }).join("");
  }

  function bindNews() {
    var list = $("[data-list='news']");
    list.addEventListener("input", function (e) {
      var card = e.target.closest("[data-index]");
      if (!card) return;
      var item = data.news[Number(card.dataset.index)];
      item[e.target.dataset.f] = e.target.value;
      if (e.target.dataset.f === "title") {
        $(".item-title", card).textContent = item.title || "（タイトル未入力）";
        var err = $(".field-error", card);
        if (item.title && err) err.remove();
      }
      changed();
    });
    list.addEventListener("click", function (e) {
      var card = e.target.closest("[data-index]");
      if (!card) return;
      var i = Number(card.dataset.index);
      var move = e.target.closest("[data-move]");
      if (move) {
        var j = i + Number(move.dataset.move);
        var tmp = data.news[i];
        data.news[i] = data.news[j];
        data.news[j] = tmp;
        renderNews();
        changed();
        return;
      }
      if (e.target.closest("[data-del]")) {
        if (!confirm("「" + (data.news[i].title || "このお知らせ") + "」を削除しますか？")) return;
        data.news.splice(i, 1);
        renderNews();
        changed();
      }
    });
  }

  // ---------- 受付時間 ----------
  function renderHours() {
    $all("[data-hours]").forEach(function (el) {
      var path = el.dataset.hours.split(".");
      var v = path.length === 2 ? data.hours[path[0]][path[1]] : data.hours[path[0]];
      if (el.type === "checkbox") el.checked = v !== false;
      else el.value = v;
    });
    $("[data-week-edit]").innerHTML = ORDER.map(function (d) {
      var w = data.hours.week[d];
      return "<tr><th scope=\"row\">" + DAY[d] + "曜" + "</th>" +
        '<td><input type="checkbox" class="switch" data-day="' + d + '" data-slot="am" aria-label="' + DAY[d] + '曜の午前"' + (w.am ? " checked" : "") + "></td>" +
        '<td><input type="checkbox" class="switch" data-day="' + d + '" data-slot="pm" aria-label="' + DAY[d] + '曜の午後"' + (w.pm ? " checked" : "") + "></td></tr>";
    }).join("");
    validateHours();
  }

  function validateHours() {
    var h = data.hours;
    var msg = "";
    if (!(h.am.start < h.am.end)) msg = "午前の終了時刻は開始時刻より後にしてください。";
    else if (!(h.pm.start < h.pm.end)) msg = "午後の終了時刻は開始時刻より後にしてください。";
    else if (!(h.am.end <= h.pm.start)) msg = "午後の開始時刻は午前の終了時刻より後にしてください。";
    var el = $("[data-hours-error]");
    el.textContent = msg;
    el.hidden = !msg;
    return !msg;
  }

  function bindHours() {
    var panel = $("[data-panel='hours']");
    panel.addEventListener("input", function (e) {
      var t = e.target;
      if (t.dataset.hours) {
        var path = t.dataset.hours.split(".");
        var v = t.type === "checkbox" ? t.checked : t.value;
        if (path.length === 2) data.hours[path[0]][path[1]] = v;
        else data.hours[path[0]] = v;
        validateHours();
      } else if (t.dataset.day) {
        data.hours.week[t.dataset.day][t.dataset.slot] = t.checked;
      } else {
        return;
      }
      changed();
    });
  }

  // ---------- 保存・書き出し・元に戻す ----------
  function valid() {
    if (!validateHours()) {
      showTab("hours");
      toast("受付時間の入力を確認してください");
      return false;
    }
    if (data.special.some(function (s) { return !s.date; })) {
      showTab("special");
      toast("臨時休診の日付が未入力です");
      return false;
    }
    if (data.news.some(function (n) { return !n.title; })) {
      showTab("news");
      toast("お知らせのタイトルが未入力です");
      return false;
    }
    return true;
  }

  function save() {
    if (!valid()) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setDirty(false);
      toast("保存しました（このブラウザ）");
    } catch (e) {
      toast("この環境では保存できません。「書き出し」をご利用ください");
    }
  }

  function exportFile() {
    if (!valid()) return;
    var text = "// サイトの更新データ（編集画面 admin.html から書き出し）\nwindow.CLINIC_DATA = " +
      JSON.stringify(data, null, 2) + ";\n";
    var blob = new Blob([text], { type: "text/javascript" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data.js";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
    toast("data.js を書き出しました");
  }

  function reset() {
    if (!confirm("保存した変更を取り消して、元の内容に戻しますか？")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    data = clone(original);
    renderAll();
    pushPreview();
    setDirty(false);
    toast("元の内容に戻しました");
  }

  // ---------- 追加 ----------
  function add(kind) {
    if (kind === "special") {
      data.special.push({ date: today(), am: true, pm: false, note: "" });
      renderSpecial();
    } else {
      data.news.unshift({ date: today(), title: "", body: "" });
      renderNews();
    }
    changed();
    var first = kind === "special"
      ? $("[data-list='special'] input[type='date']")
      : $("[data-list='news'] input[data-f='title']");
    if (kind === "special") {
      var cards = $all("[data-list='special'] .item-card");
      var t = today();
      cards.forEach(function (c) {
        var d = $("input[type='date']", c);
        if (d && d.value === t) first = d;
      });
    }
    if (first) {
      first.focus();
      first.scrollIntoView({ block: "center" });
    }
  }

  // ---------- タブ・表示切替 ----------
  function showTab(name) {
    $all("[data-tab]").forEach(function (b) {
      var on = b.dataset.tab === name;
      b.setAttribute("aria-selected", String(on));
      b.setAttribute("aria-pressed", String(on));
    });
    $all("[data-panel]").forEach(function (p) {
      p.hidden = p.dataset.panel !== name;
    });
    // 見たい場所へプレビューを移動
    var frame = $("[data-preview]");
    try {
      var doc = frame.contentDocument;
      var target = doc && doc.getElementById(name === "news" ? "news" : "hours");
      if (target) target.scrollIntoView({ block: "start" });
    } catch (e) {}
  }

  function renderAll() {
    renderSpecial();
    renderNews();
    renderHours();
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderAll();
    bindSpecial();
    bindNews();
    bindHours();
    setDirty(false);

    $all("[data-tab]").forEach(function (b) {
      b.addEventListener("click", function () { showTab(b.dataset.tab); });
    });
    $all("[data-add]").forEach(function (b) {
      b.addEventListener("click", function () { add(b.dataset.add); });
    });
    $("[data-save]").addEventListener("click", save);
    $("[data-export]").addEventListener("click", exportFile);
    $("[data-reset]").addEventListener("click", reset);

    $all("[data-view]").forEach(function (b) {
      b.addEventListener("click", function () {
        $all("[data-view]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        $("[data-layout]").dataset.mode = b.dataset.view;
        pushPreview();
      });
    });
    $all("[data-device]").forEach(function (b) {
      if (b.tagName !== "BUTTON") return;
      b.addEventListener("click", function () {
        $all("button[data-device]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        $("[data-stage]").dataset.device = b.dataset.device;
      });
    });

    $("[data-preview]").addEventListener("load", pushPreview);

    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    });
    window.addEventListener("beforeunload", function (e) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
  });
})();
