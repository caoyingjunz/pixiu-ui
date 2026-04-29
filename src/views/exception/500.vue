<template>
  <ArtException :data="exceptionData" />
</template>

<script setup lang="ts">
  import { $t } from '@/locales'

  const exceptionData = {
    title: '500',
    desc: $t('exceptionPage.500'),
    btnText: $t('exceptionPage.gohome'),
    imgUrl: '/src/assets/images/svg/500.svg'
  }
</script>
