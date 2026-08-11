import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../firebase.js';

const provider = new GoogleAuthProvider();

// สองอันนี้เงียบ เพราะเป็นเจตนาของผู้ใช้เอง ไม่ใช่ความผิดพลาดที่ต้องรายงาน
const SILENT = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

// import 'firebase/firestore' แบบ dynamic เพราะคนไม่ login คือ default path
// และไม่ควรโหลด Firestore SDK เลย เรียกเฉพาะตอนนี้ ตอน signInWithPopup สำเร็จ
// getDoc ก่อนแล้วค่อย setDoc เฉพาะตอนยังไม่มี ใช้ setDoc merge อย่างเดียวไม่ได้
// เพราะ createdAt จะถูกเขียนทับทุกรอบที่ login
// เรียกเฉพาะตอน signInWithPopup สำเร็จ ไม่เรียกตอน restore session
// ไม่งั้นเสีย 1 read ทุกครั้งที่รีเฟรชโดยไม่ได้อะไรกลับมา
async function ensureUserDoc(user) {
  const { getFirestore, doc, getDoc, serverTimestamp, setDoc } = await import(
    'firebase/firestore'
  );
  const db = getFirestore();
  const ref = doc(db, 'users', user.uid);
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, {
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: serverTimestamp(),
  });
}

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (next) => {
        setUser(next);
        setReady(true);
        // เคลียร์ error เก่าทุกครั้งที่ auth state เปลี่ยน ไม่งั้น error ที่ค้างจากตอน
        // ยังไม่ login จะโผล่ซ้ำใต้ปุ่ม login หลัง sign out รอบถัดไป
        setError(null);
      }),
    [],
  );

  const signIn = async () => {
    setError(null);
    try {
      const cred = await signInWithPopup(auth, provider);
      // ไม่ await เพราะ login สำเร็จไปแล้ว doc นี้เป็นของแถมที่ยังไม่มีใครอ่าน
      // และ subcollection ใน Firestore ไม่ต้องการ parent doc ที่มีอยู่จริง คลังเมล็ดจึงยังทำงานได้ถึงมันจะหาย
      ensureUserDoc(cred.user).catch((e) => console.error('ensureUserDoc', e?.code, e));
    } catch (e) {
      if (!SILENT.has(e?.code)) {
        // ข้อความที่ผู้ใช้เห็นเป็นข้อความกลางๆ ตัว error จริงต้อง log ไว้เสมอ
        // ไม่งั้นเวลา login พังจริงจะไม่มีอะไรให้ไล่เลย
        console.error('signIn', e?.code, e);
        setError('เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง');
      }
    }
  };

  const signOut = () => {
    setError(null);
    // ไม่ปล่อยให้ promise นี้ reject เงียบๆ จนกลายเป็น unhandled rejection
    return firebaseSignOut(auth).catch((e) => console.error('signOut', e));
  };

  return { user, ready, error, signIn, signOut };
}
