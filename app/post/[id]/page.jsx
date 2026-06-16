"use client";
// app/post/[id]/page.jsx — Single post with replies

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
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
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorPhotos, setAuthorPhotos] = useState({});

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

  // Fetch the post
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "posts", id), (snap) => {
      if (snap.exists()) {
        setPost({ id: snap.id, ...snap.data() });
      } else {
        setPost(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [id]);

  // Fetch replies
  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, "posts", id, "replies"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setReplies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [id]);

  // Fetch current profile pictures for reply authors
  useEffect(() => {
    if (replies.length === 0) return;
    const uniqueIds = [...new Set(replies.map((r) => r.authorId).filter(Boolean))];
    Promise.all(
      uniqueIds.map((uid) => getDoc(doc(db, "users", uid)).then((snap) => ({ uid, photo: snap.data()?.photoURL || null })))
    ).then((results) => {
      const map = {};
      results.forEach(({ uid, photo }) => { if (photo) map[uid] = photo; });
      setAuthorPhotos(map);
    });
  }, [replies]);

  const toggleLike = async () => {
    if (!currentUser || !post) return;
    const ref = doc(db, "posts", post.id);
    const liked = post.likes?.includes(currentUser.uid);
    if (liked) {
      await updateDoc(ref, { likes: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(currentUser.uid) });
    }
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

      // Increment reply count on parent post
      await updateDoc(doc(db, "posts", id), { replyCount: (post?.replyCount || 0) + 1 });

      // Send reply notification
      if (post) {
        sendNotification({ toUid: post.authorId, fromUid: currentUser.uid, type: "reply", postId: id, preview: content?.slice(0, 80) });
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

  if (loading) {
    return <div className={styles.loading}><div className={styles.spinner} /></div>;
  }

  if (!post) {
    return (
      <div className={styles.loading}>
        <p style={{ color: "var(--text-muted)" }}>Post not found.</p>
      </div>
    );
  }

  const liked = post.likes?.includes(currentUser?.uid);
  const likeCount = post.likes?.length ?? 0;
  const createdAt = post.createdAt?.toDate
    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true })
    : "just now";

  return (
    <>
      {currentUser && <Navbar user={currentUser} username={username} onLogout={() => signOut(auth)} onUsernameChange={setUsername} />}
      <main className={styles.main}>
        <div className="container">
          <button className={styles.backBtn} onClick={() => router.back()}>← Back</button>

          {/* Main post */}
          <div className={styles.mainPost}>
            <div className={styles.postHeader}>
              <Link href={`/profile/${post.authorId}`} className={styles.avatar}>
                {post.authorPhoto ? (
                  <Image src={post.authorPhoto} alt={post.authorName} width={48} height={48} className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarFallback}>{post.authorName?.[0] ?? "?"}</div>
                )}
              </Link>
              <div>
                <Link href={`/profile/${post.authorId}`} className={styles.author}>@{post.authorName}</Link>
                <p className={styles.time}>{createdAt}</p>
              </div>
            </div>
            <p className={styles.postContent}><MentionText content={post.content} /></p>
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

          {/* Reply box */}
          {currentUser && (
            <div className={styles.replyBox}>
              <div className={styles.replyAvatar}>
                {(userPhoto || currentUser.photoURL) ? (
                  <Image src={userPhoto || currentUser.photoURL} alt={username} width={36} height={36} className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarFallbackSm}>{username?.[0] ?? "?"}</div>
                )}
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
                <div className={styles.replyFooter}>
                  <button className={`btn btn-primary ${styles.replyBtn}`} onClick={handleReply} disabled={!replyText.trim() || posting}>
                    {posting ? "Replying…" : "Reply"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Replies */}
          <div className={styles.replies}>
            {replies.length === 0 ? (
              <p className={styles.empty}>No replies yet — be the first!</p>
            ) : (
              replies.map((reply) => {
                const replyLiked = reply.likes?.includes(currentUser?.uid);
                const replyLikeCount = reply.likes?.length ?? 0;
                const isOwn = reply.authorId === currentUser?.uid;
                const replyTime = reply.createdAt?.toDate
                  ? formatDistanceToNow(reply.createdAt.toDate(), { addSuffix: true })
                  : "just now";

                return (
                  <div key={reply.id} className={styles.reply}>
                    <Link href={`/profile/${reply.authorId}`} className={styles.avatar}>
                      {(authorPhotos[reply.authorId] || reply.authorPhoto) ? (
                        <Image src={authorPhotos[reply.authorId] || reply.authorPhoto} alt={reply.authorName} width={36} height={36} className={styles.avatarImg} />
                      ) : (
                        <div className={styles.avatarFallbackSm}>{reply.authorName?.[0] ?? "?"}</div>
                      )}
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
                      <p className={styles.replyContent}><MentionText content={reply.content} /></p>
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