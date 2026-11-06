import floorLines from '../../assets/onboarding/floor-lines.svg'

/**
 * Wall strip and floor behind the character (1041:27843). The parent sets the position and the
 * height, and the top of this box is the top of the wall strip.
 */
export default function RoomBackground({ className }: { className: string }) {
  return (
    <div aria-hidden="true" className={`overflow-hidden ${className}`}>
      <div className="h-8 border-b-[3px] border-room-wall-line bg-room-wall" />
      <div className="absolute inset-x-0 top-8 bottom-0 bg-room-floor" />
      <img
        src={floorLines}
        alt=""
        className="absolute top-[46.52px] left-0 h-auto w-[max(392px,100%)] max-w-none"
      />
    </div>
  )
}
