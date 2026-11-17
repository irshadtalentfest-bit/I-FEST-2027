import React, { useState, useEffect } from 'react';
import { FestState, FestPhoto, Participant } from '../types/fest';
import { FestStorageService } from '../services/storage';
import { ConfirmModal } from './ConfirmModal';
import { getAppLabel } from '../utils/labelHelper';
import { compressImageFile, saveMediaDataUrl, getMediaDataUrl } from '../utils/mediaStorage';
import {
  Camera,
  Video,
  Download,
  Upload,
  Search,
  Trash2,
  X,
  Film,
  Image as ImageIcon,
  Play,
} from 'lucide-react';

interface PhotoGalleryViewProps {
  state: FestState;
  isAdmin: boolean;
  onRefreshState: () => void;
}

const useResolvedMediaUrl = (rawUrl?: string) => {
  const [resolved, setResolved] = useState<string>(rawUrl && !rawUrl.startsWith('idb://') ? rawUrl : '');
  useEffect(() => {
    let active = true;
    if (!rawUrl) {
      setResolved('');
      return;
    }
    if (!rawUrl.startsWith('idb://')) {
      setResolved(rawUrl);
      return;
    }
    getMediaDataUrl(rawUrl).then((val) => {
      if (active) setResolved(val || '');
    });
    return () => {
      active = false;
    };
  }, [rawUrl]);
  return resolved;
};

