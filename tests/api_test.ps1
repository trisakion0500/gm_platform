# ============================================================
# GM Platform API 전체 테스트
# ============================================================
$BASE = "http://localhost:3000/api"
$PASS = 0
$FAIL = 0
$TS   = [int][System.DateTimeOffset]::UtcNow.ToUnixTimeSeconds()  # 재실행 충돌 방지

function Req($method, $path, $body = $null, $token = $null) {
  $headers = @{ "Content-Type" = "application/json" }
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  try {
    $p = @{ Method = $method; Uri = "$BASE$path"; Headers = $headers; ErrorAction = "Stop" }
    if ($body) { $p["Body"] = ($body | ConvertTo-Json -Depth 10) }
    return Invoke-RestMethod @p
  } catch {
    $msg = $_.ErrorDetails.Message
    if ($msg) {
      try { return $msg | ConvertFrom-Json } catch {}
    }
    return [PSCustomObject]@{ result = -1; message = $_.Exception.Message }
  }
}

function Check($label, $r, $expect = 0) {
  $actual = if ($null -ne $r.result) { [int]$r.result } else { -1 }
  if ($actual -eq $expect) {
    $script:PASS++
    Write-Host "  [PASS] $label" -ForegroundColor Green
  } else {
    $script:FAIL++
    Write-Host "  [FAIL] $label  (result=$actual, msg=$($r.message))" -ForegroundColor Red
  }
  return $r
}

function Section($title) {
  Write-Host ""
  Write-Host "================================================================" -ForegroundColor Cyan
  Write-Host "  $title" -ForegroundColor Cyan
  Write-Host "================================================================" -ForegroundColor Cyan
}

# ============================================================
# 1. AUTH - 로그인
# ============================================================
Section "1. AUTH / 로그인"

$r = Check "로그인 성공 #1" (Req POST /auth/login @{ login_id="sa"; password="1234" })
$TOKEN   = $r.data.access_token
$REFRESH = $r.data.refresh_token

Check "로그인 성공 #2" (Req POST /auth/login @{ login_id="sa"; password="1234" })
Check "로그인 성공 #3" (Req POST /auth/login @{ login_id="sa"; password="1234" })
Check "로그인 실패 - 잘못된 비밀번호 #1" (Req POST /auth/login @{ login_id="sa"; password="wrong" })   10001
Check "로그인 실패 - 잘못된 비밀번호 #2" (Req POST /auth/login @{ login_id="sa"; password="WRONG" })   10001
Check "로그인 실패 - 잘못된 비밀번호 #3" (Req POST /auth/login @{ login_id="sa"; password="0000" })    10001
Check "로그인 실패 - 없는 계정 #1"       (Req POST /auth/login @{ login_id="nouser1"; password="1234" }) 10001
Check "로그인 실패 - 없는 계정 #2"       (Req POST /auth/login @{ login_id="nouser2"; password="1234" }) 10001
Check "로그인 실패 - 없는 계정 #3"       (Req POST /auth/login @{ login_id="nouser3"; password="1234" }) 10001

# ============================================================
# 2. AUTH - 내 정보 / Refresh / 토큰 없음
# ============================================================
Section "2. AUTH / me · refresh · 인증 오류"

Check "내 정보 조회 #1" (Req GET /auth/me $null $TOKEN)
Check "내 정보 조회 #2" (Req GET /auth/me $null $TOKEN)
Check "내 정보 조회 #3" (Req GET /auth/me $null $TOKEN)
Check "토큰 없이 me"    (Req GET /auth/me) 10004
Check "잘못된 토큰"     (Req GET /auth/me $null "invalid.token.here") 10004

# refresh는 access_token만 반환 — $REFRESH(refresh_token)는 갱신하지 않음
Check "Refresh #1" (Req POST /auth/refresh @{ refresh_token=$REFRESH })
Check          "Refresh #2" (Req POST /auth/refresh @{ refresh_token=$REFRESH })
Check          "Refresh #3" (Req POST /auth/refresh @{ refresh_token=$REFRESH })
# 3회 refresh 후 세션 JTI가 Refresh#3 기준으로 바뀌므로 재로그인으로 유효 토큰 재확보
$re    = Req POST /auth/login @{ login_id="sa"; password="1234" }
$TOKEN = $re.data.access_token

Check "Refresh 실패 - 잘못된 토큰 #1" (Req POST /auth/refresh @{ refresh_token="bad-1" }) 10008
Check "Refresh 실패 - 잘못된 토큰 #2" (Req POST /auth/refresh @{ refresh_token="bad-2" }) 10008
Check "Refresh 실패 - 잘못된 토큰 #3" (Req POST /auth/refresh @{ refresh_token="bad-3" }) 10008

# ============================================================
# 3. COMPANY
# ============================================================
Section "3. COMPANY"

$c1 = Check "회사 생성 #1" (Req POST /companies @{ company_code="TC1_$TS"; company_name="테스트회사1"; description="설명1" } $TOKEN)
Check "회사 생성 #2" (Req POST /companies @{ company_code="TC2_$TS"; company_name="테스트회사2"; description="설명2" } $TOKEN)
Check "회사 생성 #3" (Req POST /companies @{ company_code="TC3_$TS"; company_name="테스트회사3" } $TOKEN)
Check "회사 생성 실패 - 중복코드 #1" (Req POST /companies @{ company_code="TC1_$TS"; company_name="중복" } $TOKEN) 32001
Check "회사 생성 실패 - 중복코드 #2" (Req POST /companies @{ company_code="TC2_$TS"; company_name="중복" } $TOKEN) 32001
Check "회사 생성 실패 - 중복코드 #3" (Req POST /companies @{ company_code="TC3_$TS"; company_name="중복" } $TOKEN) 32001
Check "회사 생성 실패 - 코드 형식오류 #1" (Req POST /companies @{ company_code="bad code_$TS"; company_name="형식오류1" } $TOKEN) 30002
Check "회사 생성 실패 - 코드 형식오류 #2" (Req POST /companies @{ company_code="잘못된코드_$TS"; company_name="형식오류2" } $TOKEN) 30002
Check "회사 생성 실패 - 코드 형식오류 #3" (Req POST /companies @{ company_code="bad@code!_$TS"; company_name="형식오류3" } $TOKEN) 30002
Check "회사 생성 실패 - 코드 길이초과 #1" (Req POST /companies @{ company_code="TOOLONGCODE1234567890"; company_name="길이초과1" } $TOKEN) 30002
Check "회사 생성 실패 - 코드 길이초과 #2" (Req POST /companies @{ company_code="TOOLONGCODE1234567890"; company_name="길이초과2" } $TOKEN) 30002
Check "회사 생성 실패 - 코드 길이초과 #3" (Req POST /companies @{ company_code="TOOLONGCODE1234567890"; company_name="길이초과3" } $TOKEN) 30002
Check "회사 생성 실패 - 회사명 길이초과 #1" (Req POST /companies @{ company_code="LN1_$TS"; company_name=("A" * 101) } $TOKEN) 30002
Check "회사 생성 실패 - 회사명 길이초과 #2" (Req POST /companies @{ company_code="LN2_$TS"; company_name=("A" * 101) } $TOKEN) 30002
Check "회사 생성 실패 - 회사명 길이초과 #3" (Req POST /companies @{ company_code="LN3_$TS"; company_name=("A" * 101) } $TOKEN) 30002
Check "회사 생성 실패 - 설명 길이초과 #1" (Req POST /companies @{ company_code="LD1_$TS"; company_name="설명초과1"; description=("A" * 1001) } $TOKEN) 30002
Check "회사 생성 실패 - 설명 길이초과 #2" (Req POST /companies @{ company_code="LD2_$TS"; company_name="설명초과2"; description=("A" * 1001) } $TOKEN) 30002
Check "회사 생성 실패 - 설명 길이초과 #3" (Req POST /companies @{ company_code="LD3_$TS"; company_name="설명초과3"; description=("A" * 1001) } $TOKEN) 30002

$CID = $c1.data.company_id

Check "회사 목록 조회 #1" (Req GET "/companies?page=1&page_size=20" $null $TOKEN)
Check "회사 목록 조회 #2" (Req GET "/companies?page=1&page_size=50" $null $TOKEN)
Check "회사 목록 조회 #3" (Req GET "/companies?page=1&page_size=20&status=1" $null $TOKEN)
Check "회사 목록 조회 - page_size=30 #1" (Req GET "/companies?page=1&page_size=30" $null $TOKEN)
Check "회사 목록 조회 - page_size=30 #2" (Req GET "/companies?page=1&page_size=30" $null $TOKEN)
Check "회사 목록 조회 - page_size=30 #3" (Req GET "/companies?page=1&page_size=30" $null $TOKEN)
Check "헤더 활성 회사/프로젝트 조회 #1" (Req GET "/companies/active-header-data" $null $TOKEN)
Check "헤더 활성 회사/프로젝트 조회 #2" (Req GET "/companies/active-header-data" $null $TOKEN)
Check "헤더 활성 회사/프로젝트 조회 #3" (Req GET "/companies/active-header-data" $null $TOKEN)
Check "회사 단건 조회 #1" (Req GET /companies/$CID $null $TOKEN)
Check "회사 단건 조회 #2" (Req GET /companies/$CID $null $TOKEN)
Check "회사 단건 조회 #3" (Req GET /companies/$CID $null $TOKEN)
Check "회사 단건 - 없는 ID #1" (Req GET /companies/99991 $null $TOKEN) 31001
Check "회사 단건 - 없는 ID #2" (Req GET /companies/99992 $null $TOKEN) 31001
Check "회사 단건 - 없는 ID #3" (Req GET /companies/99993 $null $TOKEN) 31001
Check "회사 수정 #1" (Req PATCH /companies/$CID @{ company_name="수정회사1" } $TOKEN)
Check "회사 수정 #2" (Req PATCH /companies/$CID @{ description="수정설명" } $TOKEN)
Check "회사 수정 #3" (Req PATCH /companies/$CID @{ company_name="최종수정1" } $TOKEN)
Check "회사 수정 실패 - 코드 형식오류 #1" (Req PATCH /companies/$CID @{ company_code="bad code_$TS" } $TOKEN) 30002
Check "회사 수정 실패 - 코드 형식오류 #2" (Req PATCH /companies/$CID @{ company_code="잘못된코드_$TS" } $TOKEN) 30002
Check "회사 수정 실패 - 코드 형식오류 #3" (Req PATCH /companies/$CID @{ company_code="bad@code!_$TS" } $TOKEN) 30002
Check "회사 수정 실패 - 코드 길이초과 #1" (Req PATCH /companies/$CID @{ company_code="TOOLONGCODE1234567890" } $TOKEN) 30002
Check "회사 수정 실패 - 코드 길이초과 #2" (Req PATCH /companies/$CID @{ company_code="TOOLONGCODE1234567890" } $TOKEN) 30002
Check "회사 수정 실패 - 코드 길이초과 #3" (Req PATCH /companies/$CID @{ company_code="TOOLONGCODE1234567890" } $TOKEN) 30002
Check "회사 수정 실패 - 회사명 길이초과 #1" (Req PATCH /companies/$CID @{ company_name=("A" * 101) } $TOKEN) 30002
Check "회사 수정 실패 - 회사명 길이초과 #2" (Req PATCH /companies/$CID @{ company_name=("A" * 101) } $TOKEN) 30002
Check "회사 수정 실패 - 회사명 길이초과 #3" (Req PATCH /companies/$CID @{ company_name=("A" * 101) } $TOKEN) 30002
Check "회사 수정 실패 - 설명 길이초과 #1" (Req PATCH /companies/$CID @{ description=("A" * 1001) } $TOKEN) 30002
Check "회사 수정 실패 - 설명 길이초과 #2" (Req PATCH /companies/$CID @{ description=("A" * 1001) } $TOKEN) 30002
Check "회사 수정 실패 - 설명 길이초과 #3" (Req PATCH /companies/$CID @{ description=("A" * 1001) } $TOKEN) 30002

# ============================================================
# 4. PROJECT
# ============================================================
Section "4. PROJECT"

$p1 = Check "프로젝트 생성 #1" (Req POST /projects @{ company_id=$CID; project_code="PJ1_$TS"; project_name="프로젝트1"; api_base_url="http://api1.test.com" } $TOKEN)
$p2 = Check "프로젝트 생성 #2" (Req POST /projects @{ company_id=$CID; project_code="PJ2_$TS"; project_name="프로젝트2"; api_base_url="http://api2.test.com" } $TOKEN)
Check "프로젝트 생성 #3" (Req POST /projects @{ company_id=$CID; project_code="PJ3_$TS"; project_name="프로젝트3"; api_base_url="http://api3.test.com" } $TOKEN)
Check "프로젝트 생성 실패 - 중복코드 #1" (Req POST /projects @{ company_id=$CID; project_code="PJ1_$TS"; project_name="중복"; api_base_url="http://x.com" } $TOKEN) 32001
Check "프로젝트 생성 실패 - 중복코드 #2" (Req POST /projects @{ company_id=$CID; project_code="PJ2_$TS"; project_name="중복"; api_base_url="http://x.com" } $TOKEN) 32001
Check "프로젝트 생성 실패 - 중복코드 #3" (Req POST /projects @{ company_id=$CID; project_code="PJ3_$TS"; project_name="중복"; api_base_url="http://x.com" } $TOKEN) 32001
Check "프로젝트 생성 실패 - 코드 형식오류 #1" (Req POST /projects @{ company_id=$CID; project_code="bad code_$TS"; project_name="형식오류1"; api_base_url="http://x.com" } $TOKEN) 30002
Check "프로젝트 생성 실패 - 코드 형식오류 #2" (Req POST /projects @{ company_id=$CID; project_code="잘못된코드_$TS"; project_name="형식오류2"; api_base_url="http://x.com" } $TOKEN) 30002
Check "프로젝트 생성 실패 - 코드 형식오류 #3" (Req POST /projects @{ company_id=$CID; project_code="bad@code!_$TS"; project_name="형식오류3"; api_base_url="http://x.com" } $TOKEN) 30002
Check "프로젝트 생성 실패 - 코드 길이초과 #1" (Req POST /projects @{ company_id=$CID; project_code="TOOLONGCODE1234567890"; project_name="길이초과1"; api_base_url="http://x.com" } $TOKEN) 30002
Check "프로젝트 생성 실패 - 코드 길이초과 #2" (Req POST /projects @{ company_id=$CID; project_code="TOOLONGCODE1234567890"; project_name="길이초과2"; api_base_url="http://x.com" } $TOKEN) 30002
Check "프로젝트 생성 실패 - 코드 길이초과 #3" (Req POST /projects @{ company_id=$CID; project_code="TOOLONGCODE1234567890"; project_name="길이초과3"; api_base_url="http://x.com" } $TOKEN) 30002
Check "프로젝트 생성 실패 - 이름 길이초과 #1" (Req POST /projects @{ company_id=$CID; project_code="LN1_$TS"; project_name=("A" * 101); api_base_url="http://x.com" } $TOKEN) 30002
Check "프로젝트 생성 실패 - 이름 길이초과 #2" (Req POST /projects @{ company_id=$CID; project_code="LN2_$TS"; project_name=("A" * 101); api_base_url="http://x.com" } $TOKEN) 30002
Check "프로젝트 생성 실패 - 이름 길이초과 #3" (Req POST /projects @{ company_id=$CID; project_code="LN3_$TS"; project_name=("A" * 101); api_base_url="http://x.com" } $TOKEN) 30002
Check "프로젝트 생성 실패 - URL 길이초과 #1" (Req POST /projects @{ company_id=$CID; project_code="LU1_$TS"; project_name="URL초과1"; api_base_url=("http://x.com/" + ("a" * 256)) } $TOKEN) 30002
Check "프로젝트 생성 실패 - URL 길이초과 #2" (Req POST /projects @{ company_id=$CID; project_code="LU2_$TS"; project_name="URL초과2"; api_base_url=("http://x.com/" + ("a" * 256)) } $TOKEN) 30002
Check "프로젝트 생성 실패 - URL 길이초과 #3" (Req POST /projects @{ company_id=$CID; project_code="LU3_$TS"; project_name="URL초과3"; api_base_url=("http://x.com/" + ("a" * 256)) } $TOKEN) 30002
Check "프로젝트 생성 실패 - 설명 길이초과 #1" (Req POST /projects @{ company_id=$CID; project_code="LD1_$TS"; project_name="설명초과1"; api_base_url="http://x.com"; description=("A" * 1001) } $TOKEN) 30002
Check "프로젝트 생성 실패 - 설명 길이초과 #2" (Req POST /projects @{ company_id=$CID; project_code="LD2_$TS"; project_name="설명초과2"; api_base_url="http://x.com"; description=("A" * 1001) } $TOKEN) 30002
Check "프로젝트 생성 실패 - 설명 길이초과 #3" (Req POST /projects @{ company_id=$CID; project_code="LD3_$TS"; project_name="설명초과3"; api_base_url="http://x.com"; description=("A" * 1001) } $TOKEN) 30002

