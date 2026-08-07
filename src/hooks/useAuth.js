import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';

const provider = new GoogleAuthProvider();

// สองอันนี้เงียบ เพราะเป็นเจตนาของผู้ใช้เอง ไม่ใช่ความผิดพลาดที่ต้องรายงาน
const SILENT = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

// getDoc ก่อนแล้วค่อย setDoc เฉพาะตอนยังไม่มี ใช้ setDoc merge อย่างเดียวไม่ได้
// เพราะ createdAt จะถูกเขียนทับทุกรอบที่ login
// เรียกเฉพาะตอน signInWithPopup สำเร็จ ไม่เรียกตอน restore session
// ไม่งั้นเสีย 1 read ทุกครั้งที่รีเฟรชโดยไม่ได้อะไรกลับมา
async function ensureUserDoc(user) {
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
      }),
    [],
  );

  const signIn = async () => {
    setError(null);
    try {
      const cred = await signInWithPopup(auth, provider);
      // ไม่ await เพราะ login สำเร็จไปแล้ว doc นี้เป็นของแถมที่ยังไม่มีใครอ่าน
      // และ subcollection ใน Firestore ไม่ต้องการ parent doc ที่มีอยู่จริง คลังเมล็ดจึงยังทำงานได้ถึงมันจะหาย
      ensureUserDoc(cred.user).catch((e) => console.error('ensureUserDoc', e));
    } catch (e) {
      if (!SILENT.has(e.code)) setError('เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
  };

  const signOut = () => firebaseSignOut(auth);

  return { user, ready, error, signIn, signOut };
}
