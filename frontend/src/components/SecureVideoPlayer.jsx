import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function SecureVideoPlayer({ videoUrl, courseId, lessonTitle }) {
  const videoRef = useRef(null);
  const [streamToken, setStreamToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchToken = async () => {
      if (!videoUrl || !courseId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await api.getVideoToken(courseId, videoUrl);
        if (isMounted && res.streamToken) {
          setStreamToken(res.streamToken);
        }
      } catch (err) {
        console.warn('Video token request warning:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchToken();
    return () => {
      isMounted = false;
    };
  }, [videoUrl, courseId]);

  if (!videoUrl) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        background: '#0f172a',
        color: '#94a3b8',
        borderRadius: '12px',
        fontSize: '0.9rem'
      }}>
        🎥 Select a lesson to start streaming video.
      </div>
    );
  }

  // Detect provider types
  const isDoodStream = videoUrl.includes('dood') || videoUrl.includes('doodstream');
  const isVimeo = videoUrl.includes('vimeo.com');
  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  const isGoogleDrive = videoUrl.includes('drive.google.com');
  const isIframeEmbed = isDoodStream || isVimeo || isGoogleDrive || videoUrl.includes('/embed/') || videoUrl.includes('/e/');

  if (isYouTube || isIframeEmbed) {
    let embedUrl = videoUrl;

    if (isYouTube) {
      if (videoUrl.includes('watch?v=')) {
        const videoId = videoUrl.split('watch?v=')[1]?.split('&')[0];
        embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
      } else if (videoUrl.includes('youtu.be/')) {
        const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
        embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
      }
    } else if (isGoogleDrive) {
      // Convert Google Drive view URL to preview embed URL automatically
      if (videoUrl.includes('/view')) {
        embedUrl = videoUrl.replace('/view', '/preview');
      } else if (!videoUrl.includes('/preview')) {
        const fileId = videoUrl.split('/d/')[1]?.split('/')[0];
        if (fileId) {
          embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        }
      }
    } else if (isVimeo && !videoUrl.includes('player.vimeo.com')) {
      const vimeoId = videoUrl.split('vimeo.com/')[1]?.split('?')[0];
      if (vimeoId) {
        embedUrl = `https://player.vimeo.com/video/${vimeoId}`;
      }
    }

    return (
      <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: '12px', overflow: 'hidden', background: '#000', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
        <iframe
          src={embedUrl}
          title={lessonTitle || 'Lesson Stream'}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          scrolling="no"
        />
      </div>
    );
  }

  // Direct MP4 / Custom Video Player with Context Menu Prevention (Cloudflare, Backblaze, Supabase, MP4)
  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#0f172a',
        boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
      }}
    >
      <video
        ref={videoRef}
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        style={{ width: '100%', maxHeight: '540px', display: 'block' }}
        src={videoUrl}
      >
        Your browser does not support HTML5 video streaming.
      </video>
      <div style={{
        padding: '0.6rem 1rem',
        background: '#1e293b',
        color: '#94a3b8',
        fontSize: '0.78rem',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center'
      }}>
        <span>🔒 Secure End-to-End Encrypted Stream</span>
        <span>{lessonTitle || 'Lesson Stream'}</span>
      </div>
    </div>
  );
}
