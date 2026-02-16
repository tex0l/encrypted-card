/**
 * Minimal VCard 3.0 builder — replaces the CJS-only `vcard-creator` package.
 * Only implements the methods actually used by EncryptedBusinessCard.
 */

function escape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function fold(line: string): string {
  if (line.length <= 75) return line
  return (line.match(/.{1,73}/g) ?? []).join('\r\n ').trim()
}

export class VCard {
  private lines: string[] = []

  addName(lastName = '', firstName = '', additional = '', prefix = '', suffix = ''): this {
    this.lines.push(`N:${[lastName, firstName, additional, prefix, suffix].map(escape).join(';')}`)
    const fullName = [prefix, firstName, additional, lastName, suffix].filter(Boolean).join(' ').trim()
    if (fullName) this.lines.push(`FN:${escape(fullName)}`)
    return this
  }

  addCompany(company: string): this {
    this.lines.push(`ORG:${escape(company)}`)
    return this
  }

  addJobtitle(title: string): this {
    this.lines.push(`TITLE:${escape(title)}`)
    return this
  }

  addEmail(email: string): this {
    this.lines.push(`EMAIL;INTERNET:${escape(email)}`)
    return this
  }

  addPhoneNumber(phone: string): this {
    this.lines.push(`TEL:${escape(phone)}`)
    return this
  }

  addSocial(url: string, type = '', user = ''): this {
    const typePart = type ? `;type=${type}` : ''
    const userPart = user ? `;x-user=${user}` : ''
    this.lines.push(`X-SOCIALPROFILE${typePart}${userPart}:${escape(url)}`)
    return this
  }

  addURL(url: string): this {
    this.lines.push(`URL:${escape(url)}`)
    return this
  }

  buildVCard(): string {
    const rev = new Date().toISOString()
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `REV:${rev}`,
      ...this.lines,
      'END:VCARD',
    ]
    return lines.map(l => fold(l) + '\r\n').join('')
  }
}
