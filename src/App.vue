<script setup lang="ts">
  import {
    shallowRef,
    ref,
    computed,
    onMounted,
    onUnmounted,
    useTemplateRef,
  } from "vue";
  import { useWakeLock } from "@vueuse/core";

  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

  const tickSound = new Audio("/tick.mp3");
  const accentSound = new Audio("/accent.mp3");

  const currentTab = shallowRef<string>("tapper");
  const tapTimes = ref<number[]>([]);
  const bpm = shallowRef<number>(120); // Changed from shallowRef to ref and set default to 120
  let resetTimeoutId: number = 0;

  // Template ref for the tap button
  const tapButton = useTemplateRef("tapButton");

  // BPM Listener state
  const isPlaying = ref<boolean>(false);
  let playInterval: number = 0;

  const registerTap = () => {
    const currentTime = Date.now();

    // Play accent sound on first tap of every group of 4, tick sound otherwise
    const tapPosition = tapTimes.value.length % 4;
    if (tapPosition === 0) {
      accentSound.currentTime = 0;
      accentSound.play();
    } else {
      tickSound.currentTime = 0;
      tickSound.play();
    }

    // Clear any existing timeout
    if (resetTimeoutId) {
      clearTimeout(resetTimeoutId);
    }

    // Add current tap time to the array
    tapTimes.value.push(currentTime);

    // Calculate BPM if we have at least 2 taps
    if (tapTimes.value.length >= 2) {
      calculateBPM();
    }

    // Set timeout to reset taps after 3 seconds of inactivity
    resetTimeoutId = setTimeout(() => {
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
    if (resetTimeoutId) {
      clearTimeout(resetTimeoutId);
      resetTimeoutId = 0;
    }

    tapTimes.value = [];
    bpm.value = 0;
    console.log("BPM counter reset");
  };

  // BPM Listener functions
  const switchTab = (tab: string) => {
    // Stop any playing when switching tabs
    if (isPlaying.value) {
      stopMetronome();
    }

    currentTab.value = tab;
  };

  const toggleMetronome = () => {
    if (isPlaying.value) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  const startMetronome = () => {
    if (bpm.value <= 0) return;

    isPlaying.value = true;
    const interval = 60000 / bpm.value; // Convert BPM to milliseconds

    let beatCount = 0;
    const playBeat = () => {
      // Play accent on first beat of every 4, tick otherwise
      if (beatCount % 4 === 0) {
        accentSound.currentTime = 0;
        accentSound.play();
      } else {
        tickSound.currentTime = 0;
        tickSound.play();
      }
      beatCount++;
    };

    // Play first beat immediately
    playBeat();

    // Set up interval for subsequent beats
    playInterval = setInterval(playBeat, interval);
  };

  const stopMetronome = () => {
    isPlaying.value = false;
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = 0;
    }
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

  // Handle spacebar listener for tapping and esc to reset
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.code === "Space" && currentTab.value === "tapper") {
      event.preventDefault(); // Prevent page scroll
      registerTap();
    } else if (event.code === "Escape" && currentTab.value === "tapper") {
      event.preventDefault(); // Prevent page scroll
      reset();
    }
  };

  onMounted(() => {
    // Focus tap button on mount and add keyboard listener
    if (tapButton.value && currentTab.value === "tapper") {
      tapButton.value.focus();
    }

    // Request wake lock on mount
    requestWakeLock("screen");

    document.addEventListener("keydown", handleKeydown);
  });

  onUnmounted(() => {
    // Release wake lock on unmount
    releaseWakeLock();

    // Stop any playing metronome
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = 0;
    }

    // remove event listeners
    document.removeEventListener("keydown", handleKeydown);
  });
</script>

<template>
  <!-- Tab Navigation -->
  <div class="flex justify-center mb-4 border-b-gray-300">
    <button
      @click="switchTab('tapper')"
      :class="{
        'text-blue-500 border-b-blue-500': currentTab === 'tapper',
      }"
      class="text-lg px-8 py-4 bg-transparent text-gray-500 border-none border-b-transparent cursor-pointer transition-all hover:text-blue-500">
      Tapper
    </button>
    <button
      @click="switchTab('listener')"
      :class="{
        'text-blue-500 border-b-blue-500': currentTab === 'listener',
      }"
      class="text-lg px-8 py-4 bg-transparent text-gray-500 border-none border-b-transparent cursor-pointer transition-all hover:text-blue-500">
      Listener
    </button>
  </div>

  <!-- BPM Tapper Tab -->
  <div
    class="text-center p-4 font-sans"
    v-if="currentTab === 'tapper'">
    <h1>Tapper</h1>
    <div class="my-8">
      <p class="text-5xl font-bold my-4">{{ bpm }} BPM</p>
      <p class="text-xl text-gray-500">Taps: {{ tapCount }}</p>
      <div
        class="text-3xl my-4 h-20 tracking-widest flex items-center justify-center overflow-hidden">
        {{ tapDisplay }}
      </div>
    </div>

    <div class="my-8">
      <button
        ref="tapButton"
        @click="registerTap"
        @keydown.esc="reset"
        class="text-2xl px-8 py-4 bg-blue-500 text-white border-none rounded-lg cursor-pointer mr-4">
        TAP ME
      </button>

      <button
        @click="reset"
        class="text-base px-6 py-3 bg-gray-500 text-white border-none rounded-lg cursor-pointer">
        Reset
      </button>
    </div>

    <div class="text-sm text-gray-400 max-w-sm mx-auto">
      <p>
        Tap the button to the beat of the music. BPM will be calculated after 2+
        taps using the last 4 taps for accuracy.
      </p>
    </div>
  </div>

  <!-- BPM Listener Tab -->
  <div
    class="text-center p-8 font-sans"
    v-else-if="currentTab === 'listener'">
    <h1>Listener</h1>
    <div class="my-8">
      <p class="text-5xl font-bold my-4">{{ bpm }} BPM</p>
    </div>

    <div class="my-8">
      <div class="my-8 flex flex-col items-center">
        <label
          for="bpm-slider"
          class="text-xl mb-4 text-gray-700"
          >BPM:</label
        >
        <input
          id="bpm-slider"
          type="range"
          min="60"
          max="200"
          v-model="bpm"
          class="range-slider"
          :disabled="isPlaying" />
        <div class="flex justify-between w-75 mt-2 text-sm text-gray-500">
          <span>60</span>
          <span>200</span>
        </div>
      </div>

      <div class="my-8">
        <button
          @click="toggleMetronome"
          :class="{
            'bg-red-500 hover:bg-red-600': isPlaying,
            'hover:bg-green-600': !isPlaying,
          }"
          class="text-2xl px-8 py-4 bg-green-500 text-white border-none rounded-lg cursor-pointer transition-all">
          {{ isPlaying ? "STOP" : "PLAY" }}
        </button>
      </div>
    </div>

    <div class="text-sm text-gray-400 max-w-sm mx-auto">
      <p>
        Adjust the BPM slider and click play to listen to the metronome at your
        desired tempo.
      </p>
    </div>
  </div>

  <!-- Fallback for other tabs -->
  <div v-else>
    <p>Other tabs will be implemented later.</p>
  </div>
</template>
