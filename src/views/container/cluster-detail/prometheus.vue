<!-- Prometheus（Mock） -->
<template>
  <ElCard shadow="never">
    <template #header>
      <span class="page-hd">Prometheus 监控</span>
    </template>
    <ElDescriptions :column="1" border class="mb-4">
      <ElDescriptionsItem label="采集端点">http://prometheus.pixiu-monitoring.svc:9090（演示）</ElDescriptionsItem>
      <ElDescriptionsItem label="抓取间隔">30s</ElDescriptionsItem>
    </ElDescriptions>
    <ArtLineChart
      height="240px"
      :data="series"
      :x-axis-data="labels"
      :show-area-color="true"
    />
    <p class="hint">集群组件与节点指标时序曲线（演示随机数据）。</p>
  </ElCard>
</template>

<script setup lang="ts">
  import { computed, inject } from 'vue'
  import ArtLineChart from '@/components/core/charts/art-line-chart/index.vue'
  import { clusterDetailContextKey } from './context'

  defineOptions({ name: 'ClusterDetailPrometheus' })

  const ctxRef = inject(clusterDetailContextKey)!
  const labels = computed(() =>
    Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
  )
  const series = computed(() =>
    Array.from({ length: 24 }, (_, i) => 40 + (ctxRef.value.seed % 5) + Math.sin(i / 3) * 15)
  )
</script>

<style scoped>
  .page-hd {
    font-size: 15px;
    font-weight: 600;
  }

  .mb-4 {
    margin-bottom: 16px;
  }

  .hint {
    margin: 12px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
</style>
