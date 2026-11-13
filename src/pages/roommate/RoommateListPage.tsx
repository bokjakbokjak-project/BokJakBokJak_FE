import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import roomBackground from '../../assets/home/room-bg.png'
import chevronDown from '../../assets/roommate/chevron-down.svg'
import refreshIcon from '../../assets/roommate/refresh.svg'
import AppLogo from '../../components/AppLogo/AppLogo'
import BottomNav from '../../components/BottomNav/BottomNav'
import { usePendingNotice } from '../../components/BottomNav/usePendingNotice'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/LoadState/LoadState'
import CharacterAvatar from '../../components/roommate/CharacterAvatar'
import RoommateCard from '../../components/roommate/RoommateCard'
import {
  sampleRoommateCard,
  type RoommateCardData,
} from '../../components/roommate/roommateCardData'
import { isServerMode } from '../../lib/api/config'
import { errorText } from '../../lib/api/errorText'
import {
  refreshRecommendations,
  type Recommendation,
} from '../../lib/roommate/recommendationApi'
import { getCandidates } from '../../lib/roommate/roommateData'
import { useRoommate } from '../../lib/roommate/roommateState'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'

/** A server candidate's card. The card opens the analysis of that `user_id` (채희 spec 7.1). */
function serverCard(item: Recommendation): RoommateCardData {
  return {
    to: ROOMMATE_ROUTES.analysis(String(item.userId)),
    name: item.nickname,
    age: item.age,
    department: item.department,
    matchRate: item.matchScore,
    avatar: <CharacterAvatar priorities={item.priorities} />,
  }
}

/**
 * Figma 912:14164 and 1095:26603, note: "홈화면 고정으로 하고 룸메이트 리스트만 움직이게 해주세요".
 * The background, header, and title stay; only the card list scrolls above the fixed bottom bar.
 * The page takes the screen height, and the PC frame is always 844px tall.
 */
export default function RoommateListPage() {
  const {
    visibleCount,
    showMore,
    reset,
    listScrollTopRef,
    recommendations,
    loadRecommendations,
    setRecommendations,
  } = useRoommate()
  const listRef = useRef<HTMLDivElement>(null)
  const notice = usePendingNotice()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isServer = isServerMode()

  useEffect(() => {
    if (isServer) loadRecommendations()
  }, [isServer, loadRecommendations])

  const cards: RoommateCardData[] | null = !isServer
    ? getCandidates().map(sampleRoommateCard)
    : recommendations.status === 'ready'
      ? recommendations.items.map(serverCard)
      : null
  const hasMore = cards !== null && visibleCount < cards.length

  // The saved place is restored once the cards are there to scroll.
  const hasCards = cards !== null
  useLayoutEffect(() => {
    if (hasCards && listRef.current) {
      listRef.current.scrollTop = listScrollTopRef.current
    }
  }, [hasCards, listScrollTopRef])

  const backToTop = () => {
    reset()
    if (listRef.current) listRef.current.scrollTop = 0
  }

  // Sample mode has no recommendation API, so this only returns the list to its first state.
  // The server recalculates; an unchanged list stays where it is (채희 spec 7.2).
  const handleRefresh = async () => {
    if (!isServer) {
      backToTop()
      return
    }
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      const result = await refreshRecommendations()
      if (result.changed) {
        setRecommendations(result.recommendations)
        backToTop()
      } else {
        notice.showText('변경된 사항이 없습니다')
      }
    } catch (error) {
      notice.showText(errorText(error))
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="relative -mt-[env(safe-area-inset-top)] -mb-[env(safe-area-inset-bottom)] flex h-dvh flex-col overflow-hidden bg-home-floor pt-[max(47px,env(safe-area-inset-top))] md:h-[844px]">
      {/* The same room as the home (Figma 1057:13060), scaled with the width. The page color
          continues the floor on taller screens. */}
      <img
        src={roomBackground}
        alt=""
        className="absolute inset-x-0 top-0 h-auto w-full max-w-none"
      />
      <div className="absolute inset-x-0 top-0 h-[228px] bg-[linear-gradient(to_bottom,var(--color-brand-cream1)_67.842%,rgba(255,255,255,0)_96.918%)]" />
      <header className="relative h-14 shrink-0">
        <AppLogo />
        <button
          type="button"
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          className="absolute top-[10px] right-[23px] flex h-[35px] disabled:opacity-60 items-center gap-0.5 rounded-full border-2 border-brand-brown3 bg-brand-beige1 py-[5px] pr-1.5 pl-[7px] text-[14px] leading-[normal] font-semibold whitespace-nowrap text-brand-brown3"
          onClick={handleRefresh}
        >
          새로고침
          <img src={refreshIcon} alt="" className="size-3.5" />
        </button>
      </header>
      <div className="relative mt-[9px] flex shrink-0 flex-col items-center text-center leading-[1.5]">
        <h1 className="text-[22px] font-bold text-brand-brown1">
          룸메이트 매칭 결과
        </h1>
        <p className="text-[12px] font-medium tracking-[0.24px] text-roommate-caption">
          사용자의 설문조사와 유사한 순으로 추천해요
        </p>
      </div>
      <div
        ref={listRef}
        data-testid="roommate-list"
        className="scrollbar-none relative mt-[25px] min-h-0 flex-1 overflow-y-auto"
        onScroll={(event) => {
          listScrollTopRef.current = event.currentTarget.scrollTop
        }}
      >
        {isServer && recommendations.status !== 'ready' && (
          <div className="mx-auto w-full max-w-[390px] px-6">
            {recommendations.status === 'error' ? (
              <ErrorState
                error={recommendations.error}
                onRetry={() => loadRecommendations(true)}
              />
            ) : (
              <LoadingState label="추천 목록을 불러오는 중이에요" />
            )}
          </div>
        )}
        {cards?.length === 0 && (
          <EmptyState text="아직 추천할 수 있는 후보가 없어요" />
        )}
        <ul className="mx-auto flex w-full max-w-[390px] flex-col gap-2.5 px-6 pb-[15px]">
          {cards?.slice(0, visibleCount).map((card) => (
            <li key={card.to}>
              <RoommateCard card={card} />
            </li>
          ))}
        </ul>
        {hasMore && (
          <button
            type="button"
            className="mx-auto mb-[25px] flex items-center gap-0.5 px-[35px] py-2.5 text-[18px] leading-[normal] font-semibold whitespace-pre text-brand-brown3"
            onClick={showMore}
          >
            {'리스트 더보기 '}
            <img src={chevronDown} alt="" className="size-6" />
          </button>
        )}
      </div>
      <BottomNav active="roommate" notice={notice} />
    </div>
  )
}
