<template>
  <div class="flex flex-col items-center px-4 py-12">
    <!-- Loading skeleton -->
    <div v-if="!ready" class="w-full max-w-md">
      <div class="rounded-2xl border border-(--color-border) bg-white shadow-sm overflow-hidden">
        <div class="flex flex-col items-center px-6 pt-8 pb-6 animate-pulse">
          <div class="w-28 h-28 rounded-full bg-(--color-border)"></div>
          <div class="mt-4 h-6 w-48 rounded bg-(--color-border)"></div>
          <div class="mt-2 h-4 w-32 rounded bg-(--color-border)"></div>
        </div>
        <div class="border-t border-(--color-border) px-6 py-4 space-y-4 animate-pulse">
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded bg-(--color-border)"></div>
            <div class="h-4 w-40 rounded bg-(--color-border)"></div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded bg-(--color-border)"></div>
            <div class="h-4 w-52 rounded bg-(--color-border)"></div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded bg-(--color-border)"></div>
            <div class="h-4 w-36 rounded bg-(--color-border)"></div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded bg-(--color-border)"></div>
            <div class="h-4 w-44 rounded bg-(--color-border)"></div>
          </div>
        </div>
        <div class="border-t border-(--color-border) px-6 py-4 animate-pulse">
          <div class="h-10 w-full rounded-lg bg-(--color-border)"></div>
        </div>
      </div>
    </div>

    <!-- Card display -->
    <div v-else-if="ready && contactInfo" class="w-full max-w-md">
      <div class="rounded-2xl border border-(--color-border) bg-white shadow-sm overflow-hidden">
        <!-- Header: avatar + name -->
        <div class="flex flex-col items-center px-6 pt-8 pb-6">
          <div class="w-28 h-28 rounded-full ring-2 ring-(--color-border) overflow-hidden">
            <EncryptedImage
              class="w-full h-full object-cover"
              :src="imagePath"
              :encryption-key="encryptionKey"
            />
          </div>
          <h1 class="mt-4 text-2xl font-semibold tracking-tight text-(--color-text-primary)">
            {{ contactInfo.firstName }} {{ contactInfo.lastName }}
          </h1>
          <p class="mt-1 text-sm text-(--color-text-secondary)">
            {{ contactInfo.jobTitle }} @
            <a
              class="underline"
              :href="contactInfo.companyLink"
              target="_blank"
              rel="noreferrer noopener"
            >{{ contactInfo.companyName }}</a>
          </p>
        </div>

        <!-- Contact rows -->
        <div class="border-t border-(--color-border) px-6 py-4 space-y-3">
          <a
            :href="contactInfo.phoneNumberLink"
            class="group flex items-center gap-3 text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
          >
            <Icon class="w-5 h-5 shrink-0 text-(--color-text-muted) group-hover:text-(--color-text-primary) transition-colors" icon="carbon:phone" />
            <span class="text-sm">{{ contactInfo.phoneNumber }}</span>
          </a>
          <a
            :href="contactInfo.emailAddressLink"
            class="group flex items-center gap-3 text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
          >
            <Icon class="w-5 h-5 shrink-0 text-(--color-text-muted) group-hover:text-(--color-text-primary) transition-colors" icon="carbon:email" />
            <span class="text-sm">{{ contactInfo.emailAddress }}</span>
          </a>
          <a
            :href="contactInfo.linkedinLink"
            target="_blank"
            rel="noreferrer noopener"
            class="group flex items-center gap-3 text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
          >
            <Icon class="w-5 h-5 shrink-0 text-(--color-text-muted) group-hover:text-(--color-text-primary) transition-colors" icon="carbon:logo-linkedin" />
            <span class="text-sm">{{ contactInfo.linkedin }}</span>
          </a>
          <a
            :href="contactInfo.twitterLink"
            target="_blank"
            rel="noreferrer noopener"
            class="group flex items-center gap-3 text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
          >
            <Icon class="w-5 h-5 shrink-0 text-(--color-text-muted) group-hover:text-(--color-text-primary) transition-colors" icon="carbon:logo-twitter" />
            <span class="text-sm">{{ contactInfo.twitter }}</span>
          </a>
          <a
            :href="contactInfo.personalWebsiteLink"
            target="_blank"
            rel="noreferrer noopener"
            class="group flex items-center gap-3 text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
          >
            <Icon class="w-5 h-5 shrink-0 text-(--color-text-muted) group-hover:text-(--color-text-primary) transition-colors" icon="carbon:http" />
            <span class="text-sm">Personal website</span>
          </a>
        </div>

        <!-- Download button -->
        <div class="border-t border-(--color-border) px-6 py-4">
          <button
            @click="downloadVCF"
            class="w-full flex items-center justify-center gap-2 rounded-lg bg-(--color-accent) px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Icon class="w-5 h-5" icon="carbon:download" />
            Save contact
          </button>
        </div>
      </div>

      <!-- Encryption footer -->
      <p class="mt-4 flex items-center justify-center gap-1.5 text-xs text-(--color-text-muted)">
        <Icon class="w-3.5 h-3.5" icon="carbon:locked" />
        End-to-end encrypted
      </p>
    </div>

    <!-- Password prompt -->
    <div v-else class="w-full max-w-sm">
      <div class="rounded-2xl border border-(--color-border) bg-white shadow-sm px-6 py-8 flex flex-col items-center">
        <div class="w-14 h-14 rounded-full bg-(--color-surface) flex items-center justify-center mb-5">
          <Icon class="w-7 h-7 text-(--color-text-muted)" icon="carbon:locked" />
        </div>
        <h2 class="text-lg font-semibold tracking-tight text-(--color-text-primary)">Enter password</h2>
        <p class="mt-1 text-sm text-(--color-text-secondary) text-center">This card is protected. Enter the password to view the contact information.</p>

        <!-- Error banner: shown only after a decryption attempt failed -->
        <div
          v-if="passwordFailed"
          class="mt-4 w-full rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 text-center"
        >
          Incorrect password. Please try again.
        </div>

        <input
          v-model="password"
          @keyup.enter="deriveKeyNow"
          type="password"
          placeholder="Password"
          class="mt-4 w-full rounded-lg border border-(--color-border) bg-white px-4 py-2.5 text-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-accent) transition"
        />
      </div>

      <p class="mt-4 flex items-center justify-center gap-1.5 text-xs text-(--color-text-muted)">
        <Icon class="w-3.5 h-3.5" icon="carbon:locked" />
        End-to-end encrypted
      </p>
    </div>
  </div>
