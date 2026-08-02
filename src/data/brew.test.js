import test from 'node:test';
import assert from 'node:assert/strict';
import rules from './brewing-rules.js';
import {
  normalizeRange,
  RANGE_FIELDS,
  KNOWN_PATCH_FIELDS,
} from './brew.js';

const DEVICES = ['aeropress', 'delter'];
const STAGES = ['roast', 'process', 'altitude', 'origin'];

// เทส 16 - รูปร่างของ brewing-rules.js ถูกต้องทั้งไฟล์
test('normalizeRange รับตัวเลขเดี่ยวและช่วง', () => {
  assert.deepStrictEqual(normalizeRange(120), [120, 120]);
  assert.deepStrictEqual(normalizeRange([120, 150]), [120, 150]);
  assert.deepStrictEqual(normalizeRange([-6, -3]), [-6, -3]);
});

test('normalizeRange โยน error พร้อม path เมื่อรูปแบบผิด', () => {
  for (const bad of ['120', [120], [1, 2, 3], [1, NaN], null, undefined, {}]) {
    assert.throws(
      () => normalizeRange(bad, 'aeropress.base.temp'),
      /aeropress\.base\.temp/,
      `ควรโยน error สำหรับ ${JSON.stringify(bad)}`,
    );
  }
  assert.throws(() => normalizeRange([150, 120], 'x.y'), /x\.y/);
});

test('ทุกค่าที่เป็นช่วงใน brewing-rules.js normalize ได้และ min <= max', () => {
  for (const device of DEVICES) {
    for (const [field, value] of Object.entries(rules[device].base)) {
      if (!RANGE_FIELDS.includes(field)) continue;
      const [min, max] = normalizeRange(value, `${device}.base.${field}`);
      assert.ok(min <= max, `${device}.base.${field}`);
    }
    for (const stage of STAGES) {
      for (const [key, patch] of Object.entries(rules[device][stage])) {
        for (const [field, value] of Object.entries(patch)) {
          const path = `${device}.${stage}.${key}.${field}`;
          if (field === 'note') {
            assert.equal(typeof value, 'string', path);
            continue;
          }
          if (field.endsWith('Add')) {
            assert.ok(Number.isFinite(value), path);
            continue;
          }
          const [min, max] = normalizeRange(value, path);
          assert.ok(min <= max, path);
        }
      }
    }
  }
});

test('ทุก key ในทุก patch อยู่ในชุด field ที่รู้จัก', () => {
  for (const device of DEVICES) {
    for (const stage of STAGES) {
      for (const [key, patch] of Object.entries(rules[device][stage])) {
        for (const field of Object.keys(patch)) {
          assert.ok(
            KNOWN_PATCH_FIELDS.includes(field),
            `${device}.${stage}.${key}: ไม่รู้จัก field "${field}"`,
          );
        }
      }
    }
  }
});

test('ทุก sliderBounds มี (max - min) หารด้วย step ลงตัว', () => {
  for (const device of DEVICES) {
    for (const [field, b] of Object.entries(rules[device].sliderBounds)) {
      const steps = (b.max - b.min) / b.step;
      assert.ok(
        Math.abs(Math.round(steps) - steps) < 1e-9,
        `${device}.sliderBounds.${field}: (${b.max} - ${b.min}) / ${b.step} ไม่ลงตัว`,
      );
    }
  }
});

test('ทุกตัวเลือกใน options มีครบทุก stage ของทั้งสองเครื่อง', () => {
  for (const device of DEVICES) {
    for (const stage of STAGES) {
      const keys = rules.options[stage].map((o) => o.key);
      assert.deepStrictEqual(
        Object.keys(rules[device][stage]).sort(),
        [...keys].sort(),
        `${device}.${stage} ไม่ตรงกับ options.${stage}`,
      );
    }
  }
  assert.deepStrictEqual(
    rules.options.device.map((o) => o.key).sort(),
    [...DEVICES].sort(),
  );
});

import { computeRecipe, COARSE_NOTE } from './brew.js';

const recipeOf = (device, roast, process, altitude, origin) =>
  computeRecipe({ device, roast, process, altitude, origin });

