import { createCipheriv, createDecipheriv, randomBytes, scrypt, type BinaryLike, type ScryptOptions } from 'node:crypto'
import { access, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { Buffer } from 'node:buffer'
import path from 'node:path'

const scryptAsync = (password: BinaryLike, salt: BinaryLike, keylen: number, options: ScryptOptions): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err)
      else resolve(derivedKey)
    })
  })

const N = 1024; const r = 8; const p = 1
const dkLen = 32

export const normalizePassword = (password: string): Buffer => Buffer.from(password.normalize('NFKC'), 'utf8')

export const getSalt = async (saltPath: string): Promise<Buffer> => {
  try {
    await access(saltPath, constants.F_OK)
    const saltB64 = await readFile(saltPath)
    return Buffer.from(saltB64.toString(), 'base64')
  } catch {
    await mkdir(path.dirname(saltPath), { recursive: true })
    const salt = randomBytes(16)
    await writeFile(saltPath, salt.toString('base64'))
    return salt
  }
}

export const deriveKey = async (password: Buffer, salt: Buffer): Promise<Buffer> => {
  return await scryptAsync(password, salt, dkLen, { N, r, p }) as Buffer
}

export const encryptFile = (buf: Buffer, key: Buffer): Buffer => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encryptedData = Buffer.concat([cipher.update(buf), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, encryptedData, authTag])
}

export const decryptFile = (encryptedBuf: Buffer, key: Buffer): Buffer => {
  const iv = encryptedBuf.subarray(0, 12)
  const authTag = encryptedBuf.subarray(-16)
  const ciphertext = encryptedBuf.subarray(12, -16)

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

const listFilesRecursively = async (dir: string, basePath: string = dir): Promise<string[]> => {
  const files: string[] = []
  try {
    const entries = await readdir(dir)
    for (const entry of entries) {
      const fullPath = path.join(dir, entry)
      const fileStat = await stat(fullPath)
      if (fileStat.isDirectory()) {
        files.push(...await listFilesRecursively(fullPath, basePath))
      } else {
        files.push(path.relative(basePath, fullPath))
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return files.sort()
}

const dirExists = async (dir: string): Promise<boolean> => {
  try {
    await access(dir, constants.F_OK)
    return true
  } catch {
    return false
  }
}

const verifyEncryptedAssets = async (sourceDir: string, outputDir: string, key: Buffer): Promise<boolean> => {
  const sourceFiles = await listFilesRecursively(sourceDir)
  const encryptedFiles = (await listFilesRecursively(outputDir))
    .map(f => f.replace(/\.encrypted$/, ''))

  if (sourceFiles.length !== encryptedFiles.length ||
      !sourceFiles.every((f, i) => f === encryptedFiles[i])) {
    return false
  }

  for (const file of sourceFiles) {
    const sourcePath = path.join(sourceDir, file)
    const encryptedPath = path.join(outputDir, file + '.encrypted')

    try {
      const sourceContent = await readFile(sourcePath)
      const encryptedContent = await readFile(encryptedPath)
      const decryptedContent = decryptFile(encryptedContent, key)

      if (!sourceContent.equals(decryptedContent)) {
        return false
      }
    } catch {
      return false
    }
  }

  return true
}

export interface EncryptAssetsOptions {
  sourceDir: string
  outputDir: string
  saltFile: string
  password: string
}

export interface EncryptAssetsResult {
  encrypted: string[]
  skipped: boolean
}

/**
 * Encrypt all files in sourceDir into outputDir using AES-256-GCM.
 */
export const encryptAssets = async ({ sourceDir, outputDir, saltFile, password }: EncryptAssetsOptions): Promise<EncryptAssetsResult> => {
  const normalizedPassword = normalizePassword(password)
  const salt = await getSalt(saltFile)
  const key = await deriveKey(normalizedPassword, salt)

  if (await dirExists(outputDir)) {
    const isValid = await verifyEncryptedAssets(sourceDir, outputDir, key)
    if (isValid) {
      return { encrypted: [], skipped: true }
    }
    await rm(outputDir, { recursive: true, force: true })
  }

  const sourceFiles = await listFilesRecursively(sourceDir)
  for (const file of sourceFiles) {
    const sourcePath = path.join(sourceDir, file)
    const encryptedPath = path.join(outputDir, file + '.encrypted')

    await mkdir(path.dirname(encryptedPath), { recursive: true })
    const sourceContent = await readFile(sourcePath)
    await writeFile(encryptedPath, encryptFile(sourceContent, key))
  }

  return { encrypted: sourceFiles, skipped: false }
}