$PROJID  = $p1.data.project_id
$PROJID2 = $p2.data.project_id

Check "프로젝트 목록 조회 #1" (Req GET "/projects?page=1&page_size=20" $null $TOKEN)
Check "프로젝트 목록 조회 #2" (Req GET "/projects?page=1&page_size=50" $null $TOKEN)
Check "프로젝트 목록 조회 #3" (Req GET "/projects?page=1&page_size=20&company_id=$CID" $null $TOKEN)
Check "프로젝트 단건 조회 #1" (Req GET /projects/$PROJID $null $TOKEN)
Check "프로젝트 단건 조회 #2" (Req GET /projects/$PROJID $null $TOKEN)
Check "프로젝트 단건 조회 #3" (Req GET /projects/$PROJID $null $TOKEN)
Check "프로젝트 단건 - 없는 ID #1" (Req GET /projects/99991 $null $TOKEN) 31002
Check "프로젝트 단건 - 없는 ID #2" (Req GET /projects/99992 $null $TOKEN) 31002
Check "프로젝트 단건 - 없는 ID #3" (Req GET /projects/99993 $null $TOKEN) 31002
Check "프로젝트 수정 #1" (Req PATCH /projects/$PROJID @{ project_name="수정프로젝트1" } $TOKEN)
Check "프로젝트 수정 #2" (Req PATCH /projects/$PROJID @{ description="수정설명" } $TOKEN)
Check "프로젝트 수정 #3" (Req PATCH /projects/$PROJID @{ project_name="최종수정P1" } $TOKEN)
Check "프로젝트 수정 실패 - 코드 형식오류 #1" (Req PATCH /projects/$PROJID @{ project_code="bad code_$TS" } $TOKEN) 30002
Check "프로젝트 수정 실패 - 코드 형식오류 #2" (Req PATCH /projects/$PROJID @{ project_code="잘못된코드_$TS" } $TOKEN) 30002
Check "프로젝트 수정 실패 - 코드 형식오류 #3" (Req PATCH /projects/$PROJID @{ project_code="bad@code!_$TS" } $TOKEN) 30002
Check "프로젝트 수정 실패 - 코드 길이초과 #1" (Req PATCH /projects/$PROJID @{ project_code="TOOLONGCODE1234567890" } $TOKEN) 30002
Check "프로젝트 수정 실패 - 코드 길이초과 #2" (Req PATCH /projects/$PROJID @{ project_code="TOOLONGCODE1234567890" } $TOKEN) 30002
Check "프로젝트 수정 실패 - 코드 길이초과 #3" (Req PATCH /projects/$PROJID @{ project_code="TOOLONGCODE1234567890" } $TOKEN) 30002
Check "프로젝트 수정 실패 - 이름 길이초과 #1" (Req PATCH /projects/$PROJID @{ project_name=("A" * 101) } $TOKEN) 30002
Check "프로젝트 수정 실패 - 이름 길이초과 #2" (Req PATCH /projects/$PROJID @{ project_name=("A" * 101) } $TOKEN) 30002
Check "프로젝트 수정 실패 - 이름 길이초과 #3" (Req PATCH /projects/$PROJID @{ project_name=("A" * 101) } $TOKEN) 30002
# api_base_url은 PATCH /projects/:project_id/connection 전용으로 분리됨 (URL 길이초과 검증은 "7C. 프로젝트 연결정보 수정" 참고)
Check "프로젝트 수정 실패 - 설명 길이초과 #1" (Req PATCH /projects/$PROJID @{ description=("A" * 1001) } $TOKEN) 30002
Check "프로젝트 수정 실패 - 설명 길이초과 #2" (Req PATCH /projects/$PROJID @{ description=("A" * 1001) } $TOKEN) 30002
Check "프로젝트 수정 실패 - 설명 길이초과 #3" (Req PATCH /projects/$PROJID @{ description=("A" * 1001) } $TOKEN) 30002

# ============================================================
# 5. AUTH - 회원가입
# ============================================================
Section "5. AUTH / 회원가입"

$U1 = "tu1_$TS"; $U2 = "tu2_$TS"; $U3 = "tu3_$TS"
Check "회원가입 #1" (Req POST /auth/signup @{ company_id=$CID; login_id=$U1; password="test1234!"; user_name="테스트유저1"; email="t1_${TS}@test.com"; phone_number="010-0000-0001" })
Check "회원가입 #2" (Req POST /auth/signup @{ company_id=$CID; login_id=$U2; password="test1234!"; user_name="테스트유저2"; email="t2_${TS}@test.com"; phone_number="010-0000-0002" })
Check "회원가입 #3" (Req POST /auth/signup @{ company_id=$CID; login_id=$U3; password="test1234!"; user_name="테스트유저3"; email="t3_${TS}@test.com"; phone_number="010-0000-0003" })
Check "회원가입 실패 - 로그인ID 형식오류 #1" (Req POST /auth/signup @{ company_id=$CID; login_id="bad id_$TS"; password="test1234!"; user_name="형식오류1"; email="fmt1_${TS}@test.com"; phone_number="010-0000-0004" }) 30002
Check "회원가입 실패 - 로그인ID 형식오류 #2" (Req POST /auth/signup @{ company_id=$CID; login_id="잘못된아이디_$TS"; password="test1234!"; user_name="형식오류2"; email="fmt2_${TS}@test.com"; phone_number="010-0000-0005" }) 30002
Check "회원가입 실패 - 로그인ID 형식오류 #3" (Req POST /auth/signup @{ company_id=$CID; login_id="bad@id!_$TS"; password="test1234!"; user_name="형식오류3"; email="fmt3_${TS}@test.com"; phone_number="010-0000-0006" }) 30002
Check "회원가입 실패 - 중복 ID #1" (Req POST /auth/signup @{ company_id=$CID; login_id=$U1; password="test1234!"; user_name="중복"; email="dup1@test.com"; phone_number="010-0000-0007" }) 32001
Check "회원가입 실패 - 중복 ID #2" (Req POST /auth/signup @{ company_id=$CID; login_id=$U2; password="test1234!"; user_name="중복"; email="dup2@test.com"; phone_number="010-0000-0008" }) 32001
Check "회원가입 실패 - 중복 ID #3" (Req POST /auth/signup @{ company_id=$CID; login_id=$U3; password="test1234!"; user_name="중복"; email="dup3@test.com"; phone_number="010-0000-0009" }) 32001
Check "회원가입 실패 - 휴대폰번호 누락 #1" (Req POST /auth/signup @{ company_id=$CID; login_id="tuphone1_$TS"; password="test1234!"; user_name="폰누락1"; email="phone1_${TS}@test.com" }) 30001
Check "회원가입 실패 - 휴대폰번호 누락 #2" (Req POST /auth/signup @{ company_id=$CID; login_id="tuphone2_$TS"; password="test1234!"; user_name="폰누락2"; email="phone2_${TS}@test.com" }) 30001
Check "회원가입 실패 - 휴대폰번호 누락 #3" (Req POST /auth/signup @{ company_id=$CID; login_id="tuphone3_$TS"; password="test1234!"; user_name="폰누락3"; email="phone3_${TS}@test.com" }) 30001
Check "회원가입 실패 - 휴대폰번호 길이초과 #1" (Req POST /auth/signup @{ company_id=$CID; login_id="tulen1_$TS"; password="test1234!"; user_name="폰길이1"; email="len1_${TS}@test.com"; phone_number=("0" * 21) }) 30002
Check "회원가입 실패 - 휴대폰번호 길이초과 #2" (Req POST /auth/signup @{ company_id=$CID; login_id="tulen2_$TS"; password="test1234!"; user_name="폰길이2"; email="len2_${TS}@test.com"; phone_number=("0" * 21) }) 30002
Check "회원가입 실패 - 휴대폰번호 길이초과 #3" (Req POST /auth/signup @{ company_id=$CID; login_id="tulen3_$TS"; password="test1234!"; user_name="폰길이3"; email="len3_${TS}@test.com"; phone_number=("0" * 21) }) 30002
Check "가입 직후 로그인 차단 #1" (Req POST /auth/login @{ login_id=$U1; password="test1234!" }) 10005
Check "가입 직후 로그인 차단 #2" (Req POST /auth/login @{ login_id=$U2; password="test1234!" }) 10005
Check "가입 직후 로그인 차단 #3" (Req POST /auth/login @{ login_id=$U3; password="test1234!" }) 10005

# ============================================================
# 6. USER
# ============================================================
Section "6. USER"

Check "사용자 목록 조회 #1" (Req GET "/users?page=1&page_size=20" $null $TOKEN)
Check "사용자 목록 조회 #2" (Req GET "/users?page=1&page_size=50" $null $TOKEN)
Check "사용자 목록 조회 #3" (Req GET "/users?page=1&page_size=100" $null $TOKEN)

$ul    = Req GET "/users?page=1&page_size=100" $null $TOKEN
$USERS = $ul.data.items
$UID1  = ($USERS | Where-Object { $_.login_id -eq $U1 }).user_id
$UID2  = ($USERS | Where-Object { $_.login_id -eq $U2 }).user_id
$UID3  = ($USERS | Where-Object { $_.login_id -eq $U3 }).user_id

Check "사용자 단건 조회 #1" (Req GET /users/$UID1 $null $TOKEN)
Check "사용자 단건 조회 #2" (Req GET /users/$UID2 $null $TOKEN)
Check "사용자 단건 조회 #3" (Req GET /users/$UID3 $null $TOKEN)
Check "사용자 단건 - 없는 ID #1" (Req GET /users/99991 $null $TOKEN) 31003
Check "사용자 단건 - 없는 ID #2" (Req GET /users/99992 $null $TOKEN) 31003
Check "사용자 단건 - 없는 ID #3" (Req GET /users/99993 $null $TOKEN) 31003
Check "사용자 수정 #1" (Req PATCH /users/$UID1 @{ user_name="수정유저1" } $TOKEN)
Check "사용자 수정 #2" (Req PATCH /users/$UID2 @{ user_name="수정유저2" } $TOKEN)
Check "사용자 수정 #3" (Req PATCH /users/$UID3 @{ user_name="수정유저3" } $TOKEN)
Check "사용자 수정 - 연락처/부서/직급 #1" (Req PATCH /users/$UID1 @{ phone_number="010-9999-0001"; department="개발팀"; position="사원" } $TOKEN)
Check "사용자 수정 - 연락처/부서/직급 #2" (Req PATCH /users/$UID2 @{ phone_number="010-9999-0002"; department="개발팀"; position="사원" } $TOKEN)
Check "사용자 수정 - 연락처/부서/직급 #3" (Req PATCH /users/$UID3 @{ phone_number="010-9999-0003"; department="개발팀"; position="사원" } $TOKEN)
Check "사용자 수정 실패 - 휴대폰번호 길이초과 #1" (Req PATCH /users/$UID1 @{ phone_number=("0" * 21) } $TOKEN) 30002
Check "사용자 수정 실패 - 휴대폰번호 길이초과 #2" (Req PATCH /users/$UID2 @{ phone_number=("0" * 21) } $TOKEN) 30002
Check "사용자 수정 실패 - 휴대폰번호 길이초과 #3" (Req PATCH /users/$UID3 @{ phone_number=("0" * 21) } $TOKEN) 30002

Check "사용자 승인 #1" (Req POST /users/$UID1/approve $null $TOKEN)
Check "사용자 승인 #2" (Req POST /users/$UID2/approve $null $TOKEN)
Check "사용자 반려 #1" (Req POST /users/$UID3/reject $null $TOKEN)
Check "이미 승인된 사용자 재승인 #1" (Req POST /users/$UID1/approve $null $TOKEN) 30003
Check "이미 승인된 사용자 재승인 #2" (Req POST /users/$UID2/approve $null $TOKEN) 30003
Check "이미 승인된 사용자 재승인 #3" (Req POST /users/$UID1/approve $null $TOKEN) 30003

Check "반려 후 로그인 차단 #1" (Req POST /auth/login @{ login_id=$U3; password="test1234!" }) 10006
Check "반려 후 로그인 차단 #2" (Req POST /auth/login @{ login_id=$U3; password="test1234!" }) 10006
Check "반려 후 로그인 차단 #3" (Req POST /auth/login @{ login_id=$U3; password="test1234!" }) 10006

# 반려된 사용자를 승인대기로 되돌리기 (PATCH /users/:id, status=0) - 반려 후 재가입 영구 차단 이슈 대응
$r4 = Check "반려 사용자 승인대기로 복귀 #1" (Req PATCH /users/$UID3 @{ status=0 } $TOKEN)
Check       "반려 사용자 승인대기로 복귀 #2" (Req PATCH /users/$UID3 @{ status=0 } $TOKEN)
Check       "반려 사용자 승인대기로 복귀 #3" (Req PATCH /users/$UID3 @{ status=0 } $TOKEN)
if ($r4.data.status -ne 0) { Write-Host "  [FAIL] 승인대기 복귀 미동작 (actual=$($r4.data.status))" -ForegroundColor Red; $script:FAIL++ } else { Write-Host "  [PASS] 승인대기 복귀 확인 (status=0)" -ForegroundColor Green; $script:PASS++ }

Check "승인대기 복귀 후 로그인 차단 #1" (Req POST /auth/login @{ login_id=$U3; password="test1234!" }) 10005
Check "승인대기 복귀 후 로그인 차단 #2" (Req POST /auth/login @{ login_id=$U3; password="test1234!" }) 10005
Check "승인대기 복귀 후 로그인 차단 #3" (Req POST /auth/login @{ login_id=$U3; password="test1234!" }) 10005

Check "승인 후 로그인 #1" (Req POST /auth/login @{ login_id=$U1; password="test1234!" })
Check       "승인 후 로그인 #2" (Req POST /auth/login @{ login_id=$U1; password="test1234!" })
Check       "승인 후 로그인 #3" (Req POST /auth/login @{ login_id=$U1; password="test1234!" })

Check "비밀번호 초기화 #1" (Req POST /users/$UID1/reset-password @{ new_password="reset1234!" } $TOKEN)
Check "비밀번호 초기화 #2" (Req POST /users/$UID2/reset-password @{ new_password="reset1234!" } $TOKEN)
Check "비밀번호 초기화 #3" (Req POST /users/$UID3/reset-password @{ new_password="reset1234!" } $TOKEN)

# DEVELOPER는 본인 소속 회사(company_id=2) 사용자를 status 제한 없이 조회 가능해야 함
$DEV_TOKEN_USER = (Req POST /auth/login @{ login_id="dev"; password="1234" }).data.access_token
1..3 | ForEach-Object {
  $i = $_
  Req POST /auth/signup @{ company_id=2; login_id="devscope${i}_$TS"; password="test1234!"; user_name="DevScope$i"; email="devscope${i}_${TS}@test.com"; phone_number="010-7000-000$i" } | Out-Null
  $devList = Req GET "/users?page=1&page_size=100&status=0" $null $DEV_TOKEN_USER
  $found = $devList.data.items | Where-Object { $_.login_id -eq "devscope${i}_$TS" }
  if ($found) {
    $script:PASS++
    Write-Host "  [PASS] DEVELOPER 승인대기 사용자 목록 조회 #$i" -ForegroundColor Green
  } else {
    $script:FAIL++
    Write-Host "  [FAIL] DEVELOPER 승인대기 사용자 목록 조회 #$i" -ForegroundColor Red
  }
}

