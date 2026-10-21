import {esc} from './shared.js?v=20261021';
export function designSample(key,colors) {
  return '<span class="design-sample sample-'+key+'" style="--sample-main:'+esc(colors.main)+';--sample-sub:'+esc(colors.sub)+'"><span class="sample-en">MEDICAL</span><span class="sample-title">診療のご案内</span><span class="sample-card"><span class="sample-card-title">内科・小児科</span><span class="sample-copy">いつもの安心を、<br>地域の皆さまへ。</span></span></span>';
}
