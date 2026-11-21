/* Retourne un string en base 64 depuis un binaire */
export function keyToB64 (key: Uint8Array | null | undefined) : string {
  if (!key) return ''
  // @ts-expect-error
  return window.btoa(String.fromCharCode.apply(null, key))
}

/* Retourne un binaire depuis un string en base 64 */
export function keyFromB64 (key: string) : Uint8Array {
  if (!key) new Uint8Array([])
  const s = window.atob(key)
  const u8 = new Uint8Array(s.length)
  for (let i = 0, strLen = key.length; i < strLen; i++) u8[i] = s.charCodeAt(i)
  return u8
}

/* Retourne la concaténation des buffer */
export function concat (views: ArrayBufferView[]) {
  let length = 0
  for (const v of views) length += v.byteLength
  const buf = new Uint8Array(length)
  let offset = 0
  for (const v of views) {
      const uint8view = new Uint8Array(v.buffer, v.byteOffset, v.byteLength)
      buf.set(uint8view, offset)
      offset += uint8view.byteLength
  }
  return buf
}
