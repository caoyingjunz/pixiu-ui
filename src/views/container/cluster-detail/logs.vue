<!-- 日志采集（Mock） -->
<template>
  <ElCard shadow="never" class="art-table-card">
    <template #header>
      <div class="page-hd-row">
        <span class="page-hd">日志采集</span>
        <ElSelect v-model="ns" style="width: 160px">
          <ElOption label="全部命名空间" value="*" />
          <ElOption label="pixiu-app" value="pixiu-app" />
          <ElOption label="kube-system" value="kube-system" />
        </ElSelect>
      </div>
    </template>
    <ElInput
      v-model="keyword"
      placeholder="检索 Pod / 容器日志（演示，无真实流式日志）"
      clearable
      class="mb-3"
    />
    <ElTable :data="lines" stripe size="small">
      <ElTableColumn prop="time" label="时间" width="170" />
      <ElTableColumn prop="ns" label="命名空间" width="120" />
      <ElTableColumn prop="pod" label="Pod" min-width="180" />
      <ElTableColumn prop="msg" label="摘要" min-width="260" show-overflow-tooltip />
    </ElTable>
  </ElCard>
</template>

<script setup lang="ts">
  import { computed, inject, ref } from 'vue'
  import { clusterDetailContextKey } from './context'

  defineOptions({ name: 'ClusterDetailLogs' })

  const ctxRef = inject(clusterDetailContextKey)!
  const ns = ref('*')
  const keyword = ref('')

  const lines = computed(() => {
    const id = ctxRef.value.seed
    return [
      {
        time: '2026-04-19 12:00:01',
        ns: 'pixiu-app',
        pod: `api-gateway-${id}-xxx`,
        msg: 'GET /health 200 2ms'
      },
      {
        time: '2026-04-19 12:00:03',
        ns: 'kube-system',
        pod: 'coredns-xxx',
        msg: 'health check ok'
      },
      {
        time: '2026-04-19 11:59:58',
        ns: 'default',
        pod: 'nginx-demo-xxx',
        msg: 'worker process started'
      }
    ]
  })
</script>

<style scoped>
  .page-hd {
    font-size: 15px;
    font-weight: 600;
  }

  .page-hd-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .mb-3 {
    margin-bottom: 12px;
  }
</style>
