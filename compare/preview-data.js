// Both public previews start with the same fictional clinic even after editing a demo.
const fixture = document.getElementById('kokuti-site-data');
const clinic = JSON.parse(fixture.textContent);
const params = new URLSearchParams(location.search);
const pattern = params.get('pattern');
const mv = params.get('mv');
if (['pattern1', 'pattern2', 'pattern3'].includes(pattern)) clinic.design = pattern;
if (['1', '2', '3'].includes(mv)) clinic.mv.images = [{ preset: 'preset-mv-' + mv + '.svg', upload: '' }];
fixture.textContent = JSON.stringify(clinic);