// เทส 1 - Base ตรงตาม Notion
test('AeroPress base ตรงตาม Notion', () => {
  const r = recipeOf('aeropress', 'agtron80_95', 'washed', 'mid', 'colombia');
  assert.equal(r.dose, 18);
  assert.equal(r.water, 190);
  assert.deepStrictEqual(r.temp, [88, 88]);
  assert.deepStrictEqual(r.grind, [6.0, 6.0]);
  assert.deepStrictEqual(r.steep, [105, 105]);
});

// เทส 4 - steepAdd โดนสองรอบ
test('steepAdd สะสมจากทั้ง roast และ altitude', () => {
  const r = recipeOf('aeropress', 'agtron95plus', 'doubleAnaerobic', 'high', 'thai');
  assert.deepStrictEqual(r.temp, [82, 85]);
  assert.deepStrictEqual(r.grind, [5.0, 5.5]);
  assert.deepStrictEqual(r.steep, [150, 180]);
});

// เทส 5 - roast เป็นเจ้าของ preinfusionWait แต่ผู้เดียว และ preinfusionAdd บวกทีหลัง
test('Delter preinfusionWait มาจาก roast แล้วบวกด้วย altitude', () => {
  const r = recipeOf('delter', 'agtron95plus', 'washed', 'high', 'colombia');
  assert.deepStrictEqual(r.preinfusionWait, [75, 90]);
  assert.deepStrictEqual(r.grind, [5.0, 5.0]);
});

// เทส 6 - tempClamp เป็นการจำกัดช่วง ไม่ใช่การทับ และไม่กลืน altitude
test('panamaGeisha บน AeroPress บีบ temp เข้ากรอบ 85-87 ทีละปลาย', () => {
  const expected = {
    washed: [87, 87],
    honey: [87, 87],
    natural: [87, 87],
    anaerobic: [85, 85],
    cm: [85, 85],
    doubleAnaerobic: [85, 85],
    yeast: [85, 85],
    barrel: [85, 85],
  };
  for (const [process, temp] of Object.entries(expected)) {
    const r = recipeOf('aeropress', 'agtron80_95', process, 'mid', 'panamaGeisha');
    assert.deepStrictEqual(r.temp, temp, `process ${process}`);
  }
  // ฝั่งเพดาน roast กลาง + washed ปกติได้ 90
  assert.deepStrictEqual(
    recipeOf('aeropress', 'agtron65_80', 'washed', 'mid', 'panamaGeisha').temp,
    [87, 87],
  );
  // clamp แตะเฉพาะ temp altitude ยังมีผลกับ grind ตามปกติ
  assert.deepStrictEqual(
    recipeOf('aeropress', 'agtron80_95', 'washed', 'mid', 'panamaGeisha').grind,
    [6.0, 6.0],
  );
  assert.deepStrictEqual(
    recipeOf('aeropress', 'agtron80_95', 'washed', 'low', 'panamaGeisha').grind,
    [6.5, 6.5],
  );
});

// เทส 7 - Process ชนะ Roast ในการทับ steep
test('process ทับ steep ทับทีหลัง roast', () => {
  const r = recipeOf('aeropress', 'agtron65_80', 'washed', 'mid', 'colombia');
  assert.deepStrictEqual(r.steep, [105, 105]);
});

// เทส 12 - kenya บวกท้าย ไม่ใช่ทับ
test('kenya บวก pressSpeed ท้ายสุด ไม่ลบค่าของ process', () => {
  assert.deepStrictEqual(
    recipeOf('delter', 'agtron80_95', 'washed', 'mid', 'kenya').pressSpeed,
    [30, 35],
  );
  assert.deepStrictEqual(
    recipeOf('delter', 'agtron80_95', 'doubleAnaerobic', 'mid', 'kenya').pressSpeed,
    [20, 25],
  );
});

test('เตือนหยาบกว่า base ขึ้นเมื่อ grind.min มากกว่า base', () => {
  const coarse = recipeOf('aeropress', 'agtron80_95', 'anaerobic', 'low', 'colombia');
  assert.deepStrictEqual(coarse.grind, [6.5, 6.5]);
  assert.ok(coarse.notes.includes(COARSE_NOTE));

  const fine = recipeOf('aeropress', 'agtron80_95', 'anaerobic', 'high', 'colombia');
  assert.deepStrictEqual(fine.grind, [5.5, 5.5]);
  assert.ok(!fine.notes.includes(COARSE_NOTE));
});

