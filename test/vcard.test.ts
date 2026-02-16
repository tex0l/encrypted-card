import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { VCard } from '../src/components/vcard.ts'

describe('VCard', () => {
  it('produces valid VCard 3.0 structure', () => {
    const output = new VCard().addName('Doe', 'John').buildVCard()
    assert.ok(output.startsWith('BEGIN:VCARD\r\n'))
    assert.ok(output.includes('VERSION:3.0\r\n'))
    assert.ok(output.includes('REV:'))
    assert.ok(output.endsWith('END:VCARD\r\n'))
  })

  it('uses CRLF line endings throughout', () => {
    const output = new VCard().addName('Doe', 'John').buildVCard()
    // Every line should end with \r\n, no bare \n
    const withoutCRLF = output.replaceAll('\r\n', '')
    assert.ok(!withoutCRLF.includes('\n'), 'Found bare \\n without \\r')
  })

  it('formats N and FN fields correctly', () => {
    const output = new VCard().addName('Doe', 'John').buildVCard()
    assert.ok(output.includes('N:Doe;John;;;\r\n'))
    assert.ok(output.includes('FN:John Doe\r\n'))
  })

  it('handles all name parts', () => {
    const output = new VCard().addName('Doe', 'John', 'M.', 'Dr.', 'Jr.').buildVCard()
    assert.ok(output.includes('N:Doe;John;M.;Dr.;Jr.\r\n'))
    assert.ok(output.includes('FN:Dr. John M. Doe Jr.\r\n'))
  })

  it('adds ORG field', () => {
    const output = new VCard().addName('Doe', 'John').addCompany('Acme Inc.').buildVCard()
    assert.ok(output.includes('ORG:Acme Inc.\r\n'))
  })

  it('adds TITLE field', () => {
    const output = new VCard().addName('Doe', 'John').addJobtitle('Engineer').buildVCard()
    assert.ok(output.includes('TITLE:Engineer\r\n'))
  })

  it('adds EMAIL field with INTERNET type', () => {
    const output = new VCard().addName('Doe', 'John').addEmail('john@example.com').buildVCard()
    assert.ok(output.includes('EMAIL;INTERNET:john@example.com\r\n'))
  })

  it('adds TEL field', () => {
    const output = new VCard().addName('Doe', 'John').addPhoneNumber('+33612345678').buildVCard()
    assert.ok(output.includes('TEL:+33612345678\r\n'))
  })

  it('adds X-SOCIALPROFILE with type and user', () => {
    const output = new VCard()
      .addName('Doe', 'John')
      .addSocial('https://twitter.com/johndoe', 'Twitter', 'johndoe')
      .buildVCard()
    assert.ok(output.includes('X-SOCIALPROFILE;type=Twitter;x-user=johndoe:https://twitter.com/johndoe\r\n'))
  })

  it('adds X-SOCIALPROFILE without optional parts', () => {
    const output = new VCard()
      .addName('Doe', 'John')
      .addSocial('https://example.com/profile')
      .buildVCard()
    assert.ok(output.includes('X-SOCIALPROFILE:https://example.com/profile\r\n'))
  })

  it('adds URL field', () => {
    const output = new VCard().addName('Doe', 'John').addURL('https://example.com').buildVCard()
    assert.ok(output.includes('URL:https://example.com\r\n'))
  })

  it('supports method chaining', () => {
    const card = new VCard()
    const result = card
      .addName('Doe', 'John')
      .addCompany('Acme')
      .addJobtitle('Dev')
      .addEmail('j@example.com')
      .addPhoneNumber('+1234')
      .addSocial('https://twitter.com/j', 'Twitter', 'j')
      .addURL('https://example.com')
    assert.equal(result, card, 'All methods should return the same instance')
  })

  it('escapes special characters in values', () => {
    const output = new VCard().addName('O\\Brien', 'John;Jr', 'the,third').buildVCard()
    assert.ok(output.includes('N:O\\\\Brien;John\\;Jr;the\\,third;;\r\n'))
  })

  it('escapes newlines in values', () => {
    const output = new VCard().addName('Doe', 'John').addCompany('Line1\nLine2').buildVCard()
    assert.ok(output.includes('ORG:Line1\\nLine2\r\n'))
  })

  it('folds lines longer than 75 characters', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(80)
    const output = new VCard().addName('Doe', 'John').addURL(longUrl).buildVCard()
    // The URL line should be folded (continuation lines start with a space after CRLF)
    assert.ok(output.includes('\r\n '), 'Long lines should be folded with CRLF + space')
  })

  it('matches the EncryptedBusinessCard usage pattern', () => {
    const output = new VCard()
      .addName('Doe', 'John')
      .addCompany('Acme Corp')
      .addJobtitle('Software Engineer')
      .addEmail('john.doe@acme.com')
      .addPhoneNumber('+33612345678')
      .addSocial('https://twitter.com/johndoe', 'Twitter', 'johndoe')
      .addSocial('https://linkedin.com/in/johndoe', 'LinkedIn', 'johndoe')
      .addURL('https://johndoe.dev')
      .addURL('https://acme.com')
      .buildVCard()

    // Unfold (RFC 6350 §3.2): continuation lines are CRLF + single space
    const unfolded = output.replaceAll('\r\n ', '')

    assert.ok(unfolded.includes('BEGIN:VCARD'))
    assert.ok(unfolded.includes('N:Doe;John;;;'))
    assert.ok(unfolded.includes('FN:John Doe'))
    assert.ok(unfolded.includes('ORG:Acme Corp'))
    assert.ok(unfolded.includes('TITLE:Software Engineer'))
    assert.ok(unfolded.includes('EMAIL;INTERNET:john.doe@acme.com'))
    assert.ok(unfolded.includes('TEL:+33612345678'))
    assert.ok(unfolded.includes('X-SOCIALPROFILE;type=Twitter;x-user=johndoe:https://twitter.com/johndoe'))
    assert.ok(unfolded.includes('X-SOCIALPROFILE;type=LinkedIn;x-user=johndoe:https://linkedin.com/in/johndoe'))
    assert.ok(unfolded.includes('URL:https://johndoe.dev'))
    assert.ok(unfolded.includes('URL:https://acme.com'))
    assert.ok(unfolded.includes('END:VCARD'))
  })
})
