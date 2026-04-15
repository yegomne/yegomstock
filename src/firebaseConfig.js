import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: 파이어베이스 콘솔 앱 등록 후 받는 찐 설정값으로 나중에 꼭 바꿔치기 하세요!
const firebaseConfig = {
  apiKey: "AIzaSy_YOUR_API_KEY_HERE",
  authDomain: "yegomstock.firebaseapp.com",
  projectId: "yegomstock",
  storageBucket: "yegomstock.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