test('computeRecipe โยน error เมื่อได้ key ที่ไม่รู้จัก', () => {
  assert.throws(() => recipeOf('frenchpress', 'agtron80_95', 'washed', 'mid', 'colombia'), /frenchpress/);
  assert.throws(() => recipeOf('aeropress', 'agtron80_95', 'espresso', 'mid', 'colombia'), /espresso/);
  // device ต้องมาจาก options.device เท่านั้น ไม่ใช่ key ไหนก็ได้ใน default export ของ brewing-rules.js
  for (const notADevice of ['options', 'defaults', 'fixes']) {
    assert.throws(
      () => recipeOf(notADevice, 'agtron80_95', 'washed', 'mid', 'colombia'),
      new RegExp(notADevice),
      `ควรโยน error สำหรับ device "${notADevice}"`,
    );
  }
});

import { defaultPick, defaultPicks } from './brew.js';

const ALL_COMBOS = (device) => {
  const out = [];
  for (const roast of Object.keys(rules[device].roast)) {
    for (const process of Object.keys(rules[device].process)) {
      for (const altitude of Object.keys(rules[device].altitude)) {
        for (const origin of Object.keys(rules[device].origin)) {
          out.push({ device, roast, process, altitude, origin });
        }
      }
    }
  }
  return out;
};

const label = (c) => `${c.device}/${c.roast}/${c.process}/${c.altitude}/${c.origin}`;

test('มี 432 combo ต่อเครื่อง', () => {
  assert.equal(ALL_COMBOS('aeropress').length, 432);
  assert.equal(ALL_COMBOS('delter').length, 432);
});

// เทส 2 - ตาราง combo อุณหภูมิที่ Notion เขียนไว้
test('ตาราง combo อุณหภูมิตรงทั้ง 6 แถวต่อเครื่อง', () => {
  const table = [
    ['agtron80_95', 'washed', [88, 88], [91, 91]],
    ['agtron80_95', 'honey', [88, 88], [91, 91]],
    ['agtron80_95', 'natural', [87, 87], [90, 90]],
    ['agtron80_95', 'anaerobic', [85, 85], [88, 88]],
    ['agtron80_95', 'barrel', [85, 85], [88, 88]],
    ['agtron80_95', 'cm', [85, 85], [88, 88]],
    ['agtron80_95', 'yeast', [85, 85], [88, 88]],
    ['agtron80_95', 'doubleAnaerobic', [82, 85], [86, 88]],
    ['agtron65_80', 'washed', [90, 90], [93, 93]],
    ['agtron65_80', 'honey', [90, 90], [93, 93]],
    ['agtron65_80', 'anaerobic', [87, 87], [90, 90]],
  ];
  for (const [roast, process, ap, delterTemp] of table) {
    assert.deepStrictEqual(
      recipeOf('aeropress', roast, process, 'mid', 'colombia').temp,
      ap,
      `aeropress ${roast}/${process}`,
    );
    assert.deepStrictEqual(
      recipeOf('delter', roast, process, 'mid', 'colombia').temp,
      delterTemp,
      `delter ${roast}/${process}`,
    );
  }
});

// เทส 3 - Delter สูงกว่า AeroPress 3 องศา
test('Delter สูงกว่า AeroPress 3 องศาทุกคู่ ยกเว้น doubleAnaerobic ที่เทียบเฉพาะปลาย max', () => {
  for (const roast of Object.keys(rules.aeropress.roast)) {
    for (const process of Object.keys(rules.aeropress.process)) {
      const ap = recipeOf('aeropress', roast, process, 'mid', 'colombia').temp;
      const dp = recipeOf('delter', roast, process, 'mid', 'colombia').temp;
      assert.equal(dp[1] - ap[1], 3, `${roast}/${process} ปลาย max`);
      if (process !== 'doubleAnaerobic') {
        assert.equal(dp[0] - ap[0], 3, `${roast}/${process} ปลาย min`);
      } else {
        assert.equal(dp[0] - ap[0], 4, `${roast}/${process} ปลาย min ต่างกัน 4 โดยตั้งใจ`);
      }
    }
  }
});