# ============================================================
# 7. USER ROLE
# ============================================================
Section "7. USER ROLE"

Check "역할 목록 조회 #1" (Req GET "/user-roles?page=1&page_size=20" $null $TOKEN)
Check "역할 목록 조회 #2" (Req GET "/user-roles?page=1&page_size=20&user_id=$UID1" $null $TOKEN)
Check "역할 목록 조회 #3" (Req GET "/user-roles?page=1&page_size=20&project_id=$PROJID" $null $TOKEN)

Check "역할 부여 #1" (Req POST /user-roles @{ user_id=$UID1; project_id=$PROJID;  role_code=20 } $TOKEN)
Check "역할 부여 #2" (Req POST /user-roles @{ user_id=$UID1; project_id=$PROJID2; role_code=30 } $TOKEN)
Check "역할 부여 #3" (Req POST /user-roles @{ user_id=$UID2; project_id=$PROJID;  role_code=40 } $TOKEN)
Check "역할 부여 실패 - 중복 #1" (Req POST /user-roles @{ user_id=$UID1; project_id=$PROJID;  role_code=20 } $TOKEN) 32001
Check "역할 부여 실패 - 중복 #2" (Req POST /user-roles @{ user_id=$UID1; project_id=$PROJID2; role_code=30 } $TOKEN) 32001
Check "역할 부여 실패 - 중복 #3" (Req POST /user-roles @{ user_id=$UID2; project_id=$PROJID;  role_code=40 } $TOKEN) 32001
Check "역할 수정 #1" (Req PATCH /user-roles/$UID1/$PROJID  @{ role_code=30 } $TOKEN)
Check "역할 수정 #2" (Req PATCH /user-roles/$UID1/$PROJID2 @{ role_code=20 } $TOKEN)
Check "역할 수정 #3" (Req PATCH /user-roles/$UID2/$PROJID  @{ role_code=20 } $TOKEN)

# ============================================================
# 7A. PROJECT-SCOPED ROLE 검증 (교차 프로젝트 권한 차단)
# ============================================================
# UID1은 위 역할 수정으로 PROJID=30(APPROVER), PROJID2=20(DEVELOPER) 보유.
# JWT 전역 role_code는 MIN(30,20)=20(DEVELOPER)이라 라우트 레벨 requireRole만으로는
# PROJID(실제론 APPROVER일 뿐인 프로젝트)에서도 DEVELOPER 쓰기가 통과되어버리는 결함을 검증한다.
Section "7A. PROJECT-SCOPED ROLE 검증"

$ru1 = Req POST /auth/login @{ login_id=$U1; password="reset1234!" }
$TOKEN_U1 = $ru1.data.access_token

$scopeCg = Check "PROJID 코드그룹 생성(SA, 테스트자원) #1" (Req POST /code-groups @{ project_id=$PROJID; code_group_code="SCOPE_CG_$TS"; code_group_name="스코프테스트" } $TOKEN)
$SCOPE_CGID = $scopeCg.data.code_group_id
$scopeApi = Check "PROJID API 생성(SA, 테스트자원) #1" (Req POST /apis @{ project_id=$PROJID; api_code="SCOPE_API_$TS"; api_name="스코프테스트"; endpoint="/v1/scope" } $TOKEN)
$SCOPE_APIID = $scopeApi.data.api_id

Check "교차프로젝트 코드그룹 생성 차단 #1" (Req POST /code-groups @{ project_id=$PROJID; code_group_code="XCG1_$TS"; code_group_name="차단" } $TOKEN_U1) 20001
Check "교차프로젝트 코드그룹 생성 차단 #2" (Req POST /code-groups @{ project_id=$PROJID; code_group_code="XCG2_$TS"; code_group_name="차단" } $TOKEN_U1) 20001
Check "교차프로젝트 코드그룹 생성 차단 #3" (Req POST /code-groups @{ project_id=$PROJID; code_group_code="XCG3_$TS"; code_group_name="차단" } $TOKEN_U1) 20001
Check "교차프로젝트 코드그룹 수정 차단 #1" (Req PATCH /code-groups/$SCOPE_CGID @{ code_group_name="변조시도1" } $TOKEN_U1) 20001
Check "교차프로젝트 코드그룹 수정 차단 #2" (Req PATCH /code-groups/$SCOPE_CGID @{ code_group_name="변조시도2" } $TOKEN_U1) 20001
Check "교차프로젝트 코드그룹 수정 차단 #3" (Req PATCH /code-groups/$SCOPE_CGID @{ code_group_name="변조시도3" } $TOKEN_U1) 20001

Check "교차프로젝트 API 생성 차단 #1" (Req POST /apis @{ project_id=$PROJID; api_code="XA1_$TS"; api_name="차단"; endpoint="/v1/x1" } $TOKEN_U1) 20001
Check "교차프로젝트 API 생성 차단 #2" (Req POST /apis @{ project_id=$PROJID; api_code="XA2_$TS"; api_name="차단"; endpoint="/v1/x2" } $TOKEN_U1) 20001
Check "교차프로젝트 API 생성 차단 #3" (Req POST /apis @{ project_id=$PROJID; api_code="XA3_$TS"; api_name="차단"; endpoint="/v1/x3" } $TOKEN_U1) 20001
Check "교차프로젝트 API 수정 차단 #1" (Req PATCH /apis/$SCOPE_APIID @{ api_name="변조시도1" } $TOKEN_U1) 20001
Check "교차프로젝트 API 수정 차단 #2" (Req PATCH /apis/$SCOPE_APIID @{ api_name="변조시도2" } $TOKEN_U1) 20001
Check "교차프로젝트 API 수정 차단 #3" (Req PATCH /apis/$SCOPE_APIID @{ api_name="변조시도3" } $TOKEN_U1) 20001

$scopeItem = Check "교차프로젝트 코드아이템 생성 차단용 자원(SA) #1" (Req POST /code-items @{ code_group_id=$SCOPE_CGID; code_value="A"; code_name="A"; display_order=1 } $TOKEN)
$SCOPE_ITEMID = $scopeItem.data.code_item_id
Check "교차프로젝트 코드아이템 생성 차단 #1" (Req POST /code-items @{ code_group_id=$SCOPE_CGID; code_value="X1"; code_name="차단"; display_order=1 } $TOKEN_U1) 20001
Check "교차프로젝트 코드아이템 생성 차단 #2" (Req POST /code-items @{ code_group_id=$SCOPE_CGID; code_value="X2"; code_name="차단"; display_order=1 } $TOKEN_U1) 20001
Check "교차프로젝트 코드아이템 생성 차단 #3" (Req POST /code-items @{ code_group_id=$SCOPE_CGID; code_value="X3"; code_name="차단"; display_order=1 } $TOKEN_U1) 20001
Check "교차프로젝트 코드아이템 수정 차단 #1" (Req PATCH /code-items/$SCOPE_ITEMID @{ code_name="변조시도1" } $TOKEN_U1) 20001
Check "교차프로젝트 코드아이템 수정 차단 #2" (Req PATCH /code-items/$SCOPE_ITEMID @{ code_name="변조시도2" } $TOKEN_U1) 20001
Check "교차프로젝트 코드아이템 수정 차단 #3" (Req PATCH /code-items/$SCOPE_ITEMID @{ code_name="변조시도3" } $TOKEN_U1) 20001

$scopeReq = Check "교차프로젝트 Request파라미터 생성 차단용 자원(SA) #1" (Req POST /apis/$SCOPE_APIID/requests @{ parameter_name="p1"; parameter_label="P1"; parameter_type=1; component_type=1; is_required=1; display_order=1 } $TOKEN)
$SCOPE_REQID = $scopeReq.data.api_request_id
Check "교차프로젝트 Request파라미터 생성 차단 #1" (Req POST /apis/$SCOPE_APIID/requests @{ parameter_name="x1"; parameter_label="X1"; parameter_type=1; component_type=1; is_required=1; display_order=1 } $TOKEN_U1) 20001
Check "교차프로젝트 Request파라미터 생성 차단 #2" (Req POST /apis/$SCOPE_APIID/requests @{ parameter_name="x2"; parameter_label="X2"; parameter_type=1; component_type=1; is_required=1; display_order=1 } $TOKEN_U1) 20001
Check "교차프로젝트 Request파라미터 생성 차단 #3" (Req POST /apis/$SCOPE_APIID/requests @{ parameter_name="x3"; parameter_label="X3"; parameter_type=1; component_type=1; is_required=1; display_order=1 } $TOKEN_U1) 20001
Check "교차프로젝트 Request파라미터 수정 차단 #1" (Req PATCH /api-requests/$SCOPE_REQID @{ parameter_label="변조시도1" } $TOKEN_U1) 20001
Check "교차프로젝트 Request파라미터 수정 차단 #2" (Req PATCH /api-requests/$SCOPE_REQID @{ parameter_label="변조시도2" } $TOKEN_U1) 20001
Check "교차프로젝트 Request파라미터 수정 차단 #3" (Req PATCH /api-requests/$SCOPE_REQID @{ parameter_label="변조시도3" } $TOKEN_U1) 20001

$scopeRes = Check "교차프로젝트 Response파라미터 생성 차단용 자원(SA) #1" (Req POST /apis/$SCOPE_APIID/responses @{ parameter_name="r1"; parameter_label="R1"; parameter_type=1; display_order=1 } $TOKEN)
$SCOPE_RESID = $scopeRes.data.api_response_id
Check "교차프로젝트 Response파라미터 생성 차단 #1" (Req POST /apis/$SCOPE_APIID/responses @{ parameter_name="y1"; parameter_label="Y1"; parameter_type=1; display_order=1 } $TOKEN_U1) 20001
Check "교차프로젝트 Response파라미터 생성 차단 #2" (Req POST /apis/$SCOPE_APIID/responses @{ parameter_name="y2"; parameter_label="Y2"; parameter_type=1; display_order=1 } $TOKEN_U1) 20001
Check "교차프로젝트 Response파라미터 생성 차단 #3" (Req POST /apis/$SCOPE_APIID/responses @{ parameter_name="y3"; parameter_label="Y3"; parameter_type=1; display_order=1 } $TOKEN_U1) 20001
Check "교차프로젝트 Response파라미터 수정 차단 #1" (Req PATCH /api-responses/$SCOPE_RESID @{ parameter_label="변조시도1" } $TOKEN_U1) 20001
Check "교차프로젝트 Response파라미터 수정 차단 #2" (Req PATCH /api-responses/$SCOPE_RESID @{ parameter_label="변조시도2" } $TOKEN_U1) 20001
Check "교차프로젝트 Response파라미터 수정 차단 #3" (Req PATCH /api-responses/$SCOPE_RESID @{ parameter_label="변조시도3" } $TOKEN_U1) 20001

# UID1은 PROJID2에서 실제 DEVELOPER(20)이므로 정상 동작해야 함
$okCg = Check "본인프로젝트 코드그룹 생성 정상동작 #1" (Req POST /code-groups @{ project_id=$PROJID2; code_group_code="OK_CG1_$TS"; code_group_name="정상" } $TOKEN_U1)
Check "본인프로젝트 코드그룹 생성 정상동작 #2" (Req POST /code-groups @{ project_id=$PROJID2; code_group_code="OK_CG2_$TS"; code_group_name="정상" } $TOKEN_U1)
Check "본인프로젝트 코드그룹 생성 정상동작 #3" (Req POST /code-groups @{ project_id=$PROJID2; code_group_code="OK_CG3_$TS"; code_group_name="정상" } $TOKEN_U1)
$OK_CGID = $okCg.data.code_group_id
Check "본인프로젝트 코드그룹 수정 정상동작 #1" (Req PATCH /code-groups/$OK_CGID @{ code_group_name="정상수정1" } $TOKEN_U1)
Check "본인프로젝트 코드그룹 수정 정상동작 #2" (Req PATCH /code-groups/$OK_CGID @{ code_group_name="정상수정2" } $TOKEN_U1)
Check "본인프로젝트 코드그룹 수정 정상동작 #3" (Req PATCH /code-groups/$OK_CGID @{ code_group_name="정상수정3" } $TOKEN_U1)

$okApi = Check "본인프로젝트 API 생성 정상동작 #1" (Req POST /apis @{ project_id=$PROJID2; api_code="OK_API1_$TS"; api_name="정상"; endpoint="/v1/ok1" } $TOKEN_U1)
Check "본인프로젝트 API 생성 정상동작 #2" (Req POST /apis @{ project_id=$PROJID2; api_code="OK_API2_$TS"; api_name="정상"; endpoint="/v1/ok2" } $TOKEN_U1)
Check "본인프로젝트 API 생성 정상동작 #3" (Req POST /apis @{ project_id=$PROJID2; api_code="OK_API3_$TS"; api_name="정상"; endpoint="/v1/ok3" } $TOKEN_U1)
$OK_APIID = $okApi.data.api_id
Check "본인프로젝트 API 수정 정상동작 #1" (Req PATCH /apis/$OK_APIID @{ api_name="정상수정1" } $TOKEN_U1)
Check "본인프로젝트 API 수정 정상동작 #2" (Req PATCH /apis/$OK_APIID @{ api_name="정상수정2" } $TOKEN_U1)
Check "본인프로젝트 API 수정 정상동작 #3" (Req PATCH /apis/$OK_APIID @{ api_name="정상수정3" } $TOKEN_U1)

# SUPER_ADMIN은 어느 프로젝트에도 user_role 배정 없이 항상 통과해야 함
Check "SUPER_ADMIN 임의 프로젝트 코드그룹 생성 #1" (Req POST /code-groups @{ project_id=$PROJID;  code_group_code="SA_CG1_$TS"; code_group_name="SA정상" } $TOKEN)
Check "SUPER_ADMIN 임의 프로젝트 코드그룹 생성 #2" (Req POST /code-groups @{ project_id=$PROJID2; code_group_code="SA_CG2_$TS"; code_group_name="SA정상" } $TOKEN)
Check "SUPER_ADMIN 임의 프로젝트 코드그룹 생성 #3" (Req POST /code-groups @{ project_id=$PROJID;  code_group_code="SA_CG3_$TS"; code_group_name="SA정상" } $TOKEN)

# ============================================================
# 7B. 프로젝트 조회 스코핑 (company 소속이 아닌 user_role 기준)
# ============================================================
# UID2는 PROJID에만 role(20=DEVELOPER)이 있고 PROJID2에는 role이 없음 — 같은 회사($CID) 소속이어도
# user_role이 없는 프로젝트는 조회에서 제외되어야 한다 (기존엔 company 소속 전체가 보였음).
# GET /projects, GET /projects/:project_id는 SUPER_ADMIN/DEVELOPER 전용 라우트라 DEVELOPER로 검증(APPROVER/OPERATOR는 403).
Section "7B. 프로젝트 조회 스코핑"

$ru2 = Req POST /auth/login @{ login_id=$U2; password="reset1234!" }
$TOKEN_U2 = $ru2.data.access_token

Check "role 있는 프로젝트 단건조회 #1" (Req GET /projects/$PROJID $null $TOKEN_U2)
Check "role 있는 프로젝트 단건조회 #2" (Req GET /projects/$PROJID $null $TOKEN_U2)
Check "role 있는 프로젝트 단건조회 #3" (Req GET /projects/$PROJID $null $TOKEN_U2)
Check "role 없는 프로젝트 단건조회 차단 #1" (Req GET /projects/$PROJID2 $null $TOKEN_U2) 31002
Check "role 없는 프로젝트 단건조회 차단 #2" (Req GET /projects/$PROJID2 $null $TOKEN_U2) 31002
Check "role 없는 프로젝트 단건조회 차단 #3" (Req GET /projects/$PROJID2 $null $TOKEN_U2) 31002

# ============================================================
# 7B2. 프로젝트 연결정보 수정 (api_base_url, DEVELOPER 자체 관리)
# ============================================================
# UID2는 PROJID에만 DEVELOPER(20) role이 있음 — PROJID(본인 프로젝트)는 수정 성공, PROJID2(무관 프로젝트)는 20001 차단.
# SUPER_ADMIN은 어느 프로젝트든 항상 통과.
Section "7B2. 프로젝트 연결정보 수정"

