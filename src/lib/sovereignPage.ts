/**
 * API client for Sovereign Page (creator-customizable content)
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Types ───────────────────────────────────────────────────────────

export interface GalleryItem {
  url: string;
  caption?: string;
}

export interface CustomLink {
  label: string;
  url: string;
}

export interface PageLinks {
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  github?: string;
  docs?: string;
  custom?: CustomLink[];
}

export interface RoadmapItem {
  title: string;
  description?: string;
  status: 'planned' | 'in-progress' | 'complete';
}

export interface SovereignPageData {
  sovereignId: number;
  creatorWallet: string;
  summary?: string;
  coverImage?: string;
  gallery: GalleryItem[];
  videoEmbed?: string;
  links: PageLinks;
  roadmap: RoadmapItem[];
  updatedAt: string;
  createdAt: string;
}

export interface SovereignPageInput {
  summary?: string;
  coverImage?: string;
  gallery?: GalleryItem[];
  videoEmbed?: string;
  links?: PageLinks;
  roadmap?: RoadmapItem[];
}

// ─── API Calls ───────────────────────────────────────────────────────

/**
 * Fetch sovereign page data (public, no auth)
 */
export async function fetchSovereignPage(sovereignId: string | number): Promise<SovereignPageData | null> {
  const res = await fetch(`${API_URL}/api/sovereign-pages/${sovereignId}`);
  if (!res.ok) throw new Error('Failed to fetch sovereign page');
  const json = await res.json();
  return json.data || null;
}

/**
 * Save sovereign page data (requires wallet signature)
 */
export async function saveSovereignPage(
  sovereignId: number,
  wallet: string,
  timestamp: number,
  signature: string,
  page: SovereignPageInput
): Promise<SovereignPageData> {
  const res = await fetch(`${API_URL}/api/sovereign-pages/${sovereignId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, sovereignId, timestamp, signature, page }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Save failed' }));
    throw new Error(error.error || 'Failed to save sovereign page');
  }

  const json = await res.json();
  return json.data;
}

/**
 * Upload an image for the sovereign page (requires wallet signature)
 */
export async function uploadPageImage(
  sovereignId: number,
  wallet: string,
  timestamp: number,
  signature: string,
  file: File,
  type: 'cover' | 'gallery'
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('wallet', wallet);
  formData.append('sovereignId', String(sovereignId));
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('type', type);

  const res = await fetch(`${API_URL}/api/sovereign-pages/${sovereignId}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Failed to upload image');
  }

  const json = await res.json();
  return json.url;
}
