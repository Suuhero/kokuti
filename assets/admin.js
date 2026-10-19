import { BrowserStore } from "./store.js";
import {
  asset,
  esc as e,
  get,
  set,
  clone,
  palettes,
  adjust,
  designs,
  jsonFile,
  download,
  mediaRefs,
  validate,
} from "./shared.js";
const store = new BrowserStore();
let presetSources = [];
let data,
  schema,
  images = new Map(),
  revision = 0,
  updatedAt = null,
  dirty = false,
  busy = false,
  screen = "home",
  imageURLs = [];
const nav = [
  [
    "home",
    "ホーム",
    "admin-home",
    "編集する項目を選んで、告知サイトを整えましょう。",
  ],
  [
    "basic",
    "基本情報",
    "media-document",
    "医院名や開院のお知らせを編集します。",
  ],
  [
    "design",
    "デザイン・カラー",
    "admin-appearance",
    "元の3つのデザインと18色のパレットから選べます。",
  ],
  [
    "images",
    "ロゴ・メイン画像",
    "format-image",
    "ロゴとメインビジュアルを設定します。",
  ],
  [
    "clinic",
    "医院案内・診療時間",
    "clock",
    "所在地・アクセス・診療時間を編集します。",
  ],
  ["doctors", "医師紹介", "groups", "ご挨拶や医師の経歴を編集します。"],
  ["services", "診療内容", "heart", "診療項目と補足説明を編集します。"],
  [
    "features",
    "当院の特徴",
    "star-filled",
    "医院の特徴を項目ごとに紹介します。",
  ],
  [
    "free",
    "フリーエリア",
    "welcome-widgets-menus",
    "3つの自由記述エリアを編集します。",
  ],
  [
    "sns",
    "SNS・リンク",
    "admin-links",
    "ヘッダーボタンとSNSのリンクを設定します。",
  ],
  [
    "news",
    "お知らせ連携",
    "megaphone",
    "MPクラウド連携の表示・接続先を設定します。",
  ],
  [
    "tools",
    "詳細設定",
    "admin-settings",
    "JSON・画像のダウンロードとAI用プロンプト。",
  ],
];
const defaults = {
  "mv.images": { preset: "preset-mv-1.svg", upload: "" },
  "clinicInfo.accessItems": { text: "" },
  "clinicInfo.schedules": {
    title: "",
    rows: [
      {
        time: "",
        mon: "",
        tue: "",
        wed: "",
        thu: "",
        fri: "",
        sat: "",
        sun: "",
      },
    ],
    closed: "",
    freeHtml: "",
  },
  rows: {
    time: "",
    mon: "",
    tue: "",
    wed: "",
    thu: "",
    fri: "",
    sat: "",
    sun: "",
  },
  "greeting.doctors": {
    heading: "",
    body: "",
    position: "",
    name: "",
    imageUpload: "",
    careerTitle: "経歴",
    career: [],
  },
  career: { year: "", text: "" },
  "services.items": { title: "", desc: "" },
  "background.items": { title: "", body: "", imageUpload: "" },
};
const id = (p) => "f-" + p.replaceAll(".", "-");
function field(path, label, type = "text", hint = "") {
  const value = get(data, path);
  const attrs = `id="${id(path)}" data-path="${path}"`;
  let input;
  if (type === "textarea")
    input = `<textarea ${attrs} rows="4">${e(value)}</textarea>`;
  else if (type === "checkbox")
    input = `<label class="checkline"><input ${attrs} type="checkbox" ${value ? "checked" : ""}>別タブで開く</label>`;

  else
    input = `<input ${attrs} type="text" value="${e(value)}" maxlength="20000" ${/tel$/.test(path) ? 'inputmode="tel"' : ""}>`;
  return `<div class="field"><label for="${id(path)}">${e(label)}</label><div class="control">${input}${hint ? `<p class="hint">${e(hint)}</p>` : ""}</div></div>`;
}
function presetField(path) {
  const colors = {MAIN:data.colors.main, MAIN_DARK:adjust(data.colors.main,-0.18), SUB:data.colors.sub, SUB_LIGHT:adjust(data.colors.sub,0.28)};
  return '<fieldset class="preset-field"><legend>プリセットを画像で選ぶ</legend><div class="preset-grid">' + [1,2,3].map((n) => {
    const value = 'preset-mv-'+n+'.svg';
    const svg = presetSources[n-1].replace(/\{\{(\w+)\}\}/g, (_,key) => colors[key]);
    const url = URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})); imageURLs.push(url);
    return '<label class="preset-choice"><input type="radio" name="'+path+'" data-path="'+path+'" value="'+value+'" '+(get(data,path)===value?'checked':'')+'><img src="'+url+'" alt="プリセット '+n+'"><span>プリセット '+n+'</span></label>';
  }).join('') + '</div><p class="hint">選択中のカラーで表示しています。アップロード画像を使っている場合は、画像を解除するとプリセットが表示されます。</p></fieldset>';
}
function designSample(key) {
  return '<span class="design-sample sample-'+key+'" style="--sample-main:'+e(data.colors.main)+';--sample-sub:'+e(data.colors.sub)+'"><span class="sample-en">MEDICAL</span><span class="sample-title">診療のご案内</span><span class="sample-card"><span class="sample-card-title">内科・小児科</span><span class="sample-copy">いつもの安心を、<br>地域の皆さまへ。</span></span></span>';
}
function imageField(path, label) {
  const value = get(data, path);
  let u = "";
  if (value && images.has(value)) {
    u = URL.createObjectURL(images.get(value));
    imageURLs.push(u);
  }
  return `<div class="field"><label for="${id(path)}">${e(label)}</label><div class="control"><div class="image-editor">${u ? `<img class="image-preview" src="${u}" alt="${e(label)}のプレビュー">` : `<div class="empty-image">${value ? "画像ファイルが未配置です" : "画像は設定されていません"}</div>`}<div class="image-actions"><input id="${id(path)}" type="file" accept="image/png,image/jpeg,image/webp" data-image="${path}" aria-label="${e(label)}">${value ? `<button type="button" class="remove" data-clear-image="${path}">画像を解除</button>` : ""}</div><p class="hint">JPG / PNG / WebP・1枚5MBまで。${value ? e(value) : ""}</p></div></div></div>`;
}
function panel(name, body, intro = "") {
  return `<section class="panel"><h2>${e(name)}</h2>${intro ? `<p class="panel-intro">${e(intro)}</p>` : ""}${body}</section>`;
}
function headings(prefix) {
  return (
    field(prefix + ".title", "セクションタイトル") +
    field(prefix + ".titleEn", "英字タイトル")
  );
}
function repeat(path, label, render, max = 50) {
  const arr = get(data, path);
  return `<div class="repeater">${arr.map((item, n) => `<div class="repeat-item"><div class="repeat-header"><h3>${e(label)} ${n + 1}${item.name || item.title ? " / " + e(item.name || item.title) : ""}</h3><button type="button" class="remove" data-remove="${path}" data-index="${n}" aria-label="${e(label)} ${n + 1}を削除" ${path === "mv.images" && arr.length === 1 ? "disabled" : ""}>削除</button></div>${render(path + "." + n, item, n)}</div>`).join("")}<button type="button" data-add="${path}" ${arr.length >= max ? "disabled" : ""}>${e(label)}を追加</button>${max === 3 ? '<p class="hint">最大3枚。複数枚はフェードで切り替わります。</p>' : ""}</div>`;
}
function scheduleRows(path) {
  const rows = get(data, path);
  return `<div class="repeater"><h4 class="mini-title">診療時間表</h4><div class="table-scroll"><table class="rows-table"><thead><tr>${["時間帯", "月", "火", "水", "木", "金", "土", "日", "操作"].map((t) => `<th scope="col">${t}</th>`).join("")}</tr></thead><tbody>${rows.map((r, n) => `<tr>${["time", "mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((k, j) => `<td><input data-path="${path}.${n}.${k}" value="${e(r[k])}" aria-label="時間帯${n + 1} ${["時間", "月", "火", "水", "木", "金", "土", "日"][j]}"></td>`).join("")}<td><button type="button" class="remove" data-remove="${path}" data-index="${n}" aria-label="時間帯${n + 1}を削除">削除</button></td></tr>`).join("")}</tbody></table></div><button type="button" data-add="${path}">時間帯を追加</button></div>`;
}
function view() {
  if (screen === "home")
    return (
      panel(
        "告知サイトを編集する",
        `<div class="home-intro"><h2>${e(data.site.clinicName)}</h2><p>左のメニューから項目を編集し、「変更を保存」で反映します。</p></div><div class="home-links">${nav
          .slice(1, 11)
          .map(
            ([key, label, , desc]) =>
              `<a href="#${key}">${label}<span>${desc}</span></a>`,
          )
          .join("")}</div>`,
      ) +
      panel(
        "デモの使い方",
        '<div class="tools"><p>保存した内容は、このブラウザの告知サイトに反映されます。他の人のデモや本番サイトには影響しません。</p><p>ブラウザのデータを削除すると編集内容も消えます。残したい内容は詳細設定からJSONと画像をダウンロードしてください。</p><div class="tool-row"><a href="../" target="_blank" rel="noopener">サイトを表示</a><a href="#tools">ダウンロード・初期化</a></div></div>',
      )
    );
  if (screen === "basic")
    return (
      panel(
        "サイト情報",
        field(
          "site.clinicName",
          "医院名",
          "text",
          "メインビジュアルと医院案内に表示されます。",
        ) +
          field(
            "site.pageTitle",
            "ページタイトル",
            "text",
            "ブラウザのタブとH1に使います。",
          ) +
          field("site.description", "サイトの説明", "textarea") +
          field("site.analyticsCode", "アナリティクスコード", "textarea", "<script>タグを含む計測コードを貼り付けてください。FTP用PHPでは公開ページの<head>に出力します。GitHub Pagesデモでは保存・JSON出力のみで、計測は実行しません。"),
      ) +
      panel(
        "開院のお知らせ",
        field("site.openDate", "日付") +
          field("site.kokuchiTitle", "タイトル") +
          field("site.kokuchiSubtitle", "サブタイトル") +
          field("site.kokuchiSubDate", "サブ日付"),
      )
    );
  if (screen === "design")
    return (
      panel(
        "デザインパターン",
        `<div class="designs">${designs.map(([key, name, desc]) => `<label class="design-choice"><input type="radio" name="design" data-path="design" value="${key}" ${data.design === key ? "checked" : ""}>${designSample(key)}<strong>${name}</strong><small>${desc}</small></label>`).join("")}</div>`,
        "見出し・本文の書体とカードの角を拡大した比較見本です。公開サイトのレイアウトはそのままです。",
      ) +
      panel(
        "カラーパレット",
        `<div class="palette-grid">${palettes.map(([key, label, main, sub], n) => `<label class="palette"><input type="radio" name="palette" data-palette="${key}" ${data.colors.preset === key ? "checked" : ""}><span class="palette-name">${String(n + 1).padStart(2, "0")} ${label}</span><span class="swatches"><i style="background:${main}"></i><i style="background:${sub}"></i></span></label>`).join("")}</div>`,
        "メインカラー・背景色・MVプリセットに反映されます。",
      )
    );
  if (screen === "images")
    return (
      panel(
        "ロゴ",
        field("site.logoText", "ロゴ表示テキスト") +
          imageField("site.logoUpload", "ロゴ画像"),
      ) +
      panel(
        "メインビジュアル",
        repeat(
          "mv.images",
          "MV画像",
          (p) =>
            presetField(p + ".preset") +
            imageField(p + ".upload", "アップロード画像"),
          3,
        ),
        "画像をアップロードするとプリセットより優先されます。",
      )
    );
  if (screen === "clinic")
    return (
      panel("セクションの見出し", headings("clinicInfo")) +
      panel(
        "診療時間",
        repeat(
          "clinicInfo.schedules",
          "診療科",
          (p) =>
            field(p + ".title", "診療科名") +
            scheduleRows(p + ".rows") +
            field(p + ".closed", "休診日") +
            field(
              p + ".freeHtml",
              "自由記述",
              "textarea",
              "段落・太字・リスト・リンクなどの限定HTMLが使えます。",
            ),
        ),
      ) +
      panel(
        "所在地・連絡先",
        field("clinicInfo.address", "住所") +
          field("clinicInfo.tel", "電話番号") +
          field(
            "clinicInfo.mapEmbed",
            "Googleマップ",
            "textarea",
            "Googleマップのiframe埋め込みコード、または埋め込みURL。",
          ),
      ) +
      panel(
        "アクセス",
        repeat("clinicInfo.accessItems", "アクセス項目", (p) =>
          field(p + ".text", "案内文"),
        ),
      )
    );
  if (screen === "doctors")
    return (
      panel("セクションの見出し", headings("greeting")) +
      panel(
        "医師情報",
        repeat(
          "greeting.doctors",
          "医師",
          (p) =>
            field(p + ".heading", "見出し") +
            field(p + ".body", "挨拶文", "textarea") +
            field(p + ".position", "役職") +
            field(p + ".name", "氏名") +
            imageField(p + ".imageUpload", "医師の写真") +
            field(p + ".careerTitle", "経歴の見出し") +
            repeat(
              p + ".career",
              "経歴",
              (q) =>
                field(q + ".year", "年（任意）") + field(q + ".text", "内容"),
            ),
        ),
      )
    );
  if (screen === "services")
    return (
      panel("セクションの見出し", headings("services")) +
      panel(
        "診療項目",
        repeat(
          "services.items",
          "診療項目",
          (p) =>
            field(p + ".title", "タイトル") +
            field(p + ".desc", "補足", "textarea"),
        ),
      )
    );
  if (screen === "features")
    return (
      panel("セクションの見出し", headings("background")) +
      panel(
        "特徴項目",
        repeat(
          "background.items",
          "特徴",
          (p) =>
            field(p + ".title", "見出し") +
            field(p + ".body", "本文", "textarea") +
            imageField(p + ".imageUpload", "画像"),
        ),
        "POINT番号は順番に自動で付きます。",
      )
    );
  if (screen === "free")
    return data.freeAreas
      .map((_, n) =>
        panel(
          "フリーエリア " + (n + 1),
          field(`freeAreas.${n}.title`, "セクションタイトル") +
            field(`freeAreas.${n}.en`, "英字タイトル") +
            field(
              `freeAreas.${n}.body`,
              "本文",
              "textarea",
              "本文が空のエリアは表示されません。段落・太字・リンクなどの限定HTMLが使えます。",
            ),
        ),
      )
      .join("");
  if (screen === "sns")
    return (
      panel(
        "ヘッダーボタン",
        data.site.headerButtons
          .map(
            (_, n) =>
              `<div class="repeat-header"><h3>ボタン ${n + 1}</h3></div>` +
              field(`site.headerButtons.${n}.label`, "文言") +
              field(
                `site.headerButtons.${n}.url`,
                "リンク先",
                "text",
                "https://… または #clinicinfo のようなページ内リンク。",
              ) +
              field(
                `site.headerButtons.${n}.external`,
                "リンクの開き方",
                "checkbox",
              ),
          )
          .join(""),
      ) +
      panel(
        "SNSリンク",
        field("sns.heading", "セクションタイトル") +
          field("sns.headingEn", "英字タイトル") +
          ["facebook", "instagram", "line", "x", "tiktok"]
            .map((k) =>
              field(
                "sns." + k,
                {
                  facebook: "Facebook",
                  instagram: "Instagram",
                  line: "LINE",
                  x: "X",
                  tiktok: "TikTok",
                }[k],
              ),
            )
            .join(""),
        "未入力のSNSは表示しません。",
      )
    );
  if (screen === "news")
    return (
      panel("お知らせの表示", headings("newsSettings")) +
      panel(
        "MPクラウド連携",
        field(
          "newsSettings.clinicUrl",
          "本番URL",
          "text",
          "医院の本番サイトURLを入力してください。",
        ),
        "Pages版は固定の架空のお知らせを表示します。実際のAPI接続はXサーバー対応の工程で確認します。",
      )
    );
  if (screen === "tools") {
    const refs = [...mediaRefs(data)];
    return (
      panel(
        "データのダウンロード",
        `<div class="tools"><p>現在の入力内容をsite.jsonとしてダウンロードします。画像は下の一覧から1つずつ保存してください。画像の配置先はmedia/です。</p><div class="tool-row"><button type="button" data-action="export">site.jsonをダウンロード</button><a href="${asset("data/AIプロンプト.txt")}" download="基本情報シートからJSON作成_プロンプト.txt">AI用プロンプト</a><a href="${asset("data/schema.json")}" download="schema.json">JSON仕様</a></div><ul class="files">${refs.map((ref) => `<li><span>${e(ref)}${images.has(ref) ? "" : "（画像未配置）"}</span><button type="button" data-download-image="${e(ref)}" ${images.has(ref) ? "" : "disabled"}>ダウンロード</button></li>`).join("") || "<li>アップロード画像はありません。</li>"}</ul></div>`,
      ) +
      panel(
        "JSONを試す",
        `<div class="tools"><p>AIで作ったJSONを読み込み、保存する前に内容を確認できます。読み込み時に現在の入力内容を置き換えます。</p><label for="import-json">site.jsonを選択</label><p><input id="import-json" type="file" accept=".json,application/json"></p><p>画像ファイルは「ロゴ・メイン画像」「医師紹介」等から設定してください。</p></div>`,
      ) +
      panel(
        "デモを初期化",
        `<div class="tools"><p>このブラウザに保存したデータと画像を、最初の架空データに戻します。</p><button type="button" class="remove" data-action="reset">デモを初期状態に戻す</button></div>`,
      )
    );
  }
}
function state() {
  document.querySelector("#save-state").textContent = busy
    ? "保存中…"
    : dirty
      ? "未保存の変更があります"
      : updatedAt
        ? new Date(updatedAt).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
          }) + " 保存済み"
        : "保存済み";
  document.querySelector("#save-state").classList.toggle("dirty", dirty);
  document.querySelector("#save").disabled = busy;
  document.querySelector("#clinic-label").textContent =
    data.site.clinicName || "医院名未入力";
}
function notice(message, error = false) {
  const el = document.querySelector("#notice");
  el.hidden = false;
  el.className = error ? "error" : "";
  el.innerHTML = Array.isArray(message)
    ? "<ul>" + message.map((v) => `<li>${e(v)}</li>`).join("") + "</ul>"
    : e(message);
}
function render() {
  imageURLs.forEach(URL.revokeObjectURL);
  imageURLs = [];
  const active = nav.find((n) => n[0] === screen) || nav[0];
  document.querySelector("#page-title").textContent = active[1];
  document.querySelector("#page-description").textContent = active[3];
  document.querySelector("#nav").innerHTML = nav
    .map(
      ([key, label, icon]) =>
        `<a href="#${key}" ${key === screen ? 'aria-current="page"' : ""}><span class="dashicons dashicons-${icon}" aria-hidden="true"></span>${label}</a>`,
    )
    .join("");
  document.querySelector("#editor").innerHTML = view();
  state();
}
function mark() {
  dirty = true;
  state();
}
function ask(title, body, ok = "実行する") {
  const dialog = document.querySelector("#confirm");
  document.querySelector("#confirm-title").textContent = title;
  document.querySelector("#confirm-body").textContent = body;
  document.querySelector("#confirm-ok").textContent = ok;
  dialog.returnValue = "cancel";
  dialog.showModal();
  return new Promise((resolve) =>
    dialog.addEventListener(
      "close",
      () => resolve(dialog.returnValue === "ok"),
      { once: true },
    ),
  );
}
function check() {
  const errors = validate(data, schema);
  if (errors.length) {
    notice(errors, true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return false;
  }
  return true;
}
async function save() {
  if (busy || !check()) return;
  const snapshot = clone(data),
    snapshotImages = new Map(images);
  busy = true;
  state();
  try {
    const saved = await store.save(snapshot, snapshotImages, revision);
    revision = saved.revision;
    updatedAt = saved.updatedAt;
    dirty = JSON.stringify(data) !== JSON.stringify(snapshot);
    notice(
      dirty
        ? "保存しました。保存中に入力した変更は、もう一度保存してください。"
        : "変更をこのブラウザに保存しました。「サイトを表示」で確認できます。",
    );
  } catch (err) {
    notice(err.message, true);
  } finally {
    busy = false;
    state();
  }
}
async function upload(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (
    file.size > 5 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw Error("画像はJPG・PNG・WebP、5MB以下にしてください。");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw Error("画像を読み込めませんでした。画像形式を確認してください。");
  });
  if (bitmap.width > 16000 || bitmap.height > 16000) {
    bitmap.close();
    throw Error("画像が大きすぎます。縦横16000px以下にしてください。");
  }
  bitmap.close();
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[
    file.type
  ];
  const path = `media/${crypto.randomUUID()}.${ext}`;
  images.set(path, file);
  set(data, input.dataset.image, path);
  mark();
  render();
}
document.querySelector("#editor").addEventListener("submit", (ev) => {
  ev.preventDefault();
  save();
});
document.querySelector("#editor").addEventListener("input", (ev) => {
  const el = ev.target;
  if (el.dataset.path && el.type !== "radio") {
    set(data, el.dataset.path, el.type === "checkbox" ? el.checked : el.value);
    mark();
  }
});
document.querySelector("#editor").addEventListener("change", async (ev) => {
  try {
    const el = ev.target;
    if (el.dataset.path && el.type === "radio") {
      set(data, el.dataset.path, el.value);
      mark();
    }
    if (el.dataset.palette) {
      const [key, , main, sub] = palettes.find(
        (p) => p[0] === el.dataset.palette,
      );
      data.colors = { preset: key, main, sub, text: "#333333" };
      mark();
      render();
    }
    if (el.dataset.image) await upload(el);
    if (el.id === "import-json" && el.files[0]) {
      const file = el.files[0];
      if (file.size > 1024 * 1024) throw Error("JSONは1MB以下にしてください。");
      const incoming = JSON.parse(await file.text());
      const errors = validate(incoming, schema);
      if (errors.length) {
        notice(errors, true);
        return;
      }
      if (
        await ask(
          "JSONの内容を読み込みますか？",
          "現在の未保存の入力内容を置き換えます。読み込み後に内容を確認し、「変更を保存」で反映してください。",
          "読み込む",
        )
      ) {
        data = incoming;
        mark();
        render();
        notice(
          "JSONを読み込みました。画像の未配置を確認し、保存してください。",
        );
      }
    }
  } catch (err) {
    notice(
      err instanceof SyntaxError
        ? "JSONの形式が正しくありません。AIに構文の修正を依頼してください。"
        : err.message,
      true,
    );
  }
});
document.querySelector("#editor").addEventListener("click", async (ev) => {
  const b = ev.target.closest("button");
  if (!b) return;
  try {
    if (b.dataset.add) {
      const path = b.dataset.add,
        arr = get(data, path);
      const max = path === "mv.images" ? 3 : 50;
      if (arr.length >= max) return;
      arr.push(clone(defaults[path] || defaults[path.split(".").at(-1)]));
      mark();
      render();
    }
    if (b.dataset.remove) {
      const path = b.dataset.remove,
        arr = get(data, path),
        n = Number(b.dataset.index);
      if (path === "mv.images" && arr.length <= 1) return;
      if (
        await ask(
          "項目を削除しますか？",
          b.getAttribute("aria-label") || `${n + 1}番目の項目を削除します。`,
          "削除する",
        )
      ) {
        arr.splice(n, 1);
        mark();
        render();
      }
    }
    if (b.dataset.clearImage) {
      set(data, b.dataset.clearImage, "");
      mark();
      render();
    }
    if (b.dataset.downloadImage) {
      const ref = b.dataset.downloadImage;
      if (images.has(ref)) download(ref.split("/").at(-1), images.get(ref));
    }
    if (b.dataset.action === "export" && check())
      download("site.json", JSON.stringify(data, null, 2) + "\n");
    if (
      b.dataset.action === "reset" &&
      (await ask(
        "デモを初期状態に戻しますか？",
        "このブラウザに保存した編集内容と画像を初期化します。必要な場合は先にダウンロードしてください。",
        "初期状態に戻す",
      ))
    ) {
      const saved = await store.reset(revision);
      data = saved.data;
      revision = saved.revision;
      updatedAt = saved.updatedAt;
      images = new Map();
      dirty = false;
      render();
      notice("架空のサンプルデータに戻しました。");
    }
  } catch (err) {
    notice(err.message, true);
  }
});
document.querySelector("#save").addEventListener("click", save);
document.querySelector("#menu-toggle").addEventListener("click", () => {
  const open = document.body.classList.toggle("menu-open");
  document
    .querySelector("#menu-toggle")
    .setAttribute("aria-expanded", String(open));
});
addEventListener("hashchange", () => {
  screen = nav.some((n) => n[0] === location.hash.slice(1))
    ? location.hash.slice(1)
    : "home";
  document.body.classList.remove("menu-open");
  document.querySelector("#menu-toggle").setAttribute("aria-expanded", "false");
  document.querySelector("#notice").hidden = true;
  render();
  window.scrollTo(0, 0);
});
addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    document.body.classList.remove("menu-open");
    document
      .querySelector("#menu-toggle")
      .setAttribute("aria-expanded", "false");
  }
  if ((ev.ctrlKey || ev.metaKey) && ev.key === "s") {
    ev.preventDefault();
    save();
  }
});
addEventListener("beforeunload", (ev) => {
  if (dirty) {
    ev.preventDefault();
    ev.returnValue = "";
  }
});
async function init() {
  try {
    const [saved, s, im] = await Promise.all([
      store.load(),
      jsonFile("data/schema.json"),
      store.images(),
    ]);
    presetSources = await Promise.all([1,2,3].map(async n => {
      const response = await fetch(asset('assets/preset-mv-'+n+'.svg'));
      if (!response.ok) throw Error('MVプレビューを読み込めませんでした。再読み込みしてください。');
      return response.text();
    }));
    data = saved.data;
    revision = saved.revision;
    updatedAt = saved.updatedAt;
    schema = s;
    images = im;
    screen = nav.some((n) => n[0] === location.hash.slice(1))
      ? location.hash.slice(1)
      : "home";
    render();
  } catch (err) {
    document.querySelector("#page-title").textContent =
      "読み込みに失敗しました";
    notice(err.message, true);
  }
}
init();
