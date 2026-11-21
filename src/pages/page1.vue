<template>
  <h1>Page test crypto</h1>
  <button @click="testCrypt">Test  SH ECDH</button>
  <button @click="callOp">Call srv test</button>

  <div>{{  status }}</div>
</template>

<script setup lang="ts" vapor>
import { ref } from 'vue'
import { post } from '../scripts/util'
import { testSH, testECDH } from '../scripts/crypt'

const status = ref('ready')

const testCrypt = async () => {
  try {
    status.value = 'starting'
    testSH()
    status.value = 'SH - OK'
    testECDH()
    status.value = 'ECDH - OK'
  } catch (e: any) {
    status.value = e.toString()
  }
}

const callOp = async () => {
  status.value = 'remote call test ... '
  const res = await post({ opName: 'test' })
  status.value += res.status
}

</script>

<style scoped>
</style>
