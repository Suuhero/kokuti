export const ROOT = new URL("../", import.meta.url);
export const asset = (p) => new URL(p, ROOT).href;
export const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const clone = (v) => structuredClone(v);
export const get = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);
export function set(obj, path, value) {
  const keys = path.split(".");
  const end = keys.pop();
  keys.reduce((o, k) => o[k], obj)[end] = value;
}
export const palettes = [
  ["brown", "BROWN", "#795848", "#f7f1eb"],
  ["light-brown", "LIGHT-BROWN", "#b88b62", "#fbf5ec"],
  ["green", "GREEN", "#21a38c", "#eaf8f3"],
  ["light-green", "LIGHT-GREEN", "#88be4a", "#f2f9e8"],
  ["blue", "BLUE", "#158fbe", "#eaf6fc"],
  ["light-blue", "LIGHT-BLUE", "#4cb5df", "#eff9fd"],
  ["navy", "NAVY", "#224c77", "#edf3fa"],
  ["light-navy", "LIGHT-NAVY", "#507fb2", "#f0f6fc"],
  ["orange", "ORANGE", "#eb913f", "#fff3e6"],
  ["light-orange", "LIGHT-ORANGE", "#f5b76d", "#fff8ed"],
  ["pink", "PINK", "#de688f", "#fdeef4"],
  ["light-pink", "LIGHT-PINK", "#ee9db9", "#fff3f7"],
  ["purple", "PURPLE", "#9263b9", "#f5effb"],
  ["light-purple", "LIGHT-PURPLE", "#b78bdd", "#faf4fe"],
  ["red", "RED", "#d35254", "#fdeeee"],
  ["light-red", "LIGHT-RED", "#eb8580", "#fff2ef"],
  ["yellow", "YELLOW", "#e8bd32", "#fff9e2"],
  ["light-yellow", "LIGHT-YELLOW", "#f3d56a", "#fffcee"],
];
export const designs = [
  [
    "pattern1",
    "端正なスタンダード",
    "角ゴシックを使った、すっきりとした印象。",
  ],
  [
    "pattern2",
    "やわらかく親しみやすい",
    "丸ゴシックと角丸による、やさしい印象。",
  ],
  ["pattern3", "落ち着きのある上質さ", "明朝体と細い線、余白を活かした印象。"],
];
export function adjust(hex, percent) {
  return (
    "#" +
    hex
      .slice(1)
      .match(/../g)
      .map((x) => {
        const v = parseInt(x, 16);
        return Math.round(
          percent >= 0 ? v + (255 - v) * percent : v * (1 + percent),
        )
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}
export async function jsonFile(path) {
  const r = await fetch(asset(path));
  if (!r.ok)
    throw Error("データを読み込めませんでした。再読み込みしてください。");
  return r.json();
}
export function safeLink(v) {
  v = String(v ?? "").trim();
  return /^(https?:\/\/|tel:|mailto:|#)/i.test(v) || /^\/(?!\/)/.test(v)
    ? v
    : "#";
}
export function rich(text) {
  if (!/<[a-z][\s\S]*>/i.test(text))
    return String(text)
      .split(/\n\s*\n/)
      .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
      .join("");
  const doc = new DOMParser().parseFromString(String(text), "text/html");
  const allowed = [
    "P",
    "BR",
    "STRONG",
    "EM",
    "B",
    "I",
    "UL",
    "OL",
    "LI",
    "A",
    "SPAN",
    "DIV",
  ];
  function clean(n) {
    if (n.nodeType === 3) return esc(n.textContent);
    if (n.nodeType !== 1) return "";
    if (
      ["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH"].includes(
        n.tagName,
      )
    )
      return "";
    const body = [...n.childNodes].map(clean).join("");
    if (!allowed.includes(n.tagName)) return body;
    let attr =
      n.tagName === "A"
        ? ` href="${esc(safeLink(n.getAttribute("href")))}" rel="noopener noreferrer"`
        : "";
    return `<${n.tagName.toLowerCase()}${attr}>${body}</${n.tagName.toLowerCase()}>`;
  }
  return [...doc.body.childNodes].map(clean).join("");
}
export function mapURL(input) {
  const doc = new DOMParser().parseFromString(input, "text/html");
  const raw = doc.querySelector("iframe")?.getAttribute("src") || input;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" &&
      ["www.google.com", "maps.google.com", "www.google.co.jp"].includes(
        u.hostname,
      ) &&
      u.pathname.startsWith("/maps")
      ? u.href
      : "";
  } catch {
    return "";
  }
}
export function download(name, content, type = "application/json") {
  const a = document.createElement("a");
  const u = URL.createObjectURL(
    content instanceof Blob ? content : new Blob([content], { type }),
  );
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}
export function mediaRefs(data) {
  const refs = new Set();
  function walk(v) {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object")
      Object.entries(v).forEach(([k, x]) => {
        if (["upload", "imageUpload", "logoUpload"].includes(k) && x)
          refs.add(x);
        else walk(x);
      });
  }
  walk(data);
  return refs;
}
export function validate(data, schema) {
  const errors = [];
  function walk(v, s, path) {
    if (s.const !== undefined && v !== s.const)
      errors.push(`${path}: 対応していないバージョンです`);
    if (s.enum && !s.enum.includes(v))
      errors.push(`${path}: 選択肢が正しくありません`);
    const types = {
      object: v && typeof v === "object" && !Array.isArray(v),
      array: Array.isArray(v),
      string: typeof v === "string",
      boolean: typeof v === "boolean",
      integer: Number.isInteger(v),
    };
    if (s.type && !types[s.type]) {
      errors.push(`${path}: データの型が正しくありません`);
      return;
    }
    if (s.type === "object") {
      for (const k of s.required || [])
        if (!(k in v)) errors.push(`${path}.${k}: 項目がありません`);
      for (const [k, x] of Object.entries(v)) {
        if (s.properties[k]) walk(x, s.properties[k], path + "." + k);
        else errors.push(`${path}.${k}: 未対応の項目です`);
      }
    }
    if (s.type === "array") {
      if (v.length < (s.minItems || 0) || v.length > (s.maxItems ?? 50))
        errors.push(`${path}: 件数を確認してください`);
      v.forEach((x, i) => walk(x, s.items, `${path}.${i}`));
    }
    if (s.type === "string" && v.length > s.maxLength)
      errors.push(`${path}: 文字数が多すぎます`);
  }
  walk(data, schema, "site");
  if (data?.site && !data.site.clinicName?.trim())
    errors.push("医院名を入力してください");
  for (const key of ["main", "sub", "text"])
    if (!/^#[0-9a-f]{6}$/i.test(data?.colors?.[key] || ""))
      errors.push(`colors.${key}: 色の形式が正しくありません`);
  if (
    data?.mv?.images?.some(
      (i) =>
        !["preset-mv-1.svg", "preset-mv-2.svg", "preset-mv-3.svg"].includes(
          i.preset,
        ),
    )
  )
    errors.push("MVプリセットを確認してください");
  for (const ref of mediaRefs(data))
    if (!/^media\/[a-zA-Z0-9_.-]+\.(png|jpe?g|webp)$/i.test(ref))
      errors.push("画像パスはmedia/ファイル名.jpg・png・webpにしてください");
  return errors;
}

// Keep the existing JSON preset slots compatible; design selects the SVG family.
export const mvNames = {
  pattern1: ['光とドット','やわらかな円','水平のグラデーション'],
  pattern2: ['やわらかな波','まるい重なり','大きなアーチ'],
  pattern3: ['静かな流れ','細い曲線','透ける斜面'],
};
export function mvAsset(design, preset) {
  const family = Object.hasOwn(mvNames, design) ? design : 'pattern1';
  const slot = /^preset-mv-([123])\.svg$/.exec(preset)?.[1] || '1';
  return family === 'pattern1' ? 'preset-mv-'+slot+'.svg' : family+'-mv-'+slot+'.svg';
}
export function mvSVG(source, colors) {
  const tokens = { MAIN:colors.main, MAIN_DARK:adjust(colors.main,-0.18), SUB:colors.sub, SUB_LIGHT:adjust(colors.sub,0.28) };
  return source.replace(/\{\{(\w+)\}\}/g, (_,key) => tokens[key] || '#ffffff');
}
