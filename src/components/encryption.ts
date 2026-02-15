import { Buffer } from 'buffer'
import { scrypt } from 'scrypt-js'

const normalizePassword = (password: string): Uint8Array => new Uint8Array(Buffer.from(password.normalize('NFKC'), 'utf8'))

const N = 1024; const r = 8; const p = 1
const dkLen = 32

export const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const derivedKey = await scrypt(normalizePassword(password), salt, N, r, p, dkLen)
  // Create a new ArrayBuffer and copy the derived key into it
  const keyBuffer = new ArrayBuffer(derivedKey.length)
  new Uint8Array(keyBuffer).set(derivedKey)
  return await self.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )
}

export const decrypt = async (data: Uint8Array, key: CryptoKey): Promise<ArrayBuffer> => {
  const nonce = data.slice(0, 12)
  const ciphertext = data.slice(12)

  return await self.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: nonce
    },
    key,
    ciphertext
  )
}
