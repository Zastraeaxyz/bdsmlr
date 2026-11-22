// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";
import { initPwaInstall } from "~/lib/pwaInstall";

initPwaInstall();

mount(() => <StartClient />, document.getElementById("app")!);
