'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSovereign } from '@/hooks/useSovereign';
import { useSovereignPage, useSaveSovereignPage, useUploadPageImage } from '@/hooks/useSovereignPage';
import { SovereignPageInput, GalleryItem, RoadmapItem, PageLinks } from '@/lib/sovereignPage';
import Link from 'next/link';

export default function SovereignPageEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const sovereignId = params.id ? parseInt(params.id as string, 10) : undefined;

  const { data: sovereign, isLoading: sovLoading } = useSovereign(sovereignId?.toString());
  const { data: pageData, isLoading: pageLoading } = useSovereignPage(sovereignId);
  const savePage = useSaveSovereignPage(sovereignId);
  const uploadImage = useUploadPageImage(sovereignId);

  // Form state
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [videoEmbed, setVideoEmbed] = useState('');
  const [links, setLinks] = useState<PageLinks>({});
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [saved, setSaved] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Populate form from existing data
  useEffect(() => {
    if (pageData) {
      setSummary(pageData.summary || '');
      setCoverImage(pageData.coverImage || '');
      setGallery(pageData.gallery || []);
      setVideoEmbed(pageData.videoEmbed || '');
      setLinks(pageData.links || {});
      setRoadmap(pageData.roadmap || []);
    }
  }, [pageData]);

  const isCreator = connected && publicKey && sovereign?.creator === publicKey.toBase58();
  const isLoading = sovLoading || pageLoading;

  // ─── Auth gate ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--card-bg)] rounded w-1/3" />
          <div className="h-40 bg-[var(--card-bg)] rounded" />
          <div className="h-40 bg-[var(--card-bg)] rounded" />
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <h2 className="h2 text-white mb-2">Connect Wallet</h2>
        <p className="text-[var(--muted)]">Connect your wallet to edit this sovereign page.</p>
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <h2 className="h2 text-white mb-2">Access Denied</h2>
        <p className="text-[var(--muted)]">Only the sovereign creator can edit this page.</p>
        <Link href={`/sovereign/${sovereignId}`} className="btn btn-outline btn-sm mt-4 inline-block">
          Back to Sovereign
        </Link>
      </div>
    );
  }

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage.mutateAsync({ file, type: 'cover' });
      setCoverImage(url);
    } catch (err) {
      console.error('Cover upload failed:', err);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || gallery.length >= 6) return;
    try {
      const url = await uploadImage.mutateAsync({ file, type: 'gallery' });
      setGallery([...gallery, { url }]);
    } catch (err) {
      console.error('Gallery upload failed:', err);
    }
  };

  const removeGalleryItem = (index: number) => {
    setGallery(gallery.filter((_, i) => i !== index));
  };

  const updateGalleryCaption = (index: number, caption: string) => {
    const updated = [...gallery];
    updated[index] = { ...updated[index], caption };
    setGallery(updated);
  };

  const addRoadmapItem = () => {
    if (roadmap.length >= 8) return;
    setRoadmap([...roadmap, { title: '', status: 'planned' }]);
  };

  const updateRoadmapItem = (index: number, field: keyof RoadmapItem, value: string) => {
    const updated = [...roadmap];
    updated[index] = { ...updated[index], [field]: value };
    setRoadmap(updated);
  };

  const removeRoadmapItem = (index: number) => {
    setRoadmap(roadmap.filter((_, i) => i !== index));
  };

  const updateLink = (field: keyof PageLinks, value: string) => {
    setLinks({ ...links, [field]: value });
  };

  const addCustomLink = () => {
    const current = links.custom || [];
    if (current.length >= 3) return;
    setLinks({ ...links, custom: [...current, { label: '', url: '' }] });
  };

  const updateCustomLink = (index: number, field: 'label' | 'url', value: string) => {
    const custom = [...(links.custom || [])];
    custom[index] = { ...custom[index], [field]: value };
    setLinks({ ...links, custom });
  };

  const removeCustomLink = (index: number) => {
    const custom = (links.custom || []).filter((_, i) => i !== index);
    setLinks({ ...links, custom });
  };

  const handleSave = async () => {
    setSaved(false);
    const pageInput: SovereignPageInput = {
      summary,
      coverImage,
      gallery,
      videoEmbed,
      links,
      roadmap: roadmap.filter(r => r.title.trim()),
    };
    try {
      await savePage.mutateAsync(pageInput);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-[var(--landfill-black)] border border-[var(--border)] text-[var(--text-light)] placeholder-[var(--faint)] text-sm focus:outline-none focus:border-[var(--money-green)]/40 focus:shadow-[0_0_8px_rgba(46,235,127,0.12)] transition-colors';
  const labelClass = 'block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5';

  return (
    <div className="h-full md:overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href={`/sovereign/${sovereignId}`} className="text-[var(--muted)] hover:text-white text-sm mb-1 inline-block">
              &larr; Back to {sovereign?.name || `Sovereign #${sovereignId}`}
            </Link>
            <h1 className="h2 text-white">Edit Your Page</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={savePage.isPending}
            className="btn btn-primary btn-sm"
          >
            {savePage.isPending ? 'Signing...' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>

        {savePage.isError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {(savePage.error as Error).message}
          </div>
        )}

        <div className="space-y-6">
          {/* ── Cover Image ──────────────────────────────────────── */}
          <section>
            <label className={labelClass}>Cover Image</label>
            <div
              className="relative w-full h-48 rounded-xl border border-dashed border-[var(--border)] bg-[var(--dark-green-bg)] overflow-hidden cursor-pointer hover:border-[var(--money-green)]/30 hover:shadow-[0_0_8px_rgba(46,235,127,0.1)] transition-colors"
              onClick={() => coverInputRef.current?.click()}
            >
              {coverImage ? (
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--faint)] text-sm">
                  Click to upload cover image (max 2MB)
                </div>
              )}
              {uploadImage.isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="text-white text-sm animate-pulse">Uploading...</span>
                </div>
              )}
            </div>
            <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleCoverUpload} />
            {coverImage && (
              <button onClick={() => setCoverImage('')} className="text-[10px] text-[var(--loss)] mt-1 hover:underline">
                Remove cover
              </button>
            )}
          </section>

          {/* ── Executive Summary ─────────────────────────────────── */}
          <section>
            <label className={labelClass}>Executive Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="Describe your project — what it does, why LPs should deposit, your vision..."
              className={inputClass + ' resize-y min-h-[100px]'}
            />
            <p className="text-[10px] text-[var(--faint)] mt-1 text-right">{summary.length}/2000</p>
          </section>

          {/* ── Links ──────────────────────────────────────────────── */}
          <section>
            <label className={labelClass}>Links</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['website', 'twitter', 'telegram', 'discord', 'github', 'docs'] as const).map((field) => (
                <div key={field}>
                  <label className="text-[10px] text-[var(--faint)] capitalize mb-0.5 block">{field}</label>
                  <input
                    type="url"
                    value={(links[field] as string) || ''}
                    onChange={(e) => updateLink(field, e.target.value)}
                    placeholder={`https://${field === 'twitter' ? 'x.com/...' : field === 'telegram' ? 't.me/...' : field === 'discord' ? 'discord.gg/...' : '...'}`}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>

            {/* Custom links */}
            {(links.custom || []).map((cl, i) => (
              <div key={i} className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={cl.label}
                  onChange={(e) => updateCustomLink(i, 'label', e.target.value)}
                  placeholder="Label"
                  maxLength={40}
                  className={inputClass + ' w-1/3'}
                />
                <input
                  type="url"
                  value={cl.url}
                  onChange={(e) => updateCustomLink(i, 'url', e.target.value)}
                  placeholder="https://..."
                  className={inputClass + ' flex-1'}
                />
                <button onClick={() => removeCustomLink(i)} className="text-[var(--loss)] text-sm px-2 hover:opacity-70">✕</button>
              </div>
            ))}
            {(links.custom?.length || 0) < 3 && (
              <button onClick={addCustomLink} className="text-[11px] text-[var(--money-green)] mt-2 hover:underline">
                + Add custom link
              </button>
            )}
          </section>

          {/* ── Gallery ────────────────────────────────────────────── */}
          <section>
            <label className={labelClass}>Gallery ({gallery.length}/6)</label>
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((item, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border border-[var(--border)]">
                  <img src={item.url} alt={item.caption || `Gallery ${i + 1}`} className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2">
                    <input
                      type="text"
                      value={item.caption || ''}
                      onChange={(e) => updateGalleryCaption(i, e.target.value)}
                      placeholder="Caption..."
                      maxLength={120}
                      className="w-full text-[10px] px-2 py-1 rounded bg-black/50 text-white border border-white/20 focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={() => removeGalleryItem(i)}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {gallery.length < 6 && (
                <div
                  className="flex items-center justify-center aspect-square rounded-lg border border-dashed border-[var(--border)] cursor-pointer hover:border-[var(--money-green)]/30 hover:shadow-[0_0_6px_rgba(46,235,127,0.1)] transition-colors text-[var(--faint)] text-sm"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  {uploadImage.isPending ? '...' : '+'}
                </div>
              )}
            </div>
            <input ref={galleryInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleGalleryUpload} />
          </section>

          {/* ── Video Embed ────────────────────────────────────────── */}
          <section>
            <label className={labelClass}>Video</label>
            <input
              type="url"
              value={videoEmbed}
              onChange={(e) => setVideoEmbed(e.target.value)}
              placeholder="YouTube or video URL (e.g. https://www.youtube.com/watch?v=...)"
              className={inputClass}
            />
            {videoEmbed && (
              <div className="mt-2 rounded-lg overflow-hidden border border-[var(--border)] aspect-video">
                <iframe
                  src={getEmbedUrl(videoEmbed)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </section>

          {/* ── Roadmap ────────────────────────────────────────────── */}
          <section>
            <label className={labelClass}>Roadmap ({roadmap.length}/8)</label>
            <div className="space-y-2">
              {roadmap.map((item, i) => (
                <div key={i} className="flex gap-2 items-start p-3 rounded-lg border border-[var(--border)] bg-[var(--dark-green-bg)]">
                  <select
                    value={item.status}
                    onChange={(e) => updateRoadmapItem(i, 'status', e.target.value)}
                    className="px-2 py-1.5 rounded text-xs bg-[var(--landfill-black)] border border-[var(--border)] text-[var(--text-light)] focus:outline-none"
                  >
                    <option value="planned">Planned</option>
                    <option value="in-progress">In Progress</option>
                    <option value="complete">Complete</option>
                  </select>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateRoadmapItem(i, 'title', e.target.value)}
                      placeholder="Milestone title"
                      maxLength={80}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => updateRoadmapItem(i, 'description', e.target.value)}
                      placeholder="Brief description (optional)"
                      maxLength={300}
                      className={inputClass + ' text-[11px]'}
                    />
                  </div>
                  <button onClick={() => removeRoadmapItem(i)} className="text-[var(--loss)] text-sm px-1 hover:opacity-70 mt-1">✕</button>
                </div>
              ))}
            </div>
            {roadmap.length < 8 && (
              <button onClick={addRoadmapItem} className="text-[11px] text-[var(--money-green)] mt-2 hover:underline">
                + Add milestone
              </button>
            )}
          </section>
        </div>

        {/* Bottom save bar */}
        <div className="sticky bottom-0 bg-[var(--dark-green-bg)]/90 backdrop-blur-sm border-t border-[var(--border)] py-3 mt-6 -mx-4 px-4 flex items-center justify-between">
          <span className="text-[11px] text-[var(--faint)]">
            {savePage.isPending ? 'Saving...' : saved ? 'Changes saved!' : 'Unsaved changes'}
          </span>
          <button
            onClick={handleSave}
            disabled={savePage.isPending}
            className="btn btn-primary btn-sm"
          >
            {savePage.isPending ? 'Signing...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Convert a YouTube/etc URL into an embeddable iframe src */
function getEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    // youtube.com/watch?v=ID
    if (u.hostname.includes('youtube.com') && u.searchParams.has('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    // youtu.be/ID
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    // Already an embed URL or other
    return url;
  } catch {
    return url;
  }
}