// เทส 8 - temp ทุก combo อยู่ในกรอบและไม่กลับหัว
// assertion temp[0] <= temp[1] เฝ้าโค้ดใน computeRecipe ไม่ใช่เฝ้าข้อมูล กันไม่ให้ใครเปลี่ยน tempClamp
// เป็น interval intersection (max(min,lo) คู่ min(max,hi)) แทนบีบทีละปลาย บั๊กนี้เคยเจอจริงตอน
// design review ทำช่วงกลับหัว 21 จาก 864 สูตร ส่วนเช็ค slider bounds ครึ่งหลังของเทสนี้เฝ้าข้อมูลจริง มาร์จิ้นตอนนี้แค่ 1-2 องศา
test('temp ทุก combo อยู่ในกรอบและ min ไม่เกิน max', () => {
  for (const device of DEVICES) {
    const b = rules[device].sliderBounds.temp;
    for (const combo of ALL_COMBOS(device)) {
      const { temp } = computeRecipe(combo);
      assert.ok(temp[0] <= temp[1], `${label(combo)} temp กลับหัว ${JSON.stringify(temp)}`);
      assert.ok(temp[0] >= b.min && temp[1] <= b.max, `${label(combo)} temp ${JSON.stringify(temp)}`);
    }
  }
});

// เทส 9 - grind ปัด 0.5 เสมอ
// เทสนี้เฝ้าโค้ด ไม่ใช่เฝ้าข้อมูล กันไม่ให้ใครถอดหรือลด roundHalf ออกจาก grind ใน computeRecipe
// ปัด 0.5 คือ step ละเอียดสุดที่หมุนเครื่องบดจริงแล้วอ่านค่าได้ในครัว เป็นหลักการที่ตั้งใจไว้ ไม่ใช่บังเอิญ
test('grind ทุก combo เป็นทวีคูณของ 0.5 และ min ไม่เกิน max', () => {
  for (const device of DEVICES) {
    for (const combo of ALL_COMBOS(device)) {
      const { grind } = computeRecipe(combo);
      assert.ok(Number.isInteger(grind[0] * 2), `${label(combo)} grind.min ${grind[0]}`);
      assert.ok(Number.isInteger(grind[1] * 2), `${label(combo)} grind.max ${grind[1]}`);
      assert.ok(grind[0] <= grind[1], `${label(combo)} grind กลับหัว`);
    }
  }
});

// เทส 10 - เตือนหยาบกว่า base ขึ้นตรงเงื่อนไขเป๊ะ
test('เตือนหยาบกว่า base ขึ้นก็ต่อเมื่อ grind.min มากกว่า base.grind.min', () => {
  for (const device of DEVICES) {
    const baseGrindMin = normalizeRange(rules[device].base.grind)[0];
    for (const combo of ALL_COMBOS(device)) {
      const r = computeRecipe(combo);
      assert.equal(
        r.notes.includes(COARSE_NOTE),
        r.grind[0] > baseGrindMin,
        `${label(combo)} grind ${JSON.stringify(r.grind)}`,
      );
    }
  }
});

// เทส 11 - ratioFinal อยู่ในกรอบที่คำนวณได้จริง
test('ratioFinal ทุก combo อยู่ในกรอบ', () => {
  const bands = { aeropress: [13.8, 17.0], delter: [15.3, 17.4] };
  for (const device of DEVICES) {
    const [lo, hi] = bands[device];
    for (const combo of ALL_COMBOS(device)) {
      const { ratioFinal } = computeRecipe(combo);
      assert.ok(ratioFinal[0] >= lo, `${label(combo)} ratioFinal.min ${ratioFinal[0]}`);
      assert.ok(ratioFinal[1] <= hi, `${label(combo)} ratioFinal.max ${ratioFinal[1]}`);
    }
  }
});

// เทส 14 - ไม่มี field ไหนหลุด และ slider ครอบทุกค่าที่คำนวณได้
test('ทุก combo ได้ field ครบ อยู่ในขอบ slider และลงกริด step', () => {
  for (const device of DEVICES) {
    const bounds = rules[device].sliderBounds;
    for (const combo of ALL_COMBOS(device)) {
      const r = computeRecipe(combo);
      for (const [field, b] of Object.entries(bounds)) {
        assert.ok(Array.isArray(r[field]), `${label(combo)} ไม่มี ${field}`);
        for (const v of r[field]) {
          assert.ok(v >= b.min && v <= b.max, `${label(combo)} ${field}=${v} หลุดขอบ slider`);
          const grid = (v - b.min) / b.step;
          assert.ok(
            Math.abs(Math.round(grid) - grid) < 1e-9,
            `${label(combo)} ${field}=${v} ไม่ลงกริด step ${b.step}`,
          );
        }
      }
    }
  }
});

