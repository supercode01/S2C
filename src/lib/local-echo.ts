// Local user ke apne autosave writes ki signatures yaad rakhta hai.
//
// Problem: autosave local state ko Convex par save karta hai, aur live
// subscription (useQuery) wahi state thodi der baad WAPAS bhejti hai. Agar
// hum is "apne hi echo" ko `applyRemoteShapes` se dobara apply karein to:
//   - Undo ke baad present purani state par mutate ho jaata hai (shape wapas
//     aa jaati hai), aur
//   - undo/redo history (past/future) present se desync ho jaati hai.
//
// Is liye jo state local user ne khud save ki, uski signature yahan yaad
// rakhte hain. Jab wahi signature live update me wapas aaye to use skip kar
// dete hain. Doosre users ke genuine changes (jo local ne kabhi save nahi
// kiye) normal tarah apply hote rehte hain.

const recent = new Set<string>()
const MAX = 50 // memory bound — sirf recent writes yaad rakho

export const sketchSignature = (shapes: unknown, frameCounter: unknown): string =>
    JSON.stringify({ shapes, frameCounter })

export const rememberLocalWrite = (sig: string): void => {
    recent.add(sig)
    if (recent.size > MAX) {
        const oldest = recent.values().next().value
        if (oldest !== undefined) recent.delete(oldest)
    }
}

export const isLocalEcho = (sig: string): boolean => recent.has(sig)
