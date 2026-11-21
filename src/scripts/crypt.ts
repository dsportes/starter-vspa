
import { sha256 } from 'js-sha256'
import { keyToB64, keyFromB64, concat } from '../starter/util'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export type KeyPair = {
  pub: Uint8Array,
  priv: Uint8Array
}

// @ts-expect-error
const p2 = [1, 0, 0, 0, 0, 0]; for (let i = 1; i < 6; i++) p2[i] = p2[i - 1] * 256

const SALTS = new Array(256)
{
  const s = new Uint8Array([5, 255, 10, 250, 15, 245, 20, 240, 25, 235, 30, 230, 35, 225, 40, 220])
  SALTS[0] = s
  for (let i = 1; i < 256; i++) {
    const x = new Uint8Array(16)
    // @ts-expect-error
    for (let j = 0; j < 16; j++) x[j] = (s[j] + i) % 256
    SALTS[i] = x
  }
}

const byteToHex : any[] = [];

for (let n = 0; n <= 0xff; ++n) {
    const hexOctet = n.toString(16).padStart(2, "0")
    byteToHex.push(hexOctet)
}

export function arrayBuffertohex (arrayBuffer: ArrayBuffer) : string {
    const buff = new Uint8Array(arrayBuffer)
    const hexOctets = [] // new Array(buff.length) is even faster (preallocates necessary array size), then use hexOctets[i] instead of .push()
    // @ts-expect-error
    for (let i = 0; i < buff.length; ++i) hexOctets.push(byteToHex[buff[i]])
    return hexOctets.join("")
}

export function hexToArrayBuffer (hex: string) : ArrayBuffer {
    const uint8array = new Uint8Array(Math.ceil(hex.length / 2))
    for (let i = 0; i < hex.length;)
        uint8array[i / 2] = Number.parseInt(hex.slice(i, i += 2), 16)
    return uint8array.buffer
}

export function u8ToHex (u8: Uint8Array) : string{
  // @ts-expect-error
  return arrayBuffertohex(u8.buffer)
}

/*
Export the given key and write it into the "exported-key" space.
*/
export function toPem(key: Uint8Array, pub?: boolean) : string {
  const exportedAsBase64 = keyToB64(key)
  return !pub ? `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`
  : `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`
}

export function fromPem(pem: string) : Uint8Array {
  const pub = pem.startsWith('-----BEGIN PUBLIC KEY-----')
  const pemHeader = pub ? '-----BEGIN PUBLIC KEY-----' : '-----BEGIN PRIVATE KEY-----'
  const pemFooter = pub ? '-----END PUBLIC KEY-----' : '-----END PRIVATE KEY-----'
  const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length - 1)
  return keyFromB64(pemContents)
}

export class Crypt {
  static algs: any = {
    ecdh: { name: 'ECDH', namedCurve: 'P-521' },
    ecdsa: { name: 'ECDSA', namedCurve: 'P-521' },
    ecdsasv: { name: 'ECDSA', hash: 'SHA-256' },
    rsa: { name: 'RSASSA-PKCS1-v1_5', // 'RSA-OAEP' PAS pour sign / verify
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: {name: "SHA-256"} },
    rsasv: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'},
  }