test('defaultPick คือกลางช่วงปัดลงให้ลงตัวกับ step', () => {
  assert.equal(defaultPick([40, 60], 5), 50);
  assert.equal(defaultPick([105, 120], 5), 110);
  assert.equal(defaultPick([20, 25], 5), 20);
  assert.equal(defaultPick([88, 88], 1), 88);
  assert.equal(defaultPick([5.0, 6.0], 0.5), 5.5);
});

test('defaultPicks ให้ค่าครบทุก slider และอยู่ในช่วงที่คำนวณได้', () => {
  for (const device of DEVICES) {
    const bounds = rules[device].sliderBounds;
    for (const combo of ALL_COMBOS(device)) {
      const r = computeRecipe(combo);
      const picks = defaultPicks(r);
      assert.deepStrictEqual(Object.keys(picks).sort(), Object.keys(bounds).sort());
      for (const [field, v] of Object.entries(picks)) {
        assert.ok(
          v >= r[field][0] && v <= r[field][1],
          `${label(combo)} ${field}=${v} หลุดช่วง ${JSON.stringify(r[field])}`,
        );
      }
    }
  }
});

import { toMavo, GRINDERS } from './brew.js';

// เทส 13 - toMavo ตรงกับตาราง preset ของ Notion ไม่มีค่าชดเชยในสูตร
test('toMavo ตรงกับตาราง preset ของ Notion', () => {
  assert.equal(toMavo(22, 'c40'), 6.0); // 22 * 0.271 = 5.962
  assert.equal(toMavo(19, 'c2'), 6.0); // 19 * 0.320 = 6.08
  assert.equal(toMavo(20, 'c40'), 5.5); // 20 * 0.271 = 5.42
  assert.equal(toMavo(28, 'c2'), 9.0); // 28 * 0.320 = 8.96
});

test('toMavo คืนทวีคูณของ 0.5 เสมอ', () => {
  for (let clicks = 0; clicks <= 60; clicks += 1) {
    for (const { key } of GRINDERS) {
      const v = toMavo(clicks, key);
      assert.ok(Number.isInteger(v * 2), `${key} ${clicks} ได้ ${v}`);
    }
  }
});

test('toMavo คืน null เมื่อ input ว่างหรือไม่ใช่ตัวเลข', () => {
  for (const bad of ['', '   ', null, undefined, 'abc', NaN, Infinity]) {
    assert.equal(toMavo(bad, 'c40'), null, `input ${JSON.stringify(bad)}`);
  }
  assert.equal(toMavo('22', 'c40'), 6.0); // string ที่เป็นตัวเลขยังรับได้
  assert.equal(toMavo(-5, 'c40'), null); // negative number returns null
  assert.equal(toMavo('-5', 'c40'), null); // negative numeric string returns null
  assert.equal(toMavo(0, 'c40'), 0); // zero is valid and returns 0
});

test('toMavo โยน error เมื่อไม่รู้จักเครื่องบด', () => {
  assert.throws(() => toMavo(22, 'ek43'), /ek43/);
});

test('GRINDERS มีข้อความเตือนบนเส้นทาง C2', () => {
  const c2 = GRINDERS.find((g) => g.key === 'c2');
  assert.ok(c2.warning.includes('0.69'));
  const c40 = GRINDERS.find((g) => g.key === 'c40');
  assert.equal(c40.warning, '');
});

import { buildTimerSteps, splitStrokes, formatTime } from './brew.js';

test('formatTime ให้รูปแบบ m:ss', () => {
  assert.equal(formatTime(105), '1:45');
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(60), '1:00');
  assert.equal(formatTime(9), '0:09');
});

