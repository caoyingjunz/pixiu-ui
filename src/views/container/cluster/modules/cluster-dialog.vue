<template>
  <ElDialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? '新增集群' : '编辑集群'"
    width="500px"
    align-center
  >
    <ElForm ref="formRef" :model="formData" :rules="rules" label-width="90px">
      <ElFormItem label="集群名称" prop="clusterName">
        <ElInput v-model="formData.clusterName" placeholder="请输入集群名称" />
      </ElFormItem>
      <ElFormItem label="集群描述" prop="description">
        <ElInput
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入集群描述"
        />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton type="primary" @click="handleSubmit">提交</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'

  interface ClusterFormData {
    clusterName: string
    description: string
  }

  interface Props {
    visible: boolean
    type: 'add' | 'edit'
    clusterData?: Partial<ClusterFormData & { id: number }>
  }
  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'submit'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const dialogVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
  })
  const dialogType = computed(() => props.type)

  const formRef = ref<FormInstance>()
  const formData = reactive<ClusterFormData>({
    clusterName: '',
    description: ''
  })

  const rules: FormRules = {
    clusterName: [
      { required: true, message: '请输入集群名称', trigger: 'blur' },
      { min: 2, max: 64, message: '长度在 2 到 64 个字符', trigger: 'blur' }
    ]
  }

  watch(
    () => [props.visible, props.type, props.clusterData],
    ([visible]) => {
      if (visible) {
        const row = props.clusterData
        const isEdit = props.type === 'edit' && row
        Object.assign(formData, {
          clusterName: isEdit ? row?.clusterName || '' : '',
          description: isEdit ? row?.description || '' : ''
        })
        nextTick(() => formRef.value?.clearValidate())
      }
    },
    { immediate: true }
  )

  async function handleSubmit() {
    if (!formRef.value) return
    await formRef.value.validate((valid) => {
      if (valid) {
        ElMessage.success(dialogType.value === 'add' ? '新增成功' : '更新成功')
        dialogVisible.value = false
        emit('submit')
      }
    })
  }
</script>
