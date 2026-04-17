<!-- 策略管理（Mock） -->
<template>
  <ElCard shadow="never">
    <template #header>
      <span class="page-hd">策略管理</span>
    </template>
    <ElTable :data="rows" stripe>
      <ElTableColumn prop="kind" label="类型" width="140" />
      <ElTableColumn prop="name" label="名称" min-width="180" />
      <ElTableColumn prop="scope" label="作用范围" min-width="160" />
      <ElTableColumn prop="age" label="时长" width="90" />
    </ElTable>
    <p class="hint">NetworkPolicy、PodSecurity、ResourceQuota 等策略的集中展示（演示）。</p>
  </ElCard>
</template>

<script setup lang="ts">
  import { computed, inject } from 'vue'
  import { clusterDetailContextKey } from './context'

  defineOptions({ name: 'ClusterDetailPolicy' })

  const ctxRef = inject(clusterDetailContextKey)!
  const rows = computed(() => [
    {
      kind: 'NetworkPolicy',
      name: `deny-all-${ctxRef.value.seed}`,
      scope: 'namespace/pixiu-app',
      age: '5d'
    },
    {
      kind: 'ResourceQuota',
      name: 'default-quota',
      scope: 'namespace/default',
      age: '30d'
    }
  ])
</script>

<style scoped>
  .page-hd {
    font-size: 15px;
    font-weight: 600;
  }

  .hint {
    margin: 12px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
</style>
