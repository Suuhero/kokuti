import { BrowserStore } from "./store.js";
import {
  asset,
  esc,
  rich,
  safeLink,
  mapURL,
  adjust,
  mvAsset,
  mvSVG,
  jsonFile,
} from "./shared.js";
const store = new BrowserStore(),
  urls = [];
const e = esc;
const title = (s, side = true) =>
  `<div class="top_title${side ? " side" : ""}"><p>${e(s.titleEn ?? s.en)}</p><h2>${e(s.title)}</h2></div>`;
const external = (b) =>
  b.external ? ' target="_blank" rel="noopener noreferrer"' : "";
async function run() {
  let record, images;
  const embedded = document.getElementById("kokuti-site-data");
  if (embedded) {
    record = { data: JSON.parse(embedded.textContent) };
    images = new Map();
  } else try {
    record = await store.load();
    images = await store.images();
  } catch {
    record = { data: await jsonFile("data/sample.json") };
    images = new Map();
  }
  const d = record.data;
  const requested = new URL(location.href).searchParams.get("pattern");
  if (["pattern1", "pattern2", "pattern3"].includes(requested))
    d.design = requested;
  const s = d.site,
    i = d.clinicInfo,
    g = d.greeting,
    c = d.colors;
  const media = (path) => {
    if (!path) return "";
    const blob = images.get(path);
    if (blob) {
      const u = URL.createObjectURL(blob);
      urls.push(u);
      return u;
    }
    return asset(path);
  };
  const img = (path, alt, extra = "") =>
    path ? `<img src="${e(media(path))}" alt="${e(alt)}" ${extra}>` : "";
  const logo = s.logoUpload
    ? img(s.logoUpload, s.clinicName)
    : e(s.logoText || s.clinicName);
  const buttons = s.headerButtons.filter((b) => b.label && b.url);
  const btns = buttons
    .map(
      (b) => `<a href="${e(safeLink(b.url))}"${external(b)}>${e(b.label)}</a>`,
    )
    .join("");
  const sns = Object.entries(d.sns)
    .filter(([k, v]) => !["heading", "headingEn"].includes(k) && v)
    .map(
      ([k, v]) =>
        `<li><a class="sns" aria-label="${e(k)}" href="${e(safeLink(v))}" target="_blank" rel="noopener noreferrer"><i aria-hidden="true" class="fa-brands fa-${k === "x" ? "x-twitter" : k}"></i></a></li>`,
    )
    .join("");
  const free = d.freeAreas.map((a, n) =>
    a.body.trim()
      ? `<section id="freearea0${n + 1}" class="sec_top_freearea0${n + 1}"><div class="contents">${title(a)}<div class="text">${rich(a.body)}</div></div></section>`
      : "",
  );
  const links = [
    ["ホーム", "#"],
    ...d.freeAreas
      .slice(0, 2)
      .flatMap((a, n) =>
        a.body
          ? [[a.title || `フリーエリア${n + 1}`, `#freearea0${n + 1}`]]
          : [],
      ),
    [d.newsSettings.title, "#news"],
    [i.title, "#clinicinfo"],
    ["アクセス", "#access"],
    [g.title, "#doctor"],
    [d.services.title, "#medical"],
    [d.background.title, "#feature"],
    ...d.freeAreas
      .slice(2)
      .flatMap((a) =>
        a.body ? [[a.title || "フリーエリア3", "#freearea03"]] : [],
      ),
  ];
  const nav = links
    .map(([label, href]) => `<li><a href="${href}">${e(label)}</a></li>`)
    .join("");
  const footerNav = links.filter(([,href])=>href!=="#"&&href!=="#access")
    .map(([label,href])=>`<li><a href="${href}">${e(label)}</a></li>`).join("");
  document.body.className = `home page-template page-template-front-page page-template-front-page-php page site site--pattern1${d.design === "pattern1" ? "" : " site--" + d.design}`;
  const vars = {
    main: c.main,
    "main-dark": adjust(c.main, -0.18),
    sub: c.sub,
    "sub-light": adjust(c.sub, 0.05),
    text: c.text,
    ink: adjust(c.main,-0.72),
    "main-color": c.main,
    "bg-color": c.sub,
  };
  for (const [k, v] of Object.entries(vars))
    document.documentElement.style.setProperty("--" + k, v);
  document.title = s.pageTitle || s.clinicName;
  document.querySelector("meta[name=description]").content = s.description;
  const mv = await Promise.all(
    d.mv.images.map(async (m, n) => {
      let u;
      if (m.upload) u = media(m.upload);
      else {
        const r = await fetch(asset("assets/" + mvAsset(d.design, m.preset)), {cache:"no-cache"});
        if (!r.ok) throw Error("MV画像を読み込めませんでした");
        let svg = await r.text();
        svg = mvSVG(svg, c);
        u = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
        urls.push(u);
      }
      return `<li class="splide__slide mv-fade-item${n === 0 ? " is-active" : ""}" data-mv-fade-item><img src="${e(u)}" width="1920" height="600" alt="メインビジュアル${n + 1}"></li>`;
    }),
  );
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const schedules = i.schedules
    .map(
      (t, n) =>
        `<div class="sche_wrap" id="sche_wrap${String(n + 1).padStart(2, "0")}"><p class="schedule_title">${e(t.title)}</p><div class="table-scroll"><table class="tb02"><tbody><tr><th>&nbsp;</th>${["月", "火", "水", "木", "金", "土", "日"].map((v) => `<td>${v}</td>`).join("")}</tr>${t.rows.map((r) => `<tr><th>${e(r.time)}</th>${days.map((k) => `<td>${e(r[k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div><div class="schedule_note">${t.closed ? `<p class="kyushinbi">${e(t.closed)}</p>` : ""}${t.freeHtml ? `<div class="text">${rich(t.freeHtml)}</div>` : ""}</div></div>`,
    )
    .join("");
  const departments = i.schedules
    .map((t) => t.title)
    .filter(Boolean)
    .join("・");
  const address = i.address.match(/^(〒[\d-]+)\s*(.*)$/);
  const postal = address?.[1] || "",
    street = address?.[2] || i.address;
  const doctors = g.doctors
    .map((doc) => {
      const cls = doc.imageUpload
        ? doc.body
          ? "01"
          : "02"
        : doc.body || doc.heading
          ? "03"
          : "04";
      return `<div class="top_greeting_wrap${doc.imageUpload ? " has-photo" : ""}"><div class="top_greeting_pattern${cls}"><div class="top_greeting_text">${doc.heading ? `<div class="top_greeting_catch">${e(doc.heading)}</div>` : ""}${doc.body ? `<div class="top_geeting_text text">${rich(doc.body)}</div>` : ""}<div class="top_greeting_name">${doc.position ? `<p class="position">${e(doc.position)}</p>` : ""}${doc.name ? `<p class="name">${e(doc.name)}</p>` : ""}</div></div>${doc.imageUpload ? `<div class="top_greeting_img">${img(doc.imageUpload, doc.name, 'width="800" height="1000"')}</div>` : ""}</div>${doc.career.length ? `<div class="top_profile"><div class="profile_box"><h3 class="tit01">${e(doc.careerTitle)}</h3>${doc.career.some((r) => r.year) ? `<table><tbody>${doc.career.map((r) => `<tr><th>${e(r.year)}</th><td>${e(r.text)}</td></tr>`).join("")}</tbody></table>` : `<ul>${doc.career.map((r) => `<li>${e(r.text)}</li>`).join("")}</ul>`}</div></div>` : ""}</div>`;
    })
    .join("");
  const map = mapURL(i.mapEmbed);
  document.querySelector("#app").innerHTML = `
 <header class="fixed"><div class="inner"><div class="head_logo"><a href="#">${logo}</a></div>${btns ? `<div class="header_btn_box">${btns}</div>` : ""}</div><nav><ul class="navi">${nav}</ul><ul class="nav_btn_area">${buttons.map((b) => `<li><a href="${e(safeLink(b.url))}"${external(b)}>${e(b.label)}</a></li>`).join("")}</ul><ul class="sns_list">${sns}</ul></nav><div class="nav_toggle" role="button" tabindex="0" aria-label="メニューを開く" aria-expanded="false"><span></span><span></span><span></span></div><div class="nav_bg"></div></header>
 <div id="mainvisual" class="${d.mv.images.some(m => m.upload) ? "has-upload" : ""}"><div class="inner"><div class="kokuchi_box"><p class="kokuchi_title">${e(s.clinicName)}</p>${s.openDate ? `<p class="kokuchi_date">${e(s.openDate)}</p>` : ""}${s.kokuchiTitle ? `<p class="kokuchi_open">${e(s.kokuchiTitle)}</p>` : ""}${s.kokuchiSubtitle || s.kokuchiSubDate ? `<div class="kokuchi_note">${s.kokuchiSubtitle ? `<p>${e(s.kokuchiSubtitle)}</p>` : ""}${s.kokuchiSubDate ? `<p>${e(s.kokuchiSubDate)}</p>` : ""}</div>` : ""}</div></div><div id="mv_slider" class="splide mv_slider" data-mv-fade><div class="splide__track"><ul class="splide__list">${mv.join("")}</ul></div></div><h1 class="visually-hidden">${e(s.pageTitle)}</h1></div>
 <main class="front"><div class="top_title sp_link_box contents sp" style="margin-bottom:0!important"><ul class="top_free_link">${buttons.map((b) => `<li><a href="${e(safeLink(b.url))}"${external(b)}>${e(b.label)}</a></li>`).join("")}</ul>${sns ? `<p>${e(d.sns.headingEn)}</p><h2>${e(d.sns.heading)}</h2><ul class="top_sns_link">${sns}</ul>` : ""}</div>${free[0]}${free[1]}
 <section id="news" class="sec_top_news"><div class="contents">${title(d.newsSettings, false)}<div class="sec_top_news_list_wrap"><p>開院準備を進めています。こちらはデモ用のお知らせです。</p></div></div></section>
 <section id="clinicinfo" class="sec_top_clinicinfo"><div class="contents">${title(i)}<div class="clinic-overview"><div class="clinic-facts"><dl><dt>医院名</dt><dd>${e(s.clinicName)}</dd></dl><dl><dt>診療科目</dt><dd>${e(departments)}</dd></dl>${i.tel ? `<dl><dt>電話</dt><dd><a href="tel:${e(i.tel.replace(/[^0-9+]/g, ""))}">${e(i.tel)}</a></dd></dl>` : ""}<dl id="access"><dt>所在地</dt><dd>${e(postal)}<br>${e(street)}</dd></dl>${i.accessItems.length ? `<ul class="access-notes">${i.accessItems.map(a => `<li>${e(a.text)}</li>`).join("")}</ul>` : ""}</div><div class="clinic-schedules">${schedules}</div></div>${map ? `<div class="googlemap"><iframe src="${e(map)}" title="所在地の地図" loading="lazy" referrerpolicy="no-referrer"></iframe></div>` : ""}</div></section>
 <section id="doctor" class="sec_top_doctor"><div class="contents">${title(g)}${doctors}</div></section>
 <section id="medical" class="sec_top_medical"><div class="contents">${title(d.services)}<ul class="top_medical_list">${d.services.items.map((t) => `<li class="top_medical_item"><div class="medical_inner"><h3 class="medical_item_title">${e(t.title)}</h3></div>${t.desc ? `<div class="top_medical_text"><p>${e(t.desc)}</p></div>` : ""}</li>`).join("")}</ul></div></section>
 <section id="feature" class="sec_top_feature"><div class="contents">${title(d.background)}<div class="top_feature_list">${d.background.items.map((t, n) => `<div class="top_feature_item clearfix${t.imageUpload ? " float_wrap" : ""}"><div class="featutr_item_title"><span class="feature_item_num">${String(n + 1).padStart(2,"0")}</span><h3>${e(t.title)}</h3></div>${t.imageUpload ? `<div class="top_feature_img img_fl">${img(t.imageUpload, t.title, 'width="650" height="450"')}</div>` : ""}${t.body ? `<div class="top_feature_text text">${rich(t.body)}</div>` : ""}</div>`).join("")}</div></div></section>${free[2]}</main>
 <footer><div class="contents"><div class="footer_logo" id="flogo"><a href="#">${logo}</a></div><div class="footer_info"><p class="footer_add">${e(postal)}　<br class="sp_inline">${e(street)}</p><p>${e(departments)}</p></div></div><div class="footer_navi"><div class="inner"><ul>${footerNav}</ul></div></div><p class="copy"><small>©${e(s.clinicName)}</small></p><div class="pagetop" role="button" tabindex="0" aria-label="ページ上部へ"></div></footer>
 <aside class="demo-tools" aria-label="デモの操作"><strong>架空の医院・デモ表示</strong><a href="${asset("admin/")}">管理画面を開く</a></aside>`;
  document.querySelectorAll("img").forEach((im) =>
    im.addEventListener("error", () => {
      im.alt += "（画像未配置）";
    }),
  );
  const script = document.createElement("script");
  script.src = asset("assets/original.js");
  document.body.append(script);
  // Rendering is asynchronous, so restore direct section links after insertion.
  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) requestAnimationFrame(() => target.scrollIntoView());
  }
}
run().catch((err) => {
  document.querySelector("#app").innerHTML =
    `<div class="render-error"><h1>デモを表示できませんでした</h1><p>${e(err.message)}</p><a href="${asset("admin/")}">管理画面でデータを確認する</a></div>`;
});
addEventListener("pagehide", () => urls.forEach(URL.revokeObjectURL));
