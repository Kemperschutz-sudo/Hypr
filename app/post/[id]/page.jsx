"use client";
// app/post/[id]/page.jsx — Single post with replies

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc, getDoc, onSnapshot, collection, query,
  orderBy, addDoc, serverTimestamp, updateDoc,
  deleteDoc, arrayUnion, arrayRemove,
} from "firebase/firestore";
import Navbar from "@/components/Navbar";
import { formatDistanceToNow } from "date-fns";
import { sendNotification } from "@/lib/notifications";
import styles from "./post.module.css";

const CLOUD_NAME = "drxpnwzsm";
const UPLOAD_PRESET = "hypr_uploads";

function MentionText({ content }) {
  const parts = content.split(/(@[a-z0-9_]+)/gi);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^@([a-z0-9_]+)$/i);
        if (match) return <span key={i} className={styles.mention}>@{match[1]}</span>;
        return part;
      })}
    </>
  );
}

function UserAvatar({ uid, fallbackName, fallbackPhoto, size = 36 }) {
  const [photo, setPhoto] = useState(fallbackPhoto || null);
  const [name, setName] = useState(fallbackName || "");

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.photoURL) setPhoto(data.photoURL);
        if (data.username) setName(data.username);
      }
    });
    return unsub;
  }, [uid]);

  const fallbackClass = size >= 48 ? styles.avatarFallback : styles.avatarFallbackSm;
  return photo ? (
    <img src={photo} alt={name} className={styles.avatarImg} style={{ width: size, height: size }} />
  ) : (
    <div className={fallbackClass} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function PostPage() {
  const { id } = useParams();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState("");
  const [userPhoto, setUserPhoto] = useState(null);
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [replyImage, setReplyImage] = useState(null);
  const [replyImagePreview, setReplyImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          if (snap.data().username) setUsername(snap.data().username);
          if (snap.data().photoURL) setUserPhoto(snap.data().photoURL);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "posts", id), (snap) => {
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() });
      else setPost(null);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "posts", id, "replies"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setReplies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [id]);

  const toggleLike = async () => {
    if (!currentUser || !post) return;
    const ref = doc(db, "posts", post.id);
    const liked = post.likes?.includes(currentUser.uid);
    if (liked) {
      await updateDoc(ref, { likes: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(currentUser.uid) });
      sendNotification({ toUid: post.authorId, fromUid: currentUser.uid, type: "like", postId: post.id, preview: post.content?.slice(0, 80) });
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplyImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
      const data = await res.json();
      setReplyImage(data.secure_url);
    } catch (err) {
      console.error("Image upload failed:", err);
      setReplyImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeReplyImage = () => {
    setReplyImage(null);
    setReplyImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleReply = async () => {
    const content = replyText.trim();
    if ((!content && !replyImage) || posting || !currentUser) return;
    setPosting(true);
    try {
      await addDoc(collection(db, "posts", id, "replies"), {
        content: content || "",
        imageUrl: replyImage || null,
        authorId: currentUser.uid,
        authorName: username || currentUser.displayName,
        authorPhoto: userPhoto || currentUser.photoURL,
        createdAt: serverTimestamp(),
        likes: [],
      });

      // Send reply notification to post author
      if (post) {
        sendNotification({ toUid: post.authorId, fromUid: currentUser.uid, type: "reply", postId: id, preview: content?.slice(0, 80) });
      }

      // Send mention notifications
      const mentions = [...(content || "").matchAll(/@([a-z0-9_]+)/gi)].map(m => m[1].toLowerCase());
      for (const mention of [...new Set(mentions)]) {
        const { getDocs, query: q2, collection: col, where: wh } = await import("firebase/firestore");
        const snap = await getDocs(q2(col(db, "usernames"), wh("__name__", "==", mention)));
        if (!snap.empty) {
          const mentionedUid = snap.docs[0].data().uid;
          sendNotification({ toUid: mentionedUid, fromUid: currentUser.uid, type: "mention", postId: id, preview: content?.slice(0, 80) });
        }
      }

      setReplyText("");
      setReplyImage(null);
      setReplyImagePreview(null);
    } catch (err) {
      console.error("Reply failed:", err);
    } finally {
      setPosting(false);
    }
  };

  const deleteReply = async (replyId) => {
    await deleteDoc(doc(db, "posts", id, "replies", replyId));
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;
  if (!post) return <div className={styles.loading}><p style={{ color: "var(--text-muted)" }}>Post not found.</p></div>;

  const liked = post.likes?.includes(currentUser?.uid);
  const likeCount = post.likes?.length ?? 0;
  const createdAt = post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : "just now";

  return (
    <>
      {currentUser && <Navbar user={currentUser} username={username} onLogout={() => signOut(auth)} onUsernameChange={setUsername} />}
      <main className={styles.main}>
        <div className="container">
          <button className={styles.backBtn} onClick={() => router.back()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          <div className={styles.mainPost}>
            <div className={styles.postHeader}>
              <Link href={`/profile/${post.authorId}`} className={styles.avatar}>
                <UserAvatar uid={post.authorId} fallbackName={post.authorName} fallbackPhoto={post.authorPhoto} size={48} />
              </Link>
              <div>
                <Link href={`/profile/${post.authorId}`} className={styles.author}>@{post.authorName}</Link>
                <p className={styles.time}>{createdAt}</p>
              </div>
            </div>
            {post.content && <p className={styles.postContent}><MentionText content={post.content} /></p>}
            {post.imageUrl && (
              <div className={styles.postImageWrap}>
                <img src={post.imageUrl} alt="Post image" className={styles.postImage} />
              </div>
            )}
            <div className={styles.postActions}>
              <button className={`${styles.likeBtn} ${liked ? styles.liked : ""}`} onClick={toggleLike}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>{likeCount > 0 ? likeCount : ""} {likeCount === 1 ? "like" : likeCount > 1 ? "likes" : "Like"}</span>
              </button>
              <span className={styles.replyCount}>{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
            </div>
          </div>

          {currentUser && (
            <div className={styles.replyBox}>
              <div className={styles.replyAvatar}>
                <UserAvatar uid={currentUser.uid} fallbackName={username} fallbackPhoto={userPhoto || currentUser.photoURL} size={36} />
              </div>
              <div className={styles.replyInput}>
                <textarea
                  className={styles.textarea}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && handleReply()}
                  placeholder="Post your reply…"
                  rows={2}
                  maxLength={500}
                />
                {replyImagePreview && (
                  <div className={styles.replyImagePreview}>
                    <img src={replyImagePreview} alt="Preview" className={styles.replyPreviewImg} />
                    {uploadingImage && <div className={styles.uploadOverlay}><div className={styles.uploadSpinner} /></div>}
                    {!uploadingImage && (
                      <button className={styles.removeImg} onClick={removeReplyImage}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
                <div className={styles.replyFooter}>
                  <button className={styles.imageBtn} onClick={() => fileRef.current?.click()} disabled={uploadingImage || !!replyImage} title="Add image">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                    </svg>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: "none" }} />
                  <button className={`btn btn-primary ${styles.replyBtn}`} onClick={handleReply} disabled={(!replyText.trim() && !replyImage) || posting || uploadingImage}>
                    {posting ? "Replying…" : uploadingImage ? "Uploading…" : "Reply"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.replies}>
            {replies.length === 0 ? (
              <p className={styles.empty}>No replies yet — be the first!</p>
            ) : (
              replies.map((reply) => {
                const isOwn = reply.authorId === currentUser?.uid;
                const replyTime = reply.createdAt?.toDate ? formatDistanceToNow(reply.createdAt.toDate(), { addSuffix: true }) : "just now";
                return (
                  <div key={reply.id} className={styles.reply}>
                    <Link href={`/profile/${reply.authorId}`} className={styles.avatar}>
                      <UserAvatar uid={reply.authorId} fallbackName={reply.authorName} fallbackPhoto={reply.authorPhoto} size={36} />
                    </Link>
                    <div className={styles.replyBody}>
                      <div className={styles.replyMeta}>
                        <Link href={`/profile/${reply.authorId}`} className={styles.replyAuthor}>@{reply.authorName}</Link>
                        <span className={styles.replyTime}>{replyTime}</span>
                        {isOwn && (
                          <button className={styles.deleteReplyBtn} onClick={() => deleteReply(reply.id)} title="Delete reply">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {reply.content && <p className={styles.replyContent}><MentionText content={reply.content} /></p>}
                      {reply.imageUrl && (
                        <div className={styles.replyImageWrap}>
                          <img src={reply.imageUrl} alt="Reply image" className={styles.replyImage} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </>
  );
}