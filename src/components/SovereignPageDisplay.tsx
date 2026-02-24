'use client';

import { SovereignPageData } from '@/lib/sovereignPage';

interface SovereignPageDisplayProps {
  page: SovereignPageData;
}

const LINK_ICONS: Record<string, string> = {
  website: '🌐',
  twitter: '𝕏',
  telegram: '✈️',
  discord: '💬',
  github: '🐙',
  docs: '📄',
};

/** Convert YouTube/etc URL into embeddable iframe src */
function getEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.has('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    return url;
  } catch {
    return url;
  }
}

const ROADMAP_STATUS: Record<string, { icon: string; color: string }> = {
  complete: { icon: '✅', color: 'var(--money-green)' },
  'in-progress': { icon: '🔄', color: 'var(--money-green)' },
  planned: { icon: '⏳', color: 'var(--faint)' },
};

export function SovereignPageDisplay({ page }: SovereignPageDisplayProps) {
  const hasLinks = page.links && Object.entries(page.links).some(([k, v]) => {
    if (k === 'custom') return Array.isArray(v) && v.length > 0;
    return !!v;
  });
  const hasContent = page.summary || page.coverImage || page.gallery?.length ||
    page.videoEmbed || hasLinks || page.roadmap?.length;

  if (!hasContent) return null;

  return (
    <div className="space-y-6 mt-6">
      {/* Cover image */}
      {page.coverImage && (
        <div className="rounded-xl overflow-hidden border border-[var(--border)]">
          <img
            src={page.coverImage}
            alt="Cover"
            className="w-full h-48 sm:h-64 object-cover"
          />
        </div>
      )}

      {/* Executive summary */}
      {page.summary && (
        <section>
          <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">About</h3>
          <p className="text-sm text-[var(--text-light)] leading-relaxed whitespace-pre-wrap">
            {page.summary}
          </p>
        </section>
      )}

      {/* Links */}
      {hasLinks && (
        <section>
          <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Links</h3>
          <div className="flex flex-wrap gap-2">
            {(['website', 'twitter', 'telegram', 'discord', 'github', 'docs'] as const).map((key) => {
              const url = page.links[key];
              if (!url) return null;
              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--landfill-black)] border border-[var(--border)] text-[var(--text-light)] text-xs font-medium hover:border-[var(--money-green)]/30 hover:shadow-[0_0_8px_rgba(46,235,127,0.1)] transition-colors"
                >
                  <span>{LINK_ICONS[key] || '🔗'}</span>
                  <span className="capitalize">{key}</span>
                </a>
              );
            })}
            {page.links.custom?.map((cl, i) => (
              <a
                key={`custom-${i}`}
                href={cl.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--landfill-black)] border border-[var(--border)] text-[var(--text-light)] text-xs font-medium hover:border-[var(--money-green)]/30 hover:shadow-[0_0_8px_rgba(46,235,127,0.1)] transition-colors"
              >
                <span>🔗</span>
                <span>{cl.label || 'Link'}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      {page.gallery && page.gallery.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Gallery</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {page.gallery.map((item, i) => (
              <div key={i} className="rounded-lg overflow-hidden border border-[var(--border)] group relative">
                <img
                  src={item.url}
                  alt={item.caption || `Image ${i + 1}`}
                  className="w-full aspect-square object-cover"
                />
                {item.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                    <p className="text-[10px] text-white truncate">{item.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Video embed */}
      {page.videoEmbed && (
        <section>
          <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Video</h3>
          <div className="rounded-xl overflow-hidden border border-[var(--border)] aspect-video">
            <iframe
              src={getEmbedUrl(page.videoEmbed)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {/* Roadmap */}
      {page.roadmap && page.roadmap.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Roadmap</h3>
          <div className="space-y-2">
            {page.roadmap.map((item, i) => {
              const statusInfo = ROADMAP_STATUS[item.status] || ROADMAP_STATUS.planned;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--dark-green-bg)]"
                >
                  <span className="text-sm mt-0.5">{statusInfo.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    {item.description && (
                      <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-tight">{item.description}</p>
                    )}
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
                    style={{ color: statusInfo.color }}
                  >
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