Check "연결정보 수정 SA #1" (Req PATCH "/projects/$PROJID/connection" @{ api_base_url="http://conn1.test.com" } $TOKEN)
Check "연결정보 수정 SA #2" (Req PATCH "/projects/$PROJID/connection" @{ api_base_url="http://conn2.test.com" } $TOKEN)
Check "연결정보 수정 SA #3" (Req PATCH "/projects/$PROJID/connection" @{ api_base_url="http://conn3.test.com" } $TOKEN)
Check "연결정보 수정 DEVELOPER 본인프로젝트 #1" (Req PATCH "/projects/$PROJID/connection" @{ api_base_url="http://dev-conn1.test.com" } $TOKEN_U2)
Check "연결정보 수정 DEVELOPER 본인프로젝트 #2" (Req PATCH "/projects/$PROJID/connection" @{ api_base_url="http://dev-conn2.test.com" } $TOKEN_U2)
Check "연결정보 수정 DEVELOPER 본인프로젝트 #3" (Req PATCH "/projects/$PROJID/connection" @{ api_base_url="http://dev-conn3.test.com" } $TOKEN_U2)
Check "연결정보 수정 DEVELOPER 무관프로젝트 차단 #1" (Req PATCH "/projects/$PROJID2/connection" @{ api_base_url="http://dev-conn.test.com" } $TOKEN_U2) 20001
Check "연결정보 수정 DEVELOPER 무관프로젝트 차단 #2" (Req PATCH "/projects/$PROJID2/connection" @{ api_base_url="http://dev-conn.test.com" } $TOKEN_U2) 20001
Check "연결정보 수정 DEVELOPER 무관프로젝트 차단 #3" (Req PATCH "/projects/$PROJID2/connection" @{ api_base_url="http://dev-conn.test.com" } $TOKEN_U2) 20001
Check "연결정보 수정 실패 - 필수값 누락 #1" (Req PATCH "/projects/$PROJID/connection" @{} $TOKEN) 30001
Check "연결정보 수정 실패 - 필수값 누락 #2" (Req PATCH "/projects/$PROJID/connection" @{} $TOKEN) 30001
Check "연결정보 수정 실패 - 필수값 누락 #3" (Req PATCH "/projects/$PROJID/connection" @{} $TOKEN) 30001
Check "연결정보 수정 실패 - URL 길이초과 #1" (Req PATCH "/projects/$PROJID/connection" @{ api_base_url=("http://x.com/" + ("a" * 256)) } $TOKEN) 30002
Check "연결정보 수정 실패 - URL 길이초과 #2" (Req PATCH "/projects/$PROJID/connection" @{ api_base_url=("http://x.com/" + ("a" * 256)) } $TOKEN) 30002
Check "연결정보 수정 실패 - URL 길이초과 #3" (Req PATCH "/projects/$PROJID/connection" @{ api_base_url=("http://x.com/" + ("a" * 256)) } $TOKEN) 30002
# 원복 (이후 섹션에서 PROJID/PROJID2의 api_base_url을 그대로 참조하는 케이스가 없어 필수는 아니지만, 상태를 깔끔하게 유지)
Check "연결정보 원복 #1" (Req PATCH "/projects/$PROJID/connection" @{ api_base_url="http://api1.test.com" } $TOKEN)

# ============================================================
# 7B3. 프로젝트 X-API-Key 발급/재발급
# ============================================================
# UID2는 PROJID에만 DEVELOPER(20) role이 있음 — PROJID(본인 프로젝트)는 발급 성공, PROJID2(무관 프로젝트)는 20001 차단.
# 발급 응답에만 평문 api_key가 실리고, 이후 GET에서는 has_api_key만 노출됨과 api_base_url 변경 시 자동폐기까지 함께 검증.
Section "7B3. 프로젝트 X-API-Key 발급"

$ik1 = Check "API 키 발급 SA #1" (Req POST "/projects/$PROJID/api-key" @{} $TOKEN)
Check "API 키 발급 SA #2" (Req POST "/projects/$PROJID/api-key" @{} $TOKEN)
Check "API 키 발급 SA #3" (Req POST "/projects/$PROJID/api-key" @{} $TOKEN)
if ($ik1.data.has_api_key -ne 1 -or -not $ik1.data.api_key -or $ik1.data.api_key.Length -ne 64) { Write-Host "  [FAIL] 발급 응답 형식 불일치 (has_api_key=$($ik1.data.has_api_key), api_key_len=$($ik1.data.api_key.Length))" -ForegroundColor Red; $script:FAIL++ } else { Write-Host "  [PASS] 발급 응답 형식 확인 (has_api_key=1, api_key 64자 hex)" -ForegroundColor Green; $script:PASS++ }

Check "API 키 발급 DEVELOPER 본인프로젝트 #1" (Req POST "/projects/$PROJID/api-key" @{} $TOKEN_U2)
Check "API 키 발급 DEVELOPER 본인프로젝트 #2" (Req POST "/projects/$PROJID/api-key" @{} $TOKEN_U2)
Check "API 키 발급 DEVELOPER 본인프로젝트 #3" (Req POST "/projects/$PROJID/api-key" @{} $TOKEN_U2)
Check "API 키 발급 DEVELOPER 무관프로젝트 차단 #1" (Req POST "/projects/$PROJID2/api-key" @{} $TOKEN_U2) 20001
Check "API 키 발급 DEVELOPER 무관프로젝트 차단 #2" (Req POST "/projects/$PROJID2/api-key" @{} $TOKEN_U2) 20001
Check "API 키 발급 DEVELOPER 무관프로젝트 차단 #3" (Req POST "/projects/$PROJID2/api-key" @{} $TOKEN_U2) 20001

# GET 응답에는 has_api_key만 노출되고 api_key(평문/암호문 어느 쪽도)는 절대 포함되지 않아야 함
$gp1 = Req GET /projects/$PROJID $null $TOKEN
if ($gp1.data.has_api_key -ne 1 -or $null -ne $gp1.data.api_key) { Write-Host "  [FAIL] GET 프로젝트 api_key 비노출 위반 (has_api_key=$($gp1.data.has_api_key), api_key=$($gp1.data.api_key))" -ForegroundColor Red; $script:FAIL++ } else { Write-Host "  [PASS] GET 프로젝트는 has_api_key만 노출, api_key 미포함 확인" -ForegroundColor Green; $script:PASS++ }

# api_base_url 변경 시 api_key 자동 폐기 확인
Check "연결정보 변경으로 API 키 자동폐기 트리거" (Req PATCH "/projects/$PROJID/connection" @{ api_base_url="http://key-revoke-test.com" } $TOKEN)
$gp2 = Req GET /projects/$PROJID $null $TOKEN
if ($gp2.data.has_api_key -ne 0) { Write-Host "  [FAIL] api_base_url 변경 후 api_key 자동폐기 미동작 (has_api_key=$($gp2.data.has_api_key))" -ForegroundColor Red; $script:FAIL++ } else { Write-Host "  [PASS] api_base_url 변경 시 api_key 자동폐기 확인 (has_api_key=0)" -ForegroundColor Green; $script:PASS++ }

# 원복
Check "연결정보 원복 #2" (Req PATCH "/projects/$PROJID/connection" @{ api_base_url="http://api1.test.com" } $TOKEN)

# ============================================================
# 7C. 회사 조회 스코핑 (APPROVER/OPERATOR 허용)
# ============================================================
Section "7C. 회사 조회 스코핑"

$rdev = Req POST /auth/login @{ login_id="dev"; password="1234" }
$rapv = Req POST /auth/login @{ login_id="apv"; password="1234" }
$rop  = Req POST /auth/login @{ login_id="op";  password="1234" }
$TOKEN_DEV0 = $rdev.data.access_token
$TOKEN_APV0 = $rapv.data.access_token
$TOKEN_OP0  = $rop.data.access_token

Check "회사 목록 조회 - DEV #1" (Req GET "/companies?page=1&page_size=20" $null $TOKEN_DEV0)
Check "회사 목록 조회 - APV #1" (Req GET "/companies?page=1&page_size=20" $null $TOKEN_APV0)
Check "회사 목록 조회 - OP  #1" (Req GET "/companies?page=1&page_size=20" $null $TOKEN_OP0)

Check "회사 단건 조회 - APV(본인회사) #1" (Req GET /companies/2 $null $TOKEN_APV0)
Check "회사 단건 조회 - APV(본인회사) #2" (Req GET /companies/2 $null $TOKEN_APV0)
Check "회사 단건 조회 - APV(본인회사) #3" (Req GET /companies/2 $null $TOKEN_APV0)
Check "회사 단건 조회 - OP(본인회사) #1" (Req GET /companies/2 $null $TOKEN_OP0)
Check "회사 단건 조회 - OP(본인회사) #2" (Req GET /companies/2 $null $TOKEN_OP0)
Check "회사 단건 조회 - OP(본인회사) #3" (Req GET /companies/2 $null $TOKEN_OP0)
Check "회사 단건 조회 - APV(타사 차단) #1" (Req GET /companies/1 $null $TOKEN_APV0) 31001
Check "회사 단건 조회 - APV(타사 차단) #2" (Req GET /companies/1 $null $TOKEN_APV0) 31001
Check "회사 단건 조회 - APV(타사 차단) #3" (Req GET /companies/1 $null $TOKEN_APV0) 31001
Check "회사 단건 조회 - OP(타사 차단) #1" (Req GET /companies/1 $null $TOKEN_OP0) 31001
Check "회사 단건 조회 - OP(타사 차단) #2" (Req GET /companies/1 $null $TOKEN_OP0) 31001
Check "회사 단건 조회 - OP(타사 차단) #3" (Req GET /companies/1 $null $TOKEN_OP0) 31001

# ============================================================
# 7D. 내 role_code 조회 (GET /user-roles/me)
# ============================================================
Section "7D. 내 role_code 조회"

$myRoleSA  = Check "내 역할 조회 - SA(배정 없어도 10) #1" (Req GET "/user-roles/me?project_id=$PROJID2" $null $TOKEN)
Check "내 역할 조회 - SA(배정 없어도 10) #2" (Req GET "/user-roles/me?project_id=$PROJID2" $null $TOKEN)
Check "내 역할 조회 - SA(배정 없어도 10) #3" (Req GET "/user-roles/me?project_id=$PROJID2" $null $TOKEN)
if ($myRoleSA.data.role_code -ne 10) { $script:FAIL++; Write-Host "  [FAIL] SA role_code 값 불일치 (expected 10, got $($myRoleSA.data.role_code))" -ForegroundColor Red } else { $script:PASS++; Write-Host "  [PASS] SA role_code 값 확인" -ForegroundColor Green }

$myRoleU1 = Check "내 역할 조회 - role 있음(U1/PROJID2=20) #1" (Req GET "/user-roles/me?project_id=$PROJID2" $null $TOKEN_U1)
Check "내 역할 조회 - role 있음(U1/PROJID2=20) #2" (Req GET "/user-roles/me?project_id=$PROJID2" $null $TOKEN_U1)
Check "내 역할 조회 - role 있음(U1/PROJID2=20) #3" (Req GET "/user-roles/me?project_id=$PROJID2" $null $TOKEN_U1)
if ($myRoleU1.data.role_code -ne 20) { $script:FAIL++; Write-Host "  [FAIL] U1 role_code 값 불일치 (expected 20, got $($myRoleU1.data.role_code))" -ForegroundColor Red } else { $script:PASS++; Write-Host "  [PASS] U1 role_code 값 확인" -ForegroundColor Green }

$myRoleU2 = Check "내 역할 조회 - role 없음(U2/PROJID2=null) #1" (Req GET "/user-roles/me?project_id=$PROJID2" $null $TOKEN_U2)
Check "내 역할 조회 - role 없음(U2/PROJID2=null) #2" (Req GET "/user-roles/me?project_id=$PROJID2" $null $TOKEN_U2)
Check "내 역할 조회 - role 없음(U2/PROJID2=null) #3" (Req GET "/user-roles/me?project_id=$PROJID2" $null $TOKEN_U2)
if ($null -ne $myRoleU2.data.role_code) { $script:FAIL++; Write-Host "  [FAIL] U2 role_code 값 불일치 (expected null, got $($myRoleU2.data.role_code))" -ForegroundColor Red } else { $script:PASS++; Write-Host "  [PASS] U2 role_code null 확인" -ForegroundColor Green }

Check "내 역할 조회 실패 - project_id 누락 #1" (Req GET "/user-roles/me" $null $TOKEN_U1) 30001
Check "내 역할 조회 실패 - project_id 누락 #2" (Req GET "/user-roles/me" $null $TOKEN_U1) 30001
Check "내 역할 조회 실패 - project_id 누락 #3" (Req GET "/user-roles/me" $null $TOKEN_U1) 30001

# ============================================================
# 7E. API/코드그룹/코드아이템 조회(단건·목록) 프로젝트 스코핑 검증
# ============================================================
# GET 계열(SP_GET_API, SP_GET_API_REQUEST/RESPONSE, SP_GET_CODE_GROUP/ITEM,
# SP_GET_CODE_GROUP_LIST/ITEM_LIST, SP_GET_ACTIVE_CODE_ITEMS, SP_GET_ACTIVE_CODE_GROUPS_WITH_ITEMS)는
# 원래 project_id/role 검증이 전혀 없어 ID만 알면 다른 프로젝트 자원도 조회 가능했던 결함을 검증한다.
# U4는 PROJID2에만 실제 DEVELOPER(20) role이 있고 PROJID에는 role이 전혀 없음.
Section "7E. 조회 스코핑 검증 (API/코드그룹/코드아이템)"

$U4 = "tu4_$TS"
Check "회원가입 - U4" (Req POST /auth/signup @{ company_id=$CID; login_id=$U4; password="test1234!"; user_name="TestUser4"; email="t4_${TS}@test.com"; phone_number="010-0000-0004" })
$u4l  = Req GET "/users?page=1&page_size=100" $null $TOKEN
$UID4 = ($u4l.data.items | Where-Object { $_.login_id -eq $U4 }).user_id
Check "사용자 승인 - U4" (Req POST /users/$UID4/approve $null $TOKEN)
Check "역할 부여 - U4@PROJID2 DEVELOPER" (Req POST /user-roles @{ user_id=$UID4; project_id=$PROJID2; role_code=20 } $TOKEN)
$TOKEN_U4 = (Req POST /auth/login @{ login_id=$U4; password="test1234!" }).data.access_token

# --- 단건 조회: PROJID(role 없음) 차단, PROJID2(본인) 정상 ---
Check "교차프로젝트 API 단건조회 차단 #1" (Req GET /apis/$SCOPE_APIID $null $TOKEN_U4) 31006
Check "교차프로젝트 API 단건조회 차단 #2" (Req GET /apis/$SCOPE_APIID $null $TOKEN_U4) 31006
Check "교차프로젝트 API 단건조회 차단 #3" (Req GET /apis/$SCOPE_APIID $null $TOKEN_U4) 31006
Check "본인프로젝트 API 단건조회 정상 #1" (Req GET /apis/$OK_APIID $null $TOKEN_U4)
Check "본인프로젝트 API 단건조회 정상 #2" (Req GET /apis/$OK_APIID $null $TOKEN_U4)
Check "본인프로젝트 API 단건조회 정상 #3" (Req GET /apis/$OK_APIID $null $TOKEN_U4)

Check "교차프로젝트 코드그룹 단건조회 차단 #1" (Req GET /code-groups/$SCOPE_CGID $null $TOKEN_U4) 31004
Check "교차프로젝트 코드그룹 단건조회 차단 #2" (Req GET /code-groups/$SCOPE_CGID $null $TOKEN_U4) 31004
Check "교차프로젝트 코드그룹 단건조회 차단 #3" (Req GET /code-groups/$SCOPE_CGID $null $TOKEN_U4) 31004
Check "본인프로젝트 코드그룹 단건조회 정상 #1" (Req GET /code-groups/$OK_CGID $null $TOKEN_U4)
Check "본인프로젝트 코드그룹 단건조회 정상 #2" (Req GET /code-groups/$OK_CGID $null $TOKEN_U4)
Check "본인프로젝트 코드그룹 단건조회 정상 #3" (Req GET /code-groups/$OK_CGID $null $TOKEN_U4)

