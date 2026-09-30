import { useEffect, useState } from "react";

// TEMPORARY diagnostic overlay — remove once the keyboard-resize issue is
// confirmed fixed. Polls (not resize-event-driven, since Capacitor's body
// resize is a JS-set inline style, not a real window resize) so it reflects
// the true live state regardless of what triggers it.
const KeyboardDebugHUD = () => {
  const [info, setInfo] = useState({ bodyStyleHeight: "", bodyRectHeight: 0, rootRectHeight: 0, innerHeight: 0 });
  useEffect(() => {
    const tick = () => {
      const root = document.getElementById("root");
      setInfo({
        bodyStyleHeight: document.body.style.height || "(leer)",
        bodyRectHeight: Math.round(document.body.getBoundingClientRect().height),
        rootRectHeight: Math.round(root?.getBoundingClientRect().height ?? -1),
        innerHeight: window.innerHeight,
      });
    };
    tick();
    const id = setInterval(tick, 300);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-[999] bg-black/85 text-white text-[10px] leading-tight font-mono px-2 py-1 pointer-events-none" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      body.style.height: {info.bodyStyleHeight} | body rect: {info.bodyRectHeight} | #root rect: {info.rootRectHeight} | window.innerHeight: {info.innerHeight}
    </div>
  );
};

export default KeyboardDebugHUD;
