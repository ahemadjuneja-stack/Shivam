import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

const config = {
  apiKey: "AIzaSyBgsDf1VyV8yWoJBiKsp5zKO6IhGUYkpKI",
  authDomain: "shivam-2bace.firebaseapp.com",
  projectId: "shivam-2bace",
  storageBucket: "shivam-2bace.firebasestorage.app",
  messagingSenderId: "998857606826",
  appId: "1:998857606826:web:b294810014f9b4b60172d3",
};

const app = initializeApp(config);
const storage = getStorage(app);

async function test() {
  const storageRef = ref(storage, "test.txt");
  await uploadString(storageRef, "hello");
  const url = await getDownloadURL(storageRef);
  console.log("Success:", url);
}

test().catch(e => console.error(e));
