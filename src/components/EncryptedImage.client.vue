<template>
  <img v-if="decrypted" :src="decrypted"/>
</template>

<script>
import {decrypt} from './encryption'
import { delay } from './utils'
export default {
  name: 'EncryptedImage',
  props: {
    src: String,
    encryptionKey: CryptoKey
  },
  data () {
    return {
      decrypted: null,
      encrypted: null,
      downloadPromise: Promise.resolve(),
      decryptionPromise: Promise.resolve()
    }
  },
  async mounted () {
    try {
      await this.downloadEncryptedImage()
      await this.decryptEncryptedImage()
    } catch (error) {
      console.error(error)
    }
  },
  methods: {
    async downloadEncryptedImage () {
      await this.downloadPromise
      if (this.encrypted == null) {
        const promise = window.fetch(this.src)
        this.downloadPromise = this.downloadPromise.then(() => Promise.race([promise.finally(() => {}), delay(1000)]))
        this.encrypted = await (await promise).arrayBuffer()
      }
    },
    async decryptEncryptedImage () {
      await this.decryptionPromise
      if (this.decrypted == null) {
        const promise = decrypt(this.encrypted, this.encryptionKey)
        this.decryptionPromise = this.decryptionPromise.then(() => Promise.race([delay(1000), promise.finally(() => {})]))
        this.decrypted = URL.createObjectURL(new Blob([await promise]))
      }
    },
  },
  watch: {
    src () {
      this.encrypted = null
      this.decrypted = null
      this.downloadEncryptedImage()
          .then(() => this.decryptEncryptedImage())
          .catch(console.error)
    },
    encryptionKey () {
      this.decrypted = null
      this.decryptEncryptedImage()
          .catch(console.error)
    }
  }
}
</script>
