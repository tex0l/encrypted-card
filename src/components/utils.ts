export const delay = async (timeout: number = 1000): Promise<void> => { await new Promise(resolve => setTimeout(resolve, timeout)) }

export const htmlDecode = (input: string): string | null => {
  const doc = new DOMParser().parseFromString(input, 'text/html')
  return doc.documentElement.textContent
}
