// ตรรกะการคำนวณสูตรทั้งหมด ไม่มี React ไม่มี I/O ทุกฟังก์ชันเป็น pure
// ตัวเลขและกฎของสูตรกาแฟ (base/roast/process/altitude/origin) อยู่ใน brewing-rules.js ทั้งหมด
// ไฟล์นี้เองยังถือค่าคงที่สองอย่าง: ตัวประกอบแปลงหน่วยบด (GRINDERS) และชื่อ/ข้อความ instruction ของแต่ละ step ใน timer

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
// preinfusionAdd กับ pressSpeedAdd ถูกลบตอนรื้อโมเดล Delter 2026-08-06 เพราะเป็นปุ่มที่ไม่มีอำนาจ
// เหลือ steepAdd ซึ่ง AeroPress ใช้จริงจากทั้ง roast และ altitude
export const ADD_FIELDS = {
  steepAdd: 'steep',
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

// กลางช่วงปัดลงให้ลงตัวกับ step เช่น [40,60] step 5 ได้ 50
export function defaultPick([min, max], step) {
  return min + Math.floor((max - min) / 2 / step) * step;
}

// ค่าเริ่มต้นของทุก slider คิดจากช่วงที่คำนวณได้ ไม่ใช่ขอบ slider
export function defaultPicks(recipe) {
  const bounds = rules[recipe.device].sliderBounds;
  const picks = {};
  for (const [field, b] of Object.entries(bounds)) {
    picks[field] = defaultPick(recipe[field], b.step);
  }
  return picks;
}

// ตัวแปลงหน่วยบด ใช้อ่านสูตรจากเน็ตเท่านั้น แอปทำงานด้วยเลขหน้าปัด Mavo ล้วน
// ไม่มีค่าชดเชยในสูตร ทั้งสองเส้นทางตรงตามตาราง preset ของ Notion
export const GRINDERS = [
  { key: 'c40', label: 'Comandante C40 (คลิก)', factor: 0.271, warning: '' },
  {
    key: 'c2',
    label: 'Timemore C2 (คลิก)',
    factor: 0.320,
    warning:
      'เส้นทาง C2 ให้ค่าละเอียดกว่าเส้นทาง C40 เฉลี่ย 0.69 เลข (SD 0.69) ค่าจริงน่าจะหยาบกว่านี้ราวครึ่งเลข ใช้อ่านสูตรเก่าเท่านั้น ห้ามใช้ตั้งค่าจริง',
  },
];

export function toMavo(clicks, grinder) {
  const g = GRINDERS.find((x) => x.key === grinder);
  if (!g) throw new Error(`ไม่รู้จักเครื่องบด "${grinder}"`);
  if (typeof clicks === 'string' && clicks.trim() === '') return null;
  const n = Number(clicks);
  if (clicks === null || clicks === undefined || !Number.isFinite(n) || n < 0) return null;
  return roundHalf(n * g.factor);
}

// ponytail: สำเนาเล็กๆ ของ formatTime ที่ useTimer มี เพื่อให้ brew.js ไม่ต้องพึ่ง React
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// แบ่งน้ำเป็นหน่วยละ 25 ml (ขีดที่มีจริงบนสเกล PRESS) แล้วแจกเท่าๆ กัน
// เศษให้จังหวะแรกๆ จังหวะละ 1 หน่วย ถ้ายกไปท้ายจะได้ 25/25/25/75 ที่ 4 จังหวะ
// ซึ่งย้อนแย้งกับเหตุผลที่แบ่งหลายจังหวะตั้งแต่แรก
export function splitStrokes(water, preinfusionMark, strokes) {
  const total = water - preinfusionMark;
  const units = Math.floor(total / 25);
  const per = Math.floor(units / strokes);
  const remainder = units - per * strokes;
  const ml = Array.from({ length: strokes }, (_, i) => (per + (i < remainder ? 1 : 0)) * 25);
  ml[strokes - 1] += total - units * 25;
  return ml;
}

function aeropressSteps(r, p, timing) {
  return [
    {
      name: 'เทน้ำ',
      instruction: `ใส่กาแฟ ${r.dose} g เทน้ำ ${p.temp} องศา ให้ครบ ${r.water} g แล้วคนเบา 2-3 ที`,
      duration: timing.pour,
    },
    {
      name: 'แช่',
      instruction: `ปิดฝา แช่ไว้ ${formatTime(p.steep)}`,
      duration: p.steep,
    },
    {
      name: 'กด',
      instruction: 'กลับด้าน กดช้าและเบา อย่าฝืน',
      duration: r.pressDuration,
    },
    {
      name: 'เติม bypass',
      instruction: `เติมน้ำร้อน ${p.bypass} g ชิมไปเติมไป`,
      duration: timing.bypassPour,
    },
  ];
}

function delterSteps(r, p, timing) {
  const ml = splitStrokes(r.water, r.preinfusionMark, r.strokes);
  const steps = [
    {
      name: 'เตรียม',
      instruction: `ใส่ผงกาแฟ ${r.dose} g เคาะข้างเครื่องให้หน้าผงเรียบ แล้วเทน้ำ ${p.temp} องศา ${r.water} g ถึงขีด FILL`,
      duration: timing.fill,
    },
    {
      name: 'Pre-infusion',
      instruction: `ยกถึงขีด ${r.preinfusionMark} แล้วกดจนสุด`,
      duration: timing.preinfusionPress,
    },
    {
      name: 'รอ',
      instruction: `รอให้ผงอิ่มน้ำ ${formatTime(p.preinfusionWait)}`,
      duration: p.preinfusionWait,
    },
  ];
  ml.forEach((amount, i) => {
    if (i > 0) {
      steps.push({
        name: `พัก ${i}`,
        instruction: 'ปล่อยให้น้ำซึมผ่านชั้นกาแฟ อย่าเพิ่งกด',
        duration: p.restBetween,
      });
    }
    steps.push({
      name: `จังหวะ ${i + 1}`,
      instruction: `ยกถึงขีด ${amount} แล้วกดช้าๆ ให้ครบ ${formatTime(p.pressSpeed)}`,
      duration: p.pressSpeed,
    });
  });
  steps.push({
    name: 'เติม bypass',
    instruction: `เติมน้ำอุณหภูมิห้อง ${p.bypass} g`,
    duration: timing.bypassPour,
  });
  return steps;
}

// useTimer หา step ปัจจุบันจาก startTime แบบสะสม (absolute) และไม่อ่าน duration เลย
// timing (ระยะเวลา step คงที่) มาจาก rules[device].timing ไม่ใช่จาก recipe เพราะเป็นเรื่องจังหวะ
// การชง ไม่ใช่คุณสมบัติของกาแฟ recipe เลยไม่ควรพก field นี้ไปด้วย
export function buildTimerSteps(recipe, picks) {
  const timing = rules[recipe.device].timing;
  const raw = recipe.device === 'aeropress'
    ? aeropressSteps(recipe, picks, timing)
    : delterSteps(recipe, picks, timing);
  let elapsed = 0;
  const steps = raw.map((step) => {
    const withStart = { ...step, startTime: elapsed };
    elapsed += step.duration;
    return withStart;
  });
  return { steps, totalTime: elapsed };
}
