// ตรรกะการคำนวณสูตรทั้งหมด ไม่มี React ไม่มี I/O ทุกฟังก์ชันเป็น pure
// ตัวเลขทั้งหมดอยู่ใน brewing-rules.js ไฟล์นี้ไม่มีตัวเลขของกาแฟเลย

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
