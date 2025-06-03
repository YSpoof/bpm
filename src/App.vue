<script setup lang="ts">
  import { shallowRef, ref, computed } from "vue";

  const tapTimes = ref<number[]>([]);
  const bpm = shallowRef<number>(0);
  let resetTimeout: number | null = null;

  const registerTap = () => {
    const currentTime = Date.now();

    // Clear any existing timeout
    if (resetTimeout) {
      clearTimeout(resetTimeout);
    }

    // Add current tap time to the array
    tapTimes.value.push(currentTime);

    // Calculate BPM if we have at least 2 taps
    if (tapTimes.value.length >= 2) {
      calculateBPM();
    }

    // Set timeout to reset taps after 3 seconds of inactivity
    resetTimeout = setTimeout(() => {
      tapTimes.value = [];
    }, 3000);

    console.log(
      "Button tapped! Total taps:",
      tapTimes.value.length,
      "BPM:",
      bpm.value
    );
  };

  const calculateBPM = () => {
    if (tapTimes.value.length < 2) {
      bpm.value = 0;
      return;
    }

    // Calculate intervals between consecutive taps
    const intervals: number[] = [];
    for (let i = 1; i < tapTimes.value.length; i++) {
      intervals.push(tapTimes.value[i] - tapTimes.value[i - 1]);
    }

    // Calculate average interval in milliseconds
    const averageInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    // Convert to BPM (beats per minute)
    // 60,000 ms = 1 minute
    bpm.value = Math.round(60000 / averageInterval);
  };

  const reset = () => {
    // Clear any existing timeout
    if (resetTimeout) {
      clearTimeout(resetTimeout);
      resetTimeout = null;
    }

    tapTimes.value = [];
    bpm.value = 0;
    console.log("BPM counter reset");
  };

  const tapCount = computed(() => tapTimes.value.length);

  const tapDisplay = computed(() => {
    const totalTaps = tapTimes.value.length;
    const groups = Math.floor(totalTaps / 4);
    const remainder = totalTaps % 4;

    let display = "";

    // Add complete groups of 4 asterisks with spaces
    for (let i = 0; i < groups; i++) {
      display += "****";
      if (i < groups - 1 || remainder > 0) {
        display += " ";
      }
    }

    // Add remaining asterisks
    display += "*".repeat(remainder);

    return display;
  });
</script>

<template>
  <div
    style="text-align: center; padding: 2rem; font-family: Arial, sans-serif">
    <h1>BPM Counter</h1>
    <div style="margin: 2rem 0">
      <p style="font-size: 3rem; font-weight: bold; margin: 1rem 0">
        {{ bpm }} BPM
      </p>
      <p style="font-size: 1.2rem; color: #666">Taps: {{ tapCount }}</p>
      <div
        style="
          font-size: 2rem;
          margin: 1rem 0;
          height: 5em;
          letter-spacing: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow-x: auto;
          overflow-y: hidden;
        ">
        {{ tapDisplay }}
      </div>
    </div>

    <div style="margin: 2rem 0">
      <button
        @click="registerTap"
        @keydown.esc="reset"
        style="
          font-size: 1.5rem;
          padding: 1rem 2rem;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          margin-right: 1rem;
        ">
        TAP ME
      </button>

      <button
        @click="reset"
        style="
          font-size: 1rem;
          padding: 0.8rem 1.5rem;
          background-color: #6c757d;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        ">
        Reset
      </button>
    </div>

    <div
      style="font-size: 0.9rem; color: #888; max-width: 400px; margin: 0 auto">
      <p>
        Tap the button to the beat of the music. BPM will be calculated after 2+
        taps using the last 4 taps for accuracy.
      </p>
    </div>
  </div>
</template>
