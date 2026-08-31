/**
 * Real-time digital wall clock component displaying current local time in HH:MM format.
 */

export function WallClock(): HTMLElement {
  const timeSpan = (<span>--:--</span>) as unknown as HTMLElement;

  const update = () => {
    const now = new Date();
    timeSpan.textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  update();
  setInterval(update, 1000);

  return (
    <div class="wall-clock" title="Current Local Time">
      <span class="material-symbols-outlined">schedule</span>
      {timeSpan}
    </div>
  ) as unknown as HTMLElement;
}
