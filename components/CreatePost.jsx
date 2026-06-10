"use client";
// components/CreatePost.jsx

import { useState, useRef, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from "firebase/firestore";
import GifPicker from "./GifPicker";
import EmojiPicker from "./EmojiPicker";
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
  const [showGifs, setShowGifs] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDuration, setPollDuration] = useState("24");
  const fileRef = useRef(null);
  const gifBtnRef = useRef(null);
  const emojiBtnRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists() && snap.data().photoURL) setCustomPhoto(snap.data().photoURL);
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
      setImage({ url: data.secure_url });
    } catch (err) {
      console.error("Image upload failed:", err);
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleGifSelect = (gifUrl) => {
    setImage({ url: gifUrl });
    setImagePreview(gifUrl);
    setShowGifs(false);
  };

  const handleEmojiSelect = (emoji) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setText(text + emoji);
    }
    setShowEmoji(false);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    const content = text.trim();
    if ((!content && !image && !showPoll) || posting || uploading) return;
    if (showPoll && pollOptions.filter(o => o.trim()).length < 2) return;

    setPosting(true);
    try {
      const pollData = showPoll ? {
        poll: {
          options: pollOptions.filter(o => o.trim()).map(o => ({ text: o.trim(), votes: [] })),
          endsAt: new Date(Date.now() + parseInt(pollDuration) * 60 * 60 * 1000).toISOString(),
          duration: pollDuration,
        }
      } : {};

      await addDoc(collection(db, "posts"), {
        content: content || "",
        imageUrl: image?.url ?? null,
        authorId: user.uid,
        authorName: username || user.displayName,
        authorPhoto: currentPhoto || user.photoURL,
        createdAt: serverTimestamp(),
        likes: [],
        replyCount: 0,
        ...pollData,
      });
      setText("");
      setImage(null);
      setImagePreview(null);
      setShowPoll(false);
      setPollOptions(["", ""]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      console.error("Failed to post:", err);
    } finally {
      setPosting(false);
    }
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
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && handleSubmit()}
          placeholder="What's on your mind? Use #hashtags"
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

        {showPoll && (
          <div className={styles.pollBuilder}>
            <p className={styles.pollTitle}>Poll options</p>
            {pollOptions.map((opt, i) => (
              <div key={i} className={styles.pollOptionRow}>
                <input
                  className={styles.pollInput}
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const next = [...pollOptions];
                    next[i] = e.target.value;
                    setPollOptions(next);
                  }}
                  maxLength={60}
                />
                {pollOptions.length > 2 && (
                  <button className={styles.removePollOption} onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}>×</button>
                )}
              </div>
            ))}
            {pollOptions.length < 4 && (
              <button className={styles.addPollOption} onClick={() => setPollOptions([...pollOptions, ""])}>+ Add option</button>
            )}
            <div className={styles.pollDuration}>
              <label className={styles.pollDurationLabel}>Poll duration</label>
              <select className={styles.pollSelect} value={pollDuration} onChange={(e) => setPollDuration(e.target.value)}>
                <option value="1">1 hour</option>
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">1 day</option>
                <option value="72">3 days</option>
                <option value="168">7 days</option>
              </select>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <span className={styles.charCount}>{text.length > 0 && `${text.length}/500`}</span>
          <div className={styles.footerRight} style={{ position: "relative" }}>
            <button className={styles.imageBtn} onClick={() => fileRef.current?.click()} disabled={uploading || !!image} title="Add image">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: "none" }} />

            <button ref={gifBtnRef} className={styles.gifBtn} onClick={() => { setShowGifs(!showGifs); setShowEmoji(false); }} disabled={!!image} title="Add GIF">
              <span className={styles.gifLabel}>GIF</span>
            </button>

            <button ref={emojiBtnRef} className={styles.imageBtn} onClick={() => { setShowEmoji(!showEmoji); setShowGifs(false); }} title="Add emoji">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>

            <button className={`${styles.imageBtn} ${showPoll ? styles.imageBtnActive : ""}`} onClick={() => setShowPoll(!showPoll)} title="Add poll">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </button>

            <button className={`btn btn-primary ${styles.postBtn}`} onClick={handleSubmit} disabled={(!text.trim() && !image && !showPoll) || posting || uploading}>
              {posting ? "Posting…" : uploading ? "Uploading…" : "Post"}
            </button>

            {showGifs && <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifs(false)} anchorRef={gifBtnRef} />}
            {showEmoji && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} anchorRef={emojiBtnRef} />}
          </div>
        </div>
      </div>
    </div>
  );
}