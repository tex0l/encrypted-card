import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { access, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { Buffer } from 'node:buffer'
import path from 'node:path'

const scryptAsync = promisify(scrypt)
const N = 1024; const r = 8; const p = 1
const dkLen = 32

const required = (name) => {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required environment variable: ${name}`)
    process.exit(1)
  }
  return value
}

const saltFile = required('ENCRYPT_SALT_FILE')
const toEncryptDir = required('ENCRYPT_SOURCE_DIR')
const publicEncrypted = required('ENCRYPT_OUTPUT_DIR')
const password = Buffer.from(required('PASSWORD').normalize('NFKC'), 'utf8')

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

  if (sourceFiles.length !== encryptedFiles.length ||
      !sourceFiles.every((f, i) => f === encryptedFiles[i])) {
    console.log('File list mismatch, re-encrypting all assets...')
    return false
  }

  for (const file of sourceFiles) {
    const sourcePath = path.join(toEncryptDir, file)
    const encryptedPath = path.join(publicEncrypted, file + '.encrypted')

    try {
      const sourceContent = await readFile(sourcePath)
      const encryptedContent = await readFile(encryptedPath)
      const decryptedContent = decryptFile(encryptedContent, key)

      if (!sourceContent.equals(decryptedContent)) {
        console.log(`Content mismatch for ${file}, re-encrypting all assets...`)
        return false
      }
    } catch {
      console.log(`Decryption failed for ${file}, re-encrypting all assets...`)
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
    console.log(`Encrypted: ${file}`)
  }
}

const main = async () => {
  const salt = await getSalt()
  const key = await deriveKey(password, salt)

  const encryptedDirExists = await dirExists(publicEncrypted)

  if (encryptedDirExists) {
    const isValid = await verifyEncryptedAssets(key)
    if (isValid) {
      console.log('All encrypted assets are valid, skipping re-encryption.')
      return
    }

    await rm(publicEncrypted, { recursive: true, force: true })
  }

  await encryptAllFiles(key)
  console.log('Encryption complete.')
}

main()
  .catch(console.error)
