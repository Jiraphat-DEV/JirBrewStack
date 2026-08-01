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
