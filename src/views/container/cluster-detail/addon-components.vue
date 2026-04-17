<!-- 组件管理（Mock） -->
<template>
  <ElCard shadow="never">
    <template #header>
      <span class="page-hd">组件管理</span>
    </template>
    <ElTable :data="rows" stripe>
      <ElTableColumn prop="name" label="组件" min-width="160" />
      <ElTableColumn prop="version" label="版本" width="120" />
      <ElTableColumn prop="status" label="状态" width="100">
        <template #default="{ row }">
          <ElTag :type="row.status === 'Running' ? 'success' : 'warning'" size="small">{{ row.status }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="note" label="说明" min-width="200" show-overflow-tooltip />
    </ElTable>
  </ElCard>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  defineOptions({ name: 'ClusterDetailAddonComponents' })

  const rows = computed(() => [
    { name: 'CoreDNS', version: 'v1.11.1', status: 'Running', note: '集群 DNS' },
    { name: 'kube-proxy', version: 'v1.28.x', status: 'Running', note: '节点网络代理' },
    { name: 'metrics-server', version: 'v0.7.x', status: 'Running', note: '资源度量' },
    { name: 'ingress-nginx', version: 'v1.9.x', status: 'Running', note: 'Ingress 控制器（演示）' }
  ])
</script>

<style scoped>
  .page-hd {
    font-size: 15px;
    font-weight: 600;
  }
</style>
