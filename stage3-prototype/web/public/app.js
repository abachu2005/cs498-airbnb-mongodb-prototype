const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const F = (n) => (n == null ? "—" : n.toLocaleString());

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function pretty(s) {
  if (!s) return "";
  return String(s)
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function ams(a) {
  if (!a) return [];
  try {
    return JSON.parse(a).slice(0, 4);
  } catch (e) {
    return [];
  }
}

let H = null;

async function poll() {
  try {
    const r = await fetch("/api/health");
    const j = await r.json();
    if (j.ready) {
      H = j;
      onReady(j);
      return;
    }
    if (j.err) {
      $("#boot-status").innerHTML = `<span style="color:#e0224b">Boot failed: ${esc(j.err)}</span>`;
      return;
    }
  } catch (e) {}
  setTimeout(poll, 800);
}

function onReady(j) {
  $("#boot").classList.add("is-hidden");
  if (j.counts) {
    $("#s-l").textContent = F(j.counts.listings);
    $("#s-c").textContent = F(j.counts.calendar);
    $("#s-r").textContent = F(j.counts.reviews);
    $("#s-n").textContent = F(j.counts.neighborhoods);
  }
  if (j.q1_default_dates && j.q1_default_dates.length === 2) {
    $("#q1-from").placeholder = j.q1_default_dates[0];
    $("#q1-to").placeholder = j.q1_default_dates[1];
    $("#q1-hint").innerHTML = `Suggested window from loaded data: <strong>${esc(j.q1_default_dates[0])} → ${esc(j.q1_default_dates[1])}</strong>. Leave the date inputs blank to use it.`;
  }
  runQ1();
}

$$(".tab").forEach((b) =>
  b.addEventListener("click", () => {
    const t = b.dataset.tab;
    $$(".tab").forEach((x) => x.classList.toggle("is-active", x === b));
    $$(".panel").forEach((p) => p.classList.toggle("is-active", p.id === `panel-${t}`));
    if (t === "q5" && !W.q5) runQ5();
    if (t === "q6" && !W.q6) runQ6();
  })
);

const W = { q5: false, q6: false };

$("#q1-form").addEventListener("submit", (e) => {
  e.preventDefault();
  runQ1();
});
$("#q5-run").addEventListener("click", runQ5);
$("#q6-run").addEventListener("click", runQ6);

async function runQ1() {
  const c = $("#q1-city").value;
  const a = $("#q1-from").value;
  const b = $("#q1-to").value;
  const l = $("#q1-limit").value || 12;
  const u = new URLSearchParams({ city: c, limit: l });
  if (a) u.set("from", a);
  if (b) u.set("to", b);

  const o = $("#q1-results");
  o.innerHTML = `<div class="loading">Querying calendar &amp; listings…</div>`;
  try {
    const r = await fetch(`/api/q1?${u}`);
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "request failed");
    renderQ1(j);
  } catch (e) {
    o.innerHTML = `<div class="error">${esc(e.message)}</div>`;
  }
}

function renderQ1(j) {
  const o = $("#q1-results");
  const d = j.dates || ["?", "?"];
  const n = j.results.length;

  if (!n) {
    o.innerHTML = `
      <div class="summary-bar">
        <span><strong>0</strong> listings available in <strong>${esc(pretty(j.city))}</strong> for <strong>${esc(d[0])} → ${esc(d[1])}</strong></span>
        <span class="chip">no matches</span>
      </div>
      <div class="empty">No listings have both dates open. Try a different window or city.</div>`;
    return;
  }

  const g = j.results
    .map((x, i) => {
      const r = x.review_scores_rating != null ? Number(x.review_scores_rating).toFixed(2) : "—";
      const a = ams(x.amenities);
      const p = x.price != null ? `$${x.price}` : "—";
      const v = (i % 6) + 1;
      const ch = (x.name || "?").trim().charAt(0).toUpperCase();
      return `
        <article class="card">
          <div class="card-thumb var-${v}">${esc(ch)}</div>
          <div class="card-title">${esc(x.name || "Untitled")}</div>
          <div class="card-meta">
            <div class="row">
              <span>${esc(x.neighborhood || "—")}</span>
              <span class="rating">${esc(r)}</span>
            </div>
            <div class="row">
              <span>${esc(x.property_type || x.room_type || "")}</span>
              <span>${esc(p)} · sleeps ${esc(x.accommodates ?? "—")}</span>
            </div>
          </div>
          <div class="badges">
            <span class="badge badge-room">${esc(x.room_type || "Room")}</span>
            ${a.map((y) => `<span class="badge">${esc(y)}</span>`).join("")}
          </div>
        </article>`;
    })
    .join("");

  o.innerHTML = `
    <div class="summary-bar">
      <span><strong>${n}</strong> listings available in <strong>${esc(pretty(j.city))}</strong> for <strong>${esc(d[0])} → ${esc(d[1])}</strong></span>
      <span class="chip">sorted by review_scores_rating ↓</span>
    </div>
    <div class="grid">${g}</div>`;
}