  static async crypt (cle: Uint8Array | null | undefined, buf: Uint8Array | null | undefined)
  : Promise<Uint8Array | null> {
    try {
      if (!buf || !cle) return null
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const key = await crypto.subtle.importKey('raw', cle as BufferSource, 'AES-GCM', false, ['encrypt'])
      const enc = new Uint8Array(await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, tagLength: 128 }, key, buf as BufferSource))
      const x = concat([iv, enc])
      // const authTag = buf.subarray(buf.byteLength - 16)
      // console.log('crypt authTag ', u8ToHex(authTag))
      return x
    } catch (e) {
      return null
    }
  }

  static async decrypt (cle: Uint8Array | null | undefined, buf: Uint8Array | null | undefined)
  : Promise<Uint8Array | null> {
    try {
      if (!buf || !cle) return null
      const key = await crypto.subtle.importKey('raw', cle as BufferSource, 'AES-GCM', false, ['decrypt'])
      const iv = buf.subarray(0, 12) as BufferSource
      const enc = buf.subarray(12) as BufferSource
      // const authTag = buf.subarray(buf.byteLength - 16)
      // console.log('decrypt authTag ', u8ToHex(authTag))
      return new Uint8Array(await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, tagLength: 128 }, key, enc))
    } catch (e) {
      return null
    }
  }

  static async getKeyPair () : Promise<KeyPair> {
    const p = await crypto.subtle.generateKey(Crypt.algs.ecdh, true, ['deriveKey'])
    const spki = await crypto.subtle.exportKey('spki', p.publicKey)
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', p.privateKey)
    return { pub: new Uint8Array(spki), priv: new Uint8Array(pkcs8) }
  }

  static async getSVKeyPair () : Promise<KeyPair> {
    const p = await crypto.subtle.generateKey(Crypt.algs.ecdsa, true, ['sign', 'verify'])
    const spki = await crypto.subtle.exportKey('spki', p.publicKey)
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', p.privateKey)
    return { pub: new Uint8Array(spki), priv: new Uint8Array(pkcs8) }
  }

  static async sign (privKey: Uint8Array, data: Uint8Array) : Promise<Uint8Array> {
    const priv = await crypto.subtle.importKey('pkcs8', privKey as BufferSource, Crypt.algs.ecdsa, false, ['sign'])
    const sign = await crypto.subtle.sign(Crypt.algs.ecdsasv, priv, data as BufferSource)
    return new Uint8Array(sign)
  }

  static async verify (pubKey: Uint8Array, signature: Uint8Array, data: Uint8Array) : Promise<boolean> {
    const pub = await crypto.subtle.importKey('spki', pubKey as BufferSource, Crypt.algs.ecdsa, true, ['verify'])
    return await crypto.subtle.verify(Crypt.algs.ecdsasv, pub, signature as BufferSource, data as BufferSource)
  }

  static async getAESKey (pubKey: Uint8Array, myPrivKey: Uint8Array): Promise<Uint8Array> {
    const pub = await crypto.subtle.importKey('spki', pubKey as BufferSource, Crypt.algs.ecdh, true, [])
    const priv = await crypto.subtle.importKey('pkcs8', myPrivKey as BufferSource, Crypt.algs.ecdh, true, ['deriveKey'])
    const k = await crypto.subtle.deriveKey(
      { name: 'ECDH', public: pub }, priv, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    )
    return new Uint8Array(await crypto.subtle.exportKey('raw', k))
  }

  static async strongHash (s: string | Uint8Array, pad?: boolean, bin?: boolean)
  : Promise<string | Uint8Array> {
    let x: Uint8Array = typeof s === 'string' ? encoder.encode(s) : s as Uint8Array
    const l = 32 - x.length
    let ex: Uint8Array
    if (!pad || l <= 0) ex = x
    else {
      const p = new Uint8Array(l)
      p.fill(35, 0, l) // 35 : ASCII de #
      ex = concat([x, p])
    }
    const h1 = new Uint8Array(sha256.arrayBuffer(ex))
    // const h1 = new Uint8Array(await crypto.subtle.digest("SHA-256", ex as BufferSource))
    const salt = h1.subarray(0, 16) // SALTS[0] // h1.subarray(0, 16)
    // console.log(arrayBuffertohex(salt.buffer))
    const p = await crypto.subtle.importKey('raw', ex as BufferSource, 'PBKDF2', false, ['deriveKey'])
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt : salt, iterations: 20000, hash: 'SHA-256' },
      p,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
    const res = new Uint8Array(await crypto.subtle.exportKey('raw', key))
    return bin ? res : keyToB64(res)
  }

  /*
  static async sha (x: any) { // 9 fois plus long que js-sha256
    const u8 = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(x)))
    const s = fromByteArray(u8)
    return s.substring(0, s.length - 1).replace(/\+/g, '-').replace(/\//g, '_')
  }
  */

  /* sha256: en binaire ou base 64 standard
  // arg string : It also supports byte `Array`, `Uint8Array`, `ArrayBuffer` input
  */
  static sha (x: any, bin? :boolean) : Uint8Array | string{
    const u8 = new Uint8Array(sha256.arrayBuffer(x))
    return bin ? u8 : keyToB64(u8)
  }

  /* SHA raccourci en base 64 URL */
  static shaS (x: any) {
    const u8 = new Uint8Array(sha256.arrayBuffer(x))
    // return toUrl(keyToB64(u8.subarray(3, 18)))
    const s = keyToB64(u8.subarray(3, 18))
    return s.replace(/\+/g, '-').replace(/\//g, '_')
  }

  /*
  static shaInt (x: any) {
    const u8 = new Uint8Array(sha256.arrayBuffer(x))
    let r = 0
    for (let i = 3, j = 0; j < 6; i++, j++) r += (p2[j] * u8[i])
    return r
  }
  */

  static random (nbytes: number) : Uint8Array {
    const u8: Uint8Array = new Uint8Array(nbytes)
    // @ts-expect-error
    window.crypto.getRandomValues(u8)
    return u8
  }

  /* Si nbytes est multiple de 3, le string résultat fait (4 * (nbytes / 3) */
  static rnd (nbytes: number) : string {
    const s = keyToB64(Crypt.random(nbytes))
    const s1 = (nbytes % 3) === 0 ? s : s.replace(/=/g, '2')
    return s1.replace(/\+/g, '0').replace(/\//g, '1')
  }

  /* 
    DER : format WebCrypto
    RAW : format ASN-1 OpenSSL
    rawToDer et derToRaw : de Google IA
  */

  /**
   * Convertit une signature ECDSA brute (IEEE P1363 : r || s) en format ASN.1 DER.
   * @param {Uint8Array} rawSig - La signature brute (ex: 64 octets pour P-256)
   * @returns {Uint8Array} La signature encodée en DER
   */
    static rawToDer(rawSig: any) {
    const half = rawSig.length / 2;
    const r = rawSig.subarray(0, half);
    const s = rawSig.subarray(half);

    const encodeInteger = (bytes: any) => {
      let i = 0;
      while (i < bytes.length - 1 && bytes[i] === 0) i++;
      let clean = bytes.subarray(i);

      // Ajout du zéro de padding si le bit de poids fort est >= 0x80
      if (clean[0] >= 0x80) {
        const padded = new Uint8Array(clean.length + 1);
        padded[0] = 0x00;
        padded.set(clean, 1);
        clean = padded;
      }

      const res = new Uint8Array(2 + clean.length);
      res[0] = 0x02; // Tag INTEGER
      res[1] = clean.length;
      res.set(clean, 2);
      return res;
    };

    const rDer = encodeInteger(r);
    const sDer = encodeInteger(s);
    const totalLen = rDer.length + sDer.length;

    const header = totalLen >= 128 ? [0x30, 0x81, totalLen] : [0x30, totalLen];
    const der = new Uint8Array(header.length + totalLen);
    
    der.set(header, 0);
    der.set(rDer, header.length);
    der.set(sDer, header.length + rDer.length);

    return der;
  }

  // 66 pour P-521 !!!
  // Code Google IA
  static derToRaw(derSig: any, keySizeBytes = 66) {
    let offset = 0;

    if (derSig[offset++] !== 0x30) {
      throw new Error("Format DER invalide : tag SEQUENCE (0x30) attendu.");
    }

    offset += derSig[offset] === 0x81 ? 2 : 1;

    const readInteger = () => {
      if (derSig[offset++] !== 0x02) {
        throw new Error("Format DER invalide : tag INTEGER (0x02) attendu.");
      }
      const len = derSig[offset++];
      let val = derSig.subarray(offset, offset + len);
      offset += len;

      // Retrait du padding 0x00 éventuel
      if (val.length === keySizeBytes + 1 && val[0] === 0x00) {
        val = val.subarray(1);
      }

      const fixed = new Uint8Array(keySizeBytes);
      fixed.set(val, keySizeBytes - val.length);
      return fixed;
    };

    const r = readInteger();
    const s = readInteger();

    const raw = new Uint8Array(keySizeBytes * 2);
    raw.set(r, 0);
    raw.set(s, keySizeBytes);

    return raw;
  }
}

export async function testSH () {
  const x = 'toto est tres tres beau'
  console.log(Crypt.sha(x))
  console.log(Crypt.shaS(x))
  // console.log(Crypt.shaInt(x))

  console.log(await Crypt.strongHash(x))
  console.log(await Crypt.strongHash(encoder.encode(x)))
  console.log(await Crypt.strongHash(x, true))
  console.log(await Crypt.strongHash(encoder.encode(x), true))
  console.log(Crypt.sha(x))
  console.log(Crypt.sha(encoder.encode(x)))
  console.log(Crypt.shaS(x))
  // console.log(Crypt.shaInt(x))

  /*
  const t = Date.now()
  for (let i= 0; i< 100000; i++) await Crypt.sha(x)
  const n = Date.now() - t
  console.log('sha : ', n)
  */
}

export async function testECDH () {
  const x = new TextEncoder().encode('toto est tres tres beau')
  const xx = new TextEncoder().encode('toto est tres tres beaux')

  // Dans app
  const appPair = await Crypt.getKeyPair()
  const appPub = toPem(appPair.pub, true)
  const appPriv = toPem(appPair.priv)
  console.log('ECDH: APP crypt/decrypt')
  console.log(appPub)
  console.log(appPriv)

  const appSVPair = await Crypt.getSVKeyPair()
  const appSVPub = toPem(appSVPair.pub, true)
  const appSVPriv = toPem(appSVPair.priv)
  console.log('RSA: SRV sign/verify')
  console.log(appSVPub)
  console.log(appSVPriv)
  const sign = await Crypt.sign(appSVPair.priv, x)

  const der = Crypt.rawToDer(sign)
  const raw = Crypt.derToRaw(der, 66)
  const h1 = u8ToHex(sign)
  const h2 = u8ToHex(der)
  console.log('---- EC / ASN1 -------')
  console.log(h1)
  console.log(h2)
  console.log('----------------------')
  const h3 = u8ToHex(raw)
  if (h1 === h3)
    console.log('trop cool !!!')
  else console.log('TOO BAD !!!')

  // Dans srv
  const verif1 = await Crypt.verify(fromPem(appSVPub), sign, x)
  console.log('verif1 = ', verif1)
  const verif2 = await Crypt.verify(fromPem(appSVPub), sign, xx)
  console.log('verif2 = ', verif2)

  const srvPair = await Crypt.getKeyPair()
  const srvPub = toPem(srvPair.pub, true)
  const srvPriv = toPem(srvPair.priv)
  console.log('ECDH: SRV crypt/decrypt')
  console.log(srvPub)
  console.log(srvPriv)

  const aesSrv = await Crypt.getAESKey(fromPem(appPub), srvPair.priv)
  console.log('aesSrv: ', keyToB64(aesSrv))
  const x1 = await Crypt.crypt(aesSrv, x)

  // Dans app
  const aesApp = await Crypt.getAESKey(fromPem(srvPub), appPair.priv)
  console.log('aesApp: ', keyToB64(aesApp))
  const x3 = await Crypt.decrypt(aesApp, x1)
  const x2 = decoder.decode(x3 || undefined)
  console.log(x2)
}
