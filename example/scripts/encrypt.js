import { encryptAssets } from '@tex0l/encrypted-card/encryptAssets.js'

const PASSWORD = 'demo-password'

const result = await encryptAssets({
  sourceDir: './fixtures',
  outputDir: './public/encrypted',
  saltFile: './public/salt.txt',
  password: PASSWORD,
})

if (result.skipped) {
  console.log('Encrypted assets already up to date, skipping.')
} else {
  for (const file of result.encrypted) console.log(`Encrypted: ${file}`)
  console.log('Encryption complete.')
}
