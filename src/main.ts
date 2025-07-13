import { createVaporApp, type VaporComponent } from "vue";
import App from "./App.vue";

createVaporApp(App as VaporComponent).mount("#app");
