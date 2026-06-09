"use client";
// components/Post.jsx

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import styles from "./Post.module.css";

function PostContent({ content }) {
  const [mentionMap, setMentionMap] = useState({});

  useEffect(() => {
    const mentions = [...content.matchAll(/@([a-z0-9_]+)/gi)].map(m => m[1].toLowerCase());
    if (mentions.length === 0) return;
    const resolve = async () => {
      const map = {};
      for (const name of [...new Set(mentions)]) {
        const q = query(collection(db, "usernames"), where("__name__", "==", name));
        const snap = await getDocs(q);
        if (!snap.empty) map[name] = snap.docs[0].data().uid;
      }
      setMentionMap(map);
    };
    resolve();
  }, [content]);

  const parts = content.split(/(@[a-z0-9_]+)/gi);
  return (
    <p className={styles.content}>
      {parts.map((part, i) => {
        const match = part.match(/^@([a-z0-9_]+)$/i);
        if (match) {
          const name = match[1].toLowerCase();
          const uid = mentionMap[name];
          if (uid) return <Link key={i} href={`/profile/${uid}`} className={styles.mention}>@{match[1]}</Link>;
          return <span key={i} className={styles.mentionUnknown}>@{match[1]}</span>;
        }
        return part;
      })}
    </p>
  );
}

export default function Post({ post, currentUser }) {
  const router = useRouter();
  const liked = post.likes?.includes(currentUser.uid);
  const likeCount = post.likes?.length ?? 0;
  const isOwn = post.authorId === currentUser.uid;

  const [contextMenu, setContextMenu] = useState(null); // { x, y }
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const menuRef = useRef(null);

  const createdAt = post.createdAt?.toDate
    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true })
    : "just now";

  // Close context menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleContextMenu = (e) => {
    if (!isOwn) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const toggleLike = async () => {
    const ref = doc(db, "posts", post.id);
    if (liked) {
      await updateDoc(ref, { likes: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(currentUser.uid) });
    }
  };

  const handleDelete = async () => {
    setContextMenu(null);
    if (!confirm("Delete this post?")) return;
    await deleteDoc(doc(db, "posts", post.id));
  };

  const handleEdit = () => {
    setContextMenu(null);
    setEditText(post.content);
    setEditing(true);
  };

  const handleCopyLink = () => {
    setContextMenu(null);
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
  };

  const handleCopyText = () => {
    setContextMenu(null);
    navigator.clipboard.writeText(post.content);
  };

  const saveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === post.content) { setEditing(false); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, "posts", post.id), { content: trimmed, edited: true });
      setEditing(false);
    } catch (err) {
      console.error("Edit failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={styles.post}
        onClick={() => router.push(`/post/${post.id}`)}
        onContextMenu={handleContextMenu}
        style={{ cursor: "pointer" }}
      >
        <div className={styles.header}>
          <Link href={`/profile/${post.authorId}`} className={styles.avatar} onClick={(e) => e.stopPropagation()}>
            {post.authorPhoto ? (
              <Image src={post.authorPhoto} alt={post.authorName} width={40} height={40} className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarFallback}>{post.authorName?.[0] ?? "?"}</div>
            )}
          </Link>
          <div className={styles.meta}>
            <Link href={`/profile/${post.authorId}`} className={styles.author} onClick={(e) => e.stopPropagation()}>
              @{post.authorName}
            </Link>
            <span className={styles.time}>{createdAt}{post.edited && " · edited"}</span>
          </div>
        </div>

        {editing ? (
          <div className={styles.editBox} onClick={(e) => e.stopPropagation()}>
            <textarea
              className={styles.editTextarea}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              maxLength={500}
              autoFocus
            />
            <div className={styles.editActions}>
              <button className="btn btn-ghost" onClick={() => setEditing(false)} style={{ fontSize: 13, padding: "6px 14px" }}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving} style={{ fontSize: 13, padding: "6px 14px" }}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <PostContent content={post.content} />
        )}

        <div className={styles.actions}>
          <button
            className={`${styles.likeBtn} ${liked ? styles.liked : ""}`}
            onClick={(e) => { e.stopPropagation(); toggleLike(); }}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>{likeCount > 0 ? likeCount : ""}</span>
          </button>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && isOwn && (
        <div
          ref={menuRef}
          className={styles.contextMenu}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className={styles.menuItem} onClick={handleEdit}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit post
          </button>
          <button className={styles.menuItem} onClick={handleCopyLink}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Copy link
          </button>
          <button className={styles.menuItem} onClick={handleCopyText}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy text
          </button>
          <div className={styles.menuDivider} />
          <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={handleDelete}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            Delete post
          </button>
        </div>
      )}
    </>
  );
}
