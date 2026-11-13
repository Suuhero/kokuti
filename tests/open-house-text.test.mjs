import test from "node:test";
import assert from "node:assert/strict";
import {openingTextHTML} from "../assets/open-house-text.js";

test("内覧会の日付と時間帯の間で折り返し、時間帯全体を保護する", () => {
  assert.equal(openingTextHTML("3月27日（土）・28日（日）10:00〜15:00"),
    '<span class="opening-date">3月27日（土）</span>・<wbr><span class="opening-date">28日（日）</span><wbr><span class="opening-time">10:00〜15:00</span>');
  assert.equal(openingTextHTML("受付 9:30 ～ 12:00"),
    '受付 <wbr><span class="opening-time">9:30 ～ 12:00</span>');
});

test("日付と曜日をひとまとまりにし、複数日・全角数字・空白を保持する", () => {
  assert.equal(openingTextHTML("３月２７日（土）・２８日（日）１０：００〜１５：００"),
    '<span class="opening-date">３月２７日（土）</span>・<wbr><span class="opening-date">２８日（日）</span><wbr><span class="opening-time">１０：００〜１５：００</span>');
  assert.equal(openingTextHTML(" 3月27日(土)　28日(日) "),
    ' <wbr><span class="opening-date">3月27日(土)</span>　<wbr><span class="opening-date">28日(日)</span> ');
  for (const value of ["123月27日", "13月27日", "3月99日", "001日"]) {
    assert.equal(openingTextHTML(value), value);
  }
});

test("日付を含む文字列でもHTML・属性を有効化しない", () => {
  assert.equal(openingTextHTML('<em title="３月27日">&</em> 28日（日）'),
    '&lt;em title=&quot;<wbr><span class="opening-date">３月27日</span>&quot;&gt;&amp;&lt;/em&gt; <wbr><span class="opening-date">28日（日）</span>');
});

test("全角表記・複数時間帯・元の空白を変えない", () => {
  assert.equal(openingTextHTML("１０：００〜１５：００、16:00-17:30"),
    '<span class="opening-time">１０：００〜１５：００</span>、<wbr><span class="opening-time">16:00-17:30</span>');
  assert.equal(openingTextHTML(" 10:00　～　15:00 "),
    ' <wbr><span class="opening-time">10:00　～　15:00</span> ');
});

test("時刻のない文章・日付・不正な時刻を誤って時刻にしない", () => {
  for (const value of ["2027/04/01（木）", "日時は後日お知らせします。", "99:30", "10:99", "12310:00", "24:01", "10:00〜15:99"]) {
    assert.equal(openingTextHTML(value), value);
  }
  assert.equal(openingTextHTML("24:00"), '<span class="opening-time">24:00</span>');
  assert.equal(openingTextHTML(null), "");
});

test("利用者のHTML・属性・実体参照はすべて文字としてエスケープする", () => {
  const value = '<img src=x onerror="alert(1)">10:00〜15:00 & \'予約\' &lt;/span&gt;';
  assert.equal(openingTextHTML(value),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;<wbr><span class="opening-time">10:00〜15:00</span> &amp; &#39;予約&#39; &amp;lt;/span&amp;gt;');
  assert.equal(openingTextHTML('<script>alert("x")</script>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
});
