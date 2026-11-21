import { encode, decode } from '@msgpack/msgpack'
import { appConfig } from '../config'

export async function post (args: any) : Promise<any> {
  try {
    const url = appConfig.srvUrl + 'op/'
    const body = new Uint8Array(encode(args))
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',  // sent request
        'Accept':       'application/octet-stream'   // expected data sent back
      },
      body
    })
    if (response.status === 200) {
      const buf = await response.bytes()
      return decode(buf) as any
    } else return { status: 'HTTP: ' + response.status}
  } catch (e: any) {
    return { status: e.toString()}
  }

}