Check "교차프로젝트 코드아이템 단건조회 차단 #1" (Req GET /code-items/$SCOPE_ITEMID $null $TOKEN_U4) 31005
Check "교차프로젝트 코드아이템 단건조회 차단 #2" (Req GET /code-items/$SCOPE_ITEMID $null $TOKEN_U4) 31005
Check "교차프로젝트 코드아이템 단건조회 차단 #3" (Req GET /code-items/$SCOPE_ITEMID $null $TOKEN_U4) 31005

Check "교차프로젝트 Request파라미터 단건조회 차단 #1" (Req GET /api-requests/$SCOPE_REQID $null $TOKEN_U4) 31007
Check "교차프로젝트 Request파라미터 단건조회 차단 #2" (Req GET /api-requests/$SCOPE_REQID $null $TOKEN_U4) 31007
Check "교차프로젝트 Request파라미터 단건조회 차단 #3" (Req GET /api-requests/$SCOPE_REQID $null $TOKEN_U4) 31007

Check "교차프로젝트 Response파라미터 단건조회 차단 #1" (Req GET /api-responses/$SCOPE_RESID $null $TOKEN_U4) 31008
Check "교차프로젝트 Response파라미터 단건조회 차단 #2" (Req GET /api-responses/$SCOPE_RESID $null $TOKEN_U4) 31008
Check "교차프로젝트 Response파라미터 단건조회 차단 #3" (Req GET /api-responses/$SCOPE_RESID $null $TOKEN_U4) 31008

# --- 목록 조회: role 없는 프로젝트는 이제 빈 목록이 아니라 20001 에러로 통일됨 ---
Check "코드그룹 목록 교차프로젝트 차단 #1" (Req GET "/code-groups?project_id=$PROJID" $null $TOKEN_U4) 20001
Check "코드그룹 목록 교차프로젝트 차단 #2" (Req GET "/code-groups?project_id=$PROJID" $null $TOKEN_U4) 20001
Check "코드그룹 목록 교차프로젝트 차단 #3" (Req GET "/code-groups?project_id=$PROJID" $null $TOKEN_U4) 20001

$cgListOk = Req GET "/code-groups?project_id=$PROJID2" $null $TOKEN_U4
if (-not ($cgListOk.data.items | Where-Object { $_.code_group_id -eq $OK_CGID })) { $script:FAIL++; Write-Host "  [FAIL] 코드그룹 목록 본인프로젝트 조회 실패" -ForegroundColor Red } else { $script:PASS++; Write-Host "  [PASS] 코드그룹 목록 본인프로젝트 조회 확인" -ForegroundColor Green }

Check "코드아이템 목록 교차프로젝트 차단 #1" (Req GET "/code-items?code_group_id=$SCOPE_CGID" $null $TOKEN_U4) 20001
Check "코드아이템 목록 교차프로젝트 차단 #2" (Req GET "/code-items?code_group_id=$SCOPE_CGID" $null $TOKEN_U4) 20001
Check "코드아이템 목록 교차프로젝트 차단 #3" (Req GET "/code-items?code_group_id=$SCOPE_CGID" $null $TOKEN_U4) 20001

Check "활성 코드아이템 교차프로젝트 차단 #1" (Req GET "/code-groups/$SCOPE_CGID/active-items" $null $TOKEN_U4) 20001
Check "활성 코드아이템 교차프로젝트 차단 #2" (Req GET "/code-groups/$SCOPE_CGID/active-items" $null $TOKEN_U4) 20001
Check "활성 코드아이템 교차프로젝트 차단 #3" (Req GET "/code-groups/$SCOPE_CGID/active-items" $null $TOKEN_U4) 20001

Check "활성 코드그룹+아이템 일괄조회 교차프로젝트 차단 #1" (Req GET "/code-groups/active-with-items?project_id=$PROJID" $null $TOKEN_U4) 20001
Check "활성 코드그룹+아이템 일괄조회 교차프로젝트 차단 #2" (Req GET "/code-groups/active-with-items?project_id=$PROJID" $null $TOKEN_U4) 20001
Check "활성 코드그룹+아이템 일괄조회 교차프로젝트 차단 #3" (Req GET "/code-groups/active-with-items?project_id=$PROJID" $null $TOKEN_U4) 20001

$withItemsOk = Req GET "/code-groups/active-with-items?project_id=$PROJID2" $null $TOKEN_U4
if (-not ($withItemsOk.data.items | Where-Object { $_.code_group_id -eq $OK_CGID })) { $script:FAIL++; Write-Host "  [FAIL] 활성 코드그룹+아이템 일괄조회 본인프로젝트 확인 실패" -ForegroundColor Red } else { $script:PASS++; Write-Host "  [PASS] 활성 코드그룹+아이템 일괄조회 본인프로젝트 확인" -ForegroundColor Green }

# SUPER_ADMIN은 어느 프로젝트든 role 배정과 무관하게 항상 조회 가능해야 함
Check "SUPER_ADMIN 임의 API 단건조회 #1" (Req GET /apis/$SCOPE_APIID $null $TOKEN)
Check "SUPER_ADMIN 임의 API 단건조회 #2" (Req GET /apis/$SCOPE_APIID $null $TOKEN)
Check "SUPER_ADMIN 임의 API 단건조회 #3" (Req GET /apis/$SCOPE_APIID $null $TOKEN)
Check "SUPER_ADMIN 임의 코드그룹 단건조회 #1" (Req GET /code-groups/$SCOPE_CGID $null $TOKEN)
Check "SUPER_ADMIN 임의 코드그룹 단건조회 #2" (Req GET /code-groups/$SCOPE_CGID $null $TOKEN)
Check "SUPER_ADMIN 임의 코드그룹 단건조회 #3" (Req GET /code-groups/$SCOPE_CGID $null $TOKEN)

# ============================================================
# 8. CODE GROUP
# ============================================================
Section "8. CODE GROUP"

$cg1 = Check "코드그룹 생성 #1" (Req POST /code-groups @{ project_id=$PROJID; code_group_code="STATUS"; code_group_name="상태코드"; description="상태 코드 그룹" } $TOKEN)
Check "코드그룹 생성 #2" (Req POST /code-groups @{ project_id=$PROJID; code_group_code="TYPE";   code_group_name="타입코드" } $TOKEN)
Check "코드그룹 생성 #3" (Req POST /code-groups @{ project_id=$PROJID; code_group_code="GRADE";  code_group_name="등급코드" } $TOKEN)
Check "코드그룹 생성 실패 - 중복코드 #1" (Req POST /code-groups @{ project_id=$PROJID; code_group_code="STATUS"; code_group_name="중복" } $TOKEN) 32001
Check "코드그룹 생성 실패 - 중복코드 #2" (Req POST /code-groups @{ project_id=$PROJID; code_group_code="TYPE";   code_group_name="중복" } $TOKEN) 32001
Check "코드그룹 생성 실패 - 중복코드 #3" (Req POST /code-groups @{ project_id=$PROJID; code_group_code="GRADE";  code_group_name="중복" } $TOKEN) 32001

$CGID = $cg1.data.code_group_id

Check "코드그룹 목록 조회 #1" (Req GET "/code-groups?project_id=$PROJID" $null $TOKEN)
Check "코드그룹 목록 조회 #2" (Req GET "/code-groups?project_id=$PROJID&status=1" $null $TOKEN)
Check "코드그룹 목록 조회 #3" (Req GET "/code-groups?project_id=$PROJID" $null $TOKEN)
Check "코드그룹 단건 조회 #1" (Req GET /code-groups/$CGID $null $TOKEN)
Check "코드그룹 단건 조회 #2" (Req GET /code-groups/$CGID $null $TOKEN)
Check "코드그룹 단건 조회 #3" (Req GET /code-groups/$CGID $null $TOKEN)
Check "코드그룹 단건 - 없는 ID #1" (Req GET /code-groups/99991 $null $TOKEN) 31004
Check "코드그룹 단건 - 없는 ID #2" (Req GET /code-groups/99992 $null $TOKEN) 31004
Check "코드그룹 단건 - 없는 ID #3" (Req GET /code-groups/99993 $null $TOKEN) 31004
Check "코드그룹 수정 #1" (Req PATCH /code-groups/$CGID @{ code_group_name="상태코드(수정)" } $TOKEN)
Check "코드그룹 수정 #2" (Req PATCH /code-groups/$CGID @{ description="수정설명" } $TOKEN)
Check "코드그룹 수정 #3" (Req PATCH /code-groups/$CGID @{ code_group_name="STATUS그룹" } $TOKEN)

# ============================================================
# 9. CODE ITEM
# ============================================================
Section "9. CODE ITEM"

$ci1 = Check "코드아이템 생성 #1" (Req POST /code-items @{ code_group_id=$CGID; code_value="ACTIVE";   code_name="활성";   display_order=10 } $TOKEN)
Check "코드아이템 생성 #2" (Req POST /code-items @{ code_group_id=$CGID; code_value="INACTIVE"; code_name="비활성"; display_order=20 } $TOKEN)
Check "코드아이템 생성 #3" (Req POST /code-items @{ code_group_id=$CGID; code_value="DELETED";  code_name="삭제됨"; display_order=30 } $TOKEN)
Check "코드아이템 생성 실패 - 중복값 #1" (Req POST /code-items @{ code_group_id=$CGID; code_value="ACTIVE";   code_name="중복"; display_order=99 } $TOKEN) 32001
Check "코드아이템 생성 실패 - 중복값 #2" (Req POST /code-items @{ code_group_id=$CGID; code_value="INACTIVE"; code_name="중복"; display_order=99 } $TOKEN) 32001
Check "코드아이템 생성 실패 - 중복값 #3" (Req POST /code-items @{ code_group_id=$CGID; code_value="DELETED";  code_name="중복"; display_order=99 } $TOKEN) 32001

$CIID = $ci1.data.code_item_id

Check "코드아이템 목록 조회 #1" (Req GET "/code-items?code_group_id=$CGID" $null $TOKEN)
Check "코드아이템 목록 조회 #2" (Req GET "/code-items?code_group_id=$CGID&status=1" $null $TOKEN)
Check "코드아이템 목록 조회 #3" (Req GET "/code-items?code_group_id=$CGID" $null $TOKEN)
Check "코드아이템 단건 조회 #1" (Req GET /code-items/$CIID $null $TOKEN)
Check "코드아이템 단건 조회 #2" (Req GET /code-items/$CIID $null $TOKEN)
Check "코드아이템 단건 조회 #3" (Req GET /code-items/$CIID $null $TOKEN)
Check "코드아이템 단건 - 없는 ID #1" (Req GET /code-items/99991 $null $TOKEN) 31005
Check "코드아이템 단건 - 없는 ID #2" (Req GET /code-items/99992 $null $TOKEN) 31005
Check "코드아이템 단건 - 없는 ID #3" (Req GET /code-items/99993 $null $TOKEN) 31005
Check "코드아이템 수정 #1" (Req PATCH /code-items/$CIID @{ code_name="활성(수정)" } $TOKEN)
Check "코드아이템 수정 #2" (Req PATCH /code-items/$CIID @{ display_order=5 } $TOKEN)
Check "코드아이템 수정 #3" (Req PATCH /code-items/$CIID @{ code_name="ACTIVE" } $TOKEN)
Check "활성아이템 조회 #1" (Req GET /code-groups/$CGID/active-items $null $TOKEN)
Check "활성아이템 조회 #2" (Req GET /code-groups/$CGID/active-items $null $TOKEN)
Check "활성아이템 조회 #3" (Req GET /code-groups/$CGID/active-items $null $TOKEN)

# ============================================================
# 10. API
# ============================================================
Section "10. API"

$a1 = Check "API 생성 #1" (Req POST /apis @{ project_id=$PROJID; api_code="API1_$TS"; api_name="API1"; endpoint="/api/test1"; is_required_approval=0; response_view_type=1; display_order=10 } $TOKEN)
Check "API 생성 #2" (Req POST /apis @{ project_id=$PROJID; api_code="API2_$TS"; api_name="API2"; endpoint="/api/test2"; is_required_approval=1; response_view_type=2; display_order=20 } $TOKEN)
Check "API 생성 #3" (Req POST /apis @{ project_id=$PROJID; api_code="API3_$TS"; api_name="API3"; endpoint="/api/test3"; description="설명"; display_order=30 } $TOKEN)
Check "API 생성 실패 - 중복코드 #1" (Req POST /apis @{ project_id=$PROJID; api_code="API1_$TS"; api_name="중복"; endpoint="/x" } $TOKEN) 32001
Check "API 생성 실패 - 중복코드 #2" (Req POST /apis @{ project_id=$PROJID; api_code="API2_$TS"; api_name="중복"; endpoint="/x" } $TOKEN) 32001
Check "API 생성 실패 - 중복코드 #3" (Req POST /apis @{ project_id=$PROJID; api_code="API3_$TS"; api_name="중복"; endpoint="/x" } $TOKEN) 32001
Check "API 생성 실패 - 없는 프로젝트 #1" (Req POST /apis @{ project_id=99991; api_code="X1_$TS"; api_name="X"; endpoint="/x" } $TOKEN) 31002
Check "API 생성 실패 - 없는 프로젝트 #2" (Req POST /apis @{ project_id=99992; api_code="X2_$TS"; api_name="X"; endpoint="/x" } $TOKEN) 31002
Check "API 생성 실패 - 없는 프로젝트 #3" (Req POST /apis @{ project_id=99993; api_code="X3_$TS"; api_name="X"; endpoint="/x" } $TOKEN) 31002

$APIID = $a1.data.api_id

Check "API 목록 조회 #1" (Req GET "/apis?project_id=$PROJID&page=1&page_size=20" $null $TOKEN)
Check "API 목록 조회 #2" (Req GET "/apis?project_id=$PROJID&page=1&page_size=20&status=1" $null $TOKEN)
Check "API 목록 조회 #3" (Req GET "/apis?project_id=$PROJID&page=1&page_size=20&api_stage=20" $null $TOKEN)
Check "사이드바 활성 API 조회 #1" (Req GET "/apis/active?project_id=$PROJID" $null $TOKEN)
Check "사이드바 활성 API 조회 #2" (Req GET "/apis/active?project_id=$PROJID" $null $TOKEN)
Check "사이드바 활성 API 조회 #3" (Req GET "/apis/active?project_id=$PROJID" $null $TOKEN)
Check "API 단건 조회 #1" (Req GET /apis/$APIID $null $TOKEN)
Check "API 단건 조회 #2" (Req GET /apis/$APIID $null $TOKEN)
Check "API 단건 조회 #3" (Req GET /apis/$APIID $null $TOKEN)
Check "API 단건 - 없는 ID #1" (Req GET /apis/99991 $null $TOKEN) 31006
Check "API 단건 - 없는 ID #2" (Req GET /apis/99992 $null $TOKEN) 31006
Check "API 단건 - 없는 ID #3" (Req GET /apis/99993 $null $TOKEN) 31006
Check "API 수정 #1" (Req PATCH /apis/$APIID @{ api_name="API1(수정)" } $TOKEN)
Check "API 수정 #2" (Req PATCH /apis/$APIID @{ description="설명추가" } $TOKEN)
Check "API 수정 #3" (Req PATCH /apis/$APIID @{ api_name="API1(최종)" } $TOKEN)
Check "API 수정 - 없는 ID #1" (Req PATCH /apis/99991 @{ api_name="X" } $TOKEN) 31006
Check "API 수정 - 없는 ID #2" (Req PATCH /apis/99992 @{ api_name="X" } $TOKEN) 31006
Check "API 수정 - 없는 ID #3" (Req PATCH /apis/99993 @{ api_name="X" } $TOKEN) 31006

