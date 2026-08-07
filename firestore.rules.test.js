import { after, before, test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let env;
let alice;
let anon;

before(async () => {
  // host กับ port ไม่ต้องระบุ อ่านจาก FIRESTORE_EMULATOR_HOST ที่ emulators:exec ตั้งให้
  // projectId ต้องตรงกับที่ emulator รันอยู่ (jirbrewstack ใน .firebaserc) เพราะ firebase.json
  // เปิด singleProjectMode ไว้
  env = await initializeTestEnvironment({
    projectId: 'jirbrewstack',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
  alice = env.authenticatedContext('alice').firestore();
  anon = env.unauthenticatedContext().firestore();
});

after(() => env.cleanup());

test('ไม่ login อ่าน rulesets/global ได้', async () => {
  // อ่าน doc ที่ยังไม่มีอยู่ก็ยังผ่าน rules และคืน snapshot ที่ exists() เป็น false
  // ซึ่งพอสำหรับสิ่งที่เคสนี้วัด จึงไม่ต้อง seed ข้อมูล
  await assertSucceeds(getDoc(doc(anon, 'rulesets/global')));
});

test('login แล้วเขียน rulesets/global ไม่ได้', async () => {
  await assertFails(setDoc(doc(alice, 'rulesets/global'), { version: 2 }));
});

test('ผู้ใช้ A อ่าน beans ของ B ไม่ได้', async () => {
  await assertFails(getDoc(doc(alice, 'users/bob/beans/b1')));
});

test('ผู้ใช้ A เขียน beans ของ B ไม่ได้', async () => {
  await assertFails(setDoc(doc(alice, 'users/bob/beans/b1'), { name: 'Ethiopia' }));
});

test('ไม่ login อ่าน beans ของใครก็ไม่ได้', async () => {
  await assertFails(getDoc(doc(anon, 'users/bob/beans/b1')));
});

test('ไม่ login เขียน beans ของใครก็ไม่ได้', async () => {
  await assertFails(setDoc(doc(anon, 'users/bob/beans/b1'), { name: 'Ethiopia' }));
});

test('ผู้ใช้ A อ่านและเขียน beans ของตัวเองได้', async () => {
  await assertSucceeds(setDoc(doc(alice, 'users/alice/beans/b1'), { name: 'Ethiopia' }));
  await assertSucceeds(getDoc(doc(alice, 'users/alice/beans/b1')));
});

// เคสนี้พิสูจน์ว่า {doc=**} ใน rules version 2 คลุม path ที่ไม่มี segment ต่อท้ายด้วย
// คือคลุม doc users/alice ตัวมันเอง ซึ่ง Task 4 ต้องเขียนตอน login ครั้งแรก
// ถ้าเคสนี้ตก ต้องเปลี่ยน firestore.rules เป็น nested match ตาม design ข้อ 3.2
test('ผู้ใช้ A เขียน doc users/A ตัวมันเองได้', async () => {
  await assertSucceeds(setDoc(doc(alice, 'users/alice'), { displayName: 'Alice' }));
});
