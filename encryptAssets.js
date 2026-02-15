import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { access, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { Buffer } from 'node:buffer'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const workingDirectory = dirname(fileURLToPath(import.meta.url))

const scryptAsync = promisify(scrypt)
const N = 1024; const r = 8; const p = 1
const dkLen = 32

const isDummy = process.env.DUMMY === 'true'

// Configurable paths via environment variables, with sensible standalone defaults
const saltFile = process.env.ENCRYPT_SALT_FILE ?? path.join(workingDirectory, 'fixtures', 'public', isDummy ? 'saltDummy.txt' : 'salt.txt')
const toEncryptDir = process.env.ENCRYPT_SOURCE_DIR ?? path.join(workingDirectory, isDummy ? 'fixtures/to_encrypt' : 'to_encrypt')
const publicEncrypted = process.env.ENCRYPT_OUTPUT_DIR ?? path.join(workingDirectory, 'fixtures', 'public', isDummy ? 'encryptedDummy' : 'encrypted')

const getSalt = async (saltPath = saltFile) => {
  try {
    await access(saltPath, constants.F_OK)
    const saltB64 = await readFile(saltPath)
    return Buffer.from(saltB64.toString(), 'base64')
  } catch {
    console.log(`No salt was found at ${saltPath}, generating one.`)
    await mkdir(path.dirname(saltPath), { recursive: true })
    const salt = randomBytes(16)
    await writeFile(saltPath, salt.toString('base64'))
    return salt
  }
}

const getPassword = () => {
  if (isDummy) return normalizePassword('my-super-secret-password')
  else if (process.env.PASSWORD) return normalizePassword(process.env.PASSWORD)
  else return null // Skip prod encryption if PASSWORD not defined
}

const normalizePassword = password => Buffer.from(password.normalize('NFKC'), 'utf8')

const deriveKey = async (password, salt) => await scryptAsync(password, salt, dkLen, { N, r, p })

const encryptFile = async (buf, key) => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encryptedData = Buffer.concat([cipher.update(buf), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, encryptedData, authTag])
}

const decryptFile = (encryptedBuf, key) => {
  const iv = encryptedBuf.subarray(0, 12)
  const authTag = encryptedBuf.subarray(-16)
  const ciphertext = encryptedBuf.subarray(12, -16)

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

const listFilesRecursively = async (dir, basePath = dir) => {
  const files = []
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

const dirExists = async (dir) => {
  try {
    await access(dir, constants.F_OK)
    return true
  } catch {
    return false
  }
}

const verifyEncryptedAssets = async (key) => {
  const sourceFiles = await listFilesRecursively(toEncryptDir)
  const encryptedFiles = (await listFilesRecursively(publicEncrypted))
    .map(f => f.replace(/\.encrypted$/, ''))

  // Check if file lists match
  if (sourceFiles.length !== encryptedFiles.length ||
      !sourceFiles.every((f, i) => f === encryptedFiles[i])) {
    console.log(`[${isDummy ? 'dummy' : 'prod'}] File list mismatch, re-encrypting all assets...`)
    return false
  }

  // Verify each encrypted file can be decrypted and matches source
  for (const file of sourceFiles) {
    const sourcePath = path.join(toEncryptDir, file)
    const encryptedPath = path.join(publicEncrypted, file + '.encrypted')

    try {
      const sourceContent = await readFile(sourcePath)
      const encryptedContent = await readFile(encryptedPath)
      const decryptedContent = decryptFile(encryptedContent, key)

      if (!sourceContent.equals(decryptedContent)) {
        console.log(`[${isDummy ? 'dummy' : 'prod'}] Content mismatch for ${file}, re-encrypting all assets...`)
        return false
      }
    } catch {
      console.log(`[${isDummy ? 'dummy' : 'prod'}] Decryption failed for ${file}, re-encrypting all assets...`)
      return false
    }
  }

  return true
}

const encryptAllFiles = async (key) => {
  const sourceFiles = await listFilesRecursively(toEncryptDir)

  for (const file of sourceFiles) {
    const sourcePath = path.join(toEncryptDir, file)
    const encryptedPath = path.join(publicEncrypted, file + '.encrypted')

    await mkdir(path.dirname(encryptedPath), { recursive: true })
    const sourceContent = await readFile(sourcePath)
    await writeFile(encryptedPath, await encryptFile(sourceContent, key))
    console.log(`[${isDummy ? 'dummy' : 'prod'}] Encrypted: ${file}`)
  }
}

const main = async () => {
  const password = getPassword()

  if (password === null) {
    console.log('[prod] PASSWORD not defined, skipping prod encryption.')
    return
  }

  const salt = await getSalt()
  const key = await deriveKey(password, salt)

  const encryptedDirExists = await dirExists(publicEncrypted)

  if (encryptedDirExists) {
    const isValid = await verifyEncryptedAssets(key)
    if (isValid) {
      console.log(`[${isDummy ? 'dummy' : 'prod'}] All encrypted assets are valid, skipping re-encryption.`)
      return
    }

    // Remove invalid encrypted directory
    await rm(publicEncrypted, { recursive: true, force: true })
  }

  // Encrypt all files
  await encryptAllFiles(key)
  console.log(`[${isDummy ? 'dummy' : 'prod'}] Encryption complete.`)
}

main()
  .catch(console.error)
