<script setup lang="ts">
/**
 * A friend's recent posts, from your feed (it stays live while this shows). Each opens the post.
 */
const props = withDefaults(defineProps<{ uid: string, max?: number }>(), { max: 5 })
const social = useSocial()
const { feed } = social.useFeed()
const posts = computed(() => feed.value.filter(p => p.author === props.uid).sort((a, b) => b.at - a.at).slice(0, props.max))
</script>

<template>
  <div v-if="posts.length" class="fposts">
    <PostCard v-for="p in posts" :key="p.id" :post="p" mode="mini" />
  </div>
  <p v-else class="small muted none">
    No posts from them in your feed yet.
  </p>
</template>

<style scoped>
.fposts { display: flex; flex-direction: column; gap: 8px; }
.none { padding: 2px 4px; }
</style>
