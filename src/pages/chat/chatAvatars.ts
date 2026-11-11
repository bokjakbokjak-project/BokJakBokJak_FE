import chatAvatarMe from '../../assets/chat/chat-avatar-me.png'
import chatAvatarSleepMask from '../../assets/chat/chat-avatar-sleep-mask.png'
import chatAvatarYellowHat from '../../assets/chat/chat-avatar-yellow-hat.png'
import chatTileAi from '../../assets/chat/chat-tile-ai.png'
import chatTilePartner from '../../assets/chat/chat-tile-partner.png'
import listAvatarBlueCap from '../../assets/chat/list-avatar-blue-cap.png'
import listAvatarSleepMaskWhite from '../../assets/chat/list-avatar-sleep-mask-white.png'
import listAvatarSleepMask from '../../assets/chat/list-avatar-sleep-mask.png'
import listAvatarYellowHat from '../../assets/chat/list-avatar-yellow-hat.png'
import type { ChatAvatar } from '../../lib/chat/chatApi'

// Characters exported from Figma 793:5158 as fixed images (chat OPEN_QUESTIONS CH-3).

/** 52px tiles on the chat list (1377:57476). */
export const LIST_AVATARS: Record<ChatAvatar, string> = {
  'blue-cap': listAvatarBlueCap,
  'sleep-mask': listAvatarSleepMask,
  'sleep-mask-white': listAvatarSleepMaskWhite,
  'yellow-hat': listAvatarYellowHat,
}

/** 52px tiles in the room. The blue cap is mine, so partners never use it there. */
export const CHAT_AVATARS: Record<ChatAvatar, string> = {
  'blue-cap': chatAvatarMe,
  'sleep-mask': chatAvatarSleepMask,
  'sleep-mask-white': chatAvatarSleepMask,
  'yellow-hat': chatAvatarYellowHat,
}

export const MY_CHAT_AVATAR = chatAvatarMe

/**
 * 50px framed tiles of the room redesign (Figma 1715:38122, 1715:38143). Figma draws the same
 * partner character for every partner, so all partners use it until each user's character is
 * decided (CH-3).
 */
export const AI_TILE = chatTileAi
export const PARTNER_TILE = chatTilePartner
