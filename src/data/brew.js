// ตรรกะการคำนวณสูตรทั้งหมด ไม่มี React ไม่มี I/O ทุกฟังก์ชันเป็น pure
// ตัวเลขทั้งหมดอยู่ใน brewing-rules.js ไฟล์นี้ไม่มีตัวเลขของกาแฟเลย

import rules from './brewing-rules.js';

// delta บวกสะสมเข้าไปทั้งสองปลาย
export const DELTA_FIELDS = ['temp', 'grind'];

// ทับค่าเดิมทั้งช่วง ขั้นหลังชนะขั้นก่อน
export const OVERRIDE_FIELDS = [
  'steep',
  'preinfusionWait',
  'pressSpeed',
  'restBetween',
  'bypass',
];

// สะสมแยกจากทุกขั้น แล้วบวกเข้า field ปลายทางครั้งเดียวตอนท้าย
export const ADD_FIELDS = {
  steepAdd: 'steep',
  preinfusionAdd: 'preinfusionWait',
  pressSpeedAdd: 'pressSpeed',
};

// field ที่เก็บเป็นช่วง [min, max] เสมอ
export const RANGE_FIELDS = [
  'temp',
  'grind',
  'steep',
  'preinfusionWait',
  'pressSpeed',
  'restBetween',
  'bypass',
  'drinkTemp',
];

// ชุด key ที่เขียนใน patch ได้ พิมพ์ผิดนอกชุดนี้จะโดนเทส 16 จับ
export const KNOWN_PATCH_FIELDS = [
  ...DELTA_FIELDS,
  ...OVERRIDE_FIELDS,
  ...Object.keys(ADD_FIELDS),
  'tempClamp',
  'note',
];

export const roundHalf = (n) => Math.round(n * 2) / 2;

// รับทั้ง 120 และ [120, 150] ให้ผลเหมือนกัน อย่างอื่นโยน error พร้อม path
// เพื่อให้คนแก้ brewing-rules.js เขียนผิดรูปแล้วรู้ทันที ไม่ใช่ผลเพี้ยนเงียบๆ
export function normalizeRange(value, path = 'value') {
  const pair = Array.isArray(value) ? value : [value, value];
  if (pair.length !== 2) {
    throw new Error(`${path}: ต้องเป็นตัวเลขหรือ [min, max] แต่ได้ ${JSON.stringify(value)}`);
  }
  for (const n of pair) {
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      throw new Error(`${path}: ค่าในช่วงต้องเป็นตัวเลข แต่ได้ ${JSON.stringify(value)}`);
    }
  }
  if (pair[0] > pair[1]) {
    throw new Error(`${path}: min มากกว่า max (${pair[0]} > ${pair[1]})`);
  }
  return [pair[0], pair[1]];
}

export const COARSE_NOTE =
  'บดหยาบกว่าค่าตั้งต้นแล้ว ถ้าออกมาบางให้เพิ่มกาแฟ 2 g (หยาบต้องคู่กับเพิ่มโดส ห้ามหยาบเดี่ยวๆ)';

const STAGES = ['roast', 'process', 'altitude', 'origin'];

// เฉพาะเครื่องจริงเท่านั้น ไม่ใช่ทั้ง default export ของ brewing-rules.js
// ซึ่งมี defaults/options/fixes ปนอยู่ด้วย
const DEVICE_TABLE = Object.fromEntries(
  rules.options.device.map(({ key }) => [key, rules[key]]),
);

const clampInto = (v, [lo, hi]) => Math.min(Math.max(v, lo), hi);

function pick(table, key, what) {
  if (!table || !Object.prototype.hasOwnProperty.call(table, key)) {
    throw new Error(`${what}: ไม่รู้จัก "${key}"`);
  }
  return table[key];
}

function scalar(value, path) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path}: ต้องเป็นตัวเลข แต่ได้ ${JSON.stringify(value)}`);
  }
  return value;
}

export function computeRecipe(input) {
  const { device } = input;
  const d = pick(DEVICE_TABLE, device, 'device');

  const out = { device };
  for (const [field, value] of Object.entries(d.base)) {
    out[field] = RANGE_FIELDS.includes(field)
      ? normalizeRange(value, `${device}.base.${field}`)
      : value;
  }

  const notes = [];
  const adds = {};
  let tempClamp = null;

  for (const stage of STAGES) {
    const key = input[stage];
    const patch = pick(d[stage], key, `${device}.${stage}`);
    for (const [field, value] of Object.entries(patch)) {
      const path = `${device}.${stage}.${key}.${field}`;
      if (field === 'note') {
        notes.push(value);
      } else if (field === 'tempClamp') {
        tempClamp = normalizeRange(value, path);
      } else if (field in ADD_FIELDS) {
        const target = ADD_FIELDS[field];
        adds[target] = (adds[target] ?? 0) + scalar(value, path);
      } else if (DELTA_FIELDS.includes(field)) {
        const delta = normalizeRange(value, path);
        out[field] = [out[field][0] + delta[0], out[field][1] + delta[1]];
      } else if (OVERRIDE_FIELDS.includes(field)) {
        out[field] = normalizeRange(value, path);
      } else {
        throw new Error(`${path}: ไม่รู้จัก field "${field}"`);
      }
    }
  }

  // field ประเภทบวกท้ายสะสมจากทุกขั้น แล้วบวกครั้งเดียวหลังสุด
  for (const [field, amount] of Object.entries(adds)) {
    if (!out[field]) {
      throw new Error(`${device}: บวก ${field} ไม่ได้เพราะไม่มีขั้นไหนกำหนดค่าตั้งต้นให้`);
    }
    out[field] = [out[field][0] + amount, out[field][1] + amount];
  }

  // clamp บีบทีละปลาย ไม่ใช่ตัดช่วงทับกัน มิฉะนั้นช่วงที่อยู่นอกกรอบทั้งก้อนจะกลับหัว
  if (tempClamp) {
    out.temp = [clampInto(out.temp[0], tempClamp), clampInto(out.temp[1], tempClamp)];
  }

  out.grind = [roundHalf(out.grind[0]), roundHalf(out.grind[1])];

  for (const field of Object.keys(d.sliderBounds)) {
    if (!out[field]) {
      throw new Error(`${device}: ไม่มีค่า ${field} หลัง apply ครบทุกขั้น`);
    }
  }

  // ratio ของน้ำที่เทเข้า ไม่ใช่ปริมาณน้ำในถ้วย ผงดูดน้ำไว้ราว 2 เท่าของน้ำหนักตัวเอง
  out.ratioConcentrate = out.water / out.dose;
  out.ratioFinal = [
    (out.water + out.bypass[0]) / out.dose,
    (out.water + out.bypass[1]) / out.dose,
  ];

  // บังคับใช้หลักการ "หยาบต้องคู่กับเพิ่มโดส" ในเมื่อแอปปรับ dose ให้เองไม่ได้
  if (out.grind[0] > normalizeRange(d.base.grind)[0]) notes.push(COARSE_NOTE);

  out.notes = notes;
  return out;
}
