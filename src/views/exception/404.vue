<template>
  <ArtException :data="exceptionData" />
</template>

<script setup lang="ts">
  import { $t } from '@/locales'

  const exceptionData = {
    title: '404',
    desc: $t('exceptionPage.404'),
    btnText: $t('exceptionPage.gohome'),
    imgUrl: '/src/assets/images/svg/404.svg'
  }
</script>
