# Design QA — 2026-10-20

final result: passed

## Sources and evidence

Source folder: `C:/Users/sueshige/.codex/generated_images/01a10b21-d09b-75b0-a19d-deb5b8f8e67e/`.
Approved hero boards: `exec-cb4f8f64-9e57-411c-a743-41f54154bdd5.png`, `exec-ee9e7b28-8ec3-4170-b6ce-d20644dd3e89.png`, `exec-1dbac9a4-45c1-455e-a74a-7796a6659817.png`.
Lower-section comparison: `exec-880cf8a0-6d3c-42ab-b4e0-dcc6e44e2106.png`.

Implementation evidence folder: `C:/Users/sueshige/Documents/Codex/2026-10-05/new-chat/outputs/kokuti/`.
Screenshots: `pattern1-desktop.png`, `pattern2-desktop.png`, `pattern3-desktop.png`, `pattern2-mobile.png`, `pattern2-clinic.png`.
Local routes: `http://localhost:8788/?pattern=pattern1` through `pattern3`; admin `/admin/`.

Desktop capture: 1265×712 px, default browser viewport. Mobile hero/menu: 390×844 viewport override; screenshot returned at approximately 375×812 pixels by the tool. Source boards include a desktop/mobile comparison frame, not a single CSS viewport (hero1/3 1672×941, hero2 1717×916; lower board 1065×1477). Compared content regions and proportions, not pixel overlays or frame padding. No density-normalized pixel-match claim. Desktop screenshots use the same light-purple selection to verify all families accept the palette, while source1/3 use blue.

## Comparison history

1. P1: inherited drop-shadow blurred the whole hero text and note. Removed filter on `.kokuchi_box`; subsequent desktop and mobile captures show crisp text and a clean note card.
2. P2: inherited body ink token prevented palette-linked dark text. Removed the fixed body override. Later captures show dark purple derived from the selected palette.
3. P2: alternating section order left clinic cards white on white. Explicitly applied tinted SVG backgrounds to clinic and medical sections. Recompared the source lower board and final `pattern2-clinic.png` together: rounded white cards are now distinct from the background.
4. Cached original SVGs appeared on first load. Added cache revalidation for SVG fetches in public/admin. Revisited pattern1 and saw the new dot artwork.

## Fidelity review

- Typography: sans, rounded sans, and serif distinctions retained; hierarchy and readable mobile wrapping checked. Exact AI-rendered glyphs are not font specifications. Dark button labels intentionally support the light/yellow palettes.
- Layout: white full-width headers, inset menu controls, centered heroes, 1200px maximum content width, clinic columns and service/feature grids. Fixed header stays clear of the circular control. Mobile menu opens/closes without clipping.
- Tokens: backgrounds, rules, cards and dark text use selected colors. All 9 SVGs were tested against all 18 palettes, with no unresolved tokens.
- Assets: SVG is explicitly requested by the user; vector waves, dots, circles, arches, lines and planes replace raster mockup artwork. Their shapes are responsive interpretations of the approved boards.
- Copy: existing sample data, access notes, schedule notes and all editable content retained. Longer real text can naturally wrap differently from the generated board. Doctor name remains adjacent to the greeting rather than duplicated inside the career panel.

Full-view source/implementation comparisons were performed in combined image inputs for all three desktop heroes. The clinic source/capture pair was reopened after the background fix. Focused header/menu/mobile and clinic-table views were inspected directly; those captures were readable without extra crops.

## Validation and limits

- Browser: three hero families, mobile hero layouts, pattern2 mobile menu open/close, desktop clinic/doctor/medical/features, admin palette change → background selection → save → public reload.
- Console error log: empty on the inspected local public tab.
- Automated: 9 Node tests pass, including 9×18 SVG substitutions and legacy preset-slot compatibility; PHP head tests pass. Pages and FTP builds succeed.
- Remaining coverage: full physical-device/Safari matrix and every uploaded-image/text-length combination have not been tested. Later attempts to reapply the mobile viewport did not resize the tab; final lower-section evidence is desktop. Initial mobile hero/menu evidence remains valid.
- Acceptable differences: source board framing, selected palette, preserved full input content, dynamic heights, restrained SVG opacity, and dark menu/button labels. No outstanding P0/P1/P2 finding in inspected states.

## Checklist

- [x] Nine distinct themeable backgrounds and legacy JSON compatibility.
- [x] Header/menu clearance and white backing.
- [x] Three typography/radius treatments.
- [x] Palette/preset save flow, tests and both build outputs.
- [x] Post-fix visual comparison.
