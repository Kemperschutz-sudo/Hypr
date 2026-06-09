"use client";
// components/CreatePost.jsx

import { useState } from "react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import styles from "./CreatePost.module.css";

export default function CreatePost({ user, username }) {
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const handleSubmit = async () => {
    const content = text.trim();
    if (!content || posting) return;

    setPosting(true);
    try {
      await addDoc(collection(db, "posts"), {
        content,
        authorId: user.uid,
        authorName: username || user.displayName,
        authorPhoto: user.photoURL,
        createdAt: serverTimestamp(),
        likes: [],
      });
      setText("");
    } catch (err) {
      console.error("Failed to post:", err);
    } finally {
      setPosting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  return (
    <div className={styles.card}>
      <div className={styles.avatar}>
        {user.photoURL ? (
          <Image src={user.photoURL} alt={username || user.displayName} width={40} height={40} className={styles.avatarImg} />
        ) : (
          <div className={styles.avatarFallback}>{(username || user.displayName)?.[0] ?? "?"}</div>
        )}
      </div>
      <div className={styles.input}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind?"
          rows={3}
          className={styles.textarea}
          maxLength={500}
        />
        <div className={styles.footer}>
          <span className={styles.charCount}>{text.length > 0 && `${text.length}/500`}</span>
          <button className={`btn btn-primary ${styles.postBtn}`} onClick={handleSubmit} disabled={!text.trim() || posting}>
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
