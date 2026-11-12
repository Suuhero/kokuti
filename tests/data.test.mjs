import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  validate,
  palettes,
  mediaRefs,
  safeLink,
  adjust,
  accentTextColor, onMainTextColor,
  mvAsset, mvSVG, mvNames,
} from "../assets/shared.js";
const sample = JSON.parse(
  await fs.readFile(new URL("../data/sample.json", import.meta.url), "utf8"),
);
const schema = JSON.parse(
  await fs.readFile(new URL("../data/schema.json", import.meta.url), "utf8"),
);
test("既存MVスロットを9種類に割り当て、18配色をSVGに反映する", async () => {
  const sources = new Set();
  for (const design of Object.keys(mvNames)) {
    for (let slot = 1; slot <= 3; slot++) {
      const file = mvAsset(design, `preset-mv-${slot}.svg`);
      const source = await fs.readFile(new URL(`../assets/${file}`, import.meta.url), "utf8");
      sources.add(source);
      assert.match(source, /viewBox="0 0 1600 900"/);
      for (const [, , main, sub] of palettes) {
        const svg = mvSVG(source, {main, sub});
        assert.ok(!svg.includes("{{"));
        assert.ok(svg.includes(main));
        assert.ok(svg.includes(sub));
        assert.doesNotMatch(svg, /<script|<image|href=/);
      }
    }
  }
  assert.equal(sources.size, 9);
  assert.equal(mvAsset("unknown", "invalid"), "preset-mv-1.svg");
});
test("架空データはAI向けスキーマに一致する", () =>
  assert.deepEqual(validate(sample, schema), []));
test("任意のfaviconは旧JSONと互換、ICO/PNGのみ相対パスで保存", () => {
  for (const ext of ['ico','png']) {
    const d=structuredClone(sample); d.site.faviconUpload=`media/icon.${ext}`;
    assert.deepEqual(validate(d,schema),[]);
    assert.ok(mediaRefs(d).has(d.site.faviconUpload));
  }
  for (const path of ['https://example.com/icon.png','media/../icon.png','media/icon.svg']) {
    const d=structuredClone(sample); d.site.faviconUpload=path;
    assert.ok(validate(d,schema).length);
  }
});
test("3パターンと18パレットを利用できる", () => {
  assert.equal(palettes.length, 18);
  for (const design of ["pattern1", "pattern2", "pattern3"])
    assert.deepEqual(validate({ ...sample, design }, schema), []);
});
test("MV上限・固定件数・バージョンを検査", () => {
  let d = structuredClone(sample);
  d.mv.images = Array(4).fill(d.mv.images[0]);
  assert.ok(validate(d, schema).length);
  d = structuredClone(sample);
  d.freeAreas = [];
  assert.ok(validate(d, schema).length);
  d = structuredClone(sample);
  d.schemaVersion = 99;
  assert.ok(validate(d, schema).length);
});
test("未知のキーや欠けた構造を拒否する", () => {
  assert.ok(validate({ ...sample, password: "sample" }, schema).length);
  const d = structuredClone(sample);
  delete d.site;
  assert.ok(validate(d, schema).length);
  assert.ok(validate(null, schema).length);
});
test("診療時間と経歴の繰り返しを保持", () => {
  const d = structuredClone(sample);
  d.clinicInfo.schedules.push(structuredClone(d.clinicInfo.schedules[0]));
  d.greeting.doctors[0].career.push({ year: "", text: "追加経歴" });
  assert.deepEqual(validate(d, schema), []);
});
test("画像は相対パスで出力しBlob URLを拒否", () => {
  const d = structuredClone(sample);
  d.site.logoUpload = "media/logo.png";
  assert.deepEqual([...mediaRefs(d)], ["media/logo.png"]);
  assert.deepEqual(validate(d, schema), []);
  d.site.logoUpload = "blob:example";
  assert.ok(validate(d, schema).length);
});
test("JavaScript URLをリンクにしない", () => {
  assert.equal(safeLink("javascript:alert(1)"), "#");
  assert.equal(safeLink("#clinicinfo"), "#clinicinfo");
  assert.equal(safeLink("https://example.com"), "https://example.com");
});
test("元のMVプリセット用の色変換", () => {
  assert.equal(adjust("#000000", 0.28), "#474747");
  assert.equal(adjust("#ffffff", -0.18), "#d1d1d1");
});

test('image folder supports new uploads and rejects traversal',()=>{const d=structuredClone(sample);d.site.logoUpload='image/logo.png';d.site.faviconUpload='image/icon.ico';assert.deepEqual(validate(d,schema),[]);d.site.logoUpload='image/../logo.png';assert.ok(validate(d,schema).length);});

test('font sizes accept three levels and older JSON', () => {
 for (const size of ['small','medium','large']) assert.deepEqual(validate({...sample,fontSize:size},schema),[]);
 const old=structuredClone(sample);delete old.fontSize;assert.deepEqual(validate(old,schema),[]);
 assert.ok(validate({...sample,fontSize:'huge'},schema).length);
});

test('18配色と任意の淡色で文字のみ十分な明暗差を確保する', () => {
  const luminance = color => {
    const rgb = Array.isArray(color) ? color : color.slice(1).match(/../g).map(x => parseInt(x, 16));
    const values = rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
  };
  const contrast = (a, b) => {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + .05) / (values[1] + .05);
  };
  const mix = (a, b, weight) => a.slice(1).match(/../g).map((v, i) =>
    parseInt(v, 16) * weight + parseInt(b.slice(1).match(/../g)[i], 16) * (1 - weight));
  const original = structuredClone(palettes);
  for (const [main, sub] of [...palettes.map(p => [p[2], p[3]]),
    ['#fff27b', '#fffde8'], ['#ffffff', '#ffffff'], ['#fac9ea', '#fdf5fb']]) {
    const backgrounds = ['#ffffff', sub, mix(main, sub, .09), mix(main, '#ffffff', .2)];
    const text = accentTextColor(main, sub), oldText = adjust(main, -.18);
    for (const background of backgrounds) assert.ok(contrast(text, background) >= 4.5, main + ' / ' + sub);
    if (backgrounds.every(bg => contrast(oldText, bg) >= 4.5)) assert.equal(text, oldText);
    const onMain = onMainTextColor(main);
    assert.ok(contrast(onMain, main) >= 4.5);
    if (contrast('#ffffff', main) >= 4.5) assert.equal(onMain, '#ffffff');
  }
  assert.deepEqual(palettes, original);
});
