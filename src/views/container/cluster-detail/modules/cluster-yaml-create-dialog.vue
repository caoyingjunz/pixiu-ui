<template>
  <ElDialog
    v-model="visibleInner"
    title="YAML创建资源"
    width="720px"
    destroy-on-close
    class="cluster-yaml-create-dialog"
    @closed="onClosed"
  >
    <ElInput
      v-model="yamlText"
      type="textarea"
      :rows="20"
      placeholder="粘贴 Kubernetes 资源 YAML（需包含 apiVersion、kind、metadata.name）"
      class="cluster-yaml-create-textarea"
    />
    <template #footer>
      <ElButton @click="visibleInner = false">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="onConfirm">确定</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElButton, ElDialog, ElInput, ElMessage } from 'element-plus'
  import { computed, ref, watch } from 'vue'
  import { createK8sResourceFromYaml } from '@/api/kubernetes/yamlCreate'

  const props = defineProps<{
    visible: boolean
    /** 集群内部名称，与 route.query.cluster 一致 */
    cluster: string
  }>()

  const emit = defineEmits<{
    (e: 'update:visible', v: boolean): void
    (e: 'success'): void
  }>()

  const visibleInner = computed({
    get: () => props.visible,
    set: (v) => emit('update:visible', v)
  })

  const yamlText = ref('')
  const submitting = ref(false)

  watch(
    () => props.visible,
    (v) => {
      if (v) yamlText.value = ''
    }
  )

  function onClosed() {
    yamlText.value = ''
  }

  async function onConfirm() {
    const cluster = props.cluster?.trim()
    if (!cluster) {
      ElMessage.warning('未选择集群')
      return
    }
    submitting.value = true
    try {
      await createK8sResourceFromYaml(cluster, yamlText.value)
      ElMessage.success('创建成功')
      visibleInner.value = false
      emit('success')
    } catch (e: unknown) {
      ElMessage.error(e instanceof Error ? e.message : '创建失败')
    } finally {
      submitting.value = false
    }
  }
</script>

<style scoped>
  .cluster-yaml-create-textarea :deep(textarea) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
  }
</style>
