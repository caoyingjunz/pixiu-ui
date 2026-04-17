<template>
  <ArtSearchBar
    ref="searchBarRef"
    v-model="formData"
    :items="formItems"
    @reset="handleReset"
    @search="handleSearch"
  />
</template>

<script setup lang="ts">
  interface Props {
    modelValue: {
      clusterName?: string
      status?: string
    }
  }
  interface Emits {
    (e: 'update:modelValue', value: Props['modelValue']): void
    (e: 'search', params: Props['modelValue']): void
    (e: 'reset'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const searchBarRef = ref()

  const formData = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  const formItems = computed(() => [
    {
      label: '集群名称',
      key: 'clusterName',
      type: 'input',
      placeholder: '请输入集群名称',
      clearable: true
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: {
        placeholder: '请选择状态',
        options: [
          { label: '运行中', value: '0' },
          { label: '部署中', value: '1' },
          { label: '等待部署', value: '2' },
          { label: '部署失败', value: '3' },
          { label: '集群失联', value: '4' }
        ]
      }
    }
  ])

  function handleReset() {
    emit('reset')
  }

  function handleSearch(params: Props['modelValue']) {
    emit('search', params)
  }
</script>