// เทส 15 (ส่วนการแบ่งน้ำ) - เศษไปจังหวะแรก ไม่ใช่จังหวะสุดท้าย
test('splitStrokes แบ่งเป็นหน่วยละ 25 ml แล้วแจกเศษให้จังหวะแรกๆ', () => {
  assert.deepStrictEqual(splitStrokes(200, 50, 2), [75, 75]);
  assert.deepStrictEqual(splitStrokes(200, 50, 3), [50, 50, 50]);
  assert.deepStrictEqual(splitStrokes(200, 50, 4), [50, 50, 25, 25]);
  for (const strokes of [1, 2, 3, 4, 5, 6]) {
    const ml = splitStrokes(200, 50, strokes);
    assert.equal(ml.length, strokes);
    assert.equal(ml.reduce((a, b) => a + b, 0), 150, `strokes ${strokes} ผลรวมต้องเป็น 150`);
  }
});

const stepsFor = (device, overrides = {}) => {
  const combo = { device, roast: 'agtron80_95', process: 'washed', altitude: 'mid', origin: 'colombia' };
  const recipe = { ...computeRecipe(combo), ...overrides };
  const picks = defaultPicks(recipe);
  return { recipe, picks, ...buildTimerSteps(recipe, picks) };
};

// เทส 15 - โครงสร้างและเวลา
test('AeroPress ได้ 4 step และ startTime สะสมถูกต้อง', () => {
  const { steps, totalTime, picks } = stepsFor('aeropress');
  assert.equal(steps.length, 4);
  assert.equal(steps[0].startTime, 0);
  assert.equal(steps[1].duration, picks.steep);
  for (let i = 1; i < steps.length; i += 1) {
    assert.equal(steps[i].startTime, steps[i - 1].startTime + steps[i - 1].duration, `step ${i}`);
  }
  assert.equal(totalTime, steps.reduce((sum, s) => sum + s.duration, 0));
});

test('Delter ได้ 3 + 2 * strokes step และไม่มีพักต่อท้ายจังหวะสุดท้าย', () => {
  for (const strokes of [2, 3]) {
    const { steps, picks } = stepsFor('delter', { strokes });
    assert.equal(steps.length, 3 + 2 * strokes, `strokes ${strokes}`);
    assert.equal(steps[2].duration, picks.preinfusionWait);
    const presses = steps.filter((s) => s.name.startsWith('จังหวะ'));
    const rests = steps.filter((s) => s.name.startsWith('พัก'));
    assert.equal(presses.length, strokes);
    assert.equal(rests.length, strokes - 1);
    for (const s of presses) assert.equal(s.duration, picks.pressSpeed);
    for (const s of rests) assert.equal(s.duration, picks.restBetween);
    assert.ok(steps[steps.length - 1].name.includes('bypass'));
  }
});

test('น้ำต่อจังหวะโผล่ในข้อความของแต่ละจังหวะ', () => {
  const two = stepsFor('delter', { strokes: 2 }).steps.filter((s) => s.name.startsWith('จังหวะ'));
  assert.ok(two[0].instruction.includes('75'));
  assert.ok(two[1].instruction.includes('75'));
  const three = stepsFor('delter', { strokes: 3 }).steps.filter((s) => s.name.startsWith('จังหวะ'));
  for (const s of three) assert.ok(s.instruction.includes('50'));
});

test('instruction เป็น string ที่ substitute ค่ามาแล้ว ไม่ใช่ closure', () => {
  for (const device of DEVICES) {
    for (const s of stepsFor(device).steps) {
      assert.equal(typeof s.name, 'string');
      assert.equal(typeof s.instruction, 'string');
      assert.ok(s.instruction.length > 0);
      assert.ok(Number.isFinite(s.duration) && s.duration > 0, `${s.name} duration`);
    }
  }
});

// เวลารวมไม่นับ step bypass ของ combo ตั้งต้น ต้องลงกรอบที่ Notion เขียน
test('เวลารวมถึงจบการกด (ไม่รวม bypass) ลงกรอบของ Notion', () => {
  const ap = stepsFor('aeropress');
  assert.equal(ap.steps[ap.steps.length - 1].startTime, 150); // 15 + 105 + 30 = 2:30
  const dp = stepsFor('delter');
  assert.equal(dp.steps[dp.steps.length - 1].startTime, 145); // 20 + 10 + 50 + 25 + 15 + 25 = 2:25
});
