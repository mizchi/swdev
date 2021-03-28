<script lang="ts">
  import { onMount } from "https://cdn.skypack.dev/svelte";
  let x: number = 1;
  onMount(() => {
    x += 2;
  });
</script>

<div>
  Edit me
  {x}
</div>
