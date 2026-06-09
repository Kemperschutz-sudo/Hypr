"use client";
// components/CreatePost.jsx

import { useState, useRef, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from "firebase/firestore";
import styles from "./CreatePost.module.css";

const CLOUD_NAME = "drxpnwzsm";
const UPLOAD_PRESET = "hypr_uploads";

export default function CreatePost({ user, username }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [customPhoto, setCustomPhoto] = useState(null);
  const fileRef = useRef(null);

  // Load custom photo from Firestore in real-time
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists() && snap.data().photoURL) {
        setCustomPhoto(snap.data().photoURL);
      }
    });
    return unsub;
  }, [user?.uid]);

  const currentPhoto = customPhoto || user?.photoURL;

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
      const data = await res.json();
      setImage({ url: data.secure_url, publicId: data.public_id });
    } catch (err) {
      console.error("Image upload failed:", err);
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    const content = text.trim();
    if ((!content && !image) || posting || uploading) return;
    setPosting(true);
    try {
      await addDoc(collection(db, "posts"), {
        content: content || "",
        imageUrl: image?.url ?? null,
        authorId: user.uid,
        authorName: username || user.displayName,
        authorPhoto: currentPhoto || user.photoURL,
        createdAt: serverTimestamp(),
        likes: [],
      });
      setText("");
      setImage(null);
      setImagePreview(null);
      if (fileRef.current) fileRef.current.value = "";
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
        {currentPhoto ? (
          <img src={currentPhoto} alt={username || user.displayName} className={styles.avatarImg} />
        ) : (
          <div className={styles.avatarFallback}>{(username || user.displayName)?.[0]?.toUpperCase() ?? "?"}</div>
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
        {imagePreview && (
          <div className={styles.imagePreview}>
            <img src={imagePreview} alt="Preview" className={styles.previewImg} />
            {uploading && <div className={styles.uploadingOverlay}><div className={styles.uploadSpinner} /></div>}
            {!uploading && (
              <button className={styles.removeImage} onClick={removeImage}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className={styles.footer}>
          <button className={styles.imageBtn} onClick={() => fileRef.current?.click()} disabled={uploading || !!image} title="Add image">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: "none" }} />
          <span className={styles.charCount}>{text.length > 0 && `${text.length}/500`}</span>
          <button className={`btn btn-primary ${styles.postBtn}`} onClick={handleSubmit} disabled={(!text.trim() && !image) || posting || uploading}>
            {posting ? "Posting…" : uploading ? "Uploading…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}