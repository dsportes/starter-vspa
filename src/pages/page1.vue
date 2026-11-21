<template>
  <h1>Page test crypto</h1>
  <button @click="test">Test</button>
  <div>{{  status }}</div>
</template>

<script setup lang="ts" vapor>
import { ref } from 'vue'
import { testSH, testECDH } from '../scripts/crypt'

const status = ref('ready')
const test = async () => {
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

</script>

<style scoped>
</style>
