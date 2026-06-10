// lib/notifications.js
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";

export async function sendNotification({ toUid, fromUid, type, postId = null, preview = null }) {
  // Don't notify yourself
  if (toUid === fromUid) return;

  try {
    // Get sender info
    const snap = await getDoc(doc(db, "users", fromUid));
    const fromData = snap.exists() ? snap.data() : {};

    await addDoc(collection(db, "users", toUid, "notifications"), {
      type, // "like" | "reply" | "follow" | "mention"
      fromUid,
      fromUsername: fromData.username || "someone",
      fromPhoto: fromData.photoURL || null,
      postId,
      preview,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
}
