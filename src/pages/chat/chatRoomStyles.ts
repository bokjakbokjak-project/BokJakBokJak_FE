/** Styles and copy shared by the sample and the server chat rooms. */

// Not in Figma. Shown when the server rejects a change (chat OPEN_QUESTIONS DE-C1).
export const ERROR_TEXT = '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.'

/** The chatbot's name is a placeholder in Figma (`챗봇이 이름`, `"00"`), chat OPEN_QUESTIONS DE-C6. */
export const BOT_NAME = 'AI 챗봇'

export const ROUND_BUTTON =
  'relative size-7 shrink-0 rounded-full border-[1.5px] border-transparent transition-colors hover:border-question-outline hover:bg-brand-beige1 focus-visible:border-question-outline focus-visible:bg-brand-beige1'

/** White bubble of the chatbot and the partner, open at the top left (Figma 1715:38156). */
export const LEFT_BUBBLE =
  'rounded-tr-[12px] rounded-b-[12px] border border-gray-100 bg-white px-3 py-2 text-gray-black'

/** Figma 1952:40401: a 35px gray row with a 20px icon and the label. */
export const CARD_BUTTON =
  'flex h-[35px] w-full items-center justify-center gap-[5px] rounded-[5px] bg-[#f3f3f3] text-[14px] leading-[1.5] font-medium text-gray-black disabled:opacity-60'

/**
 * Text wraps once the text box reaches 258px, the Figma bubble text width (QA 7). Korean words
 * stay whole, and a run without spaces such as a URL still breaks instead of overflowing.
 */
export const BUBBLE_TEXT =
  'text-[14px] leading-[1.5] break-keep [overflow-wrap:anywhere] whitespace-pre-wrap'

/** `1 시험기간` in the data reads `1. 시험기간` on the card (Figma 1715:38135). */
export const agendaTitle = (title: string) => title.replace(/^(\d+)\s+/, '$1. ')
