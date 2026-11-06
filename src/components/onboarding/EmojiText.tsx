type EmojiTextProps = {
  emoji: string
  text: string
  /** Width of the emoji slot, matching its advance in Figma. */
  emojiWidthClassName: string
  separator?: string
}

/**
 * Emoji glyphs differ in width between platforms. A fixed slot keeps the text in its Figma
 * position wherever it renders. Glyphs wider than the slot overflow evenly on both sides.
 */
export default function EmojiText({
  emoji,
  text,
  emojiWidthClassName,
  separator = ' ',
}: EmojiTextProps) {
  return (
    <>
      <span
        className={`inline-flex justify-center whitespace-nowrap ${emojiWidthClassName}`}
      >
        {emoji}
      </span>
      {separator}
      {text}
    </>
  )
}
