<script setup lang="ts">
  import {
    shallowRef,
    ref,
    computed,
    onMounted,
    onUnmounted,
    useTemplateRef,
  } from "vue";
  import { useWakeLock, useVibrate } from "@vueuse/core";

  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

  // Vibration patterns - light vibration for regular taps, stronger for accent taps
  const { vibrate, isSupported: isVibrationSupported } = useVibrate();
  const strongVibration = [100];
  const lightVibration = [50];

  const tickSound = new Audio("/tick.wav");
  const accentSound = new Audio("/accent.wav");
  const enableVibration = shallowRef<boolean>(false);

  const currentTab = shallowRef<string>("tapper");
  const tapTimes = ref<number[]>([]);
  const bpm = shallowRef<number>(130); // Changed default to 130
  let resetTimeoutId: number = 0;

  // Template ref for the tap button
  const tapButton = useTemplateRef("tapButton");

  // BPM Listener state
  const isPlaying = shallowRef<boolean>(false);
  let playInterval: number = 0;

  const registerTap = () => {
    const currentTime = Date.now();

    // Play accent sound on first tap of every group of 4, tick sound otherwise
    const tapPosition = tapTimes.value.length % 4;
    if (tapPosition === 0) {
      accentSound.currentTime = 0;
      accentSound.play();
      // Stronger vibration for accent tap (first of every 4)
      if (enableVibration.value) {
        vibrate(strongVibration);
      }
    } else {
      tickSound.currentTime = 0;
      tickSound.play();
      // Light vibration for regular taps
      if (enableVibration.value) {
        vibrate(lightVibration);
      }
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

    // Set timeout to reset taps after 1.5 seconds of inactivity
    resetTimeoutId = setTimeout(() => {
      tapTimes.value = [];
    }, 1500);
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
        accentSound.play();
        // Stronger vibration for accent beat
        if (enableVibration.value) {
          vibrate(strongVibration);
        }
      } else {
        tickSound.play();
        // Light vibration for regular beats
        if (enableVibration.value) {
          vibrate(lightVibration);
        }
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
    if (totalTaps === 0) return "";

    // Reset display after 8 taps (2 complete groups of 4)
    const displayTaps = totalTaps % 8 || (totalTaps > 0 ? 8 : 0);

    // Create fixed-width groups to prevent jumping
    const result = [];
    let currentGroup = "";

    for (let i = 0; i < displayTaps; i++) {
      currentGroup += "*";

      // Complete group of 4 or end of taps
      if ((i + 1) % 4 === 0 || i === displayTaps - 1) {
        result.push(currentGroup);
        currentGroup = "";
      }
    }

    return result.join(" ");
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
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-md mx-auto">
      <!-- Tab Navigation -->
      <div
        class="flex bg-white rounded-xl p-1 mb-8 shadow-sm border border-gray-200">
        <button
          @click="switchTab('tapper')"
          :class="
            currentTab === 'tapper'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-600 hover:text-blue-500'
          "
          class="flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200">
          Tap Mode
        </button>
        <button
          @click="switchTab('listener')"
          :class="
            currentTab === 'listener'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-600 hover:text-blue-500'
          "
          class="flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200">
          Metronome
        </button>
      </div>

      <!-- BPM Tapper Tab -->
      <div
        v-if="currentTab === 'tapper'"
        class="text-center space-y-6">
        <!-- BPM Display -->
        <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <div class="text-7xl font-black text-gray-900 mb-2">{{ bpm }}</div>
          <div class="text-xl text-gray-600 mb-4">BPM</div>
          <div class="text-sm text-gray-500 mb-4">{{ tapCount }} taps</div>
          <div
            class="bg-gray-100 rounded-xl pt-4 flex items-center justify-center">
            <div
              class="text-2xl font-mono text-blue-600 tracking-widest break-all">
              {{ tapDisplay || "\u00A0" }}
            </div>
          </div>
        </div>

        <!-- Tap Button -->
        <button
          ref="tapButton"
          @click="registerTap"
          class="w-40 h-40 mx-auto bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-2xl rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300 mr-1">
          TAP
        </button>

        <!-- Reset Button -->
        <button
          @click="reset"
          class="ml-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-8 py-3 rounded-xl transition-colors duration-200">
          Reset
        </button>

        <!-- Vibration Toggle -->
        <div
          v-if="isVibrationSupported"
          class="flex items-center justify-center gap-4">
          <span class="text-gray-600 font-medium">Vibration</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="enableVibration"
              class="sr-only peer" />
            <div
              class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      <!-- BPM Listener Tab -->
      <div
        v-else-if="currentTab === 'listener'"
        class="text-center space-y-6">
        <!-- BPM Input -->
        <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <label class="block text-lg font-semibold text-gray-700 mb-6"
            >Set Tempo</label
          >
          <div class="flex items-center justify-center gap-4">
            <input
              type="number"
              v-model="bpm"
              :disabled="isPlaying"
              min="40"
              max="200"
              class="text-5xl font-bold text-center border-2 border-gray-300 rounded-xl p-4 w-40 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-500" />
            <span class="text-2xl font-semibold text-gray-600">BPM</span>
          </div>
        </div>

        <!-- Metronome Button -->
        <button
          @click="toggleMetronome"
          :disabled="bpm <= 0"
          :class="
            isPlaying
              ? 'bg-gradient-to-b from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:ring-red-300'
              : 'bg-gradient-to-b from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:ring-green-300'
          "
          class="w-40 h-40 mx-auto text-white font-bold text-2xl rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:active:scale-100">
          {{ isPlaying ? "STOP" : "START" }}
        </button>

        <!-- Vibration Toggle -->
        <div class="flex items-center justify-center gap-4">
          <span class="text-gray-600 font-medium">Vibration</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="enableVibration"
              class="sr-only peer" />
            <div
              class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>
