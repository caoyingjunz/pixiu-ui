<!-- 认证授权（Mock） -->
<template>
  <ElCard shadow="never">
    <template #header>
      <span class="page-hd">认证授权</span>
    </template>
    <ElDescriptions :column="1" border>
      <ElDescriptionsItem label="RBAC">已启用</ElDescriptionsItem>
      <ElDescriptionsItem label="ServiceAccount 数量">12（演示）</ElDescriptionsItem>
      <ElDescriptionsItem label="ClusterRole 绑定">3 条（演示）</ElDescriptionsItem>
      <ElDescriptionsItem label="说明">对接 OIDC / Webhook 等能力可在此扩展。</ElDescriptionsItem>
    </ElDescriptions>
  </ElCard>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ClusterDetailAuth' })
</script>

<style scoped>
  .page-hd {
    font-size: 15px;
    font-weight: 600;
  }
</style>