</template>

<script setup>
import EncryptedImage from './EncryptedImage.client.vue'
import { Icon } from '@iconify/vue';
</script>

<script>
import { deriveKey, decrypt } from './encryption'
import { VCard } from './vcard'

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
      const card = new VCard()
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
        this.contactInfo = JSON.parse(new TextDecoder().decode(await decrypt(this.encryptedContactInfo, this.encryptionKey)))
      } catch (error) {
        console.error('failed decryption', error)
        this.contactInfo = null
        this.passwordFailed = true
      }
    },
    async deriveKey () {
      if (!this.salt || !this.password) return
      try {
        this.encryptionKey = await deriveKey(this.password, Uint8Array.from(atob(this.salt), c => c.charCodeAt(0)))
      } catch (error) {
        console.error('failed derivation', error)
        this.encryptionKey = null
      }
    },
    deriveKeyNow () {
      clearTimeout(this._debounceTimer)
      this.deriveKey()
    },
    debouncedDeriveKey () {
      clearTimeout(this._debounceTimer)
      this._debounceTimer = setTimeout(() => this.deriveKey(), 500)
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
        this.passwordFailed = false
        this.debouncedDeriveKey()
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
      password: null,
      passwordFailed: false
    }
  },
  computed: {
    ready () {
      return !!this.salt && !!this.encryptedContactInfo && this.password !== null
    }
  }
}
</script>
