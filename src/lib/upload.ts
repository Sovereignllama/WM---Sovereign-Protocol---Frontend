/**
 * Upload utilities for token metadata
 * Uses Pinata IPFS for decentralized storage
 */

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

// Get these from environment variables
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || '';

/**
 * Upload a file (image) to IPFS via Pinata
 */
export async function uploadFileToIPFS(file: File): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured. Set NEXT_PUBLIC_PINATA_JWT in your .env file.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload file to IPFS: ${error}`);
  }

  const result = await response.json();
  return `${PINATA_GATEWAY}/${result.IpfsHash}`;
}

/**
 * Upload JSON metadata to IPFS via Pinata
 */
export async function uploadJSONToIPFS(metadata: object, name: string): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured. Set NEXT_PUBLIC_PINATA_JWT in your .env file.');
  }

  const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        name: `${name}-metadata.json`,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload metadata to IPFS: ${error}`);
  }

  const result = await response.json();
  return `${PINATA_GATEWAY}/${result.IpfsHash}`;
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
 * 1. Upload the image file
 * 2. Create metadata JSON with image URI
 * 3. Upload metadata JSON
 * Returns the metadata URI
 */
export async function createTokenMetadata(
  tokenName: string,
  tokenSymbol: string,
  imageFile: File,
  description?: string
): Promise<string> {
  // Step 1: Upload image
  console.log('Uploading token image...');
  const imageUri = await uploadFileToIPFS(imageFile);
  console.log('Image uploaded:', imageUri);

  // Step 2: Create metadata
  const metadata: TokenMetadata = {
    name: tokenName,
    symbol: tokenSymbol,
    description: description || `${tokenName} (${tokenSymbol}) - A Sovereign Liquidity Protocol token`,
    image: imageUri,
    properties: {
      files: [
        {
          uri: imageUri,
          type: imageFile.type,
        },
      ],
      category: 'image',
    },
  };

  // Step 3: Upload metadata
  console.log('Uploading token metadata...');
  const metadataUri = await uploadJSONToIPFS(metadata, tokenSymbol);
  console.log('Metadata uploaded:', metadataUri);

  return metadataUri;
}

/**
 * Check if Pinata is configured
 */
export function isPinataConfigured(): boolean {
  return !!PINATA_JWT;
}