const MediaCardPreview: React.FC<{ item: FestPhoto; isVideo: boolean }> = ({ item, isVideo }) => {
  const photoSrc = useResolvedMediaUrl(item.photoUrl);
  const videoSrc = useResolvedMediaUrl(item.videoUrl);

  if (isVideo) {
    return (
      <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
        {videoSrc ? (
          <video
            src={videoSrc}
            poster={photoSrc && photoSrc !== '/ifest-logo.svg' ? photoSrc : undefined}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            muted
            playsInline
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">Loading video...</div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
          <div className="w-12 h-12 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={photoSrc || '/ifest-logo.svg'}
      alt={item.title}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    />
  );
};

const LightboxContent: React.FC<{ item: FestPhoto }> = ({ item }) => {
  const photoSrc = useResolvedMediaUrl(item.photoUrl);
  const videoSrc = useResolvedMediaUrl(item.videoUrl);

  if (item.mediaType === 'video' && item.videoUrl) {
    return videoSrc ? (
      <video
        src={videoSrc}
        controls
        autoPlay
        className="max-h-[64vh] w-full max-w-3xl rounded-lg shadow-xl"
      />
    ) : (
      <div className="py-12 text-xs text-slate-400">Loading video stream...</div>
    );
  }

  return (
    <img
      src={photoSrc || '/ifest-logo.svg'}
      alt={item.title}
      className="max-h-[64vh] object-contain rounded-lg"
    />
  );
};

export const PhotoGalleryView: React.FC<PhotoGalleryViewProps> = ({
  state,
  isAdmin,
  onRefreshState,
}) => {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Participant' | 'Event' | 'Winners' | 'Videos'>('All');
  const [eventFilterId, setEventFilterId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<FestPhoto | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Admin upload state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadMediaType, setUploadMediaType] = useState<'photo' | 'video'>('photo');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<'Participant' | 'Event' | 'Winners'>('Event');
  const [uploadParticipantId, setUploadParticipantId] = useState('');
  const [uploadEventId, setUploadEventId] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadPhotoDataUrl, setUploadPhotoDataUrl] = useState<string | null>(null);
  const [uploadVideoDataUrl, setUploadVideoDataUrl] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSavingMedia, setIsSavingMedia] = useState(false);

  const photos = state.photos || [];

  const filteredPhotos = photos.filter((ph) => {
    const isVideo = ph.mediaType === 'video' || !!ph.videoUrl;
    const matchesCategory =
      activeFilter === 'All' ||
      (activeFilter === 'Videos' ? isVideo : ph.category === activeFilter);

    const matchesEvent = eventFilterId === 'all' || ph.eventId === eventFilterId;

    const matchesSearch =
      ph.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ph.chestNumber && ph.chestNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ph.participantName && ph.participantName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ph.eventName && ph.eventName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ph.description && ph.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesEvent && matchesSearch;
  });

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Image size exceeds 15MB. Please choose a smaller image.');
      return;
    }

    try {
      const compressed = await compressImageFile(file, 1600, 0.86);
      setUploadPhotoDataUrl(compressed);
      setUploadError(null);
    } catch {
      setUploadError('Failed to process image file.');
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('Video file exceeds 50MB browser limit. For larger videos, paste an MP4/WebM direct link below.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadVideoDataUrl(event.target?.result as string);
      setUploadError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (uploadMediaType === 'photo' && !uploadPhotoDataUrl) {
      setUploadError('Please select a photo to upload.');
      return;
    }

    if (uploadMediaType === 'video' && !uploadVideoDataUrl.trim()) {
      setUploadError('Please upload a video file or provide a valid video URL.');
      return;
    }

    setIsSavingMedia(true);
    try {
      let mappedParticipant: Participant | undefined;
      if (uploadParticipantId) {
        mappedParticipant = state.participants.find((p) => p.id === uploadParticipantId);
      }

      const mappedEvent = uploadEventId
        ? state.events.find((ev) => ev.id === uploadEventId)
        : undefined;

      const mediaUid = `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      let storedPhotoRef = uploadPhotoDataUrl || '/ifest-logo.svg';
      if (uploadPhotoDataUrl && uploadPhotoDataUrl.startsWith('data:') && uploadPhotoDataUrl.length > 120 * 1024) {
        storedPhotoRef = await saveMediaDataUrl(`${mediaUid}-img`, uploadPhotoDataUrl);
      }

      let storedVideoRef: string | undefined;
      if (uploadMediaType === 'video') {
        const rawVideo = uploadVideoDataUrl.trim();
        storedVideoRef = rawVideo.startsWith('data:')
          ? await saveMediaDataUrl(`${mediaUid}-vid`, rawVideo)
          : rawVideo;
      }

      const saveRes = FestStorageService.addPhoto({
        title:
          uploadTitle.trim() ||
          (mappedParticipant
            ? `${mappedParticipant.name} [Chest #${mappedParticipant.chestNumber}]`
            : mappedEvent
            ? `${mappedEvent.title} Highlights`
            : uploadMediaType === 'video'
            ? 'Fest Event Video'
            : 'Fest Photo'),
        category: uploadCategory,
        mediaType: uploadMediaType,
        videoUrl: storedVideoRef,
        participantId: mappedParticipant?.id,
        chestNumber: mappedParticipant?.chestNumber,
        participantName: mappedParticipant?.name,
        eventId: mappedEvent?.id,
        eventName: mappedEvent?.title,
        photoUrl: storedPhotoRef,
        description: uploadDescription.trim(),
        uploadedBy: 'Executive Committee Media Desk',
      });

      if (!saveRes.success) {
        setUploadError(saveRes.error || 'Failed to save media entry.');
        setIsSavingMedia(false);
        return;
      }

      setIsUploadModalOpen(false);
      setUploadTitle('');
      setUploadParticipantId('');
      setUploadEventId('');
      setUploadDescription('');
      setUploadPhotoDataUrl(null);
      setUploadVideoDataUrl('');
      onRefreshState();
    } catch (err) {
      setUploadError(`Upload failed: ${(err as Error).message}`);
    } finally {
      setIsSavingMedia(false);
    }
  };

  const confirmDeleteMedia = () => {
    if (deleteTargetId) {
      FestStorageService.deletePhoto(deleteTargetId);
      if (selectedMedia?.id === deleteTargetId) {
        setSelectedMedia(null);
      }
      setDeleteTargetId(null);
      onRefreshState();
    }
  };

  const triggerDirectDownload = async (item: FestPhoto) => {
    const isVideo = item.mediaType === 'video' && !!item.videoUrl;
    const rawUrl = isVideo ? item.videoUrl! : item.photoUrl;
    const resolvedUrl = (await getMediaDataUrl(rawUrl)) || rawUrl;
    const ext = isVideo ? 'mp4' : 'jpg';

    const link = document.createElement('a');
    link.href = resolvedUrl;
    link.download = `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
              {state.settings.galleryTitle || 'Fest Gallery & Contestant Media'}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                {getAppLabel(state.settings, 'galleryFreeBadge')}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {state.settings.gallerySubtitle ||
                'Browse and download official event photos, highlight videos, and contestant portraits by chest number without login.'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Photo / Video</span>
          </button>
        )}
      </div>

      {/* SEARCH & CATEGORY / EVENT FILTERS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scroll-touch p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
          {(['All', 'Participant', 'Event', 'Winners', 'Videos'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                activeFilter === cat
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat === 'Videos' && <Video className="w-3.5 h-3.5" />}
              <span>{cat === 'Participant' ? 'Contestants (Chest #)' : cat}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={eventFilterId}
            onChange={(e) => setEventFilterId(e.target.value)}
            className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Competitions / Programs</option>
            {state.events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chest #, contestant, event..."
              className="w-full min-h-[42px] pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* MEDIA GALLERY GRID */}
      {filteredPhotos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPhotos.map((item) => {
            const isVideo = item.mediaType === 'video' && !!item.videoUrl;

            return (
              <div
                key={item.id}
                className="group rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 overflow-hidden flex flex-col justify-between transition-all shadow-lg"
              >
                <div
                  className="relative aspect-[4/3] bg-slate-950 overflow-hidden cursor-pointer"
                  onClick={() => setSelectedMedia(item)}
                >
                  <MediaCardPreview item={item} isVideo={isVideo} />

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    {isVideo && (
                      <span className="px-2 py-0.5 rounded bg-rose-600/90 text-white text-[10px] font-bold font-mono flex items-center gap-1 shadow">
                        <Film className="w-3 h-3" /> VIDEO
                      </span>
                    )}
                    {item.chestNumber ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-black font-mono shadow-md">
                        Chest #{item.chestNumber}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-950/80 text-slate-200 text-[10px] font-mono border border-slate-700">
                        {item.category}
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetId(item.id);
                      }}
                      title="Delete Media Permanently"
                      aria-label="Delete Media Permanently"
                      className="absolute top-2.5 right-2.5 min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-xl bg-slate-950/85 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors opacity-95 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm line-clamp-1">{item.title}</h4>
                    {item.participantName && (
                      <p className="text-[11px] text-amber-400 font-medium mt-0.5">
                        Participant: {item.participantName}
                      </p>
                    )}
                    {item.eventName && (
                      <p className="text-[11px] text-cyan-400 font-medium mt-0.5">
                        Event: {item.eventName}
                      </p>
                    )}
                    {item.description && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(item.uploadedAt).toLocaleDateString()}
                    </span>

                    <button
                      onClick={() => triggerDirectDownload(item)}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 text-slate-200 hover:text-slate-950 font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download {isVideo ? 'Video' : 'Photo'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-slate-400">No photos or videos match this search or category filter.</p>
        </div>
      )}

      {/* MEDIA LIGHTBOX MODAL */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">{selectedMedia.title}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono mt-0.5">
                  {selectedMedia.chestNumber && (
                    <span className="text-amber-400">
                      Chest #{selectedMedia.chestNumber} · {selectedMedia.participantName}
                    </span>
                  )}
                  {selectedMedia.eventName && (
                    <span className="text-cyan-400">· {selectedMedia.eventName}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedMedia(null)}
                aria-label="Close preview"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 sm:p-4 bg-slate-950 flex items-center justify-center flex-1 overflow-auto">
              <LightboxContent item={selectedMedia} />
            </div>

            <div className="p-3.5 sm:p-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-400">{selectedMedia.description || 'Official Fest Capture'}</p>
              <button
                onClick={() => triggerDirectDownload(selectedMedia)}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download High-Res {selectedMedia.mediaType === 'video' ? 'Video' : 'Photo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN UPLOAD PHOTO / VIDEO MODAL */}
      {isUploadModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 my-auto max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400" />
                Upload Official Fest Photo or Video
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                aria-label="Close modal"
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMedia} className="space-y-4 text-xs">
              {/* Media Type Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setUploadMediaType('photo')}
                  className={`min-h-[42px] py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    uploadMediaType === 'photo'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Photo Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMediaType('video')}
                  className={`min-h-[42px] py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    uploadMediaType === 'video'
                      ? 'bg-rose-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video Upload / URL</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Media Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as any)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Event">Competition Stage Capture</option>
                    <option value="Participant">Participant Portrait</option>
                    <option value="Winners">Winners Podium Moment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Map Competition / Program</label>
                  <select
                    value={uploadEventId}
                    onChange={(e) => setUploadEventId(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Any / General Fest --</option>
                    {state.events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Map to Participant & Chest Number {uploadCategory === 'Participant' ? '' : '(Optional)'}
                </label>
                <select
                  value={uploadParticipantId}
                  onChange={(e) => setUploadParticipantId(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  required={uploadCategory === 'Participant'}
                >
                  <option value="">-- None / General Capture --</option>
                  {state.participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      [Chest #{p.chestNumber || p.code}] {p.name} ({p.teamName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Media Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Classical Dance Final Performance"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {uploadMediaType === 'photo' ? (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Select Photo File (Max 15MB)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileChange}
                    className="w-full text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                  />
                  {uploadPhotoDataUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-800 max-h-40 flex items-center justify-center bg-slate-950">
                      <img src={uploadPhotoDataUrl} alt="Preview" className="max-h-40 object-contain" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Upload Video File (MP4/WebM up to 50MB) OR Paste Video URL
                    </label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoFileChange}
                      className="w-full text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-500 file:text-white hover:file:bg-rose-400 cursor-pointer mb-2"
                    />
                    <input
                      type="text"
                      value={uploadVideoDataUrl}
                      onChange={(e) => setUploadVideoDataUrl(e.target.value)}
                      placeholder="https://example.com/fest-highlight.mp4"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Caption / Details</label>
                <textarea
                  rows={2}
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Optional caption or stage highlight details..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {uploadError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
                  {uploadError}
                </div>
              )}

              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMedia}
                  className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold shadow-md"
                >
                  {isSavingMedia ? 'Saving Media...' : 'Publish to Public Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MEDIA MODAL */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Media Item Permanently"
        message="Are you sure you want to permanently remove this photo or video from the official fest gallery?"
        confirmText="Yes, Delete Media"
        onConfirm={confirmDeleteMedia}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