async function runQ5() {
  W.q5 = true;
  const o = $("#q5-results");
  o.innerHTML = `<div class="loading">Aggregating December reviews across all cities…</div>`;
  try {
    const r = await fetch("/api/q5");
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "request failed");
    renderQ5(j);
  } catch (e) {
    o.innerHTML = `<div class="error">${esc(e.message)}</div>`;
  }
}

function renderQ5(j) {
  const o = $("#q5-results");
  const a = j.results || [];
  if (!a.length) {
    o.innerHTML = `<div class="empty">No December reviews in the loaded subset.</div>`;
    return;
  }

  const g = {};
  let t = 0;
  for (const x of a) {
    if (!g[x.city]) g[x.city] = [];
    g[x.city].push(x);
    t += x.review_count;
  }

  const m = Math.max(...a.map((x) => x.review_count));

  const blocks = Object.keys(g)
    .sort()
    .map((k) => {
      const rows = g[k]
        .sort((p, q) => p.year.localeCompare(q.year))
        .map((x) => {
          const w = Math.max(2, Math.round((x.review_count / m) * 100));
          return `<div class="bar"><span class="bar-year">${esc(x.year)}</span><div class="bar-track"><div class="bar-fill" style="width:${w}%"></div></div><span class="bar-count">${F(x.review_count)}</span></div>`;
        })
        .join("");
      const sum = g[k].reduce((acc, x) => acc + x.review_count, 0);
      return `
        <div class="city">
          <div class="city-name">${esc(pretty(k))}</div>
          <div class="city-total">${F(sum)} December reviews · ${g[k].length} years</div>
          ${rows}
        </div>`;
    })
    .join("");

  o.innerHTML = `
    <div class="summary-bar">
      <span><strong>${F(t)}</strong> December reviews across <strong>${Object.keys(g).length}</strong> cities and <strong>${a.length}</strong> (city, year) groups</span>
      <span class="chip">full-collection aggregation</span>
    </div>
    <div class="cities">${blocks}</div>`;
}

async function runQ6() {
  W.q6 = true;
  const l = $("#q6-limit").value || 12;
  const o = $("#q6-results");
  o.innerHTML = `<div class="loading">Finding repeat reviewers and pulling same-host listings…</div>`;
  try {
    const r = await fetch(`/api/q6?limit=${l}`);
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "request failed");
    renderQ6(j);
  } catch (e) {
    o.innerHTML = `<div class="error">${esc(e.message)}</div>`;
  }
}

function strip(h) {
  return String(h || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function renderQ6(j) {
  const o = $("#q6-results");
  const a = j.results || [];
  if (!a.length) {
    o.innerHTML = `<div class="empty">No repeat reviewers in the loaded subset.</div>`;
    return;
  }

  const html = a
    .map((x) => {
      const desc = strip(x.description).slice(0, 220);
      const others = (x.other_host_listings_same_city || [])
        .slice(0, 4)
        .map((y) => `<li>${y.listing_url ? `<a href="${esc(y.listing_url)}" target="_blank" rel="noopener">${esc(y.name || "Untitled")}</a>` : esc(y.name || "Untitled")}</li>`)
        .join("");
      const av = x.available_in_same_month ? `<span class="pill ok">open in ${esc(x.month)}</span>` : `<span class="pill no">no openings in ${esc(x.month)}</span>`;
      const nights =
        x.min_nights != null || x.max_nights != null
          ? `<span class="pill">${F(x.min_nights)}–${F(x.max_nights)} nights</span>`
          : "";
      return `
        <article class="reminder">
          <div>
            <div class="reminder-head">
              <span class="reminder-month">${esc(x.month)}</span>
              <span class="reminder-host">guest <strong>#${esc(x.reviewer_id)}</strong> · host <strong>${esc(x.host_name || "—")}</strong></span>
            </div>
            <div class="reminder-listing">${x.listing_url ? `<a href="${esc(x.listing_url)}" target="_blank" rel="noopener">${esc(x.listing_name)}</a>` : esc(x.listing_name)}</div>
            ${desc ? `<div class="reminder-desc">${esc(desc)}…</div>` : ""}
            <div class="reminder-meta">${av}${nights}</div>
          </div>
          <div class="reminder-side">
            <div class="label">Other listings from ${esc(x.host_name || "this host")}</div>
            ${others ? `<ul>${others}</ul>` : `<div style="font-size:13px;color:var(--ink-soft);">No other listings in the same city.</div>`}
          </div>
        </article>`;
    })
    .join("");

  o.innerHTML = `
    <div class="summary-bar">
      <span><strong>${a.length}</strong> repeat-reviewer reminders enriched with calendar &amp; same-host listings</span>
      <span class="chip">1 aggregation + 4 indexed reads per record</span>
    </div>
    <div class="reminders">${html}</div>`;
}

poll();
