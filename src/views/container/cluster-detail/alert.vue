<!-- 配置告警（Mock） -->
<template>
  <ElCard shadow="never">
    <template #header>
      <span class="page-hd">配置告警</span>
    </template>
    <ElForm label-width="120px" class="form-block">
      <ElFormItem label="告警渠道">
        <ElCheckboxGroup v-model="channels">
          <ElCheckbox value="email">邮件</ElCheckbox>
          <ElCheckbox value="wecom">企业微信</ElCheckbox>
          <ElCheckbox value="hook">Webhook</ElCheckbox>
        </ElCheckboxGroup>
      </ElFormItem>
      <ElFormItem label="说明">
        <ElInput type="textarea" :rows="3" placeholder="告警规则与通知渠道（演示，待对接后端）" />
      </ElFormItem>
    </ElForm>
    <ElDivider />
    <ElTable :data="rules" stripe>
      <ElTableColumn prop="name" label="规则名称" min-width="160" />
      <ElTableColumn prop="expr" label="条件（演示）" min-width="220" show-overflow-tooltip />
      <ElTableColumn prop="level" label="级别" width="90" />
    </ElTable>
  </ElCard>
</template>

<script setup lang="ts">
  import { ref } from 'vue'

  defineOptions({ name: 'ClusterDetailAlert' })

  const channels = ref<string[]>(['email'])

  const rules = [
    { name: '节点 NotReady', expr: 'node_status != Ready', level: 'P1' },
    { name: 'Pod 重启频繁', expr: 'pod_restarts > 10 in 5m', level: 'P2' }
  ]
</script>

<style scoped>
  .page-hd {
    font-size: 15px;
    font-weight: 600;
  }

  .form-block {
    max-width: 640px;
  }
</style>
