<!-- 弹性伸缩（Mock） -->
<template>
  <ElCard shadow="never">
    <template #header>
      <span class="page-hd">弹性伸缩</span>
    </template>
    <ElTable :data="rows" stripe>
      <ElTableColumn prop="ns" label="命名空间" width="120" />
      <ElTableColumn prop="name" label="名称" min-width="160" />
      <ElTableColumn prop="target" label="目标" min-width="200" />
      <ElTableColumn prop="min" label="最小副本" width="100" />
      <ElTableColumn prop="max" label="最大副本" width="100" />
      <ElTableColumn prop="current" label="当前副本" width="100" />
    </ElTable>
    <p class="hint">演示数据，HPA / 集群自动扩缩容后续可在此对接。</p>
  </ElCard>
</template>

<script setup lang="ts">
  import { computed, inject } from 'vue'
  import { clusterDetailContextKey } from './context'

  defineOptions({ name: 'ClusterDetailAutoscaling' })

  const ctxRef = inject(clusterDetailContextKey)!
  const rows = computed(() => [
    {
      ns: 'pixiu-app',
      name: `api-hpa-${ctxRef.value.seed}`,
      target: 'Deployment/api-gateway',
      min: 2,
      max: 10,
      current: 2
    },
    {
      ns: 'staging',
      name: 'web-hpa',
      target: 'Deployment/web',
      min: 1,
      max: 5,
      current: 1
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
