# 사용자 테스트 백엔드 계약 제안

프론트엔드가 사용자 테스트를 위해 필요로 하는 서버 작업이다. 프론트는 아래 경로와 필드로 구현되어 있지만 서버에는 아직 없다. 경로·이름은 백엔드 규칙에 맞게 바꿔도 되며, 바뀌면 `src/lib/userTest/feedback.ts`를 함께 고친다.

## 1. 피드백 저장

`PUT /api/user-test/feedback/{questionId}` (인증 필수, `Authorization: Bearer`)

- `questionId`: `q1_discovery` | `q2_understanding` | `q3_negotiation`
- 참여자는 토큰의 사용자로 정한다. 본문에 사용자 ID나 이메일을 받지 않는다.
- 유일 키: `(campaign_id, user_id, question_id, question_version)`. 같은 키는 덮어쓰기(upsert)라 재전송이 행을 늘리지 않는다.
- 상태 전이: 없음 → `shown` → `answered` | `skipped`. `answered`/`skipped` 뒤의 `shown`은 무시한다(되돌리지 않는다).
- 서버가 수신 시각(`received_at`)을 따로 기록한다. `client_*` 시각은 참고용이다.
- 검증: 인증 사용자가 해당 회차 참여자인지, `option_id`가 문항의 허용 선택지인지, `comment` 500자 이하인지.
- 댓글·토큰·이메일을 일반 로그에 남기지 않는다.

요청 본문 (snake_case, 다른 API와 같은 규칙):

```json
{
  "campaign_id": "local-2026-11",
  "question_version": "v1",
  "status": "answered",
  "option_id": "topics_only",
  "comment": "청소 주기를 먼저 정하고 싶어요",
  "experience_mode": "live",
  "data_source": "real",
  "survey_status": "completed",
  "target_profile_id": "12",
  "client_shown_at": "2026-11-17T10:00:00.000Z",
  "client_submitted_at": "2026-11-17T10:00:20.000Z"
}
```

| 필드              | 값                                                         |
| ----------------- | ---------------------------------------------------------- |
| status            | `shown` / `answered` / `skipped`                           |
| option_id         | `answered`일 때만 값. 아래 표                              |
| experience_mode   | `live` / `demo` (노출 시점)                                |
| data_source       | `real` / `example` (노출 시점)                             |
| survey_status     | `not_started` / `in_progress` / `completed`                |
| target_profile_id | Q2·Q3의 상대 ID. 예시 데이터면 예시 후보 ID(예: `sujeong`) |

허용 선택지:

| 문항             | option_id                                                                   |
| ---------------- | --------------------------------------------------------------------------- |
| q1_discovery     | `new_criteria`, `organized_existing`, `no_change`, `missing_topics`         |
| q2_understanding | `clear`, `somewhat_clear`, `unclear`, `very_unclear`                        |
| q3_negotiation   | `topics_and_range`, `topics_only`, `unclear_topics`, `no_adjustment_needed` |

응답: 기존 공통 형식 `{ success, code, message, data }`. 실패해도 프론트는 다음 화면으로 넘어가며, 다음 화면에서 같은 키로 다시 보낸다.

## 2. 결과 확인

공개 조회 API는 만들지 않는다. 권한 있는 운영자만 CSV를 받을 수 있게 한다(관리 기능 또는 DB 추출). 열: 위 필드 + `user_id`(분석용 내부 ID) + `received_at`. 응답률은 `shown` 이상인 행을 분모로 하고, `data_source`로 나누어 본다. Q1·Q3는 순서형 점수가 아니므로 평균 내지 않는다.

## 3. 테스트 그룹과 기본 정보

프론트는 공통값으로 기존 `PUT /api/me/onboarding`을 호출할 뿐이다. 다음은 서버에서만 보장할 수 있다.

- 별도 테스트 서버·DB를 우선 쓴다. 같은 DB라면 회차(테스트 그룹)를 사용자에 기록하고 추천·상세·신청·채팅·알림을 같은 그룹 안으로 제한한다(목록에서 숨기는 것만으로는 안 된다).
- 기존 운영 회원이 테스트에 들어오면 운영 프로필을 덮어쓰지 않도록 테스트 프로필을 분리한다.
- 표시 이름: 프론트는 `테스터{user_id}`를 보낸다. 서버가 번호를 따로 부여하려면 응답으로 알려준다.
- 공통 성별·출생연도·학교·기숙사 값을 확정한다. 학교는 로그인 계정에서 정해지므로, 서로 다른 학교 계정의 참여자는 지금 구조로는 서로 추천되지 않는다.
- 학번이 유일해야 한다면 공통 학번을 쓸 수 없다. 규칙을 알려주면 프론트가 맞춘다.
- 재로그인·콜백 재시도에 회원을 새로 만들지 않고, 설문 제출 뒤에는 온보딩 재저장을 거부하는 지금 규칙(409 `ONBOARDING_ALREADY_SUBMITTED`)을 유지한다.
