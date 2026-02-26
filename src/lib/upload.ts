/**
 * Upload utilities for token metadata
 * Routes uploads through the backend API which handles Pinata IPFS
 * All uploads require wallet signature authentication.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Auth fields appended to upload requests */
export interface UploadAuth {
  wallet: string;
  timestamp: number;
  signature: string; // base64-encoded
}

/**
 * Create upload auth by signing a message with the wallet.
 * Call this once before uploading, then pass the result to upload functions.
 */
export async function createUploadAuth(
  walletPubkey: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<UploadAuth> {
  const timestamp = Date.now();
  const message = `Upload to Sovereign Protocol at ${timestamp}`;
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = await signMessage(messageBytes);
  const signature = Buffer.from(signatureBytes).toString('base64');
  return { wallet: walletPubkey, timestamp, signature };
}

/**
 * Upload a file (image) to IPFS via the backend
 */
export async function uploadFileToIPFS(file: File, auth: UploadAuth): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('wallet', auth.wallet);
  formData.append('timestamp', auth.timestamp.toString());
  formData.append('signature', auth.signature);

  const response = await fetch(`${API_URL}/api/upload/image`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Failed to upload image');
  }

  const result = await response.json();
  return result.url;
}

/**
 * Upload JSON metadata to IPFS via the backend
 */
export async function uploadJSONToIPFS(
  name: string,
  symbol: string,
  imageUrl: string,
  description: string | undefined,
  auth: UploadAuth
): Promise<string> {
  const response = await fetch(`${API_URL}/api/upload/metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, symbol, description, imageUrl, ...auth }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Failed to upload metadata');
  }

  const result = await response.json();
  return result.url;
}

/**
 * Token Metadata structure (Metaplex compatible)
 */
export interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    files?: Array<{
      uri: string;
      type: string;
    }>;
    category?: string;
  };
}

/**
 * Create and upload token metadata
 * 1. Upload the image file via backend
 * 2. Upload metadata JSON via backend
 * Returns the metadata URI
 */
export async function createTokenMetadata(
  tokenName: string,
  tokenSymbol: string,
  imageFile: File,
  description: string | undefined,
  auth: UploadAuth
): Promise<string> {
  // Step 1: Upload image
  console.log('Uploading token image...');
  const imageUri = await uploadFileToIPFS(imageFile, auth);
  console.log('Image uploaded:', imageUri);

  // Step 2: Upload metadata
  console.log('Uploading token metadata...');
  const metadataUri = await uploadJSONToIPFS(tokenName, tokenSymbol, imageUri, description, auth);
  console.log('Metadata uploaded:', metadataUri);

  return metadataUri;
}

/**
 * Check if upload is configured (backend handles this now)
 */
export function isPinataConfigured(): boolean {
  return !!API_URL;
}