# api_stage 승급: 20 → 30 → 40 (롤백 트리거 필드 변경 없음)
$r1 = Check "api_stage 30 승급 #1" (Req PATCH /apis/$APIID @{ api_stage=30 } $TOKEN)
Check       "api_stage 30 승급 #2" (Req PATCH /apis/$APIID @{ api_stage=30 } $TOKEN)
Check       "api_stage 30 승급 #3" (Req PATCH /apis/$APIID @{ api_stage=30 } $TOKEN)
if ($r1.data.api_stage -ne 30) { Write-Host "  [FAIL] api_stage=30 미반영 (actual=$($r1.data.api_stage))" -ForegroundColor Red; $script:FAIL++ } else { Write-Host "  [PASS] api_stage=30 반영 확인" -ForegroundColor Green; $script:PASS++ }
$r2 = Check "api_stage 40 승급 #1" (Req PATCH /apis/$APIID @{ api_stage=40 } $TOKEN)
Check       "api_stage 40 승급 #2" (Req PATCH /apis/$APIID @{ api_stage=40 } $TOKEN)
Check       "api_stage 40 승급 #3" (Req PATCH /apis/$APIID @{ api_stage=40 } $TOKEN)
if ($r2.data.api_stage -ne 40) { Write-Host "  [FAIL] api_stage=40 미반영 (actual=$($r2.data.api_stage))" -ForegroundColor Red; $script:FAIL++ } else { Write-Host "  [PASS] api_stage=40 반영 확인" -ForegroundColor Green; $script:PASS++ }

# 롤백 트리거: endpoint 변경 시 api_stage 강제 20 복구
$r3 = Check "api_stage 롤백 (endpoint 변경) #1" (Req PATCH /apis/$APIID @{ endpoint="/updated"; api_stage=40 } $TOKEN)
Check       "api_stage 롤백 (endpoint 변경) #2" (Req PATCH /apis/$APIID @{ endpoint="/updated"; api_stage=40 } $TOKEN)
Check       "api_stage 롤백 (endpoint 변경) #3" (Req PATCH /apis/$APIID @{ endpoint="/updated"; api_stage=40 } $TOKEN)
if ($r3.data.api_stage -ne 20) { Write-Host "  [FAIL] api_stage 롤백 미동작 (actual=$($r3.data.api_stage))" -ForegroundColor Red; $script:FAIL++ } else { Write-Host "  [PASS] api_stage 롤백 확인 (endpoint 변경 → 20)" -ForegroundColor Green; $script:PASS++ }

# 롤백 후 재승급: 20 → 40
$r4 = Check "api_stage 재승급 #1" (Req PATCH /apis/$APIID @{ api_stage=40 } $TOKEN)
Check       "api_stage 재승급 #2" (Req PATCH /apis/$APIID @{ api_stage=40 } $TOKEN)
Check       "api_stage 재승급 #3" (Req PATCH /apis/$APIID @{ api_stage=40 } $TOKEN)
if ($r4.data.api_stage -ne 40) { Write-Host "  [FAIL] api_stage 재승급 미반영 (actual=$($r4.data.api_stage))" -ForegroundColor Red; $script:FAIL++ } else { Write-Host "  [PASS] api_stage 재승급 확인" -ForegroundColor Green; $script:PASS++ }

# ============================================================
# 11. API REQUEST
# ============================================================
Section "11. API REQUEST"

$ar1 = Check "API Request 생성 #1" (Req POST /apis/$APIID/requests @{ parameter_name="user_id";    parameter_label="유저ID";   parameter_type=2; component_type=2; display_order=10 } $TOKEN)
Check "API Request 생성 #2" (Req POST /apis/$APIID/requests @{ parameter_name="status";     parameter_label="상태";     parameter_type=1; component_type=5; code_group_id=$CGID; display_order=20 } $TOKEN)
Check "API Request 생성 #3" (Req POST /apis/$APIID/requests @{ parameter_name="start_date"; parameter_label="시작일";   parameter_type=4; component_type=3; display_order=30 } $TOKEN)
Check "API Request 생성 실패 - 중복명 #1" (Req POST /apis/$APIID/requests @{ parameter_name="user_id";    parameter_label="중복"; parameter_type=1; component_type=1 } $TOKEN) 32001
Check "API Request 생성 실패 - 중복명 #2" (Req POST /apis/$APIID/requests @{ parameter_name="status";     parameter_label="중복"; parameter_type=1; component_type=1 } $TOKEN) 32001
Check "API Request 생성 실패 - 중복명 #3" (Req POST /apis/$APIID/requests @{ parameter_name="start_date"; parameter_label="중복"; parameter_type=1; component_type=1 } $TOKEN) 32001
Check "API Request 생성 실패 - SELECT+code_group_id=0 #1" (Req POST /apis/$APIID/requests @{ parameter_name="sel1"; parameter_label="선택1"; parameter_type=1; component_type=5; code_group_id=0 } $TOKEN) 30003
Check "API Request 생성 실패 - SELECT+code_group_id=0 #2" (Req POST /apis/$APIID/requests @{ parameter_name="sel2"; parameter_label="선택2"; parameter_type=1; component_type=6; code_group_id=0 } $TOKEN) 30003
Check "API Request 생성 실패 - SELECT+code_group_id=0 #3" (Req POST /apis/$APIID/requests @{ parameter_name="sel3"; parameter_label="선택3"; parameter_type=1; component_type=7; code_group_id=0 } $TOKEN) 30003
Check "API Request 생성 실패 - 없는 API #1" (Req POST /apis/99991/requests @{ parameter_name="x"; parameter_label="x"; parameter_type=1; component_type=1 } $TOKEN) 31006
Check "API Request 생성 실패 - 없는 API #2" (Req POST /apis/99992/requests @{ parameter_name="x"; parameter_label="x"; parameter_type=1; component_type=1 } $TOKEN) 31006
Check "API Request 생성 실패 - 없는 API #3" (Req POST /apis/99993/requests @{ parameter_name="x"; parameter_label="x"; parameter_type=1; component_type=1 } $TOKEN) 31006

$ARID = $ar1.data.api_request_id

Check "API Request 단건 조회 #1" (Req GET /api-requests/$ARID $null $TOKEN)
Check "API Request 단건 조회 #2" (Req GET /api-requests/$ARID $null $TOKEN)
Check "API Request 단건 조회 #3" (Req GET /api-requests/$ARID $null $TOKEN)
Check "API Request 단건 - 없는 ID #1" (Req GET /api-requests/99991 $null $TOKEN) 31007
Check "API Request 단건 - 없는 ID #2" (Req GET /api-requests/99992 $null $TOKEN) 31007
Check "API Request 단건 - 없는 ID #3" (Req GET /api-requests/99993 $null $TOKEN) 31007
Check "API Request 수정 #1" (Req PATCH /api-requests/$ARID @{ parameter_label="유저ID(수정)" } $TOKEN)
Check "API Request 수정 #2" (Req PATCH /api-requests/$ARID @{ description="설명추가" } $TOKEN)
Check "API Request 수정 #3" (Req PATCH /api-requests/$ARID @{ parameter_label="유저ID(최종)" } $TOKEN)
Check "API Request 수정 - 없는 ID #1" (Req PATCH /api-requests/99991 @{ parameter_label="X" } $TOKEN) 31007
Check "API Request 수정 - 없는 ID #2" (Req PATCH /api-requests/99992 @{ parameter_label="X" } $TOKEN) 31007
Check "API Request 수정 - 없는 ID #3" (Req PATCH /api-requests/99993 @{ parameter_label="X" } $TOKEN) 31007

# ============================================================
# 12. API RESPONSE
# ============================================================
Section "12. API RESPONSE"

$arp1 = Check "API Response 생성 #1" (Req POST /apis/$APIID/responses @{ parameter_name="result_code"; parameter_label="결과코드";   parameter_type=2; display_order=10 } $TOKEN)
Check "API Response 생성 #2" (Req POST /apis/$APIID/responses @{ parameter_name="result_msg";  parameter_label="결과메시지"; parameter_type=1; display_order=20 } $TOKEN)
Check "API Response 생성 #3" (Req POST /apis/$APIID/responses @{ parameter_name="data";        parameter_label="데이터";     parameter_type=6; display_order=30 } $TOKEN)
Check "API Response 생성 실패 - 중복명 #1" (Req POST /apis/$APIID/responses @{ parameter_name="result_code"; parameter_label="중복"; parameter_type=1 } $TOKEN) 32001
Check "API Response 생성 실패 - 중복명 #2" (Req POST /apis/$APIID/responses @{ parameter_name="result_msg";  parameter_label="중복"; parameter_type=1 } $TOKEN) 32001
Check "API Response 생성 실패 - 중복명 #3" (Req POST /apis/$APIID/responses @{ parameter_name="data";        parameter_label="중복"; parameter_type=1 } $TOKEN) 32001
Check "API Response 생성 실패 - 없는 API #1" (Req POST /apis/99991/responses @{ parameter_name="x"; parameter_label="x"; parameter_type=1 } $TOKEN) 31006
Check "API Response 생성 실패 - 없는 API #2" (Req POST /apis/99992/responses @{ parameter_name="x"; parameter_label="x"; parameter_type=1 } $TOKEN) 31006
Check "API Response 생성 실패 - 없는 API #3" (Req POST /apis/99993/responses @{ parameter_name="x"; parameter_label="x"; parameter_type=1 } $TOKEN) 31006

$ARSPID = $arp1.data.api_response_id

Check "API Response 단건 조회 #1" (Req GET /api-responses/$ARSPID $null $TOKEN)
Check "API Response 단건 조회 #2" (Req GET /api-responses/$ARSPID $null $TOKEN)
Check "API Response 단건 조회 #3" (Req GET /api-responses/$ARSPID $null $TOKEN)
Check "API Response 단건 - 없는 ID #1" (Req GET /api-responses/99991 $null $TOKEN) 31008
Check "API Response 단건 - 없는 ID #2" (Req GET /api-responses/99992 $null $TOKEN) 31008
Check "API Response 단건 - 없는 ID #3" (Req GET /api-responses/99993 $null $TOKEN) 31008
Check "API Response 수정 #1" (Req PATCH /api-responses/$ARSPID @{ parameter_label="결과코드(수정)" } $TOKEN)
Check "API Response 수정 #2" (Req PATCH /api-responses/$ARSPID @{ description="설명추가" } $TOKEN)
Check "API Response 수정 #3" (Req PATCH /api-responses/$ARSPID @{ parameter_label="결과코드(최종)" } $TOKEN)
Check "API Response 수정 - 없는 ID #1" (Req PATCH /api-responses/99991 @{ parameter_label="X" } $TOKEN) 31008
Check "API Response 수정 - 없는 ID #2" (Req PATCH /api-responses/99992 @{ parameter_label="X" } $TOKEN) 31008
Check "API Response 수정 - 없는 ID #3" (Req PATCH /api-responses/99993 @{ parameter_label="X" } $TOKEN) 31008

# ============================================================
# 13. API EXECUTION
# ============================================================
Section "13. API EXECUTION"

# --- 역할별 토큰 취득 ---
$TOKEN_DEV = (Req POST /auth/login @{ login_id="dev"; password="1234" }).data.access_token
$TOKEN_APV = (Req POST /auth/login @{ login_id="apv"; password="1234" }).data.access_token
$TOKEN_OP  = (Req POST /auth/login @{ login_id="op";  password="1234" }).data.access_token

# --- 실행 테스트 전용 프로젝트 (api_base_url → test_game_server, 포트 3100) ---
$ep      = Check "실행테스트 프로젝트 생성" (Req POST /projects @{ company_id=2; project_code="EXEC_$TS"; project_name="실행테스트프로젝트"; api_base_url="http://localhost:3100/api" } $TOKEN)
$EXEC_PID = $ep.data.project_id

Check "역할 부여 - dev" (Req POST /user-roles @{ user_id=2; project_id=$EXEC_PID; role_code=20 } $TOKEN)
Check "역할 부여 - apv" (Req POST /user-roles @{ user_id=3; project_id=$EXEC_PID; role_code=30 } $TOKEN)
Check "역할 부여 - op"  (Req POST /user-roles @{ user_id=4; project_id=$EXEC_PID; role_code=40 } $TOKEN)

# --- 실행용 API 생성 ---
# 즉시실행: api_stage=40(운영), is_required_approval=0 → 전체 역할 즉시 HTTP 호출
# SP_CREATE_API는 api_stage를 항상 20으로 생성 → PATCH로 40 승급
$ea1 = Check "즉시실행 API 생성" (Req POST /apis @{ project_id=$EXEC_PID; api_code="IMMED_$TS"; api_name="즉시실행API"; endpoint="/get-user"; is_required_approval=0 } $TOKEN)
$EAID_IMMED = $ea1.data.api_id
Check "즉시실행 API api_stage=40" (Req PATCH /apis/$EAID_IMMED @{ api_stage=40 } $TOKEN)

# 승인필요: api_stage=40(운영), is_required_approval=1 → OP는 PENDING 생성
$ea2 = Check "승인필요 API 생성" (Req POST /apis @{ project_id=$EXEC_PID; api_code="APPR_$TS";  api_name="승인필요API"; endpoint="/get-user"; is_required_approval=1 } $TOKEN)
$EAID_APPR = $ea2.data.api_id
Check "승인필요 API api_stage=40" (Req PATCH /apis/$EAID_APPR @{ api_stage=40 } $TOKEN)

# 개발단계: api_stage=20(기본값) → SA/DEV만 실행 가능
$ea3 = Check "개발단계 API 생성" (Req POST /apis @{ project_id=$EXEC_PID; api_code="STG20_$TS"; api_name="개발단계API"; endpoint="/get-user"; is_required_approval=0 } $TOKEN)
$EAID_STG20 = $ea3.data.api_id

# -------------------------------------------------------
# Flow A: 즉시실행 — SA / DEV / APV / OP (api_stage=40, approval=0)
# -------------------------------------------------------
$ex_sa = Check "즉시실행 SA  #1" (Req POST /apis/$EAID_IMMED/execute @{ request_json=@{ user_id=1 } } $TOKEN)
Check          "즉시실행 SA  #2" (Req POST /apis/$EAID_IMMED/execute @{ request_json=@{ user_id=1 } } $TOKEN)
Check          "즉시실행 SA  #3" (Req POST /apis/$EAID_IMMED/execute @{ request_json=@{ user_id=1 } } $TOKEN)
Check "즉시실행 DEV #1" (Req POST /apis/$EAID_IMMED/execute @{ request_json=@{ user_id=1 } } $TOKEN_DEV)
Check "즉시실행 DEV #2" (Req POST /apis/$EAID_IMMED/execute @{ request_json=@{ user_id=1 } } $TOKEN_DEV)
Check "즉시실행 DEV #3" (Req POST /apis/$EAID_IMMED/execute @{ request_json=@{ user_id=1 } } $TOKEN_DEV)
Check "즉시실행 APV #1" (Req POST /apis/$EAID_IMMED/execute @{ request_json=@{ user_id=1 } } $TOKEN_APV)
Check "즉시실행 APV #2" (Req POST /apis/$EAID_IMMED/execute @{ request_json=@{ user_id=1 } } $TOKEN_APV)
Check "즉시실행 APV #3" (Req POST /apis/$EAID_IMMED/execute @{ request_json=@{ user_id=1 } } $TOKEN_APV)
Check "즉시실행 OP  #1" (Req POST /apis/$EAID_IMMED/execute @{ request_json=@{ user_id=1 } } $TOKEN_OP)
Check "즉시실행 OP  #2" (Req POST /apis/$EAID_IMMED/execute @{ request_json=@{ user_id=1 } } $TOKEN_OP)
Check "즉시실행 OP  #3" (Req POST /apis/$EAID_IMMED/execute @{ request_json=@{ user_id=1 } } $TOKEN_OP)
$EX_SA_ID = $ex_sa.data.api_execution_id

