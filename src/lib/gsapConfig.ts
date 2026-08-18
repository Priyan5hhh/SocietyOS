import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText"
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin"
import { Draggable } from "gsap/Draggable"
import { InertiaPlugin } from "gsap/InertiaPlugin"

let registered = false

/** Registers every GSAP plugin the landing demos use, exactly once. */
export function ensureGsapRegistered() {
  if (registered) return
  gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, Draggable, InertiaPlugin)
  registered = true
}

export { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, Draggable }
