import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, mkdir, access, readdir } from 'node:fs/promises'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  encryptAssets,
  encryptFile,
  decryptFile,
  deriveKey,
  getSalt,
  normalizePassword
} from '../src/encryptAssets.js'

describe('normalizePassword', () => {
  it('returns a Buffer from a string password', () => {
    const result = normalizePassword('hello')
    assert.ok(Buffer.isBuffer(result))
    assert.equal(result.toString('utf8'), 'hello')
  })

  it('normalizes NFKC unicode', () => {
    // \u00e9 (precomposed) and e\u0301 (decomposed) should produce the same NFKC output
    const a = normalizePassword('\u00e9')
    const b = normalizePassword('e\u0301')
    assert.deepEqual(a, b)
  })
})

describe('getSalt', () => {
  let tmpDir: string

  before(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'salt-test-'))
  })

  after(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('generates a new salt file when none exists', async () => {
    const saltPath = path.join(tmpDir, 'salt.txt')
    const salt = await getSalt(saltPath)
    assert.equal(salt.length, 16)

    const written = await readFile(saltPath, 'utf8')
    assert.deepEqual(Buffer.from(written, 'base64'), salt)
  })

  it('reads an existing salt file', async () => {
    const saltPath = path.join(tmpDir, 'salt.txt')
    const salt1 = await getSalt(saltPath)
    const salt2 = await getSalt(saltPath)
    assert.deepEqual(salt1, salt2)
  })

  it('creates parent directories if needed', async () => {
    const saltPath = path.join(tmpDir, 'nested', 'dir', 'salt.txt')
    const salt = await getSalt(saltPath)
    assert.equal(salt.length, 16)
  })
})

describe('encryptFile / decryptFile', () => {
  it('roundtrips a buffer through encrypt and decrypt', async () => {
    const password = normalizePassword('test-password')
    const salt = Buffer.from('0123456789abcdef')
    const key = await deriveKey(password, salt)

    const original = Buffer.from('Hello, World!')
    const encrypted = encryptFile(original, key)
    const decrypted = decryptFile(encrypted, key)

    assert.deepEqual(decrypted, original)
  })

  it('roundtrips binary data', async () => {
    const password = normalizePassword('binary-test')
    const salt = Buffer.from('fedcba9876543210')
    const key = await deriveKey(password, salt)

    const original = Buffer.from([0x00, 0xff, 0x80, 0x01, 0xfe, 0x7f])
    const encrypted = encryptFile(original, key)
    const decrypted = decryptFile(encrypted, key)

    assert.deepEqual(decrypted, original)
  })

  it('fails decryption with wrong key', async () => {
    const salt = Buffer.from('0123456789abcdef')
    const key1 = await deriveKey(normalizePassword('password-1'), salt)
    const key2 = await deriveKey(normalizePassword('password-2'), salt)

    const original = Buffer.from('secret data')
    const encrypted = encryptFile(original, key1)

    assert.throws(() => decryptFile(encrypted, key2))
  })
})

describe('encryptAssets', () => {
  let tmpDir: string, sourceDir: string, outputDir: string, saltFile: string

  before(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'encrypt-assets-test-'))
    sourceDir = path.join(tmpDir, 'source')
    outputDir = path.join(tmpDir, 'output')
    saltFile = path.join(tmpDir, 'salt.txt')

    await mkdir(sourceDir, { recursive: true })
    await writeFile(path.join(sourceDir, 'contact.json'), JSON.stringify({ name: 'Test' }))
    await writeFile(path.join(sourceDir, 'image.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  })

  after(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('encrypts all files in source directory', async () => {
    const result = await encryptAssets({
      sourceDir,
      outputDir,
      saltFile,
      password: 'test-password'
    })

    assert.equal(result.skipped, false)
    assert.deepEqual(result.encrypted, ['contact.json', 'image.png'])

    const files = await readdir(outputDir)
    assert.deepEqual(files.sort(), ['contact.json.encrypted', 'image.png.encrypted'])
  })

  it('skips re-encryption when assets are valid', async () => {
    const result = await encryptAssets({
      sourceDir,
      outputDir,
      saltFile,
      password: 'test-password'
    })

    assert.equal(result.skipped, true)
    assert.deepEqual(result.encrypted, [])
  })

  it('re-encrypts when source files change', async () => {
    await writeFile(path.join(sourceDir, 'contact.json'), JSON.stringify({ name: 'Changed' }))

    const result = await encryptAssets({
      sourceDir,
      outputDir,
      saltFile,
      password: 'test-password'
    })

    assert.equal(result.skipped, false)
    assert.deepEqual(result.encrypted, ['contact.json', 'image.png'])
  })

  it('encrypted files decrypt back to originals', async () => {
    const password = normalizePassword('test-password')
    const salt = await getSalt(saltFile)
    const key = await deriveKey(password, salt)

    const originalContact = await readFile(path.join(sourceDir, 'contact.json'))
    const encryptedContact = await readFile(path.join(outputDir, 'contact.json.encrypted'))
    const decryptedContact = decryptFile(encryptedContact, key)
    assert.deepEqual(decryptedContact, originalContact)

    const originalImage = await readFile(path.join(sourceDir, 'image.png'))
    const encryptedImage = await readFile(path.join(outputDir, 'image.png.encrypted'))
    const decryptedImage = decryptFile(encryptedImage, key)
    assert.deepEqual(decryptedImage, originalImage)
  })

  it('handles nested directories in source', async () => {
    const nestedTmpDir = await mkdtemp(path.join(tmpdir(), 'encrypt-nested-test-'))
    const nestedSource = path.join(nestedTmpDir, 'source')
    const nestedOutput = path.join(nestedTmpDir, 'output')
    const nestedSalt = path.join(nestedTmpDir, 'salt.txt')

    await mkdir(path.join(nestedSource, 'subdir'), { recursive: true })
    await writeFile(path.join(nestedSource, 'root.txt'), 'root file')
    await writeFile(path.join(nestedSource, 'subdir', 'nested.txt'), 'nested file')

    const result = await encryptAssets({
      sourceDir: nestedSource,
      outputDir: nestedOutput,
      saltFile: nestedSalt,
      password: 'nested-test'
    })

    assert.equal(result.skipped, false)
    assert.deepEqual(result.encrypted, ['root.txt', 'subdir/nested.txt'])

    const rootEncrypted = await access(path.join(nestedOutput, 'root.txt.encrypted')).then(() => true)
    const nestedEncrypted = await access(path.join(nestedOutput, 'subdir', 'nested.txt.encrypted')).then(() => true)
    assert.equal(rootEncrypted, true)
    assert.equal(nestedEncrypted, true)

    await rm(nestedTmpDir, { recursive: true, force: true })
  })
})