# -------------------------------------------------------
# Flow B: api_stage 접근 제어 (api_stage=20 → SA/DEV만 가능)
# -------------------------------------------------------
Check "api_stage=20 SA  실행 #1" (Req POST /apis/$EAID_STG20/execute @{ request_json=@{ user_id=1 } } $TOKEN)
Check "api_stage=20 SA  실행 #2" (Req POST /apis/$EAID_STG20/execute @{ request_json=@{ user_id=1 } } $TOKEN)
Check "api_stage=20 SA  실행 #3" (Req POST /apis/$EAID_STG20/execute @{ request_json=@{ user_id=1 } } $TOKEN)
Check "api_stage=20 DEV 실행 #1" (Req POST /apis/$EAID_STG20/execute @{ request_json=@{ user_id=1 } } $TOKEN_DEV)
Check "api_stage=20 DEV 실행 #2" (Req POST /apis/$EAID_STG20/execute @{ request_json=@{ user_id=1 } } $TOKEN_DEV)
Check "api_stage=20 DEV 실행 #3" (Req POST /apis/$EAID_STG20/execute @{ request_json=@{ user_id=1 } } $TOKEN_DEV)
Check "api_stage=20 APV 차단 #1" (Req POST /apis/$EAID_STG20/execute @{ request_json=@{ user_id=1 } } $TOKEN_APV) 20001
Check "api_stage=20 APV 차단 #2" (Req POST /apis/$EAID_STG20/execute @{ request_json=@{ user_id=1 } } $TOKEN_APV) 20001
Check "api_stage=20 APV 차단 #3" (Req POST /apis/$EAID_STG20/execute @{ request_json=@{ user_id=1 } } $TOKEN_APV) 20001
Check "api_stage=20 OP  차단 #1" (Req POST /apis/$EAID_STG20/execute @{ request_json=@{ user_id=1 } } $TOKEN_OP)  20001
Check "api_stage=20 OP  차단 #2" (Req POST /apis/$EAID_STG20/execute @{ request_json=@{ user_id=1 } } $TOKEN_OP)  20001
Check "api_stage=20 OP  차단 #3" (Req POST /apis/$EAID_STG20/execute @{ request_json=@{ user_id=1 } } $TOKEN_OP)  20001

# -------------------------------------------------------
# Flow C: PENDING → 승인 → SUCCESS  (OP 실행, SA 승인)
# -------------------------------------------------------
$pend1 = Check "PENDING 생성 OP #1" (Req POST /apis/$EAID_APPR/execute @{ request_json=@{ user_id=1 } } $TOKEN_OP)
$pend2 = Check "PENDING 생성 OP #2" (Req POST /apis/$EAID_APPR/execute @{ request_json=@{ user_id=1 } } $TOKEN_OP)
$pend3 = Check "PENDING 생성 OP #3" (Req POST /apis/$EAID_APPR/execute @{ request_json=@{ user_id=1 } } $TOKEN_OP)
$PEND1_ID = $pend1.data.api_execution_id
$PEND2_ID = $pend2.data.api_execution_id
$PEND3_ID = $pend3.data.api_execution_id

Check "PENDING 목록 SA  #1" (Req GET "/api-executions/pending?project_id=$EXEC_PID&page=1&page_size=20" $null $TOKEN)
Check "PENDING 목록 SA  #2" (Req GET "/api-executions/pending?project_id=$EXEC_PID&page=1&page_size=20" $null $TOKEN)
Check "PENDING 목록 SA  #3" (Req GET "/api-executions/pending?project_id=$EXEC_PID&page=1&page_size=20" $null $TOKEN)
Check "PENDING 목록 APV #1" (Req GET "/api-executions/pending?project_id=$EXEC_PID&page=1&page_size=20" $null $TOKEN_APV)
Check "PENDING 목록 APV #2" (Req GET "/api-executions/pending?project_id=$EXEC_PID&page=1&page_size=20" $null $TOKEN_APV)
Check "PENDING 목록 APV #3" (Req GET "/api-executions/pending?project_id=$EXEC_PID&page=1&page_size=20" $null $TOKEN_APV)

Check "승인 SA #1" (Req POST /api-executions/$PEND1_ID/approve $null $TOKEN)
Check "승인 SA #2" (Req POST /api-executions/$PEND1_ID/approve $null $TOKEN) 31009  # 이미 처리된 건
Check "승인 SA #3" (Req POST /api-executions/$PEND1_ID/approve $null $TOKEN) 31009

# -------------------------------------------------------
# Flow D: PENDING → 반려  (OP 실행, APV 반려)
# -------------------------------------------------------
Check "반려 APV #1" (Req POST /api-executions/$PEND2_ID/reject @{ reject_reason="테스트 반려" } $TOKEN_APV)
Check "반려 APV #2" (Req POST /api-executions/$PEND2_ID/reject @{ reject_reason="재시도" }     $TOKEN_APV) 31009
Check "반려 APV #3" (Req POST /api-executions/$PEND2_ID/reject @{ reject_reason="재시도" }     $TOKEN_APV) 31009

# -------------------------------------------------------
# Flow E: PENDING → 취소  (OP 본인만 가능)
# -------------------------------------------------------
# 타인(SA)이 먼저 시도 → 차단
Check "취소 타인 차단 SA #1" (Req POST /api-executions/$PEND3_ID/cancel @{ reject_reason="타인취소" } $TOKEN)    31009
Check "취소 타인 차단 SA #2" (Req POST /api-executions/$PEND3_ID/cancel @{ reject_reason="타인취소" } $TOKEN)    31009
Check "취소 타인 차단 SA #3" (Req POST /api-executions/$PEND3_ID/cancel @{ reject_reason="타인취소" } $TOKEN)    31009
# 본인(OP) 취소 → 성공
Check "취소 OP 본인 #1" (Req POST /api-executions/$PEND3_ID/cancel @{ reject_reason="사용자 취소" } $TOKEN_OP)
Check "취소 OP 본인 #2" (Req POST /api-executions/$PEND3_ID/cancel @{ reject_reason="재시도" }     $TOKEN_OP) 31009
Check "취소 OP 본인 #3" (Req POST /api-executions/$PEND3_ID/cancel @{ reject_reason="재시도" }     $TOKEN_OP) 31009

# -------------------------------------------------------
# Flow F: 실행 이력 조회 / OPERATOR 가시성
# -------------------------------------------------------
Check "실행 상세 SA  #1" (Req GET /api-executions/$EX_SA_ID $null $TOKEN)
Check "실행 상세 SA  #2" (Req GET /api-executions/$EX_SA_ID $null $TOKEN)
Check "실행 상세 SA  #3" (Req GET /api-executions/$EX_SA_ID $null $TOKEN)
# OP가 SA의 실행 이력 조회 → 본인 건 아니므로 차단
Check "실행 상세 OP→SA건 차단 #1" (Req GET /api-executions/$EX_SA_ID $null $TOKEN_OP) 31009
Check "실행 상세 OP→SA건 차단 #2" (Req GET /api-executions/$EX_SA_ID $null $TOKEN_OP) 31009
Check "실행 상세 OP→SA건 차단 #3" (Req GET /api-executions/$EX_SA_ID $null $TOKEN_OP) 31009
Check "실행 이력 목록 SA  #1" (Req GET "/api-executions?project_id=$EXEC_PID&page=1&page_size=20" $null $TOKEN)
Check "실행 이력 목록 SA  #2" (Req GET "/api-executions?project_id=$EXEC_PID&page=1&page_size=20" $null $TOKEN)
Check "실행 이력 목록 SA  #3" (Req GET "/api-executions?project_id=$EXEC_PID&page=1&page_size=20" $null $TOKEN)
Check "실행 이력 목록 DEV #1" (Req GET "/api-executions?project_id=$EXEC_PID&page=1&page_size=20" $null $TOKEN_DEV)
Check "실행 이력 목록 DEV #2" (Req GET "/api-executions?project_id=$EXEC_PID&page=1&page_size=20" $null $TOKEN_DEV)
Check "실행 이력 목록 DEV #3" (Req GET "/api-executions?project_id=$EXEC_PID&page=1&page_size=20" $null $TOKEN_DEV)
# OP: request_user_id 자동 강제 적용 → 본인 건만 반환
Check "실행 이력 목록 OP  #1" (Req GET "/api-executions?project_id=$EXEC_PID&page=1&page_size=20" $null $TOKEN_OP)
Check "실행 이력 목록 OP  #2" (Req GET "/api-executions?project_id=$EXEC_PID&page=1&page_size=20" $null $TOKEN_OP)
Check "실행 이력 목록 OP  #3" (Req GET "/api-executions?project_id=$EXEC_PID&page=1&page_size=20" $null $TOKEN_OP)
Check "실행 상세 없는 ID #1" (Req GET /api-executions/99991 $null $TOKEN) 31009
Check "실행 상세 없는 ID #2" (Req GET /api-executions/99992 $null $TOKEN) 31009
Check "실행 상세 없는 ID #3" (Req GET /api-executions/99993 $null $TOKEN) 31009

# ============================================================
# 13A. API EXECUTION 프로젝트 스코핑 검증
# ============================================================
# 세션 role_code(가진 프로젝트 중 최고 권한)만으로 실행 생성(api_stage 게이트)·승인·반려를 판정하면,
# 다른 프로젝트에서 얻은 권한으로 이 프로젝트의 게이트를 통과할 수 있었던 결함(SP_CREATE_API_EXECUTION,
# SP_APPROVE_API_EXECUTION, SP_REJECT_API_EXECUTION 수정 건)을 검증한다.
Section "13A. API EXECUTION 프로젝트 스코핑 검증"

$spA = Check "스코핑 프로젝트A 생성" (Req POST /projects @{ company_id=$CID; project_code="SCOPEA_$TS"; project_name="ScopeProjectA"; api_base_url="http://localhost:3100/api" } $TOKEN)
$SCOPE_PID_A = $spA.data.project_id
$spB = Check "스코핑 프로젝트B 생성" (Req POST /projects @{ company_id=$CID; project_code="SCOPEB_$TS"; project_name="ScopeProjectB"; api_base_url="http://localhost:3100/api" } $TOKEN)
$SCOPE_PID_B = $spB.data.project_id

$SU_EXEC = "scopeexec_$TS"; $SU_APV = "scopeapv_$TS"; $SU_OP = "scopeop_$TS"
Check "스코핑 사용자 가입 - exec" (Req POST /auth/signup @{ company_id=$CID; login_id=$SU_EXEC; password="test1234!"; user_name="ScopeExecUser"; email="scopeexec_${TS}@test.com"; phone_number="010-1000-0001" })
Check "스코핑 사용자 가입 - apv"  (Req POST /auth/signup @{ company_id=$CID; login_id=$SU_APV;  password="test1234!"; user_name="ScopeApvUser";  email="scopeapv_${TS}@test.com";  phone_number="010-1000-0002" })
Check "스코핑 사용자 가입 - op"   (Req POST /auth/signup @{ company_id=$CID; login_id=$SU_OP;   password="test1234!"; user_name="ScopeOpUser";   email="scopeop_${TS}@test.com";   phone_number="010-1000-0003" })

$scopeUl    = Req GET "/users?page=1&page_size=100" $null $TOKEN
$scopeUsers = $scopeUl.data.items
$SUID_EXEC = ($scopeUsers | Where-Object { $_.login_id -eq $SU_EXEC }).user_id
$SUID_APV  = ($scopeUsers | Where-Object { $_.login_id -eq $SU_APV  }).user_id
$SUID_OP   = ($scopeUsers | Where-Object { $_.login_id -eq $SU_OP   }).user_id

Check "스코핑 사용자 승인 - exec" (Req POST /users/$SUID_EXEC/approve $null $TOKEN)
Check "스코핑 사용자 승인 - apv"  (Req POST /users/$SUID_APV/approve $null $TOKEN)
Check "스코핑 사용자 승인 - op"   (Req POST /users/$SUID_OP/approve $null $TOKEN)

# exec: A에서 실제 DEVELOPER(20), B에서 실제 APPROVER(30) — 세션 role_code는 MIN(20,30)=20(DEVELOPER)
Check "역할 부여 - exec@A DEVELOPER" (Req POST /user-roles @{ user_id=$SUID_EXEC; project_id=$SCOPE_PID_A; role_code=20 } $TOKEN)
Check "역할 부여 - exec@B APPROVER" (Req POST /user-roles @{ user_id=$SUID_EXEC; project_id=$SCOPE_PID_B; role_code=30 } $TOKEN)
# apv: A에서만 실제 APPROVER(30), B에는 role 자체가 없음
Check "역할 부여 - apv@A APPROVER"  (Req POST /user-roles @{ user_id=$SUID_APV; project_id=$SCOPE_PID_A; role_code=30 } $TOKEN)
# op: A, B 둘 다 OPERATOR(40) — 승인대기 생성용
Check "역할 부여 - op@A OPERATOR"   (Req POST /user-roles @{ user_id=$SUID_OP; project_id=$SCOPE_PID_A; role_code=40 } $TOKEN)
Check "역할 부여 - op@B OPERATOR"   (Req POST /user-roles @{ user_id=$SUID_OP; project_id=$SCOPE_PID_B; role_code=40 } $TOKEN)

$TOKEN_SCOPE_EXEC = (Req POST /auth/login @{ login_id=$SU_EXEC; password="test1234!" }).data.access_token
$TOKEN_SCOPE_APV  = (Req POST /auth/login @{ login_id=$SU_APV;  password="test1234!" }).data.access_token
$TOKEN_SCOPE_OP   = (Req POST /auth/login @{ login_id=$SU_OP;   password="test1234!" }).data.access_token

# --- 실행 게이트(api_stage=20, 신규 생성 시 기본값) 테스트용 API ---
$eaA = Check "스코핑 stage20 API 생성 - A" (Req POST /apis @{ project_id=$SCOPE_PID_A; api_code="SCOPE_STG20_A_$TS"; api_name="ScopeStage20A"; endpoint="/get-user"; is_required_approval=0 } $TOKEN)
$EA_STG20_A = $eaA.data.api_id
$eaB = Check "스코핑 stage20 API 생성 - B" (Req POST /apis @{ project_id=$SCOPE_PID_B; api_code="SCOPE_STG20_B_$TS"; api_name="ScopeStage20B"; endpoint="/get-user"; is_required_approval=0 } $TOKEN)
$EA_STG20_B = $eaB.data.api_id

# exec: A에서는 실제 DEVELOPER이므로 stage20 정상 실행
Check "스코핑 실행 - 본인프로젝트(A) 정상 #1" (Req POST /apis/$EA_STG20_A/execute @{ request_json=@{ user_id=1 } } $TOKEN_SCOPE_EXEC)
Check "스코핑 실행 - 본인프로젝트(A) 정상 #2" (Req POST /apis/$EA_STG20_A/execute @{ request_json=@{ user_id=1 } } $TOKEN_SCOPE_EXEC)
Check "스코핑 실행 - 본인프로젝트(A) 정상 #3" (Req POST /apis/$EA_STG20_A/execute @{ request_json=@{ user_id=1 } } $TOKEN_SCOPE_EXEC)
# exec: B에서는 실제 APPROVER(30)일 뿐이라 stage20 실행 불가해야 함
# (세션 role_code=20을 그대로 신뢰하던 구버전 SP였다면 여기서 잘못 허용됨 — 회귀 검증 포인트)
Check "스코핑 실행 - 교차프로젝트(B) 차단 #1" (Req POST /apis/$EA_STG20_B/execute @{ request_json=@{ user_id=1 } } $TOKEN_SCOPE_EXEC) 20001
Check "스코핑 실행 - 교차프로젝트(B) 차단 #2" (Req POST /apis/$EA_STG20_B/execute @{ request_json=@{ user_id=1 } } $TOKEN_SCOPE_EXEC) 20001
Check "스코핑 실행 - 교차프로젝트(B) 차단 #3" (Req POST /apis/$EA_STG20_B/execute @{ request_json=@{ user_id=1 } } $TOKEN_SCOPE_EXEC) 20001
# SUPER_ADMIN은 B에 user_role이 전혀 없어도 항상 통과해야 함
Check "스코핑 실행 - SUPER_ADMIN B 정상 #1" (Req POST /apis/$EA_STG20_B/execute @{ request_json=@{ user_id=1 } } $TOKEN)
Check "스코핑 실행 - SUPER_ADMIN B 정상 #2" (Req POST /apis/$EA_STG20_B/execute @{ request_json=@{ user_id=1 } } $TOKEN)
Check "스코핑 실행 - SUPER_ADMIN B 정상 #3" (Req POST /apis/$EA_STG20_B/execute @{ request_json=@{ user_id=1 } } $TOKEN)

