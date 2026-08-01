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
