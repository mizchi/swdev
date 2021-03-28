<script lang="ts">
  import { onMount } from "svelte";
  let x: number = 1;
  onMount(() => {
    x += 2;
  });
</script>

<div>
  Hello Svelte 1 - {x} - {Math.random()}
</div>