# --- 승인/반려 게이트 테스트용 API (승인필요 + OPERATOR 실행 → PENDING) ---
$eapprA = Check "스코핑 승인필요 API 생성 - A" (Req POST /apis @{ project_id=$SCOPE_PID_A; api_code="SCOPE_APPR_A_$TS"; api_name="ScopeApprA"; endpoint="/get-user"; is_required_approval=1 } $TOKEN)
$EA_APPR_A = $eapprA.data.api_id
Check "스코핑 승인필요 API stage40 - A" (Req PATCH /apis/$EA_APPR_A @{ api_stage=40 } $TOKEN)
$eapprB = Check "스코핑 승인필요 API 생성 - B" (Req POST /apis @{ project_id=$SCOPE_PID_B; api_code="SCOPE_APPR_B_$TS"; api_name="ScopeApprB"; endpoint="/get-user"; is_required_approval=1 } $TOKEN)
$EA_APPR_B = $eapprB.data.api_id
Check "스코핑 승인필요 API stage40 - B" (Req PATCH /apis/$EA_APPR_B @{ api_stage=40 } $TOKEN)

$pendA  = Check "스코핑 승인대기 생성 - A"        (Req POST /apis/$EA_APPR_A/execute @{ request_json=@{ user_id=1 } } $TOKEN_SCOPE_OP)
$SCOPE_PEND_A = $pendA.data.api_execution_id
$pendB1 = Check "스코핑 승인대기 생성 - B(반려용)" (Req POST /apis/$EA_APPR_B/execute @{ request_json=@{ user_id=1 } } $TOKEN_SCOPE_OP)
$SCOPE_PEND_B1 = $pendB1.data.api_execution_id
$pendB2 = Check "스코핑 승인대기 생성 - B(승인용)" (Req POST /apis/$EA_APPR_B/execute @{ request_json=@{ user_id=1 } } $TOKEN_SCOPE_OP)
$SCOPE_PEND_B2 = $pendB2.data.api_execution_id

# apv: A에서는 실제 APPROVER이므로 정상 승인
Check "스코핑 승인 - 본인프로젝트(A) 정상" (Req POST /api-executions/$SCOPE_PEND_A/approve $null $TOKEN_SCOPE_APV)
# apv: B에는 role 자체가 없음 — 세션 role_code(30, A의 APPROVER)만으로 통과하면 회귀
Check "스코핑 반려 - 교차프로젝트(B) 차단 #1" (Req POST /api-executions/$SCOPE_PEND_B1/reject @{ reject_reason="cross-project attempt" } $TOKEN_SCOPE_APV) 31009
Check "스코핑 반려 - 교차프로젝트(B) 차단 #2" (Req POST /api-executions/$SCOPE_PEND_B1/reject @{ reject_reason="cross-project attempt" } $TOKEN_SCOPE_APV) 31009
Check "스코핑 반려 - 교차프로젝트(B) 차단 #3" (Req POST /api-executions/$SCOPE_PEND_B1/reject @{ reject_reason="cross-project attempt" } $TOKEN_SCOPE_APV) 31009
Check "스코핑 승인 - 교차프로젝트(B) 차단 #1" (Req POST /api-executions/$SCOPE_PEND_B2/approve $null $TOKEN_SCOPE_APV) 31009
Check "스코핑 승인 - 교차프로젝트(B) 차단 #2" (Req POST /api-executions/$SCOPE_PEND_B2/approve $null $TOKEN_SCOPE_APV) 31009
Check "스코핑 승인 - 교차프로젝트(B) 차단 #3" (Req POST /api-executions/$SCOPE_PEND_B2/approve $null $TOKEN_SCOPE_APV) 31009
# SUPER_ADMIN은 B에 user_role이 없어도 정상 승인 가능해야 함
Check "스코핑 승인 - SUPER_ADMIN B 정상" (Req POST /api-executions/$SCOPE_PEND_B2/approve $null $TOKEN)

# ============================================================
# 13B. API EXECUTION 조회 스코핑 검증 (company 단위 → project 단위로 좁힘)
# ============================================================
# 기존엔 project.company_id 일치만 검사해 같은 회사면 role 없는 프로젝트의 실행이력도 조회 가능했다.
# apv는 A에서만 실제 APPROVER(30), B에는 role 자체가 없음 — user_role 기준으로 조회도 차단되어야 한다.
# SCOPE_PEND_B1은 위 반려 시도가 31009로 차단되어 여전히 PENDING(10) 상태로 남아있다.
Section "13B. API EXECUTION 조회 스코핑 검증"

Check "실행이력 단건조회 - 본인프로젝트(A) 정상 #1" (Req GET /api-executions/$SCOPE_PEND_A $null $TOKEN_SCOPE_APV)
Check "실행이력 단건조회 - 본인프로젝트(A) 정상 #2" (Req GET /api-executions/$SCOPE_PEND_A $null $TOKEN_SCOPE_APV)
Check "실행이력 단건조회 - 본인프로젝트(A) 정상 #3" (Req GET /api-executions/$SCOPE_PEND_A $null $TOKEN_SCOPE_APV)
Check "실행이력 단건조회 - 교차프로젝트(B) 차단 #1" (Req GET /api-executions/$SCOPE_PEND_B2 $null $TOKEN_SCOPE_APV) 20001
Check "실행이력 단건조회 - 교차프로젝트(B) 차단 #2" (Req GET /api-executions/$SCOPE_PEND_B2 $null $TOKEN_SCOPE_APV) 20001
Check "실행이력 단건조회 - 교차프로젝트(B) 차단 #3" (Req GET /api-executions/$SCOPE_PEND_B2 $null $TOKEN_SCOPE_APV) 20001
Check "실행이력 단건조회 - SUPER_ADMIN B 정상 #1" (Req GET /api-executions/$SCOPE_PEND_B2 $null $TOKEN)
Check "실행이력 단건조회 - SUPER_ADMIN B 정상 #2" (Req GET /api-executions/$SCOPE_PEND_B2 $null $TOKEN)
Check "실행이력 단건조회 - SUPER_ADMIN B 정상 #3" (Req GET /api-executions/$SCOPE_PEND_B2 $null $TOKEN)

$elA = Req GET "/api-executions?project_id=$SCOPE_PID_A&page=1&page_size=20" $null $TOKEN_SCOPE_APV
if ($elA.data.total_count -lt 1) { $script:FAIL++; Write-Host "  [FAIL] 실행이력 목록 본인프로젝트(A) 조회 실패 (total_count=$($elA.data.total_count))" -ForegroundColor Red } else { $script:PASS++; Write-Host "  [PASS] 실행이력 목록 본인프로젝트(A) 조회 확인 (total_count=$($elA.data.total_count))" -ForegroundColor Green }

Check "실행이력 목록 교차프로젝트(B) 차단 #1" (Req GET "/api-executions?project_id=$SCOPE_PID_B&page=1&page_size=20" $null $TOKEN_SCOPE_APV) 20001
Check "실행이력 목록 교차프로젝트(B) 차단 #2" (Req GET "/api-executions?project_id=$SCOPE_PID_B&page=1&page_size=20" $null $TOKEN_SCOPE_APV) 20001
Check "실행이력 목록 교차프로젝트(B) 차단 #3" (Req GET "/api-executions?project_id=$SCOPE_PID_B&page=1&page_size=20" $null $TOKEN_SCOPE_APV) 20001

Check "승인대기 목록 교차프로젝트(B) 차단 #1" (Req GET "/api-executions/pending?project_id=$SCOPE_PID_B&page=1&page_size=20" $null $TOKEN_SCOPE_APV) 20001
Check "승인대기 목록 교차프로젝트(B) 차단 #2" (Req GET "/api-executions/pending?project_id=$SCOPE_PID_B&page=1&page_size=20" $null $TOKEN_SCOPE_APV) 20001
Check "승인대기 목록 교차프로젝트(B) 차단 #3" (Req GET "/api-executions/pending?project_id=$SCOPE_PID_B&page=1&page_size=20" $null $TOKEN_SCOPE_APV) 20001

$penBSA = Req GET "/api-executions/pending?project_id=$SCOPE_PID_B&page=1&page_size=20" $null $TOKEN
if ($penBSA.data.total_count -lt 1) { $script:FAIL++; Write-Host "  [FAIL] SUPER_ADMIN 승인대기 목록(B) 조회 실패 (실제로 SCOPE_PEND_B1이 PENDING으로 남아있어야 함)" -ForegroundColor Red } else { $script:PASS++; Write-Host "  [PASS] SUPER_ADMIN 승인대기 목록(B) 조회 확인 (total_count=$($penBSA.data.total_count))" -ForegroundColor Green }

# ============================================================
# 14. AUDIT LOG
# ============================================================
Section "14. AUDIT LOG"

# fire-and-forget 로그가 DB에 반영될 시간 확보
Start-Sleep -Seconds 1

# 목록 조회 - SA (전체)
$la = Check "로그 목록 SA #1"  (Req GET "/log-audits?page=1&page_size=20" $null $TOKEN)
      Check "로그 목록 SA #2"  (Req GET "/log-audits?page=1&page_size=20" $null $TOKEN)
      Check "로그 목록 SA #3"  (Req GET "/log-audits?page=1&page_size=20" $null $TOKEN)
$LOG_ID = $la.data.items[0].log_audit_id

# 목록 조회 - DEV / APV (본인 회사 스코핑)
Check "로그 목록 DEV #1" (Req GET "/log-audits?page=1&page_size=20" $null $TOKEN_DEV)
Check "로그 목록 DEV #2" (Req GET "/log-audits?page=1&page_size=20" $null $TOKEN_DEV)
Check "로그 목록 DEV #3" (Req GET "/log-audits?page=1&page_size=20" $null $TOKEN_DEV)
Check "로그 목록 APV #1" (Req GET "/log-audits?page=1&page_size=20" $null $TOKEN_APV)
Check "로그 목록 APV #2" (Req GET "/log-audits?page=1&page_size=20" $null $TOKEN_APV)
Check "로그 목록 APV #3" (Req GET "/log-audits?page=1&page_size=20" $null $TOKEN_APV)

# OPERATOR 접근 차단
Check "로그 목록 OP 차단 #1" (Req GET "/log-audits?page=1&page_size=20" $null $TOKEN_OP) 20001
Check "로그 목록 OP 차단 #2" (Req GET "/log-audits?page=1&page_size=20" $null $TOKEN_OP) 20001
Check "로그 목록 OP 차단 #3" (Req GET "/log-audits?page=1&page_size=20" $null $TOKEN_OP) 20001

# 필터 - table_name
Check "로그 목록 테이블필터 #1" (Req GET "/log-audits?page=1&page_size=20&table_name=company" $null $TOKEN)
Check "로그 목록 테이블필터 #2" (Req GET "/log-audits?page=1&page_size=20&table_name=user"    $null $TOKEN)
Check "로그 목록 테이블필터 #3" (Req GET "/log-audits?page=1&page_size=20&table_name=project"  $null $TOKEN)

# 필터 - action_type (10=CREATE, 20=UPDATE, 30=STATUS_CHANGE)
Check "로그 목록 CREATE필터  #1" (Req GET "/log-audits?page=1&page_size=20&action_type=10" $null $TOKEN)
Check "로그 목록 UPDATE필터  #2" (Req GET "/log-audits?page=1&page_size=20&action_type=20" $null $TOKEN)
Check "로그 목록 STATUS필터  #3" (Req GET "/log-audits?page=1&page_size=20&action_type=30" $null $TOKEN)

# 페이지네이션 오류
Check "로그 목록 page_size 오류 #1" (Req GET "/log-audits?page=1&page_size=10"  $null $TOKEN) 30003
Check "로그 목록 page_size 오류 #2" (Req GET "/log-audits?page=1&page_size=99"  $null $TOKEN) 30003
Check "로그 목록 page 누락 #3"      (Req GET "/log-audits?page_size=20"         $null $TOKEN) 30001

# 단건 조회 - SA
Check "로그 단건 SA #1" (Req GET /log-audits/$LOG_ID $null $TOKEN)
Check "로그 단건 SA #2" (Req GET /log-audits/$LOG_ID $null $TOKEN)
Check "로그 단건 SA #3" (Req GET /log-audits/$LOG_ID $null $TOKEN)

# 없는 ID → 31010
Check "로그 단건 없는 ID #1" (Req GET /log-audits/99991 $null $TOKEN) 31010
Check "로그 단건 없는 ID #2" (Req GET /log-audits/99992 $null $TOKEN) 31010
Check "로그 단건 없는 ID #3" (Req GET /log-audits/99993 $null $TOKEN) 31010

# OPERATOR 단건 차단
Check "로그 단건 OP 차단 #1" (Req GET /log-audits/$LOG_ID $null $TOKEN_OP) 20001
Check "로그 단건 OP 차단 #2" (Req GET /log-audits/$LOG_ID $null $TOKEN_OP) 20001
Check "로그 단건 OP 차단 #3" (Req GET /log-audits/$LOG_ID $null $TOKEN_OP) 20001

# ============================================================
# 15. AUTH - 비밀번호 변경 / 로그아웃
# ============================================================
Section "15. AUTH / 비밀번호 변경 · 로그아웃"

# 비밀번호 변경 #1 성공 시 SP_UPDATE_PASSWORD가 모든 세션 종료 → TOKEN 무효화
Check "비밀번호 변경 #1" (Req PATCH /auth/password @{ current_password="1234"; new_password="1234!" } $TOKEN)
$r2     = Req POST /auth/login @{ login_id="sa"; password="1234!" }
$TOKEN2 = $r2.data.access_token
# TOKEN2로 재시도 — 이미 변경된 비밀번호를 current로 쓰면 10002
Check "비밀번호 변경 #2" (Req PATCH /auth/password @{ current_password="1234"; new_password="1234!" } $TOKEN2) 10002
Check "비밀번호 변경 #3" (Req PATCH /auth/password @{ current_password="1234"; new_password="1234!" } $TOKEN2) 10002

Check "변경 후 로그인 #1" $r2
Check "변경 후 로그인 #2" (Req POST /auth/login @{ login_id="sa"; password="1234!" })
Check "변경 후 로그인 #3" (Req POST /auth/login @{ login_id="sa"; password="1234!" })
Check "이전 비밀번호 로그인 실패 #1" (Req POST /auth/login @{ login_id="sa"; password="1234" }) 10001
Check "이전 비밀번호 로그인 실패 #2" (Req POST /auth/login @{ login_id="sa"; password="1234" }) 10001
Check "이전 비밀번호 로그인 실패 #3" (Req POST /auth/login @{ login_id="sa"; password="1234" }) 10001

# 비밀번호 원복
Check "비밀번호 원복"     (Req PATCH /auth/password @{ current_password="1234!"; new_password="1234" } $TOKEN2)
Check "원복 후 로그인 #1" (Req POST /auth/login @{ login_id="sa"; password="1234" })
Check "원복 후 로그인 #2" (Req POST /auth/login @{ login_id="sa"; password="1234" })
Check "원복 후 로그인 #3" (Req POST /auth/login @{ login_id="sa"; password="1234" })

# 로그아웃
$s1 = Req POST /auth/login @{ login_id="sa"; password="1234" }
$s2 = Req POST /auth/login @{ login_id="sa"; password="1234" }
$s3 = Req POST /auth/login @{ login_id="sa"; password="1234" }
Check "로그아웃 #1" (Req POST /auth/logout $null $s1.data.access_token)
Check "로그아웃 #2" (Req POST /auth/logout $null $s2.data.access_token)
Check "로그아웃 #3" (Req POST /auth/logout $null $s3.data.access_token)
Check "로그아웃 후 me 차단 #1" (Req GET /auth/me $null $s1.data.access_token) 10009
Check "로그아웃 후 me 차단 #2" (Req GET /auth/me $null $s2.data.access_token) 10009
Check "로그아웃 후 me 차단 #3" (Req GET /auth/me $null $s3.data.access_token) 10009

# ============================================================
# 결과 요약
# ============================================================
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  결과 요약" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  PASS : $PASS" -ForegroundColor Green
Write-Host "  FAIL : $FAIL" -ForegroundColor $(if ($FAIL -eq 0) { "Green" } else { "Red" })
Write-Host "  TOTAL: $($PASS + $FAIL)"
Write-Host "================================================================" -ForegroundColor Cyan
