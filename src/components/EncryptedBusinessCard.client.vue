<template>
  <div class="min-h-screen">
    <div v-if="!ready">
      <div class="grid place-content-center">
        <div class="flex items-center gap-2 text-gray-500">
          <span class="h-6 w-6 block rounded-full border-4 border-t-blue-300 animate-spin"></span>
          loading...
        </div>
      </div>
    </div>
      <div
          v-if="ready && contactInfo"
          class="flex flex-col justify-center items-center">
        <div class="inline-block flex-shrink-0 flex-grow-0 max-w-sm relative my-10 mx-16 md:mx-0">
          <div class="rounded-b-full aspect-[10/11] relative overflow-hidden">
            <div class="w-4/5 ml-[11%]">
              <EncryptedImage
                  :src="imagePath"
                  :encryption-key="encryptionKey"/>
            </div>
          </div>
          <div class="absolute bottom-0 left-0 rounded-full aspect-square bg-gradient-to-t from-gray-900 to-gray-500 w-full overflow-hidden -z-50"></div>
        </div>
        <div
            v-if="contactInfo"
            class="space-y-3 w-4/5">
          <div class="text-3xl font-bold text-center">{{ contactInfo.firstName }} {{ contactInfo.lastName }}</div>
          <div class="text-xl font-bold text-center">{{ contactInfo.jobTitle }} @ <a
              class="underline"
              :href="contactInfo.companyLink"
              target="_blank"
              rel="noreferrer noopener">{{
              contactInfo.companyName
            }}</a></div>
          <div class="text-center space-x-2">
            <Icon class="inline" icon="carbon:phone"/>
            <a
                class="underline"
                :href="contactInfo.phoneNumberLink">{{ contactInfo.phoneNumber }}</a></div>
          <div class="text-center space-x-2">
            <Icon class="inline" icon="carbon:email"/>
            <a
                class="underline"
                :href="contactInfo.emailAddressLink">{{ contactInfo.emailAddress }}</a></div>
          <div
              @click="downloadVCF"
              class="w-16 aspect-square fixed right-0 flex flex-col justify-center items-center shadow-xl border border-gray-200 rounded-l-lg cursor-pointer hover:scale-105 transition">
            <Icon class="inline" icon="carbon:download"/>
            <Icon class="inline" icon="mdi:card-account-phone-outline"/>
          </div>
          <div class="text-center space-x-2">
            <Icon class="inline" icon="carbon:logo-linkedin"/>
            <a
                class="underline"
                :href="contactInfo.linkedinLink"
                target="_blank"
                rel="noreferrer noopener">{{ contactInfo.linkedin }}</a></div>
          <div class="text-center space-x-2">
            <Icon class="inline" icon="carbon:logo-twitter"/>
            <a
                class="underline"
                :href="contactInfo.twitterLink"
                target="_blank"
                rel="noreferrer noopener">{{ contactInfo.twitter }}</a></div>
          <div class="text-center space-x-2">
            <Icon class="inline" icon="carbon:http"/>
            <a
                class="underline"
                :href="contactInfo.personalWebsiteLink"
                target="_blank"
                rel="noreferrer noopener">Personal website</a></div>
        </div>
      </div>
      <div v-else
           class="flex justify-center items-center min-h-[80vh]">
        <div class="px-12 py-8 shadow-2xl rounded-md flex flex-col justify-center items-center space-y-6">
          <div>The password seems to be incorrect! Please try again:</div>
          <input class="rounded-md border border-gray-200 px-4 py-2 w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-300" v-model="password">
        </div>
      </div>
    <div class="mt-6 w-full text-center italic">The content of this web page is end-2-end encrypted, for more details please read the <a class="underline cursor-pointer" href="/en/blog/encrypted-card" target="_blank" rel="noopener">related blog article</a>.</div>
  </div>
</template>

<script setup>
import EncryptedImage from './EncryptedImage.client.vue'
import { Icon } from '@iconify/vue';
</script>

<script>
import { deriveKey, decrypt } from './encryption'
import { Buffer } from 'buffer/'
import vCard from 'vcard-creator'

export default {
  props: {
    contactInfoPath: String,
    imagePath: String,
    saltPath: String,
  },
  mounted () {
    this.password = window.location.hash.slice(1)
  },
  methods: {
    async retrieveSalt () {
      if (!this.saltPath) return
      this.salt = await (await window.fetch(this.saltPath)).text()
    },
    async retrieveEncryptedContactInfo () {
      if (!this.contactInfoPath) return
      this.encryptedContactInfo = await (await window.fetch(this.contactInfoPath)).arrayBuffer()
    },
    downloadVCF () {
      if (!this.contactInfo) return
      const card = new vCard()
      const text = card
          .addName(this.contactInfo.lastName, this.contactInfo.firstName)
          .addCompany(this.contactInfo.companyName)
          .addJobtitle(this.contactInfo.jobTitle)
          .addEmail(this.contactInfo.emailAddress)
          .addPhoneNumber(this.contactInfo.phoneNumber)
          .addSocial(this.contactInfo.twitterLink, 'Twitter', this.contactInfo.twitter)
          .addSocial(this.contactInfo.linkedinLink, 'LinkedIn', this.contactInfo.linkedin)
          .addURL(this.contactInfo.personalWebsiteLink)
          .addURL(this.contactInfo.companyLink)
          // TODO .addPhoto()
          .buildVCard()

      const blob = new Blob([text], { type: 'text/vcard' })

      const a = document.createElement('a')
      a.download = `${this.contactInfo.firstName}-${this.contactInfo.lastName}.vcard`
      a.href = URL.createObjectURL(blob)
      a.dataset.downloadurl = ['text/vcard', a.download, a.href].join(':')
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(function () { URL.revokeObjectURL(a.href) }, 1500)

    },
    async decryptContactInfo () {
      if (!this.encryptedContactInfo || !this.encryptionKey) return
      try {
        this.contactInfo = JSON.parse(Buffer.from(await decrypt(this.encryptedContactInfo, this.encryptionKey)).toString('utf-8'))
      } catch (error) {
        console.error('failed decryption', error)
        this.contactInfo = null
      }
    },
    async deriveKey () {
      if (!this.salt || !this.password) return
      try {
        this.encryptionKey = await deriveKey(this.password, Buffer.from(this.salt, 'base64'))
      } catch (error) {
        console.error('failed derivation', error)
        this.encryptionKey = null
      }
    }
  },
  watch: {
    saltPath: {
      handler () {
        this.retrieveSalt()
      },
      immediate: true
    },
    contactInfoPath: {
      handler () {
        this.retrieveEncryptedContactInfo()
      },
      immediate: true
    },
    password: {
      handler () {
        this.deriveKey()
      },
      immediate: true
    },
    salt: {
      handler () {
        this.deriveKey()
      },
      immediate: true
    },
    encryptionKey () {
      this.decryptContactInfo()
    }
  },
  data () {
    return {
      salt: '',
      encryptedContactInfo: '',
      encryptionKey: null,
      contactInfo: null,
      password: null
    }
  },
  computed: {
    ready () {
      return !!this.salt && !!this.encryptedContactInfo && (!!this.encryptionKey || this.password === '')
    }
  }
}
</script>
